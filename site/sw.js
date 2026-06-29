// Service Worker for SPA caching
// Browser detects changes by comparing sw.js byte-for-byte.
// CACHE_VERSION: bump when cache format changes or to force purge.
var CACHE_VERSION = 3;
var CACHE_NAME = 'sy-subtitles-c' + CACHE_VERSION;

// Routing predicates (isImmutable / isApiOrRaw / isNavigation / pickStrategy) are
// single-sourced in js/sw_routing.js so the Node suite can unit-test every branch
// (tests/test_sw_routing.js). importScripts evaluates it in this worker's global
// scope, exposing the functions here; the module's CommonJS export is a no-op in
// the worker (no `module`). Path is relative to this script, so sw.js and js/ stay
// siblings on GitHub Pages (/sy-subtitles/) and locally alike.
//
// The ?v= cache-buster matters because updateViaCache defaults to 'imports':
// imported scripts may be served from the HTTP cache during an SW update, unlike
// the top-level sw.js. Tying the query to CACHE_VERSION means a version bump
// re-fetches fresh routing logic — so routing changes must bump CACHE_VERSION.
importScripts('js/sw_routing.js?v=' + CACHE_VERSION);

self.addEventListener('install', function(e) {
  // Skip waiting — activate immediately so new version takes effect
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  // Delete all caches except current version
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Strategy: network-first with cache fallback
function networkFirst(request) {
  return fetch(request).then(function(response) {
    if (response.ok) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(c) { c.put(request, clone); });
    }
    return response;
  }).catch(function() {
    return caches.match(request);
  });
}

// Strategy: cache-first with network fallback
function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(response) {
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(request, clone); });
      }
      return response;
    });
  });
}

self.addEventListener('fetch', function(e) {
  if (pickStrategy(e.request.url) === 'cache-first') {
    // CDN libs, icon, and sha-pinned ?v= content (SRT/transcripts): cache-first
    e.respondWith(cacheFirst(e.request));
  } else {
    // HTML shell + Trees API + meta.yaml + everything else: network-first
    e.respondWith(networkFirst(e.request));
  }
});
