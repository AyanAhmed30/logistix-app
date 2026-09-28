import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  FadeIn,
  ScreenContainer,
  SectionHeader,
} from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { APP_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import {
  fetchCustomerQuoteBySession,
  type NegotiationHistoryItem,
} from '@/services/inquiries';

function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return String(amount);
  }
}

function getQuoteErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('unauthorized_quote_access')) {
    return 'This quotation is not available for your account.';
  }
  if (message.includes('quote_not_available')) {
    return 'No quotation has been shared for this request yet.';
  }
  if (message.includes('quote_schema_missing')) {
    return 'Quotation access is not configured on the server yet. Run migrations 019–020 in Supabase.';
  }
  if (message.includes('waiting_for_sales')) {
    return 'Please wait for Logistix Sales to respond to your negotiation request.';
  }
  if (message.includes('request_must_be_lower')) {
    return 'Your requested amount must be lower than the current offer.';
  }
  if (message.includes('negotiation_closed') || message.includes('negotiation_not_allowed')) {
    return 'This quotation can no longer be negotiated.';
  }
  return message || 'Unable to load quotation.';
}

function statusBanner(status: string): { title: string; body: string; tone: 'info' | 'warn' | 'ok' | 'bad' } {
  switch (status) {
    case 'awaiting_sales':
      return {
        title: 'Waiting for Sales Response',
        body: 'Your negotiation request was sent. Sales will reply with a counter offer or decision.',
        tone: 'warn',
      };
    case 'awaiting_customer':
      return {
        title: 'Your Response Required',
        body: 'Sales sent an updated offer. Review the latest PDF and accept if you are ready.',
        tone: 'info',
      };
    case 'accepted':
      return {
        title: 'Quotation Accepted',
        body: 'You accepted this offer. Add tracking information from Orders if you have not already.',
        tone: 'ok',
      };
    case 'declined':
      return {
        title: 'Quotation Declined',
        body: 'This quotation was declined previously.',
        tone: 'bad',
      };
    default:
      return {
        title: 'Quotation ready',
        body: 'Review the offer, open the PDF, then accept when you are ready.',
        tone: 'info',
      };
  }
}

function historyTitle(item: NegotiationHistoryItem): string {
  switch (item.eventType) {
    case 'original_offer':
      return 'Original offer';
    case 'customer_request':
      return 'Your request';
    case 'sales_counter_sent':
      return 'Counter offer';
    case 'sales_accepted_request':
      return 'Sales accepted your request';
    case 'sales_rejected_request':
      return 'Sales rejected request';
    case 'customer_accepted':
      return 'You accepted';
    case 'customer_declined':
      return 'You declined';
    case 'resent_offer':
      return 'Offer resent';
    default:
      return item.eventType.replace(/_/g, ' ');
  }
}

function historyAmount(item: NegotiationHistoryItem): string {
  if (item.requestedAmount != null) return formatMoney(item.requestedAmount);
  if (item.offeredAmount != null) return formatMoney(item.offeredAmount);
  return '—';
}

