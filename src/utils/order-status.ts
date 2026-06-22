import { OrderStatus } from '@/types/ui';
import { colors } from '@/constants/theme';

type StatusConfig = {
  label: string;
  backgroundColor: string;
  textColor: string;
};

export const orderStatusConfig: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    backgroundColor: colors.infoLight,
    textColor: colors.info,
  },
  processing: {
    label: 'Processing',
    backgroundColor: colors.warningLight,
    textColor: '#B45309',
  },
  in_transit: {
    label: 'In Transit',
    backgroundColor: colors.primaryLight,
    textColor: colors.primary,
  },
  delivered: {
    label: 'Delivered',
    backgroundColor: colors.successLight,
    textColor: '#047857',
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
