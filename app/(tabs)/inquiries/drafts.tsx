import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DraftRequestCard, RequestsSubNav } from '@/components/inquiry';
import { EmptyState, FadeIn, ScreenContainer } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { APP_ROUTES, newRequestHref } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { getDraftInquiries } from '@/utils/home-dashboard';
import { getPortalErrorMessage } from '@/utils/inquiry-portal-errors';

export default function DraftRequestsScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const { data, isLoading, isError, error, refetch, isRefetching } = useCustomerPortal(sessionToken);

  const drafts = getDraftInquiries(data?.inquiries ?? []);

  return (
    <ScreenContainer
      scrollable={false}
      title="Draft Requests"
      subtitle={
        drafts.length === 1 ? '1 saved draft' : `${drafts.length} saved drafts`
      }
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New request"
          onPress={() => router.push(newRequestHref() as Href)}
        >
          <Text style={styles.headerLink}>New</Text>
        </Pressable>
      }
    >
      {isLoading && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading drafts…</Text>
        </View>
      ) : isError && !data ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to load drafts"
          description={getPortalErrorMessage(error)}
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      ) : (
        <View style={styles.body}>
          <RequestsSubNav active="drafts" />
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
            {drafts.length === 0 ? (
              <EmptyState
                icon="document-outline"
                title="No draft requests yet"
                description="Save a request as a draft when you do not have all the details yet. You can continue it anytime."
                actionLabel="Create New Request"
                onActionPress={() => router.push(newRequestHref() as Href)}
              />
            ) : (
              <View style={styles.list}>
                {drafts.map((draft, index) => (
                  <FadeIn key={draft.id} delay={index * 40}>
                    <DraftRequestCard
                      draft={draft}
                      onContinue={() => router.push(APP_ROUTES.inquiryDraft(draft.id) as Href)}
                    />
                  </FadeIn>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerLink: {
    ...typography.label,
    color: colors.accent,
  },
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
    gap: spacing.md,
    paddingBottom: spacing.huge,
  },
  list: {
    gap: spacing.md,
  },
});
