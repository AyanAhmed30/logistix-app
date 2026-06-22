import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { DashboardStat } from '@/types/ui';

const iconMap: Record<DashboardStat['icon'], keyof typeof Ionicons.glyphMap> = {
  orders: 'cube-outline',
  transit: 'airplane-outline',
  delivered: 'checkmark-circle-outline',
  revenue: 'cash-outline',
};

const trendColorMap = {
  up: colors.success,
  down: colors.error,
  neutral: colors.textMuted,
};

type StatCardProps = {
  stat: DashboardStat;
};

export function StatCard({ stat }: StatCardProps) {
  const trendColor = trendColorMap[stat.trend];

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconMap[stat.icon]} size={22} color={colors.primary} />
      </View>
      <Text style={styles.value}>{stat.value}</Text>
      <Text style={styles.label}>{stat.label}</Text>
      <View style={styles.trendRow}>
        <Ionicons
          name={stat.trend === 'down' ? 'trending-down' : 'trending-up'}
          size={14}
          color={trendColor}
        />
        <Text style={[styles.trend, { color: trendColor }]}>{stat.change}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trend: {
    ...typography.caption,
    fontWeight: '600',
  },
});
