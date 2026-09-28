import {
  fetchCustomerPortalBySession,
  fetchCustomerQuoteBySession,
} from '@/services/inquiries';
import { listCustomerOrders, type CustomerOrder } from '@/services/orders';
import {
  buildDocumentHistory,
  buildDocumentsForRecord,
  type CustomerDocumentItem,
  type DocumentHistoryGroup,
} from '@/utils/customer-documents';
import { CustomerInquiry } from '@/types/inquiry';

export type LoadCustomerDocumentsResult = {
  data: DocumentHistoryGroup[];
  error: Error | null;
};

export type DocumentRecordDetail = {
  title: string;
  reference: string;
  statusLabel: string;
  recordHref: string | null;
  documents: CustomerDocumentItem[];
};

export type LoadDocumentRecordResult = {
  data: DocumentRecordDetail | null;
  error: Error | null;
};

/** List of requests / orders for the Documents home screen. */
export async function loadCustomerDocuments(
  sessionToken: string,
): Promise<LoadCustomerDocumentsResult> {
  try {
    const [portalResult, ordersResult] = await Promise.all([
      fetchCustomerPortalBySession(sessionToken),
      listCustomerOrders(sessionToken),
    ]);

    if (portalResult.error && ordersResult.error) {
      return { data: [], error: portalResult.error };
    }

    return {
      data: buildDocumentHistory({
        inquiries: portalResult.data?.inquiries ?? [],
        orders: ordersResult.data ?? [],
      }),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Unable to load documents.'),
    };
  }
}

/** Documents for one request or order (detail page). */
export async function loadDocumentRecord(
  sessionToken: string,
  id: string,
  source: 'inquiry' | 'order' = 'inquiry',
): Promise<LoadDocumentRecordResult> {
  try {
    const [portalResult, ordersResult] = await Promise.all([
      fetchCustomerPortalBySession(sessionToken),
      listCustomerOrders(sessionToken),
    ]);

    if (portalResult.error && ordersResult.error) {
      return { data: null, error: portalResult.error };
    }

    const inquiries = portalResult.data?.inquiries ?? [];
    const orders = ordersResult.data ?? [];

    let inquiry: CustomerInquiry | null = null;
    let order: CustomerOrder | null = null;

    if (source === 'order') {
      order = orders.find((row) => row.orderId === id || row.quotationId === id) ?? null;
      if (order?.inquiryId) {
        inquiry = inquiries.find((row) => row.id === order!.inquiryId) ?? null;
      }
    } else {
      inquiry = inquiries.find((row) => row.id === id) ?? null;
      order =
        orders.find((row) => row.inquiryId === id) ??
        orders.find((row) => row.orderId === id || row.quotationId === id) ??
        null;
    }

    if (!inquiry && !order) {
      return { data: null, error: new Error('record_not_found') };
    }

    let quote: {
      quotationId: string;
      quotationNumber: string;
      pdfUrl: string;
      sentAt: string | null;
    } | null = null;

    if (inquiry?.hasQuote && !order?.pdfUrl) {
      const quoteResult = await fetchCustomerQuoteBySession(sessionToken, inquiry.id);
      if (quoteResult.data?.pdfUrl) {
        quote = {
          quotationId: quoteResult.data.quotationId,
          quotationNumber: quoteResult.data.quotationNumber,
          pdfUrl: quoteResult.data.pdfUrl,
          sentAt: quoteResult.data.sentAt,
        };
      }
    }

    const documents = buildDocumentsForRecord({ inquiry, order, quote });
    const title =
      inquiry?.productName?.trim() ||
      order?.productService?.trim() ||
      'Freight record';
    const reference = order?.quotationNumber
      ? `Order · ${order.quotationNumber}`
      : 'Request';
    const statusLabel = order?.acceptedAt
      ? order.trackingNumber && order.parcelPhotoUrl
        ? 'Finalized'
        : 'Order'
      : inquiry?.hasQuote || quote
        ? 'Quotation received'
        : 'Request';

    return {
      data: {
        title,
        reference,
        statusLabel,
        recordHref: inquiry
          ? `/(tabs)/inquiries/${inquiry.id}`
          : order
            ? `/(tabs)/orders/${order.orderId}`
            : null,
        documents,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to load documents.'),
    };
  }
}
