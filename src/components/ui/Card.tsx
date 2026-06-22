import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/constants/theme';

type CardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type CardTextProps = {
  children: ReactNode;
};

export function CardTitle({ children }: CardTextProps) {
  return <Text style={styles.title}>{children}</Text>;
}

export function CardDescription({ children }: CardTextProps) {
  return <Text style={styles.description}>{children}</Text>;
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
  title: {
    ...typography.label,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
