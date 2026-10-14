import { describe, it, expect, beforeEach } from 'vitest';
import {
  PushupEngine,
  NormalizedLandmark,
  POSE_INDEX,
  getImagePlaneUpDirection,
} from './pushupEngine';

// Helper to create mock MediaPipe landmarks for pushup simulation
function createMockPose(
  shoulderX: number,
  shoulderY: number,
  wristX: number,
  wristY: number,
  visibility: number = 0.9,
  hipY: number = shoulderY + 0.05,
  hipXOffset: number = 0.35,
  kneeY: number = hipY + 0.05
): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }));

  // Right arm and torso
  landmarks[POSE_INDEX.RIGHT_SHOULDER] = { x: shoulderX, y: shoulderY, z: 0, visibility };
  landmarks[POSE_INDEX.RIGHT_ELBOW] = { x: shoulderX + 0.1, y: (shoulderY + wristY) / 2, z: 0, visibility };
  landmarks[POSE_INDEX.RIGHT_WRIST] = { x: wristX, y: wristY, z: 0, visibility };
  landmarks[POSE_INDEX.RIGHT_HIP] = { x: shoulderX + hipXOffset, y: hipY, z: 0, visibility };
  landmarks[POSE_INDEX.RIGHT_KNEE] = { x: shoulderX + hipXOffset + 0.3, y: kneeY, z: 0, visibility };

  // Left arm mirror
  landmarks[POSE_INDEX.LEFT_SHOULDER] = { x: shoulderX, y: shoulderY, z: 0, visibility: 0.8 };
  landmarks[POSE_INDEX.LEFT_ELBOW] = { x: shoulderX - 0.1, y: (shoulderY + wristY) / 2, z: 0, visibility: 0.8 };
  landmarks[POSE_INDEX.LEFT_WRIST] = { x: wristX, y: wristY, z: 0, visibility: 0.8 };
  landmarks[POSE_INDEX.LEFT_HIP] = { x: shoulderX + hipXOffset, y: hipY, z: 0, visibility: 0.8 };
  landmarks[POSE_INDEX.LEFT_KNEE] = { x: shoulderX + hipXOffset + 0.3, y: kneeY, z: 0, visibility: 0.8 };

  return landmarks;
}

