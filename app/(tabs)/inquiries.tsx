import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, InquiryListItem, ScreenContainer } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { useAuth } from '@/providers';

export default function InquiriesScreen() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCustomerPortal(user?.phone);

  const leadSummary = useMemo(() => {
    if (!data?.leads.length) {
      return null;
    }

    const primaryLead = data.leads[0];
    return {
      name: primaryLead.name,
      leadNumber: primaryLead.leadNumber,
      status: primaryLead.status,
      totalLeads: data.leads.length,
    };
  }, [data?.leads]);

  const inquiries = data?.inquiries ?? [];

  return (
    <ScreenContainer
      title="My Inquiries"
      subtitle={
        leadSummary
          ? `Lead #${leadSummary.leadNumber ?? '—'} · ${inquiries.length} inquir${inquiries.length === 1 ? 'y' : 'ies'}`
          : 'Inquiries linked to your phone number'
      }
    >
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your inquiries...</Text>
        </View>
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to load inquiries"
          description={error instanceof Error ? error.message : 'Please try again later.'}
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {leadSummary ? (
            <View style={styles.leadCard}>
              <Text style={styles.leadLabel}>Your lead</Text>
              <Text style={styles.leadName}>{leadSummary.name || 'Customer'}</Text>
              <View style={styles.leadMetaRow}>
                <Text style={styles.leadMeta}>Lead #{leadSummary.leadNumber ?? '—'}</Text>
                <Text style={styles.leadMeta}>Status: {leadSummary.status}</Text>
              </View>
              {leadSummary.totalLeads > 1 ? (
                <Text style={styles.leadNote}>
                  {leadSummary.totalLeads} leads matched your phone number.
                </Text>
              ) : null}
            </View>
          ) : null}

          {inquiries.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No inquiries yet"
              description={
                leadSummary
                  ? 'When your sales agent sends inquiries for your lead, they will appear here.'
                  : 'No lead was found for your phone number yet. Ask your sales agent to confirm the lead phone matches your account (+92... vs 0300...). Pull down to refresh.'
              }
            />
          ) : (
            <View style={styles.list}>
              {inquiries.map((inquiry) => (
                <InquiryListItem key={inquiry.id} inquiry={inquiry} />
              ))}
            </View>
          )}
        </ScrollView>
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
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
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
  leadMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
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
  list: {
    gap: spacing.md,
  },
});
