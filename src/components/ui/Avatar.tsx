import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, typography } from '@/constants/theme';

type AvatarProps = {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
};

const sizeMap = {
  sm: { container: 36, text: 13 },
  md: { container: 56, text: 18 },
  lg: { container: 80, text: 26 },
};

export function Avatar({ initials, size = 'md', style }: AvatarProps) {
  const dimensions = sizeMap[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.container,
          height: dimensions.container,
          borderRadius: dimensions.container / 2,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: dimensions.text }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.label,
    color: colors.surface,
    fontWeight: '700',
  },
});
