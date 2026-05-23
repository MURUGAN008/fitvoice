// ============================================
// Blaze — Type Definitions
// ============================================

// --- User & Profile ---
export type Gender = 'male' | 'female' | 'other';
export type FitnessGoal = 'lose_weight' | 'build_muscle' | 'stay_active' | 'flexibility';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type SubscriptionTier = 'free' | 'pro';
export type Injury = 'knee' | 'lower_back' | 'shoulder' | 'wrist' | 'neck';

export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  height_cm: number;
  weight_kg: number;
  fitness_level: FitnessLevel;
  goal: FitnessGoal;
  days_per_week: number;
  session_duration_mins: number;
  injuries: Injury[];
  pet_name: string;
  pet_stage: number;
  pet_mood: PetMood;
  xp: number;
  level: number;
  streak_days: number;
  last_workout_date: string | null;
  subscription_tier: SubscriptionTier;
  created_at: string;
}

// --- Pet System ---
export type PetMood = 'happy' | 'content' | 'tired' | 'sad' | 'sleeping';

export interface PetState {
  name: string;
  stage: number; // 1-6
  mood: PetMood;
  energy: number; // 0-100
  totalTreats: number;
  accessories: string[];
  explorationArea: string | null;
  isExploring: boolean;
}

export const PET_STAGES = {
  1: { name: 'Egg', minDays: 0, description: 'A warm, glowing egg' },
  2: { name: 'Kit', minDays: 4, description: 'A tiny, curious fox kit' },
  3: { name: 'Young', minDays: 8, description: 'A playful young fox' },
  4: { name: 'Athletic', minDays: 22, description: 'A lean, confident fox' },
  5: { name: 'Champion', minDays: 46, description: 'A powerful champion' },
  6: { name: 'Legendary', minDays: 91, description: 'The legendary Blaze' },
} as const;

// --- Exercises ---
export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core' | 'cardio';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscle_group: string;
  youtube_embed_id: string;
  instructions: string;
  landmarks_config: Record<string, unknown> | null;
  difficulty: Difficulty;
  met_value: number;
}

// --- Workouts ---
export interface WorkoutPlan {
  id: string;
  user_id: string;
  name: string;
  duration_weeks: number;
  days_per_week: number;
  plan_json: WorkoutDay[];
  generated_by_ai: boolean;
  created_at: string;
}

export interface WorkoutDay {
  day: string; // 'Monday', 'Wednesday', etc.
  exercises: WorkoutExercise[];
  estimated_duration_mins: number;
}

export interface WorkoutExercise {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
}

export interface CustomWorkoutPlan {
  id: string;
  name: string;
  exercises: {
    id: string;
    duration: number; // in seconds
  }[];
  restDuration?: number;
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  plan_id: string | null;
  date: string;
  duration_mins: number;
  xp_earned: number;
  form_score: number;
  calories_burned: number;
  completed: boolean;
  created_at: string;
}

export interface SetLog {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed: number;
  target_reps: number;
  form_score: number;
  timestamp: string;
}

// --- Gamification ---
export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  condition_type: 'sessions' | 'streak' | 'form' | 'time_of_day' | 'reps';
  condition_value: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  badge?: Badge;
  earned_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'boss';
  target_value: number;
  xp_reward: number;
  badge_reward_id: string | null;
  expires_at: string;
  created_at: string;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  challenge?: Challenge;
  progress: number;
  completed: boolean;
  completed_at: string | null;
}

// --- Leaderboard ---
export interface LeaderboardEntry {
  id: string;
  user_id: string;
  profile?: Pick<Profile, 'name' | 'level' | 'pet_stage'>;
  week_start: string;
  xp_earned: number;
  workouts_completed: number;
}

// --- Voice Agent ---
export interface VoiceInteraction {
  id: string;
  user_id: string;
  session_id: string;
  user_transcript: string;
  agent_response: string;
  action_taken: string | null;
  timestamp: string;
}

export interface GroqResponse {
  message: string;
  action: string | null;
}

// --- Progressive Overload / Exercise Tracking ---

/** Tracks a single exercise performance in a completed workout */
export interface ExerciseRecord {
  exerciseId: string;
  exerciseName: string;
  durationSecs: number;       // How long the exercise lasted
  completedAt: string;        // ISO date of the workout
  preset: string | null;      // Which workout preset was used
}

/** Personal best for a specific exercise */
export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  bestDurationSecs: number;   // Longest time completed for this exercise
  totalSessions: number;      // How many times this exercise has been done
  lastDurationSecs: number;   // Duration in the most recent session
  lastDate: string | null;    // Date of most recent session
  bestDate: string | null;    // Date of personal best
  improvedFromLast: boolean;  // Did they beat their previous session?
}

// --- Onboarding ---
export interface OnboardingData {
  name: string;
  gender: Gender | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: FitnessGoal | null;
  fitness_level: FitnessLevel | null;
  days_per_week: number;
  workout_days: number[];
  session_duration_mins: number;
  injuries: Injury[];
  pet_name: string;
}

// --- Navigation ---
export type AuthScreen = 'login' | 'signup' | 'onboarding';
