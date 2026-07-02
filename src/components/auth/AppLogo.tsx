import { Image, StyleSheet, View } from 'react-native';

import { APP_NAME } from '@/constants';
import { spacing } from '@/constants/theme';

const logoSource = require('../../../assets/logo.png');

/** Horizontal wordmark aspect ratio (width / height). */
const LOGO_ASPECT_RATIO = 3.6;

type AppLogoProps = {
  size?: 'sm' | 'md' | 'lg';
};

const widthMap = {
  sm: 168,
  md: 220,
  lg: 280,
};

export function AppLogo({ size = 'md' }: AppLogoProps) {
  const width = widthMap[size];
  const height = width / LOGO_ASPECT_RATIO;

  return (
    <View style={styles.container}>
      <Image
        source={logoSource}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityLabel={`${APP_NAME} logo`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
});
