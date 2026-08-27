import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { InquiryAttachments, InquiryImageGallery } from '@/components/inquiry';
import {
  Button,
  Card,
  EmptyState,
  FadeIn,
  ScreenContainer,
  SectionHeader,
  StatusBanner,
  TrackingTimeline,
} from '@/components/ui';
import {
  getCustomerStatusConfig,
  mapInternalToCustomerStatus,
} from '@/constants/customer-status';
import { colors, spacing, typography } from '@/constants/theme';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { APP_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { buildInquiryTimeline, displayOrDash } from '@/utils/inquiry-detail';
import { getCustomerStatusVisual } from '@/utils/customer-status-ui';
import { getInquiryDocumentUrls, getInquiryImageUrls } from '@/utils/inquiry-media';
import { getPortalErrorMessage } from '@/utils/inquiry-portal-errors';

export default function RequestDetailScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Array.isArray(id) ? id[0] : id;

  const { data, isLoading, isError, error, refetch, isRefetching } = useCustomerPortal(sessionToken);

  const inquiry = data?.inquiries.find((row) => row.id === requestId);

  if (isLoading && !data) {
    return (
      <ScreenContainer title="Request" subtitle="Loading…">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading request…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer title="Request" subtitle="Unable to load">
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to load request"
          description={getPortalErrorMessage(error)}
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      </ScreenContainer>
    );
  }

  if (!requestId || !inquiry) {
    return (
      <ScreenContainer title="Request" subtitle="Not found">
        <EmptyState
          icon="document-text-outline"
          title="Request not found"
          description="This request is not linked to your account, or it is no longer available."
          actionLabel="Back to requests"
          onActionPress={() => router.replace(APP_ROUTES.inquiries as Href)}
        />
      </ScreenContainer>
    );
  }

  const customerStatus = mapInternalToCustomerStatus({
    status: inquiry.status,
    sentAt: inquiry.sentAt,
    approvalStatus: inquiry.approvalStatus,
    customerSubmitted: inquiry.customerSubmitted,
    hasQuote: inquiry.hasQuote,
  });
  const visual = getCustomerStatusVisual(customerStatus);
  const statusConfig = getCustomerStatusConfig(customerStatus);
  const timeline = buildInquiryTimeline(inquiry);
  const imageUrls = getInquiryImageUrls(inquiry);
  const documentUrls = getInquiryDocumentUrls(inquiry);
  const updatedLabel = displayOrDash(
    inquiry.updatedAt ? new Date(inquiry.updatedAt).toLocaleString() : null,
  );
  const actionLabel =
    customerStatus === 'quote_ready'
      ? 'Review quote'
      : customerStatus === 'action_needed'
        ? 'Contact support'
        : undefined;

  const onStatusAction = () => {
    if (customerStatus === 'quote_ready') {
      router.push(APP_ROUTES.inquiryQuote(inquiry.id) as Href);
      return;
    }
    router.push(APP_ROUTES.support as Href);
  };

  return (
    <ScreenContainer
      title={inquiry.inquiryNumber}
      subtitle={inquiry.productName?.trim() || 'Freight request'}
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

      {inquiry.leadNumber ? (
        <Text style={styles.leadMeta}>Lead #{inquiry.leadNumber}</Text>
      ) : null}

      <FadeIn>
        <StatusBanner
          visual={{
            ...visual,
            explanation: statusConfig.explanation,
            nextStep: statusConfig.nextEvent,
            requiresAction: statusConfig.requiresAction,
          }}
          actionLabel={actionLabel}
          onActionPress={onStatusAction}
        />
      </FadeIn>

      {inquiry.hasQuote ? (
        <FadeIn delay={40}>
          <SectionHeader title="Quotation" />
          <Card>
            <FactRow
              label="Quote #"
              value={displayOrDash(inquiry.quoteNumber)}
            />
            <FactRow
              label="Total"
              value={
                inquiry.quoteTotal != null && !Number.isNaN(inquiry.quoteTotal)
                  ? String(inquiry.quoteTotal)
                  : '—'
              }
              last
            />
            <View style={styles.quoteActions}>
              <Button
                label="Open quotation"
                fullWidth
                onPress={() => router.push(APP_ROUTES.inquiryQuote(inquiry.id) as Href)}
              />
            </View>
          </Card>
        </FadeIn>
      ) : null}

      <FadeIn delay={60}>
        <SectionHeader title="Cargo details" />
        <Card>
          <FactRow label="Product" value={displayOrDash(inquiry.productName)} />
          <FactRow label="Quantity" value={displayOrDash(inquiry.quantity)} />
          <FactRow label="Weight" value={displayOrDash(inquiry.totalWeight)} />
          <FactRow label="CBM" value={displayOrDash(inquiry.cbm)} />
          <FactRow label="Updated" value={updatedLabel} last />
        </Card>
      </FadeIn>

      {inquiry.description?.trim() ? (
        <FadeIn delay={100}>
          <SectionHeader title="Description" />
          <Card>
            <Text style={styles.description}>{inquiry.description.trim()}</Text>
          </Card>
        </FadeIn>
      ) : null}

      {imageUrls.length > 0 ? (
        <FadeIn delay={120}>
          <InquiryImageGallery imageUrls={imageUrls} />
        </FadeIn>
      ) : null}

      <FadeIn delay={140}>
        <SectionHeader title="Timeline" />
        <Card>
          <TrackingTimeline events={timeline} />
        </Card>
      </FadeIn>

      <FadeIn delay={180}>
        <SectionHeader title="Documents" />
        <Card>
          {documentUrls.length > 0 || inquiry.linkUrl ? (
            <InquiryAttachments documentUrls={documentUrls} linkUrl={inquiry.linkUrl} />
          ) : (
            <Text style={styles.docEmpty}>
              Documents will appear here when Logistix shares quotes, packing lists, or invoices.
            </Text>
          )}
        </Card>
      </FadeIn>

      <View style={styles.ctaRow}>
        <Button
          label="Contact support"
          variant="outline"
          fullWidth
          onPress={() => router.push(APP_ROUTES.support as Href)}
        />
        {statusConfig.requiresAction ? (
          <Button
            label={actionLabel ?? 'Take action'}
            fullWidth
            onPress={onStatusAction}
          />
        ) : null}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  leadMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  backLink: {
    ...typography.label,
    color: colors.accent,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
  factRow: {
    paddingVertical: spacing.md,
    gap: 2,
  },
  factBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  factLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  factValue: {
    ...typography.body,
    color: colors.text,
  },
  quoteActions: {
    marginTop: spacing.md,
  },
  docEmpty: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  ctaRow: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
