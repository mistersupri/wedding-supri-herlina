/**
 * Background upload queue for guest photos. Each shot becomes a job stored in IndexedDB, so a weak
 * signal, a locked phone or a closed tab never loses a photo: the queue resumes when the page is
 * open and the device is online. Jobs upload the full-size original, then the feed copy, then
 * register the photo; finished steps are remembered so a retry never uploads twice.
 */
import type { MomentIdentity } from '@shared/types';

export interface UploadJob {
  id: string;
  identity: MomentIdentity;
  caption: string;
  look: string;
  original: Blob;
  preview: Blob;
  createdAt: number;
  originalUrl?: string;
  previewUrl?: string;
  /** Set when the server refused the photo for good (quota, camera closed). */
  rejected?: string;
}

export interface JobState {
  id: string;
  status: 'waiting' | 'uploading' | 'retrying' | 'done' | 'rejected';
  progress: number;
  error?: string;
  /** Small object URL for the progress list. */
  thumb: string;
}

const DB = 'wedding-moments';
const STORE = 'jobs';
const RETRY_MS = 8000;

// --- IndexedDB (falls back to memory when unavailable, e.g. some private modes) ---

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<string, UploadJob>();

function openDb() {
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const store = {
  async all(): Promise<UploadJob[]> {
    const rows = (await tx<UploadJob[]>('readonly', (s) => s.getAll() as IDBRequest<UploadJob[]>)) ?? [...memory.values()];
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
  async put(job: UploadJob) {
    memory.set(job.id, job);
    await tx('readwrite', (s) => s.put(job)).catch(() => undefined);
  },
  async remove(id: string) {
    memory.delete(id);
    await tx('readwrite', (s) => s.delete(id)).catch(() => undefined);
  },
};

// --- Network ---

class HttpFailure extends Error {
  constructor(
    message: string,
    public permanent: boolean,
  ) {
    super(message);
  }
}

function uploadBlob(blob: Blob, name: string, onProgress: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload?category=moments');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let json: { url?: string; message?: string } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON body: treated as a server failure below.
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.url) resolve(json.url);
      else
        reject(
          new HttpFailure(
            json.message || `Unggahan gagal (${xhr.status}).`,
            xhr.status >= 400 && xhr.status < 500 && xhr.status !== 408 && xhr.status !== 429,
          ),
        );
    };
    xhr.onerror = () => reject(new HttpFailure('Sinyal terputus.', false));
    const body = new FormData();
    body.append('file', new File([blob], name, { type: 'image/jpeg' }));
    xhr.send(body);
  });
}

async function register(job: UploadJob) {
  const res = await fetch('/api/public/photo-moments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guestName: job.identity.name,
      guestSlug: job.identity.slug,
      photoUrl: job.previewUrl,
      originalUrl: job.originalUrl,
      caption: job.caption,
      look: job.look,
    }),
  }).catch(() => {
    throw new HttpFailure('Sinyal terputus.', false);
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false)
    throw new HttpFailure(json.message || `Gagal menyimpan foto (${res.status}).`, res.status >= 400 && res.status < 500);
}

// --- Queue state shared by every component ---

type Listener = (jobs: JobState[]) => void;
const states = new Map<string, JobState>();
const listeners = new Set<Listener>();
const doneListeners = new Set<() => void>();
let running = false;
let started = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

const emit = () => {
  const list = [...states.values()];
  listeners.forEach((l) => l(list));
};

function setState(id: string, patch: Partial<JobState>) {
  const prev = states.get(id);
  if (!prev) return;
  states.set(id, { ...prev, ...patch });
  emit();
}

async function processJob(job: UploadJob) {
  setState(job.id, { status: 'uploading', error: undefined });
  const progress = (base: number, span: number) => (f: number) => setState(job.id, { progress: base + f * span });
  if (!job.originalUrl) {
    job.originalUrl = await uploadBlob(job.original, `asli-${job.id}.jpg`, progress(0, 0.75));
    await store.put(job);
  }
  if (!job.previewUrl) {
    job.previewUrl = await uploadBlob(job.preview, `feed-${job.id}.jpg`, progress(0.75, 0.2));
    await store.put(job);
  }
  await register(job);
  setState(job.id, { status: 'done', progress: 1 });
  await store.remove(job.id);
  doneListeners.forEach((l) => l());
  // Let "Udah masuk feed" show for a moment, then drop the row.
  setTimeout(() => {
    const s = states.get(job.id);
    if (s) URL.revokeObjectURL(s.thumb);
    states.delete(job.id);
    emit();
  }, 3500);
}

async function pump() {
  if (running) return;
  running = true;
  clearTimeout(retryTimer);
  try {
    for (const job of await store.all()) {
      if (job.rejected || !navigator.onLine) continue;
      try {
        await processJob(job);
      } catch (err) {
        const failure = err as HttpFailure;
        if (failure.permanent) {
          job.rejected = failure.message;
          await store.put(job);
          setState(job.id, { status: 'rejected', error: failure.message });
        } else {
          setState(job.id, { status: 'retrying', error: failure.message || 'Sinyal lemah.' });
          retryTimer = setTimeout(pump, RETRY_MS);
          break;
        }
      }
    }
  } finally {
    running = false;
  }
}

function track(job: UploadJob) {
  if (states.has(job.id)) return;
  states.set(job.id, {
    id: job.id,
    status: job.rejected ? 'rejected' : 'waiting',
    progress: 0,
    error: job.rejected,
    thumb: URL.createObjectURL(job.preview),
  });
}

/** Load jobs left from an earlier visit and start uploading. Safe to call many times. */
export async function startQueue() {
  if (started) return;
  started = true;
  for (const job of await store.all()) track(job);
  emit();
  window.addEventListener('online', () => pump());
  pump();
}

export async function enqueue(job: Omit<UploadJob, 'id' | 'createdAt'>) {
  const full: UploadJob = { ...job, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() };
  await store.put(full);
  track(full);
  emit();
  pump();
}

export function retryNow() {
  pump();
}

export async function discard(id: string) {
  await store.remove(id);
  const s = states.get(id);
  if (s) URL.revokeObjectURL(s.thumb);
  states.delete(id);
  emit();
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  listener([...states.values()]);
  return () => {
    listeners.delete(listener);
  };
}

export function onUploaded(listener: () => void) {
  doneListeners.add(listener);
  return () => {
    doneListeners.delete(listener);
  };
}
