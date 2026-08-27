import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  FadeIn,
  ScreenContainer,
  SectionHeader,
  StatusBanner,
  StatusBadge,
  TrackingTimeline,
} from '@/components/ui';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { getOrderById, getShipmentByOrderId, mockOrders } from '@/data/mock/customer';
import { APP_ROUTES } from '@/navigation/routes';
import { getCustomerStatusVisual } from '@/utils/customer-status-ui';
import { CustomerStatusKey } from '@/types/customer';

const ORDER_STATUS_TO_CUSTOMER: Record<string, CustomerStatusKey> = {
  pending: 'submitted',
  processing: 'in_progress',
  in_transit: 'in_progress',
  delivered: 'completed',
  cancelled: 'cancelled',
};

const PAYMENT_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  not_due: { label: 'Not due yet', color: colors.textSecondary, bg: colors.surfaceMuted },
  pending: { label: 'Payment pending', color: colors.warning, bg: colors.warningLight },
  paid: { label: 'Paid', color: colors.success, bg: colors.successLight },
  overdue: { label: 'Overdue', color: colors.error, bg: colors.errorLight },
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Array.isArray(id) ? id[0] : id;
  const order = (orderId && getOrderById(orderId)) || mockOrders[0];

  if (!order) {
    return (
      <ScreenContainer title="Order" subtitle="Not found">
        <EmptyState
          icon="cube-outline"
          title="Order not found"
          description="This shipment is not in the demo data."
          actionLabel="Back to orders"
          onActionPress={() => router.replace(APP_ROUTES.orders as Href)}
        />
      </ScreenContainer>
    );
  }

  const shipment = getShipmentByOrderId(order.id);
  const customerKey = ORDER_STATUS_TO_CUSTOMER[order.status] ?? 'in_progress';
  const baseVisual = getCustomerStatusVisual(customerKey);
  const visual = {
    ...baseVisual,
    label: order.statusLabel,
    explanation: order.explanation,
    nextStep: order.nextStep,
  };
  const payment = PAYMENT_LABEL[order.paymentStatus] ?? PAYMENT_LABEL.not_due;

  return (
    <ScreenContainer
      title={order.reference}
      subtitle={order.productName}
      headerRight={
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>
      }
    >
      <FadeIn>
        <StatusBanner visual={visual} />
      </FadeIn>

      <FadeIn delay={60}>
        <View style={styles.statusRow}>
          <StatusBadge status={order.status} />
          <View style={[styles.payBadge, { backgroundColor: payment.bg }]}>
            <Text style={[styles.payText, { color: payment.color }]}>{payment.label}</Text>
          </View>
        </View>
      </FadeIn>

      <FadeIn delay={100}>
        <SectionHeader title="Shipment facts" />
        <Card>
          <FactRow label="Route" value={`${order.origin} → ${order.destination}`} />
          <FactRow label="Cartons" value={String(order.cartons)} />
          <FactRow label="Weight" value={order.weight} />
          <FactRow label="CBM" value={order.cbm} />
          <FactRow label="Shipping mark" value={order.shippingMark} />
          <FactRow label="Amount" value={order.amount} />
          <FactRow label="ETA" value={order.estimatedDelivery} last />
        </Card>
      </FadeIn>

      <FadeIn delay={140}>
        <SectionHeader title="Warehouse timeline" />
        <Card>
          <TrackingTimeline events={shipment.events} />
        </Card>
      </FadeIn>

      <View style={styles.ctaRow}>
        <Button
          label="Track shipment"
          fullWidth
          size="lg"
          onPress={() => router.push(APP_ROUTES.tracking as Href)}
          icon={<Ionicons name="navigate-outline" size={18} color={colors.surface} />}
        />
        <Button
          label="Contact support"
          variant="outline"
          fullWidth
          onPress={() => router.push(APP_ROUTES.support as Href)}
        />
      </View>
    </ScreenContainer>
  );
}

function FactRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.factRow, !last && styles.factBorder]}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: {
    ...typography.label,
    color: colors.accent,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  payBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  payText: {
    ...typography.caption,
    fontWeight: '700',
  },
  factRow: {
    paddingVertical: spacing.md,
    gap: 2,
  },
  factBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  factLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  factValue: {
    ...typography.body,
    color: colors.text,
  },
  ctaRow: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
