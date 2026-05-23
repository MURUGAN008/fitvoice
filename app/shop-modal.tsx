// ============================================
// Blaze — Pet Shop & Customization Modal
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, CARD_SHADOW } from '../constants/theme';
import { useUserStore } from '../store/userStore';
import { SHOP_ITEMS, ShopItem } from '../constants/shop';
import { 
  Coins, 
  Crown, 
  Glasses, 
  Sparkles, 
  Flame, 
  Zap, 
  Award, 
  Trophy, 
  Trees, 
  Sun, 
  Moon, 
  Lock, 
  X,
  CheckCircle2,
  Brush
} from 'lucide-react-native';

// Map shop item IDs to beautiful Lucide Icons
const SHOP_ICON_MAP: Record<string, React.ComponentType<any>> = {
  crown: Crown,
  scarf: Sparkles, // Cozy scarf -> sparkles
  headband: Award,
  glasses: Glasses,
  wings: Sparkles, // Angel wings -> sparkles
  aura: Zap, // Fire aura -> zap
  
  forest_default: Trees,
  beach: Sun,
  volcano: Flame,
  space: Moon,
};

export default function ShopModal() {
  const { petStats, buyItem, equipItem } = useUserStore();
  const [activeTab, setActiveTab] = React.useState<'accessory' | 'habitat'>('accessory');

  const handleBuyOrEquip = (item: ShopItem) => {
    const isOwned = petStats.ownedItems.includes(item.id) || item.cost === 0;
    const isLocked = petStats.level < item.requiredLevel;

    if (isLocked) {
      Alert.alert(
        "Level Locked", 
        `This item requires Level ${item.requiredLevel}. Keep working out with Blaze to unlock it!`
      );
      return;
    }

    if (isOwned) {
      // Equip it
      equipItem(item.id, item.category);
      return;
    }

    if (petStats.coins < item.cost) {
      Alert.alert(
        "Not Enough Coins", 
        `You need ${item.cost} coins but only have ${petStats.coins}. Complete workouts to earn more!`
      );
      return;
    }

    Alert.alert(
      `Purchase ${item.name}?`,
      `Spend ${item.cost} coins to unlock this customization?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock",
          onPress: () => {
            const success = buyItem(item.id, item.cost);
            if (success) {
              equipItem(item.id, item.category);
              Alert.alert("Success!", `${item.name} is now unlocked and equipped!`);
            }
          }
        }
      ]
    );
  };

  const filteredItems = SHOP_ITEMS.filter(item => item.category === activeTab);

  return (
    <View style={styles.container}>
      <View style={styles.modalContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Brush size={22} color={COLORS.brand.orange} style={{ marginRight: SPACING.sm }} />
            <Text style={styles.title}>Pet Customization</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Coins Banner */}
        <View style={styles.coinsBanner}>
          <View style={styles.coinsRow}>
            <Coins size={22} color={COLORS.brand.gold} style={{ marginRight: SPACING.xs }} />
            <Text style={styles.coinsText}>{petStats.coins} Coins</Text>
          </View>
          <Text style={styles.levelText}>Blaze Level {petStats.level}</Text>
        </View>

        {/* Category Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'accessory' && styles.tabButtonActive]}
            onPress={() => setActiveTab('accessory')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'accessory' && styles.tabButtonTextActive]}>Accessories</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'habitat' && styles.tabButtonActive]}
            onPress={() => setActiveTab('habitat')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'habitat' && styles.tabButtonTextActive]}>Habitats</Text>
          </TouchableOpacity>
        </View>

        {/* Shop Grid */}
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.grid}>
            {filteredItems.map((item) => {
              const isOwned = petStats.ownedItems.includes(item.id) || item.cost === 0;
              const isActive = item.category === 'accessory'
                ? petStats.activeAccessory === item.id
                : petStats.activeHabitat === item.id || (item.id === 'forest_default' && !petStats.activeHabitat);
              const isLocked = petStats.level < item.requiredLevel;
              const IconComponent = SHOP_ICON_MAP[item.id] || Sparkles;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.card,
                    isOwned && styles.cardOwned,
                    isActive && styles.cardActive,
                    isLocked && styles.cardLocked
                  ]}
                  onPress={() => handleBuyOrEquip(item)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.iconWrapper,
                    isActive && styles.iconWrapperActive,
                    isLocked && styles.iconWrapperLocked
                  ]}>
                    {isLocked ? (
                      <Lock size={24} color={COLORS.text.tertiary} />
                    ) : (
                      <IconComponent size={28} color={isActive ? COLORS.brand.orange : COLORS.text.primary} />
                    )}
                  </View>

                  <Text style={[styles.itemName, isLocked && styles.itemNameLocked]}>{item.name}</Text>
                  <Text style={styles.itemDesc}>{item.description}</Text>

                  {isLocked ? (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockBadgeText}>Level {item.requiredLevel}</Text>
                    </View>
                  ) : isOwned ? (
                    <View style={[styles.statusBadge, isActive && styles.statusBadgeActive]}>
                      {isActive && <CheckCircle2 size={12} color={COLORS.brand.orange} style={{ marginRight: 4 }} />}
                      <Text style={[styles.statusBadgeText, isActive && styles.statusBadgeTextActive]}>
                        {isActive ? 'Equipped' : 'Owned'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.costBadge}>
                      <Coins size={14} color={COLORS.brand.gold} style={{ marginRight: 4 }} />
                      <Text style={styles.costText}>{item.cost}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  modalContent: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  coinsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bg.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
  },
  coinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinsText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  levelText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.brand.orange,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg.tertiary,
    padding: 4,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  tabButtonActive: {
    backgroundColor: COLORS.bg.secondary,
    ...CARD_SHADOW,
  },
  tabButtonText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
  },
  tabButtonTextActive: {
    color: COLORS.brand.orange,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  card: {
    width: '47%',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    alignItems: 'center',
    marginBottom: SPACING.xs,
    position: 'relative',
  },
  cardOwned: {
    borderColor: COLORS.brand.gold + '30',
    backgroundColor: 'rgba(255, 179, 71, 0.02)',
  },
  cardActive: {
    borderColor: COLORS.brand.orange,
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
  cardLocked: {
    opacity: 0.6,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  iconWrapperLocked: {
    backgroundColor: COLORS.bg.accent,
  },
  itemName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  itemNameLocked: {
    color: COLORS.text.tertiary,
  },
  itemDesc: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 14,
    height: 28,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 179, 71, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  costText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.gold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.tertiary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.secondary,
  },
  statusBadgeTextActive: {
    color: COLORS.brand.orange,
  },
  lockBadge: {
    backgroundColor: COLORS.bg.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  lockBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.tertiary,
  },
});
