import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { StatusChip } from '../ui/StatusChip.js';
import { useCopy } from '../../hooks/useCopy.js';
import { guestInvitationUrl } from '../../lib/format.js';
import type { AttendanceStatus, PublicGuest } from '@shared/types';

interface GuestPassModalProps {
  open: boolean;
  onClose: () => void;
  guest: PublicGuest;
  coupleNames: string;
  /** Present right after an RSVP, so the card shows what was confirmed. */
  rsvp?: { attendance: AttendanceStatus; pax: number } | null;
}

/** The guest's QR card. Reception scans the 4-character code it encodes. */
export const GuestPassModal: React.FC<GuestPassModalProps> = ({ open, onClose, guest, coupleNames, rsvp }) => {
  const { copy, copied } = useCopy();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kartu tamu"
      description={`Tunjukkan kode ini di meja penerima tamu pernikahan ${coupleNames}.`}
      size="sm"
    >
      <div className="flex flex-col items-center text-center">
        <p className="font-display text-2xl leading-tight">{guest.name}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {guest.category} · {guest.pax} kursi{guest.tableNumber ? ` · ${guest.tableNumber}` : ''}
        </p>
        {rsvp && (
          <div className="mt-3">
            <StatusChip status={rsvp.attendance} suffix={rsvp.attendance === 'HADIR' ? `${rsvp.pax} orang` : undefined} />
          </div>
        )}

        <div className="mt-5 rounded-sm border border-line bg-white p-3">
          <QRCodeSVG value={guest.slug} size={184} level="M" title={`QR kode undangan ${guest.slug}`} />
        </div>
        <p className="display-numeral mt-3 text-3xl tracking-[0.3em]" aria-label={`Kode ${guest.slug.split('').join(' ')}`}>
          {guest.slug}
        </p>

        {guest.isCheckedIn && <p className="mt-3 rounded-xs bg-ok-bg px-3 py-1.5 text-sm font-semibold text-ok">Sudah tercatat hadir</p>}

        <p className="mt-4 text-sm text-ink-soft">Simpan tangkapan layar kartu ini agar tetap bisa ditunjukkan tanpa sinyal.</p>

        <Button variant="secondary" className="mt-5 w-full" onClick={() => copy(guestInvitationUrl(guest), 'link')}>
          {copied === 'link' ? 'Tautan tersalin' : 'Salin tautan undangan saya'}
        </Button>
      </div>
    </Modal>
  );
};
