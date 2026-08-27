import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

export type CustomerQuote = {
  inquiryId: string;
  quotationId: string;
  quotationNumber: string;
  totalAmount: number | null;
  quotationDate: string | null;
  expirationDate: string | null;
  paymentTerms: string | null;
  customerNotes: string | null;
  pdfUrl: string;
  sentAt: string | null;
  status: string;
};

export type CustomerQuoteResult = {
  data: CustomerQuote | null;
  error: Error | null;
};

function mapQuoteError(error: PostgrestError | Error): Error {
  if (error instanceof Error && !(error as PostgrestError).code) {
    return error;
  }

  const pgError = error as PostgrestError;
  const message = (pgError.message ?? '').toLowerCase();

  if (
    message.includes('invalid_session') ||
    message.includes('unauthorized_user') ||
    message.includes('quote_not_found')
  ) {
    return new Error('unauthorized_quote_access');
  }
  if (message.includes('quote_not_available')) {
    return new Error('quote_not_available');
  }
  if (message.includes('get_customer_quote') && message.includes('does not exist')) {
    return new Error(
      'quote_schema_missing: Run supabase/migrations/019_send_quotation_to_customer.sql in Supabase.',
    );
  }

  return new Error(pgError.message || 'Unable to load quotation.');
}

export async function fetchCustomerQuoteBySession(
  sessionToken: string,
  inquiryId: string,
): Promise<CustomerQuoteResult> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    if (!sessionToken.trim() || !inquiryId.trim()) {
      return { data: null, error: new Error('unauthorized_quote_access') };
    }

    const { data, error } = await getSupabase().rpc('get_customer_quote', {
      p_session_token: sessionToken,
      p_inquiry_id: inquiryId,
    });

    if (error) {
      return { data: null, error: mapQuoteError(error) };
    }

    const payload = data as {
      inquiry_id?: string;
      quotation_id?: string;
      quotation_number?: string;
      total_amount?: number | string | null;
      quotation_date?: string | null;
      expiration_date?: string | null;
      payment_terms?: string | null;
      customer_notes?: string | null;
      pdf_url?: string | null;
      sent_at?: string | null;
      status?: string;
    } | null;

    if (!payload?.quotation_id || !payload.pdf_url?.trim()) {
      return { data: null, error: new Error('quote_not_available') };
    }

    return {
      data: {
        inquiryId: String(payload.inquiry_id || inquiryId),
        quotationId: String(payload.quotation_id),
        quotationNumber: String(payload.quotation_number || ''),
        totalAmount:
          payload.total_amount === null || payload.total_amount === undefined
            ? null
            : Number(payload.total_amount),
        quotationDate: payload.quotation_date ?? null,
        expirationDate: payload.expiration_date ?? null,
        paymentTerms: payload.payment_terms ?? null,
        customerNotes: payload.customer_notes ?? null,
        pdfUrl: payload.pdf_url.trim(),
        sentAt: payload.sent_at ?? null,
        status: payload.status || 'quote_ready',
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to load quotation.'),
    };
  }
}
