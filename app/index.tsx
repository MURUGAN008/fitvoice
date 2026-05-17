// ============================================
// Blaze — Entry Point / Auth Router
// ============================================

import { Redirect } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useUserStore } from '../store/userStore';
import { COLORS } from '../constants/theme';

export default function Index() {
  const { session, isLoading, isOnboarded } = useUserStore();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.brand.orange} />
      </View>
    );
  }

  // Not logged in → go to auth
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  // Logged in but not onboarded → go to onboarding
  if (!isOnboarded) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  // Fully authenticated and onboarded → go to main app
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg.primary,
  },
});
