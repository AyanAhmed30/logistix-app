export type CustomerNotificationEventType =
  | 'inquiry_submitted'
  | 'inquiry_with_admin'
  | 'rate_approved'
  | 'quotation_sent'
  | 'tracking_available'
  | 'shipment_photo_added'
  | 'warehouse_received'
  | string;

export type CustomerNotification = {
  id: string;
  eventType: CustomerNotificationEventType;
  title: string;
  message: string;
  href: string;
  isRead: boolean;
  inquiryId: string | null;
  quotationId: string | null;
  leadId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type CustomerNotificationKind =
  | 'quote'
  | 'shipment'
  | 'status'
  | 'action'
  | 'info';

export function getCustomerNotificationKind(
  eventType: CustomerNotificationEventType,
): CustomerNotificationKind {
  switch (eventType) {
    case 'quotation_sent':
      return 'quote';
    case 'tracking_available':
    case 'shipment_photo_added':
    case 'warehouse_received':
      return 'shipment';
    case 'inquiry_submitted':
    case 'inquiry_with_admin':
    case 'rate_approved':
      return 'status';
    default:
      return 'info';
  }
}
