// ============================================
// Blaze — Pet Avatar (Lottie + SVG Overlays)
// ============================================

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';
import { useUserStore } from '../store/userStore';
import { Star, Flame, Award, Trophy, Sparkles } from 'lucide-react-native';

export type PetMoodState = 'idle' | 'happy' | 'tired' | 'sleeping' | 'eating';

const LOTTIE_FILES = {
  idle: require('../assets/lottie/fox/fox_idle.json'),
  happy: require('../assets/lottie/fox/fox_happy.json'),
  sleeping: require('../assets/lottie/fox/fox_sleeping.json'),
};

const LOTTIE_FOR_MOOD: Record<PetMoodState, any> = {
  idle: LOTTIE_FILES.idle,
  happy: LOTTIE_FILES.happy,
  tired: LOTTIE_FILES.idle,
  sleeping: LOTTIE_FILES.sleeping,
  eating: LOTTIE_FILES.happy,
};

// Evolution stages define scale factor and badges
const EVOLUTION_STAGES: Record<number, {
  label: string;
  scaleBoost: number; // Size multiplier
  badgeIcon: React.ComponentType<any> | null;
  badgeColor: string;
}> = {
  1: { label: 'Egg',        scaleBoost: 0.8,  badgeIcon: null, badgeColor: '' },
  2: { label: 'Kit',        scaleBoost: 0.9,  badgeIcon: null, badgeColor: '' },
  3: { label: 'Young',      scaleBoost: 0.95, badgeIcon: Star, badgeColor: COLORS.brand.gold },
  4: { label: 'Athletic',   scaleBoost: 1.0,  badgeIcon: Flame, badgeColor: COLORS.brand.orange },
  5: { label: 'Champion',   scaleBoost: 1.05, badgeIcon: Award, badgeColor: COLORS.brand.gold },
  6: { label: 'Legendary',  scaleBoost: 1.1,  badgeIcon: Trophy, badgeColor: COLORS.brand.flame },
};

function getEvolutionStage(level: number): number {
  if (level >= 15) return 6;
  if (level >= 10) return 5;
  if (level >= 7) return 4;
  if (level >= 4) return 3;
  if (level >= 2) return 2;
  return 1;
}

interface PetAvatarProps {
  size?: number;
  mood?: PetMoodState;
  level?: number;
  showGlow?: boolean; // Kept in signature for compatibility but ignores background glow rendering
  activeAccessory?: string | null;
}

