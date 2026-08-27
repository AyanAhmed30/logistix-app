import { colors } from '@/constants/theme';

/** Customer-facing request statuses (never show raw internal enums as primary UX). */
export type CustomerStatus =
  | 'submitted'
  | 'under_review'
  | 'action_needed'
  | 'quote_ready'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type CustomerStatusConfig = {
  key: CustomerStatus;
  label: string;
  explanation: string;
  nextEvent: string;
  requiresAction: boolean;
  backgroundColor: string;
  textColor: string;
  filterBucket: 'active' | 'action_needed' | 'completed';
};

export const CUSTOMER_STATUS_CONFIG: Record<CustomerStatus, CustomerStatusConfig> = {
  submitted: {
    key: 'submitted',
    label: 'Submitted',
    explanation: 'We received your cargo details.',
    nextEvent: 'Logistix will review your request.',
    requiresAction: false,
    backgroundColor: colors.surfaceMuted,
    textColor: colors.textSecondary,
    filterBucket: 'active',
  },
  under_review: {
    key: 'under_review',
    label: 'Under review',
    explanation: 'Operations is reviewing your request.',
    nextEvent: 'Confirmation and next update from Logistix.',
    requiresAction: false,
    backgroundColor: colors.primaryLight,
    textColor: colors.primary,
    filterBucket: 'active',
  },
  action_needed: {
    key: 'action_needed',
    label: 'Action needed',
    explanation: 'We need something from you to continue.',
    nextEvent: 'Update your request or contact support.',
    requiresAction: true,
    backgroundColor: colors.errorLight,
    textColor: colors.error,
    filterBucket: 'action_needed',
  },
  quote_ready: {
    key: 'quote_ready',
    label: 'Quote ready',
    explanation: 'Your quote is ready to review.',
    nextEvent: 'Review the quote and respond.',
    requiresAction: true,
    backgroundColor: colors.successLight,
    textColor: '#15803D',
    filterBucket: 'action_needed',
  },
  confirmed: {
    key: 'confirmed',
    label: 'Confirmed',
    explanation: 'Your request is confirmed.',
    nextEvent: 'Logistix will proceed with fulfillment.',
    requiresAction: false,
    backgroundColor: colors.infoLight,
    textColor: colors.info,
    filterBucket: 'active',
  },
  in_progress: {
    key: 'in_progress',
    label: 'In progress',
    explanation: 'Your cargo is being processed.',
    nextEvent: 'Watch for the next milestone update.',
    requiresAction: false,
    backgroundColor: colors.primaryLight,
    textColor: colors.primary,
    filterBucket: 'active',
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    explanation: 'This request is finished.',
    nextEvent: 'You can review documents anytime.',
    requiresAction: false,
    backgroundColor: colors.successLight,
    textColor: '#15803D',
    filterBucket: 'completed',
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    explanation: 'This request was closed.',
    nextEvent: 'Contact support if you need help.',
    requiresAction: false,
    backgroundColor: colors.errorLight,
    textColor: colors.error,
    filterBucket: 'completed',
  },
};

export type RequestFilter = 'all' | 'active' | 'action_needed' | 'completed';

export const REQUEST_FILTER_OPTIONS: Array<{ id: RequestFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'action_needed', label: 'Action needed' },
  { id: 'completed', label: 'Completed' },
];

/**
 * Map internal lead_inquiries.status (+ optional signals) → customer status.
 */
export function mapInternalToCustomerStatus(input: {
  status?: string | null;
  approvalStatus?: string | null;
  hasQuote?: boolean;
  sentAt?: string | null;
  customerSubmitted?: boolean;
}): CustomerStatus {
  const status = (input.status ?? '').trim().toLowerCase();
  const approval = (input.approvalStatus ?? '').trim().toLowerCase();

  if (status === 'completed') return 'completed';
  if (approval === 'rejected' || status === 'cancelled' || status === 'canceled') {
    return approval === 'rejected' ? 'action_needed' : 'cancelled';
  }
  if (input.hasQuote || status === 'quotation_sent') return 'quote_ready';
  if (approval === 'approved') return 'confirmed';
  if (status === 'in_progress') return 'under_review';
  if (status === 'pending' && input.sentAt) return 'under_review';
  if (status === 'pending' && input.customerSubmitted && !input.sentAt) return 'submitted';
  if (status === 'pending') return 'submitted';
  return 'under_review';
}

export function getCustomerStatusConfig(status: CustomerStatus): CustomerStatusConfig {
  return CUSTOMER_STATUS_CONFIG[status];
}

export function matchesRequestFilter(
  customerStatus: CustomerStatus,
  filter: RequestFilter,
): boolean {
  if (filter === 'all') return true;
  const bucket = CUSTOMER_STATUS_CONFIG[customerStatus].filterBucket;
  if (filter === 'active') return bucket === 'active' || bucket === 'action_needed';
  return bucket === filter;
}
