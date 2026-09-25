const CACHE = 'dingodor-v18-site';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './index.html'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('dingodor-v') && k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isDynamicData = url.hostname === 'public-api.wordpress.com' ||
    url.hostname === 'raw.githubusercontent.com' ||
    url.pathname.endsWith('/data/site-data.json');

  if (isDynamicData) {
    e.respondWith(fetch(e.request, {cache: 'no-store'}));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const resClone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, resClone));
        return res;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
