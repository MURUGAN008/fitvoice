import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Flame, Dumbbell, Activity, Sparkles, Sprout, Zap, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { useUserStore } from '../../store/userStore';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';
import { FitnessGoal, FitnessLevel, Injury } from '../../types';
import PetAvatar from '../../components/PetAvatar';

// ==========================================
// Custom SVG Egg with premium gradients
// ==========================================
const OnboardingEgg = ({ size = 120 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <SvgLinearGradient id="eggGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFA07A" />
        <Stop offset="50%" stopColor="#FF6B35" />
        <Stop offset="100%" stopColor="#FF4500" />
      </SvgLinearGradient>
    </Defs>
    <Path
      d="M50,12 C28,12 18,45 18,65 C18,81 32,88 50,88 C68,88 82,81 82,65 C82,45 72,12 50,12 Z"
      fill="url(#eggGrad)"
    />
  </Svg>
);

// ==========================================
// Sub-components (Defined OUTSIDE to prevent re-mounting)
// ==========================================

const ProgressBar = ({ step, total }: { step: number; total: number }) => (
  <View style={styles.progressContainer}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={[
          styles.progressDot,
          i < step ? styles.progressDotActive : styles.progressDotInactive,
        ]}
      />
    ))}
  </View>
);

const Step1Intro = ({ onNext }: { onNext: () => void }) => {
  const scale = useSharedValue(0.9);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 1000 }), withTiming(0.9, { duration: 1000 })),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.stepContainer}>
      <Animated.View style={[styles.heroIconWrapper, animatedStyle]}>
        <Flame size={90} color={COLORS.brand.orange} strokeWidth={1.5} />
      </Animated.View>
      <Text style={styles.storyText}>A small flame flickers in the darkness...</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
        <Text style={styles.primaryButtonText}>Touch the flame</Text>
      </TouchableOpacity>
    </View>
  );
};

const Step2Egg = ({ onNext }: { onNext: () => void }) => {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 120 }),
        withTiming(-8, { duration: 120 }),
        withTiming(0, { duration: 120 }),
        withTiming(0, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.stepContainer}>
      <Animated.View style={[styles.heroIconWrapper, animatedStyle]}>
        <OnboardingEgg />
      </Animated.View>
      <Text style={styles.storyText}>The flame reveals something waiting for you...</Text>
      <Text style={styles.subStoryText}>It's been waiting for someone like you.</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
        <Text style={styles.primaryButtonText}>Touch the egg</Text>
      </TouchableOpacity>
    </View>
  );
};

const Step3Hatch = ({ onNext }: { onNext: () => void }) => {
  const { onboardingData, updateOnboarding } = useUserStore();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.avatarOnboardingWrapper}>
        <PetAvatar size={150} mood="happy" level={1} showGlow={true} />
      </View>
      <Text style={styles.storyText}>A little fox is born!</Text>
      <Text style={styles.subStoryText}>It looks up at you with curious eyes.</Text>
      
      <Text style={styles.label}>What will you name it?</Text>
      <TextInput
        style={styles.input}
        value={onboardingData.pet_name}
        onChangeText={(text) => updateOnboarding({ pet_name: text })}
        placeholder="Blaze"
        placeholderTextColor={COLORS.text.tertiary}
      />
      <TouchableOpacity 
        style={[styles.primaryButton, !onboardingData.pet_name && styles.buttonDisabled]} 
        onPress={onNext}
        disabled={!onboardingData.pet_name}
      >
        <Text style={styles.primaryButtonText}>That's perfect</Text>
      </TouchableOpacity>
    </View>
  );
};

