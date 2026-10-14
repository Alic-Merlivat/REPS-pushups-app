// Pushup Engine: Robust, Orientation-Invariant Biomechanical Tracking & State Machine
// Implements calibrated height-above-wrist tracking, time-aware smoothing, and anti-cheat validation.

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface AspectCorrectPoint {
  x: number;
  y: number;
  z: number;
}

export type DeviceOrientationAngle = 0 | 90 | 180 | 270;

export type PushupState = 'UNREADY' | 'UP' | 'GOING_DOWN' | 'DOWN' | 'GOING_UP';

export type CalibrationPhase = 'NOT_CALIBRATED' | 'HOLD_TOP' | 'HOLD_BOTTOM' | 'PUSH_UP' | 'CALIBRATED';

export type TrackingMode = 'bilateral' | 'left_only' | 'right_only' | 'fallback';

export interface CalibrationData {
  sessionBodyScale: number;          // Reliable body reference scale, FROZEN after calibration
  targetMovementRange: number;       // Expected normalized descent range (0.0 to ~0.7-1.0)
  topShoulderCenter?: AspectCorrectPoint;
  topHandCenter?: AspectCorrectPoint;
  topRelativePosition?: { x: number; y: number };
  movementAxis?: { x: number; y: number };
  topDistance?: number;              // Euclidean shoulder-to-wrist distance at plank
  bottomDistance?: number;           // Euclidean shoulder-to-wrist distance at floor
  topElevation?: number;             // Vertical height of shoulder above wrist at plank
  bottomElevation?: number;          // Vertical height of shoulder above wrist at floor
  hTop: number;
  hBottom: number;
  referenceBodyLength: number;
  upDirection: { x: number; y: number };
  isCalibrated: boolean;
  calibratedAt: number;
}

export const CALIBRATION_STORAGE_KEY = 'pushup_user_calibration_v4';

export function saveCalibrationToStorage(data: CalibrationData): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.warn('Failed to save calibration to storage:', err);
  }
}

export function loadCalibrationFromStorage(): CalibrationData | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Clear legacy calibrations that stored absolute screen coordinates
      window.localStorage.removeItem('pushup_user_calibration_v2');
      window.localStorage.removeItem('pushup_user_calibration_v3');

      const saved = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.isCalibrated || parsed.sessionBodyScale || parsed.topDistance)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load calibration from storage:', err);
  }
  return null;
}

export function clearCalibrationFromStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(CALIBRATION_STORAGE_KEY);
      window.localStorage.removeItem('pushup_user_calibration_v2');
      window.localStorage.removeItem('pushup_user_calibration_v3');
    }
  } catch (err) {
    console.warn('Failed to clear calibration from storage:', err);
  }
}

export interface EngineConfig {
  topAcceptedThreshold: number;    // depth <= 0.20 confirms top position
  leaveTopThreshold: number;       // depth > 0.30 triggers descent
  bottomAcceptedThreshold: number; // depth >= 0.75 confirms bottom target
  leaveBottomThreshold: number;    // depth < 0.60 triggers ascent
  topConfirmationMs: number;       // dwell time to confirm top (default 80ms)
  bottomConfirmationMs: number;    // dwell time to confirm bottom (default 80ms)
  minRepDurationMs: number;        // minimum time for human pushup (default 400ms)
  repCooldownMs: number;           // pause required between reps (default 250ms)
  trackingUncertaintyLimitMs: number; // brief freeze allowance (default 220ms)
  trackingLossResetMs: number;     // invalidates unfinished candidate (default 450ms)
  minShoulderConfidence: number;   // default 0.25
  minWristConfidence: number;      // default 0.20
  minHipConfidence: number;        // default 0.15
  minCalibrationRange: number;      // minimum motion range (default 0.06)
  emaTimeConstantMs: number;       // EMA smoothing time constant (default 80ms)
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  topAcceptedThreshold: 0.25,
  leaveTopThreshold: 0.35,
  bottomAcceptedThreshold: 0.68,
  leaveBottomThreshold: 0.60,
  topConfirmationMs: 60,
  bottomConfirmationMs: 60,
  minRepDurationMs: 350,
  repCooldownMs: 100,
  trackingUncertaintyLimitMs: 220,
  trackingLossResetMs: 450,
  minShoulderConfidence: 0.25,
  minWristConfidence: 0.20,
  minHipConfidence: 0.15,
  minCalibrationRange: 0.06,
  emaTimeConstantMs: 70,
};

export interface DiagnosticsState {
  timestampMs: number;
  fps: number;
  orientationAngle: DeviceOrientationAngle;
  selectedSide: 'left' | 'right';
  isSideLocked: boolean;
  trackingMode: TrackingMode;
  shoulderConfidence: number;
  wristConfidence: number;
  hipConfidence: number;
  trackingConfidence: number;
  sampleAccepted: boolean;
  rejectionReason: string;
  activeRejectionReason: string;
  sessionBodyScale: number;
  rawMovement: number;
  normalizedMovement: number;
  smoothedMovement: number;
  movementVelocity: number;
  rawH: number;
  rawDepth: number;
  smoothedDepth: number;
  state: PushupState;
  bottomAccepted: boolean;
  topReached: boolean;
  isCalibrated: boolean;
  calibrationPhase: CalibrationPhase;
  hTop: number;
  hBottom: number;
  referenceBodyLength: number;
  recentTransitions: { from: PushupState; to: PushupState; timestampMs: number }[];
  totalReps: number;
  isPoseHorizontal: boolean;
  elbowAngle?: number;
  armExtensionRatio?: number;
  viewAngle?: 'front' | 'side' | 'oblique';
  torsoY?: number;
  initialStartingHeight?: number;
  highestTorsoPoint?: number;
  lowestTorsoPoint?: number;
  torsoDelta?: number;
  relativeTorsoMovement?: number;
}

export interface EngineProcessResult {
  state: PushupState;
  smoothedDepth: number;
  rawDepth: number;
  reps: number;
  formFeedback: string;
  activeRejectionReason: string;
  isBottomAccepted: boolean;
  repCompletedEvent: boolean;
  bottomReachedEvent: boolean;
  diagnostics: DiagnosticsState;
}

// MediaPipe landmark indices
export const POSE_INDEX = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

// Converts normalized [0, 1] landmark coordinates to an aspect-corrected isotropic plane.
// This prevents 16:9 or 9:16 aspect distortion from skewing Euclidean distances or dot products.
export function toAspectCorrect(
  lm: NormalizedLandmark,
  width: number,
  height: number,
  isMirrored: boolean = false
): AspectCorrectPoint {
  const normX = isMirrored ? (1 - lm.x) : lm.x;
  const normY = lm.y;
  const aspect = width / Math.max(1, height);

  // Normalize so y spans [0, 1] and x spans [0, aspect]
  return {
    x: normX * aspect,
    y: normY,
    z: lm.z ?? 0,
  };
}

// Determines the physical image-plane "up" direction based on device orientation angle.
// In camera video coordinates (where y=0 is top and y=1 is bottom):
// - 0° (portrait): UP is towards y=0 -> (0, -1)
// - 90° (landscape clockwise): UP is (-1, 0)
// - 270° (landscape counter-clockwise): UP is (1, 0)
// - 180° (reverse portrait): UP is (0, 1)
export function getImagePlaneUpDirection(angle: DeviceOrientationAngle = 0): { x: number; y: number } {
  switch (angle) {
    case 90:
      return { x: -1, y: 0 };
    case 270:
      return { x: 1, y: 0 };
    case 180:
      return { x: 0, y: 1 };
    case 0:
    default:
      return { x: 0, y: -1 };
  }
}

// Calculates the joint angle between three landmarks in isotropic 2D coordinates (or optional 3D)
// Returns angle in [0, 180], where 180° = straight arm (lockout), 90° = right angle bent.
export function calculateJointAngle(
  a: { x: number; y: number; z?: number },
  b: { x: number; y: number; z?: number },
  c: { x: number; y: number; z?: number },
  use3D: boolean = false
): number {
  const z1 = use3D ? (a.z ?? 0) - (b.z ?? 0) : 0;
  const z2 = use3D ? (c.z ?? 0) - (b.z ?? 0) : 0;
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: z1 };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: z2 };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  if (mag1 < 1e-6 || mag2 < 1e-6) return 180;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

