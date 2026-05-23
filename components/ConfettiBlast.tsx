// ============================================
// Blaze — Confetti Blast Component
// ============================================
// Pure code confetti using Reanimated. No assets needed.
// Use sparingly: workout complete, level up, streak milestones.
// ============================================

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Confetti colors — festive but matching our brand
const CONFETTI_COLORS = [
  '#FF6B35', // brand orange
  '#FFB347', // brand gold
  '#FF4444', // red
  '#44CC44', // green
  '#4488FF', // blue
  '#FF44FF', // pink
  '#FFDD44', // yellow
  '#44FFDD', // cyan
];

interface ConfettiPiece {
  id: number;
  x: number;           // starting X position (0 to screenWidth)
  delay: number;        // stagger delay in ms
  color: string;
  size: number;         // 6-12px
  rotation: number;     // random initial rotation
  drift: number;        // horizontal drift (-40 to 40)
  shape: 'rect' | 'circle'; // variety
}

interface ConfettiBlastProps {
  trigger: boolean;     // set to true to fire confetti
  count?: number;       // number of pieces (default 50)
  duration?: number;    // animation duration in ms (default 3000)
  onComplete?: () => void;
}

export default function ConfettiBlast({
  trigger,
  count = 50,
  duration = 3000,
  onComplete,
}: ConfettiBlastProps) {
  // Generate confetti pieces
  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      delay: Math.random() * 400,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      drift: (Math.random() - 0.5) * 80,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));
  }, [trigger, count]);

  if (!trigger) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPieceView
          key={`${piece.id}-${trigger}`}
          piece={piece}
          duration={duration}
          onComplete={piece.id === 0 ? onComplete : undefined}
        />
      ))}
    </View>
  );
}

// Individual confetti piece with its own animation
function ConfettiPieceView({
  piece,
  duration,
  onComplete,
}: {
  piece: ConfettiPiece;
  duration: number;
  onComplete?: () => void;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.quad),
      })
    );

    // Fire onComplete after animation
    if (onComplete) {
      const timer = setTimeout(() => {
        runOnJS(onComplete)();
      }, duration + piece.delay + 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;

    return {
      opacity: interpolate(p, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        // Fall from top
        { translateY: interpolate(p, [0, 1], [-50, SCREEN_HEIGHT + 50]) },
        // Horizontal drift (sway)
        { translateX: interpolate(p, [0, 0.3, 0.6, 1], [0, piece.drift, -piece.drift * 0.5, piece.drift * 0.3]) },
        // Spin
        { rotate: `${piece.rotation + interpolate(p, [0, 1], [0, 360 + Math.random() * 360])}deg` },
        // Wobble scale
        { scaleX: interpolate(p, [0, 0.25, 0.5, 0.75, 1], [1, 0.3, 1, 0.3, 1]) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: piece.x,
          top: -20,
          width: piece.size,
          height: piece.shape === 'rect' ? piece.size * 1.6 : piece.size,
          backgroundColor: piece.color,
          borderRadius: piece.shape === 'circle' ? piece.size / 2 : 2,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
});
