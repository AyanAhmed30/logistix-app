import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';
import { CustomerInquiry, CustomerLead, CustomerPortalData } from '@/types/inquiry';

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
  status: string;
  created_at: string;
  sent_at: string | null;
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
    status: row.status,
    createdAt: row.created_at,
    sentAt: row.sent_at,
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
    message.includes('permission denied')
  ) {
    return new Error('unauthorized_portal_access');
  }

  if (message.includes('relation') && message.includes('does not exist')) {
    return new Error(
      'portal_schema_missing: Run logistix web migrations and 009_mobile_customer_inquiry_access.sql in Supabase.',
    );
  }

  return new Error(pgError.message || 'Unable to load inquiries.');
}

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
    const leads = (payload.leads ?? []).map(toLead);
    const inquiries = (payload.inquiries ?? []).map(toInquiry);

    return {
      data: { leads, inquiries },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to load inquiries.'),
    };
  }
}
