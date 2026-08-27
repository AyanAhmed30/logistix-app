import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

type SkeletonProps = {
  height?: number;
  width?: number | `${number}%`;
  borderRadius?: number;
};

export function Skeleton({ height = 16, width = '100%', borderRadius = radius.sm }: SkeletonProps) {
  return <View style={[styles.bone, { height, width, borderRadius }]} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={14} width="40%" />
      <Skeleton height={20} width="75%" />
      <Skeleton height={12} width="90%" />
      <Skeleton height={12} width="55%" />
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: colors.borderLight,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
