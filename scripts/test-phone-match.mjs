function normalizePhoneDigits(phone) {
  return phone.replace(/[^0-9]/g, '');
}

function phoneMatchKey(phone) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('0')) {
    return `92${digits.slice(1)}`;
  }
  return digits;
}

function phonesMatch(a, b) {
  const ka = phoneMatchKey(a);
  const kb = phoneMatchKey(b);
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);

  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (da.length >= 10 && db.length >= 10 && da.slice(-10) === db.slice(-10)) return true;
  if (ka.length >= 7 && kb.length >= 7 && (ka.includes(kb) || kb.includes(ka))) return true;
  return false;
}

const cases = [
  ['03001234567', '+923001234567', true],
  ['03001234567', '923001234567', true],
  ['+923001234567', '923001234567', true],
  ['03001234567', '03001234567', true],
  ['03001234567', '03009999999', false],
];

let failed = 0;
for (const [a, b, expected] of cases) {
  const result = phonesMatch(a, b);
  const status = result === expected ? 'OK' : 'FAIL';
  if (result !== expected) failed += 1;
  console.log(`[${status}] phonesMatch("${a}", "${b}") => ${result} (expected ${expected})`);
}

process.exit(failed > 0 ? 1 : 0);