export default function PetAvatar({
  size = 180,
  mood = 'idle',
  level = 1,
  showGlow = false,
  activeAccessory: propAccessory,
}: PetAvatarProps) {
  const { petStats } = useUserStore();
  const activeAccessory = propAccessory !== undefined ? propAccessory : petStats.activeAccessory;

  const lottieSource = LOTTIE_FOR_MOOD[mood];
  const evoStage = getEvolutionStage(level);
  const evo = EVOLUTION_STAGES[evoStage] || EVOLUTION_STAGES[1];

  const speed = mood === 'tired' ? 0.5
    : mood === 'happy' ? 1.3
    : mood === 'sleeping' ? 0.7
    : 1;

  const lottieSize = size * 0.85 * evo.scaleBoost;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      
      {/* BACKGROUND ACCESSORIES (Wings, Aura) */}
      {activeAccessory === 'wings' && (
        <AnimatedAccessory accessoryId="wings" mood={mood} size={size} scaleBoost={evo.scaleBoost} zIndex={1}>
          <Svg width="100%" height="100%" viewBox="0 0 200 120">
            {/* Left Wing */}
            <Path d="M80,60 C60,40 10,20 5,45 C2,55 20,70 40,80 C25,85 10,95 25,100 C40,105 60,95 80,75 Z" fill="rgba(240, 248, 255, 0.9)" stroke="#60A5FA" strokeWidth={2} />
            {/* Right Wing */}
            <Path d="M120,60 C140,40 190,20 195,45 C198,55 180,70 160,80 C175,85 190,95 175,100 C160,105 140,95 120,75 Z" fill="rgba(240, 248, 255, 0.9)" stroke="#60A5FA" strokeWidth={2} />
          </Svg>
        </AnimatedAccessory>
      )}

      {activeAccessory === 'aura' && (
        <AnimatedAccessory accessoryId="aura" mood={mood} size={size} scaleBoost={evo.scaleBoost} zIndex={1}>
          <Svg width="100%" height="100%" viewBox="0 0 200 200">
            <Circle cx={100} cy={100} r={72} fill="none" stroke="rgba(255, 140, 0, 0.12)" strokeWidth={12} />
            <Path d="M40,140 C35,110 50,90 60,70 C55,90 48,110 50,130 Z" fill="#FF4500" opacity={0.6} />
            <Path d="M160,140 C165,110 150,90 140,70 C145,90 152,110 150,130 Z" fill="#FF4500" opacity={0.6} />
            <Path d="M100,40 C110,60 95,85 105,110 C90,85 85,60 100,40 Z" fill="#FFD700" opacity={0.8} />
            <Path d="M70,50 C80,70 70,95 80,120 C65,95 60,70 70,50 Z" fill="#FF8C00" opacity={0.7} />
            <Path d="M130,50 C120,70 130,95 120,120 C135,95 140,70 130,50 Z" fill="#FF8C00" opacity={0.7} />
          </Svg>
        </AnimatedAccessory>
      )}

      {/* Lottie Fox */}
      <LottieView
        source={lottieSource}
        autoPlay
        loop
        speed={speed}
        style={{ width: lottieSize, height: lottieSize, zIndex: 5 }}
      />

      {/* FOREGROUND ACCESSORIES (Crown, Scarf, Headband, Glasses) */}
      {activeAccessory === 'crown' && (
        <AnimatedAccessory accessoryId="crown" mood={mood} size={size} scaleBoost={evo.scaleBoost} zIndex={10}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Path d="M10,80 L20,40 L40,65 L50,30 L60,65 L80,40 L90,80 Z" fill="#FFD700" stroke="#FF8C00" strokeWidth={3} strokeLinejoin="round" />
            <Circle cx={50} cy={60} r={6} fill="#E63946" />
            <Circle cx={20} cy={40} r={4} fill="#FFB347" />
            <Circle cx={80} cy={40} r={4} fill="#FFB347" />
            <Circle cx={50} cy={30} r={4} fill="#FFB347" />
          </Svg>
        </AnimatedAccessory>
      )}

      {activeAccessory === 'scarf' && (
        <AnimatedAccessory accessoryId="scarf" mood={mood} size={size} scaleBoost={evo.scaleBoost} zIndex={10}>
          <Svg width="100%" height="100%" viewBox="0 0 120 80">
            <Path d="M25,30 C35,20 85,20 95,30 C105,40 95,60 85,60 C75,60 45,60 35,60 C25,60 15,40 25,30 Z" fill="#E63946" stroke="#C32F27" strokeWidth={2} />
            <Path d="M80,55 L90,82 L105,78 L93,52 Z" fill="#D62828" stroke="#C32F27" strokeWidth={2} />
            <Path d="M90,82 L88,89 M95,80 L95,87 M100,79 L101,86 M105,78 L107,85" stroke="#FFD166" strokeWidth={2} />
          </Svg>
        </AnimatedAccessory>
      )}

      {activeAccessory === 'headband' && (
        <AnimatedAccessory accessoryId="headband" mood={mood} size={size} scaleBoost={evo.scaleBoost} zIndex={10}>
          <Svg width="100%" height="100%" viewBox="0 0 100 40">
            <Path d="M5,15 L95,15 C98,15 98,25 95,25 L5,25 C2,25 2,15 5,15 Z" fill="#1D3557" stroke="#457B9D" strokeWidth={2} />
            <Path d="M45,23 C45,17 50,14 50,10 C50,14 55,17 55,23 C55,26 53,28 50,28 C47,28 45,26 45,23 Z" fill="#E63946" />
          </Svg>
        </AnimatedAccessory>
      )}

      {activeAccessory === 'glasses' && (
        <AnimatedAccessory accessoryId="glasses" mood={mood} size={size} scaleBoost={evo.scaleBoost} zIndex={10}>
          <Svg width="100%" height="100%" viewBox="0 0 100 50">
            <Path d="M10,25 C10,18 45,18 48,25 C48,32 30,35 15,35 C10,35 10,32 10,25 Z" fill="#1d1d1f" stroke="#FFD700" strokeWidth={2} />
            <Path d="M52,25 C52,18 87,18 90,25 C90,32 85,35 70,35 C55,35 52,32 52,25 Z" fill="#1d1d1f" stroke="#FFD700" strokeWidth={2} />
            <Path d="M47,23 L53,23" stroke="#FFD700" strokeWidth={3} />
            <Path d="M15,22 L25,32" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
            <Path d="M57,22 L67,32" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
          </Svg>
        </AnimatedAccessory>
      )}

      {/* Evolution Badge (stage 3+) */}
      {evo.badgeIcon ? (
        <View style={[styles.evoBadge, { top: size * 0.05, right: size * 0.05 }]}>
          <View style={styles.badgeIconWrapper}>
            <evo.badgeIcon size={size * 0.09} color={evo.badgeColor} />
          </View>
        </View>
      ) : null}

      {/* Sleeping Z's overlay */}
      {mood === 'sleeping' && <AnimatedZs />}

      {/* Happy sparkles overlay */}
      {mood === 'happy' && (
        <>
          <View style={[styles.sparkle, styles.sparkleTopLeft]}>
            <Sparkles size={size * 0.11} color={COLORS.brand.gold} />
          </View>
          <View style={[styles.sparkle, styles.sparkleTopRight]}>
            <Sparkles size={size * 0.11} color={COLORS.brand.gold} />
          </View>
        </>
      )}
    </View>
  );
}

