import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

export type NegotiationHistoryItem = {
  id: string;
  eventType: string;
  actorRole: string;
  actorName: string;
  previousAmount: number | null;
  offeredAmount: number | null;
  requestedAmount: number | null;
  message: string | null;
  createdAt: string;
};

export type CustomerQuote = {
  inquiryId: string;
  quotationId: string;
  quotationNumber: string;
  totalAmount: number | null;
  originalOfferAmount: number | null;
  previousOfferAmount: number | null;
  quotationDate: string | null;
  expirationDate: string | null;
  paymentTerms: string | null;
  customerNotes: string | null;
  pdfUrl: string;
  sentAt: string | null;
  status: string;
  negotiationStatus: string;
  pendingRequestAmount: number | null;
  pendingRequestMessage: string | null;
  canNegotiate: boolean;
  canAccept: boolean;
  canDecline: boolean;
  history: NegotiationHistoryItem[];
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
  if (message.includes('negotiation_not_allowed')) {
    return new Error('negotiation_not_allowed');
  }
  if (message.includes('negotiation_closed')) {
    return new Error('negotiation_closed');
  }
  if (message.includes('waiting_for_sales')) {
    return new Error('waiting_for_sales');
  }
  if (message.includes('request_must_be_lower')) {
    return new Error('request_must_be_lower');
  }
  if (message.includes('invalid_requested_amount')) {
    return new Error('invalid_requested_amount');
  }
  if (
    (message.includes('get_customer_quote') ||
      message.includes('submit_quotation_negotiation') ||
      message.includes('accept_customer_quotation') ||
      message.includes('decline_customer_quotation')) &&
    message.includes('does not exist')
  ) {
    return new Error(
      'quote_schema_missing: Run supabase/migrations/019 and 020 in Supabase.',
    );
  }

  return new Error(pgError.message || 'Unable to load quotation.');
}

function mapHistory(raw: unknown): NegotiationHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id || ''),
      eventType: String(row.event_type || ''),
      actorRole: String(row.actor_role || ''),
      actorName: String(row.actor_name || row.actor_role || ''),
      previousAmount:
        row.previous_amount == null ? null : Number(row.previous_amount),
      offeredAmount:
        row.offered_amount == null ? null : Number(row.offered_amount),
      requestedAmount:
        row.requested_amount == null ? null : Number(row.requested_amount),
      message: row.message ? String(row.message) : null,
      createdAt: String(row.created_at || ''),
    };
  });
}

function mapPayload(
  payload: Record<string, unknown>,
  inquiryId: string,
): CustomerQuote | null {
  if (!payload.quotation_id || !String(payload.pdf_url || '').trim()) {
    return null;
  }

  return {
    inquiryId: String(payload.inquiry_id || inquiryId),
    quotationId: String(payload.quotation_id),
    quotationNumber: String(payload.quotation_number || ''),
    totalAmount:
      payload.total_amount === null || payload.total_amount === undefined
        ? null
        : Number(payload.total_amount),
    originalOfferAmount:
      payload.original_offer_amount == null
        ? null
        : Number(payload.original_offer_amount),
    previousOfferAmount:
      payload.previous_offer_amount == null
        ? null
        : Number(payload.previous_offer_amount),
    quotationDate: payload.quotation_date
      ? String(payload.quotation_date)
      : null,
    expirationDate: payload.expiration_date
      ? String(payload.expiration_date)
      : null,
    paymentTerms: payload.payment_terms ? String(payload.payment_terms) : null,
    customerNotes: payload.customer_notes
      ? String(payload.customer_notes)
      : null,
    pdfUrl: String(payload.pdf_url).trim(),
    sentAt: payload.sent_at ? String(payload.sent_at) : null,
    status: String(payload.status || 'quote_ready'),
    negotiationStatus: String(payload.negotiation_status || 'none'),
    pendingRequestAmount:
      payload.pending_request_amount == null
        ? null
        : Number(payload.pending_request_amount),
    pendingRequestMessage: payload.pending_request_message
      ? String(payload.pending_request_message)
      : null,
    canNegotiate: Boolean(payload.can_negotiate),
    canAccept: Boolean(payload.can_accept),
    canDecline: Boolean(payload.can_decline),
    history: mapHistory(payload.history),
  };
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

    const mapped = mapPayload((data || {}) as Record<string, unknown>, inquiryId);
    if (!mapped) {
      return { data: null, error: new Error('quote_not_available') };
    }

    return { data: mapped, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to load quotation.'),
    };
  }
}

export async function submitQuotationNegotiation(
  sessionToken: string,
  inquiryId: string,
  requestedAmount: number,
  message: string,
): Promise<{ ok: true } | { error: Error }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase is not configured.') };
    }
    const { error } = await getSupabase().rpc('submit_quotation_negotiation', {
      p_session_token: sessionToken,
      p_inquiry_id: inquiryId,
      p_requested_amount: requestedAmount,
      p_message: message.trim() || null,
    });
    if (error) return { error: mapQuoteError(error) };
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unable to submit negotiation.'),
    };
  }
}

export async function acceptCustomerQuotation(
  sessionToken: string,
  inquiryId: string,
): Promise<{ ok: true } | { error: Error }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase is not configured.') };
    }
    const { error } = await getSupabase().rpc('accept_customer_quotation', {
      p_session_token: sessionToken,
      p_inquiry_id: inquiryId,
    });
    if (error) return { error: mapQuoteError(error) };
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unable to accept quotation.'),
    };
  }
}

export async function declineCustomerQuotation(
  sessionToken: string,
  inquiryId: string,
  reason: string,
): Promise<{ ok: true } | { error: Error }> {
  try {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase is not configured.') };
    }
    const { error } = await getSupabase().rpc('decline_customer_quotation', {
      p_session_token: sessionToken,
      p_inquiry_id: inquiryId,
      p_reason: reason.trim() || null,
    });
    if (error) return { error: mapQuoteError(error) };
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Unable to decline quotation.'),
    };
  }
}
