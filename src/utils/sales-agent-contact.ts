import { phoneMatchKey } from '@/utils/phone-match';

/** Digits suitable for wa.me / tel links (no leading +). */
export function salesAgentPhoneDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const key = phoneMatchKey(phone);
  return key.length >= 7 ? key : null;
}

export function salesAgentWhatsAppUrl(phone: string | null | undefined): string | null {
  const digits = salesAgentPhoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export function salesAgentTelUrl(phone: string | null | undefined): string | null {
  const digits = salesAgentPhoneDigits(phone);
  if (!digits) return null;
  return `tel:+${digits}`;
}

export function formatSalesAgentPhoneDisplay(phone: string | null | undefined): string {
  if (!phone || !phone.trim()) {
    return 'Phone not available';
  }
  return phone.trim();
}
