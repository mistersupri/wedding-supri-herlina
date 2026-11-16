import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { publicApi } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { Button } from '../ui/Button.js';
import type { PublicGuest } from '@shared/types';

export interface SelfCheckInRules {
  selfCheckIn: boolean;
  verifyLocation: boolean;
}

const POSITION_ERRORS: Record<number, string> = {
  1: 'Akses lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan peramban, lalu coba lagi.',
  2: 'Lokasi HP belum terbaca. Pastikan GPS menyala dan coba di tempat terbuka.',
  3: 'Pembacaan lokasi terlalu lama. Coba lagi.',
};

function currentPosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext || !navigator.geolocation) {
      reject(new Error('Peramban ini tidak bisa membaca lokasi. Buka undangan lewat tautan https, atau lapor ke meja penerima tamu.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => reject(new Error(POSITION_ERRORS[e.code] ?? POSITION_ERRORS[2])),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 },
    );
  });
}

/**
 * "I'm here" button: marks the guest present from their own phone. When the couple verifies location, the
 * browser reads the phone's position first and the server checks it against the venue.
 * On success the verified guest in the query cache is replaced, so everything gated on check-in opens at once.
 */
export const SelfCheckIn: React.FC<{ guest: PublicGuest; rules?: SelfCheckInRules; className?: string; onDone?: () => void }> = ({
  guest,
  rules,
  className = '',
  onDone,
}) => {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!rules?.selfCheckIn || guest.isCheckedIn) return null;

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const position = rules.verifyLocation ? await currentPosition() : undefined;
      const res = await publicApi.selfCheckIn(guest.slug, position);
      client.setQueryData(queryKeys.guestAccess(guest.slug), { isValid: true, guest: res.guest, message: res.message });
      client.invalidateQueries({ queryKey: queryKeys.cameraConfig });
      setMessage(res.message ?? 'Kehadiran Anda tercatat.');
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-sm border border-line bg-paper-2 p-4 text-left ${className}`}>
      <p className="text-sm font-semibold">Sudah tiba di lokasi?</p>
      <p className="mt-1 text-sm text-ink-soft">
        {rules.verifyLocation
          ? 'Catat kehadiran Anda dari HP. Peramban akan meminta izin lokasi, dan konfirmasi hanya diterima di sekitar lokasi acara.'
          : 'Catat kehadiran Anda dari HP, tanpa perlu antre di meja penerima tamu.'}
      </p>
      <Button className="mt-3 w-full" onClick={confirm} loading={busy}>
        <MapPin className="h-4 w-4" aria-hidden="true" /> Saya sudah di lokasi
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-no">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-2 text-sm font-semibold text-ok">
          {message}
        </p>
      )}
    </div>
  );
};
