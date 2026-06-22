import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { APP_NAME } from '@/constants';
import { colors, spacing, typography } from '@/constants/theme';

type PlaceholderLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  showAppName?: boolean;
};

const sizeMap = {
  sm: 56,
  md: 80,
  lg: 104,
};

export function PlaceholderLogo({
  size = 'md',
  animated = false,
  showAppName = false,
}: PlaceholderLogoProps) {
  const dimension = sizeMap[size];
  const scale = useRef(new Animated.Value(animated ? 0.85 : 1)).current;
  const opacity = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (!animated) {
      return;
    }

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [animated, opacity, scale]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logo,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension * 0.28,
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={[styles.logoIcon, { fontSize: dimension * 0.42 }]}>⬡</Text>
      </Animated.View>
      {showAppName ? <Text style={styles.appName}>{APP_NAME}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  logo: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoIcon: {
    color: colors.surface,
    fontWeight: '700',
  },
  appName: {
    ...typography.h1,
    color: colors.text,
    letterSpacing: -0.5,
  },
});
