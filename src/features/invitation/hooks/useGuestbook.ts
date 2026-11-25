import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { useInvitation } from '../InvitationContext.js';

/** Public wishes plus the current guest's own RSVP, if they already sent one. */
export function useGuestbook() {
  const { guest } = useInvitation();
  const code = guest?.slug ?? '';
  const query = useQuery({ queryKey: queryKeys.guestbookFor(code), queryFn: () => publicApi.guestbook(code) });
  const wishes = useMemo(() => query.data?.data || [], [query.data]);
  // Matched by invitation code on the server, so two guests with the same name never share a wish.
  const existingWish = guest ? query.data?.mine ?? null : null;

  return {
    wishes,
    stats: query.data?.stats,
    existingWish,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => query.refetch(),
  };
}
