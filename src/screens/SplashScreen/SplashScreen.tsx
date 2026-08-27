import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { AppLogo } from '@/components/auth';
import { AUTH_ROUTES, APP_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { colors, spacing, typography } from '@/constants/theme';

const SPLASH_DURATION_MS = 1800;

export function SplashScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const logoScale = useRef(new Animated.Value(0.86)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale, taglineOpacity]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const timer = setTimeout(() => {
      router.replace((user ? APP_ROUTES.home : AUTH_ROUTES.home) as Href);
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [isLoading, router, user]);

  return (
    <View style={styles.container}>
      <View style={styles.accentBar} />
      <View style={styles.glow} />
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <AppLogo size="lg" />
      </Animated.View>
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Freight clarity for your business
      </Animated.Text>
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
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.brandNavy,
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.accentLight,
    opacity: 0.85,
  },
  tagline: {
    ...typography.body,
    color: colors.brandNavy,
    textAlign: 'center',
  },
});
