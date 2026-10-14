// Landmark calculation & pushup angle geometry

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// MediaPipe landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
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

// Calculate 3D invariant angle (in degrees) between three points: A -> B -> C with vertex B
export function calculate3DAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v1z = (a.z ?? 0) - (b.z ?? 0);

  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const v2z = (c.z ?? 0) - (b.z ?? 0);

  const dot = v1x * v2x + v1y * v2y + v1z * v2z;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);

  if (mag1 < 1e-6 || mag2 < 1e-6) return 180;

  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round(Math.acos(cosTheta) * (180.0 / Math.PI));
}

// Fallback 2D angle (in degrees) between three points: A -> B -> C with vertex B
export function calculate2DAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return Math.round(angle);
}

// Best joint angle: balances 3D orientation invariance with 2D stability
export function calculateAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const angle3D = calculate3DAngle(a, b, c);
  const angle2D = calculate2DAngle(a, b, c);

  // If z coordinates are valid, 3D angle prevents foreshortening perspective collapse
  if (Math.abs((a.z ?? 0) - (b.z ?? 0)) > 0.001 || Math.abs((c.z ?? 0) - (b.z ?? 0)) > 0.001) {
    // Weighted blend favoring 3D for perspective depth
    return Math.round(0.75 * angle3D + 0.25 * angle2D);
  }
  return angle2D;
}

export interface PushupMetrics {
  elbowAngle: number;
  leftElbowAngle: number;
  rightElbowAngle: number;
  hipAngle: number;
  depthPercentage: number;
  isFormGood: boolean;
  formFeedback: string;
  dominantSide: 'left' | 'right';
  hasVisibleBody: boolean;
  shoulderY: number;
  handY: number;
  torsoElevation: number;
  elevationRatio: number;
  isArmsStraight: boolean;
  isTorsoAtFloorLevel: boolean;
  leftShoulderActive: boolean;
  rightShoulderActive: boolean;
  leftShoulderY: number;
  rightShoulderY: number;
  shoulderWidth: number;
  shoulderToHandDist: number;
  // Relative movement detection properties (frame-position invariant)
  torsoY: number;
  torsoX?: number;
  initialStartingHeight: number | null;
  highestPlankPoint: number;
  lowestDipPoint: number;
  torsoDelta: number;
  relativeTorsoMovement: number;
}

// Maintain sticky side to avoid frame-to-frame flapping
let lastKnownDominantSide: 'left' | 'right' = 'right';

