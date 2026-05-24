import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ImageBackground } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, CARD_SHADOW } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import { router } from 'expo-router';
import PetAvatar, { PetMoodState } from '../../components/PetAvatar';
import ForestBackground, { getForestConfig } from '../../components/ForestBackground';
import { PLAN_IMAGES } from '../../constants/images';
import StrokeText from '../../components/StrokeText';
import WorkoutCalendar from '../../components/WorkoutCalendar';
import AnimatedCard from '../../components/AnimatedCard';
import { requestNotificationPermissions, scheduleSmartReminders } from '../../lib/notifications';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';

import { 
  Flame, 
  Shield, 
  Star, 
  Coins, 
  ShoppingBag, 
  Dumbbell, 
  Zap, 
  Activity, 
  Sprout, 
  Moon, 
  CheckCircle2, 
  Calendar 
} from 'lucide-react-native';

export default function HomeScreen() {
  const { 
    onboardingData, 
    petStats, 
    workoutHistory, 
    workoutSchedule,
    registerPushToken,
    checkIncomingNudges,
    savedCustomWorkouts
  } = useUserStore();

  const [incomingNudgeSender, setIncomingNudgeSender] = React.useState<string | null>(null);
  
  const petName = onboardingData.pet_name || 'Blaze';
  const todayDay = new Date().getDay();
  const isScheduledToday = workoutSchedule[todayDay] !== null;
  const currentHour = new Date().getHours();
  const activeHabitat = petStats.activeHabitat;

  // Get forest bottom color to seamlessly blend the page
  const pageBackground = useMemo(() => {
    return getForestConfig(activeHabitat).bottomColor;
  }, [activeHabitat]);

  // Determine pet mood based on state
  const getPetMood = (): PetMoodState => {
    if (currentHour >= 22 || currentHour < 6) return 'sleeping';
    if (currentHour >= 20 && isScheduledToday) return 'tired';
    if (petStats.energy < 30) return 'tired';
    if (petStats.energy >= 80) return 'happy';
    return 'idle';
  };

  // Energy Bar Animation
  const energyWidth = useSharedValue(0);
  useEffect(() => {
    energyWidth.value = withSpring(petStats.energy);
  }, [petStats.energy]);

  // Request notification permissions, schedule reminders, register push token, and check nudges on mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      const granted = await requestNotificationPermissions();
      if (granted && isMounted) {
        await scheduleSmartReminders({
          workoutDays: onboardingData.workout_days || [],
          petName,
          streak: petStats.streak,
          energy: petStats.energy,
          lastWorkoutDate: petStats.lastWorkoutDate,
        });

        // Register push token to Supabase
        await registerPushToken();
      }

      // Check if user has been nudged today
      const nudgeSender = await checkIncomingNudges();
      if (nudgeSender && isMounted) {
        setIncomingNudgeSender(nudgeSender);
      }
    })();

    // Listen for incoming notifications when app is foregrounded
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as Record<string, any> | undefined;
      if (data && data.type === 'nudge' && data.senderName) {
        if (isMounted) {
          setIncomingNudgeSender(data.senderName);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);


  // Track completed quests for haptic feedback
  const completedDailyCount = useMemo(() => {
    const today = new Date();
    const todayXp = workoutHistory
      .filter(w => new Date(w.completedAt).toDateString() === today.toDateString())
      .reduce((sum, w) => sum + (w.totalXp || 0), 0);
    let count = 0;
    if (petStats.lastWorkoutDate && new Date(petStats.lastWorkoutDate).toDateString() === today.toDateString()) count++;
    if (petStats.streak > 0) count++;
    if (todayXp >= 30) count++;
    return count;
  }, [workoutHistory, petStats.lastWorkoutDate, petStats.streak]);

  const [lastCompletedCount, setLastCompletedCount] = React.useState(completedDailyCount);

  useEffect(() => {
    if (completedDailyCount > lastCompletedCount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastCompletedCount(completedDailyCount);
    }
  }, [completedDailyCount, lastCompletedCount]);

  const energyAnimatedStyle = useAnimatedStyle(() => ({
    width: `${energyWidth.value}%`,
    backgroundColor: petStats.energy > 50 ? COLORS.brand.orange : COLORS.state.error,
  }));

  // Dialogue based on state
  const getDialogue = () => {
    if (currentHour >= 20 && isScheduledToday)
      return "It's getting late... let's do a quick habit to save our streak!";
    if (petStats.energy < 30) return "I'm feeling a little weak... let's move!";
    if (petStats.energy >= 80) return "I feel great! Let's get stronger!";
    return `Ready when you are, ${onboardingData.name || 'trainer'}!`;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBackground }]} contentContainerStyle={styles.scrollContent}>
      
      {/* ====== HERO: Full-Width Forest + Stats + Fox ====== */}
      <ForestBackground width={'100%'} height={440}>
        {/* Stats Row — floating on top of the forest */}
        <View style={styles.heroStatsRow}>
          <View style={styles.statBadge}>
            <Flame size={16} color={COLORS.brand.orange} style={styles.statIconSvg} />
            <StrokeText style={styles.statText} strokeWidth={1}>{petStats.streak}</StrokeText>
          </View>
          <View style={styles.statBadge}>
            <Shield size={16} color="#60A5FA" style={styles.statIconSvg} />
            <StrokeText style={styles.statText} strokeWidth={1}>{petStats.restTokens}</StrokeText>
          </View>
          <View style={styles.statBadge}>
            <Star size={16} color={COLORS.brand.gold} style={styles.statIconSvg} />
            <StrokeText style={styles.statText} strokeWidth={1}>Lvl {petStats.level}</StrokeText>
          </View>
          <View style={styles.coinBadge}>
            <Coins size={16} color={COLORS.brand.gold} style={styles.statIconSvg} />
            <StrokeText style={{...styles.statText, color: COLORS.brand.gold}} strokeColor="rgba(0,0,0,0.5)" strokeWidth={1}>{petStats.coins}</StrokeText>
          </View>
        </View>

        {/* Dialogue Bubble */}
        <Animated.View entering={FadeIn.delay(300)} style={styles.dialogueBubble}>
          <Text style={styles.dialogueText}>{getDialogue()}</Text>
          <View style={styles.dialoguePointer} />
        </Animated.View>

        {/* The Fox Pet - Interactive */}
        <TouchableOpacity 
          style={styles.foxInteractiveContainer} 
          activeOpacity={0.85}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/shop-modal');
          }}
        >
          <PetAvatar
            size={160}
            mood={getPetMood()}
            level={petStats.level}
            showGlow={true}
          />
          <View style={styles.floatingShopBadge}>
            <ShoppingBag size={14} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* Pet Name */}
        <StrokeText style={styles.petNameLabel} strokeColor="rgba(0,0,0,0.6)" strokeWidth={2}>{petName}</StrokeText>
        
        {/* Streak Badge & Quick Start Near Pet */}
        <View style={styles.heroActionsRow}>
          <View style={styles.streakBadge}>
            <Flame size={16} color={COLORS.brand.orange} style={styles.statIconSvg} />
            <Text style={styles.streakBadgeText}>{petStats.streak} Days</Text>
          </View>
          {(!petStats.lastWorkoutDate || new Date(petStats.lastWorkoutDate).toDateString() !== new Date().toDateString()) && (
            <AnimatedCard 
              style={styles.quickStartButton}
              onPress={() => {
                const dayOfWeek = new Date().getDay();
                const todayPreset = workoutSchedule[dayOfWeek] || 'full_body';
                router.push({ pathname: '/workout', params: { preset: todayPreset } });
              }}
            >
              <LinearGradient
                colors={[COLORS.brand.orange, COLORS.brand.flame]}
                style={styles.quickStartGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.quickStartText}>Quick Start</Text>
              </LinearGradient>
            </AnimatedCard>
          )}
        </View>
      </ForestBackground>

      {/* Growth Bars — below the hero */}
      <View style={styles.barsSection}>
        <View style={[styles.barsContainer, CARD_SHADOW]}>
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
              <View style={[styles.barFill, { width: `${(petStats.xp / petStats.xpNeeded) * 100}%`, backgroundColor: COLORS.brand.gold }]} />
            </View>
          </View>
        </View>
      </View>

      {/* BOTTOM ACTION CENTER: Netflix Layout */}
      <View style={styles.actionCenter}>
        
        {/* INCOMING FRIEND NUDGE BANNER */}
        {incomingNudgeSender && (
          <Animated.View entering={FadeIn} style={[styles.nudgeCard, CARD_SHADOW]}>
            <View style={styles.nudgeContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Zap size={16} color={COLORS.brand.orange} fill={COLORS.brand.orange} />
                <Text style={styles.nudgeTitle}>Workout Nudge! 🔥</Text>
              </View>
              <Text style={styles.nudgeSub}>
                <Text style={{ fontFamily: 'Inter_700Bold', color: '#FFF' }}>{incomingNudgeSender}</Text> sent you a nudge to get your workout done today! Let's do it!
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity 
                style={styles.nudgeButton} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const dayOfWeek = new Date().getDay();
                  const todayPreset = workoutSchedule[dayOfWeek] || 'full_body';
                  router.push({ pathname: '/workout', params: { preset: todayPreset } });
                }}
              >
                <Text style={styles.nudgeButtonText}>Train</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.nudgeDismissButton} 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIncomingNudgeSender(null);
                }}
              >
                <Text style={styles.nudgeDismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* LATE NIGHT BAILOUT TRIGGER */}
        {currentHour >= 20 && isScheduledToday && (
          <Animated.View entering={FadeIn} style={[styles.rescueCard, CARD_SHADOW]}>
            <View style={styles.rescueContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Shield size={16} color={COLORS.state.error} />
                <Text style={styles.rescueTitle}>Save your streak!</Text>
              </View>
              <Text style={styles.rescueSub}>It's late. Just do the 2-Minute Habit so {petName} doesn't lose energy.</Text>
            </View>
            <TouchableOpacity style={styles.rescueButton} onPress={() => router.push({ pathname: '/workout', params: { preset: 'streak_saver' } })}>
              <Text style={styles.rescueButtonText}>2 Mins</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* WORKOUT CALENDAR */}
        <WorkoutCalendar />

        {/* TODAY'S MISSION: Smart daily workout card */}
        {(() => {
          const dayOfWeek = new Date().getDay();
          const todayPreset = workoutSchedule[dayOfWeek];
          
          if (!todayPreset) {
            return (
              <Animated.View entering={FadeIn.delay(200)} style={[styles.missionCard, CARD_SHADOW]}>
                <View style={styles.missionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Moon size={18} color={COLORS.text.secondary} />
                    <Text style={styles.missionLabel}>Rest Day</Text>
                  </View>
                </View>
                <Text style={styles.missionDesc}>Take it easy! Your muscles need time to recover.</Text>
              </Animated.View>
            );
          }
          
          const presetMeta = {
            full_body: { name: 'Full Body', icon: Flame, duration: '20 min', desc: 'Build overall strength', color: COLORS.brand.orange },
            upper_body: { name: 'Upper Body', icon: Dumbbell, duration: '15 min', desc: 'Chest, arms & back', color: '#A78BFA' },
            core: { name: 'Core Burn', icon: Zap, duration: '10 min', desc: 'Target your abs', color: COLORS.brand.gold },
            lower_body: { name: 'Lower Body', icon: Activity, duration: '15 min', desc: 'Legs & glutes power', color: '#60A5FA' },
          };
          
          const customPlan = savedCustomWorkouts.find(w => w.id === todayPreset);
          const meta = customPlan 
            ? { 
                name: customPlan.name, 
                icon: Dumbbell, 
                duration: `${Math.ceil((customPlan.exercises.reduce((acc, curr) => acc + curr.duration, 0)) / 60)} min`, 
                desc: `${customPlan.exercises.length} customized exercises`, 
                color: COLORS.brand.yellow 
              }
            : (presetMeta[todayPreset as keyof typeof presetMeta] || presetMeta.full_body);

          const alreadyWorkedOut = petStats.lastWorkoutDate && new Date(petStats.lastWorkoutDate).toDateString() === new Date().toDateString();
          
          return (
            <Animated.View entering={FadeIn.delay(200)} style={[styles.missionCard, CARD_SHADOW]}>
              <View style={styles.missionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {alreadyWorkedOut && <CheckCircle2 size={18} color={COLORS.state.success} />}
                  <Text style={styles.missionLabel}>
                    {alreadyWorkedOut ? "Today's Workout: Done!" : "Today's Mission"}
                  </Text>
                </View>
                <Text style={styles.missionDuration}>{meta.duration}</Text>
              </View>
              <View style={styles.missionBody}>
                <View style={[styles.missionIconWrap, { backgroundColor: meta.color + '20' }]}>
                  <meta.icon size={24} color={meta.color} />
                </View>
                <View style={styles.missionInfo}>
                  <Text style={styles.missionName}>{meta.name}</Text>
                  <Text style={styles.missionDesc}>{meta.desc}</Text>
                </View>
                {!alreadyWorkedOut && (
                  <AnimatedCard 
                    style={[styles.missionStartButton, { backgroundColor: meta.color }]}
                    onPress={() => {
                      if (customPlan) {
                        router.push({ pathname: '/workout', params: { custom_plan_id: todayPreset } });
                      } else {
                        router.push({ pathname: '/workout', params: { preset: todayPreset } });
                      }
                    }}
                  >
                    <Text style={styles.missionStartText}>GO</Text>
                  </AnimatedCard>
                )}
              </View>
            </Animated.View>
          );
        })()}

        {/* DAILY QUESTS */}
        {(() => {
          const today = new Date();
          const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
          
          // Generate deterministic daily quests based on the day of year
          const todayXp = workoutHistory
            .filter(w => {
              const d = new Date(w.completedAt);
              return d.toDateString() === today.toDateString();
            })
            .reduce((sum, w) => sum + (w.totalXp || 0), 0);

          const dailyQuests = [
            { id: 'dq1', title: 'Complete any workout', icon: Activity, reward: '15 XP', done: petStats.lastWorkoutDate && new Date(petStats.lastWorkoutDate).toDateString() === today.toDateString() },
            { id: 'dq2', title: 'Keep your streak alive', icon: Flame, reward: '10 XP', done: petStats.streak > 0 },
            { id: 'dq3', title: 'Earn 30+ XP today', icon: Zap, reward: '5 Coins', done: todayXp >= 30 },
          ];
          
          // Weekly challenge
          const weeklyQuests = [
            { id: 'wq1', title: 'Work out 3 days this week', icon: Calendar, reward: '50 XP + 15 Coins', progress: Math.min(workoutHistory.filter(w => {
              const d = new Date(w.completedAt);
              const weekStart = new Date(today);
              const dayOfWeek = today.getDay();
              weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
              weekStart.setHours(0,0,0,0);
              return d >= weekStart;
            }).length, 3), target: 3 },
          ];
          
          const completedDaily = dailyQuests.filter(q => q.done).length;
          
          return (
            <View style={styles.questSection}>
              <View style={styles.questHeader}>
                <Text style={styles.questTitle}>Daily Quests</Text>
                <Text style={styles.questCount}>{completedDaily}/{dailyQuests.length}</Text>
              </View>
              {dailyQuests.map(quest => (
                <View key={quest.id} style={[styles.questRow, quest.done && styles.questRowDone]}>
                  {quest.done ? (
                    <CheckCircle2 size={20} color={COLORS.state.success} />
                  ) : (
                    <quest.icon size={20} color={COLORS.text.secondary} />
                  )}
                  <Text style={[styles.questText, quest.done && styles.questTextDone]}>{quest.title}</Text>
                  <Text style={[styles.questReward, quest.done && styles.questRewardDone]}>{quest.reward}</Text>
                </View>
              ))}
              
              {/* Weekly Challenge */}
              <View style={styles.questHeader}>
                <Text style={styles.questTitle}>Weekly Challenge</Text>
              </View>
              {weeklyQuests.map(quest => {
                const isDone = quest.progress >= quest.target;
                return (
                  <View key={quest.id} style={[styles.questRow, isDone && styles.questRowDone]}>
                    {isDone ? (
                      <CheckCircle2 size={20} color={COLORS.state.success} />
                    ) : (
                      <quest.icon size={20} color={COLORS.text.secondary} />
                    )}
                    <View style={styles.questInfo}>
                      <Text style={[styles.questText, isDone && styles.questTextDone]}>{quest.title}</Text>
                      <View style={styles.questProgressBar}>
                        <View style={[styles.questProgressFill, { width: `${Math.min((quest.progress / quest.target) * 100, 100)}%` }]} />
                      </View>
                    </View>
                    <Text style={[styles.questReward, isDone && styles.questRewardDone]}>{quest.reward}</Text>
                  </View>
                );
              })}
            </View>
          );
        })()}

        <Text style={styles.rowTitle}>All Workouts</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
          <AnimatedCard style={[styles.workoutCard, CARD_SHADOW]} onPress={() => router.push({ pathname: '/workout', params: { preset: 'full_body' } })}>
            <ImageBackground source={PLAN_IMAGES.full_body} style={styles.cardImage} imageStyle={styles.cardImageInner}>
              <View style={styles.cardImageOverlay}>
                <Text style={styles.cardDuration}>20 min</Text>
              </View>
            </ImageBackground>
            <Text style={styles.cardTitle}>Full Body</Text>
            <Text style={styles.cardSub}>Build overall strength</Text>
          </AnimatedCard>
          
          <AnimatedCard style={[styles.workoutCard, CARD_SHADOW]} onPress={() => router.push({ pathname: '/workout', params: { preset: 'core' } })}>
            <ImageBackground source={PLAN_IMAGES.core} style={styles.cardImage} imageStyle={styles.cardImageInner}>
              <View style={styles.cardImageOverlay}>
                <Text style={styles.cardDuration}>10 min</Text>
              </View>
            </ImageBackground>
            <Text style={styles.cardTitle}>Core Burn</Text>
            <Text style={styles.cardSub}>Target your abs</Text>
          </AnimatedCard>

          <AnimatedCard style={[styles.workoutCard, CARD_SHADOW]} onPress={() => router.push({ pathname: '/workout', params: { preset: 'streak_saver' } })}>
            <LinearGradient
              colors={[COLORS.brand.sunset, '#FF8888']}
              style={styles.cardImage}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardImageOverlay}>
                <Shield size={32} color="#FFF" style={{ position: 'absolute', top: 12, left: 12, opacity: 0.8 }} />
                <Text style={styles.cardDuration}>2 min</Text>
              </View>
            </LinearGradient>
            <Text style={styles.cardTitle}>Streak Saver</Text>
            <Text style={styles.cardSub}>Quick habit rescue</Text>
          </AnimatedCard>
        </ScrollView>

        <Text style={styles.rowTitle}>Focus Areas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll}>
          <AnimatedCard style={[styles.workoutCard, CARD_SHADOW]} onPress={() => router.push({ pathname: '/workout', params: { preset: 'lower_body' } })}>
            <ImageBackground source={PLAN_IMAGES.lower_body} style={styles.cardImage} imageStyle={styles.cardImageInner}>
              <View style={styles.cardImageOverlay}>
                <Text style={styles.cardDuration}>15 min</Text>
              </View>
            </ImageBackground>
            <Text style={styles.cardTitle}>Lower Body</Text>
            <Text style={styles.cardSub}>Legs & glutes power</Text>
          </AnimatedCard>
          
          <AnimatedCard style={[styles.workoutCard, CARD_SHADOW]} onPress={() => router.push({ pathname: '/workout', params: { preset: 'upper_body' } })}>
            <ImageBackground source={PLAN_IMAGES.upper_body} style={styles.cardImage} imageStyle={styles.cardImageInner}>
              <View style={styles.cardImageOverlay}>
                <Text style={styles.cardDuration}>15 min</Text>
              </View>
            </ImageBackground>
            <Text style={styles.cardTitle}>Upper Body</Text>
            <Text style={styles.cardSub}>Chest, arms & back</Text>
          </AnimatedCard>
        </ScrollView>
        
        {/* Bottom padding */}
        <View style={{ height: SPACING.xxxl }} />
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
    flexGrow: 1,
  },
  
  // Hero Stats (floating on forest)
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxxl + SPACING.md,
    paddingBottom: SPACING.sm,
    zIndex: 10,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 179, 71, 0.08)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 71, 0.15)',
  },
  statIconSvg: {
    marginRight: 6,
  },
  statText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
  },

  // Habitat
  dialogueBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: SPACING.xs,
    maxWidth: '85%',
    alignSelf: 'center',
    zIndex: 10,
  },
  dialogueText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 16,
  },
  dialoguePointer: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 16,
    height: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  petNameLabel: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    zIndex: 10,
  },
  foxInteractiveContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 180,
    height: 180,
    zIndex: 5,
  },
  floatingShopBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: COLORS.brand.orange,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.lg,
    zIndex: 10,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 0, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.4)',
  },
  streakBadgeText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.orange,
  },
  quickStartButton: {
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  quickStartGradient: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },

  // Bars Section
  barsSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },

  // Bars
  barsContainer: {
    width: '100%',
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
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

  // Action Center & Netflix Rows
  actionCenter: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  // Today's Mission Card
  missionCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    marginBottom: SPACING.lg,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  missionLabel: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  missionDuration: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.brand.orange,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  missionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  missionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionIcon: {
    fontSize: 28,
  },
  missionInfo: {
    flex: 1,
  },
  missionName: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  missionDesc: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
  },
  missionStartButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionStartText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  // Quest Section
  questSection: {
    marginBottom: SPACING.lg,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  questTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  questCount: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.brand.gold,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    gap: SPACING.sm,
  },
  questRowDone: {
    borderColor: 'rgba(74, 222, 128, 0.3)',
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },
  questIcon: {
    fontSize: 18,
  },
  questText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.primary,
  },
  questTextDone: {
    color: COLORS.state.success,
    textDecorationLine: 'line-through',
  },
  questReward: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.brand.gold,
  },
  questRewardDone: {
    color: COLORS.state.success,
  },
  questInfo: {
    flex: 1,
  },
  questProgressBar: {
    height: 4,
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  questProgressFill: {
    height: '100%',
    backgroundColor: COLORS.brand.orange,
    borderRadius: 2,
  },
  rowTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  rowScroll: {
    overflow: 'visible',
  },
  workoutCard: {
    width: 155,
    marginRight: SPACING.md,
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  cardImage: {
    width: '100%',
    height: 95,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    position: 'relative',
  },
  cardImageInner: {
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 6,
  },
  cardIcon: {
    fontSize: 36,
  },
  cardDuration: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  cardSub: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
  },

  // Late Night Rescue Card
  rescueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.08)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.state.error,
    marginBottom: SPACING.lg,
  },
  rescueContent: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  rescueTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    color: COLORS.state.error,
    marginBottom: 2,
  },
  rescueSub: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.primary,
    lineHeight: 16,
  },
  rescueButton: {
    backgroundColor: COLORS.state.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  rescueButtonText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.brand.orange,
    marginBottom: SPACING.lg,
  },
  nudgeContent: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  nudgeTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.orange,
    marginBottom: 2,
  },
  nudgeSub: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.primary,
    lineHeight: 16,
  },
  nudgeButton: {
    backgroundColor: COLORS.brand.orange,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  nudgeButtonText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  nudgeDismissButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nudgeDismissText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
  },
});

