import { colors } from '@/constants/theme';

type InquiryStatusConfig = {
  label: string;
  backgroundColor: string;
  textColor: string;
};

const STATUS_MAP: Record<string, InquiryStatusConfig> = {
  pending: {
    label: 'Pending',
    backgroundColor: colors.warningLight,
    textColor: '#B45309',
  },
  in_progress: {
    label: 'In Progress',
    backgroundColor: colors.primaryLight,
    textColor: colors.primary,
  },
  quotation_sent: {
    label: 'Quotation Sent',
    backgroundColor: '#DCFCE7',
    textColor: '#15803D',
  },
  completed: {
    label: 'Completed',
    backgroundColor: '#E0E7FF',
    textColor: '#4338CA',
  },
};

const DEFAULT_STATUS: InquiryStatusConfig = {
  label: 'Submitted',
  backgroundColor: colors.surfaceMuted,
  textColor: colors.textSecondary,
};

export function getInquiryStatusConfig(status: string): InquiryStatusConfig {
  const key = status.trim().toLowerCase();
  return STATUS_MAP[key] ?? { ...DEFAULT_STATUS, label: formatStatusLabel(status) };
}

function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
