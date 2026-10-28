// Service Worker: macht die App offline nutzbar.
// Eigene Dateien: erst aus dem Speicher, im Hintergrund aktualisieren.
// pdf.js (nur fürs Belege-Auslesen) wird beim ersten Laden mitgespeichert.
const CACHE = 'rentensteuer-ef91339971';
const DATEIEN = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png", "fonts/manrope-latin.woff2", "fonts/manrope-latin-ext.woff2", "vendor/jspdf.umd.min.js", "vendor/jspdf.plugin.autotable.min.js"];
const FREMD = ['cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('rentensteuer-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const eigen = url.origin === self.location.origin;
  if (!eigen && !FREMD.includes(url.hostname)) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const treffer = await cache.match(req, { ignoreSearch: eigen });
      const netz = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (treffer) { e.waitUntil(netz); return treffer; }
      const res = await netz;
      if (res) return res;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    })
  );
});
