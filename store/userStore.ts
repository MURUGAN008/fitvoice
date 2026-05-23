// ============================================
// Blaze — User Store (Zustand + Persist + Supabase Sync)
// ============================================
// State is persisted LOCALLY via AsyncStorage (instant, works offline).
// State is synced to CLOUD via Supabase (durable, cross-device).
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { OnboardingData, ExerciseRecord, PersonalRecord, CustomWorkoutPlan } from '../types';
import {
  saveProfile,
  fetchProfile,
  logWorkout,
  fetchFriendsProfiles,
  addFriendByInviteCode,
  removeFriendship,
  updatePushToken,
  nudgeFriend,
  fetchNudgeStatus,
  DbProfile
} from '../lib/database';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { LEVELS } from '../constants/levels';


// ==========================================
// TYPES
// ==========================================

interface PetStats {
  level: number;
  xp: number;
  xpNeeded: number;
  energy: number; // 0 to 100
  streak: number;
  coins: number;
  restTokens: number;
  lastWorkoutDate: string | null;
  ownedItems: string[]; // IDs of purchased shop items
  activeAccessory: string | null; // Currently equipped accessory ID
  activeHabitat: string | null; // Currently equipped habitat theme ID
  league: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  inviteCode?: string;
}

interface WorkoutLogEntry {
  preset: string | null;
  exercises: { name: string; duration: number; difficulty: number }[];
  totalDurationSecs: number;
  totalXp: number;
  completedAt: string;
  mood?: string;
}

interface UserState {
  // Auth (NOT persisted — managed by Supabase session)
  session: Session | null;
  isLoading: boolean;

  // Persisted state
  isOnboarded: boolean;
  onboardingData: OnboardingData;
  petStats: PetStats;
  workoutHistory: WorkoutLogEntry[];
  exerciseHistory: ExerciseRecord[];
  favoriteExercises: string[];
  workoutSchedule: Record<number, string | null>;
  savedCustomWorkouts: CustomWorkoutPlan[];

  // Actions — Auth
  setSession: (session: Session | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsOnboarded: (onboarded: boolean) => void;

  // Actions — Onboarding
  updateOnboarding: (data: Partial<OnboardingData>) => void;
  resetOnboarding: () => void;
  updateSchedule: (day: number, presetId: string | null) => void;

  // Actions — Gamification
  updatePetStats: (updates: Partial<PetStats>) => void;
  addXp: (amount: number) => void;
  useRestToken: () => void;
  calculateStreak: () => void;

  // Actions — Workout History
  completeWorkout: (entry: Omit<WorkoutLogEntry, 'completedAt'>) => void;

  // Actions — Progressive Overload
  getPersonalRecords: () => PersonalRecord[];
  getPersonalRecord: (exerciseId: string) => PersonalRecord | null;
  getLastPerformance: (exerciseId: string) => ExerciseRecord | null;
  toggleFavorite: (exerciseId: string) => void;

  // Actions — Shop
  buyItem: (itemId: string, cost: number, requiredLevel?: number) => boolean;
  equipItem: (itemId: string, type: 'accessory' | 'habitat') => void;

  // Actions - Custom Workouts
  saveCustomWorkout: (plan: CustomWorkoutPlan) => void;
  deleteCustomWorkout: (id: string) => void;

  friendsList: DbProfile[];
  addFriend: (code: string) => Promise<{ success: boolean; errorMsg?: string }>;
  removeFriend: (friendId: string) => Promise<boolean>;
  loadFriends: () => Promise<void>;
  registerPushToken: () => Promise<void>;
  sendFriendNudge: (friendId: string) => Promise<{ success: boolean; errorMsg?: string }>;
  checkIncomingNudges: () => Promise<string | null>;


  // Actions — Cloud Sync
  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
}

// ==========================================
// DEFAULTS
// ==========================================

const defaultOnboarding: OnboardingData = {
  name: '',
  gender: null,
  age: null,
  height_cm: null,
  weight_kg: null,
  goal: null,
  fitness_level: null,
  days_per_week: 3,
  workout_days: [1, 3, 5],
  session_duration_mins: 20,
  injuries: [],
  pet_name: 'Blaze',
};

const defaultPetStats: PetStats = {
  level: 1,
  xp: 0,
  xpNeeded: 100,
  energy: 20,
  streak: 0,
  coins: 0,
  restTokens: 1,
  lastWorkoutDate: null,
  ownedItems: [],
  activeAccessory: null,
  activeHabitat: null,
  league: 'Bronze',
  inviteCode: '',
};

// ==========================================
// HELPERS
// ==========================================

/** Check if two ISO date strings fall on the same calendar day */
function isSameDay(a: string, b: string): boolean {
  return a.substring(0, 10) === b.substring(0, 10);
}

/** Check if date A is exactly one calendar day before date B */
function isYesterday(a: string, b: string): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  const diff = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate()).getTime() -
               new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate()).getTime();
  return diff === 86400000; // exactly 1 day in ms
}

