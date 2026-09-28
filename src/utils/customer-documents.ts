import { CustomerInquiry } from '@/types/inquiry';
import { CustomerOrder } from '@/services/orders';
import { getInquiryDocumentUrls } from '@/utils/inquiry-media';
import { isDraftInquiry } from '@/utils/home-dashboard';
import {
  getRequestLifecycleBucket,
  isFinalizedInquiry,
  type RequestLifecycleBucket,
} from '@/utils/request-lifecycle';

export type CustomerDocumentKind =
  | 'quotation'
  | 'attachment'
  | 'parcel_photo'
  | 'tracking'
  | 'cargo_photo';

export type CustomerDocumentItem = {
  id: string;
  title: string;
  kind: CustomerDocumentKind;
  typeLabel: string;
  description?: string;
  meta: string;
  sortAt?: string | null;
  url: string | null;
  href: string | null;
  /** Plain value shown when there is no file URL (e.g. tracking number). */
  value?: string | null;
};

export type DocumentHistoryKind = 'request' | 'order';

/** List row on Documents home. */
export type DocumentHistoryGroup = {
  id: string;
  /** inquiry id or order id used in the detail route */
  detailId: string;
  source: 'inquiry' | 'order';
  kind: DocumentHistoryKind;
  title: string;
  reference: string;
  statusLabel: string;
  statusTone: 'pending' | 'quote' | 'finalized' | 'draft';
  dateLabel: string;
  sortAt: string | null;
  href: string;
  documents: CustomerDocumentItem[];
};

function formatDocDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const segment = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
    return segment || fallback;
  } catch {
    return fallback;
  }
}

/** Normalize URL so the same file with different query tokens is treated once. */
function normalizeUrlKey(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const path = decodeURIComponent(parsed.pathname).toLowerCase().replace(/\/+$/, '');
    return `${parsed.host.toLowerCase()}${path}`;
  } catch {
    return trimmed.split('?')[0].split('#')[0].toLowerCase().replace(/\/+$/, '');
  }
}

function lifecycleStatus(bucket: RequestLifecycleBucket): {
  label: string;
  tone: DocumentHistoryGroup['statusTone'];
} {
  switch (bucket) {
    case 'draft':
      return { label: 'Draft', tone: 'draft' };
    case 'sent':
      return { label: 'Sent', tone: 'pending' };
    case 'quotation_received':
      return { label: 'Quotation received', tone: 'quote' };
    case 'finalized':
      return { label: 'Finalized', tone: 'finalized' };
  }
}

function makeDoc(
  partial: Omit<CustomerDocumentItem, 'meta'> & { sortAt?: string | null },
): CustomerDocumentItem {
  return {
    ...partial,
    meta: formatDocDate(partial.sortAt),
  };
}

