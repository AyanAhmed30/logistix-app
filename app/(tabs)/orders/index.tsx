import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  EmptyState,
  FadeIn,
  FilterChips,
  OrderListItem,
  ScreenContainer,
  SearchBar,
} from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { APP_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import {
  listCustomerOrders,
  shipmentStatusLabel,
  type CustomerOrder,
  type ShipmentStatus,
} from '@/services/orders';
import { Order, OrderStatus } from '@/types/ui';

const filterChips = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'At warehouse' },
  { id: 'in_transit', label: 'In transit' },
  { id: 'delivered', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function mapShipmentToOrderStatus(status: ShipmentStatus): OrderStatus {
  switch (status) {
    case 'accepted_pending':
      return 'pending';
    case 'tracking_added':
    case 'photo_uploaded':
      return 'processing';
    case 'tracking_and_photo':
      return 'in_transit';
    default:
      return 'pending';
  }
}

function toListOrder(order: CustomerOrder): Order {
  const acceptedLabel = order.acceptedAt
    ? new Date(order.acceptedAt).toLocaleDateString()
    : '—';
  const hasTracking = Boolean(order.trackingNumber);
  const hasPhoto = Boolean(order.parcelPhotoUrl);

  return {
    id: order.orderId,
    reference: order.productService || `Order ${order.orderId.slice(0, 8).toUpperCase()}`,
    customer: order.trackingNumber
      ? `Tracking: ${order.trackingNumber}`
      : 'Tracking not added yet',
    origin: hasTracking
      ? `Tracking: ${order.trackingNumber}`
      : 'Tracking: Not provided',
    destination: hasPhoto ? 'Parcel photo uploaded' : shipmentStatusLabel(order.shipmentStatus),
    status: mapShipmentToOrderStatus(order.shipmentStatus),
    items: hasPhoto ? 1 : 0,
    weight: hasTracking ? String(order.trackingNumber) : 'No tracking',
    estimatedDelivery: acceptedLabel,
    createdAt: acceptedLabel,
    trackingNumber: order.trackingNumber,
  };
}

export default function OrdersScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['customer-orders', sessionToken],
    enabled: Boolean(sessionToken),
    queryFn: async () => {
      const result = await listCustomerOrders(sessionToken!);
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const listOrders = useMemo(() => (data || []).map(toListOrder), [data]);

  const filteredOrders = useMemo(() => {
    return listOrders.filter((order) => {
      const matchesFilter =
        selectedFilter === 'all' || order.status === (selectedFilter as OrderStatus);
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        order.reference.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.origin.toLowerCase().includes(query) ||
        order.destination.toLowerCase().includes(query) ||
        (order.trackingNumber || '').toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [listOrders, search, selectedFilter]);

  return (
    <ScreenContainer
      title="Orders"
      subtitle={
        data
          ? `${data.length} shipment${data.length === 1 ? '' : 's'} · accepted quotations`
          : 'Your shipments'
      }
      showNotificationBell
    >
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search reference, product, or tracking…"
      />

      <FilterChips chips={filterChips} selectedId={selectedFilter} onSelect={setSelectedFilter} />

      {isLoading && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to load orders"
          description={error instanceof Error ? error.message : 'Try again.'}
          actionLabel="Retry"
          onActionPress={() => refetch()}
        />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title={data?.length ? 'No matching orders' : 'No orders yet'}
          description={
            data?.length
              ? 'Try another filter or search.'
              : 'When you accept a quotation, your order will appear here with tracking details.'
          }
        />
      ) : (
        <FadeIn>
          <Text style={styles.resultCount}>
            {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}
            {isRefetching ? ' · refreshing…' : ''}
          </Text>
          <View style={styles.list}>
            {filteredOrders.map((order) => (
              <OrderListItem
                key={order.id}
                order={order}
                onPress={() => router.push(APP_ROUTES.orderDetail(order.id) as Href)}
              />
            ))}
          </View>
        </FadeIn>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  resultCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.huge,
  },
});
