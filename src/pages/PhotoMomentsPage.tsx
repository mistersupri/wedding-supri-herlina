import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { coupleNames } from '../lib/format.js';
import { readLocal, writeLocal } from '../lib/guestSession.js';
import { useThemePreset } from '../lib/theme.js';
import { useGuestAccess } from '../features/invitation/hooks/useGuestAccess.js';
import { useUnlockForm } from '../features/invitation/hooks/useUnlockForm.js';
import { MomentsFeed } from '../features/moments/MomentsFeed.js';
import { buttonClass } from '../components/ui/Button.js';
import { Field, Input } from '../components/ui/Field.js';
import { KawungDivider } from '../components/ui/Kawung.js';
import { ErrorState, LoadingState } from '../components/ui/StateView.js';
import { GuestPassModal } from '../components/wedding/GuestPassModal.js';
import type { MomentIdentity } from '@shared/types';

const NAME_KEY = 'wedding_moments_name';

/**
 * Guest camera page, reachable from the invitation or from a QR card on the tables. Who may use it
 * follows the couple's rule (CMS > Photo Moments): checked-in guests, any invited guest, or anyone
 * who types a name. The server enforces the same rule.
 */
export const PhotoMomentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: invitation } = useQuery({ queryKey: queryKeys.invitation, queryFn: publicApi.invitation });
  const camera = useQuery({ queryKey: queryKeys.cameraConfig, queryFn: publicApi.cameraConfig });
  const { guest, isChecking, unlock } = useGuestAccess();
  const unlockForm = useUnlockForm(unlock);
  const [name, setName] = useState(() => readLocal<string>(NAME_KEY, ''));
  const [draftName, setDraftName] = useState('');
  const [passOpen, setPassOpen] = useState(false);
  useThemePreset(invitation);

  const names = invitation ? coupleNames(invitation) : '';
  const backHref = guest ? `/?to=${encodeURIComponent(guest.name)}&c=${guest.slug}` : '/';

  useEffect(() => {
    document.title = names ? `Kamera tamu · ${names}` : 'Kamera tamu';
  }, [names]);

  if (isChecking || camera.isLoading) {
    return (
      <div className="on-deep min-h-dvh">
        <LoadingState label="Menyiapkan kamera..." className="min-h-dvh" />
      </div>
    );
  }
  if (camera.isError || !camera.data) {
    return (
      <div className="on-deep min-h-dvh">
        <ErrorState title="Kamera belum bisa dibuka." onRetry={() => camera.refetch()} className="min-h-dvh justify-center" />
      </div>
    );
  }

  const { access } = camera.data.settings;
  const identity: MomentIdentity | null =
    guest && (access !== 'CHECKED_IN' || guest.isCheckedIn)
      ? { name: guest.name, slug: guest.slug }
      : access === 'ANYONE' && name
        ? { name }
        : null;

  if (identity) {
    return (
      <div className="on-deep min-h-dvh">
        <MomentsFeed identity={identity} config={camera.data} coupleNames={names} onBack={() => navigate(backHref)} />
      </div>
    );
  }

  const waitingCheckIn = Boolean(guest) && access === 'CHECKED_IN';
  return (
    <div className="on-deep kawung-field flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-md bg-card p-7 text-ink">
        <p className="text-sm font-semibold text-prada-ink">Kamera tamu · {names}</p>
        <h1 className="mt-1 font-display text-3xl leading-tight">
          {waitingCheckIn ? 'Kamera terbuka setelah Anda tercatat hadir' : 'Ikut mengabadikan hari ini'}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          {waitingCheckIn
            ? 'Tunjukkan kartu tamu Anda di meja penerima tamu. Setelah tercatat hadir, buka halaman ini lagi.'
            : `Setiap tamu punya ${camera.data.settings.framesPerGuest} frame. Foto langsung masuk ke galeri bersama.`}
        </p>
        <KawungDivider className="my-6" />

        {waitingCheckIn ? (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setPassOpen(true)} className={buttonClass('primary')}>
              Tampilkan kartu tamu
            </button>
            <Link to={backHref} className={buttonClass('secondary')}>
              Kembali ke undangan
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={unlockForm.submit} className="flex flex-col gap-3">
              <Field label="Kode undangan" error={unlockForm.error} hint="4 huruf atau angka di pesan undangan Anda.">
                {(p) => (
                  <Input
                    {...p}
                    value={unlockForm.code}
                    onChange={(e) => unlockForm.setCode(e.target.value)}
                    maxLength={4}
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder="R7K2"
                    className="display-numeral text-center text-xl tracking-[0.3em]"
                  />
                )}
              </Field>
              <button type="submit" className={buttonClass('primary')} disabled={unlockForm.busy}>
                Masuk dengan kode
              </button>
            </form>
            {access === 'ANYONE' && (
              <form
                className="mt-6 flex flex-col gap-3 border-t border-line pt-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = draftName.trim().slice(0, 60);
                  if (!clean) return;
                  writeLocal(NAME_KEY, clean);
                  setName(clean);
                }}
              >
                <Field label="Atau cukup tulis nama Anda">
                  {(p) => (
                    <Input {...p} value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Nama yang tampil di foto" />
                  )}
                </Field>
                <button type="submit" className={buttonClass('secondary')} disabled={!draftName.trim()}>
                  Masuk dengan nama
                </button>
              </form>
            )}
          </>
        )}
      </div>
      {guest && <GuestPassModal open={passOpen} onClose={() => setPassOpen(false)} guest={guest} coupleNames={names} />}
    </div>
  );
};