const Step4User = ({ onNext }: { onNext: () => void }) => {
  const { onboardingData, updateOnboarding } = useUserStore();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.avatarOnboardingWrapper}>
        <PetAvatar size={150} mood="idle" level={1} showGlow={false} />
      </View>
      <Text style={styles.storyText}>{onboardingData.pet_name} wonders...</Text>
      <Text style={styles.subStoryText}>What kind of companion are you?</Text>
      
      <Text style={styles.label}>Tell me your name</Text>
      <TextInput
        style={styles.input}
        value={onboardingData.name}
        onChangeText={(text) => updateOnboarding({ name: text })}
        placeholder="Your name"
        placeholderTextColor={COLORS.text.tertiary}
      />
      <TouchableOpacity 
        style={[styles.primaryButton, !onboardingData.name && styles.buttonDisabled]} 
        onPress={onNext}
        disabled={!onboardingData.name}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const Step5Bond = ({ onNext }: { onNext: () => void }) => {
  const { onboardingData } = useUserStore();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.avatarOnboardingWrapper}>
        <PetAvatar size={150} mood="happy" level={1} showGlow={true} />
      </View>
      <Text style={styles.storyText}>{onboardingData.pet_name} seems to like you!</Text>
      <Text style={styles.subStoryText}>
        {onboardingData.pet_name} grows when YOU move. Your workouts fuel its energy.
        Together, you'll both grow stronger!
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
        <Text style={styles.primaryButtonText}>Let's grow!</Text>
      </TouchableOpacity>
    </View>
  );
};

