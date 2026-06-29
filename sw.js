// DRL Musical Housie — Service Worker
// Bumping CACHE_VERSION forces all browsers to drop old caches on next visit.
const CACHE_VERSION = "v20260629";
const CACHE_NAME    = "drl-housie-" + CACHE_VERSION;

// On install: activate immediately (don't wait for old SW to die)
self.addEventListener("install", function (e) {
  self.skipWaiting();
});

// On activate: delete ALL old caches, then take control of open pages
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k)   { return caches.delete(k);  })
      );
    }).then(function () {
      return self.clients.claim(); // take over all open tabs immediately
    })
  );
});

// Fetch strategy:
//   - HTML / JS / CSS / JSON  → Network first, no caching (always fresh)
//   - Audio files             → Cache first (large files, rarely change)
//   - Album pictures          → Network first, short cache
//   - Everything else         → Network first
self.addEventListener("fetch", function (e) {
  const url = new URL(e.request.url);

  // Audio: cache-first (avoids re-downloading large mp3s)
  if (url.pathname.startsWith("/audio/")) {
    e.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(e.request).then(function (cached) {
          if (cached) return cached;
          return fetch(e.request).then(function (response) {
            if (response.ok) cache.put(e.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // Everything else: network first, no caching
  e.respondWith(
    fetch(e.request).catch(function () {
      // Offline fallback — serve cached copy if available
      return caches.match(e.request);
    })
  );
});
