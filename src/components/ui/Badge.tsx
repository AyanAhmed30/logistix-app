import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { OrderStatus } from '@/types/ui';
import { getOrderStatusConfig } from '@/utils/order-status';

type BadgeProps = {
  label: string;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
};

export function Badge({ label, backgroundColor, textColor, style }: BadgeProps) {
  return (
    <View
      style={[styles.badge, { backgroundColor: backgroundColor ?? colors.primaryLight }, style]}
    >
      <Text style={[styles.text, { color: textColor ?? colors.primary }]}>{label}</Text>
    </View>
  );
}

type StatusBadgeProps = {
  status: OrderStatus;
  style?: ViewStyle;
};

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const config = getOrderStatusConfig(status);
  return (
    <Badge
      label={config.label}
      backgroundColor={config.backgroundColor}
      textColor={config.textColor}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
  },
});
