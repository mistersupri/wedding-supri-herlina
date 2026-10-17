import { useState } from 'react';
import type { GuestAccessVerification } from '@shared/types';

/** State for the "enter your 4-character code" form, shared by every template's unlock UI. */
export function useUnlockForm(onUnlock: (code: string) => Promise<GuestAccessVerification>) {
  const [code, setCodeState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setCode = (value: string) => {
    setCodeState(value.toUpperCase().slice(0, 4));
    setError(null);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length !== 4) {
      setError('Kode terdiri dari 4 huruf atau angka, contoh: R7K2.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await onUnlock(clean).catch((err: Error) => ({ isValid: false, guest: null, message: err.message }));
    setBusy(false);
    if (!res.isValid) setError(res.message || 'Kode ini tidak ada di daftar undangan.');
  };

  return { code, setCode, error, busy, submit };
}
