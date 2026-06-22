import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { Order } from '@/types/ui';

import { StatusBadge } from './Badge';

type OrderListItemProps = {
  order: Order;
  onPress?: () => void;
  compact?: boolean;
};

export function OrderListItem({ order, onPress, compact = false }: OrderListItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.refRow}>
          <Text style={styles.reference}>{order.reference}</Text>
          <StatusBadge status={order.status} />
        </View>
        {!compact ? <Text style={styles.customer}>{order.customer}</Text> : null}
      </View>

      <View style={styles.route}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, styles.dotOrigin]} />
          <Text style={styles.location} numberOfLines={1}>
            {order.origin}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={colors.textMuted} style={styles.arrow} />
        <View style={styles.routePoint}>
          <View style={[styles.dot, styles.dotDestination]} />
          <Text style={styles.location} numberOfLines={1}>
            {order.destination}
          </Text>
        </View>
      </View>

      {!compact ? (
        <View style={styles.footer}>
          <View style={styles.metaItem}>
            <Ionicons name="cube-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{order.items} items</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="scale-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{order.weight}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.metaText}>{order.estimatedDelivery}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  header: {
    marginBottom: spacing.md,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  reference: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
  },
  customer: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  routePoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  dotOrigin: {
    backgroundColor: colors.primary,
  },
  dotDestination: {
    backgroundColor: colors.success,
  },
  location: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  arrow: {
    marginHorizontal: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
