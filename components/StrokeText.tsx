// ============================================
// Blaze — Stroke Text (Gamified Outlined Text)
// ============================================
// Simulates text-stroke using a background "shadow" text layer.
// Use for: XP, levels, streaks, pet name, action buttons.
// ============================================

import React from 'react';
import { View, Text, TextStyle, StyleSheet, TextProps } from 'react-native';

interface StrokeTextProps extends TextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  strokeColor?: string;
  strokeWidth?: number;
}

export default function StrokeText({
  children,
  style,
  strokeColor = 'rgba(0, 0, 0, 0.7)',
  strokeWidth = 1.5,
  ...rest
}: StrokeTextProps) {
  const flatStyle = StyleSheet.flatten(style) || {};
  const w = strokeWidth;

  // 4 directional offsets to create outline
  const offsets = [
    { left: -w, top: 0 },
    { left: w, top: 0 },
    { left: 0, top: -w },
    { left: 0, top: w },
  ];

  return (
    <View style={styles.container}>
      {/* Stroke layers */}
      {offsets.map((offset, i) => (
        <Text
          key={i}
          style={[
            flatStyle,
            styles.strokeLayer,
            { color: strokeColor, transform: [{ translateX: offset.left }, { translateY: offset.top }] },
          ]}
          {...rest}
        >
          {children}
        </Text>
      ))}
      {/* Main text on top */}
      <Text style={flatStyle} {...rest}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  strokeLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
});