export default function InquiryQuoteScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const inquiryId = Array.isArray(id) ? id[0] : id;

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['customer-quote', sessionToken, inquiryId],
    enabled: Boolean(sessionToken && inquiryId),
    queryFn: async () => {
      const result = await fetchCustomerQuoteBySession(sessionToken!, inquiryId!);
      if (result.error || !result.data) {
        throw result.error || new Error('quote_not_available');
      }
      return result.data;
    },
  });

  const banner = useMemo(
    () => statusBanner(data?.status || 'quote_ready'),
    [data?.status],
  );

  if (isLoading && !data) {
    return (
      <ScreenContainer title="Quotation" subtitle="Loading…">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading quotation…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isError || !data) {
    return (
      <ScreenContainer title="Quotation" subtitle="Unavailable">
        <EmptyState
          icon="document-text-outline"
          title="Quotation unavailable"
          description={getQuoteErrorMessage(error)}
          actionLabel="Back to request"
          onActionPress={() =>
            router.replace(APP_ROUTES.inquiryDetail(inquiryId || '') as Href)
          }
        />
      </ScreenContainer>
    );
  }

  const showPrevious =
    data.previousOfferAmount != null &&
    data.totalAmount != null &&
    data.previousOfferAmount !== data.totalAmount;

  return (
    <ScreenContainer
      title={data.quotationNumber || 'Quotation'}
      subtitle="Shared by Logistix"
      headerRight={
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>
      }
    >
      {isRefetching ? (
        <View style={styles.refreshRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.refreshText}>Refreshing…</Text>
        </View>
      ) : null}

      <FadeIn>
        <View
          style={[
            styles.banner,
            banner.tone === 'warn' && styles.bannerWarn,
            banner.tone === 'ok' && styles.bannerOk,
            banner.tone === 'bad' && styles.bannerBad,
          ]}
        >
          <Text style={styles.bannerTitle}>{banner.title}</Text>
          <Text style={styles.bannerBody}>{banner.body}</Text>
        </View>
      </FadeIn>

      <FadeIn delay={40}>
        <SectionHeader title="Current offer" />
        <Card>
          <FactRow label="Quote #" value={data.quotationNumber || '—'} />
          <FactRow label="Current offer" value={formatMoney(data.totalAmount)} />
          {showPrevious ? (
            <FactRow label="Previous offer" value={formatMoney(data.previousOfferAmount)} />
          ) : null}
          <FactRow
            label="Original offer"
            value={formatMoney(data.originalOfferAmount ?? data.totalAmount)}
          />
          <FactRow
            label="Valid until"
            value={
              data.expirationDate
                ? new Date(data.expirationDate).toLocaleDateString()
                : '—'
            }
            last
          />
        </Card>
      </FadeIn>

      <FadeIn delay={80}>
        <SectionHeader title="Negotiation history" />
        <Card>
          {data.history.length === 0 ? (
            <Text style={styles.emptyHistory}>No negotiation activity yet.</Text>
          ) : (
            data.history.map((item, index) => (
              <View
                key={item.id || `${item.eventType}-${index}`}
                style={[
                  styles.historyRow,
                  index < data.history.length - 1 && styles.historyBorder,
                ]}
              >
                <View style={styles.historyTop}>
                  <Text style={styles.historyTitle}>{historyTitle(item)}</Text>
                  <Text style={styles.historyAmount}>{historyAmount(item)}</Text>
                </View>
                <Text style={styles.historyMeta}>
                  {item.actorRole === 'customer' ? 'You' : 'Logistix'}
                  {item.createdAt
                    ? ` · ${new Date(item.createdAt).toLocaleString()}`
                    : ''}
                </Text>
                {item.message ? (
                  <Text style={styles.historyMessage}>“{item.message}”</Text>
                ) : null}
              </View>
            ))
          )}
        </Card>
      </FadeIn>

      <View style={styles.actions}>
        <Button
          label="Open quotation PDF"
          fullWidth
          size="lg"
          onPress={() => void Linking.openURL(data.pdfUrl)}
        />
        {data.canAccept ? (
          <Button
            label="Accept"
            fullWidth
            onPress={() =>
              router.push(APP_ROUTES.inquiryShipment(inquiryId || '') as Href)
            }
          />
        ) : null}
        {data.status === 'accepted' && data.canAddShipmentInfo ? (
          <Button
            label={
              data.shipmentStatus === 'accepted_pending'
                ? 'Add Tracking Information'
                : 'Update Shipment Information'
            }
            fullWidth
            variant="outline"
            onPress={() =>
              router.push(APP_ROUTES.inquiryShipment(inquiryId || '') as Href)
            }
          />
        ) : null}
        <Button
          label="Contact sales"
          variant="outline"
          fullWidth
          onPress={() => router.push(APP_ROUTES.support as Href)}
        />
        <Button label="Refresh" variant="ghost" fullWidth onPress={() => refetch()} />
      </View>
    </ScreenContainer>
  );
}

function FactRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.factRow, !last && styles.factBorder]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  backLink: {
    ...typography.label,
    color: colors.accent,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  banner: {
    backgroundColor: colors.infoLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerWarn: {
    backgroundColor: colors.warningLight,
  },
  bannerOk: {
    backgroundColor: colors.successLight,
  },
  bannerBad: {
    backgroundColor: colors.errorLight,
  },
  bannerTitle: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bannerBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  factRow: {
    paddingVertical: spacing.md,
  },
  factBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  factLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 4,
  },
  factValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  emptyHistory: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  historyRow: {
    paddingVertical: spacing.md,
  },
  historyBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  historyTitle: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  historyAmount: {
    ...typography.label,
    color: colors.accent,
  },
  historyMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  historyMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.huge,
  },
});
