import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../../../lib/api.js';
import { queryKeys } from '../../../lib/queryKeys.js';
import { useInvitation } from '../InvitationContext.js';

/** Public wishes plus the current guest's own RSVP, if they already sent one. */
export function useGuestbook() {
  const { guest } = useInvitation();
  const query = useQuery({ queryKey: queryKeys.guestbook, queryFn: publicApi.guestbook });
  const wishes = useMemo(() => query.data?.data || [], [query.data]);

  const existingWish = useMemo(() => {
    if (!guest) return null;
    const name = guest.name.trim().toLowerCase();
    return wishes.find((w) => w.guestName.trim().toLowerCase() === name) || null;
  }, [wishes, guest]);

  return {
    wishes,
    stats: query.data?.stats,
    existingWish,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => query.refetch(),
  };
}
