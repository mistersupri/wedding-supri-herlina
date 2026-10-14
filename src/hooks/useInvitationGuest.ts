import { useCallback, useEffect, useState } from 'react';
import { publicApi } from '../lib/api.js';
import { loadStoredGuest, readInvitationParams, storeGuest, writeInvitationParams } from '../lib/guestSession.js';
import type { PublicGuest } from '../types.js';

/**
 * Who is reading the invitation. A guest is "verified" when their 4-character code
 * (from the link, from this device, or typed in) matches the invited-guest list.
 */
export function useInvitationGuest() {
  const [params] = useState(readInvitationParams);
  const [guest, setGuest] = useState<PublicGuest | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    const code = params.code || loadStoredGuest()?.slug || '';
    if (!code) {
      setIsChecking(false);
      return;
    }
    // Re-verify even a stored guest, so check-in status is fresh.
    publicApi.verifyCode(code).then((res) => {
      if (!alive) return;
      if (res.isValid && res.guest) {
        setGuest(res.guest);
        storeGuest(res.guest);
      }
      setIsChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [params.code]);

  const unlock = useCallback(async (code: string) => {
    const res = await publicApi.verifyCode(code);
    if (res.isValid && res.guest) {
      setGuest(res.guest);
      storeGuest(res.guest);
      writeInvitationParams(res.guest);
    }
    return res;
  }, []);

  return {
    guest,
    isVerified: Boolean(guest),
    isChecking,
    /** Name on the envelope: the link's ?to=, else the verified guest, else a polite default. */
    displayName: params.name || guest?.name || 'Tamu Undangan',
    unlock,
  };
}
