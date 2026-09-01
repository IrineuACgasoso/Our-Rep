// Service worker simplificado para o build do Vite.
//
// O sw.js original fazia precache de uma lista fixa de arquivos (css/base.css,
// sections/gifts.html, etc.) que só existiam no app antigo servido "cru". No build do Vite
// os assets (JS/CSS) saem com hash no nome (ex: index-a1b2c3.js) e mudam a cada build, então
// uma lista fixa quebraria (arquivos 404) ou ficaria desatualizada. Em vez disso, usamos uma
// estratégia simples: network-first com fallback pro cache, cacheando sob demanda o que for
// buscado. Isso preserva o essencial (funcionar offline depois da primeira visita) sem
// depender de uma lista de arquivos hardcoded.

const CACHE = 'nosso-app-v6';
// Teto de entradas no cache: sem isso, cada chamada de API (geocoding, proxy de OG, Firebase
// REST) vira uma entrada nova para sempre, e o cache do navegador cresce sem limite.
const MAX_ENTRIES = 80;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

async function trimCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_ENTRIES;
  if (excess > 0) {
    // Cache API não tem TTL nativo; como aproximação simples, descarta as entradas mais
    // antigas (FIFO) quando passa do teto, em vez de deixar crescer pra sempre.
    await Promise.all(keys.slice(0, excess).map((k) => cache.delete(k)));
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Só cacheamos o mesmo domínio (assets do próprio app). Chamadas a terceiros (Firebase,
  // Nominatim, allorigins, Google Auth) não passam por aqui — cachear resposta "opaque" de
  // cross-origin não dá controle sobre validade/tamanho e pode reter dados desatualizados
  // (ex.: coordenadas de geocoding, respostas de auth) sem necessidade real de funcionar
  // offline para elas.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // /__/auth/* é o redirect proxy do Firebase Auth (ver vercel.json) — nunca deve vir do
  // cache, ou o fluxo de login pode ficar preso numa resposta antiga.
  if (url.pathname.startsWith('/__/auth/')) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then(async (cache) => {
          await cache.put(event.request, copy);
          trimCache(cache);
        });
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
