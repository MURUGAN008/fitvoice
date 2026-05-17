// ============================================
// Blaze — Level Definitions
// ============================================

export interface LevelInfo {
  level: number;
  title: string;
  xpRequired: number;
  icon: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1,  title: 'Rookie',      xpRequired: 0,     icon: '🌱' },
  { level: 2,  title: 'Starter',     xpRequired: 100,   icon: '🌿' },
  { level: 3,  title: 'Active',      xpRequired: 250,   icon: '☘️' },
  { level: 4,  title: 'Consistent',  xpRequired: 450,   icon: '⭐' },
  { level: 5,  title: 'Warrior',     xpRequired: 700,   icon: '⚔️' },
  { level: 6,  title: 'Fighter',     xpRequired: 1000,  icon: '🛡️' },
  { level: 7,  title: 'Athlete',     xpRequired: 1400,  icon: '🏅' },
  { level: 8,  title: 'Titan',       xpRequired: 1900,  icon: '💎' },
  { level: 9,  title: 'Crusher',     xpRequired: 2500,  icon: '🔥' },
  { level: 10, title: 'Beast',       xpRequired: 3200,  icon: '🐺' },
  { level: 11, title: 'Destroyer',   xpRequired: 4000,  icon: '💥' },
  { level: 12, title: 'Unstoppable', xpRequired: 5000,  icon: '⚡' },
  { level: 13, title: 'Immortal',    xpRequired: 6200,  icon: '🌟' },
  { level: 14, title: 'Champion',    xpRequired: 7500,  icon: '🏆' },
  { level: 15, title: 'Elite',       xpRequired: 9000,  icon: '👑' },
  { level: 16, title: 'Master',      xpRequired: 11000, icon: '🎯' },
  { level: 17, title: 'Grandmaster', xpRequired: 13500, icon: '🌠' },
  { level: 18, title: 'Mythic',      xpRequired: 16500, icon: '🐉' },
  { level: 19, title: 'Ascended',    xpRequired: 20000, icon: '✨' },
  { level: 20, title: 'Legend',      xpRequired: 25000, icon: '🦊' },
];

/**
 * Get the level info for a given amount of XP.
 */
export function getLevelForXP(xp: number): LevelInfo {
  let currentLevel = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.xpRequired) {
      currentLevel = level;
    } else {
      break;
    }
  }
  return currentLevel;
}

/**
 * Get XP needed to reach the next level.
 * Returns null if max level.
 */
export function getXPToNextLevel(xp: number): { current: number; needed: number; progress: number } | null {
  const currentLevel = getLevelForXP(xp);
  const currentIndex = LEVELS.findIndex(l => l.level === currentLevel.level);
  
  if (currentIndex >= LEVELS.length - 1) {
    return null; // Max level reached
  }
  
  const nextLevel = LEVELS[currentIndex + 1];
  const xpInCurrentLevel = xp - currentLevel.xpRequired;
  const xpNeededForNext = nextLevel.xpRequired - currentLevel.xpRequired;
  
  return {
    current: xpInCurrentLevel,
    needed: xpNeededForNext,
    progress: xpInCurrentLevel / xpNeededForNext,
  };
}
