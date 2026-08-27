import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { MockActionItem } from '@/types/customer';

const iconByType: Record<MockActionItem['type'], keyof typeof Ionicons.glyphMap> = {
  quote: 'pricetag-outline',
  document: 'document-text-outline',
  payment: 'card-outline',
  info: 'information-circle-outline',
};

type ActionCardProps = {
  item: MockActionItem;
  onPress: () => void;
};

export function ActionCard({ item, onPress }: ActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={iconByType[item.type]} size={20} color={colors.accent} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>{item.ctaLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.label,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ctaText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
});
