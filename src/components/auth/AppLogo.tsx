import { useRouter, type Href } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { APP_NAME } from '@/constants';
import { colors, radius, shadows } from '@/constants/theme';
import { APP_ROUTES, AUTH_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';

const logoSource = require('../../../assets/logo.png');

type AppLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  /** Soft light backing for dark backgrounds (tight to the mark, not a big white box). */
  onDark?: boolean;
  /** When true (default), tap navigates to the home screen. */
  linkToHome?: boolean;
};

/**
 * logo.png is 256×256 with the wordmark centered and empty padding.
 * Clip a wide frame and scale up so only the mark shows.
 */
const sizeMap = {
  sm: { frameW: 96, frameH: 28, img: 112, padH: 8, padV: 5 },
  md: { frameW: 120, frameH: 34, img: 140, padH: 10, padV: 6 },
  lg: { frameW: 148, frameH: 42, img: 172, padH: 12, padV: 8 },
};

export function AppLogo({ size = 'md', onDark = true, linkToHome = true }: AppLogoProps) {
  const router = useRouter();
  const { user } = useAuth();
  const s = sizeMap[size];

  const mark = (
    <View
      style={[
        styles.shell,
        onDark && styles.shellOnDark,
        {
          paddingHorizontal: s.padH,
          paddingVertical: s.padV,
        },
      ]}
    >
      <View style={[styles.frame, { width: s.frameW, height: s.frameH }]}>
        <Image
          source={logoSource}
          style={{ width: s.img, height: s.img }}
          resizeMode="contain"
        />
      </View>
    </View>
  );

  if (!linkToHome) {
    return mark;
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${APP_NAME} home`}
      hitSlop={8}
      onPress={() => {
        const href = (user ? APP_ROUTES.home : AUTH_ROUTES.home) as Href;
        router.replace(href);
      }}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {mark}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'center',
    borderRadius: radius.md,
  },
  shellOnDark: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
});
