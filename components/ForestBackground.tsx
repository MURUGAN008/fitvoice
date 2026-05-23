// ============================================
// Blaze — Forest Habitat Background (Lottie)
// ============================================
// Renders a Lottie forest animation behind the fox pet.
// Switches between day/night/campfire based on time.
// Exports bottom edge color so the page can match it.
// ============================================

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BORDER_RADIUS, CARD_SHADOW, COLORS } from '../constants/theme';
import { useUserStore } from '../store/userStore';

// Direct requires — all 3 files exist
const FOREST_DAY = require('../assets/lottie/backgrounds/forest_day.json');
const FOREST_NIGHT = require('../assets/lottie/backgrounds/forest_night.json');
const FOREST_CAMPFIRE = require('../assets/lottie/backgrounds/forest_campfire.json');

// Bottom-edge colors of each animation
// Adjust these to match the actual bottom pixels of your Lottie files
export const FOREST_BOTTOM_COLORS = {
  day: '#083F36',        // dark green (forest morning bottom)
  evening: '#1A1510',    // dark warm brown (campfire bottom)
  night: '#0B0B1E',      // deep navy (night forest bottom)
};

// Helper: get the current time-based config
export function getForestConfig(activeHabitat?: string | null) {
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  const isEvening = hour >= 17 && hour < 20;

  let baseColor = FOREST_BOTTOM_COLORS.day;
  let source = FOREST_DAY;

  if (isNight) {
    source = FOREST_NIGHT;
    baseColor = FOREST_BOTTOM_COLORS.night;
  } else if (isEvening) {
    source = FOREST_CAMPFIRE;
    baseColor = FOREST_BOTTOM_COLORS.evening;
  }

  if (activeHabitat === 'beach') {
    return { source, bottomColor: '#D96E2E' };
  }
  if (activeHabitat === 'volcano') {
    return { source, bottomColor: '#2B0404' };
  }
  if (activeHabitat === 'space') {
    return { source, bottomColor: '#07000F' };
  }

  return { source, bottomColor: baseColor };
}

interface ForestBackgroundProps {
  width: number | string;
  height: number;
  children: React.ReactNode;
  borderRadius?: number;
}

export default function ForestBackground({ width, height, children, borderRadius }: ForestBackgroundProps) {
  const { petStats } = useUserStore();
  const activeHabitat = petStats.activeHabitat;
  const { source } = getForestConfig(activeHabitat);

  // Full-width mode: no border radius, no shadow (hero section)
  const isFullWidth = width === '100%';
  const radius = borderRadius !== undefined ? borderRadius : (isFullWidth ? 0 : BORDER_RADIUS.xl);

  const containerStyle: ViewStyle = {
    width: width as any,
    height,
    borderRadius: radius,
    overflow: 'hidden',
    ...(isFullWidth ? {} : CARD_SHADOW),
  };

  return (
    <View style={containerStyle}>
      {/* Forest Lottie animation */}
      <LottieView
        source={source}
        autoPlay
        loop
        speed={0.5}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* Slight overlay for readability */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      {/* Premium Habitat overlays */}
      {activeHabitat === 'beach' && (
        <LinearGradient
          colors={['rgba(255, 230, 150, 0.1)', 'rgba(255, 179, 71, 0.35)', 'rgba(255, 140, 66, 0.6)']}
          style={StyleSheet.absoluteFill}
        />
      )}
      {activeHabitat === 'volcano' && (
        <LinearGradient
          colors={['rgba(255, 69, 0, 0.15)', 'rgba(255, 0, 0, 0.4)', 'rgba(139, 0, 0, 0.7)']}
          style={StyleSheet.absoluteFill}
        />
      )}
      {activeHabitat === 'space' && (
        <LinearGradient
          colors={['rgba(20, 0, 80, 0.3)', 'rgba(100, 0, 150, 0.5)', 'rgba(0, 0, 0, 0.8)']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Children (stats, fox, etc.) */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
});
