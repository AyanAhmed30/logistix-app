import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { PlaceholderLogo } from '@/components/auth';
import { APP_NAME } from '@/constants';
import { AUTH_ROUTES, APP_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { colors, spacing, typography } from '@/constants/theme';

const SPLASH_DURATION_MS = 2800;

export function SplashScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 800,
        delay: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(taglineTranslate, {
        toValue: 0,
        duration: 800,
        delay: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [taglineOpacity, taglineTranslate]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const timer = setTimeout(() => {
      router.replace((user ? APP_ROUTES.inquiries : AUTH_ROUTES.home) as Href);
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [isLoading, router, user]);

  return (
    <View style={styles.container}>
      <PlaceholderLogo size="lg" animated />
      <Animated.View
        style={{
          opacity: taglineOpacity,
          transform: [{ translateY: taglineTranslate }],
        }}
      >
        <Text style={styles.appName}>{APP_NAME}</Text>
        <Text style={styles.tagline}>Logistics at your fingertips</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  appName: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
