// ============================================
// Blaze — Login Screen
// ============================================

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Login failed', error.message);
      } else if (data.session) {
        // Session is set by onAuthStateChange listener in _layout.tsx
        // Navigate to root which will redirect based on auth + onboarding state
        router.replace('/');
      }
    } catch (e: any) {
      Alert.alert('Login failed', e.message || 'An unexpected error occurred.');
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      Alert.alert('Google login failed', error.message);
    }
    setLoading(false);
  }

  function handleSkipLogin() {
    // Navigate directly to onboarding for testing purposes
    router.push('/(auth)/onboarding');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo / Branding */}
          <View style={styles.header}>
            <Text style={styles.foxEmoji}>🦊</Text>
            <Text style={styles.appName}>Blaze</Text>
            <Text style={styles.tagline}>Your AI workout companion</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.text.tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor={COLORS.text.tertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Skip for testing */}
            {__DEV__ && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.skipButtonText}>Skip Login (Testing)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Sign up link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  content: {
    paddingHorizontal: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  foxEmoji: {
    fontSize: 64,
    marginBottom: SPACING.sm,
  },
  appName: {
    fontSize: FONT_SIZE.hero,
    fontFamily: 'Inter_700Bold',
    color: COLORS.brand.orange,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  form: {
    gap: SPACING.md,
  },
  inputContainer: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.secondary,
    marginLeft: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  loginButton: {
    backgroundColor: COLORS.brand.orange,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.bg.accent,
  },
  dividerText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.tertiary,
    marginHorizontal: SPACING.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    gap: SPACING.sm,
  },
  googleIcon: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Inter_700Bold',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.primary,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  skipButtonText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
    color: COLORS.text.tertiary,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
  },
  footerLink: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.brand.orange,
  },
});
