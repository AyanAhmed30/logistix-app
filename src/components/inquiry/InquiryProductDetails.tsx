import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, CardTitle } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { CustomerInquiry } from '@/types/inquiry';

type InquiryProductDetailsProps = {
  inquiry: CustomerInquiry;
  children?: ReactNode;
};

function displayValue(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : '—';
}

export function InquiryProductDetails({ inquiry, children }: InquiryProductDetailsProps) {
  const title = inquiry.productName || `Inquiry ${inquiry.inquiryNumber}`;

  return (
    <Card style={styles.card}>
      <View style={styles.titleBlock}>
        <CardTitle>{title}</CardTitle>
        <Text style={styles.meta}>Inquiry #{inquiry.inquiryNumber}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product information</Text>
        <DetailRow icon="cube-outline" label="Product name" value={displayValue(inquiry.productName)} />
        <DetailRow
          icon="document-text-outline"
          label="Description"
          value={displayValue(inquiry.description)}
          multiline
        />
        <DetailRow icon="layers-outline" label="Quantity" value={displayValue(inquiry.quantity)} />
        <DetailRow icon="barbell-outline" label="Total weight" value={displayValue(inquiry.totalWeight)} />
        <DetailRow icon="resize-outline" label="Total CBM" value={displayValue(inquiry.cbm)} />
      </View>

      {children ? <View style={styles.mediaSection}>{children}</View> : null}
    </Card>
  );
}

type DetailRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  multiline?: boolean;
};

function DetailRow({ icon, label, value, multiline = false }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, multiline ? styles.multiline : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  mediaSection: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
    width: 104,
    paddingTop: 1,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
  },
  multiline: {
    lineHeight: 20,
  },
});
