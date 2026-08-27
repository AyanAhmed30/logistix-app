import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, FadeIn, ScreenContainer } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { mockNotifications } from '@/data/mock/customer';

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <ScreenContainer
      title="Notifications"
      subtitle="Updates on quotes, cargo, and actions"
      headerRight={
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
      }
    >
      {mockNotifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="No notifications"
          description="Status and quote updates will show up here."
        />
      ) : (
        <View style={styles.list}>
          {mockNotifications.map((item, index) => (
            <FadeIn key={item.id} delay={index * 40}>
              <View style={[styles.card, !item.read && styles.cardUnread]}>
                <View style={styles.row}>
                  <Text style={styles.title}>{item.title}</Text>
                  {!item.read ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.body}>{item.body}</Text>
                <Text style={styles.time}>{item.timestamp}</Text>
              </View>
            </FadeIn>
          ))}
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
  },
  cardUnread: {
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  body: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
