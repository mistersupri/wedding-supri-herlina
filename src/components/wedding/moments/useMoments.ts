import { useCallback, useEffect, useRef, useState } from 'react';
import { publicApi } from '../../../lib/api.js';
import { readLocal, writeLocal } from '../../../lib/guestSession.js';
import type { PhotoMoment, PublicGuest } from '../../../types.js';

const PAGE_SIZE = 12;
const REACTIONS_KEY = 'wedding_photo_moments_reactions';

/** Paged guest photos plus this device's own reaction per photo (one emoji each, toggleable). */
export function useMoments(guest: PublicGuest) {
  const [moments, setMoments] = useState<PhotoMoment[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [myReactions, setMyReactions] = useState<Record<string, string>>(() => readLocal(REACTIONS_KEY, {}));
  const page = useRef(1);
  const busy = useRef(false);

  const load = useCallback(
    async (reset: boolean) => {
      if (busy.current) return;
      busy.current = true;
      const target = reset ? 1 : page.current + 1;
      if (reset) setStatus('loading');
      else setLoadingMore(true);
      try {
        const res = await publicApi.photoMoments({ guestName: guest.name, guestSlug: guest.slug, page: target, limit: PAGE_SIZE });
        setMoments((prev) => {
          if (reset) return res.data;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...res.data.filter((p) => !seen.has(p.id))];
        });
        setUserCount(res.userCount);
        setHasMore(res.hasMore);
        page.current = target;
        setStatus('ready');
      } catch {
        if (reset) setStatus('error');
      } finally {
        busy.current = false;
        setLoadingMore(false);
      }
    },
    [guest.name, guest.slug],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  useEffect(() => writeLocal(REACTIONS_KEY, myReactions), [myReactions]);

  const applyServerCounts = (id: string, counts: { likesCount: number; reactions: Record<string, number> }) =>
    setMoments((prev) => prev.map((p) => (p.id === id ? { ...p, ...counts } : p)));

  /** Same emoji again removes it; a different emoji replaces the previous one. */
  const react = useCallback(
    async (id: string, emoji: string) => {
      const previous = myReactions[id];
      setMyReactions((prev) => {
        const next = { ...prev };
        if (previous === emoji) delete next[id];
        else next[id] = emoji;
        return next;
      });
      try {
        if (previous) applyServerCounts(id, await publicApi.reactPhotoMoment(id, previous, 'remove'));
        if (previous !== emoji) applyServerCounts(id, await publicApi.reactPhotoMoment(id, emoji, 'add'));
      } catch {
        // Roll back the local choice; the server counts were not changed.
        setMyReactions((prev) => ({ ...prev, ...(previous ? { [id]: previous } : {}) }));
      }
    },
    [myReactions],
  );

  const isMine = useCallback(
    (photo: PhotoMoment) =>
      photo.guestSlug
        ? photo.guestSlug.toUpperCase() === guest.slug.toUpperCase()
        : photo.guestName.trim().toLowerCase() === guest.name.trim().toLowerCase(),
    [guest.slug, guest.name],
  );

  return {
    moments,
    userCount,
    hasMore,
    status,
    loadingMore,
    myReactions,
    reload: () => load(true),
    loadMore: () => load(false),
    react,
    isMine,
  };
}
