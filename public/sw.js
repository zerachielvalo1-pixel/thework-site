/* The Work - service worker
 *
 * Two jobs: let the site open and be read offline, and satisfy the one
 * remaining condition Chrome puts on its automatic install prompt (the site
 * must have a fetch handler - Chrome 108+/112+ dropped that requirement for
 * *menu* installs, but the prompt itself still needs it).
 *
 * Caching rules, and why:
 *
 *   navigations            network-first, cache fallback.
 *                          A news homepage must never be served stale, but a
 *                          cached shell beats the browser's offline error page.
 *
 *   same-origin assets     cache-first.
 *                          app.js?v=10 / styles.css?v=5 carry a manual version
 *                          in the query string, so the URL changes whenever the
 *                          file does. That makes cache-first safe here.
 *
 *   Storage images         cache-first.
 *                          Filenames are upload timestamps and never rewritten,
 *                          so a cached copy can never be wrong.
 *
 *   Supabase /rest/v1/*    NOT intercepted - passes straight through.
 *                          Deliberate: this origin also serves the admin panel,
 *                          and a cached API response could show an editor stale
 *                          rows, or replay one user's data to the next. The app
 *                          already renders its own offline state without help.
 *
 * Bump CACHE_VERSION on a deploy that changes the precache list.
 */

const CACHE_VERSION = 'tw-v2';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

/* Deliberately small, and version-free. styles.css and app.js are NOT listed
   because their ?v= changes on every deploy; they get cached at runtime on
   first fetch instead, which keeps this file from needing an edit each time. */
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-tw-128.webp',
  '/logo-tw-64.webp'
];

const STORAGE_HOST = 'fgojhhgqpvnwtcqkornz.supabase.co';
const STORAGE_PATH = '/storage/v1/';
const API_PATH = '/rest/v1/';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Individually, so one missing file cannot abort the whole install.
    await Promise.all(PRECACHE.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

function isStorageImage(url) {
  return url.hostname === STORAGE_HOST && url.pathname.startsWith(STORAGE_PATH);
}

function isApi(url) {
  return url.hostname === STORAGE_HOST && url.pathname.startsWith(API_PATH);
}

function isStaticAsset(url) {
  return /\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|webmanifest)$/i.test(url.pathname);
}

/* Cache-first: answer from cache, otherwise fetch and store a copy.
 *
 * `cors` re-issues the request in CORS mode. That matters for the Storage
 * images: an <img src> is a no-cors request, so the response comes back opaque
 * - type "opaque", status 0, body unreadable. An opaque response can be stored,
 * but nothing about it can be checked, which means a 404 or an error page would
 * be cached and then served as a broken image until the cache version changed.
 * Storage answers with Access-Control-Allow-Origin: *, so asking in CORS mode
 * yields a real status code and a body we can verify. If the CORS fetch is
 * refused we fall back to the plain request rather than failing outright. */
async function cacheFirst(request, cacheName, { cors = false } = {}) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  let response;
  if (cors) {
    try {
      response = await fetch(new Request(request.url, { mode: 'cors', credentials: 'omit' }));
    } catch (err) {
      response = await fetch(request);
    }
  } else {
    response = await fetch(request);
  }

  // Opaque responses carry no status and no readable body, so they are only
  // stored when nothing better is available, and never for same-origin assets.
  const storable = cors
    ? response.ok
    : (response.ok && response.type !== 'opaque');
  if (storable) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

/* Network-first: fresh when possible, cache when the network fails. */
async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  // Never touch the API - see the note at the top of this file.
  if (isApi(url)) return;

  // Storage images are immutable.
  if (isStorageImage(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, { cors: true }));
    return;
  }

  // Anything else off-origin (Supabase JS, fonts, Umami) is left alone.
  if (url.origin !== self.location.origin) return;

  // Page loads: fresh HTML, cached shell as the offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE, '/'));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});
