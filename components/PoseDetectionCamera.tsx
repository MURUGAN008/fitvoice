import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { 
  Camera, 
  useCameraDevice, 
  useCameraPermission, 
  useFrameProcessor,
  VisionCameraProxy,
  runAtTargetFps,
  useCameraFormat,
  type Frame
} from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import Svg, { Circle, Line } from 'react-native-svg';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS } from '../constants/theme';
import { AlertTriangle, CheckCircle2 } from 'lucide-react-native';

export interface Point2D {
  x: number;
  y: number;
}

export interface PoseData {
  leftShoulderPosition?: Point2D;
  rightShoulderPosition?: Point2D;
  leftElbowPosition?: Point2D;
  rightElbowPosition?: Point2D;
  leftWristPosition?: Point2D;
  rightWristPosition?: Point2D;
  leftHipPosition?: Point2D;
  rightHipPosition?: Point2D;
  leftKneePosition?: Point2D;
  rightKneePosition?: Point2D;
  leftAnklePosition?: Point2D;
  rightAnklePosition?: Point2D;
  leftPinkyPosition?: Point2D;
  rightPinkyPosition?: Point2D;
  leftIndexPosition?: Point2D;
  rightIndexPosition?: Point2D;
  leftThumbPosition?: Point2D;
  rightThumbPosition?: Point2D;
  leftHeelPosition?: Point2D;
  rightHeelPosition?: Point2D;
  leftFootIndexPosition?: Point2D;
  rightFootIndexPosition?: Point2D;
  nosePosition?: Point2D;
  leftEyeInnerPosition?: Point2D;
  leftEyePosition?: Point2D;
  leftEyeOuterPosition?: Point2D;
  rightEyeInnerPosition?: Point2D;
  rightEyePosition?: Point2D;
  rightEyeOuterPosition?: Point2D;
  leftEarPosition?: Point2D;
  rightEarPosition?: Point2D;
  leftMouthPosition?: Point2D;
  rightMouthPosition?: Point2D;
}

interface FormErrors {
  torso?: boolean;
  legs?: boolean;
  arms?: boolean;
}

interface PoseDetectionCameraProps {
  exerciseName: string;
  onFeedback: (message: string) => void;
  onRepIncrement: () => void;
  isActive: boolean;
}

const LINKING_ERROR =
  `The package '@scottjgilroy/react-native-vision-camera-v4-pose-detection' doesn't seem to be linked. Make sure: \n\n` +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Initialize the plugin lazily on the worklet thread to avoid race conditions with native JSI bindings
let nativePlugin: any = null;

function detectPose(frame: Frame, options?: any): any {
  'worklet';
  if (nativePlugin == null) {
    nativePlugin = VisionCameraProxy.initFrameProcessorPlugin('detectPose', {});
  }
  if (nativePlugin == null) throw new Error(LINKING_ERROR);
  return options ? nativePlugin.call(frame, options) : nativePlugin.call(frame);
}

// Memoize the Camera Feed component to prevent React Native virtual DOM reconciliation 
// from touching/restarting the native camera session during skeleton state updates.
const MemoizedCamera = React.memo(({ device, isActive, frameProcessor, format }: any) => {
  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={isActive}
      frameProcessor={frameProcessor}
      format={format}
      pixelFormat="yuv" // ML Kit on Android only supports YUV_420_888 (yuv) or JPEG
      androidPreviewViewType="texture-view"
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.device?.id === nextProps.device?.id &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.frameProcessor === nextProps.frameProcessor &&
    prevProps.format?.videoWidth === nextProps.format?.videoWidth &&
    prevProps.format?.videoHeight === nextProps.format?.videoHeight
  );
});

// Helper to check if a coordinates point is valid (not undefined and not 0,0)
const isPointValid = (point?: Point2D): boolean => {
  return point !== undefined && !(point.x === 0 && point.y === 0);
};

