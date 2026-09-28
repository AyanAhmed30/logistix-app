import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/theme';
import {
  getCustomerNotificationKind,
  type CustomerNotification,
  type CustomerNotificationKind,
} from '@/types/notifications';

export function notificationKindIcon(
  kind: CustomerNotificationKind,
): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'quote':
      return 'document-text-outline';
    case 'shipment':
      return 'cube-outline';
    case 'action':
      return 'alert-circle-outline';
    case 'status':
      return 'checkmark-circle-outline';
    default:
      return 'notifications-outline';
  }
}

export function notificationKindColors(kind: CustomerNotificationKind): {
  bg: string;
  icon: string;
} {
  switch (kind) {
    case 'quote':
      return { bg: colors.successLight, icon: '#15803D' };
    case 'shipment':
      return { bg: colors.infoLight, icon: colors.info };
    case 'action':
      return { bg: colors.errorLight, icon: colors.error };
    case 'status':
      return { bg: colors.primaryLight, icon: colors.primary };
    default:
      return { bg: colors.surfaceMuted, icon: colors.textSecondary };
  }
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function resolveNotificationHref(href: string): string {
  const value = (href || '').trim();
  if (value.startsWith('/')) return value;
  return '/(tabs)';
}

export function notificationVisual(item: CustomerNotification) {
  const kind = getCustomerNotificationKind(item.eventType);
  return {
    kind,
    icon: notificationKindIcon(kind),
    colors: notificationKindColors(kind),
  };
}
