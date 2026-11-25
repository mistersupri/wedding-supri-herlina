/**
 * Phone numbers as the couple types them: "0812-3456-7890", "+62 812 3456 7890", "62812...".
 * Indonesian numbers are normalised to the international form without "+" (62812...), which is what
 * wa.me links need. Numbers from other countries must start with "+" and are kept as typed digits.
 */

export interface ParsedPhone {
  /** International digits without "+", e.g. "6281234567890". */
  international: string;
  /** How it reads locally, e.g. "0812-3456-7890" (Indonesian) or "+44 7700 900123" (other). */
  display: string;
  indonesian: boolean;
}

/** Longest and shortest national part (after 62) of an Indonesian mobile number: 8xx + 7..10 digits. */
const ID_MOBILE = /^62(8[1-9][0-9]{7,10})$/;

/** What the browser's `pattern` attribute checks while typing; the full check is `parsePhone`. */
export const PHONE_PATTERN = '^\\+?[\\s(]*[0-9][0-9\\s().-]{6,19}$';

/** Parse a typed number. Returns null when it cannot be a mobile number. */
export function parsePhone(raw: string | null | undefined): ParsedPhone | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  if (!/^\+?[\s(]*[0-9][0-9\s().-]*$/.test(text)) return null;
  const plus = text.startsWith('+');
  let digits = text.replace(/\D/g, '');

  if (plus && !digits.startsWith('62')) {
    // Another country: trust the country code, only check the length (E.164 allows 8 to 15 digits).
    return digits.length >= 8 && digits.length <= 15 ? { international: digits, display: `+${digits}`, indonesian: false } : null;
  }
  if (digits.startsWith('62')) {
    // "+62 0812..." is a common slip: the trunk zero is dropped after the country code.
    if (digits.startsWith('620')) digits = `62${digits.slice(3)}`;
  } else if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  else return null;

  const m = ID_MOBILE.exec(digits);
  if (!m) return null;
  const national = m[1];
  return { international: digits, display: `0${national.slice(0, 3)}-${national.slice(3, 7)}-${national.slice(7)}`, indonesian: true };
}

export const isValidPhone = (raw: string | null | undefined) => parsePhone(raw) !== null;

/** Digits only for a wa.me link, or '' when the number is not valid. */
export const whatsappDigits = (raw: string | null | undefined) => parsePhone(raw)?.international ?? '';
