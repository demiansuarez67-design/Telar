// Telar: funcionamiento sin conexión.
// Al publicar una versión nueva, cambiar VERSION (y APP_VERSION en index.html): la app avisa que hay una actualización.
const VERSION = '0.9.1';
const CACHE = 'telar-' + VERSION;
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './sample-project.js',
  './vendor/xlsx.full.min.js', './vendor/chart.umd.min.js', './vendor/mammoth.browser.min.js',
  './vendor/pdfjs/pdf.min.js', './vendor/pdfjs/pdf.worker.min.js',
  './fonts/ibm-plex-sans-latin-400-normal.woff2', './fonts/ibm-plex-sans-latin-500-normal.woff2', './fonts/ibm-plex-sans-latin-600-normal.woff2',
  './fonts/source-serif-4-latin-400-normal.woff2', './fonts/source-serif-4-latin-600-normal.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon.svg'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('telar-') && k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
// la app pide pasar a la versión nueva cuando la persona toca "Actualizar"
self.addEventListener('message', e=>{ if(e.data && e.data.type==='SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if(e.request.method!=='GET' || url.origin!==self.location.origin) return; // lo externo (CrossRef) va directo a la red
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(hit=>hit || fetch(e.request).then(res=>{
      if(res.ok && res.type==='basic'){ const copy = res.clone(); caches.open(CACHE).then(c=>c.put(e.request, copy)); }
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
