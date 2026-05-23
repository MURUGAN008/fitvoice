// ============================================
// Blaze — Design Theme
// ============================================

export const COLORS = {
  // Background layers
  bg: {
    primary: '#05050A',      // Pure deep dark — main background
    secondary: '#101018',    // Cards
    tertiary: '#1A1A24',     // Elevated elements
    accent: '#2A2A3A',       // Borders, dividers
  },

  // Brand colors (fox/flame theme)
  brand: {
    orange: '#FF6B35',       // Primary brand — Blaze's fur
    flame: '#FF4500',        // Darker flame
    gold: '#FFB347',         // XP, rewards, highlights
    yellow: '#FFB347',       // Alias for gold — used across workout screens
    ember: '#FF8C42',        // Warm accent
    sunset: '#FF6B6B',       // Streak fire
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0C0',    // Muted text
    tertiary: '#6B6B8A',     // Disabled / hint text
    accent: '#FF6B35',       // Highlighted text
  },

  // UI States
  state: {
    success: '#4ADE80',      // Green — completed, good form
    warning: '#FBBF24',      // Yellow — medium form
    error: '#EF4444',        // Red — bad form, errors
    info: '#60A5FA',         // Blue — informational
  },

  // Pet moods
  pet: {
    happy: '#4ADE80',
    content: '#60A5FA',
    tired: '#FBBF24',
    sad: '#A78BFA',
    sleeping: '#6B7280',
  },

  // Gradients (as arrays for LinearGradient)
  gradient: {
    brand: ['#FF6B35', '#FF4500'],
    gold: ['#FFB347', '#FF8C42'],
    dark: ['#05050A', '#101018'],
    card: ['#1A1A24', '#101018'],
    fire: ['#FF6B35', '#FF4500', '#FF6B6B'],
    success: ['#4ADE80', '#22C55E'],
    bronze: ['#CD7F32', '#8B5A2B'],
    silver: ['#E0E0E0', '#9E9E9E'],
    premiumGold: ['#FFD700', '#DAA520', '#B8860B'],
    diamond: ['#E0FFFF', '#B9F2FF', '#8EE5EE'],
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  hero: 48,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

// Shared shadow for elevated cards
export const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.5,
  shadowRadius: 16,
  elevation: 12,
} as const;

