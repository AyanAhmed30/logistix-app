import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { RequestsSubNav } from '@/components/inquiry';
import { EmptyState, FadeIn, FilterChips, ScreenContainer } from '@/components/ui';
import {
  matchesRequestFilter,
  mapInternalToCustomerStatus,
  REQUEST_FILTER_OPTIONS,
  RequestFilter,
} from '@/constants/customer-status';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { mockRequests } from '@/data/mock/customer';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { APP_ROUTES, newRequestHref } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { CustomerInquiry } from '@/types/inquiry';
import { CustomerStatusKey, MockRequest } from '@/types/customer';
import { getCustomerStatusVisual } from '@/utils/customer-status-ui';
import { getDraftInquiries, isDraftInquiry } from '@/utils/home-dashboard';
import { getPortalErrorMessage } from '@/utils/inquiry-portal-errors';

type ListItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  nextStep: string;
  status: CustomerStatusKey;
  source: 'live' | 'demo';
};

function formatRequestCargoMeta(input: {
  quantity?: string | null;
  totalWeight?: string | null;
  cbm?: string | null;
}): string {
  const parts: string[] = [];
  if (input.quantity?.trim()) parts.push(`Qty: ${input.quantity.trim()}`);
  if (input.totalWeight?.trim()) parts.push(`Weight: ${input.totalWeight.trim()} kg`);
  if (input.cbm?.trim()) parts.push(`CBM: ${input.cbm.trim()}`);
  return parts.join(' · ') || 'Details pending';
}

function liveToListItem(inquiry: CustomerInquiry): ListItem {
  const status = mapInternalToCustomerStatus({
    status: inquiry.status,
    sentAt: inquiry.sentAt,
    approvalStatus: inquiry.approvalStatus,
    customerSubmitted: inquiry.customerSubmitted,
    hasQuote: inquiry.hasQuote,
  });
  return {
    id: inquiry.id,
    title: inquiry.productName?.trim() || 'Freight request',
    subtitle: inquiry.inquiryNumber,
    meta: formatRequestCargoMeta({
      quantity: inquiry.quantity,
      totalWeight: inquiry.totalWeight,
      cbm: inquiry.cbm,
    }),
    nextStep: getCustomerStatusVisual(status).nextStep,
    status,
    source: 'live',
  };
}

function mockToListItem(request: MockRequest): ListItem {
  return {
    id: request.id,
    title: request.productName,
    subtitle: request.requestNumber,
    meta: formatRequestCargoMeta({
      quantity: request.quantity,
      totalWeight: request.totalWeight,
      cbm: request.cbm,
    }),
    nextStep: request.nextStep,
    status: request.status,
    source: 'demo',
  };
}