export class PushupEngine {
  private config: EngineConfig;
  private state: PushupState = 'UNREADY';
  private totalReps: number = 0;

  // Real-time perspective & elbow tracking
  private currentElbowAngle: number = 180;
  private currentArmExtensionRatio: number = 1.0;
  private currentViewAngle: 'front' | 'side' | 'oblique' = 'front';

  // Calibration
  private calibration: CalibrationData = {
    sessionBodyScale: 0.35,
    targetMovementRange: 0.70,
    topRelativePosition: { x: 0, y: -0.40 },
    movementAxis: { x: 0, y: 1 },
    topDistance: 0.42,
    bottomDistance: 0.18,
    topElevation: 0.38,
    bottomElevation: 0.12,
    hTop: 0.55,
    hBottom: 0.18,
    referenceBodyLength: 0.35,
    upDirection: { x: 0, y: -1 },
    isCalibrated: false,
    calibratedAt: 0,
  };
  private calibrationPhase: CalibrationPhase = 'NOT_CALIBRATED';
  private topCalibrationSamples: {
    shoulderCenter: AspectCorrectPoint;
    handCenter: AspectCorrectPoint;
    relPos: { x: number; y: number };
    scale: number;
    dist: number;
    elev: number;
  }[] = [];
  private bottomCalibrationSamples: { dist: number; elev: number; relY: number }[] = [];
  private calibrationPhaseStartMs: number = 0;

  // Step 3 Dynamic Pushup Calibration (Measure 3 full reps)
  private calibrationRepsCompleted: number = 0;
  private calibrationRepState: 'AT_BOTTOM' | 'GOING_UP' | 'AT_TOP' | 'GOING_DOWN' = 'AT_BOTTOM';
  private calibrationMeasuredReps: { topD: number; btmD: number; topE: number; btmE: number }[] = [];
  private currentCalibrationRepMinDist: number = 999;
  private currentCalibrationRepMaxDist: number = 0;

  // Dynamic Room-Position Invariant Top Anchor
  private dynamicTopRel: { x: number; y: number } = { x: 0, y: -0.35 };
  private dynamicTopDist: number = 0.35;
  private dynamicTopElevation: number = 0.35;
  private hasLockedInitialTop: boolean = false;

  // Relative Torso Movement State (Delta between highest plank and lowest dip anywhere in frame)
  private initialStartingHeight: number | null = null;
  private currentTorsoY: number = 0.5;
  private highestTorsoPoint: number = 0.5;
  private lowestTorsoPoint: number = 0.7;
  private currentTorsoDelta: number = 0;
  private currentRelativeTorsoMovement: number = 0;

  // Tracking & Bilateral Mode
  private selectedSide: 'left' | 'right' = 'right';
  private isSideLocked: boolean = false;
  private currentTrackingMode: TrackingMode = 'bilateral';
  private currentTrackingConfidence: number = 0.9;
  private currentSampleAccepted: boolean = true;

  // Torso Movement Relative to Hands
  private currentRawMovement: number = 0;
  private currentNormalizedMovement: number = 0;
  private smoothedMovement: number = 0;
  private prevSmoothedMovement: number = 0;
  private movementVelocity: number = 0;

  // Smoothing & Timing
  private smoothedDepth: number = 0;
  private lastTimestampMs: number = 0;
  private lastValidTrackingMs: number = 0;
  private repStartTimeMs: number = 0;
  private lastRepCompletedTimeMs: number = 0;
  private bottomDwellStartMs: number = 0;
  private topDwellStartMs: number = 0;

  // Flags & Rejection
  private bottomAccepted: boolean = false;
  private topReached: boolean = false;
  private activeRejectionReason: string = 'Waiting for calibration';
  private formFeedback: string = 'Calibrate top position to start';

  // Orientation tracking
  private currentOrientation: DeviceOrientationAngle = 0;

  // Diagnostics history
  private transitionsLog: { from: PushupState; to: PushupState; timestampMs: number }[] = [];
  private fpsCounter = { frames: 0, lastCheckMs: 0, fps: 0 };

