import { getSupabase, isSupabaseConfigured } from '@/services/supabase';

export const INQUIRY_IMAGES_BUCKET = 'inquiry-images';
export const MAX_CUSTOMER_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type LocalAttachment = {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  size?: number | null;
  kind: 'image' | 'file';
};

export type UploadedAttachment = {
  url: string;
  name: string;
  kind: 'image' | 'file';
};

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned.slice(0, 120) || `file_${Date.now()}`;
}

function extensionFromName(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function resolveAttachmentContentType(name: string, mimeType?: string | null): string {
  if (mimeType && mimeType !== 'application/octet-stream') {
    return mimeType;
  }

  const ext = extensionFromName(name);
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    heic: 'image/heic',
    heif: 'image/heif',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  return map[ext] || 'application/octet-stream';
}

export function isImageAttachment(attachment: Pick<LocalAttachment, 'kind' | 'mimeType' | 'name'>): boolean {
  if (attachment.kind === 'image') return true;
  const mime = (attachment.mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(attachment.name);
}

async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Unable to read the selected file.');
  }
  return response.arrayBuffer();
}

export async function uploadCustomerInquiryAttachment(
  attachment: LocalAttachment,
): Promise<{ data: UploadedAttachment | null; error: Error | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    if (attachment.size && attachment.size > MAX_ATTACHMENT_BYTES) {
      return { data: null, error: new Error('Each file must be 10 MB or smaller.') };
    }

    const contentType = resolveAttachmentContentType(attachment.name, attachment.mimeType);
    const safeName = sanitizeFileName(attachment.name);
    const filePath = `customer-app/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
    const body = await readUriAsArrayBuffer(attachment.uri);

    const supabase = getSupabase();
    const { error } = await supabase.storage.from(INQUIRY_IMAGES_BUCKET).upload(filePath, body, {
      contentType,
      upsert: false,
    });

    if (error) {
      return {
        data: null,
        error: new Error(
          error.message.includes('row-level security') || error.message.includes('policy')
            ? 'upload_policy_missing: Run supabase/migrations/018_customer_inquiry_attachments.sql in Supabase.'
            : error.message || 'File upload failed.',
        ),
      };
    }

    const { data: urlData } = supabase.storage.from(INQUIRY_IMAGES_BUCKET).getPublicUrl(filePath);
    return {
      data: {
        url: urlData.publicUrl,
        name: attachment.name,
        kind: isImageAttachment(attachment) ? 'image' : 'file',
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('File upload failed.'),
    };
  }
}

export async function uploadCustomerInquiryAttachments(
  attachments: LocalAttachment[],
): Promise<{ data: UploadedAttachment[] | null; error: Error | null }> {
  if (attachments.length === 0) {
    return { data: [], error: null };
  }

  const uploaded: UploadedAttachment[] = [];
  for (const attachment of attachments) {
    const result = await uploadCustomerInquiryAttachment(attachment);
    if (result.error || !result.data) {
      return { data: null, error: result.error || new Error('File upload failed.') };
    }
    uploaded.push(result.data);
  }
  return { data: uploaded, error: null };
}

export function splitUploadedAttachments(uploaded: UploadedAttachment[]): {
  imageUrl: string | null;
  additionalImageUrls: string[];
} {
  if (uploaded.length === 0) {
    return { imageUrl: null, additionalImageUrls: [] };
  }
  const urls = uploaded.map((item) => item.url);
  return {
    imageUrl: urls[0] ?? null,
    additionalImageUrls: urls.slice(1),
  };
}
