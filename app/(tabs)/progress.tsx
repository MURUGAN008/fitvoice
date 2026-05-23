import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, CARD_SHADOW } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import GradientHeader from '../../components/GradientHeader';
import PetAvatar from '../../components/PetAvatar';
import StrokeText from '../../components/StrokeText';
import AnalyticsDashboard from '../../components/AnalyticsDashboard';
import AnimatedCard from '../../components/AnimatedCard';
import { PET_STAGES } from '../../types';
import { 
  Flame, 
  Shield, 
  Star, 
  Coins, 
  Activity, 
  Dumbbell, 
  Zap, 
  TrendingUp, 
  Lock, 
  Trophy, 
  Award, 
  Moon, 
  CheckCircle2 
} from 'lucide-react-native';

type Badge = {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<any>;
  unlockedCondition: (state: any) => boolean;
};

const BADGES: Badge[] = [
  {
    id: 'first_workout',
    title: 'First Step',
    desc: 'Earned your first batch of training XP!',
    icon: Award,
    unlockedCondition: (stats) => stats.level > 1 || stats.xp > 0,
  },
  {
    id: 'streak_master',
    title: 'Streak Starter',
    desc: 'Achieved an active workout streak of 3+ days.',
    icon: Flame,
    unlockedCondition: (stats) => stats.streak >= 3,
  },
  {
    id: 'shield_hero',
    title: 'Shield Hero',
    desc: 'Possess a Rest Token to protect your schedule.',
    icon: Shield,
    unlockedCondition: (stats) => stats.restTokens > 0,
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    desc: 'Completed a workout late to rescue your progress.',
    icon: Moon,
    unlockedCondition: (stats) => stats.lastWorkoutDate !== null, // simple mock check
  },
];

const PRESET_META: Record<string, { name: string; icon: React.ComponentType<any>; bg: string }> = {
  full_body: { name: 'Full Body Workout', icon: Flame, bg: COLORS.brand.orange },
  core: { name: 'Core Burner', icon: Zap, bg: COLORS.brand.gold },
  lower_body: { name: 'Leg Day Power', icon: Activity, bg: '#60A5FA' },
  upper_body: { name: 'Upper Body Pump', icon: Dumbbell, bg: '#A78BFA' },
  streak_saver: { name: 'Streak Saver Rescue', icon: Shield, bg: COLORS.brand.sunset },
};

