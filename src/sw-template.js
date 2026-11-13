/* Kingdom Ledger service worker (generated at build time from src/sw-template.js). */
const VERSION = __VERSION__;
const CACHE = "kingdom-ledger-" + VERSION;
const FONT_CACHE = "kingdom-ledger-fonts";
const PRECACHE = __PRECACHE__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts: cache on first use so the intro looks right offline.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          cache.put(req, res.clone());
          return res;
        } catch {
          return new Response("", { status: 504 });
        }
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // App pages: always answer from the cache so the app opens offline.
  if (req.mode === "navigate") {
    event.respondWith(caches.match("./", { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || fetch(req)));
    return;
  }

  event.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || fetch(req)));
});
