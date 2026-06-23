/**
 * Mirrors database phone_match_key / phones_match logic for client-side debugging.
 * Web leads often store Pakistan numbers as 03001234567; mobile uses +923001234567.
 */

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function phoneMatchKey(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (!digits) {
    return '';
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return `92${digits.slice(1)}`;
  }

  return digits;
}

export function phonesMatch(a: string, b: string): boolean {
  const ka = phoneMatchKey(a);
  const kb = phoneMatchKey(b);
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);

  if (!ka || !kb) {
    return false;
  }

  if (ka === kb) {
    return true;
  }

  if (da.length >= 10 && db.length >= 10 && da.slice(-10) === db.slice(-10)) {
    return true;
  }

  if (ka.length >= 7 && kb.length >= 7 && (ka.includes(kb) || kb.includes(ka))) {
    return true;
  }

  return false;
}
