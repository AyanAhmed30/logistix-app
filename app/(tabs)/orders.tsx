import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  EmptyState,
  FilterChips,
  OrderListItem,
  ScreenContainer,
  SearchBar,
} from '@/components/ui';
import { mockOrders } from '@/data/mock/orders';
import { colors, spacing, typography } from '@/constants/theme';
import { OrderStatus } from '@/types/ui';

const filterChips = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

/**
 * Orders Screen
 *
 * Purpose: Searchable, filterable list of shipments for operations teams.
 * Demonstrates list UI patterns with mock order data — no API calls.
 */
export default function OrdersScreen() {
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    return mockOrders.filter((order) => {
      const matchesFilter =
        selectedFilter === 'all' || order.status === (selectedFilter as OrderStatus);
      const query = search.toLowerCase();
      const matchesSearch =
        !query ||
        order.reference.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.origin.toLowerCase().includes(query) ||
        order.destination.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [search, selectedFilter]);

  const handleOrderPress = (_id: string) => {
    // UI placeholder
  };

  return (
    <ScreenContainer title="Orders" subtitle={`${mockOrders.length} total shipments`}>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by reference, customer, or location..."
      />

      <FilterChips chips={filterChips} selectedId={selectedFilter} onSelect={setSelectedFilter} />

      <View style={styles.resultRow}>
        <Text style={styles.resultCount}>
          {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {filteredOrders.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No orders found"
          description="Try adjusting your search or filter criteria."
          actionLabel="Clear filters"
          onActionPress={() => {
            setSearch('');
            setSelectedFilter('all');
          }}
        />
      ) : (
        <View style={styles.list}>
          {filteredOrders.map((order) => (
            <OrderListItem
              key={order.id}
              order={order}
              onPress={() => handleOrderPress(order.id)}
            />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  resultRow: {
    marginTop: -spacing.sm,
  },
  resultCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
  list: {
    gap: spacing.md,
  },
});