export default function ProgressScreen() {
  const { petStats, onboardingData, useRestToken, workoutHistory, getPersonalRecords } = useUserStore();
  const petName = onboardingData.pet_name || 'Blaze';
  const xpPercentage = Math.min(100, Math.floor((petStats.xp / petStats.xpNeeded) * 100));

  const handleUseToken = () => {
    if (petStats.restTokens <= 0) {
      Alert.alert("No Tokens Left", "You can earn more Rest Tokens by hitting a 3-day workout streak!");
      return;
    }
    Alert.alert(
      "Use Rest Shield?",
      `Using a Rest Shield will protect ${petName}'s streak today without requiring a workout!`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Activate Shield", 
          onPress: () => {
            useRestToken();
            Alert.alert("Shield Activated!", `${petName}'s streak is secured for today!`);
          } 
        }
      ]
    );
  };

  // Mock schedule days mapping
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayIndex = new Date().getDay();

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Progress Tracker"
        subtitle="Monitor your habit compliance and stats"
      />

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* SECTION 1: PET LEVEL PROGRESSION */}
        <Animated.View entering={FadeInDown} style={styles.sectionCard}>
          <View style={styles.petAvatarRow}>
            <PetAvatar
              size={70}
              mood={petStats.energy < 30 ? 'tired' : petStats.energy >= 80 ? 'happy' : 'idle'}
              level={petStats.level}
              showGlow={false}
            />
            <View style={styles.petProgressInfo}>
              <Text style={styles.petNameText}>{petName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <StrokeText style={styles.levelTextStroke} strokeColor="rgba(0,0,0,0.3)" strokeWidth={1}>Level {petStats.level}</StrokeText>
                <Text style={styles.stageSeparator}>•</Text>
                <Text style={styles.stageText}>{(() => {
                  if (petStats.level >= 15) return PET_STAGES[6].name;
                  if (petStats.level >= 10) return PET_STAGES[5].name;
                  if (petStats.level >= 7) return PET_STAGES[4].name;
                  if (petStats.level >= 4) return PET_STAGES[3].name;
                  if (petStats.level >= 2) return PET_STAGES[2].name;
                  return PET_STAGES[1].name;
                })()}</Text>
              </View>
            </View>
          </View>

          {/* XP Bar */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Experience (XP)</Text>
              <Text style={styles.progressVal}>{petStats.xp} / {petStats.xpNeeded} XP</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${xpPercentage}%` }]} />
            </View>
          </View>

          {/* Energy Bar */}
          <View style={[styles.progressBarWrapper, { marginTop: SPACING.md }]}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Pet Energy</Text>
              <Text style={styles.progressVal}>{petStats.energy}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${petStats.energy}%`, backgroundColor: COLORS.brand.gold }]} />
            </View>
          </View>
        </Animated.View>

        {/* SECTION 2: WEEKLY STREAK SHIELD */}
        <Text style={styles.sectionTitle}>Weekly Commitment</Text>
        <View style={styles.streakCard}>
          <View style={styles.streakCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.streakTitle}>Current Streak: </Text>
              <StrokeText style={{ fontSize: FONT_SIZE.md, fontFamily: 'Inter_700Bold', color: COLORS.brand.orange }} strokeColor="rgba(0,0,0,0.3)" strokeWidth={1}>{petStats.streak} Days</StrokeText>
            </View>
            <Text style={styles.streakSub}>Keep working out to protect {petName}'s streak!</Text>
            <View style={styles.badgeLabel}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Flame size={12} color={COLORS.brand.orange} />
                <Text style={styles.badgeLabelText}>Active</Text>
              </View>
            </View>
          </View>

          {/* Week Calendar */}
          <View style={styles.weekCalendarRow}>
            {daysOfWeek.map((day, idx) => {
              const isScheduled = onboardingData.workout_days?.includes(idx);
              const isCurrentDay = idx === todayIndex;
              // Compute the actual date for this weekday in the current week (Sun-based)
              const now = new Date();
              const dayDate = new Date(now);
              dayDate.setDate(now.getDate() - todayIndex + idx);
              dayDate.setHours(0, 0, 0, 0);
              const hasCompleted = isScheduled && workoutHistory.some(w => {
                const d = new Date(w.completedAt);
                return d.toDateString() === dayDate.toDateString();
              });

              return (
                <View key={day} style={[styles.calendarDayCol, isCurrentDay && styles.calendarDayCurrent]}>
                  <Text style={[styles.calendarDayName, isCurrentDay && styles.calendarDayNameActive]}>{day}</Text>
                  <View style={[
                    styles.calendarCircle,
                    isScheduled && styles.calendarCircleScheduled,
                    hasCompleted && styles.calendarCircleCompleted
                  ]}>
                    {hasCompleted ? (
                      <Flame size={12} color={COLORS.brand.orange} />
                    ) : isScheduled ? (
                      <Zap size={12} color={COLORS.brand.gold} />
                    ) : (
                      <View style={styles.calendarDot} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* SECTION 3: EMPATHETIC REST SHIELD */}
        <View style={styles.shieldCard}>
          <View style={styles.shieldIconContainer}>
            <Shield size={28} color={COLORS.brand.orange} />
          </View>
          <View style={styles.shieldInfo}>
            <Text style={styles.shieldTitle}>Streak Shield Available</Text>
            <Text style={styles.shieldDesc}>
              You have <Text style={{fontWeight: 'bold'}}>{petStats.restTokens}</Text> Streak Shield(s). Use one to take a break without breaking your habit streak!
            </Text>
            <AnimatedCard 
              style={[styles.shieldButton, petStats.restTokens <= 0 && styles.shieldButtonDisabled]} 
              onPress={handleUseToken}
              disabled={petStats.restTokens <= 0}
            >
              <Text style={styles.shieldButtonText}>Activate Streak Shield</Text>
            </AnimatedCard>
          </View>
        </View>

        {/* SECTION 4: UNLOCKED BADGES */}
        <Text style={styles.sectionTitle}>Earned Achievements</Text>
        <View style={styles.badgesGrid}>
          {BADGES.map((badge) => {
            const isUnlocked = badge.unlockedCondition(petStats);
            return (
              <View key={badge.id} style={[styles.badgeCard, !isUnlocked && styles.badgeCardLocked]}>
                <View style={{ marginBottom: SPACING.xs }}>
                  {isUnlocked ? (
                    <badge.icon size={36} color={COLORS.brand.orange} />
                  ) : (
                    <Lock size={36} color={COLORS.text.tertiary} />
                  )}
                </View>
                <Text style={[styles.badgeTitleText, !isUnlocked && styles.badgeTitleLocked]}>
                  {badge.title}
                </Text>
                <Text style={styles.badgeDescText}>{badge.desc}</Text>
              </View>
            );
          })}
        </View>

        {/* SECTION 5: PERSONAL RECORDS (Progressive Overload) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md, marginBottom: SPACING.xs }}>
          <Trophy size={18} color={COLORS.brand.gold} />
          <Text style={styles.prHeaderTitle}>Personal Records</Text>
        </View>
        {(() => {
          const records = getPersonalRecords();
          if (records.length === 0) {
            return (
              <View style={styles.emptyHistoryCard}>
                <Dumbbell size={36} color={COLORS.text.tertiary} style={{ marginBottom: SPACING.sm }} />
                <Text style={styles.emptyHistoryText}>No records yet</Text>
                <Text style={styles.emptyHistorySub}>Complete workouts to track your personal bests!</Text>
              </View>
            );
          }
          return (
            <View style={styles.prList}>
              {records.map((pr) => {
                const bestMins = Math.floor(pr.bestDurationSecs / 60);
                const bestSecs = pr.bestDurationSecs % 60;
                const bestStr = bestMins > 0 ? `${bestMins}m ${bestSecs}s` : `${bestSecs}s`;
                const lastMins = Math.floor(pr.lastDurationSecs / 60);
                const lastSecs = pr.lastDurationSecs % 60;
                const lastStr = lastMins > 0 ? `${lastMins}m ${lastSecs}s` : `${lastSecs}s`;
                
                return (
                  <Animated.View 
                    key={pr.exerciseId}
                    entering={FadeInDown}
                    style={[styles.prCard, pr.improvedFromLast && styles.prCardImproved]}
                  >
                    <View style={styles.prLeft}>
                      {pr.improvedFromLast ? (
                        <TrendingUp size={20} color={COLORS.brand.gold} />
                      ) : (
                        <Activity size={20} color={COLORS.text.secondary} />
                      )}
                    </View>
                    <View style={styles.prInfo}>
                      <Text style={styles.prName}>{pr.exerciseName}</Text>
                      <Text style={styles.prMeta}>{pr.totalSessions} session{pr.totalSessions !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={styles.prStats}>
                      <View style={styles.prStatRow}>
                        <Text style={styles.prStatLabel}>Best</Text>
                        <Text style={styles.prStatValue}>{bestStr}</Text>
                      </View>
                      <View style={styles.prStatRow}>
                        <Text style={styles.prStatLabel}>Last</Text>
                        <Text style={[styles.prStatValue, pr.improvedFromLast && styles.prStatImproved]}>{lastStr}</Text>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          );
        })()}

        {/* SECTION 6: ANALYTICS DASHBOARD */}
        <AnalyticsDashboard />

        {/* SECTION 7: WORKOUT HISTORY */}
        <Text style={styles.sectionTitle}>Workout History</Text>
        {!workoutHistory || workoutHistory.length === 0 ? (
          <View style={styles.emptyHistoryCard}>
            <Dumbbell size={36} color={COLORS.text.tertiary} style={{ marginBottom: SPACING.sm }} />
            <Text style={styles.emptyHistoryText}>No workouts logged yet</Text>
            <Text style={styles.emptyHistorySub}>Complete your first workout to fuel {petName} and log history!</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {workoutHistory.map((item, index) => {
              const meta = PRESET_META[item.preset || ''] || { name: 'Custom Workout', icon: Dumbbell, bg: COLORS.bg.tertiary };
              const dateStr = item.completedAt ? new Date(item.completedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }) : 'Recently';

              const mins = Math.floor(item.totalDurationSecs / 60);
              const secs = item.totalDurationSecs % 60;
              const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

              return (
                <Animated.View 
                  key={index}
                  entering={FadeInDown.delay(index * 50)} 
                  style={styles.historyCard}
                >
                  <View style={[styles.historyIconWrapper, { backgroundColor: meta.bg }]}>
                    <meta.icon size={20} color="#FFF" />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{meta.name}</Text>
                    <Text style={styles.historyMeta}>
                      {dateStr} • {durationStr}
                    </Text>
                    <Text style={styles.historyExercises} numberOfLines={1}>
                      {item.exercises.map(ex => ex.name).join(', ')}
                    </Text>
                  </View>
                  <View style={styles.historyReward}>
                    <Text style={styles.historyXp}>+{item.totalXp} XP</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  header: {
    padding: SPACING.xl,
    paddingTop: SPACING.xxxl,
    backgroundColor: COLORS.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    ...CARD_SHADOW,
  },
  petAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  petEmoji: {
    fontSize: 50,
  },
  petProgressInfo: {
    flex: 1,
  },
  petNameText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  levelText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.brand.orange,
  },
  levelTextStroke: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.orange,
  },
  stageSeparator: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
  },
  stageText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
  },
  progressBarWrapper: {
    width: '100%',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
  },
  progressVal: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  progressBarBg: {
    height: 10,
    width: '100%',
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.brand.orange,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  
  // Streak Card
  streakCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  streakCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  streakTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  streakSub: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
  },
  badgeLabel: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeLabelText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.orange,
  },
  weekCalendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDayCol: {
    alignItems: 'center',
    flex: 1,
  },
  calendarDayCurrent: {
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  calendarDayName: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.tertiary,
    marginBottom: 4,
  },
  calendarDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.text.tertiary,
  },
  calendarDayNameActive: {
    color: COLORS.brand.orange,
  },
  calendarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCircleScheduled: {
    borderWidth: 1.5,
    borderColor: COLORS.bg.accent,
  },
  calendarCircleCompleted: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderColor: COLORS.brand.orange,
  },

  // Shield Card
  shieldCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    gap: SPACING.md,
    alignItems: 'center',
  },
  shieldIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldInfo: {
    flex: 1,
  },
  shieldTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  shieldDesc: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    lineHeight: 16,
  },
  shieldButton: {
    backgroundColor: COLORS.brand.orange,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  shieldButtonDisabled: {
    backgroundColor: COLORS.bg.accent,
    opacity: 0.5,
  },
  shieldButtonText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: COLORS.bg.primary,
  },

  // Badges Grid
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '47%',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  badgeCardLocked: {
    opacity: 0.5,
    backgroundColor: COLORS.bg.tertiary,
  },
  badgeIcon: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  badgeIconLocked: {
    opacity: 0.3,
  },
  badgeTitleText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  badgeTitleLocked: {
    color: COLORS.text.tertiary,
  },
  badgeDescText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 14,
  },

  // History list styles
  emptyHistoryCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryEmoji: {
    fontSize: 40,
    marginBottom: SPACING.sm,
    opacity: 0.6,
  },
  emptyHistoryText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  emptyHistorySub: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  historyList: {
    gap: SPACING.sm,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    gap: SPACING.md,
  },
  historyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIcon: {
    fontSize: 20,
  },
  historyInfo: {
    flex: 1,
    gap: 2,
  },
  historyName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  historyMeta: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
  },
  historyExercises: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  historyReward: {
    backgroundColor: 'rgba(255, 179, 71, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  historyXp: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.gold,
  },

  // Personal Records
  prList: {
    gap: SPACING.sm,
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    gap: SPACING.md,
  },
  prCardImproved: {
    borderColor: COLORS.brand.gold,
    backgroundColor: 'rgba(255, 179, 71, 0.05)',
  },
  prLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prIcon: {
    fontSize: 20,
  },
  prInfo: {
    flex: 1,
    gap: 2,
  },
  prName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  prMeta: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.tertiary,
  },
  prStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  prStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  prStatLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.tertiary,
  },
  prStatValue: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    minWidth: 50,
    textAlign: 'right',
  },
  prStatImproved: {
    color: COLORS.brand.gold,
  },
  prHeaderTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
});
