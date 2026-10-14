import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { coupleNames } from '../lib/format.js';
import { useThemePreset } from '../lib/theme.js';
import { useInvitationGuest } from '../hooks/useInvitationGuest.js';
import { buttonClass } from '../components/ui/Button.js';
import { KawungDivider } from '../components/ui/Kawung.js';
import { LoadingState } from '../components/ui/StateView.js';
import { PhotoMomentsSection } from '../components/wedding/moments/PhotoMomentsSection.js';
import { GuestPassModal } from '../components/wedding/GuestPassModal.js';

/** Guest camera page. Opens only for invited guests who have been checked in at the venue. */
export const PhotoMomentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: invitation } = useQuery({ queryKey: queryKeys.invitation, queryFn: publicApi.invitation });
  const { guest, isChecking } = useInvitationGuest();
  const [passOpen, setPassOpen] = useState(false);
  useThemePreset(invitation?.themeColor);

  const names = invitation ? coupleNames(invitation) : '';
  const backHref = guest ? `/?to=${encodeURIComponent(guest.name)}&c=${guest.slug}` : '/';

  useEffect(() => {
    document.title = names ? `Photo Moments · ${names}` : 'Photo Moments';
  }, [names]);

  if (isChecking) {
    return (
      <div className="on-deep min-h-dvh">
        <LoadingState label="Memeriksa status kehadiran..." className="min-h-dvh" />
      </div>
    );
  }

  if (guest?.isCheckedIn) {
    return (
      <div className="on-deep min-h-dvh">
        <PhotoMomentsSection guest={guest} coupleNames={names} onBack={() => navigate(backHref)} />
      </div>
    );
  }

  return (
    <div className="on-deep kawung-field flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-md bg-card p-7 text-ink">
        <h1 className="font-display text-3xl leading-tight">Kamera tamu dibuka di lokasi acara</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Photo Moments bisa dipakai setelah Anda tercatat hadir di meja penerima tamu. Tunjukkan kartu tamu Anda kepada petugas, lalu buka
          halaman ini lagi.
        </p>
        <KawungDivider className="my-6" />
        <div className="flex flex-col gap-2">
          {guest && (
            <button type="button" onClick={() => setPassOpen(true)} className={buttonClass('primary')}>
              Tampilkan kartu tamu
            </button>
          )}
          <Link to={backHref} className={buttonClass('secondary')}>
            Kembali ke undangan
          </Link>
        </div>
        {!guest && <p className="mt-4 text-sm text-ink-soft">Buka halaman ini dari tautan undangan pribadi Anda agar kode tamu terbaca.</p>}
      </div>
      {guest && <GuestPassModal open={passOpen} onClose={() => setPassOpen(false)} guest={guest} coupleNames={names} />}
    </div>
  );
};