// ============================================
// Accessory Configurations & Scaling Engine
// ============================================
interface PositionConfig {
  topScale: number;
  leftScale: number;
  rotation?: number;
  bobbingY?: number;
  bobbingX?: number;
  bobbingDuration?: number;
}

interface AccessoryConfig {
  widthScale: number;
  heightScale: number;
  positions: Record<PetMoodState, PositionConfig> & { idle: PositionConfig };
}

const ACCESSORY_CONFIGS: Record<string, AccessoryConfig> = {
  wings: {
    widthScale: 1.1,
    heightScale: 0.7,
    positions: {
      idle: { topScale: 0.15, leftScale: -0.05, rotation: 0, bobbingY: 2, bobbingX: 0, bobbingDuration: 3000 },
      happy: { topScale: 0.22, leftScale: 0.08, rotation: -12, bobbingY: 6, bobbingX: 2, bobbingDuration: 450 },
      tired: { topScale: 0.20, leftScale: -0.03, rotation: 8, bobbingY: 1, bobbingX: 0, bobbingDuration: 4000 },
      sleeping: { topScale: 0.48, leftScale: -0.10, rotation: 45, bobbingY: 0.5, bobbingX: 0, bobbingDuration: 5000 },
      eating: { topScale: 0.20, leftScale: -0.01, rotation: -5, bobbingY: 3, bobbingX: 1, bobbingDuration: 800 },
    }
  },
  aura: {
    widthScale: 1.2,
    heightScale: 1.2,
    positions: {
      idle: { topScale: -0.1, leftScale: -0.1, rotation: 0, bobbingY: 1, bobbingX: 0, bobbingDuration: 3000 },
      happy: { topScale: -0.05, leftScale: 0.05, rotation: 0, bobbingY: 3, bobbingX: 1, bobbingDuration: 450 },
      tired: { topScale: -0.08, leftScale: -0.08, rotation: 0, bobbingY: 0.5, bobbingX: 0, bobbingDuration: 4000 },
      sleeping: { topScale: 0.25, leftScale: -0.2, rotation: 0, bobbingY: 0, bobbingX: 0, bobbingDuration: 5000 },
      eating: { topScale: -0.07, leftScale: -0.05, rotation: 0, bobbingY: 2, bobbingX: 0, bobbingDuration: 800 },
    }
  },
  crown: {
    widthScale: 0.35,
    heightScale: 0.35,
    positions: {
      idle: { topScale: 0.08, leftScale: 0.325, rotation: 0, bobbingY: 2, bobbingX: 0, bobbingDuration: 3000 },
      happy: { topScale: 0.16, leftScale: 0.48, rotation: -12, bobbingY: 6, bobbingX: 2.5, bobbingDuration: 450 },
      tired: { topScale: 0.15, leftScale: 0.30, rotation: 10, bobbingY: 1, bobbingX: 0, bobbingDuration: 4000 },
      sleeping: { topScale: 0.45, leftScale: 0.10, rotation: 45, bobbingY: 0.5, bobbingX: 0, bobbingDuration: 5000 },
      eating: { topScale: 0.12, leftScale: 0.35, rotation: -5, bobbingY: 3, bobbingX: 1, bobbingDuration: 800 },
    }
  },
  scarf: {
    widthScale: 0.45,
    heightScale: 0.3,
    positions: {
      idle: { topScale: 0.50, leftScale: 0.275, rotation: 0, bobbingY: 2, bobbingX: 0, bobbingDuration: 3000 },
      happy: { topScale: 0.48, leftScale: 0.38, rotation: -8, bobbingY: 5, bobbingX: 1, bobbingDuration: 450 },
      tired: { topScale: 0.52, leftScale: 0.26, rotation: 5, bobbingY: 1, bobbingX: 0, bobbingDuration: 4000 },
      sleeping: { topScale: 0.65, leftScale: 0.18, rotation: 30, bobbingY: 0.5, bobbingX: 0, bobbingDuration: 5000 },
      eating: { topScale: 0.51, leftScale: 0.28, rotation: -2, bobbingY: 2, bobbingX: 0, bobbingDuration: 800 },
    }
  },
  headband: {
    widthScale: 0.4,
    heightScale: 0.16,
    positions: {
      idle: { topScale: 0.22, leftScale: 0.30, rotation: 0, bobbingY: 2, bobbingX: 0, bobbingDuration: 3000 },
      happy: { topScale: 0.28, leftScale: 0.46, rotation: -12, bobbingY: 6, bobbingX: 2.5, bobbingDuration: 450 },
      tired: { topScale: 0.27, leftScale: 0.28, rotation: 8, bobbingY: 1, bobbingX: 0, bobbingDuration: 4000 },
      sleeping: { topScale: 0.52, leftScale: 0.12, rotation: 45, bobbingY: 0.5, bobbingX: 0, bobbingDuration: 5000 },
      eating: { topScale: 0.24, leftScale: 0.32, rotation: -5, bobbingY: 3, bobbingX: 1, bobbingDuration: 800 },
    }
  },
  glasses: {
    widthScale: 0.4,
    heightScale: 0.2,
    positions: {
      idle: { topScale: 0.31, leftScale: 0.30, rotation: 0, bobbingY: 2, bobbingX: 0, bobbingDuration: 3000 },
      happy: { topScale: 0.36, leftScale: 0.47, rotation: -12, bobbingY: 6, bobbingX: 2.5, bobbingDuration: 450 },
      tired: { topScale: 0.35, leftScale: 0.28, rotation: 8, bobbingY: 1, bobbingX: 0, bobbingDuration: 4000 },
      sleeping: { topScale: 0.58, leftScale: 0.15, rotation: 45, bobbingY: 0.5, bobbingX: 0, bobbingDuration: 5000 },
      eating: { topScale: 0.33, leftScale: 0.32, rotation: -5, bobbingY: 3, bobbingX: 1, bobbingDuration: 800 },
    }
  }
};

