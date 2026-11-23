/**
 * Small, pure helpers behind the CMS form fields: clean up what was typed or pasted, and say
 * in plain Indonesian what is wrong. Each `check*` returns an error message, or null when fine.
 */

// --- Instagram ---------------------------------------------------------------------------------

import { cleanInstagram, INSTAGRAM_PATTERN, isInstagramHandle } from '@shared/handles';
export { cleanInstagram, INSTAGRAM_PATTERN };

export function checkInstagram(handle: string): string | null {
  if (!handle) return null;
  return isInstagramHandle(handle) ? null : 'Hanya huruf, angka, titik, dan garis bawah (maksimal 30 karakter).';
}

// --- URLs ---------------------------------------------------------------------------------------

export function checkUrl(value: string, label = 'Tautan'): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return `${label} harus diawali https://`;
    if (!u.hostname.includes('.')) return `${label} tidak lengkap.`;
    return null;
  } catch {
    return `${label} belum benar. Contoh: https://maps.app.goo.gl/abc123`;
  }
}

const MAPS_HOSTS = /(^|\.)(google\.[a-z.]+|goo\.gl|maps\.app\.goo\.gl)$/i;

export function checkMapsLink(value: string): string | null {
  const basic = checkUrl(value, 'Tautan peta');
  if (basic || !value) return basic;
  const u = new URL(value);
  const onGoogle = MAPS_HOSTS.test(u.hostname) && (u.hostname.startsWith('maps.') || u.hostname.endsWith('goo.gl') || u.pathname.startsWith('/maps'));
  return onGoogle ? null : 'Gunakan tautan dari Google Maps (tombol Bagikan, Salin link).';
}

/** The `src` of Google's embed code. People often paste the whole <iframe>; pull the src out for them. */
export function extractEmbedSrc(value: string): string {
  const m = /src\s*=\s*["']([^"']+)["']/i.exec(value);
  return (m ? m[1] : value).trim();
}

export function checkMapsEmbed(value: string): string | null {
  if (!value) return null;
  const basic = checkUrl(value, 'URL peta');
  if (basic) return basic;
  return /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(value) ? null : 'Salin isi src dari kode sematkan Google Maps (diawali https://www.google.com/maps/embed).';
}

// --- Account numbers ----------------------------------------------------------------------------

/** Digits with optional spaces, dots or dashes between groups. */
export const ACCOUNT_PATTERN = '^[0-9][0-9 .-]{3,28}[0-9]$';

export function checkAccountNumber(value: string, required: boolean): string | null {
  if (!value.trim()) return required ? 'Nomor rekening wajib diisi.' : null;
  const digits = value.replace(/\D/g, '');
  if (!/^[0-9 .-]+$/.test(value)) return 'Nomor rekening hanya berisi angka.';
  if (digits.length < 5 || digits.length > 20) return 'Nomor rekening biasanya 5 sampai 20 angka.';
  return null;
}

// --- Dates and times (events keep them as text the templates print as they are) ------------------

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** "2026-11-20" -> "Jumat, 20 November 2026". Done by hand so the viewer's time zone cannot shift the day. */
export function formatIdDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return '';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return '';
  return `${DAYS[dt.getUTCDay()]}, ${d} ${MONTHS[mo - 1]} ${y}`;
}

/** Reads what older entries look like: "Jumat, 20 November 2026", "20 nov 2026", "20/11/2026" or ISO. Null if unreadable. */
export function parseIdDate(text: string): string | null {
  const t = text.trim().toLowerCase();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) return formatIdDate(t) ? t : null;
  const slash = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (slash) {
    const out = `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`;
    return formatIdDate(out) ? out : null;
  }
  const words = /(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/.exec(t);
  if (!words) return null;
  const idx = MONTHS.findIndex((mn) => mn.toLowerCase() === words[2] || mn.toLowerCase().slice(0, 3) === words[2].slice(0, 3));
  if (idx < 0) return null;
  const out = `${words[3]}-${String(idx + 1).padStart(2, '0')}-${words[1].padStart(2, '0')}`;
  return formatIdDate(out) ? out : null;
}

export const TIME_ZONES = ['WIB', 'WITA', 'WIT'] as const;
export type TimeZoneName = (typeof TIME_ZONES)[number];

/** "08:00 WIB" -> { time: "08:00", zone: "WIB" }. Anything else (e.g. "Selesai") reads as empty so the field is not silently wrong. */
export function parseEventTime(text: string): { time: string; zone: TimeZoneName } {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*(WIB|WITA|WIT)?\s*$/i.exec(text);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return { time: '', zone: 'WIB' };
  return { time: `${m[1].padStart(2, '0')}:${m[2]}`, zone: ((m[3] || 'WIB').toUpperCase() as TimeZoneName) };
}

export const composeEventTime = (time: string, zone: TimeZoneName) => (time ? `${time} ${zone}` : '');

/** True when `end` is later than `start` on the same day ("HH:MM" strings). */
export const isAfter = (end: string, start: string) => !end || !start || end > start;
