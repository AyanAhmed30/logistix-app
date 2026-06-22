import { DashboardStat, Order } from '@/types/ui';

import { mockOrders } from './orders';

export const mockDashboardStats: DashboardStat[] = [
  {
    id: '1',
    label: 'Active Orders',
    value: '47',
    change: '+12%',
    trend: 'up',
    icon: 'orders',
  },
  {
    id: '2',
    label: 'In Transit',
    value: '23',
    change: '+5%',
    trend: 'up',
    icon: 'transit',
  },
  {
    id: '3',
    label: 'Delivered Today',
    value: '18',
    change: '+8%',
    trend: 'up',
    icon: 'delivered',
  },
  {
    id: '4',
    label: 'Revenue (MTD)',
    value: '$284K',
    change: '-2%',
    trend: 'down',
    icon: 'revenue',
  },
];

export const mockRecentOrders: Order[] = mockOrders.slice(0, 4);

export const mockQuickActions = [
  { id: '1', label: 'New Order', icon: 'add-circle-outline' as const },
  { id: '2', label: 'Track Shipment', icon: 'locate-outline' as const },
  { id: '3', label: 'Scan Barcode', icon: 'barcode-outline' as const },
  { id: '4', label: 'Reports', icon: 'document-text-outline' as const },
];
