import type { AttendanceStatus, GuestWish } from '@shared/types';

/** What the server needs to record a wish. */
export interface WishPayload {
  guestSlug: string;
  guestName: string;
  relationship: string;
  attendanceStatus: AttendanceStatus;
  numberOfGuests: number;
  message: string;
  voiceUrl?: string | null;
}

/** A wish waiting for a signal. One per guest: sending again replaces it. */
export interface PendingWish {
  slug: string;
  wish: WishPayload;
  /** A recorded voice note that has not reached the server yet. */
  voice?: Blob;
  /** The guest was changing an earlier answer, so the "changed once" mark applies when it is sent. */
  editing: boolean;
  createdAt: number;
}

export interface WishStore {
  all(): Promise<PendingWish[]>;
  put(item: PendingWish): Promise<void>;
  remove(slug: string): Promise<void>;
}

/** The part of a pending wish the page shows. */
export interface PendingSummary {
  slug: string;
  wish: WishPayload;
  hasVoice: boolean;
  editing: boolean;
}

export interface QueueSnapshot {
  pending: Readonly<Record<string, PendingSummary>>;
  /** Wishes the server refused for good (not a connection problem), by guest code. */
  failed: Readonly<Record<string, string>>;
  flushing: boolean;
}

interface Deps {
  store: WishStore;
  submit: (wish: WishPayload) => Promise<GuestWish>;
  upload: (voice: Blob) => Promise<string>;
  /** True for "try again later" failures: no signal, server down or restarting, rate limited. */
  isTransient: (err: unknown) => boolean;
}

/**
 * Wishes that could not be sent because there was no signal. They are kept (on disk when the browser
 * allows it) and sent when the connection returns. The server records one wish per invitation code,
 * so sending the same wish twice is harmless.
 */
export function createWishQueue({ store, submit, upload, isTransient }: Deps) {
  const items = new Map<string, PendingWish>();
  let failed: Record<string, string> = {};
  let flushing = false;
  let snapshot: QueueSnapshot = { pending: {}, failed: {}, flushing: false };
  const listeners = new Set<() => void>();
  const sentListeners = new Set<(item: PendingWish, wish: GuestWish) => void>();

  const summary = (i: PendingWish): PendingSummary => ({ slug: i.slug, wish: i.wish, hasVoice: Boolean(i.voice), editing: i.editing });
  const emit = () => {
    snapshot = { pending: Object.fromEntries([...items].map(([k, v]) => [k, summary(v)])), failed, flushing };
    listeners.forEach((l) => l());
  };

  const queue = {
    /** Loads what an earlier visit left behind. */
    async load() {
      for (const item of await store.all().catch(() => [] as PendingWish[])) items.set(item.slug, item);
      emit();
    },

    async enqueue(item: Omit<PendingWish, 'createdAt'>) {
      const full = { ...item, createdAt: Date.now() };
      items.set(full.slug, full);
      const { [full.slug]: _cleared, ...rest } = failed;
      failed = rest;
      await store.put(full).catch(() => undefined);
      emit();
    },

    async discard(slug: string) {
      items.delete(slug);
      await store.remove(slug).catch(() => undefined);
      emit();
    },

    /** Tries to send everything waiting. Stops at the first connection failure; the rest wait for the next try. */
    async flush() {
      if (flushing || items.size === 0) return;
      flushing = true;
      emit();
      try {
        for (const item of [...items.values()]) {
          try {
            let voiceUrl = item.wish.voiceUrl ?? null;
            if (item.voice && !voiceUrl) {
              voiceUrl = await upload(item.voice);
              item.wish = { ...item.wish, voiceUrl };
              await store.put(item).catch(() => undefined);
            }
            const sent = await submit({ ...item.wish, voiceUrl });
            items.delete(item.slug);
            await store.remove(item.slug).catch(() => undefined);
            sentListeners.forEach((l) => l(item, sent));
          } catch (err) {
            if (isTransient(err)) break;
            items.delete(item.slug);
            await store.remove(item.slug).catch(() => undefined);
            failed = { ...failed, [item.slug]: (err as Error).message || 'Ucapan tidak dapat dikirim.' };
          }
        }
      } finally {
        flushing = false;
        emit();
      }
    },

    hasPending: () => items.size > 0,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    onSent(listener: (item: PendingWish, wish: GuestWish) => void) {
      sentListeners.add(listener);
      return () => void sentListeners.delete(listener);
    },
  };
  return queue;
}

export type WishQueue = ReturnType<typeof createWishQueue>;
