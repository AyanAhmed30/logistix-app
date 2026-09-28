import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, FadeIn, ScreenContainer } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { APP_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { loadCustomerDocuments } from '@/services/documents/customer-documents';
import {
  buildDemoDocumentHistory,
  type DocumentHistoryGroup,
} from '@/utils/customer-documents';

function statusToneColors(tone: DocumentHistoryGroup['statusTone']): {
  bg: string;
  text: string;
} {
  switch (tone) {
    case 'finalized':
      return { bg: colors.successLight, text: '#15803D' };
    case 'quote':
      return { bg: colors.infoLight, text: colors.info };
    case 'draft':
      return { bg: colors.surfaceMuted, text: colors.textSecondary };
    default:
      return { bg: colors.primaryLight, text: colors.primary };
  }
}

export default function DocumentsListScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['customer-documents', sessionToken],
    enabled: Boolean(sessionToken),
    queryFn: async () => {
      const result = await loadCustomerDocuments(sessionToken!);
      if (result.error && result.data.length === 0) throw result.error;
      return result.data;
    },
  });

  const liveGroups = data ?? [];
  const usingDemo = __DEV__ && !isLoading && !isError && liveGroups.length === 0;
  const groups = usingDemo ? buildDemoDocumentHistory() : liveGroups;

  return (
    <ScreenContainer
      title="Documents"
      subtitle="Select a request or order"
      headerRight={
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
      }
    >
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading requests & orders…</Text>
        </View>
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to load history"
          description={error instanceof Error ? error.message : 'Please try again.'}
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon="folder-open-outline"
          title="No requests or orders yet"
          description="When you submit requests or finalize orders, they will appear here."
        />
      ) : (
        <View style={styles.list}>
          {usingDemo ? (
            <View style={styles.demoBanner}>
              <Ionicons name="sparkles-outline" size={16} color={colors.accentDark} />
              <Text style={styles.demoText}>
                Showing sample history. Tap an item to see its documents.
              </Text>
            </View>
          ) : null}

          {isRefetching ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.refreshHint} />
          ) : null}

          {groups.map((group, index) => {
            const tone = statusToneColors(group.statusTone);
            return (
              <FadeIn key={group.id} delay={index * 40}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${group.title}, view documents`}
                  onPress={() =>
                    router.push(
                      APP_ROUTES.documentDetail(group.detailId, group.source) as Href,
                    )
                  }
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons
                      name={group.kind === 'order' ? 'cube-outline' : 'document-text-outline'}
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.body}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={2}>
                        {group.title}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                        <Text style={[styles.badgeText, { color: tone.text }]}>
                          {group.statusLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.reference}>{group.reference}</Text>
                    {group.dateLabel ? (
                      <Text style={styles.meta}>{group.dateLabel}</Text>
                    ) : null}
                    <View style={styles.footer}>
                      <Text style={styles.action}>View documents</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                    </View>
                  </View>
                </Pressable>
              </FadeIn>
            );
          })}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: {
    ...typography.label,
    color: colors.accent,
  },
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
  list: {
    gap: spacing.md,
  },
  refreshHint: {
    alignSelf: 'center',
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
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  reference: {
    ...typography.caption,
    color: colors.textMuted,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.xs,
  },
  action: {
    ...typography.label,
    color: colors.accent,
  },
});
