/*
 * Service worker: lets guests open the invitation with no signal, or while the server is down.
 *
 * - Precache: the app shell and every script, style and icon a guest page needs. Filled in at build time.
 * - Pages: network first (so a deploy shows up at once), cached shell when the network is slow, down or erroring.
 * - Public API reads (invitation, guest book, camera rules): network first, last good answer as the fallback.
 * - Uploaded images (/uploads): cache first, so photos seen once stay available. Video and audio are never cached.
 * - Web fonts: stale while revalidate.
 * Everything else (CMS and auth calls, every write, downloads) goes straight to the network, untouched.
 *
 * `__VERSION__` and `__PRECACHE_URLS__` are replaced by the build (see scripts/offlinePlugin.ts).
 */
const VERSION = /*__VERSION__*/ 'dev';
const PRECACHE_URLS = /*__PRECACHE_URLS__*/ [];

const PRECACHE = `precache-${VERSION}`;
const API_CACHE = 'api-v1';
const IMAGE_CACHE = 'images-v1';
const FONT_CACHE = 'fonts-v1';
const KEEP = [PRECACHE, API_CACHE, IMAGE_CACHE, FONT_CACHE];

/** Slow connection: after this long, a cached answer is shown while the network request carries on. */
const NETWORK_TIMEOUT_MS = 3500;
const MAX_IMAGES = 300;
const MAX_API_ENTRIES = 60;

const API_READS = [
  /^\/api\/invitation$/,
  /^\/api\/public\/guestbook$/,
  /^\/api\/public\/photo-moments\/(config|frame-config)$/,
  /^\/api\/public\/photo-moments$/,
];
/** Fetched once when the worker installs. The very first page load is not yet under the worker, so it never cached these itself. */
const WARM_API = ['/api/invitation', '/api/public/guestbook', '/api/public/photo-moments/config', '/api/public/photo-moments/frame-config'];
const IMAGE_FILE = /\.(?:jpe?g|png|webp|gif|avif|heic)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .open(PRECACHE)
        // One failed file fails the install and it is retried later, so the cache is never half-filled.
        .then((cache) => Promise.all(PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' }))))),
      warmApi(),
    ]),
  );
});

/** Best effort: a failure here must not fail the install. */
async function warmApi() {
  const cache = await caches.open(API_CACHE);
  await Promise.all(
    WARM_API.map(async (path) => {
      try {
        const res = await fetch(path);
        if (res.ok) await cache.put(new URL(path, self.location.origin).href, res);
      } catch {
        // Offline while installing: the page's own requests fill the cache on later visits.
      }
    }),
  );
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  // A new version waits until the guest agrees to reload, so an open page never loses the files it still needs.
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'CACHE_IMAGES' && Array.isArray(data.urls)) event.waitUntil(warmImages(data.urls));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(staleWhileRevalidate(event, request, FONT_CACHE, 40));
    }
    return;
  }

  const path = url.pathname;
  if (path.startsWith('/api/')) {
    if (API_READS.some((re) => re.test(path))) {
      // With a query (?c=CODE, paging) the same path without it is the next best answer.
      const plain = url.search ? url.origin + url.pathname : null;
      event.respondWith(networkFirst(event, request, API_CACHE, request.url, MAX_API_ENTRIES, plain));
    }
    return;
  }
  if (path.startsWith('/uploads/')) {
    if (IMAGE_FILE.test(path) && !request.headers.has('range')) event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGES));
    return;
  }
  if (path === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(navigate(event, request));
    return;
  }
  // Hashed build files and icons: the precache answers first; anything else same-origin is kept as it is fetched.
  event.respondWith(precachedOrFetch(request));
});

// --- Strategies ---------------------------------------------------------------------------------

/** Trim a cache to its newest `max` entries (insertion order). */
async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

/**
 * The network answer when it is good. A cached answer when the network fails, answers with an error
 * status, or takes longer than the timeout (the request still finishes and refreshes the cache).
 */
function networkFirst(event, request, cacheName, key, max, altKey) {
  const cached = caches.open(cacheName).then(async (c) => (await c.match(key)) || (altKey ? c.match(altKey) : undefined));
  const network = fetch(request).then(async (res) => {
    if (res.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(key, res.clone());
      if (max) await trim(cache, max);
    }
    return res;
  });
  event.waitUntil(network.catch(() => undefined));

  return new Promise((resolve) => {
    let settled = false;
    const done = (res) => {
      if (settled) return;
      settled = true;
      resolve(res);
    };
    const timer = setTimeout(async () => {
      const hit = await cached;
      if (hit) done(hit);
    }, NETWORK_TIMEOUT_MS);
    network.then(
      async (res) => {
        clearTimeout(timer);
        if (res.ok) return done(res);
        done((await cached) || res);
      },
      async () => {
        clearTimeout(timer);
        done((await cached) || Response.error());
      },
    );
  });
}

/** Pages: the live page when the server answers well, otherwise the app shell from the precache. */
function navigate(event, request) {
  const shell = () => caches.match('/', { cacheName: PRECACHE });
  const network = fetch(request);
  event.waitUntil(network.catch(() => undefined));
  return new Promise((resolve) => {
    let settled = false;
    const done = (res) => {
      if (settled || !res) return;
      settled = true;
      resolve(res);
    };
    const timer = setTimeout(async () => done(await shell()), NETWORK_TIMEOUT_MS);
    network.then(
      async (res) => {
        clearTimeout(timer);
        // A proxy's 502/503 page is worse than the saved invitation.
        done(res.ok || res.status < 500 ? res : (await shell()) || res);
      },
      async () => {
        clearTimeout(timer);
        done((await shell()) || Response.error());
      },
    );
  });
}

async function precachedOrFetch(request) {
  const hit = await caches.match(request, { cacheName: PRECACHE });
  if (hit) return hit;
  const res = await fetch(request);
  const type = res.headers.get('content-type') || '';
  // The server answers unknown paths with the HTML shell; that must never be stored as a script or style.
  if (res.ok && !type.includes('text/html') && new URL(request.url).pathname.startsWith('/assets/')) {
    const cache = await caches.open(PRECACHE);
    await cache.put(request, res.clone());
  }
  return res;
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    await cache.put(request, res.clone());
    await trim(cache, max);
  }
  return res;
}

function staleWhileRevalidate(event, request, cacheName, max) {
  const refresh = caches.open(cacheName).then(async (cache) => {
    const hit = await cache.match(request);
    const network = fetch(request).then(async (res) => {
      // Fonts arrive as opaque (status 0) responses when linked without CORS; they are still usable from the cache.
      if (res.ok || res.type === 'opaque') {
        await cache.put(request, res.clone());
        await trim(cache, max);
      }
      return res;
    });
    event.waitUntil(network.catch(() => undefined));
    return hit || network;
  });
  return refresh;
}

/** Fetches photos ahead of time (a few at once), so the whole invitation is there offline, not just what was scrolled past. */
async function warmImages(urls) {
  const cache = await caches.open(IMAGE_CACHE);
  const wanted = [...new Set(urls)]
    .map((u) => new URL(u, self.location.origin))
    .filter((u) => u.origin === self.location.origin && u.pathname.startsWith('/uploads/') && IMAGE_FILE.test(u.pathname))
    .slice(0, 80);
  let next = 0;
  const worker = async () => {
    while (next < wanted.length) {
      const url = wanted[next++];
      try {
        if (await cache.match(url.href)) continue;
        const res = await fetch(url.href);
        if (res.ok) await cache.put(url.href, res);
      } catch {
        // Offline or flaky: the image is simply fetched when it is first shown.
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  await trim(cache, MAX_IMAGES);
}
