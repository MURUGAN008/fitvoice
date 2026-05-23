// ============================================
// Blaze — Push Notification Service
// ============================================
// Handles scheduling smart reminders based on
// workout schedule, streak risk, and pet state.
// ============================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure notification handler (how notifications appear when app is foregrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


// ==========================================
// PERMISSIONS
// ==========================================

/** Request notification permissions. Returns true if granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    // Android: create notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('workout-reminders', {
        name: 'Workout Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    }

    return true;
  } catch (e) {
    console.error('requestNotificationPermissions error:', e);
    return false;
  }
}

/** Register for remote push notifications and return the Expo Push Token. */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Must use physical device for remote Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted for push token registration');
      return null;
    }

    // Android-specific channel configurations
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    }

    // Retrieve Expo Project ID (required for getExpoPushTokenAsync in SDK 49+)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log('Expo Push Token retrieved successfully:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('Failed to get Expo push token:', error);
    return null;
  }
}


// ==========================================
// SCHEDULING
// ==========================================

/** Cancel all pending notifications and reschedule based on current state */
export async function scheduleSmartReminders(params: {
  workoutDays: number[];       // 0=Sun, 1=Mon, ..., 6=Sat
  petName: string;
  streak: number;
  energy: number;
  lastWorkoutDate: string | null;
}): Promise<void> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const { workoutDays, petName, streak, energy, lastWorkoutDate } = params;

  // 1. SCHEDULED WORKOUT DAY REMINDER
  // Remind at 9 AM on each scheduled workout day
  for (const dayOfWeek of workoutDays) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Time to train with ${petName}! 💪`,
        body: `Your scheduled workout day is here. ${petName} is waiting for you!`,
        sound: true,
        data: { type: 'workout_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // Expo WEEKLY trigger uses 1=Sunday..7=Saturday, but workoutDays
        // uses JS convention 0=Sunday..6=Saturday, so we add 1 to convert.
        weekday: dayOfWeek + 1,
        hour: 9,
        minute: 0,
      },
    });
  }

  // 2. STREAK RESCUE REMINDER
  // If it's a scheduled workout day and no workout yet by 8 PM, send a rescue notification
  // Only schedule on workout days to avoid unnecessary daily notifications
  for (const dayOfWeek of workoutDays) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Save your streak! 🚨`,
        body: `${petName}'s streak is at risk! Do a quick 2-minute workout to keep it alive.`,
        sound: true,
        data: { type: 'streak_rescue' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // Convert JS day (0=Sun..6=Sat) to Expo WEEKLY day (1=Sun..7=Sat)
        weekday: dayOfWeek + 1,
        hour: 20,
        minute: 0,
      },
    });
  }

  // 3. LOW ENERGY REMINDER
  // If pet energy is below 30, remind at 6 PM
  if (energy < 30) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${petName} needs you! 😢`,
        body: `${petName}'s energy is at ${energy}%. A workout will recharge ${petName} to full!`,
        sound: true,
        data: { type: 'low_energy' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
      },
    });
  }
}

// ==========================================
// IMMEDIATE NOTIFICATIONS
// ==========================================

/** Send an immediate streak milestone celebration */
export async function sendStreakMilestoneNotification(streak: number, petName: string): Promise<void> {
  const milestones: Record<number, string> = {
    3: '3-day streak! You earned a Rest Shield! 🛡️',
    7: 'One full week! 🔥 Your dedication is amazing!',
    14: 'Two weeks strong! 💪 Nothing can stop you!',
    30: '30-day streak! You are LEGENDARY! 🐺',
  };

  const message = milestones[streak];
  if (!message) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Streak Milestone! 🎉`,
      body: message,
      sound: true,
      data: { type: 'streak_milestone' },
    },
    trigger: null, // Immediate
  });
}

/** Send a level-up notification */
export async function sendLevelUpNotification(level: number, petName: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${petName} leveled up! 🆙`,
      body: `${petName} is now Level ${level}! Keep training to evolve!`,
      sound: true,
      data: { type: 'level_up' },
    },
    trigger: null,
  });
}
