import React, { useState } from 'react';
import { Button } from '../ui/Button.js';
import { Field, Input } from '../ui/Field.js';
import type { GuestAccessVerification } from '../../types.js';

interface UnlockPanelProps {
  onUnlock: (code: string) => Promise<GuestAccessVerification>;
  className?: string;
}

/** For visitors who opened the invitation without a personal link: enter the 4-character code. */
export const UnlockPanel: React.FC<UnlockPanelProps> = ({ onUnlock, className = '' }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 4) {
      setError('Kode terdiri dari 4 huruf atau angka, contoh: R7K2.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await onUnlock(clean);
    setBusy(false);
    if (!res.isValid) setError(res.message || 'Kode ini tidak ada di daftar undangan.');
  };

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
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
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