  // Previous landmark positions to reject single-frame spikes
  private prevShoulderCenter: AspectCorrectPoint | null = null;
  private prevHandCenter: AspectCorrectPoint | null = null;
  private currentRawH: number = 0;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    // Automatically load saved calibration from storage if available
    const saved = loadCalibrationFromStorage();
    if (saved && (saved.isCalibrated || saved.sessionBodyScale)) {
      this.setCalibration(saved);
    }
  }

  public getConfig(): EngineConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<EngineConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public getCalibration(): CalibrationData {
    return { ...this.calibration };
  }

  public setCalibration(calibration: Partial<CalibrationData>) {
    const sessionBodyScale = calibration.sessionBodyScale ?? calibration.referenceBodyLength ?? 0.35;
    const upDir = calibration.upDirection ?? { x: 0, y: -1 };
    const movementAxis = calibration.movementAxis ?? { x: -upDir.x, y: -upDir.y };
    const topRelPos = calibration.topRelativePosition ?? {
      x: 0,
      y: -(calibration.topElevation ?? (calibration.hTop ? calibration.hTop * sessionBodyScale : 0.40)),
    };
    const targetMovementRange = calibration.targetMovementRange ??
      ((calibration.topDistance && calibration.bottomDistance)
        ? (calibration.topDistance - calibration.bottomDistance) / sessionBodyScale
        : ((calibration.hTop && calibration.hBottom)
            ? (calibration.hTop - calibration.hBottom)
            : 0.75));

    this.calibration = {
      sessionBodyScale,
      targetMovementRange: Math.max(0.20, targetMovementRange),
      topShoulderCenter: calibration.topShoulderCenter,
      topHandCenter: calibration.topHandCenter,
      topRelativePosition: topRelPos,
      movementAxis,
      topDistance: calibration.topDistance ?? 0.42,
      bottomDistance: calibration.bottomDistance ?? 0.18,
      topElevation: calibration.topElevation ?? 0.38,
      bottomElevation: calibration.bottomElevation ?? 0.12,
      hTop: calibration.hTop ?? 1.143,
      hBottom: calibration.hBottom ?? 0.371,
      referenceBodyLength: sessionBodyScale,
      upDirection: upDir,
      isCalibrated: calibration.isCalibrated ?? true,
      calibratedAt: calibration.calibratedAt ?? Date.now(),
    };

    if (this.calibration.isCalibrated) {
      this.calibrationPhase = 'CALIBRATED';
      // Reset all smoothing state so old corrupted values cannot influence new calculation
      this.smoothedMovement = 0;
      this.smoothedDepth = 0;
      this.movementVelocity = 0;
      this.prevSmoothedMovement = 0;
      this.activeRejectionReason = 'Ready in top position';
      saveCalibrationToStorage(this.calibration);
    }
  }

  public startGuidedCalibration(timestampMs: number = Date.now()) {
    this.calibrationPhase = 'HOLD_TOP';
    this.topCalibrationSamples = [];
    this.bottomCalibrationSamples = [];
    this.calibrationPhaseStartMs = timestampMs;
    this.calibration.isCalibrated = false;
    this.calibrationRepsCompleted = 0;
    this.calibrationRepState = 'AT_BOTTOM';
    this.calibrationMeasuredReps = [];
    this.currentCalibrationRepMinDist = 999;
    this.currentCalibrationRepMaxDist = 0;
    this.state = 'UNREADY';
    // Reset all smoothing state
    this.smoothedMovement = 0;
    this.smoothedDepth = 0;
    this.movementVelocity = 0;
    this.prevSmoothedMovement = 0;
    this.activeRejectionReason = 'Hold top plank position for 3s';
    this.formFeedback = 'Hold top plank (arms straight for 3s)...';
  }

  public cancelCalibration() {
    this.calibrationPhase = 'NOT_CALIBRATED';
    this.topCalibrationSamples = [];
    this.bottomCalibrationSamples = [];
  }

  public setOrientation(angle: DeviceOrientationAngle) {
    if (this.currentOrientation !== angle) {
      this.currentOrientation = angle;
      // Invalidate unfinished candidate on orientation change
      if (this.state !== 'UNREADY') {
        this.logTransition(this.state, 'UNREADY', Date.now());
        this.state = 'UNREADY';
        this.bottomAccepted = false;
        this.topDwellStartMs = 0;
        this.activeRejectionReason = 'Camera orientation changed; rep cancelled';
      }
    }
  }

  public resetWorkout() {
    this.totalReps = 0;
    this.state = 'UNREADY';
    this.bottomAccepted = false;
    this.topReached = false;
    this.smoothedMovement = 0;
    this.smoothedDepth = 0;
    this.movementVelocity = 0;
    this.prevSmoothedMovement = 0;
    this.currentRawMovement = 0;
    this.currentNormalizedMovement = 0;
    this.lastTimestampMs = 0;
    this.repStartTimeMs = 0;
    this.lastRepCompletedTimeMs = 0;
    this.bottomDwellStartMs = 0;
    this.topDwellStartMs = 0;
    this.isSideLocked = false;
    this.prevShoulderCenter = null;
    this.prevHandCenter = null;
    this.hasLockedInitialTop = false;
    this.activeRejectionReason = this.calibration.isCalibrated ? 'Assume top plank position' : 'Calibrate to start';
    this.transitionsLog = [];
    this.initialStartingHeight = null;
    this.highestTorsoPoint = 0.5;
    this.lowestTorsoPoint = 0.7;
    this.currentTorsoDelta = 0;
    this.currentRelativeTorsoMovement = 0;
  }

  /**
   * Relative Movement Plank Calibration:
   * Dynamically sets or recalibrates the initial starting height of the torso
   * anywhere in the frame (close to camera, far away, top, middle, or bottom of screen).
   */
  public recalibrateStartingPlank(torsoY?: number) {
    const targetY = torsoY !== undefined ? torsoY : this.currentTorsoY;
    this.initialStartingHeight = targetY;
    this.highestTorsoPoint = targetY;
    this.lowestTorsoPoint = targetY + 0.15;
    this.currentTorsoDelta = 0;
    this.currentRelativeTorsoMovement = 0;
    this.hasLockedInitialTop = false;
  }

  // Primary processing loop for each video frame
  public processFrame(
    landmarks: NormalizedLandmark[],
    timestampMs: number,
    videoWidth: number,
    videoHeight: number,
    isMirrored: boolean = false
  ): EngineProcessResult {
    // 1. Ignore duplicate or out-of-order timestamps
    if (this.lastTimestampMs > 0 && timestampMs <= this.lastTimestampMs) {
      return this.buildResult(false, false, 0);
    }
    const elapsedMs = this.lastTimestampMs > 0 ? timestampMs - this.lastTimestampMs : 33;
    this.lastTimestampMs = timestampMs;

    // Track FPS
    this.fpsCounter.frames++;
    if (timestampMs - this.fpsCounter.lastCheckMs >= 1000) {
      this.fpsCounter.fps = Math.round((this.fpsCounter.frames * 1000) / (timestampMs - this.fpsCounter.lastCheckMs));
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastCheckMs = timestampMs;
    }

    let repCompletedEvent = false;
    let bottomReachedEvent = false;

    // STEP 1: Pose Landmarks Check
    if (!landmarks || landmarks.length < 25) {
      this.handleTrackingLoss(timestampMs, 'No human pose detected in camera');
      return this.buildResult(false, false, this.smoothedDepth, false, 'No human pose detected');
    }

    // STEP 2: Landmark Confidence Validation & Bilateral Tracking
    const leftShoulderRaw = landmarks[POSE_INDEX.LEFT_SHOULDER];
    const rightShoulderRaw = landmarks[POSE_INDEX.RIGHT_SHOULDER];
    const leftWristRaw = landmarks[POSE_INDEX.LEFT_WRIST];
    const rightWristRaw = landmarks[POSE_INDEX.RIGHT_WRIST];
    const leftHipRaw = landmarks[POSE_INDEX.LEFT_HIP];
    const rightHipRaw = landmarks[POSE_INDEX.RIGHT_HIP];
    const leftElbowRaw = landmarks[POSE_INDEX.LEFT_ELBOW];
    const rightElbowRaw = landmarks[POSE_INDEX.RIGHT_ELBOW];

    const leftShoulderConf = leftShoulderRaw?.visibility ?? 0;
    const rightShoulderConf = rightShoulderRaw?.visibility ?? 0;
    const leftWristConf = leftWristRaw?.visibility ?? 0;
    const rightWristConf = rightWristRaw?.visibility ?? 0;
    const leftHipConf = leftHipRaw?.visibility ?? 0;
    const rightHipConf = rightHipRaw?.visibility ?? 0;

    const leftShoulderPt = toAspectCorrect(leftShoulderRaw, videoWidth, videoHeight, isMirrored);
    const rightShoulderPt = toAspectCorrect(rightShoulderRaw, videoWidth, videoHeight, isMirrored);
    const leftWristPt = toAspectCorrect(leftWristRaw, videoWidth, videoHeight, isMirrored);
    const rightWristPt = toAspectCorrect(rightWristRaw, videoWidth, videoHeight, isMirrored);
    const leftHipPt = leftHipRaw ? toAspectCorrect(leftHipRaw, videoWidth, videoHeight, isMirrored) : null;
    const rightHipPt = rightHipRaw ? toAspectCorrect(rightHipRaw, videoWidth, videoHeight, isMirrored) : null;
    const leftElbowPt = leftElbowRaw ? toAspectCorrect(leftElbowRaw, videoWidth, videoHeight, isMirrored) : null;
    const rightElbowPt = rightElbowRaw ? toAspectCorrect(rightElbowRaw, videoWidth, videoHeight, isMirrored) : null;

    const hasLeftShoulder = leftShoulderConf >= this.config.minShoulderConfidence;
    const hasRightShoulder = rightShoulderConf >= this.config.minShoulderConfidence;
    const hasLeftWrist = leftWristConf >= this.config.minWristConfidence;
    const hasRightWrist = rightWristConf >= this.config.minWristConfidence;

    // Check if at least one shoulder and one wrist are visible
    if ((!hasLeftShoulder && !hasRightShoulder) || (!hasLeftWrist && !hasRightWrist)) {
      const reason = (!hasLeftShoulder && !hasRightShoulder) ? 'Shoulders not visible' : 'Hands/wrists not visible';
      this.handleTrackingLoss(timestampMs, reason);
      return this.buildResult(false, false, this.smoothedDepth, false, reason);
    }

    // Determine Bilateral / Single-Side centers
    let shoulderCenter: AspectCorrectPoint;
    let handCenter: AspectCorrectPoint;
    let shoulderConf: number;
    let wristConf: number;

    if (hasLeftShoulder && hasRightShoulder && hasLeftWrist && hasRightWrist) {
      this.currentTrackingMode = 'bilateral';
      shoulderCenter = {
        x: (leftShoulderPt.x + rightShoulderPt.x) / 2,
        y: (leftShoulderPt.y + rightShoulderPt.y) / 2,
        z: 0,
      };
      handCenter = {
        x: (leftWristPt.x + rightWristPt.x) / 2,
        y: (leftWristPt.y + rightWristPt.y) / 2,
        z: 0,
      };
      shoulderConf = (leftShoulderConf + rightShoulderConf) / 2;
      wristConf = (leftWristConf + rightWristConf) / 2;
    } else if (hasRightShoulder && hasRightWrist && (!hasLeftShoulder || !hasLeftWrist)) {
      this.currentTrackingMode = 'right_only';
      shoulderCenter = rightShoulderPt;
      handCenter = rightWristPt;
      shoulderConf = rightShoulderConf;
      wristConf = rightWristConf;
      this.selectedSide = 'right';
    } else if (hasLeftShoulder && hasLeftWrist && (!hasRightShoulder || !hasRightWrist)) {
      this.currentTrackingMode = 'left_only';
      shoulderCenter = leftShoulderPt;
      handCenter = leftWristPt;
      shoulderConf = leftShoulderConf;
      wristConf = leftWristConf;
      this.selectedSide = 'left';
    } else {
      this.currentTrackingMode = 'fallback';
      shoulderCenter = hasRightShoulder ? rightShoulderPt : leftShoulderPt;
      handCenter = hasRightWrist ? rightWristPt : leftWristPt;
      shoulderConf = Math.max(leftShoulderConf, rightShoulderConf);
      wristConf = Math.max(leftWristConf, rightWristConf);
    }

    this.currentTrackingConfidence = (shoulderConf + wristConf) / 2;
    this.lastValidTrackingMs = timestampMs;

    // STEP 3: Spike / Outlier Rejection (A rejected frame must NEVER enter the smoother)
    if (this.prevShoulderCenter && this.prevHandCenter && elapsedMs < 100) {
      const sJump = Math.hypot(shoulderCenter.x - this.prevShoulderCenter.x, shoulderCenter.y - this.prevShoulderCenter.y);
      const hJump = Math.hypot(handCenter.x - this.prevHandCenter.x, handCenter.y - this.prevHandCenter.y);
      if (sJump > 0.30 || hJump > 0.30) {
        this.activeRejectionReason = 'Landmark spike rejected';
        return this.buildResult(false, false, this.smoothedDepth, false, 'Landmark spike rejected');
      }
    }
    this.prevShoulderCenter = shoulderCenter;
    this.prevHandCenter = handCenter;

    // STEP 4: Calculate Centers & Relative Position
    const relativePosition = {
      x: shoulderCenter.x - handCenter.x,
      y: shoulderCenter.y - handCenter.y,
    };
    const currentDist = Math.hypot(relativePosition.x, relativePosition.y);

    const deviceUp = getImagePlaneUpDirection(this.currentOrientation);
    const upDir = this.calibration.isCalibrated ? this.calibration.upDirection : deviceUp;
    const currentElevation = Math.max(0, relativePosition.x * upDir.x + relativePosition.y * upDir.y);

    // Calculate torso length candidate during calibration or uncalibrated auto-baseline
    let measuredScale = 0.35;
    let activeHipCenter: AspectCorrectPoint | null = null;
    if (leftHipPt && rightHipPt && leftHipConf >= this.config.minHipConfidence && rightHipConf >= this.config.minHipConfidence) {
      activeHipCenter = {
        x: (leftHipPt.x + rightHipPt.x) / 2,
        y: (leftHipPt.y + rightHipPt.y) / 2,
        z: ((leftHipPt.z ?? 0) + (rightHipPt.z ?? 0)) / 2,
      };
      measuredScale = Math.max(0.18, Math.hypot(shoulderCenter.x - activeHipCenter.x, shoulderCenter.y - activeHipCenter.y));
    } else if (rightHipPt && rightHipConf >= this.config.minHipConfidence) {
      activeHipCenter = rightHipPt;
      measuredScale = Math.max(0.18, Math.hypot(shoulderCenter.x - rightHipPt.x, shoulderCenter.y - rightHipPt.y));
    } else if (leftHipPt && leftHipConf >= this.config.minHipConfidence) {
      activeHipCenter = leftHipPt;
      measuredScale = Math.max(0.18, Math.hypot(shoulderCenter.x - leftHipPt.x, shoulderCenter.y - leftHipPt.y));
    } else if (rightElbowPt) {
      const uArm = Math.hypot(rightShoulderPt.x - rightElbowPt.x, rightShoulderPt.y - rightElbowPt.y);
      const fArm = Math.hypot(rightElbowPt.x - rightWristPt.x, rightElbowPt.y - rightWristPt.y);
      measuredScale = Math.max(0.18, (uArm + fArm) * 1.1);
    }

    const torsoCenter = activeHipCenter
      ? { x: (shoulderCenter.x + activeHipCenter.x) / 2, y: (shoulderCenter.y + activeHipCenter.y) / 2 }
      : shoulderCenter;
    this.currentTorsoY = torsoCenter.y;

    let isPoseHorizontal = true;
    if (measuredScale > 0.20 && (rightHipPt || leftHipPt)) {
      const activeHip = rightHipPt || leftHipPt!;
      const torsoVec = { x: shoulderCenter.x - activeHip.x, y: shoulderCenter.y - activeHip.y };
      const torsoDotUp = Math.abs(torsoVec.x * upDir.x + torsoVec.y * upDir.y) / Math.max(0.01, Math.hypot(torsoVec.x, torsoVec.y));
      if (torsoDotUp > 0.85 && currentElevation > 0.50) {
        isPoseHorizontal = false;
        if (this.state !== 'UNREADY') {
          this.logTransition(this.state, 'UNREADY', timestampMs);
          this.state = 'UNREADY';
          this.bottomAccepted = false;
          this.isSideLocked = false;
          this.activeRejectionReason = 'User stood up / left exercise pose';
          this.formFeedback = 'Return to floor plank position';
        }
        return this.buildResult(false, false, 0, false, 'User standing up');
      }
    }

    // Calibration Phase handlers
    if (this.calibrationPhase === 'HOLD_TOP') {
      this.handleCalibrationHoldTop(shoulderCenter, handCenter, relativePosition, measuredScale, currentDist, currentElevation, timestampMs);
      return this.buildResult(false, false, 0, true);
    } else if (this.calibrationPhase === 'HOLD_BOTTOM') {
      this.handleCalibrationHoldBottom(currentDist, currentElevation, relativePosition.y, timestampMs);
      return this.buildResult(false, false, 1.0, true);
    } else if (this.calibrationPhase === 'PUSH_UP') {
      this.handleCalibrationPushUp(currentDist, currentElevation, timestampMs);
      return this.buildResult(false, false, 0.5, true);
    }

    // Calculate shoulder spread to detect front-facing vs side/profile view
    const shoulderSpread = (hasLeftShoulder && hasRightShoulder)
      ? Math.hypot(leftShoulderPt.x - rightShoulderPt.x, leftShoulderPt.y - rightShoulderPt.y)
      : 0;
    const isFrontFacing = hasLeftShoulder && hasRightShoulder && shoulderSpread >= 0.16;
    const viewAngle: 'front' | 'side' | 'oblique' = isFrontFacing
      ? 'front'
      : shoulderSpread >= 0.10
      ? 'oblique'
      : 'side';
    this.currentViewAngle = viewAngle;

    // Calculate Elbow Flexion Angles for Left & Right Arms
    let hasValidElbow = false;
    let leftElbowAngle = 180;
    let rightElbowAngle = 180;
    let currentElbowAngle = 180;

    const leftElbowConf = leftElbowRaw?.visibility ?? 0;
    const rightElbowConf = rightElbowRaw?.visibility ?? 0;

    if (leftShoulderRaw && leftElbowRaw && leftWristRaw && leftElbowConf >= 0.20 && leftShoulderConf >= 0.20 && leftWristConf >= 0.20) {
      leftElbowAngle = calculateJointAngle(leftShoulderRaw, leftElbowRaw, leftWristRaw);
    }
    if (rightShoulderRaw && rightElbowRaw && rightWristRaw && rightElbowConf >= 0.20 && rightShoulderConf >= 0.20 && rightWristConf >= 0.20) {
      rightElbowAngle = calculateJointAngle(rightShoulderRaw, rightElbowRaw, rightWristRaw);
    }

    if (leftElbowAngle < 179 && rightElbowAngle < 179) {
      currentElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
      hasValidElbow = true;
    } else if (leftElbowAngle < 179) {
      currentElbowAngle = leftElbowAngle;
      hasValidElbow = true;
    } else if (rightElbowAngle < 179) {
      currentElbowAngle = rightElbowAngle;
      hasValidElbow = true;
    }
    this.currentElbowAngle = currentElbowAngle;

    // Calculate Arm Extension Ratio: distance(Shoulder, Wrist) / (upperArm + forearm)
    // When arms are straight (lockout): ratio is ~0.90 – 1.00
    // When arms fold in half (90° pushup): distance reduces by ~half (ratio is ~0.50 – 0.65)
    let leftArmRatio = 1.0;
    let rightArmRatio = 1.0;
    let hasValidArmRatio = false;

    if (leftShoulderPt && leftElbowPt && leftWristPt && leftElbowConf >= 0.20 && leftShoulderConf >= 0.20 && leftWristConf >= 0.20) {
      const uArm = Math.hypot(leftShoulderPt.x - leftElbowPt.x, leftShoulderPt.y - leftElbowPt.y);
      const fArm = Math.hypot(leftElbowPt.x - leftWristPt.x, leftElbowPt.y - leftWristPt.y);
      const sToW = Math.hypot(leftShoulderPt.x - leftWristPt.x, leftShoulderPt.y - leftWristPt.y);
      const armSpan = uArm + fArm;
      if (armSpan > 0.05) {
        leftArmRatio = Math.min(1.0, sToW / armSpan);
        hasValidArmRatio = true;
      }
    }

    if (rightShoulderPt && rightElbowPt && rightWristPt && rightElbowConf >= 0.20 && rightShoulderConf >= 0.20 && rightWristConf >= 0.20) {
      const uArm = Math.hypot(rightShoulderPt.x - rightElbowPt.x, rightShoulderPt.y - rightElbowPt.y);
      const fArm = Math.hypot(rightElbowPt.x - rightWristPt.x, rightElbowPt.y - rightWristPt.y);
      const sToW = Math.hypot(rightShoulderPt.x - rightWristPt.x, rightShoulderPt.y - rightWristPt.y);
      const armSpan = uArm + fArm;
      if (armSpan > 0.05) {
        rightArmRatio = Math.min(1.0, sToW / armSpan);
        hasValidArmRatio = true;
      }
    }

    let armExtensionRatio = 1.0;
    if (leftArmRatio < 0.99 && rightArmRatio < 0.99) {
      armExtensionRatio = (leftArmRatio + rightArmRatio) / 2;
    } else if (leftArmRatio < 0.99) {
      armExtensionRatio = leftArmRatio;
    } else if (rightArmRatio < 0.99) {
      armExtensionRatio = rightArmRatio;
    }
    this.currentArmExtensionRatio = armExtensionRatio;

    // When arms are straight (lockout):
    // In side view, elbow flexion is directly visible across the 2D profile.
    // In front view, foreshortening along the camera ray requires checking physical elevation near top plank.
    let isArmsExtended = false;
    if (isFrontFacing) {
      const isNearPlankLockout = (currentElevation >= this.dynamicTopElevation * 0.78) &&
                                 (currentDist >= this.dynamicTopDist * 0.78);
      if (isNearPlankLockout) {
        if (hasValidElbow && hasValidArmRatio) {
          isArmsExtended = currentElbowAngle >= 135 && armExtensionRatio >= 0.84;
        } else if (hasValidElbow) {
          isArmsExtended = currentElbowAngle >= 135;
        } else if (hasValidArmRatio) {
          isArmsExtended = armExtensionRatio >= 0.84;
        } else {
          isArmsExtended = true;
        }
      }
    } else {
      isArmsExtended = (hasValidElbow ? currentElbowAngle >= 125 : true) &&
                       (hasValidArmRatio ? armExtensionRatio >= 0.80 : true);
    }

    if (isPoseHorizontal && currentElevation > 0.06) {
      if (this.initialStartingHeight === null || (!this.hasLockedInitialTop && isArmsExtended)) {
        this.initialStartingHeight = this.currentTorsoY;
        this.highestTorsoPoint = this.currentTorsoY;
        this.lowestTorsoPoint = this.currentTorsoY + 0.35 * measuredScale;
      } else if (isArmsExtended && this.currentTorsoY < this.highestTorsoPoint) {
        this.highestTorsoPoint = this.currentTorsoY;
      }

      if (!this.hasLockedInitialTop) {
        this.dynamicTopRel = { x: relativePosition.x, y: relativePosition.y };
        this.dynamicTopDist = Math.max(0.08, currentDist);
        this.dynamicTopElevation = Math.max(0.08, currentElevation);
        this.hasLockedInitialTop = true;
      } else if (isArmsExtended && (this.state === 'UP' || this.state === 'UNREADY')) {
        // Continuous smooth adaptation to current lockout across multiple reps
        this.dynamicTopElevation = 0.85 * this.dynamicTopElevation + 0.15 * currentElevation;
        this.dynamicTopDist = 0.85 * this.dynamicTopDist + 0.15 * currentDist;
        this.dynamicTopRel = {
          x: 0.85 * this.dynamicTopRel.x + 0.15 * relativePosition.x,
          y: 0.85 * this.dynamicTopRel.y + 0.15 * relativePosition.y,
        };
      }
    }

    if (this.currentTorsoY > this.lowestTorsoPoint) {
      this.lowestTorsoPoint = this.currentTorsoY;
    }

    // Delta between highest (plank) and lowest (dip) points of the torso relative to initial calibrated starting height:
    const plankBaseline = this.initialStartingHeight !== null ? this.highestTorsoPoint : this.currentTorsoY;
    const currentTorsoDelta = Math.max(0, this.currentTorsoY - plankBaseline);
    this.currentTorsoDelta = currentTorsoDelta;
    const dipRange = Math.max(0.05, Math.max(this.lowestTorsoPoint - this.highestTorsoPoint, 0.35 * measuredScale));
    this.currentRelativeTorsoMovement = Math.min(1.2, currentTorsoDelta / dipRange);

    const sessionScale = this.calibration.isCalibrated
      ? (this.calibration.sessionBodyScale || 0.35)
      : (this.dynamicTopDist || this.calibration.sessionBodyScale || 0.35);
    const movementAxis = this.calibration.movementAxis ?? { x: -upDir.x, y: -upDir.y };

    const topRel = this.dynamicTopRel;
    const diff = {
      x: relativePosition.x - topRel.x,
      y: relativePosition.y - topRel.y,
    };
    const rawMovement = diff.x * movementAxis.x + diff.y * movementAxis.y;
    const normalizedMovement = rawMovement / sessionScale;

    this.currentRawMovement = rawMovement;
    this.currentNormalizedMovement = normalizedMovement;
    this.currentRawH = currentElevation / sessionScale;

    // STEP 6: Movement Sanity Validation
    if (Number.isNaN(normalizedMovement) || !Number.isFinite(normalizedMovement)) {
      this.activeRejectionReason = 'Movement calculation produced NaN';
      return this.buildResult(false, false, this.smoothedDepth, false, 'Movement NaN');
    }

    // STEP 7: Smoothing (Only accepted samples enter the smoother!)
    const tau = this.config.emaTimeConstantMs;
    const isFirstOrResume = this.lastTimestampMs === 0 || elapsedMs > 350 || Number.isNaN(this.smoothedMovement);
    if (isFirstOrResume) {
      this.smoothedMovement = normalizedMovement;
    } else {
      const alpha = Math.min(1, Math.max(0.05, 1 - Math.exp(-elapsedMs / tau)));
      this.smoothedMovement = alpha * normalizedMovement + (1 - alpha) * this.smoothedMovement;
    }

    // STEP 8: Velocity
    const dt = Math.max(0.01, elapsedMs / 1000);
    this.movementVelocity = (this.smoothedMovement - this.prevSmoothedMovement) / dt;
    this.prevSmoothedMovement = this.smoothedMovement;

    // Normalized depth metric [0.0, 1.2] for the state machine
    const targetRange = (this.calibration.isCalibrated && this.calibration.targetMovementRange)
      ? this.calibration.targetMovementRange
      : (isFrontFacing ? 0.35 : 0.65);
    const rawDepth = Math.max(0, Math.min(1.2, normalizedMovement / targetRange));
    const smoothedShoulderDepth = Math.max(0, Math.min(1.2, this.smoothedMovement / targetRange));

    // Vertical descent from top plank towards hands:
    const verticalDescent = Math.max(0, this.dynamicTopElevation - currentElevation);
    const targetDescent = (this.calibration.isCalibrated && this.calibration.targetMovementRange)
      ? this.calibration.targetMovementRange * sessionScale
      : (isFrontFacing ? 0.45 * this.dynamicTopElevation : 0.65 * sessionScale);
    const verticalDepth = Math.max(0, Math.min(1.2, verticalDescent / Math.max(0.04, targetDescent)));

    // Distance reduction between shoulders and hands (reduces by half in pushup):
    const distReduction = Math.max(0, this.dynamicTopDist - currentDist);
    const distDepth = Math.max(0, Math.min(1.2, distReduction / Math.max(0.04, 0.45 * this.dynamicTopDist)));

    // Biomechanical arm flexion:
    const elbowFlexionDepth = hasValidElbow
      ? Math.max(0, Math.min(1.2, (155 - currentElbowAngle) / (155 - 90)))
      : 0;
    const armRatioDepth = hasValidArmRatio
      ? Math.max(0, Math.min(1.2, (0.86 - armExtensionRatio) / (0.86 - 0.55)))
      : 0;

    const armFlexionDepth = hasValidElbow && hasValidArmRatio
      ? Math.max(elbowFlexionDepth, armRatioDepth * 0.85 + elbowFlexionDepth * 0.15)
      : (hasValidElbow ? elbowFlexionDepth : armRatioDepth);

    let combinedDepth = smoothedShoulderDepth;
    if (isFrontFacing) {
      combinedDepth = Math.max(smoothedShoulderDepth, verticalDepth, distDepth, this.currentRelativeTorsoMovement);
      if (hasValidElbow || hasValidArmRatio) {
        if (combinedDepth > this.config.topAcceptedThreshold || armFlexionDepth > 0.30) {
          combinedDepth = Math.max(combinedDepth, armFlexionDepth * 0.90);
        }
      }
    } else {
      // In side view, smoothedShoulderDepth is direct and accurate
      if (hasValidElbow || hasValidArmRatio) {
        if (smoothedShoulderDepth > this.config.topAcceptedThreshold && armFlexionDepth > 0.50) {
          combinedDepth = Math.max(combinedDepth, smoothedShoulderDepth, armFlexionDepth * 0.80);
        }
      }
      if (this.currentRelativeTorsoMovement > 0.35 && !isArmsExtended) {
        combinedDepth = Math.max(combinedDepth, this.currentRelativeTorsoMovement);
      }
    }

    // CRUCIAL ANTI-STRAIGHT-ARM CHEAT GATE:
    // If arms are locked straight, depth is hard-clamped to 0!
    if (isArmsExtended) {
      combinedDepth = 0;
    }

    this.smoothedDepth = Math.max(0, Math.min(1.2, combinedDepth));

    // STEP 9: Core 5-Stage State Machine:
    // UNREADY -> UP -> GOING_DOWN -> DOWN -> GOING_UP -> UP (+1 Rep)
    switch (this.state) {
      case 'UNREADY': {
        this.isSideLocked = false;
        this.bottomAccepted = false;
        this.topReached = false;

        // Requires being at top position continuously for topConfirmationMs
        if (this.smoothedDepth <= this.config.topAcceptedThreshold) {
          if (this.topDwellStartMs === 0) {
            this.topDwellStartMs = timestampMs;
          } else if (timestampMs - this.topDwellStartMs >= this.config.topConfirmationMs) {
            this.logTransition('UNREADY', 'UP', timestampMs);
            this.state = 'UP';
            this.topReached = true;
            this.activeRejectionReason = 'Ready in top position';
            this.formFeedback = 'Ready • Begin push-up';
          }
        } else {
          this.topDwellStartMs = 0;
          this.activeRejectionReason = 'Return to full top position to arm tracker';
          this.formFeedback = 'Extend arms to starting plank';
        }
        break;
      }

      case 'UP': {
        this.isSideLocked = false;
        // User leaves top position and descends past leaveTopThreshold
        const timeSinceLastRep = timestampMs - this.lastRepCompletedTimeMs;
        if (this.smoothedDepth > this.config.leaveTopThreshold && timeSinceLastRep >= this.config.repCooldownMs) {
          this.logTransition('UP', 'GOING_DOWN', timestampMs);
          this.state = 'GOING_DOWN';
          this.isSideLocked = true; // Lock side during candidate rep
          this.repStartTimeMs = timestampMs;
          this.bottomAccepted = false;
          this.bottomDwellStartMs = 0;
          this.activeRejectionReason = 'Descending towards target depth';
          this.formFeedback = 'Lower down to target depth';
        } else {
          this.formFeedback = 'Ready • Begin descent';
        }
        break;
      }

      case 'GOING_DOWN': {
        // Did user reach accepted bottom depth?
        if (this.smoothedDepth >= this.config.bottomAcceptedThreshold) {
          // In front-facing view, 2D perspective causes elbow angles to measure higher than actual 3D angle.
          // If vertical descent, distance reduction, or torso delta has reached bottom target, arms are definitely bent!
          const areArmsActuallyBent = isFrontFacing
            ? (verticalDepth >= 0.60 || distDepth >= 0.60 || this.currentRelativeTorsoMovement >= 0.60 || currentElbowAngle <= 140 || armExtensionRatio <= 0.88)
            : ((hasValidElbow ? currentElbowAngle <= 125 : true) || (hasValidArmRatio ? armExtensionRatio <= 0.82 : true));

          if (!areArmsActuallyBent) {
            this.bottomDwellStartMs = 0;
            this.activeRejectionReason = 'Bend elbows to lower chest into pushup';
            this.formFeedback = 'Bend elbows to lower chest';
            break;
          }

          if (this.bottomDwellStartMs === 0) {
            this.bottomDwellStartMs = timestampMs;
          } else if (timestampMs - this.bottomDwellStartMs >= this.config.bottomConfirmationMs) {
            // Bottom confirmed!
            this.logTransition('GOING_DOWN', 'DOWN', timestampMs);
            this.state = 'DOWN';
            this.bottomAccepted = true;
            bottomReachedEvent = true;
            this.activeRejectionReason = 'Bottom target confirmed';
            this.formFeedback = '✓ Target depth reached! Push up!';
          }
        } else if (this.smoothedDepth <= this.config.topAcceptedThreshold) {
          // User returned to top before reaching bottom -> Partial Rep rejected
          this.logTransition('GOING_DOWN', 'UP', timestampMs);
          this.state = 'UP';
          this.isSideLocked = false;
          this.bottomAccepted = false;
          this.activeRejectionReason = 'Partial rep: bottom depth was not reached';
          this.formFeedback = 'Lower deeper to reach target';
        } else {
          this.bottomDwellStartMs = 0;
          this.formFeedback = 'Keep lowering to target depth';
        }
        break;
      }

      case 'DOWN': {
        // User starts pushing up past leaveBottomThreshold
        if (this.smoothedDepth < this.config.leaveBottomThreshold) {
          this.logTransition('DOWN', 'GOING_UP', timestampMs);
          this.state = 'GOING_UP';
          this.topDwellStartMs = 0;
          this.activeRejectionReason = 'Ascending to top lockout';
          this.formFeedback = 'Push all the way up!';
        } else {
          this.formFeedback = '✓ Depth hit! Push up!';
        }
        break;
      }

      case 'GOING_UP': {
        // User reaches top threshold or full lockout
        if (this.smoothedDepth <= this.config.topAcceptedThreshold || isArmsExtended) {
          if (this.topDwellStartMs === 0) {
            this.topDwellStartMs = timestampMs;
          } else if (timestampMs - this.topDwellStartMs >= this.config.topConfirmationMs) {
            // Full rep verified!
            const repDuration = timestampMs - this.repStartTimeMs;
            if (this.bottomAccepted && repDuration >= this.config.minRepDurationMs) {
              this.totalReps++;
              repCompletedEvent = true;
              this.lastRepCompletedTimeMs = timestampMs;
              this.logTransition('GOING_UP', 'UP', timestampMs);
              this.state = 'UP';
              this.bottomAccepted = false; // Immediately clear flag
              this.isSideLocked = false;
              this.topReached = true;
              this.activeRejectionReason = 'Rep successfully counted!';
              this.formFeedback = `Rep #${this.totalReps} counted!`;
              // Re-anchor top plank to current lockout for next rep
              this.dynamicTopElevation = Math.max(0.08, currentElevation);
              this.dynamicTopDist = Math.max(0.08, currentDist);
              this.dynamicTopRel = { x: relativePosition.x, y: relativePosition.y };
            } else {
              // Abnormal rep duration
              this.logTransition('GOING_UP', 'UP', timestampMs);
              this.state = 'UP';
              this.bottomAccepted = false;
              this.isSideLocked = false;
              this.activeRejectionReason = 'Rep too fast or incomplete';
              this.formFeedback = 'Push up with controlled tempo';
            }
          }
        } else if (this.smoothedDepth >= this.config.bottomAcceptedThreshold) {
          // Bounced back to bottom before reaching top -> Return to DOWN without double count
          this.logTransition('GOING_UP', 'DOWN', timestampMs);
          this.state = 'DOWN';
          this.topDwellStartMs = 0;
          this.activeRejectionReason = 'Dipped back down before lockout';
          this.formFeedback = 'Push up to full arm extension';
        } else {
          this.topDwellStartMs = 0;
          this.formFeedback = 'Push all the way up to starting height';
        }
        break;
      }
    }

    return this.buildResult(repCompletedEvent, bottomReachedEvent, rawDepth);
  }

  // Handle tracking loss with brief freeze vs full invalidation
  private handleTrackingLoss(timestampMs: number, reason: string) {
    const elapsedSinceValid = timestampMs - this.lastValidTrackingMs;

    if (elapsedSinceValid <= this.config.trackingUncertaintyLimitMs) {
      // Brief gap (<= 220ms): Freeze state without advancing dwell timers
      this.bottomDwellStartMs = 0;
      this.topDwellStartMs = 0;
      this.activeRejectionReason = `Tracking brief gap (${reason})`;
    } else if (elapsedSinceValid > this.config.trackingLossResetMs) {
      // Prolonged loss (> 450ms): Invalidate candidate rep
      if (this.state !== 'UNREADY') {
        this.logTransition(this.state, 'UNREADY', timestampMs);
        this.state = 'UNREADY';
        this.bottomAccepted = false;
        this.isSideLocked = false;
        this.activeRejectionReason = `Tracking lost: ${reason}. Invalided candidate rep.`;
        this.formFeedback = 'Step into camera frame & assume top position';
      }
    }
  }

  // Calibration Step 1: Hold Top Starting Plank Position for 3.0s
  private handleCalibrationHoldTop(
    shoulderCenter: AspectCorrectPoint,
    handCenter: AspectCorrectPoint,
    relPos: { x: number; y: number },
    measuredScale: number,
    currentDist: number,
    currentElevation: number,
    timestampMs: number
  ) {
    this.topCalibrationSamples.push({
      shoulderCenter,
      handCenter,
      relPos,
      scale: measuredScale,
      dist: currentDist,
      elev: currentElevation,
    });

    const elapsed = timestampMs - this.calibrationPhaseStartMs;
    const remainingSec = Math.max(1, Math.ceil((3000 - elapsed) / 1000));
    const progress = Math.min(100, Math.round((elapsed / 3000) * 100));
    this.formFeedback = `Hold top plank... ${remainingSec}s (${progress}%)`;

    if (elapsed >= 3000 && this.topCalibrationSamples.length >= 15) {
      // Calculate medians across valid calibration frames
      const sortedScales = this.topCalibrationSamples.map((s) => s.scale).sort((a, b) => a - b);
      const medianScale = sortedScales[Math.floor(sortedScales.length / 2)];

      const sortedRelX = this.topCalibrationSamples.map((s) => s.relPos.x).sort((a, b) => a - b);
      const sortedRelY = this.topCalibrationSamples.map((s) => s.relPos.y).sort((a, b) => a - b);
      const medianRelPos = {
        x: sortedRelX[Math.floor(sortedRelX.length / 2)],
        y: sortedRelY[Math.floor(sortedRelY.length / 2)],
      };

      const sortedDist = this.topCalibrationSamples.map((s) => s.dist).sort((a, b) => a - b);
      const medianDist = sortedDist[Math.floor(sortedDist.length / 2)];

      const sortedElev = this.topCalibrationSamples.map((s) => s.elev).sort((a, b) => a - b);
      const medianElev = sortedElev[Math.floor(sortedElev.length / 2)];

      const deviceUp = getImagePlaneUpDirection(this.currentOrientation);
      const movementAxis = { x: -deviceUp.x, y: -deviceUp.y };

      // FREEZE sessionBodyScale
      this.calibration.sessionBodyScale = medianScale;
      this.calibration.referenceBodyLength = medianScale;
      this.calibration.topRelativePosition = medianRelPos;
      this.calibration.movementAxis = movementAxis;
      this.calibration.topDistance = medianDist;
      this.calibration.topElevation = medianElev;
      this.calibration.hTop = medianDist / medianScale;

      // Advance to Step 2: Floor Depth for 2.0s
      this.calibrationPhase = 'HOLD_BOTTOM';
      this.bottomCalibrationSamples = [];
      this.calibrationPhaseStartMs = timestampMs;
      this.activeRejectionReason = 'Now lower down to floor depth and hold for 2s';
      this.formFeedback = 'Lower down to floor depth and hold for 2s...';
    }
  }

  // Calibration Step 2: Hold Bottom Target Position for 2.0s
  private handleCalibrationHoldBottom(
    currentDist: number,
    currentElevation: number,
    relY: number,
    timestampMs: number
  ) {
    this.bottomCalibrationSamples.push({
      dist: currentDist,
      elev: currentElevation,
      relY,
    });

    const elapsed = timestampMs - this.calibrationPhaseStartMs;
    const remainingSec = Math.max(1, Math.ceil((2000 - elapsed) / 1000));
    const progress = Math.min(100, Math.round((elapsed / 2000) * 100));
    this.formFeedback = `Hold floor depth... ${remainingSec}s (${progress}%)`;

    if (elapsed >= 2000 && this.bottomCalibrationSamples.length >= 10) {
      const sortedD = this.bottomCalibrationSamples.map((s) => s.dist).sort((a, b) => a - b);
      const sortedE = this.bottomCalibrationSamples.map((s) => s.elev).sort((a, b) => a - b);
      const medianBtmDist = sortedD[Math.floor(sortedD.length / 2)];
      const medianBtmElev = sortedE[Math.floor(sortedE.length / 2)];

      const topD = this.calibration.topDistance ?? 0.42;
      const topE = this.calibration.topElevation ?? 0.38;
      const distRange = topD - medianBtmDist;
      const elevRange = topE - medianBtmElev;

      if (distRange < this.config.minCalibrationRange && elevRange < this.config.minCalibrationRange) {
        this.calibrationPhase = 'NOT_CALIBRATED';
        this.activeRejectionReason = 'Calibration range too small. Try deeper pushup.';
        this.formFeedback = 'Range too small. Tap recalibrate and lower deeper.';
        return;
      }

      this.calibration.bottomDistance = medianBtmDist;
      this.calibration.bottomElevation = medianBtmElev;
      this.calibration.hBottom = medianBtmDist / this.calibration.sessionBodyScale;

      const scale = this.calibration.sessionBodyScale;
      this.calibration.targetMovementRange = Math.max(0.20, Math.max(distRange, elevRange) / scale);

      // Advance to Step 3: Measure 3 full dynamic pushups
      this.calibrationPhase = 'PUSH_UP';
      this.calibrationPhaseStartMs = timestampMs;
      this.calibrationRepsCompleted = 0;
      this.calibrationRepState = 'AT_BOTTOM';
      this.calibrationMeasuredReps = [];
      this.currentCalibrationRepMinDist = medianBtmDist;
      this.currentCalibrationRepMaxDist = medianBtmDist;
      this.activeRejectionReason = 'Perform 3 full pushups to measure dynamic range';
      this.formFeedback = 'Push up! Calibration rep 1 of 3...';
    }
  }

  // Calibration Step 3: Measure 3 full pushups
  private handleCalibrationPushUp(
    currentDist: number,
    currentElevation: number,
    timestampMs: number
  ) {
    const topD = this.calibration.topDistance ?? 0.42;
    const btmD = this.calibration.bottomDistance ?? 0.18;
    const topE = this.calibration.topElevation ?? 0.38;
    const btmE = this.calibration.bottomElevation ?? 0.12;

    const rangeD = Math.max(0.06, topD - btmD);
    const rangeE = Math.max(0.06, topE - btmE);

    this.currentCalibrationRepMinDist = Math.min(this.currentCalibrationRepMinDist, currentDist);
    this.currentCalibrationRepMaxDist = Math.max(this.currentCalibrationRepMaxDist, currentDist);

    const isNearTop = currentDist >= topD - rangeD * 0.30 || currentElevation >= topE - rangeE * 0.30;
    const isNearBottom = currentDist <= btmD + rangeD * 0.35 || currentElevation <= btmE + rangeE * 0.35;

    if (this.calibrationRepState === 'AT_BOTTOM') {
      if (currentDist > btmD + rangeD * 0.35 || currentElevation > btmE + rangeE * 0.35) {
        this.calibrationRepState = 'GOING_UP';
        this.formFeedback = `Push all the way up! (Pushup ${this.calibrationRepsCompleted + 1}/3)`;
      } else {
        this.formFeedback = `Push up to plank! (Pushup ${this.calibrationRepsCompleted + 1}/3)`;
      }
    } else if (this.calibrationRepState === 'GOING_UP') {
      if (isNearTop) {
        this.calibrationRepState = 'AT_TOP';
        this.calibrationRepsCompleted++;
        this.calibrationMeasuredReps.push({
          topD: this.currentCalibrationRepMaxDist,
          btmD: this.currentCalibrationRepMinDist,
          topE: currentElevation,
          btmE: btmE,
        });

        // Reset tracking for next rep
        this.currentCalibrationRepMinDist = currentDist;
        this.currentCalibrationRepMaxDist = currentDist;

        if (this.calibrationRepsCompleted >= 3) {
          this.finalizeCalibration(timestampMs);
          return;
        } else {
          this.formFeedback = `✓ Pushup ${this.calibrationRepsCompleted}/3 recorded! Lower down for rep ${this.calibrationRepsCompleted + 1}...`;
        }
      }
    } else if (this.calibrationRepState === 'AT_TOP') {
      if (currentDist < topD - rangeD * 0.25 || currentElevation < topE - rangeE * 0.25) {
        this.calibrationRepState = 'GOING_DOWN';
        this.formFeedback = `Lower to floor! (Pushup ${this.calibrationRepsCompleted + 1}/3)`;
      } else {
        this.formFeedback = `Lower down for pushup ${this.calibrationRepsCompleted + 1}/3...`;
      }
    } else if (this.calibrationRepState === 'GOING_DOWN') {
      if (isNearBottom) {
        this.calibrationRepState = 'AT_BOTTOM';
        this.formFeedback = `Bottom reached! Push up! (Pushup ${this.calibrationRepsCompleted + 1}/3)`;
      }
    }
  }

  // Finalizes calibration and persists to storage
  private finalizeCalibration(timestampMs: number) {
    if (this.calibrationMeasuredReps.length > 0) {
      const avgTop = this.calibrationMeasuredReps.reduce((acc, r) => acc + r.topD, 0) / this.calibrationMeasuredReps.length;
      const avgBtm = this.calibrationMeasuredReps.reduce((acc, r) => acc + r.btmD, 0) / this.calibrationMeasuredReps.length;
      const dynamicRange = Math.max(0.06, avgTop - avgBtm);
      const scale = this.calibration.sessionBodyScale;
      this.calibration.targetMovementRange = Math.max(0.20, dynamicRange / scale);
      this.calibration.topDistance = avgTop;
      this.calibration.bottomDistance = avgBtm;
    }

    this.calibration.isCalibrated = true;
    this.calibration.calibratedAt = timestampMs;
    this.calibrationPhase = 'CALIBRATED';
    this.state = 'UP';
    this.topReached = true;
    this.smoothedMovement = 0;
    this.smoothedDepth = 0;
    this.movementVelocity = 0;
    this.prevSmoothedMovement = 0;
    this.activeRejectionReason = 'Calibration successful!';
    this.formFeedback = '✓ 3 pushups calibrated! Saved in memory.';

    // Save to localStorage immediately
    saveCalibrationToStorage(this.calibration);
  }

  private logTransition(from: PushupState, to: PushupState, timestampMs: number) {
    this.transitionsLog.unshift({ from, to, timestampMs });
    if (this.transitionsLog.length > 12) {
      this.transitionsLog.pop();
    }
  }

  private buildResult(
    repCompletedEvent: boolean,
    bottomReachedEvent: boolean,
    rawDepth: number,
    sampleAccepted: boolean = true,
    rejectionReason: string = ''
  ): EngineProcessResult {
    this.currentSampleAccepted = sampleAccepted;
    if (rejectionReason) {
      this.activeRejectionReason = rejectionReason;
    }

    const diagnostics: DiagnosticsState = {
      timestampMs: this.lastTimestampMs,
      fps: this.fpsCounter.fps,
      orientationAngle: this.currentOrientation,
      selectedSide: this.selectedSide,
      isSideLocked: this.isSideLocked,
      trackingMode: this.currentTrackingMode,
      shoulderConfidence: Number(this.currentTrackingConfidence.toFixed(2)),
      wristConfidence: Number(this.currentTrackingConfidence.toFixed(2)),
      hipConfidence: 0.8,
      trackingConfidence: Number(this.currentTrackingConfidence.toFixed(2)),
      sampleAccepted,
      rejectionReason: rejectionReason || this.activeRejectionReason,
      activeRejectionReason: rejectionReason || this.activeRejectionReason,
      sessionBodyScale: Number(this.calibration.sessionBodyScale.toFixed(3)),
      rawMovement: Number(this.currentRawMovement.toFixed(3)),
      normalizedMovement: Number(this.currentNormalizedMovement.toFixed(3)),
      smoothedMovement: Number(this.smoothedMovement.toFixed(3)),
      movementVelocity: Number(this.movementVelocity.toFixed(2)),
      rawH: Number(this.currentRawH.toFixed(3)),
      rawDepth: Number(rawDepth.toFixed(3)),
      smoothedDepth: Number(this.smoothedDepth.toFixed(3)),
      state: this.state,
      bottomAccepted: this.bottomAccepted,
      topReached: this.topReached,
      isCalibrated: this.calibration.isCalibrated,
      calibrationPhase: this.calibrationPhase,
      hTop: Number(this.calibration.hTop.toFixed(3)),
      hBottom: Number(this.calibration.hBottom.toFixed(3)),
      referenceBodyLength: Number(this.calibration.sessionBodyScale.toFixed(3)),
      recentTransitions: [...this.transitionsLog],
      totalReps: this.totalReps,
      isPoseHorizontal: true,
      elbowAngle: Math.round(this.currentElbowAngle),
      armExtensionRatio: Number(this.currentArmExtensionRatio.toFixed(2)),
      viewAngle: this.currentViewAngle,
      torsoY: Number(this.currentTorsoY.toFixed(3)),
      initialStartingHeight: this.initialStartingHeight !== null ? Number(this.initialStartingHeight.toFixed(3)) : undefined,
      highestTorsoPoint: Number(this.highestTorsoPoint.toFixed(3)),
      lowestTorsoPoint: Number(this.lowestTorsoPoint.toFixed(3)),
      torsoDelta: Number(this.currentTorsoDelta.toFixed(3)),
      relativeTorsoMovement: Number(this.currentRelativeTorsoMovement.toFixed(3)),
    };

    return {
      state: this.state,
      smoothedDepth: Math.max(0, Math.min(1.2, this.smoothedDepth)),
      rawDepth,
      reps: this.totalReps,
      formFeedback: this.formFeedback,
      activeRejectionReason: this.activeRejectionReason,
      isBottomAccepted: this.bottomAccepted,
      repCompletedEvent,
      bottomReachedEvent,
      diagnostics,
    };
  }
}
