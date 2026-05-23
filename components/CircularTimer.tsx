// ============================================
// Blaze — Animated Circular Timer Ring
// ============================================

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, FONT_SIZE } from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularTimerProps {
  size?: number;
  strokeWidth?: number;
  timeLeft: number;
  totalTime: number;
  isPaused?: boolean;
  color?: string;
  trailColor?: string;
}

export default function CircularTimer({
  size = 160,
  strokeWidth = 8,
  timeLeft,
  totalTime,
  isPaused = false,
  color = COLORS.brand.orange,
  trailColor = COLORS.bg.tertiary,
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const progress = useSharedValue(0);

  useEffect(() => {
    const targetProgress = totalTime > 0 ? 1 - timeLeft / totalTime : 0;
    progress.value = withTiming(targetProgress, {
      duration: 900,
      easing: Easing.linear,
    });
  }, [timeLeft, totalTime]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // Format time display
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const displayTime = minutes > 0
    ? `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
    : `00:${seconds < 10 ? '0' : ''}${seconds}`;

  // Color shifts when time is low
  const timerColor = timeLeft <= 5 ? COLORS.state.error : isPaused ? COLORS.state.warning : color;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Trail circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trailColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.3}
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={timerColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.timeContainer}>
        <Text
          style={[
            styles.timeText,
            { color: timerColor, fontSize: size > 140 ? FONT_SIZE.xxxl : FONT_SIZE.xxl },
          ]}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {displayTime}
        </Text>
        {isPaused && (
          <Text style={styles.pausedText}>PAUSED</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timeContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  pausedText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.state.warning,
    letterSpacing: 1,
    marginTop: 4,
  },
});
