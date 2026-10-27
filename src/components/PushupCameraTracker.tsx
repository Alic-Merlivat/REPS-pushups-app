import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { recordWorkout, loginWithGoogle } from '../firebase';
import { soundEffects } from '../utils/audio';
import { useFullscreen } from '../hooks/useFullscreen';
import {
  analyzePushupPose,
  drawPoseCanvas,
  PushupMetrics,
} from '../utils/poseGeometry';
import {
  PushupEngine,
  NormalizedLandmark,
  DiagnosticsState,
  DeviceOrientationAngle,
  loadCalibrationFromStorage,
  saveCalibrationToStorage,
} from '../utils/pushupEngine';
import { PushupDiagnosticsPanel } from './PushupDiagnosticsPanel';
import { PhonePlacementIllustration } from './PhonePlacementIllustration';
import {
  Camera,
  Play,
  Square,
  Volume2,
  VolumeX,
  RefreshCw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Trophy,
  Loader2,
  ArrowLeft,
  Compass,
  Crosshair,
} from 'lucide-react';

interface PushupCameraTrackerProps {
  onClose: () => void;
}

type PushupState = 'UP' | 'GOING_DOWN' | 'DOWN' | 'GOING_UP';

export const PushupCameraTracker: React.FC<PushupCameraTrackerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { themeConfig } = useTheme();

  // Video and Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestAnimationRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Status & UI States
  const [modelLoading, setModelLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [showPlacementTip, setShowPlacementTip] = useState(false);
  const { isFullscreen, toggleFullscreen, enterFullscreen, isSupported } = useFullscreen();

  // Automatically attempt to enter full screen so top browser bar disappears
  useEffect(() => {
    if (isSupported && !isFullscreen) {
      enterFullscreen().catch(() => {});
    }
  }, [enterFullscreen, isSupported, isFullscreen]);

  // Workout Tracker States
  const [reps, setReps] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isWorkoutFinished, setIsWorkoutFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Biomechanical Pushup Engine & Diagnostics
  const pushupEngineRef = useRef<PushupEngine>(new PushupEngine());
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>(() => pushupEngineRef.current.processFrame([], 0, 640, 480).diagnostics);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Monitor device orientation changes and sync with engine
  useEffect(() => {
    const handleOrientation = () => {
      let angle: DeviceOrientationAngle = 0;
      if (window.screen?.orientation?.angle !== undefined) {
        const raw = window.screen.orientation.angle;
        if (raw === 90 || raw === 180 || raw === 270) {
          angle = raw;
        }
      } else if (typeof window.orientation === 'number') {
        const raw = Math.abs(window.orientation);
        if (raw === 90 || raw === 180 || raw === 270) {
          angle = raw as DeviceOrientationAngle;
        }
      }
      pushupEngineRef.current.setOrientation(angle);
    };

    handleOrientation();
    window.addEventListener('orientationchange', handleOrientation);
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientation);
    }
    return () => {
      window.removeEventListener('orientationchange', handleOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientation);
      }
    };
  }, []);

  // Real-time metrics
  const [currentMetrics, setCurrentMetrics] = useState<PushupMetrics>({
    elbowAngle: 180,
    leftElbowAngle: 180,
    rightElbowAngle: 180,
    hipAngle: 180,
    depthPercentage: 0,
    isFormGood: true,
    formFeedback: 'Calibrate target depth to start',
    dominantSide: 'right',
    hasVisibleBody: false,
    shoulderY: 0.5,
    handY: 0.8,
    torsoElevation: 0.3,
    elevationRatio: 0.6,
    isArmsStraight: true,
    isTorsoAtFloorLevel: false,
    leftShoulderActive: false,
    rightShoulderActive: false,
    leftShoulderY: 0.5,
    rightShoulderY: 0.5,
    shoulderWidth: 0.25,
    shoulderToHandDist: 0.35,
    torsoY: 0.5,
    torsoX: 0.5,
    initialStartingHeight: null,
    highestPlankPoint: 0.5,
    lowestDipPoint: 0.7,
    torsoDelta: 0,
    relativeTorsoMovement: 0,
  });

  // Pushup state machine refs
  const repCountRef = useRef(0);
  const repsHistoryRef = useRef<{ reps: number; goodForm: boolean }[]>([]);
  const lastRepCompletedTimeRef = useRef<number>(0);

  // Relative movement detection refs (Frame-Position & Distance Invariant)
  const calibratedStartingHeightRef = useRef<number | null>(null);
  const highestPlankRef = useRef<number>(0.5);
  const lowestDipRef = useRef<number>(0.7);
  const torsoDeltaRef = useRef<number>(0);

  // Acquire Screen Wake Lock so mobile screen stays awake during pushups
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('Screen WakeLock error:', err);
    }
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {
      // ignore
    }
  };

  // Timer loop
  useEffect(() => {
    let interval: any = null;
    if (cameraActive && workoutStartTime && !isWorkoutFinished) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraActive, workoutStartTime, isWorkoutFinished]);

  // Initialize MediaPipe PoseLandmarker & Load Saved Calibration
  useEffect(() => {
    let isMounted = true;

    // Load user's saved calibration if available
    try {
      const savedCal = loadCalibrationFromStorage();
      if (savedCal && (savedCal.isCalibrated || savedCal.sessionBodyScale || savedCal.topDistance)) {
        pushupEngineRef.current.setCalibration(savedCal);
        setDiagnostics((prev) => ({
          ...prev,
          isCalibrated: true,
          calibrationPhase: 'CALIBRATED',
          sessionBodyScale: savedCal.sessionBodyScale ?? 0.35,
          hTop: savedCal.topDistance ?? 0.42,
          hBottom: savedCal.bottomDistance ?? 0.18,
        }));
      }
    } catch (e) {
      console.warn('Failed to load saved pushup calibration:', e);
    }

    async function initMediaPipe() {
      try {
        setModelLoading(true);
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          setModelLoading(false);
          startCamera();
        }
      } catch (err: any) {
        console.error('Failed to load MediaPipe pose model:', err);
        if (isMounted) {
          setCameraError(
            'Failed to load AI Pose Detection model. Please check your internet connection.'
          );
          setModelLoading(false);
        }
      }
    }

    initMediaPipe();

    return () => {
      isMounted = false;
      stopCamera();
      releaseWakeLock();
    };
  }, []);

  // Start Camera Stream
  const startCamera = async (overrideFacingMode?: 'user' | 'environment') => {
    const targetMode = overrideFacingMode || facingMode;
    setCameraError(null);

    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: targetMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          if (!workoutStartTime) {
            setWorkoutStartTime(Date.now());
          }
          requestWakeLock();
          // Begin frame processing loop
          processVideoLoop();
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Could not access camera. Please allow camera permissions.';
      if (err.name === 'NotAllowedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera found on this device.';
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (requestAnimationRef.current) {
      cancelAnimationFrame(requestAnimationRef.current);
      requestAnimationRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    releaseWakeLock();
  };

  // Flip front/back camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Frame processing loop
  const processVideoLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !canvas || !landmarker) {
      requestAnimationRef.current = requestAnimationFrame(processVideoLoop);
      return;
    }

    if (video.readyState >= 2) {
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width = videoWidth;
        canvas.height = videoHeight;
      }

      const startTimeMs = performance.now();
      const results = landmarker.detectForVideo(video, startTimeMs);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (results.landmarks && results.landmarks.length > 0) {
          const rawLandmarks = results.landmarks[0] as NormalizedLandmark[];
          const engineRes = pushupEngineRef.current.processFrame(
            rawLandmarks,
            performance.now(),
            videoWidth,
            videoHeight,
            facingMode === 'user'
          );

          setDiagnostics(engineRes.diagnostics);

          // Audio triggers from state machine events
          if (engineRes.bottomReachedEvent && !isSoundMuted) {
            soundEffects.playDownClick();
          }

          if (engineRes.repCompletedEvent) {
            const newCount = engineRes.reps;
            setReps(newCount);
            repCountRef.current = newCount;
            repsHistoryRef.current.push({
              reps: newCount,
              goodForm: true,
            });

            if (!isSoundMuted) {
              soundEffects.playRepChime();
              soundEffects.speakNumber(newCount);
            }

            if (newCount % 10 === 0) {
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.6 },
              });
            }
          }

          // Relative Movement Detection Logic:
          // Torso coordinates computed from midpoint of shoulders & hips (frame-position invariant)
          const leftShoulder = rawLandmarks[11];
          const rightShoulder = rawLandmarks[12];
          const leftHip = rawLandmarks[23];
          const rightHip = rawLandmarks[24];
          const hasLeftS = (leftShoulder?.visibility ?? 0) >= 0.2;
          const hasRightS = (rightShoulder?.visibility ?? 0) >= 0.2;
          const sX = (hasLeftS && hasRightS) ? (leftShoulder.x + rightShoulder.x) / 2 : (leftShoulder?.x ?? rightShoulder?.x ?? 0.5);
          const sY = (hasLeftS && hasRightS) ? (leftShoulder.y + rightShoulder.y) / 2 : (leftShoulder?.y ?? rightShoulder?.y ?? 0.5);

          const hasLeftH = (leftHip?.visibility ?? 0) >= 0.2;
          const hasRightH = (rightHip?.visibility ?? 0) >= 0.2;
          const hX = (hasLeftH && hasRightH) ? (leftHip.x + rightHip.x) / 2 : (leftHip?.x ?? rightHip?.x ?? sX);
          const hY = (hasLeftH && hasRightH) ? (leftHip.y + rightHip.y) / 2 : (leftHip?.y ?? rightHip?.y ?? sY);

          const torsoX = (hasLeftH || hasRightH) ? (sX + hX) / 2 : sX;
          const torsoY = (hasLeftH || hasRightH) ? (sY + hY) / 2 : sY;
          const torsoScale = (hasLeftH || hasRightH) ? Math.max(0.15, Math.hypot(sX - hX, sY - hY)) : 0.35;

          // When user is in top plank position (arms straight or UP state), calibrate initial starting height anywhere in the frame
          const isAtTopPlank = engineRes.smoothedDepth <= 0.25 || engineRes.state === 'UP';
          if (calibratedStartingHeightRef.current === null) {
            calibratedStartingHeightRef.current = torsoY;
            highestPlankRef.current = torsoY;
            lowestDipRef.current = torsoY + 0.35 * torsoScale;
          } else if (isAtTopPlank) {
            // Smoothly track current lockout plank height across multiple reps
            highestPlankRef.current = 0.85 * highestPlankRef.current + 0.15 * torsoY;
          }

          if (torsoY > lowestDipRef.current) {
            lowestDipRef.current = torsoY;
          }

          // Calculate delta between highest (plank) and lowest (dip) points of torso relative to initial calibrated starting height
          const startPlankH = calibratedStartingHeightRef.current ?? highestPlankRef.current;
          const torsoDelta = Math.max(0, torsoY - startPlankH);
          torsoDeltaRef.current = torsoDelta;

          const totalDipRange = Math.max(0.06, Math.max(lowestDipRef.current - highestPlankRef.current, 0.35 * torsoScale));
          const relativeTorsoMovement = Math.min(1.0, Math.max(0, torsoDelta / totalDipRange));

          // AI Detection pass for pushup pose & explicit shoulder metrics
          const poseMetrics = analyzePushupPose(rawLandmarks as any, undefined, startPlankH);

          // Depth clamped for HUD visualization
          const depthPct = Math.max(0, Math.min(100, Math.round(engineRes.smoothedDepth * 100)));
          const updatedMetrics: PushupMetrics = {
            elbowAngle: 180,
            leftElbowAngle: 180,
            rightElbowAngle: 180,
            hipAngle: 180,
            depthPercentage: depthPct,
            isFormGood: true,
            formFeedback: engineRes.formFeedback,
            dominantSide: engineRes.diagnostics.selectedSide,
            hasVisibleBody: true,
            shoulderY: poseMetrics.shoulderY,
            handY: poseMetrics.handY,
            torsoElevation: poseMetrics.torsoElevation,
            elevationRatio: poseMetrics.elevationRatio,
            isArmsStraight: engineRes.smoothedDepth <= 0.15,
            isTorsoAtFloorLevel: engineRes.isBottomAccepted,
            leftShoulderActive: poseMetrics.leftShoulderActive,
            rightShoulderActive: poseMetrics.rightShoulderActive,
            leftShoulderY: poseMetrics.leftShoulderY,
            rightShoulderY: poseMetrics.rightShoulderY,
            shoulderWidth: poseMetrics.shoulderWidth,
            shoulderToHandDist: poseMetrics.shoulderToHandDist,
            torsoY,
            torsoX,
            initialStartingHeight: startPlankH,
            highestPlankPoint: highestPlankRef.current,
            lowestDipPoint: lowestDipRef.current,
            torsoDelta,
            relativeTorsoMovement,
          };
          setCurrentMetrics(updatedMetrics);

          // Render skeleton visualization with highlighted shoulders alongside the arms
          drawPoseCanvas(
            ctx,
            rawLandmarks as any,
            updatedMetrics,
            videoWidth,
            videoHeight,
            facingMode === 'user',
            {
              accent: themeConfig.poseAccent,
              glow: themeConfig.poseGlow,
              secondary: themeConfig.poseSecondary,
            }
          );
        } else {
          ctx.clearRect(0, 0, videoWidth, videoHeight);
          setCurrentMetrics((prev) => ({
            ...prev,
            hasVisibleBody: false,
            formFeedback: 'Position yourself so camera sees your shoulders and hands',
          }));
        }
      }
    }

    requestAnimationRef.current = requestAnimationFrame(processVideoLoop);
  };

  // Start guided calibration wizard
  const handleStartCalibration = () => {
    prevCalibratedRef.current = false;
    pushupEngineRef.current.startGuidedCalibration(performance.now());
    setIsCalibrating(true);
    soundEffects.speak('Starting calibration. Hold top plank position for 3 seconds.');
  };

  // Cancel or Skip Calibration
  const handleCancelCalibration = () => {
    pushupEngineRef.current.cancelCalibration();
    setIsCalibrating(false);
  };

  // Quick 1-tap recalibration of initial starting plank height anywhere in the frame
  const handleRecalibratePlank = () => {
    calibratedStartingHeightRef.current = null;
    highestPlankRef.current = 0.5;
    lowestDipRef.current = 0.7;
    pushupEngineRef.current.recalibrateStartingPlank();
    soundEffects.speak('Plank height calibrated. Ready to dip.');
  };

  // Save calibration when completed
  const prevCalibratedRef = useRef(false);
  useEffect(() => {
    if (diagnostics.isCalibrated && !prevCalibratedRef.current) {
      prevCalibratedRef.current = true;
      setIsCalibrating(false);
      try {
        const cal = pushupEngineRef.current.getCalibration();
        saveCalibrationToStorage(cal);
        soundEffects.speak('Calibration complete! Pushup range saved in memory.');
      } catch (e) {
        console.warn('Failed to save calibration:', e);
      }
    }
  }, [diagnostics.isCalibrated]);

  // Finish Workout
  const handleFinishWorkout = async () => {
    stopCamera();
    setIsWorkoutFinished(true);

    if (reps > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 },
      });
    }

    if (user && reps > 0) {
      setIsSaving(true);
      try {
        const totalDuration = Math.max(1, elapsedSeconds);
        const goodReps = repsHistoryRef.current.filter((r) => r.goodForm).length;
        const formScore =
          repsHistoryRef.current.length > 0
            ? Math.round((goodReps / repsHistoryRef.current.length) * 100)
            : 100;

        await recordWorkout(user, reps, totalDuration, formScore);
      } catch (err) {
        console.error('Failed to save workout session:', err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  const toggleSound = () => {
    const newMuted = !isSoundMuted;
    setIsSoundMuted(newMuted);
    soundEffects.soundEnabled = !newMuted;
    soundEffects.speechEnabled = !newMuted;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none h-[100dvh] w-screen overflow-hidden">
      {/* Top Floating Control Bar */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Exit
        </button>

        {/* Workout Timer */}
        <div className="flex items-center gap-1.5">
          <div className={`px-3 py-1.5 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-700 font-mono text-xs font-bold ${themeConfig.hudRepsColor}`}>
            ⏱ {formatTime(elapsedSeconds)}
          </div>
        </div>

        {/* Audio, Fullscreen & Camera Controls */}
        <div className="flex items-center gap-2">
          {isSupported && (
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (hide top browser bar)'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="p-2 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className={`w-4 h-4 ${themeConfig.hudRepsColor}`} />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            onClick={handleRecalibratePlank}
            title="Calibrate Current Plank Height (Anywhere in frame)"
            className={`p-2 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-700 ${themeConfig.hudRepsColor} hover:text-white transition-colors cursor-pointer`}
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <button
            onClick={handleStartCalibration}
            title="Guided Movement Range Calibration Wizard"
            className={`p-2 rounded-full backdrop-blur border transition-colors cursor-pointer ${
              diagnostics.isCalibrated
                ? 'bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:text-white'
                : `${themeConfig.hudBadgeBg} ${themeConfig.hudBadgeBorder} ${themeConfig.hudBadgeText} animate-pulse`
            }`}
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            onClick={toggleSound}
            title={isSoundMuted ? 'Unmute Rep Voice' : 'Mute Rep Voice'}
            className="p-2 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className={`w-4 h-4 ${themeConfig.hudRepsColor}`} />}
          </button>

          <button
            onClick={handleToggleCamera}
            title="Switch Camera (Front/Back)"
            className="p-2 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Developer Diagnostics Panel (Collapsible, hidden by default) */}
      {cameraActive && (
        <PushupDiagnosticsPanel
          diagnostics={diagnostics}
          onRecalibrate={handleStartCalibration}
        />
      )}

      {/* Main Video Viewport */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950">
        {/* Quick Tap Fullscreen Prompt - Positioned neatly in top right under controls */}
        {!isFullscreen && isSupported && cameraActive && !modelLoading && (
          <button
            onClick={enterFullscreen}
            className={`absolute top-[calc(max(1.25rem,env(safe-area-inset-top))+3.75rem)] right-4 z-30 px-3 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 ${themeConfig.hudRepsColor} text-[11px] font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm border ${themeConfig.cardBorder}`}
          >
            <Maximize2 className="w-3 h-3" />
            <span>Fullscreen</span>
          </button>
        )}

        {/* Guided Calibration & Learning Wizard Overlay */}
        {diagnostics.calibrationPhase !== 'CALIBRATED' && diagnostics.calibrationPhase !== 'NOT_CALIBRATED' && (
          <div className="absolute top-[calc(max(1.25rem,env(safe-area-inset-top))+3.75rem)] sm:top-24 inset-x-4 max-w-sm mx-auto z-40 bg-zinc-950/95 border border-emerald-500/60 backdrop-blur-xl rounded-2xl p-4 text-center shadow-2xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
              <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 animate-spin" /> Movement Calibration
              </span>
              <button
                onClick={handleCancelCalibration}
                className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 cursor-pointer"
              >
                Skip / Default
              </button>
            </div>

            {/* Step indicators */}
            <div className="grid grid-cols-3 gap-1.5 mb-3 text-[10px] font-bold">
              <div
                className={`py-1 rounded-lg ${
                  diagnostics.calibrationPhase === 'HOLD_TOP'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                    : 'bg-zinc-900 text-zinc-500'
                }`}
              >
                1. Top (3s)
              </div>
              <div
                className={`py-1 rounded-lg ${
                  diagnostics.calibrationPhase === 'HOLD_BOTTOM'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                    : 'bg-zinc-900 text-zinc-500'
                }`}
              >
                2. Floor (2s)
              </div>
              <div
                className={`py-1 rounded-lg ${
                  diagnostics.calibrationPhase === 'PUSH_UP'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                    : 'bg-zinc-900 text-zinc-500'
                }`}
              >
                3. 3 Pushups
              </div>
            </div>

            {/* Instruction description */}
            <p className="text-white text-xs font-bold">
              {diagnostics.calibrationPhase === 'HOLD_TOP' && 'Hold starting plank position (arms straight for 3s)'}
              {diagnostics.calibrationPhase === 'HOLD_BOTTOM' && 'Lower down to chest / floor depth & hold for 2s'}
              {diagnostics.calibrationPhase === 'PUSH_UP' && 'Perform 3 full pushups to measure dynamic range!'}
            </p>

            <p className="text-emerald-300 text-xs font-mono font-semibold mt-1.5">{currentMetrics.formFeedback}</p>
          </div>
        )}

        {/* Loading Overlay */}
        {modelLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950 text-zinc-300 gap-3 px-6 text-center">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-sm font-bold text-white">Initializing AI Pose Detector...</p>
            <p className="text-xs text-zinc-500 max-w-xs">
              Loading Google MediaPipe Vision model to track your pushup form in real time.
            </p>
          </div>
        )}

        {/* Error Overlay */}
        {cameraError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950 text-zinc-300 gap-4 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-rose-300 max-w-sm">{cameraError}</p>
            <button
              onClick={() => startCamera()}
              className="px-4 py-2 bg-emerald-500 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Video stream element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          }`}
        />

        {/* Pose Landmark Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* HUD: HERO PROMINENT REPS COUNTER (Always visible, un-obscured) */}
        {cameraActive && diagnostics.calibrationPhase !== 'HOLD_TOP' && diagnostics.calibrationPhase !== 'HOLD_BOTTOM' && diagnostics.calibrationPhase !== 'PUSH_UP' && (
          <div className="absolute top-[calc(max(1.25rem,env(safe-area-inset-top))+3.75rem)] sm:top-24 inset-x-0 z-30 flex justify-center pointer-events-none px-3">
            <div className="bg-black/60 px-3.5 py-2.5 rounded-2xl border border-white/15 shadow-2xl flex flex-row items-center gap-3 max-w-sm sm:max-w-md w-full sm:w-auto">
              {/* 2. REPS Counter on the LEFT */}
              <div className="flex flex-col items-center justify-center pr-3 border-r border-white/15 shrink-0 min-w-[64px] sm:min-w-[72px]">
                <span className={`text-[10px] font-black uppercase tracking-widest ${themeConfig.hudRepsColor}`}>
                  REPS
                </span>
                <span className="text-4xl sm:text-5xl font-black text-white font-mono leading-none tracking-tight my-0.5 drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                  {reps}
                </span>
              </div>

              {/* 3. Relative Torso Movement & Pushup Depth on the RIGHT */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                {/* Torso Relative Delta Progress Header */}
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] mb-1">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: themeConfig.poseAccent }} />
                    <span className="truncate">
                      {diagnostics.state === 'UP'
                        ? 'Plank (Starting Height)'
                        : diagnostics.bottomAccepted
                        ? 'Lowest Dip (Floor) ✓'
                        : `Torso Delta: ${Math.round(currentMetrics.relativeTorsoMovement * 100)}%`}
                    </span>
                  </span>
                  <span className={`shrink-0 ml-1.5 ${diagnostics.bottomAccepted ? themeConfig.statTodayColor + ' font-black' : 'text-zinc-300'}`}>
                    {Math.round(diagnostics.smoothedDepth * 100)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/25">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      diagnostics.bottomAccepted
                        ? themeConfig.hudProgressGradient
                        : 'bg-emerald-500/80'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, diagnostics.smoothedDepth * 100))}%` }}
                  />
                </div>

                {/* Recommendation / Form Feedback Badge */}
                <div className="mt-1.5 flex items-center">
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 drop-shadow truncate max-w-full ${
                      diagnostics.bottomAccepted
                        ? `${themeConfig.hudBadgeBg} ${themeConfig.hudBadgeText} border ${themeConfig.hudBadgeBorder}`
                        : !diagnostics.isPoseHorizontal
                        ? 'bg-amber-500/40 text-amber-200 border border-amber-400/50'
                        : 'bg-black/60 text-zinc-200 border border-white/15'
                    }`}
                  >
                    {currentMetrics.formFeedback}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placement Guide / Tips Overlay - Positioned above Finish button */}
        {showPlacementTip && cameraActive && (
          <div className="absolute inset-x-3 bottom-24 max-w-sm mx-auto z-40 bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 rounded-3xl p-3.5 shadow-2xl text-xs text-zinc-200 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                Phone Placement Guide
              </span>
              <button
                onClick={() => setShowPlacementTip(false)}
                className="text-zinc-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                title="Dismiss tip"
              >
                ✕
              </button>
            </div>

            <div className="mt-2.5">
              <PhonePlacementIllustration className="w-full rounded-2xl overflow-hidden shadow-lg" />
            </div>

            <button
              onClick={() => setShowPlacementTip(false)}
              className="mt-3 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-zinc-950/90 backdrop-blur border-t border-zinc-800 flex items-center justify-between gap-3 max-w-lg mx-auto w-full z-30">
        <button
          onClick={() => setShowPlacementTip(true)}
          className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Camera Placement Tips"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <button
          onClick={handleFinishWorkout}
          disabled={modelLoading}
          className={`flex-1 py-3.5 px-6 rounded-2xl font-black text-sm ${themeConfig.finishButtonGradient} ${themeConfig.finishButtonText} flex items-center justify-center gap-2 ${themeConfig.finishButtonShadow} active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50`}
        >
          <Square className="w-4 h-4 fill-current" />
          Finish &amp; Record Workout
        </button>
      </div>

      {/* Workout Summary Modal */}
      {isWorkoutFinished && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${themeConfig.cardBg} border ${themeConfig.cardBorder} rounded-3xl p-6 max-w-sm w-full ${themeConfig.cardShadow} text-center`}>
            <div className={`w-14 h-14 rounded-2xl ${themeConfig.summaryTrophyBox} flex items-center justify-center mx-auto mb-3`}>
              <Trophy className="w-7 h-7" />
            </div>

            <h3 className={`text-2xl font-black ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'} tracking-tight`}>Workout Complete!</h3>
            <p className={`text-xs ${themeConfig.textMuted} mt-1`}>Awesome pushup session!</p>

            <div className="grid grid-cols-2 gap-3 my-5">
              <div className={`${themeConfig.subCardBg} border ${themeConfig.subCardBorder} rounded-2xl p-3`}>
                <span className={`text-[11px] font-semibold ${themeConfig.textMuted} uppercase`}>Total Reps</span>
                <p className={`text-3xl font-black font-mono mt-0.5 ${themeConfig.summaryRepsColor}`}>{reps}</p>
              </div>

              <div className={`${themeConfig.subCardBg} border ${themeConfig.subCardBorder} rounded-2xl p-3`}>
                <span className={`text-[11px] font-semibold ${themeConfig.textMuted} uppercase`}>Duration</span>
                <p className={`text-3xl font-black font-mono mt-0.5 ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'}`}>{formatTime(elapsedSeconds)}</p>
              </div>
            </div>

            {!user ? (
              <div className="space-y-2 mb-4">
                <div className={`p-3 ${themeConfig.subCardBg} border ${themeConfig.subCardBorder} rounded-xl text-xs ${themeConfig.textColor}`}>
                  Great job! To post your <span className={`font-bold ${themeConfig.statTodayColor}`}>{reps}</span> reps to the Daily Scoreboard and challenge friends, connect with Google.
                </div>
                <button
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      const loggedIn = await loginWithGoogle();
                      await recordWorkout(loggedIn, reps, Math.max(1, elapsedSeconds), 100);
                      onClose();
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs ${themeConfig.startButtonGradient} ${themeConfig.startButtonText} flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50`}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Sign In with Google &amp; Save Reps
                </button>
              </div>
            ) : isSaving ? (
              <div className={`p-3 ${themeConfig.subCardBg} rounded-xl flex items-center justify-center gap-2 text-xs ${themeConfig.textMuted} mb-4`}>
                <Loader2 className={`w-4 h-4 animate-spin ${themeConfig.statTodayColor}`} />
                Syncing with Cloud Scoreboard...
              </div>
            ) : (
              <div className={`p-3 ${themeConfig.hudBadgeBg} border ${themeConfig.hudBadgeBorder} rounded-xl flex items-center justify-center gap-2 text-xs font-semibold ${themeConfig.hudBadgeText} mb-4`}>
                <CheckCircle2 className="w-4 h-4" />
                Saved to your Firestore profile!
              </div>
            )}

            <button
              onClick={onClose}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm ${themeConfig.subCardBg} hover:${themeConfig.cardBg} ${themeConfig.isLightMode ? 'text-slate-900' : 'text-white'} transition-all cursor-pointer border ${themeConfig.subCardBorder}`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
