import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { loadStoredGuest, readInvitationParams, storeGuest, writeInvitationParams } from '../../../lib/guestSession.js';

/**
 * Who is reading the invitation. A guest is "verified" when their 4-character code
 * (from the link, from this device, or typed in) matches the invited-guest list.
 */
export function useGuestAccess() {
  const client = useQueryClient();
  const [params] = useState(readInvitationParams);
  const [code, setCode] = useState(() => params.code || loadStoredGuest()?.slug || '');

  // Re-verified on every visit, even for a stored guest, so check-in status is fresh.
  const verification = useQuery({
    queryKey: queryKeys.guestAccess(code),
    queryFn: () => publicApi.verifyCode(code),
    enabled: code.length === 4,
  });
  const guest = verification.data?.isValid ? verification.data.guest : null;

  useEffect(() => {
    if (guest) storeGuest(guest);
  }, [guest]);

  const unlock = useMutation({
    mutationFn: publicApi.verifyCode,
    onSuccess: (res) => {
      if (!res.isValid || !res.guest) return;
      client.setQueryData(queryKeys.guestAccess(res.guest.slug), res);
      setCode(res.guest.slug);
      writeInvitationParams(res.guest);
    },
  });

  return {
    guest,
    isChecking: verification.isLoading,
    /** Name on the cover: the verified guest, else the link's ?to=, else a polite default. */
    displayName: guest?.name || params.name || 'Tamu Undangan',
    unlock: unlock.mutateAsync,
  };
}
