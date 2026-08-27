import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { StatusVisual } from '@/utils/customer-status-ui';

type StatusBannerProps = {
  visual: StatusVisual;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function StatusBanner({ visual, actionLabel, onActionPress }: StatusBannerProps) {
  return (
    <View style={[styles.wrap, { backgroundColor: visual.backgroundColor }]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: visual.textColor }]} />
        <Text style={[styles.label, { color: visual.textColor }]}>{visual.label}</Text>
      </View>
      <Text style={styles.explanation}>{visual.explanation}</Text>
      <Text style={styles.next}>
        <Text style={styles.nextLabel}>Next: </Text>
        {visual.nextStep}
      </Text>
      {visual.requiresAction && actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onActionPress}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.surface} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...typography.label,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  explanation: {
    ...typography.body,
    color: colors.text,
  },
  next: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  nextLabel: {
    fontWeight: '700',
    color: colors.text,
  },
  cta: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
  },
  ctaText: {
    ...typography.label,
    color: colors.surface,
  },
});
