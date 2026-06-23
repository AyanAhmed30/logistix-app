import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, CardTitle } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { CustomerInquiry } from '@/types/inquiry';
import { getInquiryStatusConfig } from '@/utils/inquiry-status';

type InquiryListItemProps = {
  inquiry: CustomerInquiry;
  onPress?: () => void;
};

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function displayValue(value: string | null): string {
  return value?.trim() ? value.trim() : '—';
}

export function InquiryListItem({ inquiry, onPress }: InquiryListItemProps) {
  const statusConfig = getInquiryStatusConfig(inquiry.status);
  const title = inquiry.productName || `Inquiry ${inquiry.inquiryNumber}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [pressed && onPress ? styles.pressed : null]}
    >
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <CardTitle>{title}</CardTitle>
            <Text style={styles.meta}>Inquiry #{inquiry.inquiryNumber}</Text>
          </View>
          <Badge
            label={statusConfig.label}
            backgroundColor={statusConfig.backgroundColor}
            textColor={statusConfig.textColor}
          />
        </View>

        <View style={styles.details}>
          <DetailRow icon="pricetag-outline" label="Lead #" value={displayValue(inquiry.leadNumber)} />
          <DetailRow icon="calendar-outline" label="Inquiry date" value={formatDate(inquiry.createdAt)} />
          <DetailRow icon="send-outline" label="Sent" value={formatDate(inquiry.sentAt)} />
          <DetailRow
            icon="bookmark-outline"
            label="Shipping mark"
            value={displayValue(inquiry.shippingMark)}
          />
          <DetailRow icon="airplane-outline" label="Origin" value={displayValue(inquiry.origin)} />
          <DetailRow icon="location-outline" label="Destination" value={displayValue(inquiry.destination)} />
        </View>

        {onPress ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>View details</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

type DetailRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  details: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
    width: 96,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  footerText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
