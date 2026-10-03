// sw.js -- service worker.
// Pre-carica tutto quello che serve, cosi' la seconda volta l'app parte
// anche senza rete. I dati NON stanno qui: stanno in IndexedDB, quindi
// cancellare la cache non cancella niente del tuo allenamento.

const VERSIONE = 'palestra-v19';

const FILE = [
  './',
  './index.html',
  './stile.css',
  './manifest.webmanifest',
  './manifest-p1.webmanifest',
  './manifest-p2.webmanifest',
  './src/app.js',
  './src/numeri.js',
  './src/confronto.js',
  './src/progressi.js',
  './src/sincronizzazione.js',
  './src/backup.js',
  './src/dati-iniziali.js',
  './src/sedute.js',
  './src/aggiornamento.js',
  './src/db.js',
  './src/supabase.js',
  './src/sync.js',
  './src/ui.js',
  './src/grafici.js',
  './img/logo.png',
  './img/logo-512.png',
];

const FOTO = [
  './img/esercizi/chest-press.png',
  './img/esercizi/cable-hammer-curl.png',
  './img/esercizi/cable-lateral-raise.png',
  './img/esercizi/cable-overhead-tricep-extension.png',
  './img/esercizi/leg-extension.png',
  './img/esercizi/neutral-grip-lat-pulldown.png',
  './img/esercizi/dumbbell-bench-pull.png',
  './img/esercizi/seated-dumbbell-shoulder-press.png',
  './img/esercizi/cable-fly.png',
  './img/esercizi/scott-bench-curl.png',
  './img/esercizi/single-arm-tricep-pushdown.png',
  './img/esercizi/seated-leg-curl.png',
  './img/esercizi/smith-machine-incline-bench-press.png',
  './img/esercizi/seated-cable-row.png',
  './img/esercizi/chest-supported-dumbbell-shrug.png',
  './img/esercizi/sled-press-calf-raise.png',
  './img/esercizi/single-leg-press.png',
  './img/esercizi/one-arm-dumbbell-preacher-curl.png',
  './img/esercizi/bodyweight-overhead-tricep-ext.png',
  './img/esercizi/one-arm-cable-reverse-fly.png',
  './img/esercizi/pull-ups.png',
  './img/esercizi/dips.png',
  './img/esercizi/wrist-curl.png',
  './img/esercizi/iso-lateral-row.png',
  './img/esercizi/lat-pulldown-lats.png',
  './img/esercizi/db-lateral-raise.png',
  './img/esercizi/lying-cable-curl.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSIONE)
      .then((cache) => cache.addAll([...FILE, ...FOTO]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll())
      .then((clienti) => {
        for (const c of clienti) {
          try { c.postMessage({ tipo: 'aggiornata', versione: VERSIONE }); } catch { /* pazienza */ }
        }
      }),
  );
});

// PRIMA LA RETE, poi la cache.
// Prima facevo il contrario (prima la cache) e il telefono continuava a usare
// i file vecchi anche dopo che avevo pubblicato quelli nuovi: la spunta non
// spuntava perche' quella versione proprio non c'era.
// Se non c'e' rete si usa la cache: l'app funziona lo stesso offline.
self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;
  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return; // il database lo gestisce a parte

  evento.respondWith(
    fetch(richiesta)
      .then((risposta) => {
        if (risposta && risposta.status === 200 && risposta.type === 'basic') {
          const copia = risposta.clone();
          caches.open(VERSIONE).then((c) => c.put(richiesta, copia));
        }
        return risposta;
      })
      .catch(async () => {
        const inCache = await caches.match(richiesta);
        if (inCache) return inCache;
        if (richiesta.mode === 'navigate') return caches.match('./index.html');
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }),
  );
});
