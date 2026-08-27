import { colors } from '@/constants/theme';
import { CustomerStatusKey } from '@/types/customer';

export type StatusVisual = {
  label: string;
  explanation: string;
  nextStep: string;
  backgroundColor: string;
  textColor: string;
  requiresAction: boolean;
};

const MAP: Record<CustomerStatusKey, StatusVisual> = {
  submitted: {
    label: 'Submitted',
    explanation: 'We received your cargo details.',
    nextStep: 'Logistix will review your request.',
    backgroundColor: colors.surfaceMuted,
    textColor: colors.textSecondary,
    requiresAction: false,
  },
  under_review: {
    label: 'Under review',
    explanation: 'Operations is reviewing your request.',
    nextStep: 'You will be notified when a quote or update is ready.',
    backgroundColor: colors.primaryLight,
    textColor: colors.primary,
    requiresAction: false,
  },
  action_needed: {
    label: 'Action needed',
    explanation: 'We need something from you to continue.',
    nextStep: 'Update details or contact support.',
    backgroundColor: colors.errorLight,
    textColor: colors.error,
    requiresAction: true,
  },
  quote_ready: {
    label: 'Quote ready',
    explanation: 'Your quote is ready to review.',
    nextStep: 'Review the quote and respond.',
    backgroundColor: colors.accentLight,
    textColor: colors.accentDark,
    requiresAction: true,
  },
  confirmed: {
    label: 'Confirmed',
    explanation: 'Your request is confirmed.',
    nextStep: 'Logistix will proceed with booking.',
    backgroundColor: colors.infoLight,
    textColor: colors.info,
    requiresAction: false,
  },
  in_progress: {
    label: 'In progress',
    explanation: 'Your cargo is being processed.',
    nextStep: 'Watch for the next milestone update.',
    backgroundColor: colors.primaryLight,
    textColor: colors.primary,
    requiresAction: false,
  },
  completed: {
    label: 'Completed',
    explanation: 'This request is finished.',
    nextStep: 'You can review documents anytime.',
    backgroundColor: colors.successLight,
    textColor: colors.success,
    requiresAction: false,
  },
  cancelled: {
    label: 'Cancelled',
    explanation: 'This request was closed.',
    nextStep: 'Contact support if you need help.',
    backgroundColor: colors.errorLight,
    textColor: colors.error,
    requiresAction: false,
  },
};

export function getCustomerStatusVisual(status: CustomerStatusKey): StatusVisual {
  return MAP[status];
}

/** Map live inquiry DB status → customer key for UI badges. */
export function mapLiveInquiryStatus(status: string): CustomerStatusKey {
  const key = status.trim().toLowerCase();
  if (key === 'completed') return 'completed';
  if (key === 'quotation_sent') return 'quote_ready';
  if (key === 'in_progress') return 'under_review';
  if (key === 'pending') return 'under_review';
  if (key === 'cancelled' || key === 'canceled') return 'cancelled';
  return 'under_review';
}
