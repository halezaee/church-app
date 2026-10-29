// Simple shell cache. Bump VERSION whenever app files change so phones pick up the new build.
const VERSION = 'sibp-shell-v0.7.0';
const SHELL = ['./','./index.html','./manifest.webmanifest','./logo-sib.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./avatar-bible.png','./avatar-candle.png','./avatar-church.png','./avatar-cross.png','./avatar-dove.png','./avatar-fish.png','./avatar-gong.png','./avatar-hands-cross.png','./avatar-hornbill.png','./avatar-kinabalu.png','./avatar-praying-hands.png','./avatar-rafflesia.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // CDN (SheetJS): cache after first use so export works offline later
    if (url.hostname === 'cdn.sheetjs.com') e.respondWith(caches.open(VERSION).then(async c => (await c.match(req)) || fetch(req).then(r => (c.put(req, r.clone()), r))));
    return; // later: never cache Supabase API calls
  }
  if (req.mode === 'navigate') {
    // network first for the page, fall back to cached shell when offline
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // stale-while-revalidate for shell files
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