interface AnimatedAccessoryProps {
  accessoryId: string;
  mood: PetMoodState;
  size: number;
  scaleBoost: number;
  zIndex: number;
  children: React.ReactNode;
}

function AnimatedAccessory({ accessoryId, mood, size, scaleBoost, zIndex, children }: AnimatedAccessoryProps) {
  const config = ACCESSORY_CONFIGS[accessoryId];
  if (!config) return null;

  const moodConfig = config.positions[mood] || config.positions.idle;

  const width = size * config.widthScale * scaleBoost;
  const height = size * config.heightScale * scaleBoost;

  // Calculate scaled static coordinates, centering adjustments
  const left = size * (0.5 + (moodConfig.leftScale - 0.5) * scaleBoost);
  const top = size * (0.5 + (moodConfig.topScale - 0.5) * scaleBoost);
  const rotation = moodConfig.rotation || 0;

  // Reanimated Shared Values for dynamic bobbing
  const bobY = useSharedValue(0);
  const bobX = useSharedValue(0);

  useEffect(() => {
    // Reset bobbing values
    bobY.value = 0;
    bobX.value = 0;

    const ampY = moodConfig.bobbingY || 0;
    const ampX = moodConfig.bobbingX || 0;
    const duration = moodConfig.bobbingDuration || 2000;

    if (ampY > 0) {
      bobY.value = withRepeat(
        withSequence(
          withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }

    if (ampX > 0) {
      bobX.value = withRepeat(
        withSequence(
          withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [mood, accessoryId, moodConfig]);

  const animatedStyle = useAnimatedStyle(() => {
    const ampY = moodConfig.bobbingY || 0;
    const ampX = moodConfig.bobbingX || 0;

    // Interpolate bobbing
    const translateY = interpolate(bobY.value, [0, 1], [-ampY, ampY]);
    const translateX = interpolate(bobX.value, [0, 1], [-ampX, ampX]);

    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: `${rotation}deg` }
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top,
          left,
          width,
          height,
          zIndex,
        },
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function AnimatedZs() {
  const zFloat = useSharedValue(0);

  useEffect(() => {
    zFloat.value = withRepeat(
      withTiming(1, { duration: 2500 }),
      -1,
      false
    );
  }, []);

  const zStyle = useAnimatedStyle(() => ({
    opacity: interpolate(zFloat.value, [0, 0.3, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(zFloat.value, [0, 1], [0, -30]) },
      { translateX: interpolate(zFloat.value, [0, 1], [0, 12]) },
      { scale: interpolate(zFloat.value, [0, 0.5, 1], [0.6, 1.1, 0.8]) },
    ],
  }));

  return (
    <Animated.View style={[styles.zContainer, zStyle]}>
      <Text style={styles.zText}>Z</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  evoBadge: {
    position: 'absolute',
    zIndex: 15,
  },
  badgeIconWrapper: {
    backgroundColor: COLORS.bg.secondary,
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  zContainer: {
    position: 'absolute',
    top: 5,
    right: 15,
    zIndex: 10,
  },
  zText: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.gold,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 10,
  },
  sparkleTopLeft: {
    top: 10,
    left: 10,
  },
  sparkleTopRight: {
    top: 10,
    right: 10,
  },
});
