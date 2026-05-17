import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useUserStore } from '../store/userStore';

type WorkoutState = 'preview' | 'active' | 'rest' | 'finished';

type Exercise = { id: string; name: string; file: string; duration: number; tips: string[] };

const DEFAULT_EXERCISES: Exercise[] = [
  { 
    id: '1', name: 'Squats', file: 'Squats.mp4', duration: 30, 
    tips: ['Keep your chest up and look forward.', 'Drive through your heels, not your toes.', 'Don\'t let your knees cave inward!'] 
  },
  { 
    id: '2', name: 'Standard Push-Up', file: 'Standard_PushUp.mp4', duration: 30, 
    tips: ['Keep your core completely tight.', 'Elbows should be at a 45-degree angle.', 'Go all the way down and all the way up.'] 
  },
  { 
    id: '3', name: 'Reverse Plank', file: 'Reverse_Plank.mp4', duration: 30, 
    tips: ['Squeeze your glutes hard.', 'Keep your body in a perfectly straight line.', 'Push your hips up to the ceiling.'] 
  },
  { 
    id: '4', name: 'Forearm Plank', file: 'Forearm_Plank.mp4', duration: 30, 
    tips: ['Keep your back completely flat.', 'Don\'t let your hips sag toward the floor.', 'Breathe deep into your stomach.'] 
  },
];

const REST_DURATION = 5; // 5 seconds rest between exercises
const MINIMUM_HABIT_TIME = 120; // 2 minutes

