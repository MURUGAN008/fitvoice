import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image, TextInput } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, CARD_SHADOW } from '../../constants/theme';
import GradientHeader from '../../components/GradientHeader';
import { PLAN_IMAGES, EXERCISE_IMAGES } from '../../constants/images';
import { useUserStore } from '../../store/userStore';
import AnimatedCard from '../../components/AnimatedCard';

type Tab = 'presets' | 'movements';

type PresetItem = {
  id: string;
  name: string;
  desc: string;
  duration: string;
  exercisesCount: number;
  icon: string;
  bg: string;
};

type ExerciseItem = {
  id: string;
  name: string;
  targetMuscles: string[];
  tips: string[];
  commonMistakes: string[];
  difficulty: number;
  icon: string;
};

const PRESETS: PresetItem[] = [
  { id: 'full_body', name: '20-Min Full Body', desc: 'A rigorous full body routine to build strength and push your heart rate.', duration: '20 mins', exercisesCount: 5, icon: '🔥', bg: COLORS.brand.orange },
  { id: 'core', name: '10-Min Core Burn', desc: 'Target your rectus abdominis, obliques, and stabilizer muscles.', duration: '10 mins', exercisesCount: 4, icon: '⚡', bg: COLORS.brand.yellow },
  { id: 'lower_body', name: '15-Min Lower Body', desc: 'Develop explosive leg power and core stabilization.', duration: '15 mins', exercisesCount: 4, icon: '🦵', bg: COLORS.bg.tertiary },
  { id: 'upper_body', name: '15-Min Upper Body', desc: 'Focus on chest, triceps, shoulders, and postural back muscles.', duration: '15 mins', exercisesCount: 4, icon: '💪', bg: COLORS.bg.tertiary },
];