// ==========================================
// STORE
// ==========================================

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      session: null,
      isLoading: true,
      isOnboarded: false,
      onboardingData: { ...defaultOnboarding },
      petStats: { ...defaultPetStats },
      workoutHistory: [],
      exerciseHistory: [],
      favoriteExercises: [],
      workoutSchedule: {
        0: null,
        1: 'full_body',
        2: null,
        3: 'core',
        4: null,
        5: 'lower_body',
        6: null,
      },
      savedCustomWorkouts: [],
      friendsList: [],

      // Auth actions (NOT persisted — session managed by Supabase SecureStore)
      setSession: (session) => set({ session }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsOnboarded: (isOnboarded) => {
        set({ isOnboarded });
        // Also persist to cloud when onboarding completes
        if (isOnboarded) {
          setTimeout(() => get().syncToCloud(), 500);
        }
      },

      // Onboarding actions
      updateOnboarding: (data) => set((state) => ({ onboardingData: { ...state.onboardingData, ...data } })),
      resetOnboarding: () => set({ isOnboarded: false, onboardingData: { ...defaultOnboarding } }),
      
      updateSchedule: (day: number, presetId: string | null) => {
        set((state) => ({
          workoutSchedule: {
            ...state.workoutSchedule,
            [day]: presetId,
          }
        }));
      },

      // Gamification actions
      updatePetStats: (updates) =>
        set((state) => ({
          petStats: { ...state.petStats, ...updates },
        })),

      addXp: (amount) =>
        set((state) => {
          let newXp = state.petStats.xp + amount;
          let newLevel = state.petStats.level;
          let newXpNeeded = state.petStats.xpNeeded;

          // Level up logic — use LEVELS thresholds, while loop for multi-level-ups
          while (newXp >= newXpNeeded) {
            newXp -= newXpNeeded;
            newLevel += 1;
            // Use fixed thresholds from LEVELS: XP gap between this level and next
            const nextLevelInfo = LEVELS.find((l) => l.level === newLevel + 1);
            const currentLevelInfo = LEVELS.find((l) => l.level === newLevel);
            if (nextLevelInfo && currentLevelInfo) {
              newXpNeeded = nextLevelInfo.xpRequired - currentLevelInfo.xpRequired;
            } else {
              // Max level reached — set very high xpNeeded so no further level-ups
              newXpNeeded = 999999;
            }
          }

          return {
            petStats: {
              ...state.petStats,
              xp: newXp,
              level: newLevel,
              xpNeeded: newXpNeeded,
              energy: 100,
              lastWorkoutDate: new Date().toISOString(),
            },
          };
        }),

      calculateStreak: () =>
        set((state) => {
          const { lastWorkoutDate, streak, restTokens, energy } = state.petStats;
          const today = new Date().toISOString();

          if (!lastWorkoutDate) {
            return { petStats: { ...state.petStats, streak: 0 } };
          }

          // If already worked out today, keep current streak
          if (isSameDay(lastWorkoutDate, today)) {
            return state;
          }

          // Calculate days since last workout for gradual energy decay
          const lastDate = new Date(lastWorkoutDate);
          const nowDate = new Date(today);
          const msSinceLastWorkout =
            new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime() -
            new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
          const daysSinceLastWorkout = Math.floor(msSinceLastWorkout / 86400000);

          // Gradual energy decay: -5 per missed day (days where no workout occurred)
          const missedDays = Math.max(0, daysSinceLastWorkout - 1); // yesterday counts as 0 missed
          const decayedEnergy = missedDays > 0
            ? Math.max(0, energy - missedDays * 5)
            : energy;

          // If last workout was yesterday, increment streak
          if (isYesterday(lastWorkoutDate, today)) {
            const newStreak = streak + 1;
            return {
              petStats: {
                ...state.petStats,
                energy: decayedEnergy,
                streak: newStreak,
                // Every 3 day streak rewards a rest token
                restTokens: newStreak > 0 && newStreak % 3 === 0
                  ? restTokens + 1
                  : restTokens,
              },
            };
          }

          // More than 1 day gap → streak breaks, extra -20 penalty
          return {
            petStats: {
              ...state.petStats,
              streak: 0,
              energy: Math.max(0, decayedEnergy - 20),
            },
          };
        }),

      useRestToken: () =>
        set((state) => {
          if (state.petStats.restTokens > 0) {
            return {
              petStats: {
                ...state.petStats,
                restTokens: state.petStats.restTokens - 1,
                lastWorkoutDate: new Date().toISOString(),
              },
            };
          }
          return state;
        }),

      // Workout history
      completeWorkout: (entry) => {
        const completedEntry: WorkoutLogEntry = {
          ...entry,
          completedAt: new Date().toISOString(),
        };

        // Also record per-exercise history for progressive overload tracking
        const exerciseRecords: ExerciseRecord[] = entry.exercises.map((ex) => ({
          exerciseId: ex.name.toLowerCase().replace(/[^a-z0-9]/g, '_'), // deterministic ID from name
          exerciseName: ex.name,
          durationSecs: ex.duration,
          completedAt: completedEntry.completedAt,
          preset: entry.preset,
        }));

        set((state) => ({
          workoutHistory: [completedEntry, ...state.workoutHistory].slice(0, 100),
          exerciseHistory: [...exerciseRecords, ...state.exerciseHistory].slice(0, 500),
          // Award coins based on workout duration (1 coin per minute, minimum 3)
          petStats: {
            ...state.petStats,
            coins: state.petStats.coins + Math.max(3, Math.floor(entry.totalDurationSecs / 60)),
          },
        }));

        // Also save to Supabase cloud (fire and forget — non-blocking)
        logWorkout({
          preset: entry.preset,
          exercises: entry.exercises,
          total_duration_secs: entry.totalDurationSecs,
          total_xp: entry.totalXp,
        }).catch((e) => console.error('Cloud workout log failed:', e));
      },

      // Progressive Overload — compute personal records from exercise history
      // exerciseHistory is newest-first: the first entry per exercise is the most recent.
      getPersonalRecords: () => {
        const { exerciseHistory } = get();
        const recordMap = new Map<string, PersonalRecord>();

        for (const rec of exerciseHistory) {
          const existing = recordMap.get(rec.exerciseId);
          if (!existing) {
            // First entry encountered = newest for this exercise
            recordMap.set(rec.exerciseId, {
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              bestDurationSecs: rec.durationSecs,
              totalSessions: 1,
              lastDurationSecs: rec.durationSecs,
              lastDate: rec.completedAt,
              bestDate: rec.completedAt,
              improvedFromLast: false,
            });
          } else {
            const isLonger = rec.durationSecs > existing.bestDurationSecs;
            // rec is OLDER than existing (newest-first order).
            // improvedFromLast = did the newest (existing.lastDurationSecs) beat this older entry?
            const improved = existing.lastDurationSecs > rec.durationSecs;
            recordMap.set(rec.exerciseId, {
              ...existing,
              bestDurationSecs: isLonger ? rec.durationSecs : existing.bestDurationSecs,
              bestDate: isLonger ? rec.completedAt : existing.bestDate,
              totalSessions: existing.totalSessions + 1,
              // Keep lastDurationSecs/lastDate as the newest (first encountered)
              improvedFromLast: improved,
            });
          }
        }

        return Array.from(recordMap.values());
      },

      getPersonalRecord: (exerciseId: string) => {
        const records = get().getPersonalRecords();
        return records.find((r) => r.exerciseId === exerciseId) || null;
      },

      getLastPerformance: (exerciseId: string) => {
        const { exerciseHistory } = get();
        return exerciseHistory.find((r) => r.exerciseId === exerciseId) || null;
      },

      toggleFavorite: (exerciseId: string) => {
        set((state) => {
          const isFav = state.favoriteExercises.includes(exerciseId);
          return {
            favoriteExercises: isFav
              ? state.favoriteExercises.filter((id) => id !== exerciseId)
              : [...state.favoriteExercises, exerciseId],
          };
        });
      },

      // Shop — buy an item with coins, returns true if purchase succeeded
      buyItem: (itemId: string, cost: number, requiredLevel?: number) => {
        const { petStats } = get();
        // Check level requirement
        if (requiredLevel !== undefined && petStats.level < requiredLevel) return false;
        if (petStats.coins < cost) return false;
        if (petStats.ownedItems.includes(itemId)) return false;

        set((state) => ({
          petStats: {
            ...state.petStats,
            coins: state.petStats.coins - cost,
            ownedItems: [...state.petStats.ownedItems, itemId],
          },
        }));
        return true;
      },

      // Shop — equip an owned item
      equipItem: (itemId: string, type: 'accessory' | 'habitat') => {
        set((state) => {
          if (type === 'accessory') {
            return { petStats: { ...state.petStats, activeAccessory: itemId === state.petStats.activeAccessory ? null : itemId } };
          } else {
            return { petStats: { ...state.petStats, activeHabitat: itemId } };
          }
        });
      },

      // Custom Workouts
      saveCustomWorkout: (plan) => {
        set((state) => {
          const exists = state.savedCustomWorkouts.find(w => w.id === plan.id);
          if (exists) {
            return {
              savedCustomWorkouts: state.savedCustomWorkouts.map(w => w.id === plan.id ? plan : w)
            };
          }
          return {
            savedCustomWorkouts: [...state.savedCustomWorkouts, plan]
          };
        });
      },

      deleteCustomWorkout: (id) => {
        set((state) => ({
          savedCustomWorkouts: state.savedCustomWorkouts.filter(w => w.id !== id)
        }));
      },

      addFriend: async (code) => {
        const { success, errorMsg } = await addFriendByInviteCode(code);
        if (success) {
          await get().loadFriends();
        }
        return { success, errorMsg };
      },

      removeFriend: async (friendId) => {
        const success = await removeFriendship(friendId);
        if (success) {
          set((state) => ({
            friendsList: state.friendsList.filter((f) => f.id !== friendId),
          }));
        }
        return success;
      },

      loadFriends: async () => {
        try {
          const profiles = await fetchFriendsProfiles();
          set({ friendsList: profiles });
        } catch (e) {
          console.error('loadFriends failed:', e);
        }
      },

      registerPushToken: async () => {
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            await updatePushToken(token);
            console.log('Push token successfully registered to Supabase profile.');
          }
        } catch (e) {
          console.error('registerPushToken failed:', e);
        }
      },

      sendFriendNudge: async (friendId) => {
        const res = await nudgeFriend(friendId);
        if (res.success) {
          // Reward: +5 Coins and +5 XP
          get().addXp(5);
          set((s) => ({
            petStats: {
              ...s.petStats,
              coins: s.petStats.coins + 5,
            }
          }));

          // Re-load friends to update nudge timestamps on the client immediately
          await get().loadFriends();

          // Sync updated profile to cloud (save coins and XP rewards)
          await get().syncToCloud();
        }
        return res;
      },

      checkIncomingNudges: async () => {
        try {
          return await fetchNudgeStatus();
        } catch (e) {
          console.error('checkIncomingNudges failed:', e);
          return null;
        }
      },


      // Cloud sync
      syncToCloud: async () => {
        const state = get();
        try {
          let inviteCode = state.petStats.inviteCode;
          if (!inviteCode && state.session?.user?.id) {
            inviteCode = `BLAZE-${state.session.user.id.substring(0, 8).toUpperCase()}`;
            set((s) => ({ petStats: { ...s.petStats, inviteCode } }));
          }

          await saveProfile({
            name: state.onboardingData.name,
            gender: state.onboardingData.gender,
            age: state.onboardingData.age,
            height_cm: state.onboardingData.height_cm,
            weight_kg: state.onboardingData.weight_kg,
            goal: state.onboardingData.goal,
            fitness_level: state.onboardingData.fitness_level,
            session_duration_mins: state.onboardingData.session_duration_mins,
            injuries: state.onboardingData.injuries,
            workout_days: state.onboardingData.workout_days,
            pet_name: state.onboardingData.pet_name,
            level: state.petStats.level,
            xp: state.petStats.xp,
            xp_needed: state.petStats.xpNeeded,
            energy: state.petStats.energy,
            streak: state.petStats.streak,
            coins: state.petStats.coins,
            rest_tokens: state.petStats.restTokens,
            last_workout_date: state.petStats.lastWorkoutDate,
            is_onboarded: state.isOnboarded,
            owned_items: state.petStats.ownedItems,
            active_accessory: state.petStats.activeAccessory,
            active_habitat: state.petStats.activeHabitat,
            invite_code: inviteCode,
          });
        } catch (e) {
          console.error('syncToCloud failed:', e);
        }
      },

      loadFromCloud: async () => {
        try {
          const profile = await fetchProfile();
          if (!profile) return;

          set({
            isOnboarded: profile.is_onboarded,
            onboardingData: {
              name: profile.name || '',
              gender: profile.gender as any,
              age: profile.age,
              height_cm: profile.height_cm,
              weight_kg: profile.weight_kg,
              goal: profile.goal as any,
              fitness_level: profile.fitness_level as any,
              days_per_week: profile.workout_days?.length || 3,
              workout_days: profile.workout_days || [1, 3, 5],
              session_duration_mins: profile.session_duration_mins || 20,
              injuries: (profile.injuries || []) as any,
              pet_name: profile.pet_name || 'Blaze',
            },
            petStats: {
              level: profile.level || 1,
              xp: profile.xp || 0,
              xpNeeded: profile.xp_needed || 100,
              energy: profile.energy || 20,
              streak: profile.streak || 0,
              coins: profile.coins || 0,
              restTokens: profile.rest_tokens || 1,
              lastWorkoutDate: profile.last_workout_date || null,
              ownedItems: (profile as any).owned_items || [],
              activeAccessory: (profile as any).active_accessory || null,
              activeHabitat: (profile as any).active_habitat || null,
              league: (profile as any).league || 'Bronze',
              inviteCode: profile.invite_code || '',
            },
          });
        } catch (e) {
          console.error('loadFromCloud failed:', e);
        }
      },
    }),
    {
      name: 'blaze-user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these keys (NOT session, NOT isLoading)
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
        onboardingData: state.onboardingData,
        petStats: state.petStats,
        workoutHistory: state.workoutHistory,
        exerciseHistory: state.exerciseHistory,
        favoriteExercises: state.favoriteExercises,
        workoutSchedule: state.workoutSchedule,
        savedCustomWorkouts: state.savedCustomWorkouts,
        friendsList: state.friendsList,
      }),
    }
  )
);
