import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DraftRequestCard } from '@/components/inquiry';
import { EmptyState, FadeIn, FilterChips, ScreenContainer } from '@/components/ui';
import { mapInternalToCustomerStatus } from '@/constants/customer-status';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { mockRequests } from '@/data/mock/customer';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { APP_ROUTES, newRequestHref } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { listCustomerOrders } from '@/services/orders';
import { CustomerInquiry } from '@/types/inquiry';
import { CustomerStatusKey, MockRequest } from '@/types/customer';
import { getCustomerStatusVisual } from '@/utils/customer-status-ui';
import { isDraftInquiry } from '@/utils/home-dashboard';
import { getPortalErrorMessage } from '@/utils/inquiry-portal-errors';
import {
  buildRequestsHref,
  enrichInquiryShipmentFields,
  matchesMockRequestListFilters,
  matchesRequestListFilters,
  parsePendingStatus,
  parseRequestTab,
  PENDING_STATUS_OPTIONS,
  REQUEST_TAB_OPTIONS,
  type PendingStatusFilter,
  type RequestTab,
} from '@/utils/request-lifecycle';

type ListRow =
  | { kind: 'draft'; inquiry: CustomerInquiry }
  | {
      kind: 'request';
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

function liveToRequestRow(inquiry: CustomerInquiry): ListRow {
  const status = mapInternalToCustomerStatus({
    status: inquiry.status,
    sentAt: inquiry.sentAt,
    approvalStatus: inquiry.approvalStatus,
    customerSubmitted: inquiry.customerSubmitted,
    hasQuote: inquiry.hasQuote,
  });
  return {
    kind: 'request',
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

function mockToRequestRow(request: MockRequest): ListRow {
  return {
    kind: 'request',
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

function emptyCopy(tab: RequestTab, pendingStatus: PendingStatusFilter) {
  if (tab === 'finalized') {
    return {
      title: 'No finalized requests',
      description:
        'When tracking and a parcel photo are both added, the request moves here as an order-ready item.',
    };
  }
  if (tab === 'pending') {
    if (pendingStatus === 'draft') {
      return {
        title: 'No drafts yet',
        description: 'Save a request as a draft when you do not have all the details yet.',
      };
    }
    if (pendingStatus === 'sent') {
      return {
        title: 'Nothing sent yet',
        description: 'Submitted requests waiting for a quotation appear here.',
      };
    }
    if (pendingStatus === 'quotation_received') {
      return {
        title: 'No quotations yet',
        description: 'When your agent sends a quotation, it will show up here.',
      };
    }
    return {
      title: 'Nothing pending',
      description: 'Drafts, sent requests, and quotations you still need to act on appear here.',
    };
  }
  return {
    title: 'No requests yet',
    description: 'Create a new freight request to get started.',
  };
}

export default function InquiriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string; status?: string }>();
  const { sessionToken } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCustomerPortal(sessionToken);

  const [tab, setTab] = useState<RequestTab>(() => parseRequestTab(params.filter));
  const [pendingStatus, setPendingStatus] = useState<PendingStatusFilter>(() =>
    parsePendingStatus(params.status, params.filter),
  );

  useEffect(() => {
    setTab(parseRequestTab(params.filter));
    setPendingStatus(parsePendingStatus(params.status, params.filter));
  }, [params.filter, params.status]);

  const ordersQuery = useQuery({
    queryKey: ['customer-orders', sessionToken],
    enabled: Boolean(sessionToken),
    staleTime: 30_000,
    queryFn: async () => {
      const result = await listCustomerOrders(sessionToken!);
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });

  const hasLinkedCustomer = Boolean(data?.leads.length);
  const liveInquiries = data?.inquiries ?? [];

  const enrichedInquiries = useMemo(() => {
    const byInquiryId = new Map<
      string,
      { trackingNumber?: string | null; parcelPhotoUrl?: string | null; hasQuote?: boolean }
    >();
    for (const order of ordersQuery.data ?? []) {
      if (!order.inquiryId) continue;
      byInquiryId.set(order.inquiryId, {
        trackingNumber: order.trackingNumber,
        parcelPhotoUrl: order.parcelPhotoUrl,
        hasQuote: true,
      });
    }
    return liveInquiries.map((inquiry) =>
      enrichInquiryShipmentFields(inquiry, byInquiryId.get(inquiry.id)),
    );
  }, [liveInquiries, ordersQuery.data]);

  const usingDemo =
    __DEV__ &&
    !isLoading &&
    !isError &&
    enrichedInquiries.length === 0;

  const rows = useMemo((): ListRow[] => {
    if (usingDemo) {
      return mockRequests
        .filter((request) => matchesMockRequestListFilters(request.status, tab, pendingStatus))
        .map(mockToRequestRow);
    }

    return enrichedInquiries
      .filter((inquiry) => matchesRequestListFilters(inquiry, tab, pendingStatus))
      .map((inquiry) =>
        isDraftInquiry(inquiry) ? { kind: 'draft' as const, inquiry } : liveToRequestRow(inquiry),
      );
  }, [enrichedInquiries, pendingStatus, tab, usingDemo]);

  const refreshing = isRefetching || ordersQuery.isRefetching;
  const onRefresh = () => {
    void refetch();
    void ordersQuery.refetch();
  };

  const empty = emptyCopy(tab, pendingStatus);

  return (
    <ScreenContainer
      scrollable={false}
      title="Requests"
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
          <FilterChips
            variant="segmented"
            chips={REQUEST_TAB_OPTIONS}
            selectedId={tab}
            onSelect={(id) => {
              const next = id as RequestTab;
              setTab(next);
              if (next !== 'pending') setPendingStatus('all');
              router.replace(buildRequestsHref(next, next === 'pending' ? pendingStatus : 'all') as Href);
            }}
          />

          {tab === 'pending' ? (
            <View style={styles.statusBlock}>
              <Text style={styles.statusLabel}>Status</Text>
              <FilterChips
                chips={PENDING_STATUS_OPTIONS}
                selectedId={pendingStatus}
                onSelect={(id) => {
                  const next = id as PendingStatusFilter;
                  setPendingStatus(next);
                  router.replace(buildRequestsHref('pending', next) as Href);
                }}
              />
            </View>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={styles.scrollContent}
          >
            {usingDemo ? (
              <View style={styles.demoBanner}>
                <Ionicons name="sparkles-outline" size={16} color={colors.accentDark} />
                <Text style={styles.demoText}>
                  No live requests yet — showing demo samples. Pull to refresh anytime.
                </Text>
              </View>
            ) : null}

            {rows.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title={usingDemo ? 'No demo matches' : empty.title}
                description={
                  usingDemo
                    ? 'Try another filter, or create a new request.'
                    : hasLinkedCustomer
                      ? empty.description
                      : 'No customer profile was found for your phone yet. Ask your sales agent to confirm the phone matches your account.'
                }
                actionLabel="New request"
                onActionPress={() => router.push(newRequestHref() as Href)}
              />
            ) : (
              <View style={styles.list}>
                {rows.map((row, index) => {
                  if (row.kind === 'draft') {
                    return (
                      <FadeIn key={row.inquiry.id} delay={index * 40}>
                        <DraftRequestCard
                          draft={row.inquiry}
                          onContinue={() =>
                            router.push(APP_ROUTES.inquiryDraft(row.inquiry.id) as Href)
                          }
                        />
                      </FadeIn>
                    );
                  }

                  const visual = getCustomerStatusVisual(row.status);
                  return (
                    <FadeIn key={row.id} delay={index * 40}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push(APP_ROUTES.inquiryDetail(row.id) as Href)}
                        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                      >
                        <View style={styles.cardTop}>
                          <View style={styles.cardTitles}>
                            <Text style={styles.cardTitle} numberOfLines={2}>
                              {row.title}
                            </Text>
                            {row.source === 'demo' ? (
                              <Text style={styles.cardSubtitle}>Demo</Text>
                            ) : null}
                          </View>
                          <View
                            style={[styles.badge, { backgroundColor: visual.backgroundColor }]}
                          >
                            <Text style={[styles.badgeText, { color: visual.textColor }]}>
                              {visual.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.cardMeta}>{row.meta}</Text>
                        <Text style={styles.cardNext} numberOfLines={2}>
                          {row.nextStep}
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
    minWidth: 0,
  },
  statusBlock: {
    gap: spacing.xs,
    flexShrink: 0,
  },
  statusLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
