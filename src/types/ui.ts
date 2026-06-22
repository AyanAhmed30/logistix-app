export type OrderStatus = 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  reference: string;
  customer: string;
  origin: string;
  destination: string;
  status: OrderStatus;
  items: number;
  weight: string;
  estimatedDelivery: string;
  createdAt: string;
};

export type DashboardStat = {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: 'orders' | 'transit' | 'delivered' | 'revenue';
};

export type TrackingEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  timestamp: string;
  completed: boolean;
  active: boolean;
};

export type Shipment = {
  id: string;
  reference: string;
  status: OrderStatus;
  origin: string;
  destination: string;
  carrier: string;
  estimatedDelivery: string;
  progress: number;
  events: TrackingEvent[];
};

export type ProfileMenuItem = {
  id: string;
  label: string;
  icon: string;
  badge?: string;
};

export type ProfileMenuSection = {
  title: string;
  items: ProfileMenuItem[];
};
