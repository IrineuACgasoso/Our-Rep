const CACHE = 'nosso-app-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/gifts.css',
  './css/restaurants.css',
  './css/travels.css',
  './sections/gifts.html',
  './sections/restaurants.html',
  './sections/travels.html',
  './js/app.js',
  './js/auth.js',
  './js/firebase.js',
  './js/gifts.js',
  './js/restaurants.js',
  './js/state.js',
  './js/travels.js',
  './js/utils.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || fetched.catch(() => cached);
    })
  );
});
