// Simple shell cache. Bump VERSION whenever app files change so phones pick up the new build.
const VERSION = 'sibp-shell-v1.1.2';
// CDN cache survives app updates (its URLs are pinned to versions); bump only if the pinned versions change.
const CDN_CACHE = 'sibp-cdn-v1';
// supabase-js 2.118.0 (same URL as js/api.js) and every module it imports — precached so the app can start offline.
const CDN_FILES = ['@supabase/supabase-js@2.118.0', '@supabase/auth-js@2.118.0', '@supabase/functions-js@2.118.0', '@supabase/postgrest-js@2.118.0',
  '@supabase/realtime-js@2.118.0', '@supabase/storage-js@2.118.0', '@supabase/phoenix@0.4.5', 'iceberg-js@0.8.1', 'tslib@2.8.1', '@simplewebauthn/browser@13.1.0']
  .map(p => `https://cdn.jsdelivr.net/npm/${p}/+esm`);
const SHELL = ['./','./index.html','./manifest.webmanifest','./logo-sib.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./avatar-bible.png','./avatar-candle.png','./avatar-church.png','./avatar-cross.png','./avatar-dove.png','./avatar-fish.png','./avatar-gong.png','./avatar-hands-cross.png','./avatar-hornbill.png','./avatar-kinabalu.png','./avatar-praying-hands.png','./avatar-rafflesia.png'];

self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(VERSION).then(c => c.addAll(SHELL)),
    caches.open(CDN_CACHE).then(c => Promise.all(CDN_FILES.map(u => c.match(u).then(hit => hit || c.add(u))))).catch(() => {}), // best effort
  ]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== CDN_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // Supabase (API, Auth, Storage, Edge Functions): NEVER cached — always live data.
    if (url.hostname.endsWith('.supabase.co')) return;
    // Pinned CDN files (supabase-js on jsDelivr, SheetJS): versioned URLs never change → cache-first, so the app also starts offline.
    if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'cdn.sheetjs.com') {
      e.respondWith(caches.open(CDN_CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
    }
    return;
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
