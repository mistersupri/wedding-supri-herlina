import React, { useEffect, useMemo } from 'react';
import { Modal } from '../../../../components/ui/Modal.js';
import type { AttendanceStatus, GiftAccount, InvitationData, WeddingEvent } from '@shared/types';

/** Loads a template's Google Fonts only while that template is on screen. */
export function useTemplateFonts(families: string) {
  useEffect(() => {
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [families]);
}

export const ATTENDANCE_CHOICES: { value: AttendanceStatus; label: string }[] = [
  { value: 'HADIR', label: 'Hadir' },
  { value: 'TIDAK_HADIR', label: 'Berhalangan' },
  { value: 'RAGU', label: 'Masih ragu' },
];

/** Distinct venues in event order, for the "location" sections. */
export function venuesOf(events: WeddingEvent[]) {
  const seen = new Map<string, WeddingEvent>();
  for (const e of events) if (!seen.has(e.venueName)) seen.set(e.venueName, e);
  return [...seen.values()];
}

/** The couple's own pictures for decorative slots: gallery images first, then hero and portraits. */
export function usePhotoPool(inv: InvitationData) {
  return useMemo(() => {
    const urls = [
      ...inv.gallery.filter((p) => p.mediaType !== 'VIDEO').map((p) => p.url),
      inv.heroImage,
      inv.bridePhoto,
      inv.groomPhoto,
      ...inv.loveStories.map((s) => s.photoUrl || ''),
    ].filter(Boolean);
    const unique = [...new Set(urls)];
    return (i: number) => (unique.length ? unique[i % unique.length] : '');
  }, [inv]);
}

export const romanNumeral = (n: number) => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n + 1);

/** "08:00 – 10:00 WIB" from the stored "08:00 WIB" style strings. */
export function timeRange(e: WeddingEvent) {
  const zone = /\b(WIB|WITA|WIT)\b/.exec(`${e.startTime} ${e.endTime}`)?.[1];
  const strip = (t: string) => t.replace(/\s*(WIB|WITA|WIT)\b/, '').trim();
  return `${strip(e.startTime)} – ${strip(e.endTime)}${zone ? ` ${zone}` : ''}`;
}

/** QR image for a QRIS gift entry. */
export const GiftQrDialog: React.FC<{ gift: GiftAccount | null; onClose: () => void }> = ({ gift, onClose }) => (
  <Modal
    open={gift !== null}
    onClose={onClose}
    title={gift?.bankName || 'QR'}
    description="Pindai dengan aplikasi m-banking atau dompet digital."
    size="sm"
  >
    {gift?.qrisImageUrl && (
      <div className="flex flex-col items-center text-center">
        <img
          src={gift.qrisImageUrl}
          alt={`Kode QR ${gift.bankName}`}
          className="h-64 w-64 rounded-sm border border-line bg-white object-contain p-2"
          referrerPolicy="no-referrer"
        />
        <p className="mt-3 font-semibold">{gift.accountHolder}</p>
      </div>
    )}
  </Modal>
);

/** Inline SVG icons the templates share, drawn at currentColor. */
export const Glyph = {
  Note: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  Pass: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </svg>
  ),
  Camera: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
};
