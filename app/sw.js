const CACHE_NAME = 'ghostchat-v7-any-to-any';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'core.js',
  'manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Network-first strategy: always get fresh English version from server
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('openrouter.ai') || e.request.url.includes('discord.com') || e.request.url.includes('ipify.org')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