describe('PushupEngine Comprehensive Suite', () => {
  let engine: PushupEngine;

  beforeEach(() => {
    engine = new PushupEngine();
    // At top: shoulderY=0.35, wristY=0.75 => dy=0.40 => hTop = 0.40 / 0.35 = 1.143
    // At bottom: shoulderY=0.62, wristY=0.75 => dy=0.13 => hBottom = 0.13 / 0.35 = 0.371
    engine.setCalibration({
      hTop: 1.143,
      hBottom: 0.371,
      referenceBodyLength: 0.35,
      upDirection: { x: 0, y: -1 },
      isCalibrated: true,
      calibratedAt: Date.now(),
    });
  });

  it('1. Arming to UP: Confirmed top position arms tracker from UNREADY to UP', () => {
    let t = 1000;
    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75);

    // Initial frame
    let res = engine.processFrame(topPose, t, 640, 480);
    expect(res.state).toBe('UNREADY');

    // Dwell at top for > 100ms
    t += 120;
    res = engine.processFrame(topPose, t, 640, 480);
    expect(res.state).toBe('UP');
    expect(res.reps).toBe(0);
  });

  it('2. One complete cycle counts exactly once', () => {
    let t = 1000;
    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75);
    const bottomPose = createMockPose(0.4, 0.62, 0.4, 0.75);

    // Step 1: Confirm Top (UNREADY -> UP)
    engine.processFrame(topPose, t, 640, 480);
    t += 150;
    let res = engine.processFrame(topPose, t, 640, 480);
    expect(res.state).toBe('UP');

    // Step 2: Descend past leaveTopThreshold (UP -> GOING_DOWN)
    t += 200;
    const midDownPose = createMockPose(0.4, 0.48, 0.4, 0.75);
    res = engine.processFrame(midDownPose, t, 640, 480);
    expect(res.state).toBe('GOING_DOWN');

    // Step 3: Hit Bottom Target and dwell for bottomConfirmationMs (GOING_DOWN -> DOWN)
    t += 250;
    engine.processFrame(bottomPose, t, 640, 480);
    t += 120;
    res = engine.processFrame(bottomPose, t, 640, 480);
    expect(res.state).toBe('DOWN');
    expect(res.isBottomAccepted).toBe(true);

    // Step 4: Ascend (DOWN -> GOING_UP)
    t += 200;
    const midUpPose = createMockPose(0.4, 0.45, 0.4, 0.75);
    res = engine.processFrame(midUpPose, t, 640, 480);
    expect(res.state).toBe('GOING_UP');

    // Step 5: Lockout at Top and dwell to confirm (GOING_UP -> UP + 1 Rep)
    t += 250;
    engine.processFrame(topPose, t, 640, 480);
    t += 120;
    res = engine.processFrame(topPose, t, 640, 480);
    expect(res.state).toBe('UP');
    expect(res.reps).toBe(1);
    expect(res.repCompletedEvent).toBe(true);
    expect(res.isBottomAccepted).toBe(false); // Flag cleared immediately
  });

  it('3. Multiple complete cycles count correctly', () => {
    let t = 1000;
    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75);
    const bottomPose = createMockPose(0.4, 0.62, 0.4, 0.75);

    // Arm to UP
    engine.processFrame(topPose, t, 640, 480);
    t += 150;
    engine.processFrame(topPose, t, 640, 480);

    // Perform 3 reps
    for (let rep = 1; rep <= 3; rep++) {
      // Cooldown wait between reps
      t += 350;
      // Descent
      engine.processFrame(createMockPose(0.4, 0.48, 0.4, 0.75), t, 640, 480);
      t += 250;
      // Bottom hold
      engine.processFrame(bottomPose, t, 640, 480);
      t += 120;
      engine.processFrame(bottomPose, t, 640, 480);
      t += 200;
      // Ascent
      engine.processFrame(createMockPose(0.4, 0.45, 0.4, 0.75), t, 640, 480);
      t += 250;
      // Top lockout hold
      engine.processFrame(topPose, t, 640, 480);
      t += 120;
      const res = engine.processFrame(topPose, t, 640, 480);
      expect(res.reps).toBe(rep);
    }
  });

  it('4. Partial reps do not count', () => {
    let t = 1000;
    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75);
    // Half descent: only reaches depth ~45% (shoulder at 0.48 instead of 0.62)
    const shallowPose = createMockPose(0.4, 0.48, 0.4, 0.75);

    // Arm to UP
    engine.processFrame(topPose, t, 640, 480);
    t += 150;
    engine.processFrame(topPose, t, 640, 480);

    // Start descent
    t += 300;
    let res = engine.processFrame(shallowPose, t, 640, 480);
    expect(res.state).toBe('GOING_DOWN');

    // Return to top without ever touching bottom
    t += 200;
    engine.processFrame(topPose, t, 640, 480);
    t += 150;
    res = engine.processFrame(topPose, t, 640, 480);

    // Must reset to UP without awarding any rep!
    expect(res.state).toBe('UP');
    expect(res.reps).toBe(0);
    expect(res.isBottomAccepted).toBe(false);
  });

  it('5. Bottom pauses and threshold jitter do not double-count', () => {
    let t = 1000;
    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75);
    const bottomPose = createMockPose(0.4, 0.62, 0.4, 0.75);

    // Arm
    engine.processFrame(topPose, t, 640, 480);
    t += 150;
    engine.processFrame(topPose, t, 640, 480);

    // Descent to bottom
    t += 300;
    engine.processFrame(createMockPose(0.4, 0.50, 0.4, 0.75), t, 640, 480);
    t += 200;
    engine.processFrame(bottomPose, t, 640, 480);
    t += 120;
    let res = engine.processFrame(bottomPose, t, 640, 480);
    expect(res.state).toBe('DOWN');

    // Bounce / dwell at bottom for 2 full seconds with jitter
    for (let i = 0; i < 10; i++) {
      t += 200;
      const jitterY = 0.62 + (i % 2 === 0 ? 0.02 : -0.02);
      res = engine.processFrame(createMockPose(0.4, jitterY, 0.4, 0.75), t, 640, 480);
      expect(res.state).toBe('DOWN');
      expect(res.reps).toBe(0);
    }
  });

  it('6. Brief tracking gaps (<= 220ms) freeze state without fabricating transitions', () => {
    let t = 1000;
    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75);

    // Arm to UP
    engine.processFrame(topPose, t, 640, 480);
    t += 150;
    engine.processFrame(topPose, t, 640, 480);

    // Descending
    t += 300;
    let res = engine.processFrame(createMockPose(0.4, 0.50, 0.4, 0.75), t, 640, 480);
    expect(res.state).toBe('GOING_DOWN');

    // Brief gap of 150ms where wrist is occluded
    t += 150;
    const obscuredPose = createMockPose(0.4, 0.50, 0.4, 0.75, 0.1); // low confidence
    res = engine.processFrame(obscuredPose, t, 640, 480);

    // State is preserved in GOING_DOWN without jumping or resetting
    expect(res.state).toBe('GOING_DOWN');
    expect(res.reps).toBe(0);
  });

  it('7. Prolonged tracking loss (> 380ms) resets candidate rep to UNREADY', () => {
    let t = 1000;
    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75);

    // Arm to UP
    engine.processFrame(topPose, t, 640, 480);
    t += 150;
    engine.processFrame(topPose, t, 640, 480);

    // Descend
    t += 300;
    let res = engine.processFrame(createMockPose(0.4, 0.50, 0.4, 0.75), t, 640, 480);
    expect(res.state).toBe('GOING_DOWN');

    // Tracking lost for 600ms
    t += 600;
    const emptyLandmarks: NormalizedLandmark[] = [];
    res = engine.processFrame(emptyLandmarks, t, 640, 480);

    // Candidate invalidated; requires fresh top hold to re-arm
    expect(res.state).toBe('UNREADY');
    expect(res.reps).toBe(0);
  });

  it('8. Getting up after an accepted bottom cancels rep and does NOT award count', () => {
    let t = 1000;
    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75);
    const bottomPose = createMockPose(0.4, 0.62, 0.4, 0.75);

    // Complete descent to bottom
    engine.processFrame(topPose, t, 640, 480);
    t += 150;
    engine.processFrame(topPose, t, 640, 480);
    t += 200;
    engine.processFrame(createMockPose(0.4, 0.48, 0.4, 0.75), t, 640, 480);
    t += 200;
    engine.processFrame(bottomPose, t, 640, 480);
    t += 120;
    let res = engine.processFrame(bottomPose, t, 640, 480);
    expect(res.state).toBe('DOWN');
    expect(res.isBottomAccepted).toBe(true);

    // User stands up! Torso becomes vertical: shoulder.y = 0.20, hip.y = 0.60, knee.y = 0.85
    t += 300;
    const standingPose = createMockPose(0.5, 0.20, 0.5, 0.85, 0.9, 0.60, 0.0, 0.85);
    res = engine.processFrame(standingPose, t, 640, 480);

    // Anti-cheat must trigger: cancelled!
    expect(res.state).toBe('UNREADY');
    expect(res.reps).toBe(0);
    expect(res.isBottomAccepted).toBe(false);
  });

  it('9. Orientation change invalidates candidate rep and resets state', () => {
    let t = 1000;
    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75);

    // Arm to UP
    engine.processFrame(topPose, t, 640, 480);
    t += 150;
    engine.processFrame(topPose, t, 640, 480);

    // Descending
    t += 300;
    let res = engine.processFrame(createMockPose(0.4, 0.50, 0.4, 0.75), t, 640, 480);
    expect(res.state).toBe('GOING_DOWN');

    // Phone rotated from portrait to landscape
    engine.setOrientation(90);

    // Process single next frame (without 90ms dwell)
    t += 20;
    res = engine.processFrame(topPose, t, 640, 480);
    expect(res.state).toBe('UNREADY');
  });

  it('10. Different inference rates (15 FPS vs 60 FPS) preserve timing behavior', () => {
    const runSequence = (fps: number) => {
      const testEngine = new PushupEngine();
      testEngine.setCalibration({
        hTop: 1.143,
        hBottom: 0.371,
        referenceBodyLength: 0.35,
        upDirection: { x: 0, y: -1 },
        isCalibrated: true,
        calibratedAt: 1000,
      });

      const dt = Math.round(1000 / fps);
      let time = 1000;

      // Arm
      for (let i = 0; i < Math.ceil(150 / dt); i++) {
        testEngine.processFrame(createMockPose(0.4, 0.35, 0.4, 0.75), time, 640, 480);
        time += dt;
      }

      // Descend over 400ms
      for (let i = 0; i < Math.ceil(400 / dt); i++) {
        const y = 0.35 + (0.62 - 0.35) * (i / Math.ceil(400 / dt));
        testEngine.processFrame(createMockPose(0.4, y, 0.4, 0.75), time, 640, 480);
        time += dt;
      }

      // Hold bottom for 150ms
      for (let i = 0; i < Math.ceil(150 / dt); i++) {
        testEngine.processFrame(createMockPose(0.4, 0.62, 0.4, 0.75), time, 640, 480);
        time += dt;
      }

      // Ascend over 400ms
      for (let i = 0; i < Math.ceil(400 / dt); i++) {
        const y = 0.62 - (0.62 - 0.35) * (i / Math.ceil(400 / dt));
        testEngine.processFrame(createMockPose(0.4, y, 0.4, 0.75), time, 640, 480);
        time += dt;
      }

      // Hold top for 150ms
      let finalRes = testEngine.processFrame(createMockPose(0.4, 0.35, 0.4, 0.75), time, 640, 480);
      for (let i = 0; i < Math.ceil(150 / dt); i++) {
        time += dt;
        finalRes = testEngine.processFrame(createMockPose(0.4, 0.35, 0.4, 0.75), time, 640, 480);
      }

      return finalRes.reps;
    };

    const repsAt15FPS = runSequence(15);
    const repsAt60FPS = runSequence(60);

    expect(repsAt15FPS).toBe(1);
    expect(repsAt60FPS).toBe(1);
  });

  it('11. Equivalent coordinate rotations produce equivalent corrected measurements', () => {
    // Portrait orientation (0 deg): UP is (0, -1)
    const enginePortrait = new PushupEngine();
    enginePortrait.setOrientation(0);
    enginePortrait.setCalibration({
      hTop: 1.0,
      hBottom: 0.3,
      referenceBodyLength: 0.35,
      upDirection: getImagePlaneUpDirection(0),
      isCalibrated: true,
      calibratedAt: 1000,
    });

    const posePortrait = createMockPose(0.5, 0.4, 0.5, 0.75);
    const resPortrait = enginePortrait.processFrame(posePortrait, 1000, 500, 500);

    // Landscape orientation (90 deg): UP is (-1, 0)
    const engineLandscape = new PushupEngine();
    engineLandscape.setOrientation(90);
    engineLandscape.setCalibration({
      hTop: 1.0,
      hBottom: 0.3,
      referenceBodyLength: 0.35,
      upDirection: getImagePlaneUpDirection(90),
      isCalibrated: true,
      calibratedAt: 1000,
    });

    const poseLandscape = createMockPose(0.25, 0.5, 0.60, 0.5);
    const resLandscape = engineLandscape.processFrame(poseLandscape, 1000, 500, 500);

    expect(resPortrait.diagnostics.rawH).toBeCloseTo(resLandscape.diagnostics.rawH, 2);
    expect(resPortrait.rawDepth).toBeCloseTo(resLandscape.rawDepth, 2);
  });

  it('12. Verification of reference scale stabilization, bilateral tracking, spike rejection & clean movement waveform', () => {
    const testEngine = new PushupEngine();
    let t = 1000;

    // Calibrate top position with visible hips (scale = 0.35)
    testEngine.setCalibration({
      sessionBodyScale: 0.35,
      targetMovementRange: 0.70,
      topRelativePosition: { x: 0, y: -0.40 },
      movementAxis: { x: 0, y: 1 },
      topDistance: 0.40,
      bottomDistance: 0.13,
      isCalibrated: true,
      calibratedAt: 1000,
    });

    // 1. Verify body scale is frozen
    expect(testEngine.getCalibration().sessionBodyScale).toBe(0.35);

    // 2. Frame at TOP: shoulder at 0.35, wrist at 0.75 (both bilateral visible, hips visible)
    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75, 0.9);
    let res = testEngine.processFrame(topPose, t, 640, 480);
    expect(res.diagnostics.sessionBodyScale).toBe(0.35);
    expect(res.diagnostics.rawMovement).toBeCloseTo(0.0, 2);
    expect(res.diagnostics.normalizedMovement).toBeCloseTo(0.0, 2);
    expect(res.diagnostics.trackingMode).toBe('bilateral');
    expect(res.diagnostics.sampleAccepted).toBe(true);

    // 3. Hips completely disappear! (Occluded or off-screen, exactly as in recording 00:54-01:02)
    const poseHipsDisappeared = createMockPose(0.4, 0.45, 0.4, 0.75, 0.9);
    poseHipsDisappeared[POSE_INDEX.LEFT_HIP].visibility = 0.0;
    poseHipsDisappeared[POSE_INDEX.RIGHT_HIP].visibility = 0.0;
    t += 100;
    res = testEngine.processFrame(poseHipsDisappeared, t, 640, 480);

    // VERIFY: sessionBodyScale remained frozen at 0.35, hips disappearing did NOT change scale!
    expect(res.diagnostics.sessionBodyScale).toBe(0.35);
    // VERIFY: no extreme negative depth values occur! Movement is positive and increasing
    expect(res.diagnostics.normalizedMovement).toBeGreaterThan(0.20);
    expect(res.diagnostics.normalizedMovement).toBeLessThan(0.40);
    expect(res.diagnostics.rawDepth).toBeGreaterThanOrEqual(0.0);

    // 4. Reach bottom of push-up (chest near floor, shoulder at 0.62, hands at 0.75) with hips still occluded
    const bottomPoseNoHips = createMockPose(0.4, 0.62, 0.4, 0.75, 0.9);
    bottomPoseNoHips[POSE_INDEX.LEFT_HIP].visibility = 0.0;
    bottomPoseNoHips[POSE_INDEX.RIGHT_HIP].visibility = 0.0;
    t += 150;
    res = testEngine.processFrame(bottomPoseNoHips, t, 640, 480);

    // VERIFY: Bottom reaches clean local maximum around 0.77 (0.27 / 0.35)
    expect(res.diagnostics.rawMovement).toBeCloseTo(0.27, 2);
    expect(res.diagnostics.normalizedMovement).toBeCloseTo(0.771, 2);
    expect(res.diagnostics.sessionBodyScale).toBe(0.35);

    // 5. Test spike rejection: landmark suddenly jumps by 0.45 in 30ms
    const spikePose = createMockPose(0.4, 0.10, 0.4, 0.75, 0.9);
    t += 30;
    const preSmoothed = res.diagnostics.smoothedMovement;
    res = testEngine.processFrame(spikePose, t, 640, 480);

    // VERIFY: Spike was rejected, reason logged, and did NOT corrupt the smoother
    expect(res.diagnostics.sampleAccepted).toBe(false);
    expect(res.diagnostics.rejectionReason).toContain('spike rejected');
    expect(res.diagnostics.smoothedMovement).toBeCloseTo(preSmoothed, 2);

    // 6. Test bilateral vs single-side fallback: left side occluded
    const leftOccludedPose = createMockPose(0.4, 0.62, 0.4, 0.75, 0.9);
    leftOccludedPose[POSE_INDEX.LEFT_SHOULDER].visibility = 0.0;
    leftOccludedPose[POSE_INDEX.LEFT_WRIST].visibility = 0.0;
    t += 100;
    res = testEngine.processFrame(leftOccludedPose, t, 640, 480);
    expect(res.diagnostics.trackingMode).toBe('right_only');
    expect(res.diagnostics.normalizedMovement).toBeCloseTo(0.771, 2);

    // 7. Push back up to TOP lockout
    t += 200;
    res = testEngine.processFrame(createMockPose(0.4, 0.45, 0.4, 0.75, 0.9), t, 640, 480);
    expect(res.diagnostics.normalizedMovement).toBeLessThan(0.50);

    t += 200;
    res = testEngine.processFrame(topPose, t, 640, 480);
    expect(res.diagnostics.normalizedMovement).toBeCloseTo(0.0, 2);
    expect(res.diagnostics.smoothedMovement).toBeLessThan(0.15);
  });

  it('13. Front-facing head-on pushup is recognized and accurately counted via depth fusion', () => {
    const engine = new PushupEngine();
    let t = 1000;

    // Helper for front-facing head-on pose
    // In front view: Left shoulder at x=0.35, Right shoulder at x=0.65 (shoulder width = 0.30)
    // Left wrist at x=0.30, Right wrist at x=0.70
    function createFrontPose(shoulderY: number, elbowXOffset: number, elbowY: number, wristY: number = 0.70) {
      const lm: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
      // Shoulders
      lm[POSE_INDEX.LEFT_SHOULDER] = { x: 0.35, y: shoulderY, z: 0, visibility: 0.95 };
      lm[POSE_INDEX.RIGHT_SHOULDER] = { x: 0.65, y: shoulderY, z: 0, visibility: 0.95 };
      // Elbows flare out as body descends
      lm[POSE_INDEX.LEFT_ELBOW] = { x: 0.35 - elbowXOffset, y: elbowY, z: 0, visibility: 0.95 };
      lm[POSE_INDEX.RIGHT_ELBOW] = { x: 0.65 + elbowXOffset, y: elbowY, z: 0, visibility: 0.95 };
      // Wrists on floor
      lm[POSE_INDEX.LEFT_WRIST] = { x: 0.30, y: wristY, z: 0, visibility: 0.95 };
      lm[POSE_INDEX.RIGHT_WRIST] = { x: 0.70, y: wristY, z: 0, visibility: 0.95 };
      // Hips behind shoulders
      lm[POSE_INDEX.LEFT_HIP] = { x: 0.40, y: shoulderY + 0.20, z: 0.3, visibility: 0.85 };
      lm[POSE_INDEX.RIGHT_HIP] = { x: 0.60, y: shoulderY + 0.20, z: 0.3, visibility: 0.85 };
      return lm;
    }

    // 1. Top position (straight arms, elbow angle ~165°)
    const frontTop = createFrontPose(0.35, 0.05, 0.52);
    engine.processFrame(frontTop, t, 640, 480);
    t += 120;
    let res = engine.processFrame(frontTop, t, 640, 480);
    expect(res.state).toBe('UP');
    expect(res.diagnostics.viewAngle).toBe('front');

    // 2. Descend to bottom (chest near floor, shoulders descend to 0.46, elbows flare out at 85°)
    t += 200;
    const frontMid = createFrontPose(0.40, 0.12, 0.58);
    res = engine.processFrame(frontMid, t, 640, 480);
    expect(res.state).toBe('GOING_DOWN');

    // Bottom reached
    t += 250;
    const frontBottom = createFrontPose(0.46, 0.18, 0.60);
    engine.processFrame(frontBottom, t, 640, 480);
    t += 120;
    res = engine.processFrame(frontBottom, t, 640, 480);

    // VERIFY: Front-facing pushup accurately achieves >= 75% depth and triggers DOWN!
    expect(res.smoothedDepth).toBeGreaterThanOrEqual(0.75);
    expect(res.state).toBe('DOWN');
    expect(res.isBottomAccepted).toBe(true);

    // 3. Push back up to top
    t += 250;
    const frontAscending = createFrontPose(0.37, 0.06, 0.54);
    res = engine.processFrame(frontAscending, t, 640, 480);
    expect(res.state).toBe('GOING_UP');

    t += 250;
    engine.processFrame(frontTop, t, 640, 480);
    t += 120;
    res = engine.processFrame(frontTop, t, 640, 480);

    // VERIFY: Rep counted!
    expect(res.reps).toBe(1);
    expect(res.state).toBe('UP');
  });

  it('14. Guided Calibration: 3s top hold, 2s bottom hold, and 3 pushups completes accurately', () => {
    const engine = new PushupEngine();
    let t = 1000;

    engine.startGuidedCalibration(t);
    expect(engine.getCalibration().isCalibrated).toBe(false);

    const topPose = createMockPose(0.4, 0.35, 0.4, 0.75);
    const bottomPose = createMockPose(0.4, 0.62, 0.4, 0.75);

    // Step 1: Hold top for 3 seconds (3000ms)
    for (let i = 0; i < 30; i++) {
      engine.processFrame(topPose, t, 640, 480);
      t += 100;
    }
    let res = engine.processFrame(topPose, t, 640, 480);
    // Should now have transitioned to Step 2 (HOLD_BOTTOM)
    expect(res.diagnostics.calibrationPhase).toBe('HOLD_BOTTOM');

    // Step 2: Hold bottom for 2 seconds (2000ms)
    for (let i = 0; i < 20; i++) {
      engine.processFrame(bottomPose, t, 640, 480);
      t += 100;
    }
    res = engine.processFrame(bottomPose, t, 640, 480);
    // Should now have transitioned to Step 3 (PUSH_UP)
    expect(res.diagnostics.calibrationPhase).toBe('PUSH_UP');

    // Step 3: Perform 3 calibration pushups
    // Pushup 1: Push up from bottom to top
    t += 300;
    engine.processFrame(topPose, t, 640, 480);
    t += 100;
    res = engine.processFrame(topPose, t, 640, 480);
    expect(res.diagnostics.calibrationPhase).toBe('PUSH_UP');

    // Pushup 2: Lower to bottom (descending and bottom) and push up (ascending and top)
    t += 300;
    engine.processFrame(bottomPose, t, 640, 480);
    t += 100;
    engine.processFrame(bottomPose, t, 640, 480);
    t += 300;
    engine.processFrame(topPose, t, 640, 480);
    t += 100;
    res = engine.processFrame(topPose, t, 640, 480);
    expect(res.diagnostics.calibrationPhase).toBe('PUSH_UP');

    // Pushup 3: Lower to bottom and push up
    t += 300;
    engine.processFrame(bottomPose, t, 640, 480);
    t += 100;
    engine.processFrame(bottomPose, t, 640, 480);
    t += 300;
    engine.processFrame(topPose, t, 640, 480);
    t += 100;
    res = engine.processFrame(topPose, t, 640, 480);

    // VERIFY: All 3 pushups completed -> CALIBRATED!
    expect(res.diagnostics.calibrationPhase).toBe('CALIBRATED');
    expect(res.diagnostics.isCalibrated).toBe(true);
    expect(engine.getCalibration().isCalibrated).toBe(true);
  });

  it('15. Anti-cheat: Moving up and down with locked straight arms does NOT count reps', () => {
    const engine = new PushupEngine();
    let t = 1000;

    // Helper to create pose with 100% straight locked arms (shoulder, elbow, wrist colinear at x=0.4)
    function createStraightArmPose(shoulderY: number, wristY: number = 0.75): NormalizedLandmark[] {
      const lm = createMockPose(0.4, shoulderY, 0.4, wristY);
      // Align elbow perfectly on the straight line between shoulder and wrist
      lm[POSE_INDEX.RIGHT_ELBOW] = { x: 0.4, y: (shoulderY + wristY) / 2, z: 0, visibility: 0.95 };
      lm[POSE_INDEX.LEFT_ELBOW] = { x: 0.4, y: (shoulderY + wristY) / 2, z: 0, visibility: 0.95 };
      return lm;
    }

    // Arm tracker at top plank
    const topStraight = createStraightArmPose(0.35);
    engine.processFrame(topStraight, t, 640, 480);
    t += 120;
    let res = engine.processFrame(topStraight, t, 640, 480);
    expect(res.state).toBe('UP');

    // User dips/rocks shoulders down by 0.20 on screen WITH COMPLETELY STRAIGHT ARMS
    const dippedStraight = createStraightArmPose(0.55);
    t += 200;
    res = engine.processFrame(dippedStraight, t, 640, 480);

    t += 200;
    res = engine.processFrame(dippedStraight, t, 640, 480);

    // VERIFY: Anti-cheat gate prevents bottom from being accepted!
    expect(res.isBottomAccepted).toBe(false);
    expect(res.state).not.toBe('DOWN');
    expect(res.smoothedDepth).toBeLessThanOrEqual(0.45);

    // User shifts back up to top
    t += 200;
    res = engine.processFrame(topStraight, t, 640, 480);
    t += 120;
    res = engine.processFrame(topStraight, t, 640, 480);

    // VERIFY: Zero reps counted for straight arm rocking!
    expect(res.reps).toBe(0);
  });

  it('16. Room Position Invariance: pushups performed far away in the room (hallway) count accurately', () => {
    const engine = new PushupEngine();
    let t = 1000;

    // Simulate user in the hallway (further from camera):
    // Shoulders at Y=0.55, Wrists at Y=0.70 (smaller on screen: distance is only 0.15 instead of 0.40)
    const hallwayTop = createMockPose(0.4, 0.55, 0.4, 0.70);
    hallwayTop[POSE_INDEX.RIGHT_ELBOW] = { x: 0.4, y: (0.55 + 0.70) / 2, z: 0, visibility: 0.95 };
    hallwayTop[POSE_INDEX.LEFT_ELBOW] = { x: 0.4, y: (0.55 + 0.70) / 2, z: 0, visibility: 0.95 };

    const hallwayBottom = createMockPose(0.4, 0.65, 0.4, 0.70);

    // 1. User gets into plank in the hallway
    engine.processFrame(hallwayTop, t, 640, 480);
    t += 120;
    let res = engine.processFrame(hallwayTop, t, 640, 480);
    expect(res.state).toBe('UP');
    expect(res.smoothedDepth).toBeLessThan(0.20);

    // 2. Descend to floor in hallway
    t += 200;
    engine.processFrame(createMockPose(0.4, 0.60, 0.4, 0.70), t, 640, 480);
    t += 150;
    engine.processFrame(hallwayBottom, t, 640, 480);
    t += 120;
    res = engine.processFrame(hallwayBottom, t, 640, 480);
    expect(res.state).toBe('DOWN');
    expect(res.isBottomAccepted).toBe(true);

    // 3. Push back up to plank in hallway
    t += 200;
    engine.processFrame(createMockPose(0.4, 0.57, 0.4, 0.70), t, 640, 480);
    t += 150;
    engine.processFrame(hallwayTop, t, 640, 480);
    t += 120;
    engine.processFrame(hallwayTop, t, 640, 480);
    t += 120;
    res = engine.processFrame(hallwayTop, t, 640, 480);

    // VERIFY: Rep counted accurately in the hallway without requiring high screen position!
    expect(res.reps).toBe(1);
    expect(res.state).toBe('UP');
  });

  it('17. Biomechanical folding: Distance reduces by half into pushup, while straight arm bobbing is rejected', () => {
    const engine = new PushupEngine();
    let t = 2000;

    // Top plank pose with straight arms (shoulder to wrist distance = 0.35)
    function makePlankPose(shoulderY: number, wristY: number = 0.75, elbowAngleStraight: boolean = true) {
      const p = createMockPose(0.45, shoulderY, 0.45, wristY);
      if (elbowAngleStraight) {
        p[POSE_INDEX.RIGHT_ELBOW] = { x: 0.45, y: (shoulderY + wristY) / 2, z: 0, visibility: 0.95 };
        p[POSE_INDEX.LEFT_ELBOW] = { x: 0.45, y: (shoulderY + wristY) / 2, z: 0, visibility: 0.95 };
      }
      return p;
    }

    const plankTop = makePlankPose(0.40, 0.75, true);

    // 1. Establish top plank
    engine.processFrame(plankTop, t, 640, 480);
    t += 120;
    let res = engine.processFrame(plankTop, t, 640, 480);
    expect(res.state).toBe('UP');
    expect(res.diagnostics.armExtensionRatio).toBeGreaterThanOrEqual(0.85);

    // 2. User tries moving shoulders down with completely straight arms (rocking / cheat)
    const straightArmCheat = makePlankPose(0.58, 0.75, true);
    t += 200;
    res = engine.processFrame(straightArmCheat, t, 640, 480);
    t += 120;
    res = engine.processFrame(straightArmCheat, t, 640, 480);
    // Anti-cheat gate must enforce 0 depth and refuse to count as bottom!
    expect(res.smoothedDepth).toBeLessThanOrEqual(0.35);
    expect(res.isBottomAccepted).toBe(false);
    expect(res.state).not.toBe('DOWN');

    // 3. User performs a genuine pushup:
    // Shoulders lower to 0.62 (stopping above hands at 0.75), elbows fold (dx offset 0.12)
    // Distance between shoulders and hands reduces by ~half
    const realPushupBottom = createMockPose(0.45, 0.62, 0.45, 0.75, 0.9, 0.65, 0.35, 0.70);
    t += 200;
    engine.processFrame(createMockPose(0.45, 0.52, 0.45, 0.75), t, 640, 480);
    t += 150;
    engine.processFrame(realPushupBottom, t, 640, 480);
    t += 120;
    res = engine.processFrame(realPushupBottom, t, 640, 480);
    expect(res.state).toBe('DOWN');
    expect(res.isBottomAccepted).toBe(true);

    // 4. Push back up to full lockout plank
    t += 250;
    engine.processFrame(makePlankPose(0.48, 0.75, true), t, 640, 480);
    t += 150;
    engine.processFrame(plankTop, t, 640, 480);
    t += 120;
    res = engine.processFrame(plankTop, t, 640, 480);

    expect(res.reps).toBe(1);
    expect(res.repCompletedEvent).toBe(true);
    expect(res.state).toBe('UP');
  });

  it('18. Relative movement detection logic: calculates delta between highest (plank) and lowest (dip) points anywhere in frame', () => {
    const engine = new PushupEngine();
    let t = 5000;

    // Simulate pushup at a low-screen position (shoulderY = 0.60, wristY = 0.88)
    // Absolute shoulder coordinates are very low in the frame (not high up)
    function makeFramePose(shoulderY: number, wristY: number, isLockout: boolean = false) {
      const p = createMockPose(0.5, shoulderY, 0.5, wristY);
      if (isLockout) {
        p[POSE_INDEX.RIGHT_ELBOW] = { x: 0.5, y: (shoulderY + wristY) / 2, z: 0, visibility: 0.95 };
        p[POSE_INDEX.LEFT_ELBOW] = { x: 0.5, y: (shoulderY + wristY) / 2, z: 0, visibility: 0.95 };
      }
      return p;
    }

    const lowFramePlank = makeFramePose(0.60, 0.88, true);

    // 1. Establish initial plank at this low-frame position anywhere in room
    engine.processFrame(lowFramePlank, t, 640, 480);
    t += 120;
    let res = engine.processFrame(lowFramePlank, t, 640, 480);
    expect(res.state).toBe('UP');
    expect(res.diagnostics.initialStartingHeight).toBeDefined();

    // 2. Dip down (torso descends relative to initial starting height)
    const lowFrameDip = createMockPose(0.5, 0.78, 0.5, 0.88, 0.9, 0.80, 0.35, 0.82);
    t += 180;
    engine.processFrame(createMockPose(0.5, 0.68, 0.5, 0.88), t, 640, 480);
    t += 150;
    engine.processFrame(lowFrameDip, t, 640, 480);
    t += 120;
    res = engine.processFrame(lowFrameDip, t, 640, 480);
    expect(res.state).toBe('DOWN');
    expect(res.isBottomAccepted).toBe(true);
    expect(res.diagnostics.torsoDelta).toBeGreaterThan(0.10);

    // 3. Return to initial calibrated starting plank height
    t += 200;
    engine.processFrame(createMockPose(0.5, 0.68, 0.5, 0.88), t, 640, 480);
    t += 150;
    engine.processFrame(lowFramePlank, t, 640, 480);
    t += 120;
    engine.processFrame(lowFramePlank, t, 640, 480);
    t += 120;
    res = engine.processFrame(lowFramePlank, t, 640, 480);

    expect(res.reps).toBe(1);
    expect(res.repCompletedEvent).toBe(true);
    expect(res.state).toBe('UP');
  });

  it('19. Front-facing pushups: Successfully counts 14 continuous push-ups facing camera without dropping reps', () => {
    const engine = new PushupEngine();
    let t = 1000;

    function createFrontPose(shoulderY: number, elbowXOffset: number, elbowY: number, wristY: number = 0.70) {
      const lm: NormalizedLandmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
      lm[POSE_INDEX.LEFT_SHOULDER] = { x: 0.35, y: shoulderY, z: 0, visibility: 0.95 };
      lm[POSE_INDEX.RIGHT_SHOULDER] = { x: 0.65, y: shoulderY, z: 0, visibility: 0.95 };
      lm[POSE_INDEX.LEFT_ELBOW] = { x: 0.35 - elbowXOffset, y: elbowY, z: 0, visibility: 0.95 };
      lm[POSE_INDEX.RIGHT_ELBOW] = { x: 0.65 + elbowXOffset, y: elbowY, z: 0, visibility: 0.95 };
      lm[POSE_INDEX.LEFT_WRIST] = { x: 0.30, y: wristY, z: 0, visibility: 0.95 };
      lm[POSE_INDEX.RIGHT_WRIST] = { x: 0.70, y: wristY, z: 0, visibility: 0.95 };
      lm[POSE_INDEX.LEFT_HIP] = { x: 0.40, y: shoulderY + 0.20, z: 0.3, visibility: 0.85 };
      lm[POSE_INDEX.RIGHT_HIP] = { x: 0.60, y: shoulderY + 0.20, z: 0.3, visibility: 0.85 };
      return lm;
    }

    const frontTop = createFrontPose(0.35, 0.05, 0.52);
    const frontMid = createFrontPose(0.40, 0.12, 0.58);
    const frontBottom = createFrontPose(0.46, 0.18, 0.60);

    // Initial setup in plank
    engine.processFrame(frontTop, t, 640, 480);
    t += 120;
    let res = engine.processFrame(frontTop, t, 640, 480);
    expect(res.state).toBe('UP');

    // Perform exactly 14 continuous pushups in front view
    for (let rep = 1; rep <= 14; rep++) {
      // 1. Descend
      t += 200;
      engine.processFrame(frontMid, t, 640, 480);
      t += 200;
      engine.processFrame(frontBottom, t, 640, 480);
      t += 120;
      engine.processFrame(frontBottom, t, 640, 480);

      // 2. Ascend
      t += 200;
      engine.processFrame(frontMid, t, 640, 480);
      t += 200;
      engine.processFrame(frontTop, t, 640, 480);
      t += 120;
      res = engine.processFrame(frontTop, t, 640, 480);

      expect(res.reps).toBe(rep);
    }
  });
});
