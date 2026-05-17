// ============================================
// Blaze — User Store (Zustand)
// ============================================

import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { Profile, OnboardingData, PetMood } from '../types';

interface UserState {
  // Auth
  session: Session | null;
  isLoading: boolean;
  isOnboarded: boolean;

  // Profile
  profile: Profile | null;

  // Gamification (Temporary until DB sync)
  petStats: {
    level: number;
    xp: number;
    xpNeeded: number;
    energy: number; // 0 to 100
    streak: number;
    coins: number;
  };

  // Onboarding data (temporary, before profile is created)
  onboardingData: OnboardingData;

  // Actions — Auth
  setSession: (session: Session | null) => void;
  setIsLoading: (loading: boolean) => void;
  setIsOnboarded: (onboarded: boolean) => void;

  // Actions — Profile
  setProfile: (profile: Profile | null) => void;
  updateProfile: (updates: Partial<Profile>) => void;

  // Actions — Onboarding
  updateOnboarding: (data: Partial<OnboardingData>) => void;
  resetOnboarding: () => void;

  // Actions — Gamification
  updatePetStats: (updates: Partial<UserState['petStats']>) => void;
  addXp: (amount: number) => void;
}

const defaultOnboarding: OnboardingData = {
  name: '',
  gender: null,
  age: null,
  height_cm: null,
  weight_kg: null,
  goal: null,
  fitness_level: null,
  days_per_week: 3,
  session_duration_mins: 20,
  injuries: [],
  pet_name: 'Blaze',
};

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  session: null,
  isLoading: true,
  isOnboarded: false,
  profile: null,
  petStats: {
    level: 1,
    xp: 0,
    xpNeeded: 100,
    energy: 20, // Starts low to motivate working out!
    streak: 0,
    coins: 0,
  },
  onboardingData: { ...defaultOnboarding },

  // Auth actions
  setSession: (session) => set({ session }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsOnboarded: (isOnboarded) => set({ isOnboarded }),

  // Profile actions
  setProfile: (profile) => set({ profile }),
  updateProfile: (updates) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    })),

  // Onboarding actions
  updateOnboarding: (data) =>
    set((state) => ({
      onboardingData: { ...state.onboardingData, ...data },
    })),
  resetOnboarding: () =>
    set({ onboardingData: { ...defaultOnboarding } }),

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

      // Simple level up logic
      if (newXp >= newXpNeeded) {
        newLevel += 1;
        newXp -= newXpNeeded;
        newXpNeeded = Math.floor(newXpNeeded * 1.5); // Next level requires 50% more XP
      }

      return {
        petStats: {
          ...state.petStats,
          xp: newXp,
          level: newLevel,
          xpNeeded: newXpNeeded,
          energy: 100, // Full energy after workout!
        },
      };
    }),
}));
