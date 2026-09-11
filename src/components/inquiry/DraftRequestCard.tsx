import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { inquiryWizardStepLabel } from '@/constants/inquiry-form';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { CustomerInquiry } from '@/types/inquiry';
import { formatDraftUpdatedAt } from '@/utils/home-dashboard';

type Props = {
  draft: CustomerInquiry;
  onContinue: () => void;
};

export function DraftRequestCard({ draft, onContinue }: Props) {
  const updated = formatDraftUpdatedAt(draft.updatedAt || draft.createdAt);
  const title = draft.productName?.trim() || 'Untitled draft';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue ${title}`}
      onPress={onContinue}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {updated ? (
            <Text style={styles.subtitle}>Last updated: {updated}</Text>
          ) : (
            <Text style={styles.subtitle}>Saved draft</Text>
          )}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Draft</Text>
        </View>
      </View>
      <Text style={styles.meta}>{inquiryWizardStepLabel(draft.draftStep)}</Text>
      <View style={styles.footer}>
        <Text style={styles.continue}>Continue</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
      </View>
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
    gap: spacing.sm,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.accentLight,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.accentDark,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
  },
  continue: {
    ...typography.label,
    color: colors.accent,
  },
});
