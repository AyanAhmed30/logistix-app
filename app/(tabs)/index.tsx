import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  OrderListItem,
  QuickAction,
  ScreenContainer,
  SectionHeader,
  StatCard,
} from '@/components/ui';
import { mockDashboardStats, mockQuickActions, mockRecentOrders } from '@/data/mock/dashboard';
import { colors, radius, spacing, typography } from '@/constants/theme';

/**
 * Dashboard Screen
 *
 * Purpose: Operations overview — KPIs, quick actions, and recent activity at a glance.
 * Uses mock data to demonstrate layout patterns for a logistics command center.
 */
export default function DashboardScreen() {
  const handleQuickAction = (_id: string) => {
    // UI placeholder
  };

  const handleOrderPress = (_id: string) => {
    // UI placeholder
  };

  return (
    <ScreenContainer
      title="Dashboard"
      subtitle="Good morning, Sarah 👋"
      headerRight={
        <Pressable style={styles.notificationBtn} accessibilityRole="button">
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          <View style={styles.notificationDot} />
        </Pressable>
      }
    >
      <View style={styles.statsGrid}>
        {mockDashboardStats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </View>

      <View>
        <SectionHeader title="Quick Actions" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickActions}>
            {mockQuickActions.map((action) => (
              <QuickAction
                key={action.id}
                label={action.label}
                icon={action.icon}
                onPress={() => handleQuickAction(action.id)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.alertBanner}>
        <Ionicons name="warning-outline" size={20} color={colors.warning} />
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>2 shipments delayed</Text>
          <Text style={styles.alertText}>Review affected orders in the Orders tab.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>

      <View>
        <SectionHeader title="Recent Orders" actionLabel="See all" onActionPress={() => {}} />
        <View style={styles.orderList}>
          {mockRecentOrders.map((order) => (
            <OrderListItem
              key={order.id}
              order={order}
              compact
              onPress={() => handleOrderPress(order.id)}
            />
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingRight: spacing.xl,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...typography.label,
    color: '#92400E',
  },
  alertText: {
    ...typography.caption,
    color: '#B45309',
    marginTop: 2,
  },
  orderList: {
    gap: spacing.md,
  },
});
