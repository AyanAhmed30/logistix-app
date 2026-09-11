import { CustomerInquiry, InquiryDraftAttachment } from '@/types/inquiry';

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

export function parseAdditionalImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseDraftAttachments(value: unknown): InquiryDraftAttachment[] {
  if (!Array.isArray(value)) return [];

  const out: InquiryDraftAttachment[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { url?: unknown; name?: unknown; kind?: unknown };
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    if (!url) continue;
    const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : url;
    const kind: InquiryDraftAttachment['kind'] =
      row.kind === 'file' ? 'file' : row.kind === 'image' ? 'image' : isLikelyImageUrl(url) ? 'image' : 'file';
    out.push({ url, name, kind });
  }
  return out;
}

export function attachmentsFromInquiry(
  inquiry: Pick<CustomerInquiry, 'imageUrl' | 'additionalImageUrls' | 'draftAttachments'>,
): InquiryDraftAttachment[] {
  if (inquiry.draftAttachments && inquiry.draftAttachments.length > 0) {
    return inquiry.draftAttachments;
  }

  return getInquiryAttachmentUrls(inquiry).map((url) => ({
    url,
    name: decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'attachment'),
    kind: isLikelyImageUrl(url) ? 'image' : 'file',
  }));
}

export function getInquiryAttachmentUrls(
  inquiry: Pick<CustomerInquiry, 'imageUrl' | 'additionalImageUrls'>,
): string[] {
  const urls = new Set<string>();

  if (inquiry.imageUrl?.trim()) {
    urls.add(inquiry.imageUrl.trim());
  }

  inquiry.additionalImageUrls.forEach((url) => {
    if (url.trim()) {
      urls.add(url.trim());
    }
  });

  return [...urls];
}

export function isLikelyImageUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith('data:image/')) {
    return true;
  }

  if (IMAGE_EXTENSIONS.test(trimmed)) {
    return true;
  }

  return trimmed.includes('/storage/v1/object/') && !trimmed.endsWith('.pdf');
}

export function getInquiryImageUrls(
  inquiry: Pick<CustomerInquiry, 'imageUrl' | 'additionalImageUrls'>,
): string[] {
  return getInquiryAttachmentUrls(inquiry).filter(isLikelyImageUrl);
}

export function getInquiryDocumentUrls(
  inquiry: Pick<CustomerInquiry, 'imageUrl' | 'additionalImageUrls'>,
): string[] {
  const attachments = getInquiryAttachmentUrls(inquiry);
  const images = new Set(getInquiryImageUrls(inquiry));
  return attachments.filter((url) => !images.has(url));
}
