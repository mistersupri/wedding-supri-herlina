import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { publicApi } from '../../lib/api.js';
import { queryKeys } from '../../lib/queryKeys.js';
import { readLocal, writeLocal } from '../../lib/guestSession.js';
import type { MomentIdentity, PhotoMoment } from '@shared/types';

const PAGE_SIZE = 12;
const REACTIONS_KEY = 'wedding_photo_moments_reactions';

type Page = Awaited<ReturnType<typeof publicApi.photoMoments>>;

/** Paged guest photos plus this device's own reaction per photo (one emoji each, toggleable). */
export function useMoments(guest: MomentIdentity) {
  const client = useQueryClient();
  const key = queryKeys.photoMoments(guest.slug || `name:${guest.name.toLowerCase()}`);
  const [myReactions, setMyReactions] = useState<Record<string, string>>(() => readLocal(REACTIONS_KEY, {}));

  useEffect(() => writeLocal(REACTIONS_KEY, myReactions), [myReactions]);

  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => publicApi.photoMoments({ guestName: guest.name, guestSlug: guest.slug, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
  });

  const moments = useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages || []).flatMap((p) => p.data).filter((p) => !seen.has(p.id) && Boolean(seen.add(p.id)));
  }, [query.data]);

  const applyServerCounts = (id: string, counts: { likesCount: number; reactions: Record<string, number> }) =>
    client.setQueryData<InfiniteData<Page>>(
      key,
      (data) =>
        data && { ...data, pages: data.pages.map((pg) => ({ ...pg, data: pg.data.map((p) => (p.id === id ? { ...p, ...counts } : p)) })) },
    );

  /** Same emoji again removes it; a different emoji replaces the previous one. */
  const reaction = useMutation({
    mutationFn: async ({ id, emoji, previous }: { id: string; emoji: string; previous?: string }) => {
      if (previous) applyServerCounts(id, await publicApi.reactPhotoMoment(id, previous, 'remove'));
      if (previous !== emoji) applyServerCounts(id, await publicApi.reactPhotoMoment(id, emoji, 'add'));
    },
    onMutate: ({ id, emoji, previous }) =>
      setMyReactions((prev) => {
        const next = { ...prev };
        if (previous === emoji) delete next[id];
        else next[id] = emoji;
        return next;
      }),
    // Roll back the local choice; the server counts were not changed.
    onError: (_err, { id, previous }) => setMyReactions((prev) => ({ ...prev, ...(previous ? { [id]: previous } : {}) })),
  });

  const { mutate } = reaction;
  const react = useCallback((id: string, emoji: string) => mutate({ id, emoji, previous: myReactions[id] }), [mutate, myReactions]);

  const { fetchNextPage, isFetchingNextPage } = query;
  const loadMore = useCallback(() => {
    if (!isFetchingNextPage) fetchNextPage();
  }, [fetchNextPage, isFetchingNextPage]);

  const isMine = useCallback(
    (photo: PhotoMoment) =>
      photo.guestSlug && guest.slug
        ? photo.guestSlug.toUpperCase() === guest.slug.toUpperCase()
        : photo.guestName.trim().toLowerCase() === guest.name.trim().toLowerCase(),
    [guest.slug, guest.name],
  );

  const firstPage = query.data?.pages[0];
  return {
    moments,
    userCount: firstPage?.userCount ?? 0,
    hasMore: Boolean(query.hasNextPage),
    status: query.isPending ? 'loading' : query.isError && !query.data ? 'error' : 'ready',
    loadingMore: query.isFetchingNextPage,
    myReactions,
    reload: () => client.resetQueries({ queryKey: key }),
    /** Refetch in place, keeping what is on screen (after an upload or a comment). */
    refresh: () => client.invalidateQueries({ queryKey: key }),
    loadMore,
    react,
    isMine,
  } as const;
}
