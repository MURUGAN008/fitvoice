import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GripVertical,
  Trophy,
  Minus,
  Plus,
  RefreshCw,
  Shuffle,
  AlertTriangle,
  X,
  Target,
  SkipForward,
  Zap,
  Coins,
  Heart,
  Flame,
  Frown,
  Meh,
  Smile,
  Dumbbell,
  Music,
  HelpCircle,
  Lightbulb,
  Play,
  Pause,
  Volume2,
  Moon
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, CARD_SHADOW } from '../constants/theme';
import { useUserStore } from '../store/userStore';
import CircularTimer from '../components/CircularTimer';
import PetAvatar from '../components/PetAvatar';
import { EXERCISE_IMAGES } from '../constants/images';
import StrokeText from '../components/StrokeText';
import ConfettiBlast from '../components/ConfettiBlast';
import { voiceCoach } from '../lib/voiceCoach';
import { getCachedAssetUri, preloadAssets } from '../lib/cacheManager';

type WorkoutState = 'preview' | 'prepare' | 'active' | 'rest' | 'finished';

type Exercise = { 
  id: string; 
  uniqueKey: string; // Unique key per instance for React lists
  name: string; 
  file: string; 
  duration: number; 
  tips: string[]; 
  difficulty: number; 
  targetMuscles: string[]; 
  commonMistakes: string[]; 
};

const ALL_EXERCISES: Exercise[] = [
  { 
    id: '1', uniqueKey: '1', name: 'Squats', file: 'Squats.mp4', duration: 30, difficulty: 1.0,
    tips: ['Keep your chest up and look forward.', 'Drive through your heels, not your toes.', 'Don\'t let your knees cave inward!'],
    targetMuscles: ['Glutes', 'Quads', 'Hamstrings'],
    commonMistakes: ['Knees caving inward', 'Rounding the lower back']
  },
  { 
    id: '2', uniqueKey: '2', name: 'Standard Push-Up', file: 'Standard_PushUp.mp4', duration: 30, difficulty: 1.5,
    tips: ['Keep your core completely tight.', 'Elbows should be at a 45-degree angle.', 'Go all the way down and all the way up.'],
    targetMuscles: ['Chest', 'Triceps', 'Shoulders', 'Core'],
    commonMistakes: ['Flaring elbows out too wide', 'Sagging hips towards the floor']
  },
  { 
    id: '3', uniqueKey: '3', name: 'Reverse Lunge', file: 'Reverse_Lunge.mp4', duration: 30, difficulty: 1.2,
    tips: ['Keep your front knee directly above your ankle.', 'Lower your back knee until it almost touches the ground.', 'Keep your chest up and core engaged.'],
    targetMuscles: ['Quads', 'Glutes', 'Hamstrings'],
    commonMistakes: ['Letting front knee go way past toes', 'Not dropping back knee low enough']
  },
  { 
    id: '4', uniqueKey: '4', name: 'Forearm Plank', file: 'Forearm_Plank.mp4', duration: 30, difficulty: 1.0,
    tips: ['Keep your back completely flat.', 'Don\'t let your hips sag toward the floor.', 'Breathe deep into your stomach.'],
    targetMuscles: ['Core', 'Shoulders'],
    commonMistakes: ['Hips sagging too low', 'Looking straight up at the ceiling']
  },
  { 
    id: '5', uniqueKey: '5', name: 'Bicycle Twisting Crunch', file: 'Bicycle_Twisting_Crunch.mp4', duration: 30, difficulty: 1.5,
    tips: ['Bring elbow to opposite knee.', 'Keep shoulder blades off ground.', 'Focus on twisting your core.'],
    targetMuscles: ['Core', 'Abs', 'Obliques'],
    commonMistakes: ['Pulling on neck with hands', 'Moving too fast without control']
  },
  { 
    id: '6', uniqueKey: '6', name: 'Bulgarian Split Squat', file: 'Bulgarian_Split_Squat.mp4', duration: 30, difficulty: 1.8,
    tips: ['Elevate your back foot on a bench or chair.', 'Keep your torso upright.', 'Drive through your front heel.'],
    targetMuscles: ['Quads', 'Glutes', 'Hamstrings'],
    commonMistakes: ['Front knee passing far beyond toes', 'Losing balance (focus eyes ahead)']
  },
  { 
    id: '7', uniqueKey: '7', name: 'Burpees', file: 'Burpees.mp4', duration: 30, difficulty: 2.0,
    tips: ['Jump high at the top.', 'Keep your core tight in plank position.', 'Breathe continuously.'],
    targetMuscles: ['Full Body', 'Cardio', 'Quads', 'Chest'],
    commonMistakes: ['Sagging lower back during plank', 'Landing heavy on flat feet']
  },
  { 
    id: '8', uniqueKey: '8', name: 'Chair Dips', file: 'Chair_Dips.mp4', duration: 30, difficulty: 1.3,
    tips: ['Keep your back close to the chair.', 'Bend elbows to 90 degrees.', 'Keep shoulders down.'],
    targetMuscles: ['Triceps', 'Shoulders', 'Chest'],
    commonMistakes: ['Elbows flaring outwards too wide', 'Shrugging shoulders up to ears']
  },
  { 
    id: '9', uniqueKey: '9', name: 'Glute Bridge', file: 'Glute_Bridge.mp4', duration: 30, difficulty: 1.0,
    tips: ['Squeeze glutes at the top.', 'Drive up through heels.', 'Keep knees parallel.'],
    targetMuscles: ['Glutes', 'Hamstrings', 'Lower Back'],
    commonMistakes: ['Arching the lower back too much', 'Not lifting hips high enough']
  },
  { 
    id: '10', uniqueKey: '10', name: 'Hollow Body Hold', file: 'Hollow_Body_Hold.mp4', duration: 30, difficulty: 1.6,
    tips: ['Press your lower back flat into the floor.', 'Extend arms and legs out.', 'Keep shoulders off the floor.'],
    targetMuscles: ['Core', 'Abs'],
    commonMistakes: ['Lower back arching off the floor', 'Holding breath']
  },
  { 
    id: '11', uniqueKey: '11', name: 'Jumping Jacks', file: 'Jumping_jacks.mp4', duration: 30, difficulty: 1.0,
    tips: ['Land softly on the balls of your feet.', 'Clap hands fully above your head.', 'Keep a steady rhythm.'],
    targetMuscles: ['Cardio', 'Calves', 'Shoulders'],
    commonMistakes: ['Landing with stiff knees', 'Incomplete arm ranges']
  },
  { 
    id: '12', uniqueKey: '12', name: 'Jumping Squats', file: 'Jumping_Squats.mp4', duration: 30, difficulty: 1.7,
    tips: ['Land softly and absorb the impact.', 'Explode upwards dynamically.', 'Use your arms for momentum.'],
    targetMuscles: ['Quads', 'Glutes', 'Cardio'],
    commonMistakes: ['Knees caving in on landing', 'Landing on flat feet']
  },
  { 
    id: '13', uniqueKey: '13', name: 'Mountain Climbers', file: 'Mountain_Climbers.mp4', duration: 30, difficulty: 1.4,
    tips: ['Drive knees to chest rapidly.', 'Keep your hips low and core locked.', 'Distribute weight evenly.'],
    targetMuscles: ['Core', 'Cardio', 'Shoulders'],
    commonMistakes: ['Hips bouncing too high up', 'Slipping hands forward']
  },
  { 
    id: '14', uniqueKey: '14', name: 'Pike Push-Up', file: 'Pike_PushUp.mp4', duration: 30, difficulty: 1.7,
    tips: ['Look at your toes.', 'Lower the crown of your head to the floor.', 'Keep hips high in inverted V.'],
    targetMuscles: ['Shoulders', 'Triceps', 'Upper Back'],
    commonMistakes: ['Flaring elbows wide', 'Losing the pike shape']
  },
  { 
    id: '15', uniqueKey: '15', name: 'Superman Raises', file: 'Superman_Raises.mp4', duration: 30, difficulty: 1.2,
    tips: ['Lift arms and legs simultaneously.', 'Hold for 1 sec at the top.', 'Look down to protect neck.'],
    targetMuscles: ['Lower Back', 'Glutes', 'Hamstrings'],
    commonMistakes: ['Overextending or jerking the neck', 'Bending knees instead of lifting thighs']
  }
];

