/**
 * Central mock domain types for customer UI.
 * Later: replace mock repositories with Supabase without redesigning screens.
 */

export type CustomerStatusKey =
  | 'submitted'
  | 'under_review'
  | 'action_needed'
  | 'quote_ready'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type MockCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  companyName: string;
  customerId: string;
  city: string;
  country: string;
};

export type MockRequest = {
  id: string;
  requestNumber: string;
  customerId: string;
  productName: string;
  description: string;
  quantity: string;
  totalWeight: string;
  cbm: string;
  status: CustomerStatusKey;
  createdAt: string;
  updatedAt: string;
  nextStep: string;
  explanation: string;
  requiresAction: boolean;
  actionLabel?: string;
  quoteTotal?: string;
  imageUrls: string[];
};

export type MockOrder = {
  id: string;
  reference: string;
  requestId: string;
  productName: string;
  origin: string;
  destination: string;
  status: 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';
  statusLabel: string;
  explanation: string;
  nextStep: string;
  cartons: number;
  weight: string;
  cbm: string;
  shippingMark: string;
  estimatedDelivery: string;
  createdAt: string;
  paymentStatus: 'not_due' | 'pending' | 'paid' | 'overdue';
  amount: string;
};

export type MockTimelineEvent = {
  id: string;
  title: string;
  description: string;
  location?: string;
  timestamp: string;
  completed: boolean;
  active: boolean;
};

export type MockShipment = {
  id: string;
  orderId: string;
  reference: string;
  status: MockOrder['status'];
  statusLabel: string;
  explanation: string;
  origin: string;
  destination: string;
  carrier: string;
  estimatedDelivery: string;
  progress: number;
  events: MockTimelineEvent[];
};

export type MockActionItem = {
  id: string;
  title: string;
  subtitle: string;
  type: 'quote' | 'document' | 'payment' | 'info';
  requestId?: string;
  orderId?: string;
  ctaLabel: string;
};

export type MockNotification = {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: 'status' | 'quote' | 'action' | 'payment';
};

export type MockDocument = {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'quote' | 'invoice';
  requestId?: string;
  orderId?: string;
  updatedAt: string;
};
