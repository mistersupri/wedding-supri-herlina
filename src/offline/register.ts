/**
 * Registers the service worker (production only) and reports when a new version is waiting.
 * A new version never takes over by itself: that could pull files out from under a page that is still open.
 * The guest taps "Muat ulang" and the page reloads on the new version.
 */
export function registerServiceWorker(onUpdateReady: (apply: () => void) => void) {
  if (!('serviceWorker' in navigator)) return;

  if (!import.meta.env.PROD) {
    // A worker left over from a production build would serve stale files to the dev server.
    navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => r.unregister())).catch(() => undefined);
    return;
  }

  let applying = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The first install also claims the page; only reload for an update the guest asked for.
    if (applying) window.location.reload();
  });

  const announce = (worker: ServiceWorker) =>
    onUpdateReady(() => {
      applying = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    });

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) announce(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) announce(worker);
          });
        });
        // Long-lived tabs and installed apps check for a new version when they come back to the foreground.
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && registration.update().catch(() => undefined));
      })
      .catch(() => undefined);
  };
  // React mounts after the page has often finished loading, so the load event cannot be relied on.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/** Photos to fetch ahead of time so the whole invitation, not only what was scrolled past, is there offline. */
export function warmImages(urls: Array<string | null | undefined>) {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (!('serviceWorker' in navigator) || nav.connection?.saveData) return;
  const list = urls.filter((u): u is string => typeof u === 'string' && u.startsWith('/uploads/'));
  if (!list.length) return;
  const send = () => navigator.serviceWorker.ready.then((r) => r.active?.postMessage({ type: 'CACHE_IMAGES', urls: list })).catch(() => undefined);
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => void send());
  else setTimeout(send, 2000);
}