const DEFAULT_EXERCISES: Exercise[] = [
  ALL_EXERCISES[0],
  ALL_EXERCISES[1],
  ALL_EXERCISES[2],
  ALL_EXERCISES[3]
];

type Track = { id: string; title: string; file: string; isLocal: boolean };
const MUSIC_LIBRARY: Track[] = [
  { id: 'default', title: 'Blaze Default Mix', file: 'default.mp3', isLocal: true },
  { id: 'jujalarim', title: 'JUJALARIM FUNK', file: 'Eternxlkz - JUJALARIM FUNK (Official Audio).mp3', isLocal: false },
  { id: 'brodyaga', title: 'BRODYAGA FUNK', file: 'BRODYAGA FUNK (PHONK).mp3', isLocal: false },
  { id: 'gqtis', title: 'gqtis - POOR', file: 'gqtis - POOR (Phonk).mp3', isLocal: false },
];

const PRESET_WORKOUTS: Record<string, string[]> = {
  full_body: ['7', '1', '2', '13', '11'], // Burpees, Squats, Standard Push-Up, Mountain Climbers, Jumping Jacks
  core: ['10', '4', '5', '13'], // Hollow Body Hold, Forearm Plank, Bicycle Twisting Crunch, Mountain Climbers
  lower_body: ['1', '6', '9', '3'], // Squats, Bulgarian Split Squat, Glute Bridge, Reverse Lunge
  upper_body: ['2', '8', '14', '4'], // Standard Push-Up, Chair Dips, Pike Push-Up, Forearm Plank
  streak_saver: ['11', '1', '9', '4'], // Jumping Jacks, Squats, Glute Bridge, Forearm Plank (Fast 2-Min rescue)
};

const getPresetExercises = (preset: string): Exercise[] => {
  const ids = PRESET_WORKOUTS[preset] || PRESET_WORKOUTS.full_body;
  return ids.map((id, index) => {
    const ex = ALL_EXERCISES.find(e => e.id === id);
    const baseEx = ex ? { ...ex, uniqueKey: `preset_${index}_${id}` } : { ...ALL_EXERCISES[0], uniqueKey: `preset_${index}_fallback` };
    
    if (preset === 'streak_saver') {
      baseEx.duration = 30; // 4 exercises * 30s = 120s (exactly 2 minutes!)
    } else if (preset === 'core') {
      baseEx.duration = 150; // 150s * 4 = 10 minutes total
    } else if (preset === 'full_body') {
      baseEx.duration = 240; // 240s * 5 = 20 minutes total
    } else if (preset === 'lower_body' || preset === 'upper_body') {
      baseEx.duration = 225; // 225s * 4 = 15 minutes total
    }
    
    return baseEx;
  });
};

const REST_DURATION = 5; // 5 seconds rest between exercises
const MINIMUM_HABIT_TIME = 120; // 2 minutes

