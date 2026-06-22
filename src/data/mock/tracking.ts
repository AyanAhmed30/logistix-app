import { Shipment } from '@/types/ui';

export const mockActiveShipment: Shipment = {
  id: '1',
  reference: 'ORD-2024-1847',
  status: 'in_transit',
  origin: 'Los Angeles, CA',
  destination: 'Phoenix, AZ',
  carrier: 'Logistix Express',
  estimatedDelivery: 'Jun 19, 2026 · 2:00 PM',
  progress: 68,
  events: [
    {
      id: '1',
      title: 'Out for Delivery',
      description: 'Package is on the delivery vehicle',
      location: 'Phoenix, AZ',
      timestamp: 'Jun 19, 2026 · 8:30 AM',
      completed: false,
      active: true,
    },
    {
      id: '2',
      title: 'Arrived at Destination Hub',
      description: 'Shipment received at local distribution center',
      location: 'Phoenix, AZ',
      timestamp: 'Jun 18, 2026 · 11:45 PM',
      completed: true,
      active: false,
    },
    {
      id: '3',
      title: 'In Transit',
      description: 'Shipment departed regional hub',
      location: 'Barstow, CA',
      timestamp: 'Jun 18, 2026 · 4:20 AM',
      completed: true,
      active: false,
    },
    {
      id: '4',
      title: 'Picked Up',
      description: 'Order collected from sender warehouse',
      location: 'Los Angeles, CA',
      timestamp: 'Jun 17, 2026 · 9:00 AM',
      completed: true,
      active: false,
    },
    {
      id: '5',
      title: 'Order Confirmed',
      description: 'Shipment label created and order processed',
      location: 'Los Angeles, CA',
      timestamp: 'Jun 16, 2026 · 2:15 PM',
      completed: true,
      active: false,
    },
  ],
};

export const mockRecentTrackingIds = [
  { id: '1', reference: 'ORD-2024-1847', status: 'in_transit' as const, eta: 'Jun 19' },
  { id: '6', reference: 'ORD-2024-1842', status: 'in_transit' as const, eta: 'Jun 18' },
  { id: '3', reference: 'ORD-2024-1845', status: 'delivered' as const, eta: 'Delivered' },
];
