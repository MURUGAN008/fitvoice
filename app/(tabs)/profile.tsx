import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, CARD_SHADOW } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import { supabase } from '../../lib/supabase';
import GradientHeader from '../../components/GradientHeader';
import { getCacheSize, clearCache } from '../../lib/cacheManager';
import { RefreshCw, Database, LogOut, Flame } from 'lucide-react-native';

export default function ProfileScreen() {
  const { onboardingData, petStats, resetOnboarding, setIsOnboarded } = useUserStore();
  const petName = onboardingData.pet_name || 'Blaze';
  const userName = onboardingData.name || 'Athletic Trainer';
  
  // Format goal text nicely
  const goalMapping: Record<string, string> = {
    lose_weight: 'Lose Weight & Get Lean',
    build_muscle: 'Build Muscle & Mass',
    flexibility: 'Stretch & Flow',
    stay_active: 'Stay Active & Healthy',
  };
  const goalText = goalMapping[onboardingData.goal || ''] || 'Stay Fit';

  // Format training days
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const activeDays = onboardingData.workout_days || [];

  const [cacheSizeMB, setCacheSizeMB] = useState(0);

  useEffect(() => {
    loadCacheSize();
  }, []);

  const loadCacheSize = async () => {
    const bytes = await getCacheSize();
    setCacheSizeMB(parseFloat((bytes / (1024 * 1024)).toFixed(2)));
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Offline Cache?",
      `This will delete ${cacheSizeMB} MB of downloaded videos. They will be re-downloaded next time you need them.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearCache();
            await loadCacheSize();
            Alert.alert("Cache Cleared", "Offline videos have been removed.");
          }
        }
      ]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      "Reset Onboarding?",
      "This will let you re-experience the hatching flow, name your pet, and set your goals from scratch!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset & Start Over",
          style: "destructive",
          onPress: () => {
            resetOnboarding();
            setIsOnboarded(false);
            router.replace('/(auth)/onboarding');
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out?",
      "Are you sure you want to log out of Blaze?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            useUserStore.getState().setSession(null);
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Trainer Profile"
        subtitle="Manage your bio metrics and app settings"
      />

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* SECTION 1: BIO HEADER CARD */}
        <Animated.View entering={FadeIn} style={styles.bioCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.userTierRow}>
            <Flame size={16} color={COLORS.brand.orange} fill={COLORS.brand.orange} />
            <Text style={styles.userTier}>Level {petStats.level} Coach • {petName}'s Partner</Text>
          </View>
        </Animated.View>

        {/* SECTION 2: METRICS GRID */}
        <Text style={styles.sectionTitle}>Physical Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Weight</Text>
            <Text style={styles.metricValue}>{onboardingData.weight_kg ? `${onboardingData.weight_kg} kg` : 'N/A'}</Text>
          </View>
          
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Height</Text>
            <Text style={styles.metricValue}>{onboardingData.height_cm ? `${onboardingData.height_cm} cm` : 'N/A'}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Gender</Text>
            <Text style={styles.metricValue}>{onboardingData.gender ? onboardingData.gender.toUpperCase() : 'N/A'}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Age</Text>
            <Text style={styles.metricValue}>{onboardingData.age ? `${onboardingData.age} yrs` : 'N/A'}</Text>
          </View>
        </View>

        {/* SECTION 3: WORKOUT GOAL & PREFERENCES */}
        <Text style={styles.sectionTitle}>Training Commitment</Text>
        <View style={styles.goalCard}>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Primary Target Goal</Text>
            <Text style={styles.goalValueText}>{goalText}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Session Target Duration</Text>
            <Text style={styles.goalValueText}>{onboardingData.session_duration_mins} Minutes</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.scheduleContainer}>
            <Text style={styles.scheduleLabel}>Active Training Days</Text>
            <View style={styles.badgeRow}>
              {activeDays.map((dayIdx) => (
                <View key={dayIdx} style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{dayNames[dayIdx].substring(0, 3)}</Text>
                </View>
              ))}
              {activeDays.length === 0 && (
                <Text style={styles.noDaysText}>No scheduled days. Tap reset to reschedule.</Text>
              )}
            </View>
          </View>
        </View>

        {/* SECTION 4: SETTINGS ACTIONS */}
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleResetOnboarding}>
            <View style={styles.actionLeft}>
              <View style={styles.actionIconContainer}>
                <RefreshCw size={20} color={COLORS.brand.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Reset Onboarding Flow</Text>
                <Text style={styles.actionSub}>Hatch a new egg, rename your pet, and set goals.</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <View style={styles.actionLeft}>
              <View style={styles.actionIconContainer}>
                <Database size={20} color={COLORS.brand.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Clear Offline Cache ({cacheSizeMB} MB)</Text>
                <Text style={styles.actionSub}>Free up space by deleting locally cached videos.</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionRow, styles.actionRowLast]} onPress={handleLogout}>
            <View style={styles.actionLeft}>
              <View style={styles.actionIconContainer}>
                <LogOut size={20} color={COLORS.state.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionTitle, { color: COLORS.state.error }]}>Log Out Session</Text>
                <Text style={styles.actionSub}>Disconnect this device from Supabase auth.</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  bioCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    ...CARD_SHADOW,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.brand.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  userTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  userTier: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '47%',
    backgroundColor: COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  metricLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },

  // Goal Card
  goalCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  goalLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
  },
  goalValueText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.brand.orange,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.bg.accent,
    marginVertical: SPACING.xs,
  },
  scheduleContainer: {
    paddingVertical: SPACING.sm,
  },
  scheduleLabel: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  dayBadge: {
    backgroundColor: COLORS.bg.tertiary,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  dayBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  noDaysText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.tertiary,
  },

  // Actions Card
  actionsCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
  },
  actionRowLast: {
    borderBottomWidth: 0,
    paddingBottom: SPACING.xs,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  actionIconContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    lineHeight: 14,
  },
});
