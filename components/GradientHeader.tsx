// ============================================
// Blaze — Gradient Header Component
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, FONT_SIZE, SPACING, CARD_SHADOW } from '../constants/theme';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: readonly string[];
  children?: React.ReactNode;
}

export default function GradientHeader({
  title,
  subtitle,
  gradient = COLORS.gradient.brand,
  children,
}: GradientHeaderProps) {
  return (
    <LinearGradient
      colors={gradient as readonly [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, CARD_SHADOW]}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 48 : 56,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  content: {
    gap: 4,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
