import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, typography } from '@/constants/theme';
import { mockNotifications } from '@/data/mock/customer';
import { APP_ROUTES } from '@/navigation/routes';

/** Unread count from the same notification source used by Profile → Notifications. */
export function getUnreadNotificationCount(): number {
  return mockNotifications.filter((item) => !item.read).length;
}

type Props = {
  /** Compact size for dense headers that already have another action. */
  size?: 'default' | 'compact';
};

/**
 * Header notification bell that opens the existing notifications screen.
 * Reuses mock/live notification data already shown under Profile.
 */
export function NotificationBellButton({ size = 'default' }: Props) {
  const router = useRouter();
  const unread = getUnreadNotificationCount();
  const iconSize = size === 'compact' ? 20 : 22;
  const box = size === 'compact' ? 36 : 40;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0
          ? `Notifications, ${unread} unread`
          : 'Notifications'
      }
      onPress={() => router.push(APP_ROUTES.notifications as Href)}
      hitSlop={8}
      style={({ pressed }) => [
        styles.bell,
        { width: box, height: box },
        pressed && styles.bellPressed,
      ]}
    >
      <Ionicons name="notifications-outline" size={iconSize} color={colors.text} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bell: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellPressed: {
    opacity: 0.85,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
