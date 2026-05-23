// ============================================
// Blaze — Database Helper Functions
// ============================================
// All Supabase read/write operations live here.
// The store calls these functions; components never touch the DB directly.
// ============================================

import { supabase } from './supabase';

// ==========================================
// TYPES (matching the Supabase schema)
// ==========================================

export interface DbProfile {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  fitness_level: string | null;
  session_duration_mins: number;
  injuries: string[];
  workout_days: number[];
  pet_name: string;
  level: number;
  xp: number;
  xp_needed: number;
  energy: number;
  streak: number;
  coins: number;
  rest_tokens: number;
  last_workout_date: string | null;
  is_onboarded: boolean;
  owned_items?: string[];
  active_accessory?: string | null;
  active_habitat?: string | null;
  created_at: string;
  updated_at: string;
  invite_code?: string;
  expo_push_token?: string | null;
  friendship_id?: string;
  friendship_initiator_id?: string;
  user_nudged_friend_at?: string | null;
  friend_nudged_user_at?: string | null;
}


export interface DbWorkoutLog {
  id?: string;
  user_id: string;
  preset: string | null;
  exercises: { name: string; duration: number; difficulty: number }[];
  total_duration_secs: number;
  total_xp: number;
  completed_at?: string;
}

// ==========================================
// PROFILE FUNCTIONS
// ==========================================

/**
 * Fetch the current user's profile from Supabase.
 * Returns null if not found or not authenticated.
 */
export async function fetchProfile(): Promise<DbProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('fetchProfile error:', error.message);
      return null;
    }

    return data as DbProfile;
  } catch (e) {
    console.error('fetchProfile exception:', e);
    return null;
  }
}

/**
 * Save/update the user's profile in Supabase.
 * Uses upsert so it works for both first-time and subsequent saves.
 */
export async function saveProfile(updates: Partial<DbProfile>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates }, { onConflict: 'id' });

    if (error) {
      console.error('saveProfile error:', error.message);
      return false;
    }

    return true;
  } catch (e) {
    console.error('saveProfile exception:', e);
    return false;
  }
}

/**
 * Fetch top global users by XP for the League leaderboard.
 */
export async function fetchGlobalLeaderboard(limit: number = 30): Promise<Partial<DbProfile>[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, xp, level, pet_name, league')
      .order('xp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('fetchGlobalLeaderboard error:', error.message);
      return [];
    }

    return (data || []) as Partial<DbProfile>[];
  } catch (e) {
    console.error('fetchGlobalLeaderboard exception:', e);
    return [];
  }
}

// ==========================================
// WORKOUT LOG FUNCTIONS
// ==========================================

/**
 * Log a completed workout to the database.
 */
export async function logWorkout(log: Omit<DbWorkoutLog, 'user_id'>): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('workout_logs')
      .insert({ ...log, user_id: user.id });

    if (error) {
      console.error('logWorkout error:', error.message);
      return false;
    }

    return true;
  } catch (e) {
    console.error('logWorkout exception:', e);
    return false;
  }
}

/**
 * Fetch all workout logs for the current user, newest first.
 */
export async function fetchWorkoutLogs(limit: number = 50): Promise<DbWorkoutLog[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('fetchWorkoutLogs error:', error.message);
      return [];
    }

    return (data || []) as DbWorkoutLog[];
  } catch (e) {
    console.error('fetchWorkoutLogs exception:', e);
    return [];
  }
}

/**
 * Count total workouts completed this week (Mon-Sun).
 */
export async function fetchWeeklyWorkoutCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Calculate start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('workout_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('completed_at', monday.toISOString());

    if (error) {
      console.error('fetchWeeklyWorkoutCount error:', error.message);
      return 0;
    }

    return count || 0;
  } catch (e) {
    console.error('fetchWeeklyWorkoutCount exception:', e);
    return 0;
  }
}

// ==========================================
// SOCIAL / FRIEND FUNCTIONS
// ==========================================

/**
 * Fetch profiles of all friends
 */
export async function fetchFriendsProfiles(): Promise<DbProfile[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, user_nudged_friend_at, friend_nudged_user_at')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error) {
      console.error('fetchFriendsProfiles (friends query) error:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    const friendIds = data.map(row => 
      row.user_id === user.id ? row.friend_id : row.user_id
    );

    if (friendIds.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);

    if (profilesError) {
      console.error('fetchFriendsProfiles (profiles query) error:', profilesError.message);
      return [];
    }

    // Map friendship data onto the profile objects
    const profilesWithFriendship = profiles.map(profile => {
      const friendship = data.find(
        f => (f.user_id === user.id && f.friend_id === profile.id) ||
             (f.user_id === profile.id && f.friend_id === user.id)
      );

      return {
        ...profile,
        friendship_id: friendship?.id,
        friendship_initiator_id: friendship?.user_id,
        user_nudged_friend_at: friendship?.user_nudged_friend_at || null,
        friend_nudged_user_at: friendship?.friend_nudged_user_at || null,
      };
    });

    return (profilesWithFriendship || []) as DbProfile[];
  } catch (e) {
    console.error('fetchFriendsProfiles exception:', e);
    return [];
  }
}