export function analyzePushupPose(
  landmarks: Landmark[],
  preferredSide?: 'left' | 'right',
  calibratedPlankHeight?: number | null
): PushupMetrics {
  if (!landmarks || landmarks.length < 25) {
    return {
      elbowAngle: 180,
      leftElbowAngle: 180,
      rightElbowAngle: 180,
      hipAngle: 180,
      depthPercentage: 0,
      isFormGood: false,
      formFeedback: 'Step into camera frame',
      dominantSide: lastKnownDominantSide,
      hasVisibleBody: false,
      shoulderY: 0.5,
      handY: 0.8,
      torsoElevation: 0.3,
      elevationRatio: 0.6,
      isArmsStraight: false,
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
    };
  }

  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];

  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

  // Helper to reliably check landmark presence
  const hasLandmark = (p?: Landmark) => {
    if (!p) return false;
    const vis = p.visibility ?? 0.8;
    return vis >= 0.15;
  };

  // Evaluate presence of shoulders and arms
  const isLeftShoulderValid = hasLandmark(leftShoulder);
  const isRightShoulderValid = hasLandmark(rightShoulder);
  const isLeftArmValid = isLeftShoulderValid && (hasLandmark(leftWrist) || hasLandmark(leftElbow));
  const isRightArmValid = isRightShoulderValid && (hasLandmark(rightWrist) || hasLandmark(rightElbow));

  if (!isLeftShoulderValid && !isRightShoulderValid) {
    return {
      elbowAngle: 180,
      leftElbowAngle: 180,
      rightElbowAngle: 180,
      hipAngle: 180,
      depthPercentage: 0,
      isFormGood: false,
      formFeedback: 'Make sure your shoulders and hands are visible',
      dominantSide: lastKnownDominantSide,
      hasVisibleBody: false,
      shoulderY: 0.5,
      handY: 0.8,
      torsoElevation: 0.3,
      elevationRatio: 0.6,
      isArmsStraight: false,
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
    };
  }

  // Determine dominant visible side
  let dominantSide: 'left' | 'right' = isRightArmValid ? 'right' : 'left';
  if (isLeftArmValid && isRightArmValid) {
    const leftVis = (leftShoulder?.visibility ?? 0.7) + (leftWrist?.visibility ?? 0.7);
    const rightVis = (rightShoulder?.visibility ?? 0.7) + (rightWrist?.visibility ?? 0.7);
    dominantSide = rightVis >= leftVis ? 'right' : 'left';
  }
  lastKnownDominantSide = dominantSide;

  // 1. Explicit Shoulder Detection Metrics
  const leftShoulderY = leftShoulder?.y ?? 0.5;
  const rightShoulderY = rightShoulder?.y ?? 0.5;
  const shoulderWidth = (leftShoulder && rightShoulder)
    ? Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y)
    : 0.25;

  const activeShoulder = dominantSide === 'right' ? (rightShoulder || leftShoulder) : (leftShoulder || rightShoulder);
  const activeWrist = dominantSide === 'right' ? (rightWrist || leftWrist) : (leftWrist || rightWrist);
  const activeElbow = dominantSide === 'right' ? (rightElbow || leftElbow) : (leftElbow || rightElbow);

  const shoulderY = activeShoulder?.y ?? 0.5;
  const handY = activeWrist?.y ?? 0.8;

  // 2. Physical Arm Length Scale (distance Shoulder -> Elbow -> Wrist)
  let armLength = 0.30;
  if (activeShoulder && activeElbow && activeWrist) {
    const upperArm = Math.hypot(activeShoulder.x - activeElbow.x, activeShoulder.y - activeElbow.y);
    const foreArm = Math.hypot(activeElbow.x - activeWrist.x, activeElbow.y - activeWrist.y);
    armLength = Math.max(0.12, upperArm + foreArm);
  }

  // 3. Euclidean Shoulder-to-Hand Distance (Invariant to camera angle, rotation or tilt)
  let shoulderToHandDist = armLength * 0.9;
  if (activeShoulder && activeWrist) {
    shoulderToHandDist = Math.hypot(activeShoulder.x - activeWrist.x, activeShoulder.y - activeWrist.y);
  }
  const extensionRatio = shoulderToHandDist / armLength;

  // 4. Vertical Torso Elevation above Hands (for standard upright phone placement)
  const torsoElevation = Math.max(0, handY - shoulderY);
  const verticalRatio = torsoElevation / armLength;

  // 5. Combined Shoulder Depth Percentage (0% = Arms Straight at Top, 100% = Shoulders at Floor)
  let depthExtension = ((0.86 - extensionRatio) / (0.86 - 0.44)) * 100;
  let depthVertical = ((0.60 - verticalRatio) / (0.60 - 0.18)) * 100;

  // 6. Torso Center & Relative Movement Detection (Frame Position & Distance Invariant)
  const hasHips = hasLandmark(leftHip) || hasLandmark(rightHip);
  const hipX = (hasLandmark(leftHip) && hasLandmark(rightHip))
    ? ((leftHip!.x + rightHip!.x) / 2)
    : (leftHip?.x ?? rightHip?.x ?? activeShoulder?.x ?? 0.5);
  const hipY = (hasLandmark(leftHip) && hasLandmark(rightHip))
    ? ((leftHip!.y + rightHip!.y) / 2)
    : (leftHip?.y ?? rightHip?.y ?? shoulderY);

  const torsoX = hasHips ? ((activeShoulder?.x ?? 0.5) + hipX) / 2 : (activeShoulder?.x ?? 0.5);
  const torsoY = hasHips ? (shoulderY + hipY) / 2 : shoulderY;
  const torsoScale = hasHips
    ? Math.max(0.15, Math.hypot((activeShoulder?.x ?? 0.5) - hipX, shoulderY - hipY))
    : armLength;

  // Relative delta from calibrated initial starting height
  const initialStartingHeight = (calibratedPlankHeight !== undefined && calibratedPlankHeight !== null)
    ? calibratedPlankHeight
    : null;
  const highestPlankPoint = initialStartingHeight !== null ? Math.min(initialStartingHeight, torsoY) : torsoY;
  const targetDipOffset = 0.38 * torsoScale;
  const lowestDipPoint = highestPlankPoint + targetDipOffset;
  const torsoDelta = initialStartingHeight !== null ? Math.max(0, torsoY - initialStartingHeight) : 0;
  const relativeTorsoMovement = Math.min(1.0, Math.max(0, torsoDelta / Math.max(0.04, targetDipOffset)));

  // If calibrated starting height is present, incorporate relative torso descent
  let depth = Math.max(depthExtension, depthVertical);
  if (initialStartingHeight !== null) {
    depth = Math.max(depth, Math.round(relativeTorsoMovement * 100));
  }
  depth = Math.max(0, Math.min(100, Math.round(depth)));

  // Posture flags
  const isArmsStraight = depth <= 24 || extensionRatio >= 0.84;
  const isTorsoAtFloorLevel = depth >= 84 || extensionRatio <= 0.46;

  // Real-time relative movement feedback
  let formFeedback = 'Plank position calibrated • Ready to dip';
  if (isTorsoAtFloorLevel) {
    formFeedback = '✓ Lowest dip reached! Now push up!';
  } else if (depth >= 30) {
    formFeedback = 'Lower torso down towards the floor';
  } else if (isArmsStraight) {
    formFeedback = 'Plank (highest) • Ready to descend';
  }

  return {
    elbowAngle: 180,
    leftElbowAngle: 180,
    rightElbowAngle: 180,
    hipAngle: 180,
    depthPercentage: depth,
    isFormGood: true,
    formFeedback,
    dominantSide,
    hasVisibleBody: true,
    shoulderY,
    handY,
    torsoElevation,
    elevationRatio: extensionRatio,
    isArmsStraight,
    isTorsoAtFloorLevel,
    leftShoulderActive: isLeftShoulderValid,
    rightShoulderActive: isRightShoulderValid,
    leftShoulderY,
    rightShoulderY,
    shoulderWidth,
    shoulderToHandDist,
    torsoY,
    torsoX,
    initialStartingHeight,
    highestPlankPoint,
    lowestDipPoint,
    torsoDelta,
    relativeTorsoMovement,
  };
}

