import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ActionCard,
  EmptyState,
  FadeIn,
  ScreenContainer,
  SectionHeader,
  SkeletonCard,
} from '@/components/ui';
import { getCustomerStatusConfig } from '@/constants/customer-status';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { APP_ROUTES, newRequestHref } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { getCustomerStatusVisual } from '@/utils/customer-status-ui';
import {
  deriveHomeActions,
  getActivePortalInquiries,
  getInquiryCustomerStatus,
  isDraftInquiry,
} from '@/utils/home-dashboard';
import { getPortalErrorMessage } from '@/utils/inquiry-portal-errors';

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { user, sessionToken } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCustomerPortal(sessionToken);

  const inquiries = data?.inquiries ?? [];
  const lead = data?.leads?.[0];

  const activeRequests = useMemo(() => getActivePortalInquiries(inquiries), [inquiries]);
  const actions = useMemo(() => deriveHomeActions(inquiries), [inquiries]);
  const completedCount = useMemo(
    () =>
      inquiries.filter((inq) => {
        if (isDraftInquiry(inq)) return false;
        const status = getInquiryCustomerStatus(inq);
        return status === 'completed';
      }).length,
    [inquiries],
  );

  const firstName = user?.firstName?.trim() || 'there';
  const customerId = lead?.leadNumber?.trim() || null;
  const companyName = lead?.name?.trim() || null;
  const subtitle = customerId
    ? `Customer ID ${customerId}${companyName ? ` · ${companyName}` : ''}`
    : companyName || 'Your logistics overview';

  if (isLoading && !data) {
    return (
      <ScreenContainer title="Home" subtitle="Loading your logistics overview…">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScreenContainer>
    );
  }

  if (isError && !data) {
    return (
      <ScreenContainer title="Home" subtitle="Unable to load">
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to load home"
          description={getPortalErrorMessage(error)}
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      title={`${greetingForNow()}, ${firstName}`}
      subtitle={subtitle}
      showNotificationBell
      scrollable
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={colors.accent}
        />
      }
    >
      <FadeIn>
        <LinearGradient
          colors={[colors.primaryDark, colors.primaryMid, colors.accentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>Command center</Text>
              <Text style={styles.heroTitle}>Your freight at a glance</Text>
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name="boat" size={22} color={colors.white} />
            </View>
          </View>
          <View style={styles.summaryRow}>
            <SummaryTile
              label="Active"
              value={String(activeRequests.length)}
              icon="document-text-outline"
              light
            />
            <SummaryTile
              label="Actions"
              value={String(actions.length)}
              icon="flash-outline"
              light
            />
            <SummaryTile
              label="Done"
              value={String(completedCount)}
              icon="checkmark-circle-outline"
              light
            />
          </View>
          <Pressable
            onPress={() => router.push(newRequestHref() as Href)}
            style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.92 }]}
          >
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text style={styles.heroCtaText}>Start a new freight request</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </Pressable>
        </LinearGradient>
      </FadeIn>

      <FadeIn delay={80}>
        <SectionHeader title="Things you need to do" />
        {actions.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="sparkles-outline" size={22} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>You’re all caught up</Text>
            <Text style={styles.emptyBody}>
              When a quote is ready or something needs your input, it will show up here.
            </Text>
          </View>
        ) : (
          <View style={styles.stack}>
            {actions.map((item) => (
              <ActionCard
                key={item.id}
                item={item}
                onPress={() => {
                  if (!item.requestId) return;
                  if (item.id.startsWith('draft-')) {
                    router.push(APP_ROUTES.inquiryDraft(item.requestId) as Href);
                    return;
                  }
                  if (item.type === 'quote') {
                    router.push(APP_ROUTES.inquiryQuote(item.requestId) as Href);
                    return;
                  }
                  router.push(APP_ROUTES.inquiryDetail(item.requestId) as Href);
                }}
              />
            ))}
          </View>
        )}
      </FadeIn>

      <FadeIn delay={140}>
        <SectionHeader
          title="Active requests"
          actionLabel="See all"
          onActionPress={() => router.push(APP_ROUTES.inquiries as Href)}
        />
        {activeRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active requests</Text>
            <Text style={styles.emptyBody}>
              Sent freight requests linked to your phone will appear here.
            </Text>
            <Pressable
              onPress={() => router.push(APP_ROUTES.inquiries as Href)}
              style={styles.emptyLinkWrap}
            >
              <Text style={styles.emptyLink}>Go to Requests</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.stack}>
            {activeRequests.slice(0, 3).map((req, index) => {
              const status = getInquiryCustomerStatus(req);
              const visual = getCustomerStatusVisual(status);
              const config = getCustomerStatusConfig(status);
              return (
                <FadeIn key={req.id} delay={160 + index * 50}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(APP_ROUTES.inquiryDetail(req.id) as Href)}
                    style={({ pressed }) => [styles.requestCard, pressed && { opacity: 0.92 }]}
                  >
                    <View style={styles.requestAccent} />
                    <View style={styles.requestBody}>
                      <View style={styles.requestTop}>
                        <Text style={styles.requestTitle}>
                          {req.productName?.trim() || 'Freight request'}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: visual.backgroundColor }]}>
                          <Text style={[styles.badgeText, { color: visual.textColor }]}>
                            {visual.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.requestMeta}>
                        {[req.inquiryNumber, req.quantity].filter(Boolean).join(' · ')}
                      </Text>
                      <Text style={styles.requestNext}>{config.nextEvent}</Text>
                    </View>
                  </Pressable>
                </FadeIn>
              );
            })}
          </View>
        )}
      </FadeIn>

      <FadeIn delay={200}>
        <SectionHeader title="Quick actions" />
        <View style={styles.quickRow}>
          <QuickTile
            icon="add-circle-outline"
            label="New request"
            onPress={() => router.push(newRequestHref() as Href)}
          />
          <QuickTile
            icon="document-text-outline"
            label="Requests"
            onPress={() => router.push(APP_ROUTES.inquiries as Href)}
          />
          <QuickTile
            icon="headset-outline"
            label="Support"
            onPress={() => router.push(APP_ROUTES.support as Href)}
          />
        </View>
      </FadeIn>

      {isRefetching ? (
        <View style={styles.refreshHint}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  light,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  light?: boolean;
}) {
  return (
    <View style={[styles.summaryTile, light && styles.summaryTileLight]}>
      <Ionicons name={icon} size={16} color={light ? 'rgba(255,255,255,0.85)' : colors.accent} />
      <Text style={[styles.summaryValue, light && styles.summaryValueLight]}>{value}</Text>
      <Text style={[styles.summaryLabel, light && styles.summaryLabelLight]}>{label}</Text>
    </View>
  );
}

function QuickTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickTile, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
    >
      <LinearGradient colors={[colors.accentLight, colors.surface]} style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={colors.accentDark} />
      </LinearGradient>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: radius.xxl,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroEyebrow: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...typography.h2,
    color: colors.white,
    marginTop: spacing.xs,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  summaryTileLight: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.16)',
    shadowOpacity: 0,
    elevation: 0,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.text,
  },
  summaryValueLight: {
    color: colors.white,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryLabelLight: {
    color: 'rgba(255,255,255,0.72)',
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  heroCtaText: {
    ...typography.label,
    flex: 1,
    color: colors.primary,
    fontSize: 14,
  },
  stack: {
    gap: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
  },
  emptyBody: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  emptyLinkWrap: {
    marginTop: spacing.sm,
  },
  emptyLink: {
    ...typography.label,
    color: colors.accent,
  },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  requestAccent: {
    width: 4,
    backgroundColor: colors.accent,
  },
  requestBody: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  requestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  requestTitle: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  requestMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  requestNext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
  quickRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  refreshHint: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
});
