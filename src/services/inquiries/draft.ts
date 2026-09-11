import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';
import type { InquiryDraftAttachment } from '@/types/inquiry';

export type SaveCustomerInquiryDraftInput = {
  sessionToken: string;
  inquiryId?: string | null;
  productName: string;
  quantity: string;
  totalWeight: string;
  cbm: string;
  description?: string;
  imageUrl?: string | null;
  additionalImageUrls?: string[];
  draftStep: number;
  draftAttachments?: InquiryDraftAttachment[];
};

export type SavedInquiryDraft = {
  inquiryId: string;
  inquiryNumber: string;
  leadNumber: string | null;
  draftStep: number;
  message: string;
  updatedAt: string | null;
};

export type SaveDraftServiceResult = {
  data: SavedInquiryDraft | null;
  error: Error | null;
};

function mapDraftError(error: PostgrestError | Error, fallback: string): Error {
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
  if (message.includes('draft_not_found')) {
    return new Error('draft_not_found');
  }
  if (message.includes('save_customer_inquiry_draft') && message.includes('does not exist')) {
    return new Error(
      'draft_schema_missing: Run supabase/migrations/033_customer_inquiry_drafts.sql in Supabase.',
    );
  }
  if (message.includes('could not find the function') && message.includes('save_customer_inquiry_draft')) {
    return new Error(
      'draft_schema_missing: Run supabase/migrations/033_customer_inquiry_drafts.sql in Supabase.',
    );
  }
  if (message.includes('submit_customer_inquiry_draft') && message.includes('does not exist')) {
    return new Error(
      'draft_schema_missing: Run supabase/migrations/033_customer_inquiry_drafts.sql in Supabase.',
    );
  }

  return new Error(pgError.message || fallback);
}

function parseSavedDraft(data: unknown, fallbackMessage: string): SavedInquiryDraft | null {
  const payload = data as {
    inquiry?: {
      id?: string;
      inquiry_number?: string;
      lead_number?: string | null;
      draft_step?: number;
      updated_at?: string | null;
    };
    message?: string;
  } | null;

  if (!payload?.inquiry?.id) return null;

  return {
    inquiryId: String(payload.inquiry.id),
    inquiryNumber: String(payload.inquiry.inquiry_number ?? ''),
    leadNumber: payload.inquiry.lead_number ?? null,
    draftStep: Number(payload.inquiry.draft_step ?? 0) || 0,
    message: payload.message || fallbackMessage,
    updatedAt: payload.inquiry.updated_at ?? null,
  };
}

export async function saveCustomerInquiryDraft(
  input: SaveCustomerInquiryDraftInput,
): Promise<SaveDraftServiceResult> {
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

    const additional = (input.additionalImageUrls || []).map((url) => url.trim()).filter(Boolean);
    const attachments = (input.draftAttachments || []).filter((item) => item.url?.trim());

    const { data, error } = await getSupabase().rpc('save_customer_inquiry_draft', {
      p_session_token: input.sessionToken,
      p_inquiry_id: input.inquiryId?.trim() || null,
      p_product_name: input.productName.trim(),
      p_quantity: input.quantity.trim(),
      p_total_weight: input.totalWeight.trim(),
      p_cbm: input.cbm.trim(),
      p_description: input.description?.trim() || null,
      p_image_url: input.imageUrl?.trim() || null,
      p_additional_image_urls: additional,
      p_draft_step: Math.max(0, Math.floor(input.draftStep) || 0),
      p_draft_attachments: attachments,
    });

    if (error) {
      return { data: null, error: mapDraftError(error, 'Unable to save draft.') };
    }

    const saved = parseSavedDraft(data, 'Draft saved. You can continue this request anytime.');
    if (!saved) {
      return { data: null, error: new Error('Unable to save draft.') };
    }

    return { data: saved, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unable to save draft.'),
    };
  }
}

export type SubmitDraftInput = {
  sessionToken: string;
  inquiryId: string;
  productName: string;
  quantity: string;
  totalWeight: string;
  cbm: string;
  description?: string;
  imageUrl?: string | null;
  additionalImageUrls?: string[];
};

export async function submitCustomerInquiryDraft(
  input: SubmitDraftInput,
): Promise<{
  data: { inquiryId: string; inquiryNumber: string; leadNumber: string | null; message: string } | null;
  error: Error | null;
}> {
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
    if (!input.inquiryId.trim()) {
      return { data: null, error: new Error('draft_not_found') };
    }

    const additional = (input.additionalImageUrls || []).map((url) => url.trim()).filter(Boolean);

    const { data, error } = await getSupabase().rpc('submit_customer_inquiry_draft', {
      p_session_token: input.sessionToken,
      p_inquiry_id: input.inquiryId,
      p_product_name: input.productName.trim(),
      p_quantity: input.quantity.trim(),
      p_total_weight: input.totalWeight.trim(),
      p_cbm: input.cbm.trim(),
      p_description: input.description?.trim() || null,
      p_image_url: input.imageUrl?.trim() || null,
      p_additional_image_urls: additional,
    });

    if (error) {
      return { data: null, error: mapDraftError(error, 'Unable to submit request.') };
    }

    const payload = data as {
      inquiry?: { id?: string; inquiry_number?: string; lead_number?: string | null };
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
