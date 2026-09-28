import { CustomerStatusKey } from '@/types/customer';
import { CustomerInquiry } from '@/types/inquiry';
import { isDraftInquiry } from '@/utils/home-dashboard';

/** Primary Requests tabs. */
export type RequestTab = 'all' | 'pending' | 'finalized';

/** Status filter shown only under Pending. */
export type PendingStatusFilter = 'all' | 'draft' | 'sent' | 'quotation_received';

export type RequestLifecycleBucket =
  | 'draft'
  | 'sent'
  | 'quotation_received'
  | 'finalized';

export const REQUEST_TAB_OPTIONS: Array<{ id: RequestTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'finalized', label: 'Finalized' },
];

export const PENDING_STATUS_OPTIONS: Array<{ id: PendingStatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'quotation_received', label: 'Quotation Received' },
];

export function parseRequestTab(value: string | string[] | undefined): RequestTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 'all';
  // Legacy deep links
  if (raw === 'draft' || raw === 'drafts' || raw === 'sent' || raw === 'quotation_received') {
    return 'pending';
  }
  if (raw === 'open' || raw === 'active' || raw === 'action_needed') return 'pending';
  if (raw === 'completed') return 'finalized';
  if (raw === 'all' || raw === 'pending' || raw === 'finalized') return raw;
  return 'all';
}

export function parsePendingStatus(
  value: string | string[] | undefined,
  tabHint?: string | string[],
): PendingStatusFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  const tabRaw = Array.isArray(tabHint) ? tabHint[0] : tabHint;

  // Legacy: ?filter=draft|sent|quotation_received
  if (
    tabRaw === 'draft' ||
    tabRaw === 'drafts' ||
    tabRaw === 'sent' ||
    tabRaw === 'quotation_received'
  ) {
    if (tabRaw === 'drafts') return 'draft';
    return tabRaw as PendingStatusFilter;
  }

  if (
    raw === 'all' ||
    raw === 'draft' ||
    raw === 'sent' ||
    raw === 'quotation_received'
  ) {
    return raw;
  }
  if (raw === 'drafts') return 'draft';
  return 'all';
}

export function hasShipmentTracking(
  inquiry: Pick<CustomerInquiry, 'shipmentTrackingNumber'>,
): boolean {
  return Boolean(inquiry.shipmentTrackingNumber?.trim());
}

export function hasShipmentPhoto(
  inquiry: Pick<CustomerInquiry, 'shipmentParcelPhotoUrl'>,
): boolean {
  return Boolean(inquiry.shipmentParcelPhotoUrl?.trim());
}

/** Finalized = tracking number and parcel photo both present (ready as order). */
export function isFinalizedInquiry(
  inquiry: Pick<CustomerInquiry, 'shipmentTrackingNumber' | 'shipmentParcelPhotoUrl'>,
): boolean {
  return hasShipmentTracking(inquiry) && hasShipmentPhoto(inquiry);
}

export function hasReceivedQuotation(
  inquiry: Pick<CustomerInquiry, 'hasQuote' | 'quoteNumber' | 'quoteSentAt'>,
): boolean {
  return Boolean(inquiry.hasQuote || inquiry.quoteNumber || inquiry.quoteSentAt);
}

/**
 * Mutually exclusive lifecycle stage.
 * Draft → Sent → Quotation Received → Finalized
 */
export function getRequestLifecycleBucket(inquiry: CustomerInquiry): RequestLifecycleBucket {
  if (isDraftInquiry(inquiry)) return 'draft';
  if (isFinalizedInquiry(inquiry)) return 'finalized';
  if (hasReceivedQuotation(inquiry)) return 'quotation_received';
  return 'sent';
}

export function isPendingInquiry(inquiry: CustomerInquiry): boolean {
  return getRequestLifecycleBucket(inquiry) !== 'finalized';
}

export function matchesRequestTab(inquiry: CustomerInquiry, tab: RequestTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'finalized') return isFinalizedInquiry(inquiry);
  return isPendingInquiry(inquiry);
}

export function matchesPendingStatus(
  inquiry: CustomerInquiry,
  status: PendingStatusFilter,
): boolean {
  if (status === 'all') return isPendingInquiry(inquiry);
  return getRequestLifecycleBucket(inquiry) === status;
}

export function matchesRequestListFilters(
  inquiry: CustomerInquiry,
  tab: RequestTab,
  pendingStatus: PendingStatusFilter,
): boolean {
  if (!matchesRequestTab(inquiry, tab)) return false;
  if (tab === 'pending') return matchesPendingStatus(inquiry, pendingStatus);
  return true;
}

export function mockStatusToLifecycleBucket(status: CustomerStatusKey): RequestLifecycleBucket {
  if (status === 'quote_ready') return 'quotation_received';
  if (status === 'completed') return 'finalized';
  return 'sent';
}

export function matchesMockRequestListFilters(
  status: CustomerStatusKey,
  tab: RequestTab,
  pendingStatus: PendingStatusFilter,
): boolean {
  const bucket = mockStatusToLifecycleBucket(status);
  if (tab === 'all') return true;
  if (tab === 'finalized') return bucket === 'finalized';
  // pending
  if (bucket === 'finalized') return false;
  if (pendingStatus === 'all') return true;
  return bucket === pendingStatus;
}

export function enrichInquiryShipmentFields(
  inquiry: CustomerInquiry,
  shipment?: {
    trackingNumber?: string | null;
    parcelPhotoUrl?: string | null;
    hasQuote?: boolean;
  } | null,
): CustomerInquiry {
  if (!shipment) return inquiry;
  return {
    ...inquiry,
    hasQuote: inquiry.hasQuote || Boolean(shipment.hasQuote),
    shipmentTrackingNumber:
      inquiry.shipmentTrackingNumber?.trim() ||
      shipment.trackingNumber?.trim() ||
      null,
    shipmentParcelPhotoUrl:
      inquiry.shipmentParcelPhotoUrl?.trim() ||
      shipment.parcelPhotoUrl?.trim() ||
      null,
  };
}

export function buildRequestsHref(tab: RequestTab, pendingStatus: PendingStatusFilter = 'all') {
  if (tab === 'all') return '/(tabs)/inquiries';
  if (tab === 'finalized') return '/(tabs)/inquiries?filter=finalized';
  if (pendingStatus === 'all') return '/(tabs)/inquiries?filter=pending';
  return `/(tabs)/inquiries?filter=pending&status=${pendingStatus}`;
}
