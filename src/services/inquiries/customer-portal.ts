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
    message.includes('permission denied')
  ) {
    return new Error('unauthorized_portal_access');
  }

  if (message.includes('relation') && message.includes('does not exist')) {
    return new Error(
      'portal_schema_missing: Run logistix-app migrations 009–013 in Supabase SQL Editor.',
    );
  }

  if (message.includes('get_customer_portal_by_user_id') && message.includes('does not exist')) {
    return new Error(
      'portal_schema_missing: Run logistix-app migration 013_customer_portal_by_user_id.sql in Supabase.',
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

export async function fetchCustomerPortalByUserId(userId: string): Promise<CustomerPortalResult> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    if (!userId.trim()) {
      return {
        data: null,
        error: new Error('unauthorized_portal_access'),
      };
    }

    const { data, error } = await getSupabase().rpc('get_customer_portal_by_user_id', {
      p_user_id: userId,
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

/** @deprecated Use fetchCustomerPortalByUserId — phone is resolved server-side from the user id. */
export async function fetchCustomerPortalByPhone(phone: string): Promise<CustomerPortalResult> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    const { data, error } = await getSupabase().rpc('get_customer_portal_by_phone', {
      p_phone: phone,
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