export const MOVEMENTS: ExerciseItem[] = [
  { id: '1', name: 'Squats', icon: '🏋️', targetMuscles: ['Glutes', 'Quads', 'Hamstrings'], difficulty: 1.0, tips: ['Keep chest up and look forward.', 'Drive through heels.', 'Don\'t let knees cave in!'], commonMistakes: ['Knees caving inward', 'Rounding the lower back'] },
  { id: '2', name: 'Standard Push-Up', icon: '💪', targetMuscles: ['Chest', 'Triceps', 'Shoulders', 'Core'], difficulty: 1.5, tips: ['Keep core completely tight.', 'Elbows at 45-degree angle.', 'Go all the way down and up.'], commonMistakes: ['Flaring elbows wide', 'Sagging hips'] },
  { id: '3', name: 'Reverse Lunge', icon: '🏃', targetMuscles: ['Quads', 'Glutes', 'Hamstrings'], difficulty: 1.2, tips: ['Front knee directly above ankle.', 'Lower back knee almost to ground.', 'Keep chest proud.'], commonMistakes: ['Front knee way past toes', 'Shallow lunging'] },
  { id: '4', name: 'Forearm Plank', icon: '🧘', targetMuscles: ['Core', 'Shoulders'], difficulty: 1.0, tips: ['Keep back completely flat.', 'Don\'t let hips sag.', 'Breathe deep into stomach.'], commonMistakes: ['Hips sagging low', 'Looking straight up'] },
  { id: '5', name: 'Bicycle Twisting Crunch', icon: '🚴', targetMuscles: ['Core', 'Abs', 'Obliques'], difficulty: 1.5, tips: ['Bring elbow to opposite knee.', 'Keep shoulder blades off ground.', 'Focus on core twist.'], commonMistakes: ['Pulling on neck with hands', 'Moving too fast without control'] },
  { id: '6', name: 'Bulgarian Split Squat', icon: '🪑', targetMuscles: ['Quads', 'Glutes', 'Hamstrings'], difficulty: 1.8, tips: ['Elevate back foot on chair.', 'Keep torso upright.', 'Drive through front heel.'], commonMistakes: ['Front knee passing past toes', 'Losing balance'] },
  { id: '7', name: 'Burpees', icon: '💨', targetMuscles: ['Full Body', 'Cardio', 'Chest'], difficulty: 2.0, tips: ['Jump high at the top.', 'Keep core tight in plank.', 'Breathe continuously.'], commonMistakes: ['Sagging lower back in plank', 'Landing heavy on flat feet'] },
  { id: '8', name: 'Chair Dips', icon: '🪟', targetMuscles: ['Triceps', 'Shoulders', 'Chest'], difficulty: 1.3, tips: ['Keep back close to the chair.', 'Bend elbows to 90 degrees.', 'Keep shoulders down.'], commonMistakes: ['Elbows flaring too wide', 'Shrugging shoulders'] },
  { id: '9', name: 'Glute Bridge', icon: '🌉', targetMuscles: ['Glutes', 'Hamstrings', 'Lower Back'], difficulty: 1.0, tips: ['Squeeze glutes at the top.', 'Drive through heels.', 'Keep knees parallel.'], commonMistakes: ['Arching lower back too much', 'Not lifting hips high enough'] },
  { id: '10', name: 'Hollow Body Hold', icon: '💡', targetMuscles: ['Core', 'Abs'], difficulty: 1.6, tips: ['Press lower back flat into floor.', 'Extend arms and legs.', 'Keep shoulders off ground.'], commonMistakes: ['Lower back arching off floor', 'Holding breath'] },
  { id: '11', name: 'Jumping Jacks', icon: '✨', targetMuscles: ['Cardio', 'Calves', 'Shoulders'], difficulty: 1.0, tips: ['Land softly on balls of feet.', 'Clap hands fully above head.', 'Keep a steady rhythm.'], commonMistakes: ['Landing with stiff knees', 'Incomplete arm ranges'] },
  { id: '12', name: 'Jumping Squats', icon: '💥', targetMuscles: ['Quads', 'Glutes', 'Cardio'], difficulty: 1.7, tips: ['Land softly and absorb impact.', 'Explode upwards dynamically.', 'Use arms for momentum.'], commonMistakes: ['Knees caving in on landing', 'Landing on flat feet'] },
  { id: '13', name: 'Mountain Climbers', icon: '🏔️', targetMuscles: ['Core', 'Cardio', 'Shoulders'], difficulty: 1.4, tips: ['Drive knees to chest rapidly.', 'Keep hips low and core locked.', 'Distribute weight evenly.'], commonMistakes: ['Hips bouncing too high', 'Slipping hands forward'] },
  { id: '14', name: 'Pike Push-Up', icon: '⛰️', targetMuscles: ['Shoulders', 'Triceps', 'Upper Back'], difficulty: 1.7, tips: ['Look at your toes.', 'Lower crown of head to floor.', 'Keep hips high in inverted V.'], commonMistakes: ['Flaring elbows wide', 'Losing the pike shape'] },
  { id: '15', name: 'Superman Raises', icon: '🦸', targetMuscles: ['Lower Back', 'Glutes', 'Hamstrings'], difficulty: 1.2, tips: ['Lift arms/legs simultaneously.', 'Hold for 1 sec at top.', 'Look down to protect neck.'], commonMistakes: ['Overextending or jerking neck', 'Bending knees instead of lifting thighs'] },
];

