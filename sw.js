const CACHE = 'evolink-shell-v7';
const FILES = ['/', '/index.html', '/style.css', '/app.js', '/landscape.svg', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method!=='GET' || new URL(request.url).pathname.startsWith('/api/')) return;
  event.respondWith(fetch(request).then(resp => {
    if(resp.ok && new URL(request.url).origin===self.location.origin) {
      const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));
    }
    return resp;
  }).catch(()=>caches.match(request)));
});