export default function WorkoutScreen() {
  const { addXp, onboardingData, completeWorkout, syncToCloud, petStats, getPersonalRecord, savedCustomWorkouts } = useUserStore();
  const { preset, custom_ids, custom_plan_id } = useLocalSearchParams<{ preset?: string, custom_ids?: string, custom_plan_id?: string }>();
  const petName = onboardingData.pet_name || 'Blaze';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

  const [workoutState, setWorkoutState] = useState<WorkoutState>('preview');
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [restDuration, setRestDuration] = useState(15);

  useEffect(() => {
    if (custom_plan_id) {
      const plan = savedCustomWorkouts.find(w => w.id === custom_plan_id);
      if (plan) {
        if (plan.restDuration !== undefined) {
          setRestDuration(plan.restDuration);
        }
        const customEx = plan.exercises.map((pex, index) => {
          if (pex.id === 'rest' || pex.id.toLowerCase() === 'rest') {
            return null;
          }
          const ex = ALL_EXERCISES.find(e => e.id === pex.id);
          if (ex && ex.name.toLowerCase() === 'rest') {
            return null;
          }
          return ex ? { ...ex, uniqueKey: `custom_${index}_${pex.id}`, duration: pex.duration } : null;
        }).filter(Boolean) as Exercise[];

        if (customEx.length > 0) setExercises(customEx);
      }
    } else if (custom_ids) {
      const ids = custom_ids.split(',');
      const customEx = ids.map((id, index) => {
        if (id === 'rest' || id.toLowerCase() === 'rest') {
          return null;
        }
        const ex = ALL_EXERCISES.find(e => e.id === id);
        if (ex && ex.name.toLowerCase() === 'rest') {
          return null;
        }
        return ex ? { ...ex, uniqueKey: `ids_${index}_${id}` } : null;
      }).filter(Boolean) as Exercise[];

      if (customEx.length > 0) {
        setExercises(customEx);
      }
    } else if (preset) {
      setExercises(getPresetExercises(preset));
    }
  }, [preset, custom_ids, custom_plan_id]);
  
  // Execution state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [masterclassVisible, setMasterclassVisible] = useState(false);
  const [musicModalVisible, setMusicModalVisible] = useState(false);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);

  // Audio & Settings State
  const [coachVoiceEnabled, setCoachVoiceEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [activeTrackId, setActiveTrackId] = useState('default');
  const [soundObject, setSoundObject] = useState<Audio.Sound | null>(null);
  
  // Gamification state
  const [xpPopup, setXpPopup] = useState<number | null>(null);
  const [pauseTimer, setPauseTimer] = useState(0);
  const [sessionXpTotal, setSessionXpTotal] = useState(0);
  const [newRecordExercise, setNewRecordExercise] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Helper: generate deterministic exercise ID matching the store's format
  const toExerciseId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const activeExercises = exercises.filter(ex => ex.id !== 'rest');
  const activeTime = activeExercises.reduce((acc, curr) => acc + curr.duration, 0);
  const activeCount = activeExercises.length;
  const totalTime = activeTime + (activeCount > 1 ? (activeCount - 1) * restDuration : 0);
  const isValidTime = totalTime >= MINIMUM_HABIT_TIME;

  const currentExercise = exercises[currentIndex];
  
  // Resolve local cached URI if available
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');
  
  useEffect(() => {
    if (currentExercise && currentExercise.file) {
      const remoteUrl = `${supabaseUrl}/storage/v1/object/public/workouts/${currentExercise.file}`;
      getCachedAssetUri(remoteUrl).then(setResolvedVideoUrl);
    } else {
      setResolvedVideoUrl('');
    }
  }, [currentExercise, supabaseUrl]);

  // Preload videos for the active workout lazily during preview
  useEffect(() => {
    if (exercises.length > 0 && workoutState === 'preview') {
      const urls = exercises
        .filter(ex => ex.file)
        .map(ex => `${supabaseUrl}/storage/v1/object/public/workouts/${ex.file}`);
      preloadAssets(urls);
    }
  }, [exercises, workoutState, supabaseUrl]);

  // Initialize the video player
  const player = useVideoPlayer(resolvedVideoUrl, player => {
    player.loop = true;
    if ((workoutState === 'active' || workoutState === 'prepare') && !isPaused) {
      player.play();
    } else {
      player.pause();
    }
  });

  // Handle Play/Pause syncing with video player and audio
  useEffect(() => {
    if (player) {
      if ((workoutState === 'active' || workoutState === 'prepare') && !isPaused) {
        player.play();
      } else {
        player.pause();
      }
    }
    
    // Sync background music playback
    if (soundObject) {
      if ((workoutState === 'active' || workoutState === 'prepare' || workoutState === 'rest') && !isPaused && musicEnabled) {
        soundObject.playAsync();
      } else {
        soundObject.pauseAsync();
      }
    }
  }, [isPaused, workoutState, player, soundObject, musicEnabled]);

  // Handle Music Loading
  useEffect(() => {
    let currentSound: Audio.Sound | null = null;
    
    async function loadAudio() {
      try {
        if (soundObject) {
          await soundObject.unloadAsync();
        }

        const track = MUSIC_LIBRARY.find(t => t.id === activeTrackId);
        if (!track) return;
        
        // Ensure Audio is configured for playback even on silent mode (iOS)
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

        const source = track.isLocal 
          ? require('../assets/audio/default.mp3') 
          : { uri: await getCachedAssetUri(`${supabaseUrl}/storage/v1/object/public/music/${encodeURIComponent(track.file)}`) };

        const { sound: newSound } = await Audio.Sound.createAsync(source, { 
          isLooping: true, 
          shouldPlay: (workoutState === 'active' || workoutState === 'prepare' || workoutState === 'rest') && !isPaused && musicEnabled 
        });
        
        setSoundObject(newSound);
        currentSound = newSound;
      } catch (e) {
        console.error("Audio Load Error:", e);
      }
    }
    
    loadAudio();

    return () => {
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [activeTrackId]); // Re-run only when track changes

  // Main Timer Logic (Just counts down)
  useEffect(() => {
    if (workoutState === 'preview' || workoutState === 'finished' || isPaused) {
      if (isPaused && workoutState === 'active') {
        const pTimer = setInterval(() => setPauseTimer((p) => p + 1), 1000);
        return () => clearInterval(pTimer);
      }
      return;
    }

    setPauseTimer(0);

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [workoutState, isPaused]);

  // State Transition Logic (Handles side effects safely)
  useEffect(() => {
    if (timeLeft === 0) {
      if (workoutState === 'prepare') {
        // Transition from prepare to active
        setWorkoutState('active');
        setTimeLeft(exercises[currentIndex]?.duration || 30);
      } else if (workoutState === 'active') {
        const isCurrentRest = exercises[currentIndex]?.id === 'rest';

        // Only give XP and check PRs for actual exercises, not rest blocks!
        if (!isCurrentRest) {
          const earnedXp = Math.ceil(exercises[currentIndex].difficulty * (exercises[currentIndex].duration / 10));
          addXp(earnedXp);
          setSessionXpTotal(prev => prev + earnedXp);
          if (sfxEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setXpPopup(earnedXp);
          setTimeout(() => setXpPopup(null), 2000);

          // Check for personal record
          const exId = toExerciseId(exercises[currentIndex].name);
          const pr = getPersonalRecord(exId);
          if (pr && exercises[currentIndex].duration > pr.bestDurationSecs) {
            // New record! Extra celebration
            setNewRecordExercise(exercises[currentIndex].name);
            if (sfxEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            voiceCoach.announceNewRecord();
            setTimeout(() => setNewRecordExercise(null), 3000);
          }
        }

        if (currentIndex < exercises.length - 1) {
          const nextExercise = exercises[currentIndex + 1];
          if (nextExercise?.id === 'rest' || isCurrentRest) {
            // If the next item is an explicit Rest Block, OR the current item was a Rest Block,
            // we go straight to the next item instead of double-resting!
            const isNextRest = nextExercise?.id === 'rest';
            if (isNextRest) {
              // Next is Rest block: transition directly to it as active state (which renders as Rest UI)
              setWorkoutState('active');
              setCurrentIndex(currentIndex + 1);
              setTimeLeft(nextExercise.duration);
            } else {
              // Next is a normal exercise: transition to its prepare state (since we just finished a Rest block)
              setWorkoutState('prepare');
              setCurrentIndex(currentIndex + 1);
              setTimeLeft(5); // 5 seconds to prepare
            }
          } else {
            // Default 5s transition rest between two normal exercises
            setWorkoutState('rest');
            setTimeLeft(REST_DURATION);
          }
          setIsPaused(false);
        } else {
          setWorkoutState('finished');
          setIsPaused(false);
        }
      } else if (workoutState === 'rest') {
        // Increment the exercise index and go to PREPARE state first
        if (currentIndex < exercises.length - 1) {
          const nextExercise = exercises[currentIndex + 1];
          if (nextExercise?.id === 'rest') {
            // Next is Rest block: transition directly to it as active state
            setWorkoutState('active');
            setCurrentIndex(currentIndex + 1);
            setTimeLeft(nextExercise.duration);
          } else {
            setWorkoutState('prepare');
            setCurrentIndex(currentIndex + 1);
            setTimeLeft(5); // 5 seconds to prepare
          }
        } else {
          setWorkoutState('finished');
        }
        setIsPaused(false);
      }
    }
  }, [timeLeft, workoutState, currentIndex, exercises, addXp]);

  // Tip Rotation Logic (every 5 seconds)
  useEffect(() => {
    if (workoutState !== 'active' || isPaused || !currentExercise) return;
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % currentExercise.tips.length);
    }, 5000);
    return () => clearInterval(tipTimer);
  }, [workoutState, isPaused, currentExercise]);

  // ==========================================
  // VOICE COACH LOGIC
  // ==========================================
  
  // Sync voice coach enabled state
  useEffect(() => {
    voiceCoach.setVoiceEnabled(coachVoiceEnabled);
  }, [coachVoiceEnabled]);

  // Audio Ducking
  useEffect(() => {
    voiceCoach.onSpeechStateChange = (isSpeaking: boolean) => {
      if (soundObject && musicEnabled) {
        soundObject.setVolumeAsync(isSpeaking ? 0.2 : 1.0).catch(e => console.log('Ducking error:', e));
      }
    };
    return () => {
      voiceCoach.onSpeechStateChange = undefined;
    };
  }, [soundObject, musicEnabled]);

  // State Transition Announcements
  useEffect(() => {
    if (isPaused) {
      voiceCoach.stop();
      return;
    }
    
    if (workoutState === 'prepare') {
      if (exercises[currentIndex]?.id !== 'rest') {
        voiceCoach.announceExercise(exercises[currentIndex]?.name);
      }
    } else if (workoutState === 'rest') {
      voiceCoach.announceRest(exercises[currentIndex + 1]?.name);
    } else if (workoutState === 'active' && exercises[currentIndex]?.id === 'rest') {
      voiceCoach.announceRest(exercises[currentIndex + 1]?.name);
    } else if (workoutState === 'finished') {
      voiceCoach.announceWorkoutComplete();
    }
  }, [workoutState, isPaused, currentIndex, exercises]);

  // Time-based Announcements
  useEffect(() => {
    if (isPaused || !coachVoiceEnabled) return;

    if (workoutState === 'prepare' && timeLeft === 3) {
      voiceCoach.announceCountdown();
    } else if (workoutState === 'active') {
      if (exercises[currentIndex]?.id !== 'rest') {
        const halfTime = Math.floor(exercises[currentIndex]?.duration / 2);
        if (timeLeft === halfTime && halfTime > 5) {
          voiceCoach.announceMidway(exercises[currentIndex]?.name, petName);
        }
      }
    }
  }, [timeLeft, workoutState, isPaused, coachVoiceEnabled, currentIndex, exercises, petName]);

  const handleStart = () => {
    if (!isValidTime) return;
    
    // Construct a new exercise list with rest blocks interleaved dynamically
    const interleaved: Exercise[] = [];
    exercises.forEach((ex, idx) => {
      interleaved.push(ex);
      if (idx < exercises.length - 1) {
        interleaved.push({
          id: 'rest',
          uniqueKey: `rest_interleaved_${idx}_${Date.now()}`,
          name: 'Rest',
          file: '', // no video for rest
          duration: restDuration,
          difficulty: 0,
          tips: ['Breathe deeply.', 'Prepare for the next exercise.'],
          targetMuscles: [],
          commonMistakes: []
        } as Exercise);
      }
    });

    setExercises(interleaved);
    setCurrentIndex(0);
    // Start with a 5-second preparation phase
    setTimeLeft(5);
    setTipIndex(0);
    setWorkoutState('prepare');
  };

  const handleFinish = () => {
    // Log workout to local history + Supabase cloud
    completeWorkout({
      preset: preset || null,
      exercises: exercises
        .filter(ex => ex.id !== 'rest')
        .map(ex => ({ name: ex.name, duration: ex.duration, difficulty: ex.difficulty })),
      totalDurationSecs: totalTime,
      totalXp: sessionXpTotal,
      mood: selectedMood || undefined,
    });

    // Sync all pet stats to Supabase cloud (fire and forget)
    syncToCloud();

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

  const updateDuration = (index: number, change: number) => {
    setExercises(prev => {
      const newEx = [...prev];
      const newDuration = newEx[index].duration + change;
      // Minimum 10 seconds per exercise
      if (newDuration >= 10) {
        newEx[index] = { ...newEx[index], duration: newDuration };
      }
      return newEx;
    });
  };

  const handleSwap = (index: number) => {
    if (sfxEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSwappingIndex(index);
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
            keyExtractor={(item) => item.uniqueKey}
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
                    <View style={styles.previewCardLeft}>
                      <GripVertical size={20} color={COLORS.text.secondary} />
                      <Image
                        source={EXERCISE_IMAGES[item.id]}
                        style={styles.thumbnailImage}
                      />
                    </View>

                    <View style={styles.previewInfo}>
                      <Text style={styles.previewName}>{item.name}</Text>
                      
                      {/* Progressive Overload: Last Time & PR Info */}
                      {(() => {
                        if (item.id === 'rest' || item.name.toLowerCase() === 'rest') return null;
                        const pr = getPersonalRecord(toExerciseId(item.name));
                        if (!pr) return null;
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.xs }}>
                            <Trophy size={12} color={COLORS.brand.gold} />
                            <Text style={styles.previewPrText}>
                              Best: {pr.bestDurationSecs}s • Last: {pr.lastDurationSecs}s
                            </Text>
                          </View>
                        );
                      })()}
                      
                      {/* The Stepper UI */}
                      <View style={styles.stepperContainer}>
                        <TouchableOpacity 
                          style={styles.stepperButton} 
                          onPress={() => updateDuration(idx, -5)}
                        >
                          <Minus size={14} color={COLORS.text.primary} />
                        </TouchableOpacity>
                        
                        <Text style={styles.previewTime}>{item.duration}s</Text>
                        
                        <TouchableOpacity 
                          style={styles.stepperButton} 
                          onPress={() => updateDuration(idx, 5)}
                        >
                          <Plus size={14} color={COLORS.text.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.previewActions}>
                      <TouchableOpacity onPress={() => handleSwap(idx)}>
                        <RefreshCw size={20} color={COLORS.brand.orange} />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: SPACING.sm }}>
              <AlertTriangle size={16} color={COLORS.state.error} />
              <Text style={[styles.errorText, { marginBottom: 0 }]}>
                Habit workouts must be at least {MINIMUM_HABIT_TIME}s to earn XP!
              </Text>
            </View>
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

        {/* ==========================================
            EXERCISE SWAP MODAL
            ========================================== */}
        {swappingIndex !== null && (
          <View style={styles.modalOverlay}>
            <Animated.View entering={FadeIn} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Swap Exercise</Text>
                <TouchableOpacity onPress={() => setSwappingIndex(null)}>
                  <X size={24} color={COLORS.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {ALL_EXERCISES.map((ex) => {
                  // Do not offer to swap with any exercise that is ALREADY part of the current workout list
                  const isAlreadySelected = exercises.some(activeEx => activeEx.id === ex.id);
                  if (isAlreadySelected) return null;

                  return (
                    <TouchableOpacity 
                      key={ex.id}
                      style={styles.swapOptionRow}
                      onPress={() => {
                        if (sfxEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        const newEx = [...exercises];
                        newEx[swappingIndex] = {
                          ...ex,
                          uniqueKey: `swap_${swappingIndex}_${ex.id}_${Date.now()}`,
                          duration: exercises[swappingIndex].duration // retain the configured duration
                        };
                        setExercises(newEx);
                        setSwappingIndex(null);
                      }}
                    >
                      <View>
                        <Text style={styles.swapOptionName}>
                          {ex.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Target size={12} color={COLORS.text.secondary} />
                          <Text style={styles.swapOptionMuscles}>{ex.targetMuscles.join(', ')}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        )}
      </View>
    );
  }

  const isExplicitRest = workoutState === 'active' && exercises[currentIndex]?.id === 'rest';
  const isResting = workoutState === 'rest' || isExplicitRest;

  // ==========================================
  // RENDER: REST STATE
  // ==========================================
  if (isResting) {
    const nextExercise = exercises[currentIndex + 1];
    const totalRestTime = workoutState === 'rest' ? REST_DURATION : (exercises[currentIndex]?.duration || 15);
    return (
      <View style={styles.container}>
        <Animated.View entering={FadeIn} style={styles.restContainer}>
          
          {/* XP Popup Animation */}
          {xpPopup !== null && (
            <Animated.View entering={SlideInRight} exiting={FadeOut} style={styles.xpPopup}>
              <StrokeText style={styles.xpPopupText} strokeColor="rgba(0,0,0,0.6)" strokeWidth={2}>+{xpPopup} XP!</StrokeText>
            </Animated.View>
          )}

          <StrokeText style={styles.restTitle} strokeColor="rgba(0,0,0,0.5)" strokeWidth={2}>Rest</StrokeText>
          <CircularTimer
            size={140}
            strokeWidth={6}
            timeLeft={timeLeft}
            totalTime={totalRestTime}
            color={COLORS.state.info}
          />
          {nextExercise && (
            <Text style={styles.nextUpText}>Up Next: {nextExercise.name}</Text>
          )}

          <View style={styles.restActionsRow}>
            <TouchableOpacity 
              style={styles.restActionButton}
              onPress={() => setTimeLeft((prev) => prev + 10)}
            >
              <Text style={styles.restActionText}>+10s</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.restActionButton}
              onPress={() => setTimeLeft(0)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.restActionText}>Skip</Text>
                <SkipForward size={16} color={COLORS.text.primary} />
              </View>
            </TouchableOpacity>
          </View>
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
        <ConfettiBlast trigger={true} count={60} duration={3500} />
        <Animated.View entering={FadeIn} style={styles.finishedCard}>
          <PetAvatar size={140} mood="happy" level={petStats.level} showGlow={false} />
          <StrokeText style={styles.title} strokeColor="rgba(0,0,0,0.5)" strokeWidth={2}>Workout Complete!</StrokeText>
          <Text style={styles.subtitle}>
            You just fed {petName} a massive amount of energy! 
            The streak continues.
          </Text>
          <View style={[styles.rewardBox, CARD_SHADOW]}>
            <View style={styles.rewardRow}>
              <Zap size={20} color={COLORS.brand.gold} />
              <StrokeText style={styles.rewardText} strokeColor="rgba(0,0,0,0.5)" strokeWidth={1}>+{sessionXpTotal} XP</StrokeText>
            </View>
            <View style={styles.rewardRow}>
              <Coins size={20} color={COLORS.brand.gold} />
              <StrokeText style={styles.rewardText} strokeColor="rgba(0,0,0,0.5)" strokeWidth={1}>+{Math.max(3, Math.floor(totalTime / 60))} Coins</StrokeText>
            </View>
            <View style={styles.rewardRow}>
              <Heart size={20} color={COLORS.brand.gold} />
              <StrokeText style={styles.rewardText} strokeColor="rgba(0,0,0,0.5)" strokeWidth={1}>+100 Energy (Full)</StrokeText>
            </View>
            <View style={styles.rewardRow}>
              <Flame size={20} color={COLORS.brand.gold} />
              <StrokeText style={styles.rewardText} strokeColor="rgba(0,0,0,0.5)" strokeWidth={1}>Streak: {petStats.streak} days</StrokeText>
            </View>
            {(() => {
              const records = exercises
                .map(ex => {
                  if (ex.id === 'rest' || ex.name.toLowerCase() === 'rest') return null;
                  const pr = getPersonalRecord(toExerciseId(ex.name));
                  return pr && pr.improvedFromLast ? ex.name : null;
                })
                .filter(Boolean);
              if (records.length === 0) return null;
              return (
                <View style={styles.rewardRow}>
                  <Trophy size={20} color={COLORS.brand.gold} />
                  <Text style={styles.rewardText}>New PR: {records.join(', ')}</Text>
                </View>
              );
            })()}
          </View>
          
          {/* Mood Rating */}
          <View style={styles.moodSection}>
            <Text style={styles.moodQuestion}>How do you feel, {onboardingData.name || 'trainer'}?</Text>
            <View style={styles.moodRow}>
              {[
                { Icon: Frown, label: 'Exhausted', value: 'exhausted' },
                { Icon: Meh, label: 'Tired', value: 'tired' },
                { Icon: Smile, label: 'Good', value: 'good' },
                { Icon: Dumbbell, label: 'Strong', value: 'strong' },
                { Icon: Flame, label: 'On Fire!', value: 'on_fire' },
              ].map((mood) => {
                const isSelected = selectedMood === mood.value;
                return (
                  <TouchableOpacity
                    key={mood.value}
                    style={[
                      styles.moodButton,
                      isSelected && styles.moodButtonSelected,
                    ]}
                    onPress={() => setSelectedMood(mood.value)}
                  >
                    <mood.Icon size={24} color={isSelected ? COLORS.brand.orange : COLORS.text.tertiary} />
                    <Text style={[
                      styles.moodLabel,
                      isSelected && styles.moodLabelSelected,
                      { marginTop: 4 }
                    ]}>{mood.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
            <LinearGradient
              colors={[COLORS.brand.orange, COLORS.brand.flame] as const}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ==========================================
  // RENDER: ACTIVE & PREPARE STATE
  // ==========================================
  // Both states use the same UI layout, just different logic
  return (
    <View style={styles.container}>
      {/* Video Section */}
      <View style={styles.videoContainer}>
        {player ? (
          <VideoView 
            style={styles.video} 
            player={player}
            allowsPictureInPicture={false} 
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <ActivityIndicator color={COLORS.brand.orange} size="large" />
        )}

        {/* Floating Music Button */}
        <TouchableOpacity 
          style={styles.musicButton}
          onPress={() => {
            if (sfxEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsPaused(true);
            setMusicModalVisible(true);
          }}
        >
          <Music size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.infoContainer}>
        {/* Floating Masterclass '?' Button */}
        <TouchableOpacity 
          style={styles.masterclassButton}
          onPress={() => {
            if (sfxEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsPaused(true);
            setMasterclassVisible(true);
          }}
        >
          <Text style={styles.masterclassButtonText}>?</Text>
        </TouchableOpacity>

        {/* Sleeping Fox Warning - Placed at the top so it never blocks buttons */}
        {isPaused && pauseTimer > 10 && (
          <Animated.View entering={FadeIn} style={styles.sleepingFoxContainer}>
            <View style={{ marginBottom: 6 }}>
              <Moon size={32} color={COLORS.brand.yellow} />
            </View>
            <Text style={styles.sleepingFoxText}>Blaze is asleep!</Text>
          </Animated.View>
        )}

        <Text style={styles.exerciseName}>{currentExercise.name}</Text>
        
        {/* Progressive Overload: Beat your record banner */}
        {(() => {
          if (currentExercise.id === 'rest' || currentExercise.name.toLowerCase() === 'rest') return null;
          const pr = getPersonalRecord(toExerciseId(currentExercise.name));
          if (!pr) return null;
          const isRecord = newRecordExercise === currentExercise.name;
          if (isRecord) {
            return (
              <Animated.View entering={FadeIn} style={[styles.newRecordBanner, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}>
                <Trophy size={16} color={COLORS.bg.primary} />
                <Text style={styles.newRecordText}>NEW RECORD!</Text>
              </Animated.View>
            );
          }
          return (
            <View style={styles.lastTimeBanner}>
              <Text style={styles.lastTimeText}>
                Last: {pr.lastDurationSecs}s • Best: {pr.bestDurationSecs}s
              </Text>
            </View>
          );
        })()}
        
        <CircularTimer
          size={140}
          strokeWidth={6}
          timeLeft={timeLeft}
          totalTime={workoutState === 'prepare' ? 5 : exercises[currentIndex]?.duration || 30}
          isPaused={isPaused}
          color={workoutState === 'prepare' ? COLORS.brand.gold : COLORS.brand.orange}
        />

        {/* Dynamic Masterclass Tips or Prepare Text */}
        {workoutState === 'prepare' ? (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Text style={[styles.tipText, { color: COLORS.brand.yellow, fontSize: FONT_SIZE.lg }]}>
              Get in position! Starting soon...
            </Text>
          </Animated.View>
        ) : (
          <Animated.View 
            key={tipIndex} 
            entering={SlideInRight} 
            exiting={FadeOut}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 40, paddingHorizontal: SPACING.lg }}
          >
            <Lightbulb size={18} color={COLORS.brand.yellow} />
            <Text style={[styles.tipText, { minHeight: undefined, paddingHorizontal: 0, flex: 1, textAlign: 'left' }]}>
              {currentExercise.tips[tipIndex]}
            </Text>
          </Animated.View>
        )}

        {/* Progress Dots */}
        <View style={styles.progressContainer}>
          {exercises.map((ex, idx) => (
            <View 
              key={ex.uniqueKey || `dot_${idx}_${ex.id}`} 
              style={[
                styles.dot, 
                idx === currentIndex ? styles.dotActive : idx < currentIndex ? styles.dotCompleted : null
              ]} 
            />
          ))}
        </View>
        
        {/* Play / Pause Toggle without background */}
        <View style={styles.activeActionsRow}>
          <TouchableOpacity 
            style={styles.pauseButtonContainer}
            onPress={() => {
              if (sfxEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setIsPaused(!isPaused);
            }}
            activeOpacity={0.7}
          >
            {isPaused ? (
              <Play size={56} color={COLORS.brand.orange} fill={COLORS.brand.orange} />
            ) : (
              <Pause size={56} color={COLORS.brand.orange} fill={COLORS.brand.orange} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.finishEarlyButton}
            onPress={() => {
              if (sfxEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTimeLeft(0);
            }}
            activeOpacity={0.7}
          >
            <SkipForward size={36} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ==========================================
          MASTERCLASS MODAL
          ========================================== */}
      {masterclassVisible && (
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentExercise.name} Masterclass</Text>
              <TouchableOpacity onPress={() => setMasterclassVisible(false)}>
                <X size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Muscle Map Block */}
              <View style={styles.modalSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md }}>
                  <Flame size={18} color={COLORS.brand.orange} />
                  <Text style={[styles.modalSectionTitle, { marginBottom: 0 }]}>Target Muscles</Text>
                </View>
                <View style={styles.pillContainer}>
                  {currentExercise.targetMuscles.map(m => (
                    <View key={m} style={styles.musclePill}>
                      <Text style={styles.musclePillText}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Common Mistakes Block */}
              <View style={styles.modalSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md }}>
                  <AlertTriangle size={18} color={COLORS.state.error} />
                  <Text style={[styles.modalSectionTitle, { marginBottom: 0 }]}>Common Mistakes</Text>
                </View>
                {currentExercise.commonMistakes.map(mistake => (
                  <Text key={mistake} style={styles.mistakeText}>• {mistake}</Text>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalPrimaryButton}
              onPress={() => {
                setMasterclassVisible(false);
                setIsPaused(false);
              }}
            >
              <Text style={styles.modalPrimaryButtonText}>Got It, Resume!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* ==========================================
          MUSIC MODAL
          ========================================== */}
      {musicModalVisible && (
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Audio & Music</Text>
              <TouchableOpacity onPress={() => setMusicModalVisible(false)}>
                <X size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Sound Settings Block */}
              <View style={styles.modalSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md }}>
                  <Volume2 size={18} color={COLORS.brand.orange} />
                  <Text style={[styles.modalSectionTitle, { marginBottom: 0 }]}>Audio Settings</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.audioOptionRow}
                  onPress={() => setCoachVoiceEnabled(!coachVoiceEnabled)}
                >
                  <Text style={styles.audioOptionText}>Coach Voice</Text>
                  <Text style={coachVoiceEnabled ? styles.audioOptionToggleActive : styles.audioOptionToggleInactive}>
                    {coachVoiceEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.audioOptionRow}
                  onPress={() => setMusicEnabled(!musicEnabled)}
                >
                  <Text style={styles.audioOptionText}>Background Music</Text>
                  <Text style={musicEnabled ? styles.audioOptionToggleActive : styles.audioOptionToggleInactive}>
                    {musicEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.audioOptionRow}
                  onPress={() => setSfxEnabled(!sfxEnabled)}
                >
                  <Text style={styles.audioOptionText}>Sound Effects (Haptics)</Text>
                  <Text style={sfxEnabled ? styles.audioOptionToggleActive : styles.audioOptionToggleInactive}>
                    {sfxEnabled ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Music Library Block */}
              <View style={styles.modalSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.md }}>
                  <Music size={18} color={COLORS.brand.orange} />
                  <Text style={[styles.modalSectionTitle, { marginBottom: 0 }]}>Music Library</Text>
                </View>
                {MUSIC_LIBRARY.map(track => {
                  const isActive = track.id === activeTrackId;
                  return (
                    <TouchableOpacity 
                      key={track.id} 
                      style={[styles.musicTrackRow, isActive && styles.musicTrackRowActive, { flexDirection: 'row', alignItems: 'center' }]}
                      onPress={() => setActiveTrackId(track.id)}
                    >
                      {isActive && (
                        <Play size={12} color={COLORS.brand.orange} fill={COLORS.brand.orange} style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.musicTrackText, isActive && styles.musicTrackTextActive]}>
                        {track.title} {track.isLocal ? '(Offline)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalPrimaryButton}
              onPress={() => {
                setMusicModalVisible(false);
                setIsPaused(false);
              }}
            >
              <Text style={styles.modalPrimaryButtonText}>Resume Workout!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
  previewCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginRight: SPACING.md,
  },
  thumbnailImage: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.sm,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  previewName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  previewPrText: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: COLORS.brand.gold,
    marginBottom: SPACING.xs,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  stepperButton: {
    width: 28,
    height: 28,
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperIcon: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  previewTime: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
    minWidth: 35,
    textAlign: 'center',
  },
  previewActions: {
    justifyContent: 'center',
    paddingLeft: SPACING.sm,
  },
  actionIcon: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.text.secondary,
  },
  swapIcon: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.brand.orange,
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
    justifyContent: 'space-evenly',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  exerciseName: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  // Progressive Overload banners
  newRecordBanner: {
    backgroundColor: COLORS.brand.gold,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  newRecordText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.bg.primary,
    textAlign: 'center',
  },
  lastTimeBanner: {
    backgroundColor: 'rgba(255, 179, 71, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 71, 0.2)',
  },
  lastTimeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.brand.gold,
    textAlign: 'center',
  },
  timerCircle: {
    width: 160, // Slightly smaller to fit all screens
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    borderColor: COLORS.brand.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  tipText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
    textAlign: 'center',
    minHeight: 40,
    paddingHorizontal: SPACING.lg,
  },
  
  // Custom Pause Button
  pauseButtonContainer: {
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButtonText: {
    fontSize: 56, // Huge icon
    color: COLORS.brand.orange,
  },

  // Sleeping Fox
  sleepingFoxContainer: {
    position: 'absolute',
    top: 50,
    alignItems: 'center',
    zIndex: 10,
  },
  sleepingFoxEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  sleepingFoxText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.state.error,
  },

  // Masterclass Floating Button
  masterclassButton: {
    position: 'absolute',
    top: -20,
    right: SPACING.lg,
    width: 40,
    height: 40,
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    zIndex: 20,
  },
  masterclassButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.orange,
  },

  // Music Floating Button
  musicButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    zIndex: 20,
  },
  musicButtonText: {
    fontSize: FONT_SIZE.lg,
  },

  // XP Popup
  xpPopup: {
    position: 'absolute',
    top: -50,
    backgroundColor: COLORS.brand.yellow,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  xpPopupText: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.bg.primary,
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
  restActionsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.xxl,
  },
  restActionButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: BORDER_RADIUS.full,
  },
  restActionText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
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
  // Mood Rating
  moodSection: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  moodQuestion: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  moodButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 52,
  },
  moodButtonSelected: {
    borderColor: COLORS.brand.orange,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  moodLabel: {
    fontSize: 9,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.tertiary,
  },
  moodLabelSelected: {
    color: COLORS.brand.orange,
    fontFamily: 'Inter_600SemiBold',
  },
  rewardBox: {
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.brand.gold,
    width: '100%',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rewardEmoji: {
    fontSize: FONT_SIZE.xl,
  },
  rewardText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.gold,
  },
  primaryButton: {
    width: '100%',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    padding: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
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

  // Active Buttons Row
  activeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xxl,
    width: '100%',
  },
  finishEarlyButton: {
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishEarlyText: {
    fontSize: 36, // Large icon
    color: COLORS.text.secondary,
  },

  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalContent: {
    backgroundColor: COLORS.bg.primary,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
    paddingBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.orange,
  },
  modalCloseText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.text.secondary,
  },
  modalScroll: {
    marginBottom: SPACING.xl,
  },
  modalSection: {
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  modalSectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  musclePill: {
    backgroundColor: COLORS.bg.tertiary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
  },
  musclePillText: {
    color: COLORS.text.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: FONT_SIZE.sm,
  },
  mistakeText: {
    color: COLORS.text.secondary,
    fontFamily: 'Inter_400Regular',
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.xs,
  },
  audioOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  audioOptionText: {
    color: COLORS.text.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: FONT_SIZE.md,
  },
  audioOptionToggleActive: {
    color: COLORS.brand.orange,
    fontFamily: 'Inter_700Bold',
  },
  audioOptionToggleInactive: {
    color: COLORS.text.secondary,
    fontFamily: 'Inter_700Bold',
  },
  musicTrackRow: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.bg.tertiary,
  },
  musicTrackRowActive: {
    backgroundColor: COLORS.brand.orange + '20', // slight orange tint
    borderWidth: 1,
    borderColor: COLORS.brand.orange,
  },
  musicTrackText: {
    color: COLORS.text.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: FONT_SIZE.md,
  },
  musicTrackTextActive: {
    color: COLORS.brand.orange,
    fontFamily: 'Inter_700Bold',
  },
  
  // Swap Modal Styles
  swapOptionRow: {
    padding: SPACING.md,
    backgroundColor: COLORS.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  swapOptionRowActive: {
    backgroundColor: COLORS.bg.tertiary,
    opacity: 0.6,
  },
  swapOptionName: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  swapOptionNameActive: {
    color: COLORS.text.tertiary,
  },
  swapOptionMuscles: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
  },
  modalPrimaryButton: {
    backgroundColor: COLORS.brand.orange,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
  },
});