export default function WorkoutScreen() {
  const { addXp, onboardingData } = useUserStore();
  const petName = onboardingData.pet_name || 'Blaze';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

  const [workoutState, setWorkoutState] = useState<WorkoutState>('preview');
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  
  // Execution state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const totalTime = exercises.reduce((acc, curr) => acc + curr.duration, 0);
  const isValidTime = totalTime >= MINIMUM_HABIT_TIME;

  const currentExercise = exercises[currentIndex];
  const videoUrl = currentExercise ? `${supabaseUrl}/storage/v1/object/public/workouts/${currentExercise.file}` : '';

  // Initialize the video player
  const player = useVideoPlayer(videoUrl, player => {
    player.loop = true;
    if (workoutState === 'active' && !isPaused) {
      player.play();
    } else {
      player.pause();
    }
  });

  // Handle Play/Pause syncing with video player
  useEffect(() => {
    if (player) {
      if (workoutState === 'active' && !isPaused) {
        player.play();
      } else {
        player.pause();
      }
    }
  }, [isPaused, workoutState, player]);

  // Main Timer Logic
  useEffect(() => {
    if (workoutState === 'preview' || workoutState === 'finished' || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Transition logic
          if (workoutState === 'active') {
            if (currentIndex < exercises.length - 1) {
              setWorkoutState('rest');
              return REST_DURATION;
            } else {
              setWorkoutState('finished');
              return 0;
            }
          } else if (workoutState === 'rest') {
            setWorkoutState('active');
            setCurrentIndex(currentIndex + 1);
            return exercises[currentIndex + 1].duration;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [workoutState, currentIndex, isPaused, exercises]);

  // Tip Rotation Logic (every 5 seconds)
  useEffect(() => {
    if (workoutState !== 'active' || isPaused || !currentExercise) return;
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % currentExercise.tips.length);
    }, 5000);
    return () => clearInterval(tipTimer);
  }, [workoutState, isPaused, currentExercise]);

  const handleStart = () => {
    if (!isValidTime) return;
    setCurrentIndex(0);
    setTimeLeft(exercises[0].duration);
    setTipIndex(0);
    setWorkoutState('active');
  };

  const handleFinish = () => {
    addXp(50);
    router.replace('/(tabs)');
  };

  // Preview List Handlers
  const moveExercise = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newEx = [...exercises];
      [newEx[index - 1], newEx[index]] = [newEx[index], newEx[index - 1]];
      setExercises(newEx);
    } else if (direction === 'down' && index < exercises.length - 1) {
      const newEx = [...exercises];
      [newEx[index + 1], newEx[index]] = [newEx[index], newEx[index + 1]];
      setExercises(newEx);
    }
  };

  const removeExercise = (index: number) => {
    const newEx = exercises.filter((_, i) => i !== index);
    setExercises(newEx);
  };

  // ==========================================
  // RENDER: PREVIEW STATE
  // ==========================================
  if (workoutState === 'preview') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Workout Preview</Text>
          <Text style={styles.headerSubtitle}>Customize your session</Text>
        </View>
        
        <GestureHandlerRootView style={styles.listContainer}>
          <DraggableFlatList
            data={exercises}
            onDragEnd={({ data }) => setExercises(data)}
            keyExtractor={(item) => item.id}
            renderItem={({ item, drag, isActive, getIndex }: RenderItemParams<Exercise>) => {
              const idx = getIndex() || 0;
              return (
                <ScaleDecorator>
                  <TouchableOpacity
                    onLongPress={drag}
                    disabled={isActive}
                    style={[
                      styles.previewCard, 
                      isActive && { backgroundColor: COLORS.bg.tertiary, elevation: 5 }
                    ]}
                  >
                    <View style={styles.previewInfo}>
                      <Text style={styles.previewName}>{idx + 1}. {item.name}</Text>
                      <Text style={styles.previewTime}>{item.duration} sec</Text>
                    </View>
                    <View style={styles.previewActions}>
                      <Text style={styles.actionIcon}>☰</Text>
                      <TouchableOpacity onPress={() => removeExercise(idx)} style={{ marginLeft: SPACING.md }}>
                        <Text style={styles.deleteIcon}>✖</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </ScaleDecorator>
              );
            }}
            ListEmptyComponent={<Text style={styles.errorText}>Add exercises to start!</Text>}
          />
        </GestureHandlerRootView>

        <View style={styles.footer}>
          <Text style={styles.totalTimeText}>Total Time: {totalTime}s</Text>
          {!isValidTime && (
            <Text style={styles.errorText}>
              ⚠️ Habit workouts must be at least {MINIMUM_HABIT_TIME}s to earn XP!
            </Text>
          )}
          <TouchableOpacity 
            style={[styles.primaryButton, !isValidTime && styles.buttonDisabled]} 
            onPress={handleStart}
            disabled={!isValidTime}
          >
            <Text style={styles.primaryButtonText}>Begin Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==========================================
  // RENDER: REST STATE
  // ==========================================
  if (workoutState === 'rest') {
    const nextExercise = exercises[currentIndex + 1];
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeIn} style={styles.restContainer}>
          <Text style={styles.restTitle}>Rest</Text>
          <View style={styles.timerCircle}>
            <Text style={styles.timerText} adjustsFontSizeToFit numberOfLines={1}>
              {timeLeft}
            </Text>
          </View>
          <Text style={styles.nextUpText}>Up Next: {nextExercise.name}</Text>
        </Animated.View>
      </View>
    );
  }

  // ==========================================
  // RENDER: FINISHED STATE
  // ==========================================
  if (workoutState === 'finished') {
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeIn} style={styles.finishedCard}>
          <Text style={styles.emoji}>🦊🎉</Text>
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.subtitle}>
            You just fed {petName} a massive amount of energy! 
            The streak continues.
          </Text>
          <View style={styles.rewardBox}>
            <Text style={styles.rewardText}>+50 XP</Text>
            <Text style={styles.rewardText}>+100 Energy (Full)</Text>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ==========================================
  // RENDER: ACTIVE STATE
  // ==========================================
  return (
    <View style={styles.container}>
      {/* Video Section */}
      <View style={styles.videoContainer}>
        {player ? (
          <VideoView 
            style={styles.video} 
            player={player} 
            allowsFullscreen={false} 
            allowsPictureInPicture={false} 
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <ActivityIndicator color={COLORS.brand.orange} size="large" />
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        <Text style={styles.exerciseName}>{currentExercise.name}</Text>
        
        <View style={styles.timerCircle}>
          <Text style={styles.timerText} adjustsFontSizeToFit numberOfLines={1}>
            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
          </Text>
        </View>

        {/* Dynamic Masterclass Tips */}
        <Animated.View key={tipIndex} entering={SlideInRight} exiting={FadeOut}>
          <Text style={styles.tipText}>💡 {currentExercise.tips[tipIndex]}</Text>
        </Animated.View>

        {/* Progress Dots */}
        <View style={styles.progressContainer}>
          {exercises.map((ex, idx) => (
            <View 
              key={ex.id} 
              style={[
                styles.dot, 
                idx === currentIndex ? styles.dotActive : idx < currentIndex ? styles.dotCompleted : null
              ]} 
            />
          ))}
        </View>
        
        {/* Play / Pause Toggle */}
        <TouchableOpacity 
          style={styles.pauseButton}
          onPress={() => setIsPaused(!isPaused)}
        >
          <Text style={styles.pauseButtonText}>{isPaused ? '▶ Resume' : '⏸ Pause'}</Text>
        </TouchableOpacity>
      </View>
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
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
  },
  listContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  previewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
  },
  previewTime: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    color: COLORS.brand.orange,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  actionIcon: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.secondary,
  },
  disabledIcon: {
    opacity: 0.2,
  },
  deleteIcon: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.state.error,
  },
  footer: {
    padding: SPACING.xl,
    backgroundColor: COLORS.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.bg.accent,
  },
  totalTimeText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.state.error,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Active State
  videoContainer: {
    height: '40%',
    width: '100%',
    backgroundColor: '#000',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brand.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.xl,
  },
  exerciseName: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: COLORS.brand.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  timerText: {
    fontSize: 56,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  tipText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
    textAlign: 'center',
    minHeight: 50,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  pauseButton: {
    backgroundColor: COLORS.bg.tertiary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.md,
  },
  pauseButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginVertical: SPACING.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.bg.accent,
  },
  dotActive: {
    backgroundColor: COLORS.brand.orange,
    transform: [{ scale: 1.3 }],
  },
  dotCompleted: {
    backgroundColor: COLORS.brand.yellow,
  },

  // Rest State
  restContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  restTitle: {
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.yellow,
    marginBottom: SPACING.xl,
  },
  nextUpText: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
    marginTop: SPACING.xl,
  },

  // Finished Screen
  finishedCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emoji: {
    fontSize: 100,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  rewardBox: {
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.brand.yellow,
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.xl,
  },
  rewardText: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.yellow,
    marginVertical: SPACING.xs,
  },
  primaryButton: {
    backgroundColor: COLORS.brand.orange,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
  },
  secondaryButton: {
    padding: SPACING.md,
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.text.secondary,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_500Medium',
  },
});
