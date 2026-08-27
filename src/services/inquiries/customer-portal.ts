import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';
import { CustomerInquiry, CustomerLead, CustomerPortalData } from '@/types/inquiry';
import { parseAdditionalImageUrls } from '@/utils/inquiry-media';

export type CustomerPortalResult = {
  data: CustomerPortalData | null;
  error: Error | null;
};

type RpcLeadRow = {
  id: string;
  name: string;
  lead_number: string | null;
  status: string;
  created_at: string;
};

type RpcInquiryRow = {
  id: string;
  lead_id: string;
  lead_number: string | null;
  inquiry_number: string;
  product_name: string | null;
  description?: string | null;
  quantity?: string | null;
  total_weight?: string | null;
  cbm?: string | null;
  link_url?: string | null;
  image_url?: string | null;
  additional_image_urls?: unknown;
  status: string;
  created_at: string;
  sent_at: string | null;
  updated_at?: string | null;
  shipping_mark: string | null;
  origin: string | null;
  destination: string | null;
  customer_submitted?: boolean;
  approval_status?: string | null;
  sent_to_accounting?: boolean;
  has_quote?: boolean;
  quote_total?: number | string | null;
  quote_number?: string | null;
  quote_sent_at?: string | null;
};

type RpcResponse = {
  leads: RpcLeadRow[] | null;
  inquiries: RpcInquiryRow[] | null;
};

function toLead(row: RpcLeadRow): CustomerLead {
  return {
    id: row.id,
    name: row.name,
    leadNumber: row.lead_number,
    status: row.status,
    createdAt: row.created_at,
  };
}

function toInquiry(row: RpcInquiryRow): CustomerInquiry {
  return {
    id: row.id,
    leadId: row.lead_id,
    leadNumber: row.lead_number,
    inquiryNumber: row.inquiry_number,
    productName: row.product_name,
    description: row.description ?? null,
    quantity: row.quantity ?? null,
    totalWeight: row.total_weight ?? null,
    cbm: row.cbm ?? null,
    linkUrl: row.link_url ?? null,
    imageUrl: row.image_url ?? null,
    additionalImageUrls: parseAdditionalImageUrls(row.additional_image_urls),
    status: row.status,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    updatedAt: row.updated_at ?? null,
    shippingMark: row.shipping_mark,
    origin: row.origin,
    destination: row.destination,
    customerSubmitted: Boolean(row.customer_submitted),
    approvalStatus: row.approval_status ?? null,
    sentToAccounting: Boolean(row.sent_to_accounting),
    hasQuote: Boolean(row.has_quote),
    quoteTotal:
      row.quote_total === null || row.quote_total === undefined
        ? null
        : Number(row.quote_total),
    quoteNumber: row.quote_number ?? null,
    quoteSentAt: row.quote_sent_at ?? null,
  };
}

function mapRpcError(error: PostgrestError | Error): Error {
  if (error instanceof Error && !(error as PostgrestError).code) {
    return error;
  }

  const pgError = error as PostgrestError;
  const message = (pgError.message ?? '').toLowerCase();

  if (
    pgError.code === '42501' ||
    message.includes('unauthorized_phone') ||
    message.includes('unauthorized_user') ||
    message.includes('invalid_session') ||
    message.includes('permission denied')
  ) {
    return new Error('unauthorized_portal_access');
  }

  if (message.includes('relation') && message.includes('does not exist')) {
    return new Error(
      'portal_schema_missing: Run logistix-app migrations 009–014 in Supabase SQL Editor.',
    );
  }

  if (
    (message.includes('get_customer_portal_by_session') ||
      message.includes('get_customer_portal_by_user_id')) &&
    message.includes('does not exist')
  ) {
    return new Error(
      'portal_schema_missing: Run logistix-app migration 014_identity_hardening_sessions.sql in Supabase.',
    );
  }

  return new Error(pgError.message || 'Unable to load inquiries.');
}

function mapPortalPayload(payload: RpcResponse): CustomerPortalData {
  const leads = (payload.leads ?? []).map(toLead);
  const leadIds = new Set(leads.map((lead) => lead.id));
  const inquiries = (payload.inquiries ?? [])
    .map(toInquiry)
    .filter((inquiry) => leadIds.has(inquiry.leadId));

  return { leads, inquiries };
}

/**
 * Customer portal — requires a server-issued session token (Step 2 P0).
 * Does not accept a client-supplied user id.
 */
export async function fetchCustomerPortalBySession(
  sessionToken: string,
): Promise<CustomerPortalResult> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    if (!sessionToken.trim() || sessionToken.trim().length < 32) {
      return {
        data: null,
        error: new Error('unauthorized_portal_access'),
      };
    }

    const { data, error } = await getSupabase().rpc('get_customer_portal_by_session', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: null, error: mapRpcError(error) };
    }

    const payload = (data ?? { leads: [], inquiries: [] }) as RpcResponse;

    return {
      data: mapPortalPayload(payload),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to load inquiries.'),
    };
  }
}
