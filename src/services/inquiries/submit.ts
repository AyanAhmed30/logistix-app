import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

export type SubmitCustomerInquiryInput = {
  sessionToken: string;
  productName: string;
  quantity: string;
  totalWeight: string;
  cbm: string;
  description?: string;
  imageUrl?: string | null;
  additionalImageUrls?: string[];
};

export type SubmitCustomerInquiryResult = {
  inquiryId: string;
  inquiryNumber: string;
  leadNumber: string | null;
  message: string;
};

export type SubmitInquiryServiceResult = {
  data: SubmitCustomerInquiryResult | null;
  error: Error | null;
};

function mapSubmitError(error: PostgrestError | Error): Error {
  if (error instanceof Error && !(error as PostgrestError).code) {
    return error;
  }

  const pgError = error as PostgrestError;
  const message = (pgError.message ?? '').toLowerCase();

  if (message.includes('invalid_session') || message.includes('unauthorized_user')) {
    return new Error('invalid_session');
  }
  if (message.includes('no_matching_contact')) {
    return new Error('no_matching_contact');
  }
  if (message.includes('no_sales_owner')) {
    return new Error('no_sales_owner');
  }
  if (message.includes('product_name_required')) {
    return new Error('product_name_required');
  }
  if (message.includes('quantity_invalid')) {
    return new Error('quantity_invalid');
  }
  if (message.includes('total_weight_invalid')) {
    return new Error('total_weight_invalid');
  }
  if (message.includes('cbm_invalid')) {
    return new Error('cbm_invalid');
  }
  if (message.includes('submit_customer_inquiry') && message.includes('does not exist')) {
    return new Error(
      'submit_schema_missing: Run supabase/migrations/018_customer_inquiry_attachments.sql in Supabase.',
    );
  }
  if (message.includes('could not find the function') && message.includes('submit_customer_inquiry')) {
    return new Error(
      'submit_schema_missing: Run supabase/migrations/018_customer_inquiry_attachments.sql in Supabase.',
    );
  }

  return new Error(pgError.message || 'Unable to submit request.');
}

export async function submitCustomerInquiry(
  input: SubmitCustomerInquiryInput,
): Promise<SubmitInquiryServiceResult> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    if (!input.sessionToken.trim()) {
      return { data: null, error: new Error('invalid_session') };
    }

    const additional = (input.additionalImageUrls || [])
      .map((url) => url.trim())
      .filter(Boolean);

    const { data, error } = await getSupabase().rpc('submit_customer_inquiry', {
      p_session_token: input.sessionToken,
      p_product_name: input.productName.trim(),
      p_quantity: input.quantity.trim(),
      p_total_weight: input.totalWeight.trim(),
      p_cbm: input.cbm.trim(),
      p_description: input.description?.trim() || null,
      p_image_url: input.imageUrl?.trim() || null,
      p_additional_image_urls: additional,
    });

    if (error) {
      return { data: null, error: mapSubmitError(error) };
    }

    const payload = data as {
      inquiry?: {
        id?: string;
        inquiry_number?: string;
        lead_number?: string | null;
      };
      message?: string;
    } | null;

    if (!payload?.inquiry?.id) {
      return { data: null, error: new Error('Unable to submit request.') };
    }

    return {
      data: {
        inquiryId: String(payload.inquiry.id),
        inquiryNumber: String(payload.inquiry.inquiry_number ?? ''),
        leadNumber: payload.inquiry.lead_number ?? null,
        message: payload.message || 'Request submitted to your sales agent for review.',
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to submit request.'),
    };
  }
}
