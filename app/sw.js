const CACHE_NAME = 'ghostchat-v1';
const ASSETS = [
  'index.html',
  'style.css',
  'app.js',
  'core.js',
  'manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only cache local static assets, never API calls
  if (e.request.url.includes('openrouter.ai') || e.request.url.includes('discord.com')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request).catch(() => caches.match('index.html')))
  );
});
