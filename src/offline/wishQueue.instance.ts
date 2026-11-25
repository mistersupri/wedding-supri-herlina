import { useCallback, useSyncExternalStore } from 'react';
import { ApiError, publicApi, uploadFile } from '../lib/api.js';
import { createWishQueue, type PendingWish, type WishStore } from './wishQueue.js';

const DB = 'wedding-wishes';
const STORE = 'pending';

// IndexedDB keeps the voice note's audio too. Without it (some private modes) the queue still works until the tab closes.
let dbPromise: Promise<IDBDatabase | null> | null = null;
function openDb() {
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'slug' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const idbStore: WishStore = {
  all: async () => (await run<PendingWish[]>('readonly', (s) => s.getAll() as IDBRequest<PendingWish[]>)) ?? [],
  put: async (item) => void (await run('readwrite', (s) => s.put(item))),
  remove: async (slug) => void (await run('readwrite', (s) => s.delete(slug))),
};

export const isTransient = (err: unknown) => {
  const e = err as Partial<ApiError> | undefined;
  return e?.offline === true || e?.status === 429;
};

export const wishQueue = createWishQueue({
  store: idbStore,
  submit: publicApi.submitWish,
  upload: (voice) => uploadFile(new File([voice], 'pesan-suara', { type: voice.type || 'audio/webm' }), 'voice'),
  isTransient,
});

let started = false;
/** Loads saved wishes and sends them whenever the connection or the page comes back. Safe to call many times. */
export function startWishQueue() {
  if (started) return;
  started = true;
  void wishQueue.load().then(() => wishQueue.flush());
  const retry = () => void wishQueue.flush();
  window.addEventListener('online', retry);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && retry());
  // A weak signal can come and go without the browser reporting it.
  setInterval(() => wishQueue.hasPending() && retry(), 20_000);
}

/** The queue as the page sees it, for one guest code. */
export function useWishQueue(slug: string) {
  const snap = useSyncExternalStore(wishQueue.subscribe, wishQueue.getSnapshot);
  const sendNow = useCallback(() => wishQueue.flush(), []);
  const cancel = useCallback(() => wishQueue.discard(slug), [slug]);
  return { pending: snap.pending[slug] ?? null, failed: snap.failed[slug] ?? null, flushing: snap.flushing, sendNow, cancel };
}
