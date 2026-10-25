// sw.js -- service worker.
// Pre-carica tutto quello che serve, cosi' la seconda volta l'app parte
// anche senza rete. I dati NON stanno qui: stanno in IndexedDB, quindi
// cancellare la cache non cancella niente del tuo allenamento.

const VERSIONE = 'palestra-v2';

const FILE = [
  './',
  './index.html',
  './stile.css',
  './manifest.webmanifest',
  './src/app.js',
  './src/numeri.js',
  './src/confronto.js',
  './src/progressi.js',
  './src/sincronizzazione.js',
  './src/backup.js',
  './src/dati-iniziali.js',
  './src/db.js',
  './src/supabase.js',
  './src/sync.js',
  './src/ui.js',
  './src/grafici.js',
  './img/logo.png',
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
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;
  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return; // il database lo gestisce chiama per chiamata

  evento.respondWith(
    caches.match(richiesta).then((inCache) => {
      // prima la cache (cosi' parte subito anche offline), poi si aggiorna in fondo
      const dallaRete = fetch(richiesta)
        .then((risposta) => {
          if (risposta && risposta.status === 200) {
            const copia = risposta.clone();
            caches.open(VERSIONE).then((c) => c.put(richiesta, copia));
          }
          return risposta;
        })
        .catch(() => inCache || caches.match('./index.html'));
      return inCache || dallaRete;
    }),
  );
});