export function buildDocumentsForRecord(input: {
  inquiry?: CustomerInquiry | null;
  order?: CustomerOrder | null;
  quote?: {
    quotationId: string;
    quotationNumber: string;
    pdfUrl: string;
    sentAt: string | null;
  } | null;
}): CustomerDocumentItem[] {
  const { inquiry, order, quote } = input;
  const documents: CustomerDocumentItem[] = [];
  const seenUrls = new Set<string>();
  const inquiryId = inquiry?.id;
  const orderId = order?.orderId;
  const sortFallback =
    order?.updatedAt ||
    order?.acceptedAt ||
    quote?.sentAt ||
    inquiry?.updatedAt ||
    inquiry?.createdAt ||
    null;

  const push = (item: CustomerDocumentItem) => {
    if (item.url) {
      const key = normalizeUrlKey(item.url);
      if (key && seenUrls.has(key)) return;
      if (key) seenUrls.add(key);
    }
    documents.push(item);
  };

  const parcelUrl =
    order?.parcelPhotoUrl?.trim() || inquiry?.shipmentParcelPhotoUrl?.trim() || null;
  const parcelKey = parcelUrl ? normalizeUrlKey(parcelUrl) : '';

  const pdfUrl = order?.pdfUrl?.trim() || quote?.pdfUrl?.trim() || null;
  if (pdfUrl) {
    const quoteNumber =
      order?.quotationNumber?.trim() || quote?.quotationNumber?.trim() || '';
    push(
      makeDoc({
        id: `quote-${inquiryId || orderId}`,
        title: quoteNumber ? `Quotation ${quoteNumber}` : 'Quotation PDF',
        kind: 'quotation',
        typeLabel: 'Quotation',
        description: 'Official quotation PDF from your sales agent.',
        sortAt: order?.quotationSentAt || quote?.sentAt || sortFallback,
        url: pdfUrl,
        href: inquiryId
          ? `/(tabs)/inquiries/${inquiryId}/quote`
          : orderId
            ? `/(tabs)/orders/${orderId}`
            : null,
      }),
    );
  }

  // Parcel photo first so the same file is not also listed as a cargo photo.
  if (parcelUrl) {
    push(
      makeDoc({
        id: `parcel-${inquiryId || orderId}`,
        title: 'Parcel photo',
        kind: 'parcel_photo',
        typeLabel: 'Parcel photo',
        description: 'Photo confirming the parcel at warehouse.',
        sortAt: order?.parcelPhotoUploadedAt || order?.shipmentInfoUpdatedAt || sortFallback,
        url: parcelUrl,
        href: orderId
          ? `/(tabs)/orders/${orderId}`
          : inquiryId
            ? `/(tabs)/inquiries/${inquiryId}`
            : null,
      }),
    );
  }

  if (inquiry) {
    for (const url of getInquiryDocumentUrls(inquiry)) {
      // Skip file attachments that are the same as the parcel photo
      if (parcelKey && normalizeUrlKey(url) === parcelKey) continue;
      push(
        makeDoc({
          id: `attach-${inquiry.id}-${url}`,
          title: fileNameFromUrl(url, 'Attachment'),
          kind: 'attachment',
          typeLabel: 'Attachment',
          description: 'File shared with this request.',
          sortAt: inquiry.updatedAt || inquiry.createdAt,
          url,
          href: `/(tabs)/inquiries/${inquiry.id}`,
        }),
      );
    }
  }

  const tracking =
    order?.trackingNumber?.trim() || inquiry?.shipmentTrackingNumber?.trim() || null;
  if (tracking) {
    push(
      makeDoc({
        id: `tracking-${inquiryId || orderId}`,
        title: 'Tracking number',
        kind: 'tracking',
        typeLabel: 'Tracking',
        description: 'Parcel tracking number for warehouse / shipment.',
        sortAt: order?.trackingAddedAt || sortFallback,
        url: null,
        value: tracking,
        href: orderId
          ? `/(tabs)/orders/${orderId}`
          : inquiryId
            ? `/(tabs)/inquiries/${inquiryId}`
            : null,
      }),
    );
  }

  return documents.sort((a, b) => {
    const aTime = Date.parse(a.sortAt || '') || 0;
    const bTime = Date.parse(b.sortAt || '') || 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
}

export function buildDocumentHistory(input: {
  inquiries: CustomerInquiry[];
  orders: CustomerOrder[];
}): DocumentHistoryGroup[] {
  const { inquiries, orders } = input;
  const ordersByInquiryId = new Map<string, CustomerOrder>();
  const orphanOrders: CustomerOrder[] = [];

  for (const order of orders) {
    if (order.inquiryId) {
      const existing = ordersByInquiryId.get(order.inquiryId);
      if (!existing) {
        ordersByInquiryId.set(order.inquiryId, order);
      } else {
        const existingTime = Date.parse(existing.updatedAt || existing.acceptedAt || '') || 0;
        const nextTime = Date.parse(order.updatedAt || order.acceptedAt || '') || 0;
        if (nextTime >= existingTime) ordersByInquiryId.set(order.inquiryId, order);
      }
    } else {
      orphanOrders.push(order);
    }
  }

  const groups: DocumentHistoryGroup[] = [];

  for (const inquiry of inquiries) {
    if (isDraftInquiry(inquiry)) continue;

    const order = ordersByInquiryId.get(inquiry.id) ?? null;
    const enriched: CustomerInquiry = {
      ...inquiry,
      hasQuote: inquiry.hasQuote || Boolean(order),
      shipmentTrackingNumber:
        inquiry.shipmentTrackingNumber || order?.trackingNumber || null,
      shipmentParcelPhotoUrl:
        inquiry.shipmentParcelPhotoUrl || order?.parcelPhotoUrl || null,
    };

    const bucket = getRequestLifecycleBucket(enriched);
    const status = lifecycleStatus(bucket);
    const sortAt =
      order?.updatedAt ||
      order?.acceptedAt ||
      inquiry.updatedAt ||
      inquiry.createdAt ||
      null;

    const kind: DocumentHistoryKind =
      order && isFinalizedInquiry(enriched) ? 'order' : 'request';

    groups.push({
      id: inquiry.id,
      detailId: inquiry.id,
      source: 'inquiry',
      kind,
      title: inquiry.productName?.trim() || 'Freight request',
      reference:
        kind === 'order' && order?.quotationNumber
          ? `Order · ${order.quotationNumber}`
          : 'Request',
      statusLabel: status.label,
      statusTone: status.tone,
      dateLabel: formatDocDate(sortAt),
      sortAt,
      href: `/(tabs)/profile/documents/${inquiry.id}?source=inquiry`,
      documents: [],
    });
  }

  for (const order of orphanOrders) {
    const sortAt = order.updatedAt || order.acceptedAt || order.createdAt || null;
    groups.push({
      id: `order-${order.orderId}`,
      detailId: order.orderId,
      source: 'order',
      kind: 'order',
      title: order.productService?.trim() || 'Freight order',
      reference: order.quotationNumber ? `Order · ${order.quotationNumber}` : 'Order',
      statusLabel: 'Finalized',
      statusTone: 'finalized',
      dateLabel: formatDocDate(sortAt),
      sortAt,
      href: `/(tabs)/profile/documents/${order.orderId}?source=order`,
      documents: [],
    });
  }

  return groups.sort((a, b) => {
    const aTime = Date.parse(a.sortAt || '') || 0;
    const bTime = Date.parse(b.sortAt || '') || 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
}

export function buildDemoDocumentHistory(): DocumentHistoryGroup[] {
  return [
    {
      id: 'demo-1',
      detailId: 'demo-1',
      source: 'inquiry',
      kind: 'request',
      title: 'Ceramic tiles (20ft mix)',
      reference: 'Request',
      statusLabel: 'Quotation received',
      statusTone: 'quote',
      dateLabel: 'Aug 22, 2026',
      sortAt: '2026-08-22T14:10:00Z',
      href: '/(tabs)/profile/documents/demo-1?source=inquiry',
      documents: [],
    },
    {
      id: 'demo-2',
      detailId: 'demo-2',
      source: 'inquiry',
      kind: 'order',
      title: 'Home appliances — consoles',
      reference: 'Order · LX-2026-1847',
      statusLabel: 'Finalized',
      statusTone: 'finalized',
      dateLabel: 'Aug 21, 2026',
      sortAt: '2026-08-21T10:00:00Z',
      href: '/(tabs)/profile/documents/demo-2?source=inquiry',
      documents: [],
    },
    {
      id: 'demo-3',
      detailId: 'demo-3',
      source: 'inquiry',
      kind: 'request',
      title: 'Automotive spare parts',
      reference: 'Request',
      statusLabel: 'Sent',
      statusTone: 'pending',
      dateLabel: 'Aug 21, 2026',
      sortAt: '2026-08-21T16:40:00Z',
      href: '/(tabs)/profile/documents/demo-3?source=inquiry',
      documents: [],
    },
  ];
}

export function buildDemoDocumentsForId(id: string): {
  title: string;
  reference: string;
  statusLabel: string;
  documents: CustomerDocumentItem[];
} | null {
  const demos: Record<
    string,
    {
      title: string;
      reference: string;
      statusLabel: string;
      documents: CustomerDocumentItem[];
    }
  > = {
    'demo-1': {
      title: 'Ceramic tiles (20ft mix)',
      reference: 'Request',
      statusLabel: 'Quotation received',
      documents: [
        {
          id: 'd1',
          title: 'Quotation QT-1001',
          kind: 'quotation',
          typeLabel: 'Quotation',
          description: 'Official quotation PDF from your sales agent.',
          meta: 'Aug 22, 2026',
          url: null,
          href: null,
        },
      ],
    },
    'demo-2': {
      title: 'Home appliances — consoles',
      reference: 'Order · LX-2026-1847',
      statusLabel: 'Finalized',
      documents: [
        {
          id: 'd2',
          title: 'Quotation LX-2026-1847',
          kind: 'quotation',
          typeLabel: 'Quotation',
          description: 'Official quotation PDF from your sales agent.',
          meta: 'Aug 20, 2026',
          url: null,
          href: null,
        },
        {
          id: 'd-track',
          title: 'Tracking number',
          kind: 'tracking',
          typeLabel: 'Tracking',
          description: 'Parcel tracking number for warehouse / shipment.',
          meta: 'Aug 21, 2026',
          url: null,
          value: 'LX-TRACK-88421',
          href: null,
        },
        {
          id: 'd3',
          title: 'Parcel photo',
          kind: 'parcel_photo',
          typeLabel: 'Parcel photo',
          description: 'Photo confirming the parcel at warehouse.',
          meta: 'Aug 21, 2026',
          url: null,
          href: null,
        },
      ],
    },
    'demo-3': {
      title: 'Automotive spare parts',
      reference: 'Request',
      statusLabel: 'Sent',
      documents: [],
    },
  };
  return demos[id] ?? null;
}
