// Telar: funcionamiento sin conexión.
// Al publicar una versión nueva, cambiar VERSION (y APP_VERSION en index.html): la app avisa que hay una actualización.
const VERSION = '0.14.7';
const CACHE = 'telar-' + VERSION;
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './sample-project.js', './novedades.json',
  './vendor/xlsx.full.min.js', './vendor/chart.umd.min.js',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './vendor/mapa/base.js', './vendor/mammoth.browser.min.js',
  './vendor/pdfjs/pdf.min.js', './vendor/pdfjs/pdf.worker.min.js',
  './fonts/ibm-plex-sans-latin-400-normal.woff2', './fonts/ibm-plex-sans-latin-500-normal.woff2', './fonts/ibm-plex-sans-latin-600-normal.woff2',
  './fonts/source-serif-4-latin-400-normal.woff2', './fonts/source-serif-4-latin-600-normal.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon.svg'
];
self.addEventListener('install', e=>{
  // cache:'reload' pide cada archivo al servidor, sin usar la copia temporal del navegador
  // (GitHub Pages permite guardarla 10 minutos y, si no, se guardaría la versión anterior)
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u, {cache:'reload'})))));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('telar-') && k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
// la app pide pasar a la versión nueva cuando la persona toca "Actualizar"
self.addEventListener('message', e=>{ if(e.data && e.data.type==='SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if(e.request.method!=='GET' || url.origin!==self.location.origin) return; // lo externo (CrossRef) va directo a la red
  // la página principal: primero internet (así se ve enseguida lo último que se publicó); sin conexión, la copia guardada
  // la página principal y la lista de novedades: primero internet; sin conexión, la copia guardada
  const isPage = e.request.mode==='navigate' || /\/(index\.html)?$/.test(url.pathname);
  if(/\/novedades\.json$/.test(url.pathname)){ e.respondWith(fetch(e.request, {cache:'no-store'}).catch(()=>caches.match('./novedades.json', {ignoreSearch:true}))); return; }
  if(isPage){
    e.respondWith(fetch(e.request, {cache:'no-cache'}).then(res=>{
      if(res.ok){ const copy = res.clone(); caches.open(CACHE).then(c=>c.put('./index.html', copy)); }
      return res;
    }).catch(()=>caches.match('./index.html').then(r=>r || caches.match('./'))));
    return;
  }
  // librerías, tipografías e íconos: la copia guardada (cambian solo con cada versión)
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(hit=>hit || fetch(e.request).then(res=>{
      if(res.ok && res.type==='basic'){ const copy = res.clone(); caches.open(CACHE).then(c=>c.put(e.request, copy)); }
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
