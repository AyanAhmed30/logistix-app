import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

export type ShipmentStatus =
  | 'quotation_sent'
  | 'not_sent'
  | 'accepted_pending'
  | 'tracking_added'
  | 'photo_uploaded'
  | 'tracking_and_photo';

export type CustomerOrder = {
  orderId: string;
  quotationId: string;
  quotationNumber: string;
  inquiryId: string | null;
  customerName: string | null;
  productService: string | null;
  totalAmount: number | null;
  quotationDbStatus: string | null;
  negotiationStatus: string | null;
  quotationSentAt: string | null;
  acceptedAt: string | null;
  trackingNumber: string | null;
  trackingAddedAt: string | null;
  parcelPhotoUrl: string | null;
  parcelPhotoUploadedAt: string | null;
  shipmentInfoUpdatedAt: string | null;
  shipmentInfoUpdatedBy: string | null;
  shipmentInfoUpdatedByRole: string | null;
  salespersonName: string | null;
  shipmentStatus: ShipmentStatus;
  updatedAt: string | null;
  createdAt: string | null;
  pdfUrl?: string | null;
  inquiryRequestedAt?: string | null;
  inquiryCreatedAt?: string | null;
  inquirySentAt?: string | null;
};

function mapOrderError(error: PostgrestError | Error): Error {
  if (error instanceof Error && !(error as PostgrestError).code) {
    return error;
  }
  const pgError = error as PostgrestError;
  const message = (pgError.message ?? '').toLowerCase();
  if (message.includes('unauthorized') || message.includes('invalid_session')) {
    return new Error('unauthorized_order_access');
  }
  if (message.includes('order_not_found')) {
    return new Error('order_not_found');
  }
  if (message.includes('shipment_info_required')) {
    return new Error('shipment_info_required');
  }
  if (message.includes('waiting_for_sales')) {
    return new Error('waiting_for_sales');
  }
  if (message.includes('does not exist')) {
    return new Error(
      'order_schema_missing: Run supabase/migrations/038_quotation_shipment_acceptance.sql in Supabase.',
    );
  }
  return new Error(pgError.message || 'Unable to load orders.');
}

function mapOrderRow(row: Record<string, unknown>): CustomerOrder {
  return {
    orderId: String(row.order_id || row.quotation_id || ''),
    quotationId: String(row.quotation_id || row.order_id || ''),
    quotationNumber: String(row.quotation_number || ''),
    inquiryId: row.inquiry_id ? String(row.inquiry_id) : null,
    customerName: row.customer_name ? String(row.customer_name) : null,
    productService: row.product_service ? String(row.product_service) : null,
    totalAmount:
      row.total_amount == null || row.total_amount === undefined
        ? null
        : Number(row.total_amount),
    quotationDbStatus: row.quotation_db_status
      ? String(row.quotation_db_status)
      : null,
    negotiationStatus: row.negotiation_status
      ? String(row.negotiation_status)
      : null,
    quotationSentAt: row.quotation_sent_at
      ? String(row.quotation_sent_at)
      : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    trackingNumber: row.shipment_tracking_number
      ? String(row.shipment_tracking_number)
      : null,
    trackingAddedAt: row.shipment_tracking_added_at
      ? String(row.shipment_tracking_added_at)
      : null,
    parcelPhotoUrl: row.shipment_parcel_photo_url
      ? String(row.shipment_parcel_photo_url)
      : null,
    parcelPhotoUploadedAt: row.shipment_parcel_photo_uploaded_at
      ? String(row.shipment_parcel_photo_uploaded_at)
      : null,
    shipmentInfoUpdatedAt: row.shipment_info_updated_at
      ? String(row.shipment_info_updated_at)
      : null,
    shipmentInfoUpdatedBy: row.shipment_info_updated_by
      ? String(row.shipment_info_updated_by)
      : null,
    shipmentInfoUpdatedByRole: row.shipment_info_updated_by_role
      ? String(row.shipment_info_updated_by_role)
      : null,
    salespersonName: row.salesperson_name
      ? String(row.salesperson_name)
      : null,
    shipmentStatus: String(row.shipment_status || 'accepted_pending') as ShipmentStatus,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    pdfUrl: row.pdf_url ? String(row.pdf_url) : null,
    inquiryRequestedAt: row.inquiry_requested_at
      ? String(row.inquiry_requested_at)
      : null,
    inquiryCreatedAt: row.inquiry_created_at
      ? String(row.inquiry_created_at)
      : null,
    inquirySentAt: row.inquiry_sent_at ? String(row.inquiry_sent_at) : null,
  };
}

export function shipmentStatusLabel(status: ShipmentStatus | string): string {
  switch (status) {
    case 'quotation_sent':
      return 'Quotation Sent';
    case 'accepted_pending':
      return 'Accepted — Information Pending';
    case 'tracking_added':
      return 'Tracking Added';
    case 'photo_uploaded':
      return 'Photo Uploaded';
    case 'tracking_and_photo':
      return 'Tracking + Photo Added';
    default:
      return 'Pending';
  }
}

export async function listCustomerOrders(
  sessionToken: string,
): Promise<{ data: CustomerOrder[]; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: [], error: new Error('Supabase is not configured.') };
    }
    const { data, error } = await getSupabase().rpc('list_customer_orders', {
      p_session_token: sessionToken,
    });
    if (error) return { data: [], error: mapOrderError(error) };
    const payload = (data || {}) as Record<string, unknown>;
    const rows = Array.isArray(payload.orders) ? payload.orders : [];
    return {
      data: rows.map((row) => mapOrderRow(row as Record<string, unknown>)),
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error : new Error('Unable to load orders.'),
    };
  }
}

export async function getCustomerOrder(
  sessionToken: string,
  quotationId: string,
): Promise<{ data: CustomerOrder | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase is not configured.') };
    }
    const { data, error } = await getSupabase().rpc('get_customer_order', {
      p_session_token: sessionToken,
      p_quotation_id: quotationId,
    });
    if (error) return { data: null, error: mapOrderError(error) };
    return {
      data: mapOrderRow((data || {}) as Record<string, unknown>),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to load order.'),
    };
  }
}

export async function upsertCustomerShipmentInfo(
  sessionToken: string,
  inquiryId: string,
  input: {
    trackingNumber?: string | null;
    parcelPhotoUrl?: string | null;
    parcelPhotoPath?: string | null;
    acceptWithoutShipment?: boolean;
  },
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { data: null, error: new Error('Supabase is not configured.') };
    }
    const { data, error } = await getSupabase().rpc('upsert_customer_shipment_info', {
      p_session_token: sessionToken,
      p_inquiry_id: inquiryId,
      p_tracking_number: input.trackingNumber?.trim() || null,
      p_parcel_photo_url: input.parcelPhotoUrl?.trim() || null,
      p_parcel_photo_path: input.parcelPhotoPath?.trim() || null,
      p_accept_without_shipment: Boolean(input.acceptWithoutShipment),
    });
    if (error) return { data: null, error: mapOrderError(error) };
    return { data: (data || {}) as Record<string, unknown>, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error : new Error('Unable to save shipment information.'),
    };
  }
}
