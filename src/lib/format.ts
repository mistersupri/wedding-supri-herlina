import type { AttendanceStatus } from '../types.js';

const toDate = (iso: string) => new Date(iso);

/** "Jumat, 20 November 2026" */
export const formatLongDate = (iso: string) =>
  toDate(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "20 Nov 2026, 14.30" */
export const formatDateTime = (iso: string) =>
  toDate(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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
