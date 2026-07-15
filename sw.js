/* sw.js — Service Worker Finance Daily QRIS
 * Cache aset statis (app shell) biar bisa dibuka offline & terasa instan.
 * Data transaksi TIDAK di-cache (selalu ambil terbaru dari Supabase).
 */
const CACHE = 'fdq-v2';
const ASSETS = [
  './',
  './index.html',
  './dashboard.html',
  './transaction.html',
  './report.html',
  './settings.html',
  './css/style.css',
  './css/dashboard.css',
  './css/transaction.css',
  './css/report.css',
  './js/api.js',
  './js/store.js',
  './js/currency.js',
  './js/utils.js',
  './js/auth.js',
  './js/app.js',
  './js/dashboard.js',
  './js/transaction.js',
  './js/report.js',
  './js/settings.js',
  './assets/icon/icon-192.png',
  './assets/icon/icon-512.png',
  './manifest.json'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  const url = e.request.url;
  // Jangan cache panggilan Supabase / CDN eksternal — selalu network
  if(url.indexOf('supabase.co') > -1 || url.indexOf('cdn.jsdelivr') > -1 || url.indexOf('fonts.') > -1){
    return; // biarkan browser tangani (network)
  }
  // App shell: cache-first, fallback network
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(res){
        const copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy).catch(function(){}); });
        return res;
      }).catch(function(){ return cached; });
    })
  );
});
