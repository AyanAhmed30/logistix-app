import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState, FadeIn, ScreenContainer } from '@/components/ui';
import { colors, radius, shadows, spacing, typography } from '@/constants/theme';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import {
  formatNotificationTime,
  notificationVisual,
  resolveNotificationHref,
} from '@/utils/notification-ui';

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    markRead,
    markAllRead,
  } = useCustomerNotifications();

  const items = data ?? [];
  const unreadCount = items.filter((item) => !item.isRead).length;

  const openNotification = async (id: string, href: string, isRead: boolean) => {
    if (!isRead) {
      try {
        await markRead.mutateAsync(id);
      } catch {
        // Still navigate even if mark-read fails
      }
    }
    router.push(resolveNotificationHref(href) as Href);
  };

  return (
    <ScreenContainer
      scrollable={false}
      title="Notifications"
      subtitle={
        unreadCount > 0
          ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
          : 'Updates on your freight activity'
      }
      headerRight={
        <View style={styles.headerActions}>
          {unreadCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void markAllRead.mutateAsync()}
              hitSlop={8}
              style={({ pressed }) => [styles.markAll, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>Back</Text>
          </Pressable>
        </View>
      }
    >
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notifications…</Text>
        </View>
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to load notifications"
          description={
            error instanceof Error
              ? error.message.includes('notification_schema_missing')
                ? 'Run migration 041_customer_app_notifications.sql in Supabase, then try again.'
                : error.message
              : 'Please try again.'
          }
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="You're all caught up"
          description="When your inquiry moves forward, a quotation is ready, or shipment details are added, you'll see it here."
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.list}
        >
          {items.map((item, index) => {
            const visual = notificationVisual(item);
            return (
              <FadeIn key={item.id} delay={Math.min(index, 12) * 30}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: !item.isRead }}
                  onPress={() =>
                    void openNotification(item.id, item.href, item.isRead)
                  }
                  style={({ pressed }) => [
                    styles.card,
                    !item.isRead && styles.cardUnread,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: visual.colors.bg }]}>
                    <Ionicons
                      name={visual.icon}
                      size={20}
                      color={visual.colors.icon}
                    />
                  </View>
                  <View style={styles.body}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {!item.isRead ? <View style={styles.dot} /> : null}
                    </View>
                    <Text style={styles.message} numberOfLines={3}>
                      {item.message}
                    </Text>
                    <View style={styles.footer}>
                      <Text style={styles.time}>{formatNotificationTime(item.createdAt)}</Text>
                      <View style={styles.openRow}>
                        <Text style={styles.open}>Open</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.accent} />
                      </View>
                    </View>
                  </View>
                </Pressable>
              </FadeIn>
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  markAll: {
    paddingVertical: 4,
  },
  markAllText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  back: {
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
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
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
  cardUnread: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginTop: 5,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  open: {
    ...typography.label,
    color: colors.accent,
  },
});
