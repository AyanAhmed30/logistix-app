import { CustomerInquiry } from '@/types/inquiry';

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
