import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  EmptyState,
  FadeIn,
  FilterChips,
  OrderListItem,
  ScreenContainer,
  SearchBar,
} from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { mockCustomer, mockOrders } from '@/data/mock/customer';
import { APP_ROUTES } from '@/navigation/routes';
import { Order, OrderStatus } from '@/types/ui';

const filterChips = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'At warehouse' },
  { id: 'in_transit', label: 'In transit' },
  { id: 'delivered', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function toListOrder(order: (typeof mockOrders)[number]): Order {
  return {
    id: order.id,
    reference: order.reference,
    customer: order.productName,
    origin: order.origin,
    destination: order.destination,
    status: order.status,
    items: order.cartons,
    weight: order.weight,
    estimatedDelivery: order.estimatedDelivery,
    createdAt: order.createdAt,
  };
}

export default function OrdersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    return mockOrders.filter((order) => {
      const matchesFilter =
        selectedFilter === 'all' || order.status === (selectedFilter as OrderStatus);
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        order.reference.toLowerCase().includes(query) ||
        order.productName.toLowerCase().includes(query) ||
        order.origin.toLowerCase().includes(query) ||
        order.destination.toLowerCase().includes(query) ||
        order.shippingMark.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [search, selectedFilter]);

  return (
    <ScreenContainer
      title="Orders"
      subtitle={`${mockOrders.length} shipments · ${mockCustomer.companyName}`}
      showNotificationBell
    >
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search reference, product, or mark…"
      />

      <FilterChips chips={filterChips} selectedId={selectedFilter} onSelect={setSelectedFilter} />

      <Text style={styles.resultCount}>
        {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}
      </Text>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No orders found"
          description="Try adjusting your search or filter."
          actionLabel="Clear filters"
          onActionPress={() => {
            setSearch('');
            setSelectedFilter('all');
          }}
        />
      ) : (
        <View style={styles.list}>
          {filteredOrders.map((order, index) => (
            <FadeIn key={order.id} delay={index * 40}>
              <OrderListItem
                order={toListOrder(order)}
                onPress={() => router.push(APP_ROUTES.orderDetail(order.id) as Href)}
              />
            </FadeIn>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  resultCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
});