const Step6Goal = ({ onNext }: { onNext: () => void }) => {
  const { onboardingData, updateOnboarding } = useUserStore();
  const goals = [
    { id: 'lose_weight' as FitnessGoal, title: 'Burn & Shred', icon: Flame, desc: 'Lose weight' },
    { id: 'build_muscle' as FitnessGoal, title: 'Build & Grow', icon: Dumbbell, desc: 'Build muscle' },
    { id: 'stay_active' as FitnessGoal, title: 'Move & Thrive', icon: Activity, desc: 'Stay active' },
    { id: 'flexibility' as FitnessGoal, title: 'Stretch & Flow', icon: Sprout, desc: 'Flexibility' },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.storyText}>{onboardingData.pet_name} wants to know what adventure you're on.</Text>
      <View style={styles.optionsContainer}>
        {goals.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[
              styles.optionCard,
              onboardingData.goal === g.id && styles.optionCardActive,
            ]}
            onPress={() => updateOnboarding({ goal: g.id })}
          >
            <View style={styles.optionIconContainer}>
              <g.icon size={28} color={onboardingData.goal === g.id ? COLORS.brand.orange : COLORS.text.secondary} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>{g.title}</Text>
              <Text style={styles.optionDesc}>{g.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity 
        style={[styles.primaryButton, !onboardingData.goal && styles.buttonDisabled]} 
        onPress={onNext}
        disabled={!onboardingData.goal}
      >
        <Text style={styles.primaryButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const Step7Level = ({ onNext }: { onNext: () => void }) => {
  const { onboardingData, updateOnboarding } = useUserStore();
  const levels = [
    { id: 'beginner' as FitnessLevel, title: 'Just starting out', icon: Sprout, desc: 'New to working out' },
    { id: 'intermediate' as FitnessLevel, title: 'Somewhat active', icon: Zap, desc: '1-3x per week' },
    { id: 'advanced' as FitnessLevel, title: 'Very active', icon: Flame, desc: '4+ times per week' },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.avatarOnboardingWrapper}>
        <PetAvatar size={120} mood="idle" level={1} showGlow={false} />
      </View>
      <Text style={styles.storyText}>How active are you right now?</Text>
      <View style={styles.optionsContainer}>
        {levels.map((l) => (
          <TouchableOpacity
            key={l.id}
            style={[
              styles.optionCard,
              onboardingData.fitness_level === l.id && styles.optionCardActive,
            ]}
            onPress={() => updateOnboarding({ fitness_level: l.id })}
          >
            <View style={styles.optionIconContainer}>
              <l.icon size={28} color={onboardingData.fitness_level === l.id ? COLORS.brand.orange : COLORS.text.secondary} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>{l.title}</Text>
              <Text style={styles.optionDesc}>{l.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity 
        style={[styles.primaryButton, !onboardingData.fitness_level && styles.buttonDisabled]} 
        onPress={onNext}
        disabled={!onboardingData.fitness_level}
      >
        <Text style={styles.primaryButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const Step8Stats = ({ onNext }: { onNext: () => void }) => {
  const { onboardingData, updateOnboarding } = useUserStore();
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.storyText}>Help {onboardingData.pet_name} understand you better.</Text>
      <Text style={styles.subStoryText}>Used for calorie calculation and scaling.</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Age (years)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={onboardingData.age ? String(onboardingData.age) : ''}
          onChangeText={(text) => updateOnboarding({ age: parseInt(text) || null })}
          placeholder="e.g. 25"
          placeholderTextColor={COLORS.text.tertiary}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={onboardingData.height_cm ? String(onboardingData.height_cm) : ''}
          onChangeText={(text) => updateOnboarding({ height_cm: parseInt(text) || null })}
          placeholder="e.g. 175"
          placeholderTextColor={COLORS.text.tertiary}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={onboardingData.weight_kg ? String(onboardingData.weight_kg) : ''}
          onChangeText={(text) => updateOnboarding({ weight_kg: parseInt(text) || null })}
          placeholder="e.g. 70"
          placeholderTextColor={COLORS.text.tertiary}
        />
      </View>

      <TouchableOpacity 
        style={[styles.primaryButton, (!onboardingData.age || !onboardingData.height_cm || !onboardingData.weight_kg) && styles.buttonDisabled]} 
        onPress={onNext}
        disabled={!onboardingData.age || !onboardingData.height_cm || !onboardingData.weight_kg}
      >
        <Text style={styles.primaryButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const Step9Availability = ({ onNext }: { onNext: () => void }) => {
  const { onboardingData, updateOnboarding } = useUserStore();
  
  const DAYS = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 0, label: 'Sun' },
  ];

  const toggleDay = (dayId: number) => {
    const currentDays = onboardingData.workout_days || [];
    if (currentDays.includes(dayId)) {
      updateOnboarding({ workout_days: currentDays.filter(d => d !== dayId) });
    } else {
      updateOnboarding({ workout_days: [...currentDays, dayId] });
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.storyText}>Which days will you train with {onboardingData.pet_name}?</Text>
      <Text style={styles.subStoryText}>We'll remind you on these days to keep the streak alive!</Text>
      
      <Text style={styles.label}>Select your schedule:</Text>
      <View style={styles.chipContainer}>
        {DAYS.map(day => {
          const isActive = onboardingData.workout_days?.includes(day.id);
          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => toggleDay(day.id)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{day.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: SPACING.lg }]}>Session duration: {onboardingData.session_duration_mins} min</Text>
      <View style={styles.rowOptions}>
        {[10, 15, 20, 30, 45].map(mins => (
          <TouchableOpacity
            key={mins}
            style={[styles.bubbleOption, onboardingData.session_duration_mins === mins && styles.bubbleOptionActive]}
            onPress={() => updateOnboarding({ session_duration_mins: mins })}
          >
            <Text style={[styles.bubbleText, onboardingData.session_duration_mins === mins && styles.bubbleTextActive]}>{mins}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.primaryButton, (!onboardingData.workout_days || onboardingData.workout_days.length === 0) && styles.buttonDisabled]} 
        onPress={onNext}
        disabled={!onboardingData.workout_days || onboardingData.workout_days.length === 0}
      >
        <Text style={styles.primaryButtonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

const Step10Injuries = ({ onNext }: { onNext: () => void }) => {
  const { onboardingData, updateOnboarding } = useUserStore();
  const injuriesList: { id: Injury; title: string }[] = [
    { id: 'knee', title: 'Knee problems' },
    { id: 'lower_back', title: 'Lower back pain' },
    { id: 'shoulder', title: 'Shoulder injury' },
    { id: 'wrist', title: 'Wrist issues' },
    { id: 'neck', title: 'Neck problems' },
  ];

  const toggleInjury = (injury: Injury) => {
    const current = onboardingData.injuries || [];
    if (current.includes(injury)) {
      updateOnboarding({ injuries: current.filter(i => i !== injury) });
    } else {
      updateOnboarding({ injuries: [...current, injury] });
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.storyText}>Anything {onboardingData.pet_name} should be careful about?</Text>
      <Text style={styles.subStoryText}>We'll adjust your plan to be safe.</Text>
      
      <View style={styles.chipContainer}>
        {injuriesList.map(injury => {
          const isActive = onboardingData.injuries?.includes(injury.id);
          return (
            <TouchableOpacity
              key={injury.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => toggleInjury(injury.id)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {injury.title}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.chip, onboardingData.injuries?.length === 0 && styles.chipActive]}
          onPress={() => updateOnboarding({ injuries: [] })}
        >
          <Text style={[styles.chipText, onboardingData.injuries?.length === 0 && styles.chipTextActive]}>
            None of these
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
          <Text style={styles.primaryButtonText}>Create My Plan</Text>
          <ArrowRight size={20} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const Step11Loading = ({ onNext }: { onNext: () => void }) => {
  const { onboardingData } = useUserStore();
  const [statusIndex, setStatusIndex] = useState(0);
  const statuses = [
    "Analyzing your goals...",
    "Selecting exercises...",
    "Building your week...",
    "Ready!"
  ];

  useEffect(() => {
    if (statusIndex < statuses.length - 1) {
      const timer = setTimeout(() => setStatusIndex(statusIndex + 1), 1200);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => onNext(), 800);
      return () => clearTimeout(timer);
    }
  }, [statusIndex]);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.avatarOnboardingWrapper}>
        <PetAvatar size={120} mood="idle" level={1} showGlow={true} />
      </View>
      <Text style={styles.storyText}>{onboardingData.pet_name} is crafting your perfect training plan...</Text>
      
      <View style={styles.loadingList}>
        {statuses.map((s, i) => {
          let statusIcon = null;
          if (i < statusIndex) {
            statusIcon = <CheckCircle2 size={18} color="#4CAF50" />;
          } else if (i === statusIndex) {
            statusIcon = <Activity size={18} color={COLORS.brand.orange} />;
          } else {
            statusIcon = <View style={styles.loadingDotPlaceholder} />;
          }
          return (
            <Animated.View 
              key={i} 
              entering={FadeIn}
              style={[
                styles.loadingItemContainer, 
                i > statusIndex && { opacity: 0.3 }
              ]}
            >
              {statusIcon}
              <Text style={styles.loadingItemText}>{s}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const DAY_NAMES: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

const Step12Done = () => {
  const { onboardingData } = useUserStore();
  const workoutDays = (onboardingData.workout_days || []).slice().sort((a, b) => a - b);
  return (
    <View style={styles.stepContainer}>
      <View style={styles.avatarOnboardingWrapper}>
        <PetAvatar size={150} mood="happy" level={1} showGlow={true} />
      </View>
      <Text style={styles.storyText}>Your plan is ready!</Text>
      
      <View style={styles.planCard}>
        {workoutDays.map((day) => (
          <Text key={day} style={styles.planDay}>
            {DAY_NAMES[day] || `Day ${day}`}: Workout ({onboardingData.session_duration_mins} min)
          </Text>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => {
        useUserStore.getState().setIsOnboarded(true);
        router.replace('/workout');
      }}>
        <Text style={styles.primaryButtonText}>Start First Workout (2 min)</Text>
        <Text style={styles.primaryButtonSubText}>Give {onboardingData.pet_name} first energy!</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => {
        useUserStore.getState().setIsOnboarded(true);
        router.replace('/(tabs)');
      }}>
        <Text style={styles.secondaryButtonText}>Explore the app first</Text>
      </TouchableOpacity>
    </View>
  );
};

// ==========================================
// Main Screen
// ==========================================

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const totalSteps = 12;

  const { setIsOnboarded } = useUserStore();

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  // Render the current step component
  const renderStep = () => {
    switch (step) {
      case 1: return <Step1Intro onNext={handleNext} />;
      case 2: return <Step2Egg onNext={handleNext} />;
      case 3: return <Step3Hatch onNext={handleNext} />;
      case 4: return <Step4User onNext={handleNext} />;
      case 5: return <Step5Bond onNext={handleNext} />;
      case 6: return <Step6Goal onNext={handleNext} />;
      case 7: return <Step7Level onNext={handleNext} />;
      case 8: return <Step8Stats onNext={handleNext} />;
      case 9: return <Step9Availability onNext={handleNext} />;
      case 10: return <Step10Injuries onNext={handleNext} />;
      case 11: return <Step11Loading onNext={handleNext} />;
      case 12: return <Step12Done />;
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {step > 5 && step < 11 && <ProgressBar step={step - 5} total={5} />}

          {/* SINGLE Animated wrapper for transitions */}
          <Animated.View key={step} entering={FadeIn.duration(400)} style={styles.animatedWrapper}>
            {renderStep()}
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  animatedWrapper: { flex: 1 },
  progressContainer: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.xl, justifyContent: 'center' },
  progressDot: { height: 6, flex: 1, borderRadius: 3, backgroundColor: COLORS.bg.tertiary },
  progressDotActive: { backgroundColor: COLORS.brand.orange },
  progressDotInactive: { backgroundColor: COLORS.bg.accent },
  stepContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroEmoji: { fontSize: 80, marginBottom: SPACING.lg, textAlign: 'center' },
  storyText: { fontSize: FONT_SIZE.xl, fontFamily: 'Inter_700Bold', color: COLORS.text.primary, textAlign: 'center', marginBottom: SPACING.md },
  subStoryText: { fontSize: FONT_SIZE.md, fontFamily: 'Inter_400Regular', color: COLORS.text.secondary, textAlign: 'center', marginBottom: SPACING.xl },
  formGroup: { width: '100%', marginBottom: SPACING.md },
  label: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_500Medium', color: COLORS.text.secondary, marginBottom: SPACING.xs, alignSelf: 'flex-start' },
  input: { width: '100%', backgroundColor: COLORS.bg.secondary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, fontSize: FONT_SIZE.md, fontFamily: 'Inter_400Regular', color: COLORS.text.primary, borderWidth: 1, borderColor: COLORS.bg.accent, marginBottom: SPACING.xl },
  primaryButton: { width: '100%', backgroundColor: COLORS.brand.orange, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md },
  primaryButtonText: { fontSize: FONT_SIZE.lg, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  primaryButtonSubText: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_400Regular', color: '#fff', opacity: 0.8, marginTop: 4 },
  secondaryButton: { width: '100%', padding: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  secondaryButtonText: { fontSize: FONT_SIZE.md, fontFamily: 'Inter_500Medium', color: COLORS.text.secondary },
  buttonDisabled: { opacity: 0.5 },
  optionsContainer: { width: '100%', gap: SPACING.sm, marginBottom: SPACING.xl },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.secondary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, borderWidth: 2, borderColor: 'transparent' },
  optionCardActive: { borderColor: COLORS.brand.orange, backgroundColor: COLORS.bg.tertiary },
  optionIconContainer: { marginRight: SPACING.md, justifyContent: 'center', alignItems: 'center', width: 40, height: 40 },
  optionTextContainer: { flex: 1 },
  optionTitle: { fontSize: FONT_SIZE.md, fontFamily: 'Inter_600SemiBold', color: COLORS.text.primary },
  optionDesc: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_400Regular', color: COLORS.text.secondary, marginTop: 2 },
  rowOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  bubbleOption: { backgroundColor: COLORS.bg.secondary, borderRadius: BORDER_RADIUS.full, width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  bubbleOptionActive: { borderColor: COLORS.brand.orange, backgroundColor: COLORS.bg.tertiary },
  bubbleText: { fontSize: FONT_SIZE.md, fontFamily: 'Inter_600SemiBold', color: COLORS.text.secondary },
  bubbleTextActive: { color: COLORS.brand.orange },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl, justifyContent: 'center' },
  chip: { backgroundColor: COLORS.bg.secondary, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.bg.accent },
  chipActive: { backgroundColor: COLORS.brand.orange, borderColor: COLORS.brand.orange },
  chipText: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_500Medium', color: COLORS.text.secondary },
  chipTextActive: { color: '#fff' },
  loadingList: { width: '100%', marginTop: SPACING.xl, gap: SPACING.md, paddingHorizontal: SPACING.xl },
  loadingItemContainer: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  loadingItemText: { fontSize: FONT_SIZE.md, fontFamily: 'Inter_500Medium', color: COLORS.text.primary },
  loadingDotPlaceholder: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.bg.accent },
  planCard: { width: '100%', backgroundColor: COLORS.bg.secondary, borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.bg.accent },
  planDay: { fontSize: FONT_SIZE.md, fontFamily: 'Inter_500Medium', color: COLORS.text.primary },
  heroIconWrapper: { marginVertical: SPACING.xl, alignItems: 'center', justifyContent: 'center' },
  avatarOnboardingWrapper: { marginVertical: SPACING.md, alignItems: 'center', justifyContent: 'center' },
});
