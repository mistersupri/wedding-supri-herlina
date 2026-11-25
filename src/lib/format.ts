import type { AttendanceStatus } from '@shared/types';

const toDate = (iso: string) => new Date(iso);

/** "Jumat, 20 November 2026" */
export const formatLongDate = (iso: string) =>
  toDate(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "20 Nov 2026, 14.30" */
export const formatDateTime = (iso: string) =>
  toDate(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** "baru saja", "5 menit lalu", "3 jam lalu", "2 hari lalu"; older than a week falls back to the date. */
export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - toDate(iso).getTime()) / 1000));
  if (seconds < 60) return 'baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 8) return `${days} hari lalu`;
  return formatDateTime(iso);
}

export const formatTime = (iso: string) => toDate(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

/** Day, month and year as separate parts for the large typographic date. */
export function dateParts(iso: string) {
  const d = toDate(iso);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: String(d.getMonth() + 1).padStart(2, '0'),
    year: String(d.getFullYear()),
    weekday: d.toLocaleDateString('id-ID', { weekday: 'long' }),
    monthName: d.toLocaleDateString('id-ID', { month: 'long' }),
  };
}

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  HADIR: 'Hadir',
  TIDAK_HADIR: 'Tidak hadir',
  RAGU: 'Masih ragu',
};

export const coupleNames = (inv: { groomShortName: string; brideShortName: string }) => `${inv.groomShortName} & ${inv.brideShortName}`;

/** Link that opens the invitation already addressed to and unlocked for one guest. */
export const guestInvitationUrl = (guest: { name: string; slug: string }) =>
  `${window.location.origin}/?to=${encodeURIComponent(guest.name)}&c=${guest.slug}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
