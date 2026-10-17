import React from 'react';
import { useInvitation } from '../../features/invitation/InvitationContext.js';
import { useUnlockForm } from '../../features/invitation/hooks/useUnlockForm.js';
import { Button } from '../ui/Button.js';
import { Field, Input } from '../ui/Field.js';

/** For visitors who opened the invitation without a personal link: enter the 4-character code. */
export const UnlockPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { unlock } = useInvitation();
  const { code, setCode, error, busy, submit } = useUnlockForm(unlock);

  return (
    <div id="buka-undangan" className={`scroll-mt-24 rounded-md border border-line bg-card p-6 ${className}`}>
      <h3 className="font-display text-2xl">Masukkan kode undangan</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        Konfirmasi kehadiran, alamat lengkap, dan amplop digital terbuka untuk tamu yang terdaftar. Kodenya ada di pesan undangan yang Anda
        terima.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Kode 4 karakter" error={error} className="flex-1">
          {(p) => (
            <Input
              {...p}
              value={code}
              maxLength={4}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="R7K2"
              onChange={(e) => setCode(e.target.value)}
              className="display-numeral text-center text-xl tracking-[0.3em]"
            />
          )}
        </Field>
        <Button type="submit" loading={busy} className="sm:mb-[1.6rem]">
          Buka undangan saya
        </Button>
      </form>
    </div>
  );
};
