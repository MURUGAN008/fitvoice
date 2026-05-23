import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, CARD_SHADOW } from '../../constants/theme';
import { useUserStore } from '../../store/userStore';
import GradientHeader from '../../components/GradientHeader';
import { LinearGradient } from 'expo-linear-gradient';
import PetAvatar from '../../components/PetAvatar';
import { fetchGlobalLeaderboard, DbProfile } from '../../lib/database';
import { Trophy, ArrowUp, ArrowDown, Copy, Check, UserPlus, Trash2, Users, Zap } from 'lucide-react-native';
import StrokeText from '../../components/StrokeText';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export default function LeagueScreen() {
  const { 
    petStats, 
    onboardingData, 
    workoutHistory, 
    session,
    friendsList,
    addFriend,
    removeFriend,
    loadFriends,
    sendFriendNudge
  } = useUserStore();

  const userName = onboardingData.name || 'You';
  const currentLeague = petStats.league || 'Bronze';

  const [dbRivals, setDbRivals] = useState<Partial<DbProfile>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global');
  const [inviteInput, setInviteInput] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nudgingIds, setNudgingIds] = useState<Record<string, boolean>>({});

  const hasNudgedToday = (friend: DbProfile) => {
    if (!friend.friendship_initiator_id || !session?.user?.id) return false;
    
    const nudgedAt = friend.friendship_initiator_id === session.user.id
      ? friend.user_nudged_friend_at
      : friend.friend_nudged_user_at;
      
    if (!nudgedAt) return false;
    const todayStr = new Date().toISOString().substring(0, 10);
    return nudgedAt.substring(0, 10) === todayStr;
  };

  const isFriendWorkoutDueToday = (friend: DbProfile) => {
    const todayDay = new Date().getDay();
    const todayStr = new Date().toISOString().substring(0, 10);
    
    // Check if friend has workout scheduled today
    const isScheduled = friend.workout_days?.includes(todayDay);
    
    // Check if friend has NOT completed workout today
    const completedToday = friend.last_workout_date && friend.last_workout_date.substring(0, 10) === todayStr;
    
    return isScheduled && !completedToday;
  };

  const nudgeableFriends = useMemo(() => {
    return friendsList.filter(isFriendWorkoutDueToday);
  }, [friendsList]);

  const handleNudge = async (friend: DbProfile) => {
    setNudgingIds(prev => ({ ...prev, [friend.id]: true }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const res = await sendFriendNudge(friend.id);
    
    setNudgingIds(prev => ({ ...prev, [friend.id]: false }));
    
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Nudge Sent! 📣',
        `You nudged ${friend.name || 'your friend'} to do their workout today!\n\nReward: +5 Coins & +5 XP! 🪙✨`
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', res.errorMsg || 'Failed to nudge friend.');
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([
        fetchGlobalLeaderboard(20).then(data => setDbRivals(data)),
        loadFriends()
      ]);
      setLoading(false);
    }
    loadData();
  }, [loadFriends]);

  const inviteCode = useMemo(() => {
    return petStats.inviteCode || (session?.user?.id ? `BLAZE-${session.user.id.substring(0, 8).toUpperCase()}` : 'BLAZE-UNKNOWN');
  }, [petStats.inviteCode, session]);

  const handleTabChange = (tab: 'global' | 'friends') => {
    setActiveTab(tab);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = async () => {
    if (!inviteInput.trim()) return;
    setAddingFriend(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { success, errorMsg } = await addFriend(inviteInput);
    setAddingFriend(false);
    if (success) {
      setInviteInput('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Friend added successfully!');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', errorMsg || 'Could not add friend.');
    }
  };

  const handleRemoveFriend = (friendId: string, friendName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            const success = await removeFriend(friendId);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', `${friendName} has been removed.`);
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Failed to remove friend.');
            }
          }
        }
      ]
    );
  };

  const weeklyXp = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    return workoutHistory
      .filter(w => new Date(w.completedAt) >= startOfWeek)
      .reduce((sum, w) => sum + (w.totalXp || 0), 0);
  }, [workoutHistory]);

  const leaderboard = useMemo(() => {
    const currentUserId = session?.user?.id;
    
    // Convert DbProfiles to leaderboard items
    const parsedRivals = dbRivals.map(rival => ({
      id: rival.id,
      name: rival.name || 'Anonymous',
      xp: rival.xp || 0,
      level: rival.level || 1,
      isUser: rival.id === currentUserId,
    }));

    // If the local user isn't in the DB list (due to RLS or just not syncing recently), inject them
    if (!parsedRivals.some(r => r.isUser)) {
      parsedRivals.push({
        id: 'local_user',
        name: userName,
        xp: petStats.xp, // using total XP since global leaderboard relies on it
        level: petStats.level,
        isUser: true,
      });
    }

    // Sort descending by XP
    parsedRivals.sort((a, b) => b.xp - a.xp);

    return parsedRivals.slice(0, 20); // Keep top 20
  }, [dbRivals, session, userName, petStats.xp, petStats.level]);

  const friendsLeaderboard = useMemo(() => {
    const currentUserId = session?.user?.id || 'local_user';
    const userEntry = {
      id: currentUserId,
      name: userName + ' (You)',
      xp: petStats.xp,
      level: petStats.level,
      streak: petStats.streak,
      active_accessory: petStats.activeAccessory,
      isUser: true,
    };

    const list = friendsList.map(f => ({
      id: f.id,
      name: f.name || 'Anonymous Friend',
      xp: f.xp || 0,
      level: f.level || 1,
      streak: f.streak || 0,
      active_accessory: f.active_accessory || null,
      isUser: false,
    }));

    const combined = [userEntry, ...list];
    combined.sort((a, b) => b.xp - a.xp);
    return combined;
  }, [friendsList, session, userName, petStats.xp, petStats.level, petStats.streak, petStats.activeAccessory]);

  const getLeagueGradient = () => {
    switch(currentLeague) {
      case 'Diamond': return COLORS.gradient.diamond;
      case 'Gold': return COLORS.gradient.premiumGold;
      case 'Silver': return COLORS.gradient.silver;
      default: return COLORS.gradient.bronze;
    }
  };

  const renderLeaderboardItem = (item: typeof leaderboard[0], index: number) => {
    const isPromotionZone = index < 5;
    const isDemotionZone = index >= 15 && leaderboard.length >= 20;
    
    return (
      <Animated.View 
        key={item.id}
        entering={FadeInUp.delay(index * 30)}
        style={[
          styles.leaderboardItem,
          item.isUser && styles.leaderboardItemUser,
          isPromotionZone && styles.leaderboardItemPromotion,
          isDemotionZone && styles.leaderboardItemDemotion
        ]}
      >
        <Text style={[styles.rankText, item.isUser && styles.rankTextUser]}>{index + 1}</Text>
        
        <View style={styles.avatarWrapper}>
          {item.isUser ? (
            <PetAvatar size={36} mood="idle" level={item.level} showGlow={false} />
          ) : (
            <View style={styles.rivalAvatar}>
              <Text style={styles.rivalAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.nameText, item.isUser && styles.nameTextUser]} numberOfLines={1}>
          {item.name}
        </Text>

        <View style={styles.xpWrapper}>
          <Text style={[styles.xpText, item.isUser && styles.xpTextUser]}>{item.xp}</Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>
      </Animated.View>
    );
  };

  const renderFriendItem = (item: typeof friendsLeaderboard[0], index: number) => {
    return (
      <Animated.View 
        key={item.id}
        entering={FadeInUp.delay(index * 30)}
        style={[
          styles.leaderboardItem,
          item.isUser && styles.leaderboardItemUser,
        ]}
      >
        <Text style={[styles.rankText, item.isUser && styles.rankTextUser]}>{index + 1}</Text>
        
        <View style={styles.avatarWrapper}>
          <PetAvatar 
            size={36} 
            mood="idle" 
            level={item.level} 
            showGlow={false} 
            activeAccessory={item.active_accessory} 
          />
        </View>

        <View style={{ flex: 1, marginRight: SPACING.sm }}>
          <Text style={[styles.nameText, item.isUser && styles.nameTextUser]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <StrokeText style={styles.friendLevel} strokeColor="rgba(0,0,0,0.5)" strokeWidth={1.5}>
              Lv. {item.level}
            </StrokeText>
            <StrokeText style={styles.friendStreak} strokeColor="rgba(0,0,0,0.5)" strokeWidth={1.5}>
              🔥 {item.streak} d
            </StrokeText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.xpWrapper}>
            <Text style={[styles.xpText, item.isUser && styles.xpTextUser]}>{item.xp}</Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>
          
          {!item.isUser && (
            <TouchableOpacity 
              style={styles.unfriendButton}
              onPress={() => handleRemoveFriend(item.id, item.name)}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={COLORS.state.error} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <GradientHeader
        title={activeTab === 'global' ? `${currentLeague} League` : "Squad Ranks"}
        subtitle={activeTab === 'global' ? "Global XP Leaderboard" : "Compete with Friends"}
      />

      {/* Segmented Sub-tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'global' && styles.tabButtonActive]}
          onPress={() => handleTabChange('global')}
          activeOpacity={0.8}
        >
          <Trophy size={18} color={activeTab === 'global' ? COLORS.brand.orange : COLORS.text.secondary} style={{ marginRight: 6 }} />
          <Text style={[styles.tabButtonText, activeTab === 'global' && styles.tabButtonTextActive]}>
            Global League
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'friends' && styles.tabButtonActive]}
          onPress={() => handleTabChange('friends')}
          activeOpacity={0.8}
        >
          <Users size={18} color={activeTab === 'friends' ? COLORS.brand.orange : COLORS.text.secondary} style={{ marginRight: 6 }} />
          <Text style={[styles.tabButtonText, activeTab === 'friends' && styles.tabButtonTextActive]}>
            Friends
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'global' ? (
          <>
            {/* League Shield */}
            <Animated.View entering={FadeIn} style={styles.leagueShieldContainer}>
              <LinearGradient
                colors={getLeagueGradient() as any}
                style={styles.leagueShieldBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <View style={{ marginBottom: SPACING.md }}>
                <Trophy 
                  size={64} 
                  color={
                    currentLeague === 'Diamond' ? '#38BDF8' 
                    : currentLeague === 'Gold' ? COLORS.brand.gold 
                    : currentLeague === 'Silver' ? '#9CA3AF' 
                    : '#D97706'
                  } 
                  fill={
                    currentLeague === 'Diamond' ? '#38BDF8' 
                    : currentLeague === 'Gold' ? COLORS.brand.gold 
                    : currentLeague === 'Silver' ? '#9CA3AF' 
                    : '#D97706'
                  } 
                />
              </View>
              <StrokeText style={styles.leagueLabel} strokeColor="rgba(0,0,0,0.5)" strokeWidth={1.5}>{currentLeague} Division</StrokeText>
              <Text style={styles.leagueCountdown}>Climb the ranks by earning XP!</Text>
            </Animated.View>

            {/* User Summary */}
            <View style={[styles.userSummaryCard, CARD_SHADOW]}>
              <Text style={styles.userSummaryTitle}>Your Standing</Text>
              <View style={styles.userSummaryRow}>
                <View style={styles.summaryStat}>
                  <StrokeText style={styles.summaryValue} strokeColor="rgba(0,0,0,0.4)" strokeWidth={1.5}>
                    {loading ? '-' : leaderboard.findIndex(u => u.isUser) + 1}
                  </StrokeText>
                  <Text style={styles.summaryLabel}>Global Rank</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <StrokeText style={styles.summaryValue} strokeColor="rgba(0,0,0,0.4)" strokeWidth={1.5}>{petStats.xp}</StrokeText>
                  <Text style={styles.summaryLabel}>Total XP</Text>
                </View>
              </View>
            </View>

            {/* Leaderboard */}
            <View style={[styles.leaderboardContainer, CARD_SHADOW]}>
              <View style={styles.zoneHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <ArrowUp size={14} color={COLORS.state.success} strokeWidth={3} />
                  <Text style={styles.promotionText}>Promotion Zone (Top 5)</Text>
                </View>
              </View>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={COLORS.brand.orange} size="large" />
                  <Text style={styles.loadingText}>Loading rivals...</Text>
                </View>
              ) : (
                leaderboard.map((item, index) => {
                  return (
                    <React.Fragment key={item.id}>
                      {renderLeaderboardItem(item, index)}
                      {index === 4 && <View style={styles.zoneDivider} />}
                      {index === 14 && leaderboard.length >= 20 && (
                        <>
                          <View style={styles.zoneDivider} />
                          <View style={styles.zoneHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <ArrowDown size={14} color={COLORS.state.error} strokeWidth={3} />
                              <Text style={styles.demotionText}>Demotion Zone (Bottom 5)</Text>
                            </View>
                          </View>
                        </>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </View>
          </>
        ) : (
          <>
            {/* Invite and Add Friend Section */}
            <Animated.View entering={FadeIn} style={styles.socialHeaderCard}>
              <View style={styles.inviteRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.socialCardLabel}>My Invite Code</Text>
                  <Text style={styles.inviteCodeText}>{inviteCode}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.copyButton, copied && styles.copyButtonActive]} 
                  onPress={handleCopyCode}
                  activeOpacity={0.8}
                >
                  {copied ? (
                    <>
                      <Check size={16} color={COLORS.state.success} />
                      <Text style={styles.copyButtonTextActive}>Copied</Text>
                    </>
                  ) : (
                    <>
                      <Copy size={16} color={COLORS.brand.orange} />
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.socialDivider} />

              <View style={styles.addFriendRow}>
                <View style={{ flex: 1, marginRight: SPACING.md }}>
                  <Text style={styles.socialCardLabel}>Add a Friend</Text>
                  <TextInput
                    style={styles.addFriendInput}
                    value={inviteInput}
                    onChangeText={setInviteInput}
                    placeholder="Enter Invite Code"
                    placeholderTextColor={COLORS.text.tertiary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>
                <TouchableOpacity 
                  style={styles.addButton} 
                  onPress={handleAddFriend}
                  disabled={addingFriend || !inviteInput.trim()}
                  activeOpacity={0.8}
                >
                  {addingFriend ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <UserPlus size={16} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={styles.addButtonText}>Add</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Nudge Squad Section */}
            {!loading && friendsList.length > 0 && (
              <Animated.View entering={FadeIn} style={[styles.nudgeSquadCard, CARD_SHADOW]}>
                <View style={styles.nudgeSquadHeader}>
                  <Zap size={18} color={COLORS.brand.orange} fill={COLORS.brand.orange} />
                  <Text style={styles.nudgeSquadTitle}>Nudge Squad 📣</Text>
                </View>
                <Text style={styles.nudgeSquadSubtitle}>
                  Motivate friends who have scheduled workouts today but haven't trained yet. Nudging rewards you with +5 Coins & +5 XP!
                </Text>
                {nudgeableFriends.length === 0 ? (
                  <View style={styles.allTrackContainer}>
                    <Text style={styles.allTrackText}>All friends are on track today! 🎉</Text>
                  </View>
                ) : (
                  <View style={styles.nudgeList}>
                    {nudgeableFriends.map(friend => {
                      const isNudged = hasNudgedToday(friend);
                      const isNudging = nudgingIds[friend.id];
                      return (
                        <View key={friend.id} style={styles.nudgeRow}>
                          <View style={styles.nudgeFriendInfo}>
                            <PetAvatar size={32} mood="idle" level={friend.level} showGlow={false} activeAccessory={friend.active_accessory} />
                            <Text style={styles.nudgeFriendName} numberOfLines={1}>
                              {friend.name}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.nudgeActionButton,
                              isNudged && styles.nudgeActionButtonDisabled
                            ]}
                            disabled={isNudged || isNudging}
                            onPress={() => handleNudge(friend)}
                            activeOpacity={0.8}
                          >
                            {isNudging ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <Text style={styles.nudgeActionText}>
                                {isNudged ? 'Nudged' : 'Nudge'}
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Animated.View>
            )}

            {/* Friends Leaderboard */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={COLORS.brand.orange} size="large" />
                <Text style={styles.loadingText}>Loading friends...</Text>
              </View>
            ) : friendsList.length === 0 ? (
              <Animated.View entering={FadeIn} style={styles.emptyStateContainer}>
                <Users size={48} color={COLORS.text.tertiary} style={{ marginBottom: SPACING.md }} />
                <Text style={styles.emptyStateTitle}>No Friends Yet</Text>
                <Text style={styles.emptyStateText}>
                  Compete with your workout buddies! Share your invite code or enter a friend's code above to build your squad.
                </Text>
              </Animated.View>
            ) : (
              <View style={[styles.leaderboardContainer, CARD_SHADOW]}>
                <View style={styles.zoneHeader}>
                  <Text style={styles.promotionText}>SQUAD XP RANKINGS</Text>
                </View>
                {friendsLeaderboard.map((item, index) => renderFriendItem(item, index))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.lg,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm,
  },
  tabButtonActive: {
    backgroundColor: COLORS.bg.tertiary,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  tabButtonText: {
    color: COLORS.text.secondary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: FONT_SIZE.sm,
  },
  tabButtonTextActive: {
    color: COLORS.text.primary,
  },
  leagueShieldContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...CARD_SHADOW,
  },
  leagueShieldBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  leagueLabel: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  leagueCountdown: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  userSummaryCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  userSummaryTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  userSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.bg.accent,
  },
  leaderboardContainer: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    overflow: 'hidden',
    paddingBottom: SPACING.md,
  },
  loadingContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.text.secondary,
    fontFamily: 'Inter_500Medium',
  },
  zoneHeader: {
    padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  promotionText: {
    color: COLORS.state.success,
    fontFamily: 'Inter_700Bold',
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    letterSpacing: 1,
  },
  demotionText: {
    color: COLORS.state.error,
    fontFamily: 'Inter_700Bold',
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    letterSpacing: 1,
  },
  zoneDivider: {
    height: 2,
    backgroundColor: COLORS.bg.accent,
    marginVertical: 0,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  leaderboardItemUser: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  leaderboardItemPromotion: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.state.success,
  },
  leaderboardItemDemotion: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.state.error,
  },
  rankText: {
    width: 30,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.tertiary,
  },
  rankTextUser: {
    color: COLORS.brand.orange,
  },
  avatarWrapper: {
    marginRight: SPACING.md,
  },
  rivalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rivalAvatarText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.secondary,
  },
  nameText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
  },
  nameTextUser: {
    color: COLORS.brand.orange,
  },
  xpWrapper: {
    alignItems: 'flex-end',
  },
  xpText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  xpTextUser: {
    color: COLORS.brand.orange,
  },
  xpLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.tertiary,
  },

  // Friends View Specific styles
  socialHeaderCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  socialCardLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  inviteCodeText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.gold,
    letterSpacing: 1.5,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.tertiary,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  copyButtonActive: {
    borderColor: COLORS.state.success,
  },
  copyButtonText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.brand.orange,
  },
  copyButtonTextActive: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.state.success,
  },
  socialDivider: {
    height: 1,
    backgroundColor: COLORS.bg.accent,
    marginVertical: SPACING.md,
  },
  addFriendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  addFriendInput: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
    color: COLORS.text.primary,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brand.orange,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    height: 40,
    minWidth: 80,
  },
  addButtonText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
  emptyStateContainer: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    borderStyle: 'dashed',
    marginTop: SPACING.md,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  emptyStateText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  friendLevel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.gold,
  },
  friendStreak: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.sunset,
  },
  unfriendButton: {
    padding: 6,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nudgeSquadCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  nudgeSquadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  nudgeSquadTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  nudgeSquadSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  allTrackContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  allTrackText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.state.success,
  },
  nudgeList: {
    gap: SPACING.sm,
  },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  nudgeFriendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    marginRight: SPACING.sm,
  },
  nudgeFriendName: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
  },
  nudgeActionButton: {
    backgroundColor: COLORS.brand.orange,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  nudgeActionButtonDisabled: {
    backgroundColor: COLORS.bg.accent,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  nudgeActionText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: '#FFF',
  },
});
