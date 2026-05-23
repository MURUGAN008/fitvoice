import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { 
  Camera, 
  useCameraDevice, 
  useCameraPermission, 
  useFrameProcessor 
} from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import Svg, { Circle, Line } from 'react-native-svg';
import { detectPose, PoseLandmark } from '@scottjgilroy/react-native-vision-camera-v4-pose-detection';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS } from '../constants/theme';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';

// Joint index helper matching MediaPipe / ML Kit standards
export const JOINTS = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
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

interface PoseDetectionCameraProps {
  exerciseName: string;
  onFeedback: (message: string) => void;
  onRepIncrement: () => void;
  isActive: boolean;
}

export default function PoseDetectionCamera({
  exerciseName,
  onFeedback,
  onRepIncrement,
  isActive
}: PoseDetectionCameraProps) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front'); // Use front camera for self-workout analysis
  const [landmarks, setLandmarks] = useState<PoseLandmark[]>([]);
  const [permissionChecking, setPermissionChecking] = useState(true);

  // Throttling speech suggestions to avoid spam
  const lastSpokenTime = useRef<number>(0);
  const SPEECH_COOLDOWN_MS = 3000;

  // Rep counting state machine variables
  const repState = useRef<'up' | 'down'>('up');
  const frameWidth = useRef<number>(720);
  const frameHeight = useRef<number>(1280);

  // Trigger feedback callback safely on JS thread
  const triggerFeedback = useRunOnJS((message: string) => {
    const now = Date.now();
    if (now - lastSpokenTime.current > SPEECH_COOLDOWN_MS) {
      onFeedback(message);
      lastSpokenTime.current = now;
    }
  });

  // Trigger rep increment safely on JS thread
  const triggerRepComplete = useRunOnJS(() => {
    onRepIncrement();
  });

  // Check and request camera permission on mount
  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
      }
      setPermissionChecking(false);
    })();
  }, [hasPermission]);

  // Biomechanical Angle Calculator (3D Vector Math)
  const calculateAngle = (a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number => {
    // Vector BA
    const ba = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
    // Vector BC
    const bc = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };

    // Dot product
    const dotProduct = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;

    // Magnitudes
    const magnitudeBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
    const magnitudeBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);

    if (magnitudeBA === 0 || magnitudeBC === 0) return 0;

    const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));

    return Math.acos(clampedCos) * (180 / Math.PI);
  };

  // Run Real-Time Biomechanical Analysis Rules
  const analyzeForm = useRunOnJS((detectedLandmarks: PoseLandmark[]) => {
    setLandmarks(detectedLandmarks);

    if (detectedLandmarks.length < 29) return; // Need minimum key joints

    const normalizedExName = exerciseName.toLowerCase();

    // ------------------------------------------
    // SQUAT ANALYSIS RULE
    // ------------------------------------------
    if (normalizedExName.includes('squat')) {
      const leftHip = detectedLandmarks[JOINTS.LEFT_HIP];
      const leftKnee = detectedLandmarks[JOINTS.LEFT_KNEE];
      const leftAnkle = detectedLandmarks[JOINTS.LEFT_ANKLE];
      const leftShoulder = detectedLandmarks[JOINTS.LEFT_SHOULDER];

      if (leftHip && leftKnee && leftAnkle && leftShoulder) {
        const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        const hipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);

        // Rep counting state machine (Squat depth)
        if (repState.current === 'up' && kneeAngle < 100) {
          repState.current = 'down'; // User reached deep squat bottom
        } else if (repState.current === 'down' && kneeAngle > 155) {
          repState.current = 'up'; // User stood back up
          triggerRepComplete(); // Valid rep counted!
        }

        // Form feedback suggestions
        if (kneeAngle > 110 && kneeAngle < 140 && repState.current === 'up') {
          // Inside the squat transition, check chest lean
          if (hipAngle < 115) {
            triggerFeedback('Keep your chest up and back straight');
          }
        }
      }
    }

    // ------------------------------------------
    // PUSH-UP ANALYSIS RULE
    // ------------------------------------------
    else if (normalizedExName.includes('push_up') || normalizedExName.includes('push-up')) {
      const shoulder = detectedLandmarks[JOINTS.LEFT_SHOULDER];
      const elbow = detectedLandmarks[JOINTS.LEFT_ELBOW];
      const wrist = detectedLandmarks[JOINTS.LEFT_WRIST];
      const hip = detectedLandmarks[JOINTS.LEFT_HIP];
      const ankle = detectedLandmarks[JOINTS.LEFT_ANKLE];

      if (shoulder && elbow && wrist && hip && ankle) {
        const elbowAngle = calculateAngle(shoulder, elbow, wrist);
        const backAngle = calculateAngle(shoulder, hip, ankle);

        // Rep counting state machine (Push-up depth)
        if (repState.current === 'up' && elbowAngle < 95) {
          repState.current = 'down'; // Bottom of push-up reached
        } else if (repState.current === 'down' && elbowAngle > 160) {
          repState.current = 'up'; // Pushed all the way back up
          triggerRepComplete(); // Valid rep!
        }

        // Hip sag check (Straight line check)
        if (backAngle < 155) {
          triggerFeedback('Keep your hips aligned and squeeze your core');
        }
      }
    }

    // ------------------------------------------
    // PLANK ANALYSIS RULE
    // ------------------------------------------
    else if (normalizedExName.includes('plank')) {
      const shoulder = detectedLandmarks[JOINTS.LEFT_SHOULDER];
      const hip = detectedLandmarks[JOINTS.LEFT_HIP];
      const ankle = detectedLandmarks[JOINTS.LEFT_ANKLE];

      if (shoulder && hip && ankle) {
        const backAngle = calculateAngle(shoulder, hip, ankle);

        if (backAngle < 150) {
          triggerFeedback('Lower your hips to keep a straight line');
        } else if (backAngle > 200) {
          triggerFeedback('Slightly lift your hips, align your core');
        }
      }
    }
  });

  // High-performance on-device native frame processor
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!isActive) return;

    frameWidth.value = frame.width;
    frameHeight.value = frame.height;

    // Run native ML Kit inference on the raw video frame buffer
    const pose = detectPose(frame);
    if (pose && pose.landmarks) {
      // Analyze coordinates on JS thread
      analyzeForm(pose.landmarks);
    }
  }, [isActive, exerciseName]);

  // Loading indicator while resolving permissions
  if (permissionChecking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.brand.orange} size="large" />
      </View>
    );
  }

  // Request permissions view
  if (!hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <AlertTriangle size={32} color={COLORS.state.error} style={{ marginBottom: 8 }} />
        <Text style={styles.permissionText}>Camera permission is required for form tracking.</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera device is loading
  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.brand.orange} size="large" />
      </View>
    );
  }

  // Helper to project 0-1 coordinates to screen pixel bounds
  const getCoordinates = (landmark: PoseLandmark) => {
    // MediaPipe scales are inverted depending on orientation. Front camera is mirrored.
    const x = (1 - landmark.x) * 100; // Return % for SVG responsiveness
    const y = landmark.y * 100;
    return { x: `${x}%`, y: `${y}%` };
  };

  const renderConnection = (jointA: number, jointB: number, key: string, color = '#FF6B35') => {
    const a = landmarks[jointA];
    const b = landmarks[jointB];
    if (!a || !b || a.visibility < 0.5 || b.visibility < 0.5) return null;

    const coordsA = getCoordinates(a);
    const coordsB = getCoordinates(b);

    return (
      <Line
        key={key}
        x1={coordsA.x}
        y1={coordsA.y}
        x2={coordsB.x}
        y2={coordsB.y}
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    );
  };

  const renderJoint = (joint: number, key: string, color = '#FFD700') => {
    const point = landmarks[joint];
    if (!point || point.visibility < 0.5) return null;

    const coords = getCoordinates(point);

    return (
      <Circle
        key={key}
        cx={coords.x}
        cy={coords.y}
        r="5"
        fill={color}
        stroke="#FFF"
        strokeWidth="1.5"
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Real-time Camera Feed */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        frameProcessor={frameProcessor}
        pixelFormat="rgb" // Required for most pose detection models
      />

      {/* SVG Skeletal Overlay (drawn over the camera feed) */}
      <Svg style={StyleSheet.absoluteFill}>
        {landmarks.length > 0 && [
          // Torso connections
          renderConnection(JOINTS.LEFT_SHOULDER, JOINTS.RIGHT_SHOULDER, 'collar', '#3B82F6'),
          renderConnection(JOINTS.LEFT_SHOULDER, JOINTS.LEFT_HIP, 'left_torso', '#3B82F6'),
          renderConnection(JOINTS.RIGHT_SHOULDER, JOINTS.RIGHT_HIP, 'right_torso', '#3B82F6'),
          renderConnection(JOINTS.LEFT_HIP, JOINTS.RIGHT_HIP, 'pelvis', '#3B82F6'),

          // Left Arm
          renderConnection(JOINTS.LEFT_SHOULDER, JOINTS.LEFT_ELBOW, 'left_shoulder_elbow'),
          renderConnection(JOINTS.LEFT_ELBOW, JOINTS.LEFT_WRIST, 'left_elbow_wrist'),

          // Right Arm
          renderConnection(JOINTS.RIGHT_SHOULDER, JOINTS.RIGHT_ELBOW, 'right_shoulder_elbow'),
          renderConnection(JOINTS.RIGHT_ELBOW, JOINTS.RIGHT_WRIST, 'right_elbow_wrist'),

          // Left Leg
          renderConnection(JOINTS.LEFT_HIP, JOINTS.LEFT_KNEE, 'left_hip_knee'),
          renderConnection(JOINTS.LEFT_KNEE, JOINTS.LEFT_ANKLE, 'left_knee_ankle'),

          // Right Leg
          renderConnection(JOINTS.RIGHT_HIP, JOINTS.RIGHT_KNEE, 'right_hip_knee'),
          renderConnection(JOINTS.RIGHT_KNEE, JOINTS.RIGHT_ANKLE, 'right_knee_ankle'),

          // Joints
          renderJoint(JOINTS.NOSE, 'nose', '#EF4444'),
          renderJoint(JOINTS.LEFT_SHOULDER, 'l_shoulder'),
          renderJoint(JOINTS.RIGHT_SHOULDER, 'r_shoulder'),
          renderJoint(JOINTS.LEFT_ELBOW, 'l_elbow'),
          renderJoint(JOINTS.RIGHT_ELBOW, 'r_elbow'),
          renderJoint(JOINTS.LEFT_WRIST, 'l_wrist'),
          renderJoint(JOINTS.RIGHT_WRIST, 'r_wrist'),
          renderJoint(JOINTS.LEFT_HIP, 'l_hip'),
          renderJoint(JOINTS.RIGHT_HIP, 'r_hip'),
          renderJoint(JOINTS.LEFT_KNEE, 'l_knee'),
          renderJoint(JOINTS.RIGHT_KNEE, 'r_knee'),
          renderJoint(JOINTS.LEFT_ANKLE, 'l_ankle'),
          renderJoint(JOINTS.RIGHT_ANKLE, 'r_ankle'),
        ]}
      </Svg>

      {/* Floating Mode Status HUD */}
      <View style={styles.hudOverlay}>
        <View style={styles.hudBadge}>
          <CheckCircle2 size={14} color={COLORS.state.success} />
          <Text style={styles.hudText}>Pose AI: Tracking</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg.primary,
    padding: SPACING.xl,
  },
  permissionText: {
    color: COLORS.text.secondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  permissionButton: {
    backgroundColor: COLORS.brand.orange,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
  },
  hudOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 20,
  },
  hudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hudText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
});
