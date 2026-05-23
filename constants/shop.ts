// ============================================
// Blaze — Pet Shop Items
// ============================================

export type ShopCategory = 'accessory' | 'habitat';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ShopCategory;
  cost: number;
  requiredLevel: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  // === ACCESSORIES ===
  {
    id: 'crown',
    name: 'Fire Crown',
    description: 'A blazing crown for your champion fox',
    icon: '👑',
    category: 'accessory',
    cost: 25,
    requiredLevel: 1,
  },
  {
    id: 'scarf',
    name: 'Cozy Scarf',
    description: 'Keep Blaze warm on cold training days',
    icon: '🧣',
    category: 'accessory',
    cost: 15,
    requiredLevel: 1,
  },
  {
    id: 'headband',
    name: 'Power Headband',
    description: 'Channel your inner warrior',
    icon: '🎗️',
    category: 'accessory',
    cost: 20,
    requiredLevel: 3,
  },
  {
    id: 'glasses',
    name: 'Cool Shades',
    description: 'Look cool while crushing workouts',
    icon: '🕶️',
    category: 'accessory',
    cost: 30,
    requiredLevel: 5,
  },
  {
    id: 'wings',
    name: 'Angel Wings',
    description: 'Your fox has ascended to legendary status',
    icon: '🪽',
    category: 'accessory',
    cost: 75,
    requiredLevel: 10,
  },
  {
    id: 'aura',
    name: 'Fire Aura',
    description: 'Surround Blaze with living flame',
    icon: '🔥',
    category: 'accessory',
    cost: 100,
    requiredLevel: 15,
  },

  // === HABITATS ===
  {
    id: 'forest_default',
    name: 'Forest Home',
    description: 'The default forest habitat',
    icon: '🌲',
    category: 'habitat',
    cost: 0,
    requiredLevel: 1,
  },
  {
    id: 'beach',
    name: 'Sunset Beach',
    description: 'Relax on warm sandy shores',
    icon: '🏖️',
    category: 'habitat',
    cost: 40,
    requiredLevel: 3,
  },
  {
    id: 'volcano',
    name: 'Volcano Peak',
    description: 'Train at the edge of a fiery volcano',
    icon: '🌋',
    category: 'habitat',
    cost: 60,
    requiredLevel: 7,
  },
  {
    id: 'space',
    name: 'Cosmic Void',
    description: 'Float among the stars with Blaze',
    icon: '🌌',
    category: 'habitat',
    cost: 120,
    requiredLevel: 12,
  },
];
