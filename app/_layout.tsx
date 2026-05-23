// ============================================
// Blaze — Root Layout
// ============================================

// Stub expo-keep-awake before anything else to prevent uncaught promise rejection crash in Metro/DevTools
try {
  const KeepAwake = require('expo-keep-awake');
  if (KeepAwake) {
    KeepAwake.activateKeepAwake = () => Promise.resolve();
    KeepAwake.activateKeepAwakeAsync = () => Promise.resolve();
    KeepAwake.deactivateKeepAwake = () => Promise.resolve();
    KeepAwake.useKeepAwake = () => {};
  }
} catch (e) {
  // Ignore
}

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, LogBox } from 'react-native';

// Ignore Expo Go "keep awake" unhandled promise rejection errors that happen on certain emulators/devices
LogBox.ignoreLogs(['Unable to activate keep awake', 'KeepAwake']);

import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/userStore';
import { COLORS } from '../constants/theme';

// Prevent splash screen from hiding until fonts load
// Wrapped in async IIFE to fully suppress Expo Go "keep awake" errors
(async () => {
  try {
    await SplashScreen.preventAutoHideAsync();
  } catch {
    // Expected in Expo Go — safe to ignore
  }
})();

export default function RootLayout() {
  const { setSession, setIsLoading } = useUserStore();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);

      // If user is logged in, load their data from Supabase cloud
      if (session) {
        useUserStore.getState().loadFromCloud().then(() => {
          // After loading cloud data, calculate the streak based on today's date
          useUserStore.getState().calculateStreak();
        });
      }
    });

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);

        // On fresh login, pull cloud data
        if (session) {
          useUserStore.getState().loadFromCloud().then(() => {
            useUserStore.getState().calculateStreak();
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bg.primary },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="shop-modal" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
});
