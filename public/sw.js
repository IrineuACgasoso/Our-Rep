// Service worker simplificado para o build do Vite.
//
// O sw.js original fazia precache de uma lista fixa de arquivos (css/base.css,
// sections/gifts.html, etc.) que só existiam no app antigo servido "cru". No build do Vite
// os assets (JS/CSS) saem com hash no nome (ex: index-a1b2c3.js) e mudam a cada build, então
// uma lista fixa quebraria (arquivos 404) ou ficaria desatualizada. Em vez disso, usamos uma
// estratégia simples: network-first com fallback pro cache, cacheando sob demanda o que for
// buscado. Isso preserva o essencial (funcionar offline depois da primeira visita) sem
// depender de uma lista de arquivos hardcoded.

const CACHE = 'nosso-app-v5';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
