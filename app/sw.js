const CACHE = 'dingodor-v39-notification-layout';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './bons-plans.css?v=1',
  './bons-plans.js?v=1',
  '../logo-maison.svg',
  '../mascotte.js?v=3-apparition',
  '../assets/avatars/dingo-pensif.webp',
  '../assets/avatars/dingo-bricole.webp',
  '../assets/avatars/dingo-surpris.webp',
  '../assets/avatars/dingo-camera.webp'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(path => new Request(path, {cache: 'reload'})))));
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
  const isDynamicData = url.pathname.endsWith('/webpushr.js') || url.hostname.endsWith('webpushr.com') || url.hostname === 'public-api.wordpress.com' ||
    url.hostname === 'raw.githubusercontent.com' ||
    url.pathname.endsWith('/data/site-data.json') ||
    url.pathname.endsWith('/data/published-posts.json') ||
    url.pathname.endsWith('/data/bons-plans.json');

  if (isDynamicData) {
    e.respondWith(fetch(e.request, {cache: 'no-store'}));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).then(res => {
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