// Draw skeleton and shoulder-to-hand tracking canvas:
// Explicitly draws connections and markers for left and right shoulders alongside the arms!
export function drawPoseCanvas(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  metrics: PushupMetrics,
  width: number,
  height: number,
  isMirrored: boolean = true,
  themeColors?: { accent?: string; glow?: string; secondary?: string }
) {
  ctx.clearRect(0, 0, width, height);

  if (!landmarks || landmarks.length === 0) return;

  const accent = themeColors?.accent || '#10b981';
  const glow = themeColors?.glow || '#34d399';
  const secondary = themeColors?.secondary || '#bef264';

  const getX = (normX: number) => {
    return isMirrored ? (1 - normX) * width : normX * width;
  };
  const getY = (normY: number) => normY * height;

  const isVisible = (p?: Landmark) => {
    if (!p) return false;
    const v = p.visibility ?? 0.8;
    return v >= 0.15;
  };

  ctx.save();

  // 1. Lower Body & Torso Trunk Connections
  const trunkConnections = [
    [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
    [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
    [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
    [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
    [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  ];

  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';

  for (const [i, j] of trunkConnections) {
    const p1 = landmarks[i];
    const p2 = landmarks[j];
    if (!isVisible(p1) || !isVisible(p2)) continue;

    ctx.beginPath();
    ctx.moveTo(getX(p1.x), getY(p1.y));
    ctx.lineTo(getX(p2.x), getY(p2.y));
    ctx.stroke();
  }

  // 2. HIGHLIGHTED ARM CONNECTIONS: Left and Right Arms
  // (Left Shoulder -> Left Elbow -> Left Wrist, Right Shoulder -> Right Elbow -> Right Wrist)
  const isAtBottom = metrics.depthPercentage >= 80;
  const armColor = isAtBottom ? glow : accent;

  const armSegments = [
    { from: POSE_LANDMARKS.LEFT_SHOULDER, to: POSE_LANDMARKS.LEFT_ELBOW, label: 'L Upper Arm' },
    { from: POSE_LANDMARKS.LEFT_ELBOW, to: POSE_LANDMARKS.LEFT_WRIST, label: 'L Forearm' },
    { from: POSE_LANDMARKS.RIGHT_SHOULDER, to: POSE_LANDMARKS.RIGHT_ELBOW, label: 'R Upper Arm' },
    { from: POSE_LANDMARKS.RIGHT_ELBOW, to: POSE_LANDMARKS.RIGHT_WRIST, label: 'R Forearm' },
  ];

  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  for (const seg of armSegments) {
    const p1 = landmarks[seg.from];
    const p2 = landmarks[seg.to];
    if (!isVisible(p1) || !isVisible(p2)) continue;

    ctx.beginPath();
    ctx.moveTo(getX(p1.x), getY(p1.y));
    ctx.lineTo(getX(p2.x), getY(p2.y));
    ctx.strokeStyle = armColor;
    ctx.shadowColor = armColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 3. HIGHLIGHTED SHOULDER-TO-SHOULDER CONNECTION (Clavicle Bridge)
  // Ensures shoulders are prominently connected together and to both arms
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

  if (isVisible(leftShoulder) && isVisible(rightShoulder)) {
    const lsX = getX(leftShoulder.x);
    const lsY = getY(leftShoulder.y);
    const rsX = getX(rightShoulder.x);
    const rsY = getY(rightShoulder.y);

    ctx.beginPath();
    ctx.moveTo(lsX, lsY);
    ctx.lineTo(rsX, rsY);
    ctx.strokeStyle = glow;
    ctx.lineWidth = 5;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 4. SHOULDER-TO-HAND DIRECT DISTANCE VECTORS
  // Tracks vertical displacement from each shoulder directly down to the corresponding hand
  const drawShoulderToHandVector = (shoulderIdx: number, wristIdx: number) => {
    const s = landmarks[shoulderIdx];
    const w = landmarks[wristIdx];
    if (!isVisible(s) || !isVisible(w)) return;

    const sX = getX(s.x);
    const sY = getY(s.y);
    const wX = getX(w.x);
    const wY = getY(w.y);

    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(sX, sY);
    ctx.lineTo(wX, wY);
    ctx.strokeStyle = isAtBottom ? '#22c55e' : 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = isAtBottom ? '#22c55e' : '#38bdf8';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  };

  drawShoulderToHandVector(POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_WRIST);
  drawShoulderToHandVector(POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_WRIST);

  // 5. JOINT MARKERS: Elbows and Hips
  const midJoints = [
    POSE_LANDMARKS.LEFT_ELBOW,
    POSE_LANDMARKS.RIGHT_ELBOW,
    POSE_LANDMARKS.LEFT_HIP,
    POSE_LANDMARKS.RIGHT_HIP,
  ];

  for (const idx of midJoints) {
    const p = landmarks[idx];
    if (!isVisible(p)) continue;
    ctx.beginPath();
    ctx.arc(getX(p.x), getY(p.y), 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 6. HANDS / FLOOR CONTACT ANCHORS
  const drawHandAnchor = (wristIdx: number) => {
    const w = landmarks[wristIdx];
    if (!isVisible(w)) return;
    const x = getX(w.x);
    const y = getY(w.y);

    ctx.beginPath();
    ctx.arc(x, y, 7, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 2 * Math.PI);
    ctx.strokeStyle = secondary;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  drawHandAnchor(POSE_LANDMARKS.LEFT_WRIST);
  drawHandAnchor(POSE_LANDMARKS.RIGHT_WRIST);

  // 7. HERO VISUAL: EXPLICIT LEFT AND RIGHT SHOULDER MARKERS
  // Highlights both shoulders alongside the arms with pulsing concentric halos and labels
  const shoulderDefs = [
    { idx: POSE_LANDMARKS.LEFT_SHOULDER, label: 'L SHOULDER', isLeft: true },
    { idx: POSE_LANDMARKS.RIGHT_SHOULDER, label: 'R SHOULDER', isLeft: false },
  ];

  for (const def of shoulderDefs) {
    const s = landmarks[def.idx];
    if (!isVisible(s)) continue;

    const x = getX(s.x);
    const y = getY(s.y);

    // A. Outer Pulsing Target Halo
    ctx.beginPath();
    ctx.arc(x, y, isAtBottom ? 22 : 18, 0, 2 * Math.PI);
    ctx.strokeStyle = isAtBottom ? glow : accent;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = isAtBottom ? glow : accent;
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // B. Inner Concentric Ring
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // C. Solid Radiant Shoulder Core
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, 2 * Math.PI);
    ctx.fillStyle = isAtBottom ? glow : accent;
    ctx.fill();

    // Note: Shoulder text labeling (left shoulder / right shoulder) removed as requested
  }

  // 8. RELATIVE TORSO MOVEMENT VISUALIZATION (Frame-Invariant Delta)
  // Shows Plank (highest), Dip Target (lowest), and Current Torso Position
  if (metrics.torsoY !== undefined) {
    const torsoX = metrics.torsoX !== undefined ? getX(metrics.torsoX) : width / 2;
    const currentTorsoY = getY(metrics.torsoY);
    const plankY = getY(metrics.highestPlankPoint ?? metrics.torsoY);
    const dipY = getY(metrics.lowestDipPoint ?? (metrics.torsoY + 0.15));

    const guideWidth = Math.min(180, width * 0.45);
    const xLeft = torsoX - guideWidth / 2;
    const xRight = torsoX + guideWidth / 2;

    // A. Highest Point (Plank Level Line)
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(xLeft, plankY);
    ctx.lineTo(xRight, plankY);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText('PLANK LEVEL (TOP)', xLeft + 4, plankY - 4);

    // B. Lowest Point (Dip Level Line)
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(xLeft, dipY);
    ctx.lineTo(xRight, dipY);
    ctx.strokeStyle = isAtBottom ? '#22c55e' : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = isAtBottom ? '#22c55e' : '#a1a1aa';
    ctx.fillText('DIP TARGET (FLOOR)', xLeft + 4, dipY + 12);

    // C. Vertical Delta Guideline from Plank to Current Torso
    ctx.beginPath();
    ctx.moveTo(torsoX, plankY);
    ctx.lineTo(torsoX, currentTorsoY);
    ctx.strokeStyle = isAtBottom ? '#22c55e' : '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();

    // D. Torso Center Marker
    ctx.beginPath();
    ctx.arc(torsoX, currentTorsoY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = isAtBottom ? '#22c55e' : '#10b981';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // E. Delta Badge
    const deltaPct = Math.round((metrics.relativeTorsoMovement ?? 0) * 100);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    if (typeof (ctx as any).roundRect === 'function') {
      ctx.beginPath();
      (ctx as any).roundRect(xRight - 56, currentTorsoY - 11, 56, 18, 6);
      ctx.fill();
    } else {
      ctx.fillRect(xRight - 56, currentTorsoY - 11, 56, 18);
    }
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = isAtBottom ? '#4ade80' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`Δ ${deltaPct}%`, xRight - 28, currentTorsoY + 2);
  }

  ctx.restore();
}