export default function PoseDetectionCamera({
  exerciseName,
  onFeedback,
  onRepIncrement,
  isActive
}: PoseDetectionCameraProps) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front'); // Use front camera for self-workout analysis
  
  // Select format (1280x720 at 30 FPS is the optimal sweet spot for real-time mobile pose detection)
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1280, height: 720 } },
    { fps: 30 }
  ]);

  const [landmarks, setLandmarks] = useState<PoseData | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isFormCorrect, setIsFormCorrect] = useState(true);
  const [isBodyVisible, setIsBodyVisible] = useState(false);
  const [permissionChecking, setPermissionChecking] = useState(true);

  // Throttling speech suggestions to avoid spam
  const lastSpokenTime = useRef<number>(0);
  const SPEECH_COOLDOWN_MS = 3000;

  // Rep counting state machine variables
  const repState = useRef<'up' | 'down'>('up');
  const repFormValid = useRef<boolean>(true); // Tracks if the current repetition was executed with perfect form
  const lastErrorTime = useRef<{ torso?: number; arms?: number; legs?: number }>({});

  // History arrays for smoothing angles and distances to filter transient sensor noise
  const kneeAngleHistory = useRef<number[]>([]);
  const elbowAngleHistory = useRef<number[]>([]);
  const ankleDistHistory = useRef<number[]>([]);

  // React state for camera frame dimensions (resolves Swmansion render warnings)
  const [frameDimensions, setFrameDimensions] = useState({ width: 720, height: 1280 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Trigger feedback callback safely on JS thread
  const triggerFeedback = useRunOnJS((message: string) => {
    const now = Date.now();
    if (now - lastSpokenTime.current > SPEECH_COOLDOWN_MS) {
      onFeedback(message);
      lastSpokenTime.current = now;
    }
  }, [onFeedback]);

  // Trigger rep increment safely on JS thread
  const triggerRepComplete = useRunOnJS(() => {
    onRepIncrement();
  }, [onRepIncrement]);

  // Log frame processor errors safely back to the JS console
  const logFrameProcessorError = useRunOnJS((msg: string) => {
    console.error("[Pose Frame Processor Error]", msg);
  }, []);

  // Check and request camera permission on mount
  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
      }
      setPermissionChecking(false);
    })();
  }, [hasPermission]);

  // Biomechanical Angle Calculator (2D Vector Math)
  const calculateAngle = (a: Point2D, b: Point2D, c: Point2D): number => {
    // Vector BA
    const ba = { x: a.x - b.x, y: a.y - b.y };
    // Vector BC
    const bc = { x: c.x - b.x, y: c.y - b.y };

    // Dot product
    const dotProduct = ba.x * bc.x + ba.y * bc.y;

    // Magnitudes
    const magnitudeBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
    const magnitudeBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);

    if (magnitudeBA === 0 || magnitudeBC === 0) return 0;

    const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));

    return Math.acos(clampedCos) * (180 / Math.PI);
  };

  // Run Real-Time Biomechanical Analysis Rules
  const analyzeForm = useRunOnJS((detectedPose: PoseData, width: number, height: number) => {
    setLandmarks(detectedPose);
    
    // Update dimensions on JS thread if they differ
    if (frameDimensions.width !== width || frameDimensions.height !== height) {
      setFrameDimensions({ width, height });
    }

    const normalizedExName = exerciseName.toLowerCase();
    const errors: FormErrors = {};

    // Retrieve all key joints
    const leftShoulder = detectedPose.leftShoulderPosition;
    const rightShoulder = detectedPose.rightShoulderPosition;
    const leftElbow = detectedPose.leftElbowPosition;
    const rightElbow = detectedPose.rightElbowPosition;
    const leftWrist = detectedPose.leftWristPosition;
    const rightWrist = detectedPose.rightWristPosition;
    const leftHip = detectedPose.leftHipPosition;
    const rightHip = detectedPose.rightHipPosition;
    const leftKnee = detectedPose.leftKneePosition;
    const rightKnee = detectedPose.rightKneePosition;
    const leftAnkle = detectedPose.leftAnklePosition;
    const rightAnkle = detectedPose.rightAnklePosition;

    // 1. Verify if required body joints are visible based on the category of exercise
    let bodyVisible = false;
    if (normalizedExName.includes('squat') || normalizedExName.includes('lunge') || normalizedExName.includes('deadlift')) {
      bodyVisible = isPointValid(leftShoulder) && isPointValid(leftHip) && isPointValid(leftKnee) && isPointValid(leftAnkle) &&
                    isPointValid(rightShoulder) && isPointValid(rightHip) && isPointValid(rightKnee) && isPointValid(rightAnkle);
    } else if (
      normalizedExName.includes('push_up') || 
      normalizedExName.includes('push-up') || 
      normalizedExName.includes('pushup') || 
      normalizedExName.includes('pushups') || 
      normalizedExName.includes('dip') || 
      normalizedExName.includes('burpee') ||
      normalizedExName.includes('pike') ||
      normalizedExName.includes('row')
    ) {
      bodyVisible = (isPointValid(leftShoulder) || isPointValid(rightShoulder)) &&
                    (isPointValid(leftElbow) || isPointValid(rightElbow)) &&
                    (isPointValid(leftWrist) || isPointValid(rightWrist)) &&
                    (isPointValid(leftHip) || isPointValid(rightHip)) &&
                    (isPointValid(leftAnkle) || isPointValid(rightAnkle));
    } else if (normalizedExName.includes('plank')) {
      bodyVisible = isPointValid(leftShoulder) && isPointValid(leftHip) && isPointValid(leftAnkle);
    } else if (normalizedExName.includes('jack')) {
      // Jumping Jacks require full-body tracking (shoulders, wrists, hips, and ankles) to ensure jumping leg movement
      bodyVisible = isPointValid(leftShoulder) && isPointValid(rightShoulder) && 
                    isPointValid(leftWrist) && isPointValid(rightWrist) &&
                    isPointValid(leftHip) && isPointValid(rightHip) &&
                    isPointValid(leftAnkle) && isPointValid(rightAnkle);
    } else if (
      normalizedExName.includes('bridge') || 
      normalizedExName.includes('crunch') || 
      normalizedExName.includes('oblique') ||
      normalizedExName.includes('dead bug') ||
      normalizedExName.includes('dead_bug') ||
      normalizedExName.includes('russian twist') ||
      normalizedExName.includes('superman') ||
      normalizedExName.includes('hollow')
    ) {
      // Floor/Core exercises require shoulder, hip, knee and wrist visibility
      bodyVisible = (isPointValid(leftShoulder) || isPointValid(rightShoulder)) &&
                    (isPointValid(leftHip) || isPointValid(rightHip)) &&
                    (isPointValid(leftKnee) || isPointValid(rightKnee)) &&
                    (isPointValid(leftWrist) || isPointValid(rightWrist));
    } else if (normalizedExName.includes('climber') || normalizedExName.includes('high knees') || normalizedExName.includes('high_knees')) {
      // Mountain Climbers and High Knees require hip and leg visibility
      bodyVisible = isPointValid(leftHip) && isPointValid(leftKnee) && isPointValid(leftAnkle) &&
                    isPointValid(rightHip) && isPointValid(rightKnee) && isPointValid(rightAnkle);
    } else {
      // General default: shoulders and hips
      bodyVisible = isPointValid(leftShoulder) && isPointValid(leftHip);
    }

    setIsBodyVisible(bodyVisible);

    if (!bodyVisible) {
      // If the body is not in full frame, flag everything as an error, prevent rep count, and prompt user
      triggerFeedback('Ensure your full body is in the camera frame');
      setFormErrors({ torso: true, arms: true, legs: true });
      setIsFormCorrect(false);
      return;
    }

    // 2. Perform biomechanical calculations and rep counting per category

    // A. CATEGORY: SQUAT / LUNGE / BULGARIAN SPLIT SQUAT / SINGLE-LEG SQUATS / JUMPING SQUATS
    if (normalizedExName.includes('squat') || normalizedExName.includes('lunge')) {
      if (leftHip && leftKnee && leftAnkle && leftShoulder && rightHip && rightKnee && rightAnkle && rightShoulder) {
        const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
        const minKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);

        const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
        const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
        const minHipAngle = Math.min(leftHipAngle, rightHipAngle);

        // 3-frame Knee angle smoothing
        kneeAngleHistory.current.push(minKneeAngle);
        if (kneeAngleHistory.current.length > 3) kneeAngleHistory.current.shift();
        const smoothKneeAngle = kneeAngleHistory.current.reduce((a, b) => a + b, 0) / kneeAngleHistory.current.length;

        // Posture check: Torso lean (hybrid front/side view formula)
        const leftTorsoLen = leftHip.y - leftShoulder.y;
        const rightTorsoLen = rightHip.y - rightShoulder.y;
        const torsoLen = (leftTorsoLen + rightTorsoLen) / 2;
        const dxShoulders = leftShoulder.x - rightShoulder.x;
        const dyShoulders = leftShoulder.y - rightShoulder.y;
        const shoulderWidth = Math.sqrt(dxShoulders * dxShoulders + dyShoulders * dyShoulders);

        const isFrontal = shoulderWidth > torsoLen * 0.45;
        let isTorsoLean = false;
        if (isFrontal) {
          if (torsoLen < shoulderWidth * 1.15) {
            isTorsoLean = true;
          }
        } else {
          if (minHipAngle < 110) {
            isTorsoLean = true;
          }
        }

        if (smoothKneeAngle < 145 && isTorsoLean) {
          triggerFeedback('Keep your chest up and back straight');
          errors.torso = true;
        }

        // Knees caving inward check (Squats and Jumping Squats only)
        if (normalizedExName.includes('squat') && !normalizedExName.includes('single-leg') && !normalizedExName.includes('bulgarian')) {
          const hipWidth = Math.sqrt(Math.pow(leftHip.x - rightHip.x, 2) + Math.pow(leftHip.y - rightHip.y, 2));
          const kneeWidth = Math.sqrt(Math.pow(leftKnee.x - rightKnee.x, 2) + Math.pow(leftKnee.y - rightKnee.y, 2));
          if (smoothKneeAngle < 145 && kneeWidth < hipWidth * 0.98) {
            triggerFeedback('Push your knees outward');
            errors.legs = true;
          }
        }

        // Wrong Exercise / Unnecessary Movements for Squats & Lunges:
        // 1. Hands raised above shoulders (Jumping Jacks motion)
        if (leftWrist && rightWrist) {
          if (leftWrist.y < leftShoulder.y || rightWrist.y < rightShoulder.y) {
            triggerFeedback('Keep your arms down or in front of your chest');
            errors.arms = true;
          }
        }

        // 2. Feet too wide (Jumping Jacks wide stance motion)
        const dxAnkles = leftAnkle.x - rightAnkle.x;
        const dyAnkles = leftAnkle.y - rightAnkle.y;
        const ankleDist = Math.sqrt(dxAnkles * dxAnkles + dyAnkles * dyAnkles);
        const dxHips = leftHip.x - rightHip.x;
        const dyHips = leftHip.y - rightHip.y;
        const hipWidth = Math.sqrt(dxHips * dxHips + dyHips * dyHips);
        if (normalizedExName.includes('squat') && !normalizedExName.includes('single-leg') && !normalizedExName.includes('bulgarian')) {
          if (ankleDist > hipWidth * 1.6) {
            triggerFeedback('Keep your feet shoulder-width apart');
            errors.legs = true;
          }
        }

        // 3. Lying down (plank or crunch position)
        const dxTorso = Math.abs(leftShoulder.x - leftHip.x);
        const dyTorso = Math.abs(leftShoulder.y - leftHip.y);
        if (dxTorso > dyTorso * 1.2) {
          triggerFeedback('Please stand up for the exercise');
          errors.torso = true;
        }

        // Evaluate frame correctness *after* all form/posture validation checks
        const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;

        // Rep counting state machine (Squat/Lunge)
        if (repState.current === 'up' && smoothKneeAngle < 90) {
          repState.current = 'down';
          repFormValid.current = currentFrameCorrect;
        } else if (repState.current === 'down') {
          if (!currentFrameCorrect) {
            repFormValid.current = false;
          }
          if (smoothKneeAngle > 148) {
            repState.current = 'up';
            if (repFormValid.current) {
              triggerRepComplete();
            } else {
              triggerFeedback("Rep not counted. Focus on your posture");
            }
          }
        }
      }
    }

    // B. CATEGORY: PUSH-UP / CHAIR DIP / BURPEE / PIKE PUSH-UP / DECLINE & DIAMOND PUSHUPS
    else if (
      normalizedExName.includes('push_up') || 
      normalizedExName.includes('push-up') || 
      normalizedExName.includes('pushup') || 
      normalizedExName.includes('pushups') || 
      normalizedExName.includes('dip') || 
      normalizedExName.includes('burpee') ||
      normalizedExName.includes('pike')
    ) {
      const shoulder = leftShoulder || rightShoulder;
      const elbow = leftElbow || rightElbow;
      const wrist = leftWrist || rightWrist;
      const hip = leftHip || rightHip;
      const ankle = leftAnkle || rightAnkle;

      if (shoulder && elbow && wrist && hip && ankle) {
        const elbowAngle = calculateAngle(shoulder, elbow, wrist);
        const backAngle = calculateAngle(shoulder, hip, ankle);

        // 3-frame Elbow angle smoothing
        elbowAngleHistory.current.push(elbowAngle);
        if (elbowAngleHistory.current.length > 3) elbowAngleHistory.current.shift();
        const smoothElbowAngle = elbowAngleHistory.current.reduce((a, b) => a + b, 0) / elbowAngleHistory.current.length;

        // Form check: hip sag or hike
        if (backAngle < 155) {
          triggerFeedback('Keep your hips aligned and squeeze your core');
          errors.torso = true;
        } else if (backAngle > 195) {
          triggerFeedback('Lower your hips to a straight line');
          errors.torso = true;
        }

        // Wrong Exercise / Unnecessary Movements:
        // 1. Standing upright (except for jump phase of burpee)
        const isBurpee = normalizedExName.includes('burpee');
        const dxTorso = Math.abs(shoulder.x - hip.x);
        const dyTorso = Math.abs(shoulder.y - hip.y);
        if (!isBurpee && dyTorso > dxTorso * 1.3) {
          triggerFeedback('Please get down into a plank position');
          errors.torso = true;
        }

        // 2. Bending knees (legs should be straight in push-up/plank)
        if (leftHip && rightHip && leftKnee && rightKnee && leftAnkle && rightAnkle && !isBurpee) {
          const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
          const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
          const minKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
          if (minKneeAngle < 150) {
            triggerFeedback('Keep your legs completely straight');
            errors.legs = true;
          }
        }

        // Evaluate frame correctness
        const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;

        // Rep counting state machine (Push-ups/Dips)
        if (repState.current === 'up' && smoothElbowAngle < 115) {
          repState.current = 'down';
          repFormValid.current = currentFrameCorrect;
        } else if (repState.current === 'down') {
          if (!currentFrameCorrect) {
            repFormValid.current = false;
          }
          if (smoothElbowAngle > 150) {
            repState.current = 'up';
            if (repFormValid.current) {
              triggerRepComplete();
            } else {
              triggerFeedback("Rep not counted. Squeeze your core");
            }
          }
        }
      }
    }

    // C. CATEGORY: JUMPING JACKS (Upper body wrist-to-shoulder tracking + leg stance tracking)
    else if (normalizedExName.includes('jack')) {
      if (leftShoulder && rightShoulder && leftHip && rightHip && leftWrist && rightWrist && leftAnkle && rightAnkle) {
        // Spine vector represents the body's vertical axis (pointing up from hip to shoulder)
        const leftSpine = { x: leftShoulder.x - leftHip.x, y: leftShoulder.y - leftHip.y };
        const rightSpine = { x: rightShoulder.x - rightHip.x, y: rightShoulder.y - rightHip.y };

        // Wrist vector relative to the shoulder
        const leftWristVec = { x: leftWrist.x - leftShoulder.x, y: leftWrist.y - leftShoulder.y };
        const rightWristVec = { x: rightWrist.x - rightShoulder.x, y: rightWrist.y - rightShoulder.y };

        // Dot product to project wrist vector onto the spine vector.
        const leftDot = leftWristVec.x * leftSpine.x + leftWristVec.y * leftSpine.y;
        const rightDot = rightWristVec.x * rightSpine.x + rightWristVec.y * rightSpine.y;

        const handsUp = leftDot > 0 && rightDot > 0;
        const handsDown = leftDot < 0 && rightDot < 0;

        // Calculate ankle stance width vs hip width baseline
        const dxAnkles = leftAnkle.x - rightAnkle.x;
        const dyAnkles = leftAnkle.y - rightAnkle.y;
        const ankleDist = Math.sqrt(dxAnkles * dxAnkles + dyAnkles * dyAnkles);

        const dxHips = leftHip.x - rightHip.x;
        const dyHips = leftHip.y - rightHip.y;
        const hipWidth = Math.sqrt(dxHips * dxHips + dyHips * dyHips);

        // 3-frame ankle distance smoothing
        ankleDistHistory.current.push(ankleDist);
        if (ankleDistHistory.current.length > 3) ankleDistHistory.current.shift();
        const smoothAnkleDist = ankleDistHistory.current.reduce((a, b) => a + b, 0) / ankleDistHistory.current.length;

        const isStanceWide = smoothAnkleDist > hipWidth * 1.8;
        const isStanceNarrow = smoothAnkleDist < hipWidth * 1.25;

        // Form check: Incomplete arm range (hands should be up when stance is wide)
        if (isStanceWide && !handsUp) {
          triggerFeedback('Raise your hands fully above your head');
          errors.arms = true;
        }

        // Wrong Exercise / Unnecessary Movements for Jumping Jacks:
        // 1. Squatting with narrow stance (doing squats instead of jumping jacks)
        if (leftKnee && rightKnee) {
          const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
          const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
          const minKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
          if (minKneeAngle < 115 && isStanceNarrow) {
            triggerFeedback('Jump and spread your feet side to side');
            errors.legs = true;
          }
        }

        // 2. Lying down instead of standing
        const dxTorso = Math.abs(leftShoulder.x - leftHip.x);
        const dyTorso = Math.abs(leftShoulder.y - leftHip.y);
        if (dxTorso > dyTorso * 1.2) {
          triggerFeedback('Please stand up for jumping jacks');
          errors.torso = true;
        }

        // Rep counting (Jumping Jacks)
        const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;
        if (repState.current === 'up' && handsDown && isStanceNarrow) {
          repState.current = 'down';
          repFormValid.current = currentFrameCorrect;
        } else if (repState.current === 'down') {
          if (!currentFrameCorrect) {
            repFormValid.current = false;
          }
          if (handsUp && isStanceWide) {
            repState.current = 'up';
            if (repFormValid.current) {
              triggerRepComplete();
            } else {
              triggerFeedback("Rep not counted. Raise hands fully");
            }
          }
        }
      }
    }

    // D. CATEGORY: GLUTE BRIDGE / SINGLE-LEG GLUTE BRIDGE
    else if (normalizedExName.includes('bridge')) {
      const shoulder = leftShoulder || rightShoulder;
      const hip = leftHip || rightHip;
      const knee = leftKnee || rightKnee;

      if (shoulder && hip && knee) {
        const hipAngle = calculateAngle(shoulder, hip, knee);

        // Form check: incomplete hip extension
        if (repState.current === 'down' && hipAngle > 140 && hipAngle < 155) {
          triggerFeedback('Lift your hips higher and squeeze your glutes');
          errors.torso = true;
        }

        // Wrong Exercise / Unnecessary Movements:
        // 1. Standing up
        const dxTorso = Math.abs(shoulder.x - hip.x);
        const dyTorso = Math.abs(shoulder.y - hip.y);
        if (dyTorso > dxTorso * 1.3) {
          triggerFeedback('Please lie down on the floor');
          errors.torso = true;
        }

        // 2. Hands raised (arms should be flat on the ground)
        if (leftWrist && rightWrist) {
          if (leftWrist.y < shoulder.y || rightWrist.y < shoulder.y) {
            triggerFeedback('Keep your arms flat on the floor');
            errors.arms = true;
          }
        }

        // Rep counting (Glute Bridge)
        const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;
        if (repState.current === 'up' && hipAngle < 140) {
          repState.current = 'down';
          repFormValid.current = currentFrameCorrect;
        } else if (repState.current === 'down') {
          if (!currentFrameCorrect) {
            repFormValid.current = false;
          }
          if (hipAngle > 165) {
            repState.current = 'up';
            if (repFormValid.current) {
              triggerRepComplete();
            } else {
              triggerFeedback("Rep not counted. Lift hips higher");
            }
          }
        }
      }
    }

    // E. CATEGORY: CRUNCH / BICYCLE CRUNCH
    else if (normalizedExName.includes('crunch') || normalizedExName.includes('oblique')) {
      const shoulder = leftShoulder || rightShoulder;
      const hip = leftHip || rightHip;
      const knee = leftKnee || rightKnee;

      if (shoulder && hip && knee) {
        const hipAngle = calculateAngle(shoulder, hip, knee);

        // Form check: check leg extension (Bicycle Crunch only)
        if (normalizedExName.includes('bicycle')) {
          if (leftKnee && leftAnkle && rightKnee && rightAnkle && leftHip && rightHip) {
            const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
            const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
            const maxKneeAngle = Math.max(leftKneeAngle, rightKneeAngle);
            if (maxKneeAngle < 135) {
              triggerFeedback('Extend your opposite leg fully straight');
              errors.legs = true;
            }
          }
        }

        // Wrong Exercise / Unnecessary Movements:
        // 1. Standing up
        const dxTorso = Math.abs(shoulder.x - hip.x);
        const dyTorso = Math.abs(shoulder.y - hip.y);
        if (dyTorso > dxTorso * 1.3) {
          triggerFeedback('Please lie down on the floor');
          errors.torso = true;
        }

        // Rep counting (Crunches)
        const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;
        if (repState.current === 'up' && hipAngle < 100) {
          repState.current = 'down';
          repFormValid.current = currentFrameCorrect;
        } else if (repState.current === 'down') {
          if (!currentFrameCorrect) {
            repFormValid.current = false;
          }
          if (hipAngle > 140) {
            repState.current = 'up';
            if (repFormValid.current) {
              triggerRepComplete();
            } else {
              triggerFeedback("Rep not counted. Squeeze your core");
            }
          }
        }
      }
    }

    // F. CATEGORY: MOUNTAIN CLIMBERS (Alternating knee drives)
    else if (normalizedExName.includes('climber')) {
      if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
        const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
        const minKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);

        // Form check: hips too high
        const shoulder = leftShoulder || rightShoulder;
        const ankle = leftAnkle || rightAnkle;
        if (shoulder && ankle) {
          const backAngle = calculateAngle(shoulder, leftHip, ankle);
          if (backAngle < 135) {
            triggerFeedback('Keep your hips low and body flat');
            errors.torso = true;
          }

          // Wrong Exercise / Unnecessary Movements:
          // 1. Standing up
          const dxTorso = Math.abs(shoulder.x - leftHip.x);
          const dyTorso = Math.abs(shoulder.y - leftHip.y);
          if (dyTorso > dxTorso * 1.3) {
            triggerFeedback('Please get down into a plank position');
            errors.torso = true;
          }
        }

        // Rep counting (Mountain Climbers)
        const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;
        if (repState.current === 'up' && minKneeAngle < 105) {
          repState.current = 'down';
          repFormValid.current = currentFrameCorrect;
        } else if (repState.current === 'down') {
          if (!currentFrameCorrect) {
            repFormValid.current = false;
          }
          if (minKneeAngle > 145) {
            repState.current = 'up';
            if (repFormValid.current) {
              triggerRepComplete();
            } else {
              triggerFeedback("Rep not counted. Keep hips low");
            }
          }
        }
      }
    }

    // G. CATEGORY: FOREARM PLANK (Static hold, no reps, just form feedback)
    else if (normalizedExName.includes('plank')) {
      if (leftShoulder && leftHip && leftAnkle) {
        const backAngle = calculateAngle(leftShoulder, leftHip, leftAnkle);

        if (backAngle < 150) {
          triggerFeedback('Lower your hips to keep a straight line');
          errors.torso = true;
        } else if (backAngle > 200) {
          triggerFeedback('Slightly lift your hips, align your core');
          errors.torso = true;
        }

        // Wrong Exercise / Unnecessary Movements:
        // 1. Standing up
        const dxTorso = Math.abs(leftShoulder.x - leftHip.x);
        const dyTorso = Math.abs(leftShoulder.y - leftHip.y);
        if (dyTorso > dxTorso * 1.3) {
          triggerFeedback('Please get down into a plank position');
          errors.torso = true;
        }

        // 2. Bending knees
        if (leftKnee && leftHip && leftAnkle) {
          const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
          if (kneeAngle < 155) {
            triggerFeedback('Keep your legs straight');
            errors.legs = true;
          }
        }
      }
    }

    // H. CATEGORY: DEAD BUG (Alternating contralateral leg extensions)
    else if (normalizedExName.includes('dead bug') || normalizedExName.includes('dead_bug')) {
      if (leftShoulder && leftHip && leftKnee && rightShoulder && rightHip && rightKnee) {
        const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
        const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
        const maxHipAngle = Math.max(leftHipAngle, rightHipAngle);

        // Wrong Exercise / Unnecessary Movements:
        // 1. Standing up
        const dxTorso = Math.abs(leftShoulder.x - leftHip.x);
        const dyTorso = Math.abs(leftShoulder.y - leftHip.y);
        if (dyTorso > dxTorso * 1.3) {
          triggerFeedback('Please lie down on the floor');
          errors.torso = true;
        }

        // Evaluate frame correctness
        const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;

        if (repState.current === 'up' && maxHipAngle > 145) {
          repState.current = 'down';
          repFormValid.current = currentFrameCorrect;
        } else if (repState.current === 'down') {
          if (!currentFrameCorrect) {
            repFormValid.current = false;
          }
          if (maxHipAngle < 110) {
            repState.current = 'up';
            if (repFormValid.current) {
              triggerRepComplete();
            } else {
              triggerFeedback("Rep not counted. Squeeze your core");
            }
          }
        }
      }
    }

    // I. CATEGORY: HIGH KNEES (Alternating rapid high knee drives)
    else if (normalizedExName.includes('high knees') || normalizedExName.includes('high_knees')) {
      if (leftShoulder && leftHip && leftKnee && rightShoulder && rightHip && rightKnee) {
        const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
        const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
        const minHipAngle = Math.min(leftHipAngle, rightHipAngle);

        // Form check: not lifting knees high enough
        if (repState.current === 'down' && minHipAngle > 115) {
          triggerFeedback('Drive your knees higher');
          errors.legs = true;
        }

        // Wrong Exercise / Unnecessary Movements:
        // 1. Lying down
        const dxTorso = Math.abs(leftShoulder.x - leftHip.x);
        const dyTorso = Math.abs(leftShoulder.y - leftHip.y);
        if (dxTorso > dyTorso * 1.2) {
          triggerFeedback('Please stand up for high knees');
          errors.torso = true;
        }

        // Evaluate frame correctness
        const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;

        if (repState.current === 'up' && minHipAngle < 105) {
          repState.current = 'down';
          repFormValid.current = currentFrameCorrect;
        } else if (repState.current === 'down') {
          if (!currentFrameCorrect) {
            repFormValid.current = false;
          }
          if (minHipAngle > 150) {
            repState.current = 'up';
            if (repFormValid.current) {
              triggerRepComplete();
            } else {
              triggerFeedback("Rep not counted. Lift knees higher");
            }
          }
        }
      }
    }

    // J. CATEGORY: RUSSIAN TWISTS (Side-to-side torso rotation using stable hip projection)
    else if (normalizedExName.includes('russian twist')) {
      if (leftHip && rightHip && leftWrist && rightWrist) {
        // Hip vector represents the body's horizontal base axis (pointing from right to left hip)
        const hipVec = { x: leftHip.x - rightHip.x, y: leftHip.y - rightHip.y };
        const hipWidthSq = hipVec.x * hipVec.x + hipVec.y * hipVec.y;

        // Form check: torso posture (avoid rounding lower back / slouching too much)
        const shoulder = leftShoulder || rightShoulder;
        const knee = leftKnee || rightKnee;
        if (shoulder && knee) {
          const hipAngle = calculateAngle(shoulder, leftHip, knee);
          if (hipAngle < 65) {
            triggerFeedback('Keep your back straight and chest up');
            errors.torso = true;
          }
        }

        // Wrong Exercise / Unnecessary Movements:
        // 1. Standing up
        if (shoulder) {
          const dxTorso = Math.abs(shoulder.x - leftHip.x);
          const dyTorso = Math.abs(shoulder.y - leftHip.y);
          if (dyTorso > dxTorso * 1.3) {
            triggerFeedback('Please sit down on the floor');
            errors.torso = true;
          }
        }

        if (hipWidthSq > 0) {
          const midHip = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };
          const wristX = (leftWrist.x + rightWrist.x) / 2;
          const wristY = (leftWrist.y + rightWrist.y) / 2;

          // Vector from mid-hip to wrist
          const wristVec = { x: wristX - midHip.x, y: wristY - midHip.y };

          // Projection along the hip horizontal vector
          const projection = (wristVec.x * hipVec.x + wristVec.y * hipVec.y) / hipWidthSq;

          const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;
          if (repState.current === 'up' && projection < -0.5) {
            repState.current = 'down';
            repFormValid.current = currentFrameCorrect;
          } else if (repState.current === 'down') {
            if (!currentFrameCorrect) {
              repFormValid.current = false;
            }
            if (projection > 0.5) {
              repState.current = 'up';
              if (repFormValid.current) {
                triggerRepComplete();
              } else {
                triggerFeedback("Rep not counted. Keep back straight");
              }
            }
          }
        }
      }
    }

    // K. CATEGORY: INVERTED ROWS (Chest-to-bar pulling motion)
    else if (normalizedExName.includes('row')) {
      const shoulder = leftShoulder || rightShoulder;
      const elbow = leftElbow || rightElbow;
      const wrist = leftWrist || rightWrist;
      const hip = leftHip || rightHip;
      const ankle = leftAnkle || rightAnkle;

      if (shoulder && elbow && wrist && hip && ankle) {
        const elbowAngle = calculateAngle(shoulder, elbow, wrist);
        const backAngle = calculateAngle(shoulder, hip, ankle);

        // Form check: keep body straight, no sagging hips
        if (backAngle < 150) {
          triggerFeedback('Keep your hips high and body straight');
          errors.torso = true;
        }

        // Wrong Exercise / Unnecessary Movements:
        // 1. Standing upright
        const dxTorso = Math.abs(shoulder.x - hip.x);
        const dyTorso = Math.abs(shoulder.y - hip.y);
        if (dyTorso > dxTorso * 1.3) {
          triggerFeedback('Please get under the bar in a row position');
          errors.torso = true;
        }

        // Evaluate frame correctness
        const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;

        if (repState.current === 'up' && elbowAngle < 115) {
          repState.current = 'down';
          repFormValid.current = currentFrameCorrect;
        } else if (repState.current === 'down') {
          if (!currentFrameCorrect) repFormValid.current = false;
          if (elbowAngle > 150) {
            repState.current = 'up';
            if (repFormValid.current) {
              triggerRepComplete();
            } else {
              triggerFeedback("Rep not counted. Squeeze back muscles");
            }
          }
        }
      }
    }

    // L. CATEGORY: SINGLE-LEG ROMANIAN DEADLIFT (Hip hinge with neutral spine)
    else if (normalizedExName.includes('deadlift')) {
      const shoulder = leftShoulder || rightShoulder;
      const hip = leftHip || rightHip;
      const knee = leftKnee || rightKnee;
      const ankle = leftAnkle || rightAnkle;

      if (shoulder && hip && knee && ankle) {
        const hipAngle = calculateAngle(shoulder, hip, knee);
        const kneeAngle = calculateAngle(hip, knee, ankle);

        // Form check: bending standing knee too much (squatting the deadlift)
        if (kneeAngle < 135) {
          triggerFeedback('Keep your standing leg relatively straight');
          errors.legs = true;
        }

        // Wrong Exercise / Unnecessary Movements:
        // 1. Hands raised above shoulders
        if (leftWrist && rightWrist) {
          if (leftWrist.y < shoulder.y || rightWrist.y < shoulder.y) {
            triggerFeedback('Keep your hands hanging down naturally');
            errors.arms = true;
          }
        }

        // 2. Lying down
        const dxTorso = Math.abs(shoulder.x - hip.x);
        const dyTorso = Math.abs(shoulder.y - hip.y);
        if (dxTorso > dyTorso * 1.2) {
          triggerFeedback('Please stand up for the deadlift');
          errors.torso = true;
        }

        // Evaluate frame correctness
        const currentFrameCorrect = !errors.torso && !errors.legs && !errors.arms;

        if (repState.current === 'up' && hipAngle < 125) {
          repState.current = 'down';
          repFormValid.current = currentFrameCorrect;
        } else if (repState.current === 'down') {
          if (!currentFrameCorrect) repFormValid.current = false;
          if (hipAngle > 160) {
            repState.current = 'up';
            if (repFormValid.current) {
              triggerRepComplete();
            } else {
              triggerFeedback("Rep not counted. Keep back straight");
            }
          }
        }
      }
    }

    // M. CATEGORY: SUPERMAN RAISES (Lying face down chest/legs raising)
    else if (normalizedExName.includes('superman')) {
      if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
        const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
        
        // Form check: bending knees (legs should stay straight)
        if (leftKneeAngle < 150 || rightKneeAngle < 150) {
          triggerFeedback('Keep your legs straight');
          errors.legs = true;
        }

        // Wrong Exercise / Unnecessary Movements:
        // 1. Standing up
        const shoulder = leftShoulder || rightShoulder;
        if (shoulder) {
          const dxTorso = Math.abs(shoulder.x - leftHip.x);
          const dyTorso = Math.abs(shoulder.y - leftHip.y);
          if (dyTorso > dxTorso * 1.3) {
            triggerFeedback('Please lie face down on the floor');
            errors.torso = true;
          }
        }
      }
    }

    // N. CATEGORY: HOLLOW BODY HOLD (Static core hold lying on back)
    else if (normalizedExName.includes('hollow')) {
      const leftElbow = detectedPose.leftElbowPosition;
      const rightElbow = detectedPose.rightElbowPosition;
      
      if (leftKnee && leftAnkle && rightKnee && rightAnkle && leftHip && rightHip) {
        const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
        
        // Form check 1: bending knees (legs should stay locked straight)
        if (leftKneeAngle < 155 || rightKneeAngle < 155) {
          triggerFeedback('Keep your legs straight and locked');
          errors.legs = true;
        }
      }
      
      if (leftShoulder && rightShoulder && leftWrist && rightWrist && leftElbow && rightElbow) {
        const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
        
        // Form check 2: bending elbows overhead
        if (leftElbowAngle < 150 || rightElbowAngle < 150) {
          triggerFeedback('Keep your arms straight overhead');
          errors.arms = true;
        }
      }

      // Wrong Exercise / Unnecessary Movements:
      // 1. Standing up
      const shoulder = leftShoulder || rightShoulder;
      const hip = leftHip || rightHip;
      if (shoulder && hip) {
        const dxTorso = Math.abs(shoulder.x - hip.x);
        const dyTorso = Math.abs(shoulder.y - hip.y);
        if (dyTorso > dxTorso * 1.3) {
          triggerFeedback('Please lie on your back for hollow hold');
          errors.torso = true;
        }
      }
    }

    const now = Date.now();
    const ERROR_HOLD_MS = 1500; // Hold red error lines for 1.5 seconds to make them visible to the user

    const latchedErrors: FormErrors = {};

    // 1. Torso region latch
    if (errors.torso) {
      latchedErrors.torso = true;
      lastErrorTime.current.torso = now;
    } else if (lastErrorTime.current.torso && now - lastErrorTime.current.torso < ERROR_HOLD_MS) {
      latchedErrors.torso = true;
    }

    // 2. Legs region latch
    if (errors.legs) {
      latchedErrors.legs = true;
      lastErrorTime.current.legs = now;
    } else if (lastErrorTime.current.legs && now - lastErrorTime.current.legs < ERROR_HOLD_MS) {
      latchedErrors.legs = true;
    }

    // 3. Arms region latch
    if (errors.arms) {
      latchedErrors.arms = true;
      lastErrorTime.current.arms = now;
    } else if (lastErrorTime.current.arms && now - lastErrorTime.current.arms < ERROR_HOLD_MS) {
      latchedErrors.arms = true;
    }

    setFormErrors(latchedErrors);
    setIsFormCorrect(!latchedErrors.torso && !latchedErrors.legs && !latchedErrors.arms);
  }, [exerciseName, frameDimensions, triggerFeedback, triggerRepComplete]);

  // High-performance on-device native frame processor wrapped in try-catch
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!isActive) return;

    runAtTargetFps(8, () => {
      'worklet';
      try {
        // Since the app is locked to portrait mode, the preview is always rendered vertically.
        // The ML Kit coordinates returned are always oriented to portrait, meaning width is the smaller
        // dimension and height is the larger dimension of the camera frame buffer.
        const width = Math.min(frame.width, frame.height);
        const height = Math.max(frame.width, frame.height);

        // Run native ML Kit inference on the raw video frame buffer
        const pose = detectPose(frame, { mode: 'stream', performanceMode: 'max' });
        if (pose) {
          // Analyze coordinates on JS thread
          analyzeForm(pose, width, height);
        }
      } catch (err: any) {
        logFrameProcessorError(err.message || String(err));
      }
    });
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

  // Helper to project coordinates to screen percentage bounds, accounting for "cover" resize scaling of the preview feed
  const getCoordinates = (point: Point2D) => {
    const fw = frameDimensions.width;
    const fh = frameDimensions.height;
    const sw = containerDimensions.width;
    const sh = containerDimensions.height;

    // Fallback if container dimensions aren't measured yet
    if (sw === 0 || sh === 0) {
      const normX = point.x / fw;
      const normY = point.y / fh;
      const x = (1 - normX) * 100;
      const y = normY * 100;
      return { x: `${x}%`, y: `${y}%` };
    }

    const frameRatio = fw / fh;
    const screenRatio = sw / sh;

    // Front camera is mirrored horizontally. Mirror normX first:
    const normX = 1 - (point.x / fw);
    const normY = point.y / fh;

    let pctX = normX * 100;
    let pctY = normY * 100;

    if (frameRatio > screenRatio) {
      // Frame is wider than screen (horizontal cropping). Scale horizontally from the center.
      const scale = frameRatio / screenRatio;
      pctX = (normX * scale - (scale - 1) / 2) * 100;
    } else if (frameRatio < screenRatio) {
      // Frame is taller than screen (vertical cropping). Scale vertically from the center.
      const scale = screenRatio / frameRatio;
      pctY = (normY * scale - (scale - 1) / 2) * 100;
    }

    return { x: `${pctX}%`, y: `${pctY}%` };
  };

  const renderConnection = (jointAName: keyof PoseData, jointBName: keyof PoseData, key: string, region: 'torso' | 'arms' | 'legs') => {
    if (!landmarks) return null;
    const a = landmarks[jointAName];
    const b = landmarks[jointBName];
    if (!a || !b) return null;
    if ((a.x === 0 && a.y === 0) || (b.x === 0 && b.y === 0)) return null;

    const coordsA = getCoordinates(a);
    const coordsB = getCoordinates(b);

    // Dynamic Coloring per Region: Red (#EF4444) if there's an error in that body region, otherwise Green (#10B981)
    const hasError = formErrors[region];
    const strokeColor = hasError ? '#EF4444' : '#10B981';

    return (
      <Line
        key={key}
        x1={coordsA.x}
        y1={coordsA.y}
        x2={coordsB.x}
        y2={coordsB.y}
        stroke={strokeColor}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    );
  };

  const renderJoint = (jointName: keyof PoseData, key: string, color = '#FFD700') => {
    if (!landmarks) return null;
    const point = landmarks[jointName];
    if (!point || (point.x === 0 && point.y === 0)) return null;

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
    <View 
      style={styles.container}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setContainerDimensions({ width, height });
      }}
    >
      {/* Real-time Camera Feed (Memoized to prevent visual preview stutter) */}
      <MemoizedCamera
        device={device}
        isActive={isActive}
        frameProcessor={frameProcessor}
        format={format}
      />

      {/* SVG Skeletal Overlay (drawn over the camera feed) */}
      <Svg style={StyleSheet.absoluteFill}>
        {landmarks && [
          // Torso connections (torso region)
          renderConnection('leftShoulderPosition', 'rightShoulderPosition', 'collar', 'torso'),
          renderConnection('leftShoulderPosition', 'leftHipPosition', 'left_torso', 'torso'),
          renderConnection('rightShoulderPosition', 'rightHipPosition', 'right_torso', 'torso'),
          renderConnection('leftHipPosition', 'rightHipPosition', 'pelvis', 'torso'),

          // Left Arm (arms region)
          renderConnection('leftShoulderPosition', 'leftElbowPosition', 'left_shoulder_elbow', 'arms'),
          renderConnection('leftElbowPosition', 'leftWristPosition', 'left_elbow_wrist', 'arms'),

          // Right Arm (arms region)
          renderConnection('rightShoulderPosition', 'rightElbowPosition', 'right_shoulder_elbow', 'arms'),
          renderConnection('rightElbowPosition', 'rightWristPosition', 'right_elbow_wrist', 'arms'),

          // Left Leg (legs region)
          renderConnection('leftHipPosition', 'leftKneePosition', 'left_hip_knee', 'legs'),
          renderConnection('leftKneePosition', 'leftAnklePosition', 'left_knee_ankle', 'legs'),

          // Right Leg (legs region)
          renderConnection('rightHipPosition', 'rightKneePosition', 'right_hip_knee', 'legs'),
          renderConnection('rightKneePosition', 'rightAnklePosition', 'right_knee_ankle', 'legs'),

          // Joints
          renderJoint('nosePosition', 'nose', '#FFD700'),
          renderJoint('leftShoulderPosition', 'l_shoulder'),
          renderJoint('rightShoulderPosition', 'r_shoulder'),
          renderJoint('leftElbowPosition', 'l_elbow'),
          renderJoint('rightElbowPosition', 'r_elbow'),
          renderJoint('leftWristPosition', 'l_wrist'),
          renderJoint('rightWristPosition', 'r_wrist'),
          renderJoint('leftHipPosition', 'l_hip'),
          renderJoint('rightHipPosition', 'r_hip'),
          renderJoint('leftKneePosition', 'l_knee'),
          renderJoint('rightKneePosition', 'r_knee'),
          renderJoint('leftAnklePosition', 'l_ankle'),
          renderJoint('rightAnklePosition', 'r_ankle'),
        ]}
      </Svg>

      {/* Floating Mode Status HUD */}
      <View style={styles.hudOverlay}>
        <View style={[
          styles.hudBadge,
          { 
            borderColor: !isBodyVisible 
              ? 'rgba(245, 158, 11, 0.4)' // Orange border for body not visible warning
              : isFormCorrect 
                ? 'rgba(16, 185, 129, 0.4)' 
                : 'rgba(239, 68, 68, 0.4)',
            backgroundColor: !isBodyVisible 
              ? 'rgba(245, 158, 11, 0.15)' // Orange background
              : isFormCorrect 
                ? 'rgba(16, 185, 129, 0.15)' 
                : 'rgba(239, 68, 68, 0.15)' 
          }
        ]}>
          <CheckCircle2 
            size={14} 
            color={!isBodyVisible ? '#F59E0B' : isFormCorrect ? '#10B981' : '#EF4444'} 
          />
          <Text style={[
            styles.hudText, 
            { color: !isBodyVisible ? '#F59E0B' : isFormCorrect ? '#10B981' : '#EF4444' }
          ]}>
            {!isBodyVisible 
              ? 'Pose AI: Body Not Visible' 
              : isFormCorrect 
                ? 'Pose AI: Form Correct' 
                : 'Pose AI: Form Error!'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
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
    top: 135,
    left: 24,
    zIndex: 20,
  },
  hudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
  },
  hudText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