export default function InquiriesScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCustomerPortal(sessionToken);
  const [filter, setFilter] = useState<RequestFilter>('all');

  const leadSummary = useMemo(() => {
    if (!data?.leads.length) return null;
    const primaryLead = data.leads[0];
    return {
      name: primaryLead.name,
      leadNumber: primaryLead.leadNumber,
      totalLeads: data.leads.length,
    };
  }, [data?.leads]);

  const liveInquiries = data?.inquiries ?? [];
  const draftItems = useMemo(() => getDraftInquiries(liveInquiries), [liveInquiries]);
  const submittedInquiries = useMemo(
    () => liveInquiries.filter((inquiry) => !isDraftInquiry(inquiry)),
    [liveInquiries],
  );
  // Demo samples only in development — never in production empty states (Step 2 P0).
  const usingDemo = __DEV__ && !isLoading && !isError && submittedInquiries.length === 0 && draftItems.length === 0;

  const items = useMemo(() => {
    const sourceItems = usingDemo
      ? mockRequests.map(mockToListItem)
      : submittedInquiries.map(liveToListItem);

    return sourceItems.filter((item) => matchesRequestFilter(item.status, filter));
  }, [filter, submittedInquiries, usingDemo]);

  return (
    <ScreenContainer
      scrollable={false}
      title="Requests"
      subtitle={
        leadSummary
          ? `Lead #${leadSummary.leadNumber ?? '—'} · ${submittedInquiries.length} request${submittedInquiries.length === 1 ? '' : 's'}`
          : usingDemo
            ? 'Demo requests for exploration'
            : 'Freight requests linked to your phone'
      }
      showNotificationBell
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New request"
          onPress={() => router.push(newRequestHref() as Href)}
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="add" size={22} color={colors.surface} />
        </Pressable>
      }
    >
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your requests…</Text>
        </View>
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to load requests"
          description={getPortalErrorMessage(error)}
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      ) : (
        <View style={styles.body}>
          <RequestsSubNav active="requests" />
          <FilterChips
            chips={REQUEST_FILTER_OPTIONS}
            selectedId={filter}
            onSelect={(id) => setFilter(id as RequestFilter)}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => refetch()}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={styles.scrollContent}
          >
            {leadSummary ? (
              <FadeIn>
                <View style={styles.leadCard}>
                  <Text style={styles.leadLabel}>Your lead</Text>
                  <Text style={styles.leadName}>{leadSummary.name || 'Customer'}</Text>
                  <Text style={styles.leadMeta}>Lead #{leadSummary.leadNumber ?? '—'}</Text>
                  {leadSummary.totalLeads > 1 ? (
                    <Text style={styles.leadNote}>
                      {leadSummary.totalLeads} leads matched your phone number.
                    </Text>
                  ) : null}
                </View>
              </FadeIn>
            ) : null}

            {draftItems.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(APP_ROUTES.inquiryDrafts as Href)}
                style={({ pressed }) => [styles.draftBanner, pressed && { opacity: 0.92 }]}
              >
                <View style={styles.draftBannerText}>
                  <Text style={styles.draftHeading}>Draft Requests</Text>
                  <Text style={styles.draftHint}>
                    {draftItems.length === 1
                      ? '1 draft waiting to be finished'
                      : `${draftItems.length} drafts waiting to be finished`}
                  </Text>
                </View>
                <Text style={styles.viewLink}>View</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </Pressable>
            ) : null}

            {usingDemo ? (
              <View style={styles.demoBanner}>
                <Ionicons name="sparkles-outline" size={16} color={colors.accentDark} />
                <Text style={styles.demoText}>
                  No live requests yet — showing demo samples. Pull to refresh anytime.
                </Text>
              </View>
            ) : null}

            {items.length === 0 && (usingDemo || draftItems.length === 0) ? (
              <EmptyState
                icon="document-text-outline"
                title={usingDemo ? 'No demo matches' : 'No submitted requests'}
                description={
                  usingDemo
                    ? 'Try another filter, or create a new request to explore the flow.'
                    : leadSummary
                      ? draftItems.length > 0
                        ? 'You have drafts above. Submitted requests will appear here.'
                        : 'When your sales agent sends freight requests for your lead, they will appear here.'
                      : 'No lead was found for your phone yet. Ask your sales agent to confirm the lead phone matches your account. Pull down to refresh.'
                }
                actionLabel="New request"
                onActionPress={() => router.push(newRequestHref() as Href)}
              />
            ) : (
              <View style={styles.list}>
                {items.map((item, index) => {
                  const visual = getCustomerStatusVisual(item.status);
                  return (
                    <FadeIn key={item.id} delay={index * 40}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push(APP_ROUTES.inquiryDetail(item.id) as Href)}
                        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                      >
                        <View style={styles.cardTop}>
                          <View style={styles.cardTitles}>
                            <Text style={styles.cardTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text style={styles.cardSubtitle}>
                              {item.subtitle}
                              {item.source === 'demo' ? ' · Demo' : ''}
                            </Text>
                          </View>
                          <View
                            style={[styles.badge, { backgroundColor: visual.backgroundColor }]}
                          >
                            <Text style={[styles.badgeText, { color: visual.textColor }]}>
                              {visual.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.cardMeta}>{item.meta}</Text>
                        <Text style={styles.cardNext} numberOfLines={2}>
                          {item.nextStep}
                        </Text>
                        <View style={styles.cardFooter}>
                          <Text style={styles.viewLink}>View details</Text>
                          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                        </View>
                      </Pressable>
                    </FadeIn>
                  );
                })}
              </View>
            )}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New freight request"
            onPress={() => router.push(newRequestHref() as Href)}
            style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="add" size={26} color={colors.surface} />
            <Text style={styles.fabLabel}>New request</Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    flex: 1,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  body: {
    flex: 1,
    gap: spacing.md,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: 100,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
  },
  leadLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  leadName: {
    ...typography.h3,
    color: colors.text,
  },
  leadMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  leadNote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.accentLight,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#B2EBEB',
  },
  demoText: {
    ...typography.bodySmall,
    color: colors.accentDark,
    flex: 1,
  },
  list: {
    gap: spacing.md,
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  draftBannerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  draftHeading: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
  },
  draftHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    ...shadows.sm,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  cardTitles: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  cardMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  cardNext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
  },
  viewLink: {
    ...typography.label,
    color: colors.accent,
  },
  fab: {
    position: 'absolute',
    right: 0,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    ...shadows.md,
  },
  fabLabel: {
    ...typography.label,
    color: colors.surface,
  },
});
