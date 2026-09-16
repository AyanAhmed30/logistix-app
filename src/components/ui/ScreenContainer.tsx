import { ReactNode } from 'react';
import {
  RefreshControlProps,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationBellButton } from '@/components/ui/NotificationBellButton';
import { colors, spacing, typography } from '@/constants/theme';

type ScreenContainerProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  scrollable?: boolean;
  headerRight?: ReactNode;
  /** Shows the shared notification bell (unread badge) in the header. */
  showNotificationBell?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export function ScreenContainer({
  children,
  title,
  subtitle,
  style,
  scrollable = true,
  headerRight,
  showNotificationBell = false,
  edges = ['top'],
  refreshControl,
}: ScreenContainerProps) {
  const hasHeader = Boolean(title || subtitle || headerRight || showNotificationBell);

  const content = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, style]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.container} edges={edges}>
      {hasHeader ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {showNotificationBell || headerRight ? (
            <View style={styles.headerActions}>
              {showNotificationBell ? <NotificationBellButton size="compact" /> : null}
              {headerRight}
            </View>
          ) : null}
        </View>
      ) : null}
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    ...typography.body,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
});