/**
 * Add a friend using their unique 8-character invite code
 */
export async function addFriendByInviteCode(code: string): Promise<{ success: boolean; errorMsg?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, errorMsg: 'User not authenticated' };

    const sanitizedCode = code.trim().toUpperCase();

    // 1. Look up the friend's profile by their invite_code
    const { data: friendProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('invite_code', sanitizedCode)
      .maybeSingle();

    if (profileError) {
      console.error('addFriendByInviteCode lookup error:', profileError.message);
      return { success: false, errorMsg: 'Error searching for user.' };
    }

    if (!friendProfile) {
      return { success: false, errorMsg: 'No user found with that invite code.' };
    }

    if (friendProfile.id === user.id) {
      return { success: false, errorMsg: "You cannot add yourself as a friend." };
    }

    // 2. Check if already friends
    const { data, error: checkError } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (checkError) {
      console.error('addFriendByInviteCode check error:', checkError.message);
      return { success: false, errorMsg: 'Error verifying existing friendship.' };
    }

    const isAlreadyFriend = (data || []).some(
      (row: any) =>
        (row.user_id === user.id && row.friend_id === friendProfile.id) ||
        (row.user_id === friendProfile.id && row.friend_id === user.id)
    );

    if (isAlreadyFriend) {
      return { success: false, errorMsg: `You are already friends with ${friendProfile.name}.` };
    }

    // 3. Insert friendship row
    const { error: insertError } = await supabase
      .from('friends')
      .insert({
        user_id: user.id,
        friend_id: friendProfile.id,
        status: 'accepted'
      });

    if (insertError) {
      console.error('addFriendByInviteCode insert error:', insertError.message);
      return { success: false, errorMsg: 'Failed to add friend. Database table might be missing. Run the SQL script first!' };
    }

    return { success: true };
  } catch (e: any) {
    console.error('addFriendByInviteCode exception:', e);
    return { success: false, errorMsg: e.message || 'An unexpected error occurred.' };
  }
}

/**
 * Remove a friendship connection
 */
export async function removeFriendship(friendId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .or(`user_id.eq.${friendId},friend_id.eq.${friendId}`);

    if (error) {
      console.error('removeFriendship error:', error.message);
      return false;
    }

    return true;
  } catch (e) {
    console.error('removeFriendship exception:', e);
    return false;
  }
}

/**
 * Update the user's expo_push_token on Supabase.
 */
export async function updatePushToken(token: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', user.id);

    if (error) {
      console.error('updatePushToken error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('updatePushToken exception:', e);
    return false;
  }
}

/**
 * Set the nudge timestamp between the logged-in user and friendId on Supabase.
 */
export async function nudgeFriend(friendId: string): Promise<{ success: boolean; errorMsg?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, errorMsg: 'User not authenticated' };

    // 1. Fetch the friendship row to determine who is user_id vs friend_id
    const { data, error } = await supabase
      .from('friends')
      .select('id, user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .filter('user_id', 'in', `(${user.id},${friendId})`)
      .filter('friend_id', 'in', `(${user.id},${friendId})`)
      .maybeSingle();

    if (error || !data) {
      console.error('nudgeFriend lookup error:', error?.message);
      return { success: false, errorMsg: 'Friendship record not found.' };
    }

    const nowStr = new Date().toISOString();
    const updateObj: any = {};

    if (data.user_id === user.id) {
      updateObj.user_nudged_friend_at = nowStr;
    } else {
      updateObj.friend_nudged_user_at = nowStr;
    }

    const { error: updateError } = await supabase
      .from('friends')
      .update(updateObj)
      .eq('id', data.id);

    if (updateError) {
      console.error('nudgeFriend update error:', updateError.message);
      return { success: false, errorMsg: 'Failed to send nudge. ' + updateError.message };
    }

    return { success: true };
  } catch (e: any) {
    console.error('nudgeFriend exception:', e);
    return { success: false, errorMsg: e.message || 'An unexpected error occurred.' };
  }
}

/**
 * Checks if any friend has nudged the logged-in user today.
 * Returns the name of the friend who nudged them, or null.
 */
export async function fetchNudgeStatus(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('friends')
      .select('user_id, friend_id, user_nudged_friend_at, friend_nudged_user_at')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (error || !data) return null;

    const todayPrefix = new Date().toISOString().substring(0, 10); // YYYY-MM-DD

    for (const row of data) {
      let nudgerId: string | null = null;
      let nudgedAt: string | null = null;

      if (row.user_id === user.id && row.friend_nudged_user_at) {
        nudgerId = row.friend_id;
        nudgedAt = row.friend_nudged_user_at;
      } else if (row.friend_id === user.id && row.user_nudged_friend_at) {
        nudgerId = row.user_id;
        nudgedAt = row.user_nudged_friend_at;
      }

      // If the nudge timestamp is today, fetch the nudger's name
      if (nudgerId && nudgedAt && nudgedAt.substring(0, 10) === todayPrefix) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', nudgerId)
          .single();
        
        return profile?.name || 'A friend';
      }
    }
    return null;
  } catch (e) {
    console.error('fetchNudgeStatus exception:', e);
    return null;
  }
}

