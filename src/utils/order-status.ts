import { OrderStatus } from '@/types/ui';
import { colors } from '@/constants/theme';

type StatusConfig = {
  label: string;
  backgroundColor: string;
  textColor: string;
};

export const orderStatusConfig: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: 'Awaiting confirmation',
    backgroundColor: colors.infoLight,
    textColor: colors.info,
  },
  processing: {
    label: 'At warehouse',
    backgroundColor: colors.warningLight,
    textColor: '#B45309',
  },
  in_transit: {
    label: 'In transit',
    backgroundColor: colors.accentLight,
    textColor: colors.accentDark,
  },
  delivered: {
    label: 'Completed',
    backgroundColor: colors.successLight,
    textColor: colors.success,
  },
  cancelled: {
    label: 'Cancelled',
    backgroundColor: colors.errorLight,
    textColor: colors.error,
  },
};

export function getOrderStatusConfig(status: OrderStatus): StatusConfig {
  return orderStatusConfig[status];
}
