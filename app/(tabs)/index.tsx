import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { onboardingData, petStats } = useUserStore();
  
  const petName = onboardingData.pet_name || 'Blaze';
  const targetDuration = onboardingData.session_duration_mins || 20;

  // Fox Breathing Animation
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const foxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Energy Bar Animation
  const energyWidth = useSharedValue(0);
  useEffect(() => {
    energyWidth.value = withSpring(petStats.energy);
  }, [petStats.energy]);

  const energyAnimatedStyle = useAnimatedStyle(() => ({
    width: `${energyWidth.value}%`,
    backgroundColor: petStats.energy > 50 ? COLORS.brand.orange : COLORS.state.error,
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* HEADER: Stats */}
      <View style={styles.header}>
        <View style={styles.statBadge}>
          <Text style={styles.statIcon}>⭐</Text>
          <Text style={styles.statText}>Lvl {petStats.level}</Text>
        </View>
        <View style={styles.statBadge}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statText}>{petStats.streak} Days</Text>
        </View>
        <View style={styles.statBadge}>
          <Text style={styles.statIcon}>✨</Text>
          <Text style={styles.statText}>{petStats.coins}</Text>
        </View>
      </View>

      {/* CENTERPIECE: The Fox Habitat */}
      <View style={styles.habitatContainer}>
        {/* Dialogue Bubble */}
        <View style={styles.dialogueBubble}>
          <Text style={styles.dialogueText}>
            {petStats.energy < 40 
              ? "I'm feeling a little weak... let's move!" 
              : "I feel great! Let's get stronger!"}
          </Text>
          <View style={styles.dialoguePointer} />
        </View>

        {/* The Pet */}
        <Animated.View style={[styles.petWrapper, foxAnimatedStyle]}>
          <Text style={styles.petEmoji}>🦊</Text>
        </Animated.View>

        {/* Growth Bars */}
        <View style={styles.barsContainer}>
          <View style={styles.barWrapper}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>Energy (HP)</Text>
              <Text style={styles.barValue}>{petStats.energy}/100</Text>
            </View>
            <View style={styles.barBackground}>
              <Animated.View style={[styles.barFill, energyAnimatedStyle]} />
            </View>
          </View>

          <View style={styles.barWrapper}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>XP to Level {petStats.level + 1}</Text>
              <Text style={styles.barValue}>{petStats.xp}/{petStats.xpNeeded}</Text>
            </View>
            <View style={styles.barBackground}>
              <View style={[styles.barFill, { width: `${(petStats.xp / petStats.xpNeeded) * 100}%`, backgroundColor: COLORS.brand.yellow }]} />
            </View>
          </View>
        </View>
      </View>

      {/* BOTTOM ACTION CENTER */}
      <View style={styles.actionCenter}>
        <Text style={styles.actionTitle}>Today's Discovery</Text>
        
        {/* Primary Option: Full Workout */}
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
          <View style={styles.primaryButtonContent}>
            <Text style={styles.primaryButtonTitle}>Start {targetDuration}-Min Full Session</Text>
            <Text style={styles.primaryButtonSub}>Recommended based on your goals</Text>
          </View>
          <Text style={styles.primaryButtonIcon}>💪</Text>
        </TouchableOpacity>

        {/* Secondary Option: 2-Min Habit Fallback */}
        <TouchableOpacity 
          style={styles.secondaryCard} 
          activeOpacity={0.8}
          onPress={() => router.push('/workout')}
        >
          <View style={styles.secondaryContent}>
            <Text style={styles.secondaryTitle}>Short on time?</Text>
            <Text style={styles.secondarySub}>Do a 2-min micro-session to feed {petName} and keep your streak alive!</Text>
          </View>
          <View style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>2 Mins</Text>
          </View>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  scrollContent: {
    padding: SPACING.xl,
    paddingTop: SPACING.xxl,
    flexGrow: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xxl,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  statIcon: {
    fontSize: FONT_SIZE.md,
    marginRight: 4,
  },
  statText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
  },

  // Habitat
  habitatContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  dialogueBubble: {
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    marginBottom: SPACING.sm,
    maxWidth: '80%',
  },
  dialogueText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  dialoguePointer: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 16,
    height: 16,
    backgroundColor: COLORS.bg.secondary,
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  petWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 107, 53, 0.1)', // Subtle glow
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  petEmoji: {
    fontSize: 100,
  },

  // Bars
  barsContainer: {
    width: '100%',
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    gap: SPACING.md,
  },
  barWrapper: {
    width: '100%',
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  barLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
  },
  barValue: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  barBackground: {
    height: 8,
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Action Center
  actionCenter: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: SPACING.md,
  },
  actionTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.brand.orange,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    elevation: 4,
    shadowColor: COLORS.brand.orange,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonContent: {
    flex: 1,
  },
  primaryButtonTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginBottom: 2,
  },
  primaryButtonSub: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  primaryButtonIcon: {
    fontSize: 32,
    marginLeft: SPACING.md,
  },

  // Secondary Button
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  secondaryContent: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  secondaryTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  secondarySub: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    lineHeight: 16,
  },
  secondaryButton: {
    backgroundColor: COLORS.bg.tertiary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  secondaryButtonText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.orange,
  },
});