export default function WorkoutLibraryScreen() {
  const { toggleFavorite, favoriteExercises, getLastPerformance, savedCustomWorkouts, deleteCustomWorkout } = useUserStore();
  const [activeTab, setActiveTab] = useState<Tab>('presets');
  const [selectedEx, setSelectedEx] = useState<ExerciseItem | null>(null);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'difficulty'>('name');

  // Custom Workout
  const [selectedForCustom, setSelectedForCustom] = useState<string[]>([]);

  const startPreset = (presetId: string) => {
    router.push({ pathname: '/workout', params: { preset: presetId } });
  };

  const startCustomPlan = (customPlanId: string) => {
    router.push({ pathname: '/workout', params: { custom_plan_id: customPlanId } });
  };

  const startCustomSelection = () => {
    router.push({ pathname: '/workout', params: { custom_ids: selectedForCustom.join(',') } });
    setSelectedForCustom([]);
  };

  const toggleCustomSelection = (id: string) => {
    setSelectedForCustom(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredMovements = useMemo(() => {
    let filtered = MOVEMENTS.filter(m => m.id !== 'rest' && m.name.toLowerCase() !== 'rest');
    if (searchQuery) {
      filtered = filtered.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (muscleFilter) {
      filtered = filtered.filter(m => m.targetMuscles.includes(muscleFilter));
    }
    if (difficultyFilter) {
      if (difficultyFilter === 'Easy') filtered = filtered.filter(m => m.difficulty <= 1.2);
      if (difficultyFilter === 'Medium') filtered = filtered.filter(m => m.difficulty > 1.2 && m.difficulty <= 1.6);
      if (difficultyFilter === 'Hard') filtered = filtered.filter(m => m.difficulty > 1.6);
    }
    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'difficulty') return b.difficulty - a.difficulty;
      return 0;
    });
    return filtered;
  }, [searchQuery, muscleFilter, difficultyFilter, sortBy]);

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Workout Library"
        subtitle="Discover and customize training programs"
      />

      {/* Segment Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'presets' && styles.tabButtonActive]}
          onPress={() => setActiveTab('presets')}
        >
          <Text style={[styles.tabText, activeTab === 'presets' && styles.tabTextActive]}>Workout Presets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'movements' && styles.tabButtonActive]}
          onPress={() => setActiveTab('movements')}
        >
          <Text style={[styles.tabText, activeTab === 'movements' && styles.tabTextActive]}>Movements Dictionary</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'presets' ? (
          <Animated.View entering={FadeIn} style={styles.presetsList}>
            <TouchableOpacity 
              style={styles.buildCustomBtn} 
              onPress={() => router.push('/build-workout')}
            >
              <Text style={styles.buildCustomBtnText}>+ Build Custom Workout</Text>
              <Text style={styles.buildCustomBtnSub}>Drag & drop to build your own routine</Text>
            </TouchableOpacity>

            {savedCustomWorkouts.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionHeader}>My Custom Workouts</Text>
                {savedCustomWorkouts.map((w) => (
                  <AnimatedCard key={w.id} style={styles.presetCard} onPress={() => startCustomPlan(w.id)}>
                    <View style={styles.presetInfo}>
                      <View style={styles.presetHeaderRow}>
                        <Text style={styles.presetName}>{w.name}</Text>
                        <TouchableOpacity onPress={() => deleteCustomWorkout(w.id)}>
                          <Text style={{ color: COLORS.state.error, fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.presetDesc}>
                        {w.exercises.length} Exercises • Custom Time
                      </Text>
                    </View>
                  </AnimatedCard>
                ))}
              </View>
            )}

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeader}>Official Presets</Text>
            </View>
            {PRESETS.map((p) => (
              <AnimatedCard key={p.id} style={styles.presetCard} onPress={() => startPreset(p.id)}>
                <Image
                  source={PLAN_IMAGES[p.id]}
                  style={styles.presetImage}
                />
                <View style={styles.presetInfo}>
                  <View style={styles.presetHeaderRow}>
                    <Text style={styles.presetName}>{p.name}</Text>
                    <Text style={styles.presetDuration}>{p.duration}</Text>
                  </View>
                  <Text style={styles.presetDesc}>{p.desc}</Text>
                  <Text style={styles.presetMeta}>{p.exercisesCount} Exercises</Text>
                </View>
              </AnimatedCard>
            ))}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} style={styles.movementsTabContainer}>
            {/* Search and Filters */}
            <View style={styles.filtersContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                placeholderTextColor={COLORS.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity onPress={() => setMuscleFilter(null)} style={[styles.filterChip, !muscleFilter && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, !muscleFilter && styles.filterChipTextActive]}>All Muscles</Text>
                </TouchableOpacity>
                {['Core', 'Quads', 'Glutes', 'Chest', 'Shoulders', 'Cardio'].map(m => (
                  <TouchableOpacity key={m} onPress={() => setMuscleFilter(m)} style={[styles.filterChip, muscleFilter === m && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, muscleFilter === m && styles.filterChipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity onPress={() => setDifficultyFilter(null)} style={[styles.filterChip, !difficultyFilter && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, !difficultyFilter && styles.filterChipTextActive]}>Any Difficulty</Text>
                </TouchableOpacity>
                {['Easy', 'Medium', 'Hard'].map(d => (
                  <TouchableOpacity key={d} onPress={() => setDifficultyFilter(d)} style={[styles.filterChip, difficultyFilter === d && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, difficultyFilter === d && styles.filterChipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>Sort by:</Text>
                <TouchableOpacity onPress={() => setSortBy('name')} style={[styles.sortBtn, sortBy === 'name' && styles.sortBtnActive]}>
                  <Text style={[styles.sortBtnText, sortBy === 'name' && styles.sortBtnTextActive]}>Name</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSortBy('difficulty')} style={[styles.sortBtn, sortBy === 'difficulty' && styles.sortBtnActive]}>
                  <Text style={[styles.sortBtnText, sortBy === 'difficulty' && styles.sortBtnTextActive]}>Difficulty</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.movementsGrid}>
              {filteredMovements.map((m) => {
                const isSelected = selectedForCustom.includes(m.id);
                const isFav = favoriteExercises.includes(m.id);
                const lastPerf = getLastPerformance(m.name.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                
                return (
                  <AnimatedCard key={m.id} style={[styles.movementCard, isSelected && styles.movementCardSelected]} onPress={() => setSelectedEx(m)}>
                    <TouchableOpacity 
                      style={styles.favoriteButton}
                      onPress={() => toggleFavorite(m.id)}
                    >
                      <Text style={styles.favoriteIcon}>{isFav ? '❤️' : '🤍'}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.selectButton, isSelected && styles.selectButtonActive]}
                      onPress={() => toggleCustomSelection(m.id)}
                    >
                      <Text style={styles.selectButtonText}>{isSelected ? '✓' : '+'}</Text>
                    </TouchableOpacity>

                    <Image
                      source={EXERCISE_IMAGES[m.id]}
                      style={styles.movementImage}
                    />
                    <Text style={styles.movementName} numberOfLines={1}>{m.name}</Text>
                    <Text style={styles.movementTarget} numberOfLines={1}>🎯 {m.targetMuscles[0]}</Text>
                    <View style={styles.xpLabel}>
                      <Text style={styles.xpText}>{m.difficulty}x XP</Text>
                    </View>
                    
                    {lastPerf && (
                      <Text style={styles.lastPerfText}>Last: {new Date(lastPerf.completedAt).toLocaleDateString()}</Text>
                    )}
                  </AnimatedCard>
                );
              })}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Movement Detail Modal */}
      {selectedEx && (
        <Modal transparent animationType="fade" visible={selectedEx !== null} onRequestClose={() => setSelectedEx(null)}>
          <View style={styles.modalOverlay}>
            <Animated.View entering={SlideInRight} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <Image
                    source={EXERCISE_IMAGES[selectedEx.id]}
                    style={styles.modalImage}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedEx.name}</Text>
                    <Text style={styles.modalSubtitle}>Difficulty Multiplier: {selectedEx.difficulty}x XP</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedEx(null)}>
                  <Text style={styles.modalCloseText}>✖</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>🎯 Target Muscles</Text>
                  <View style={styles.chipContainer}>
                    {selectedEx.targetMuscles.map(m => (
                      <View key={m} style={styles.chip}>
                        <Text style={styles.chipText}>{m}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>💡 Pro Tips</Text>
                  {selectedEx.tips.map((tip, idx) => (
                    <Text key={idx} style={styles.tipText}>• {tip}</Text>
                  ))}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>⚠️ Common Mistakes</Text>
                  {selectedEx.commonMistakes.map((mistake, idx) => (
                    <Text key={idx} style={styles.mistakeText}>• {mistake}</Text>
                  ))}
                </View>
              </ScrollView>

                <TouchableOpacity style={styles.modalPrimaryButton} onPress={() => setSelectedEx(null)}>
                  <Text style={styles.modalPrimaryButtonText}>Done</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>
        )}

        {/* Custom Workout FAB */}
        {selectedForCustom.length > 0 && activeTab === 'movements' && (
          <Animated.View entering={SlideInRight} style={styles.fabContainer}>
            {selectedForCustom.length > 0 && (
              <TouchableOpacity style={styles.fabButton} onPress={startCustomSelection}>
                <Text style={styles.fabText}>
                  Start Custom Session ({selectedForCustom.length})
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  tabButtonActive: {
    backgroundColor: COLORS.bg.tertiary,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  tabText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
  },
  tabTextActive: {
    color: COLORS.brand.orange,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  
  // Presets List
  presetsList: {
    gap: SPACING.md,
  },
  buildCustomBtn: {
    backgroundColor: COLORS.brand.orange,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  buildCustomBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
  },
  buildCustomBtnSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  sectionBlock: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    color: COLORS.text.secondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
    marginLeft: SPACING.xs,
  },
  presetCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    gap: SPACING.md,
    ...CARD_SHADOW,
  },
  presetImage: {
    width: 70,
    height: 70,
    borderRadius: BORDER_RADIUS.md,
  },
  presetInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  presetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  presetName: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  presetDuration: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.brand.orange,
  },
  presetDesc: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  presetMeta: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.tertiary,
  },

  // Movements Grid
  movementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  movementCard: {
    width: '47%',
    backgroundColor: COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  movementImage: {
    width: '100%',
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  movementName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
    marginBottom: 2,
    textAlign: 'center',
  },
  movementTarget: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  xpLabel: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
  },
  xpText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.brand.orange,
  },
  lastPerfText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    zIndex: 10,
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 16,
  },
  selectButton: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  selectButtonActive: {
    backgroundColor: COLORS.brand.orange,
    borderColor: COLORS.brand.orange,
  },
  selectButtonText: {
    color: COLORS.text.primary,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  movementCardSelected: {
    borderColor: COLORS.brand.orange,
    borderWidth: 2,
  },

  // Filters & Search
  movementsTabContainer: {
    flex: 1,
  },
  filtersContainer: {
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  searchInput: {
    backgroundColor: COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text.primary,
    fontFamily: 'Inter_400Regular',
    fontSize: FONT_SIZE.sm,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: COLORS.bg.secondary,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.brand.orange,
    borderColor: COLORS.brand.orange,
  },
  filterChipText: {
    color: COLORS.text.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: FONT_SIZE.xs,
  },
  filterChipTextActive: {
    color: COLORS.bg.primary,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  sortLabel: {
    color: COLORS.text.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: FONT_SIZE.xs,
  },
  sortBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  sortBtnActive: {
    backgroundColor: COLORS.bg.tertiary,
  },
  sortBtnText: {
    color: COLORS.text.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: FONT_SIZE.xs,
  },
  sortBtnTextActive: {
    color: COLORS.text.primary,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  fabButton: {
    backgroundColor: COLORS.brand.orange,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    ...CARD_SHADOW,
  },
  fabText: {
    color: COLORS.text.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: FONT_SIZE.md,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    maxHeight: '80%',
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
    paddingBottom: SPACING.md,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  modalImage: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    color: COLORS.brand.orange,
  },
  modalCloseText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.secondary,
  },
  modalScroll: {
    marginBottom: SPACING.lg,
  },
  modalSection: {
    marginBottom: SPACING.lg,
  },
  modalSectionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.bg.tertiary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
  },
  tipText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  mistakeText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    color: COLORS.state.error,
    lineHeight: 20,
    marginBottom: 4,
  },
  modalPrimaryButton: {
    backgroundColor: COLORS.brand.orange,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.bg.primary,
  },
});
