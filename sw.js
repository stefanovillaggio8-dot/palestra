// sw.js -- service worker.
// Pre-carica tutto quello che serve, cosi' la seconda volta l'app parte
// anche senza rete. I dati NON stanno qui: stanno in IndexedDB, quindi
// cancellare la cache non cancella niente del tuo allenamento.

// Il numero di versione sta anche in index.html (window.PALESTRA_VERSIONE), perche'
// e' quello che l'app mostra e quello con cui si controlla che il sito sia davvero
// aggiornato. Sono due numeri in due file: il test I2 controlla che dicano lo stesso
// e il test I3 che sia quello dell'ultimo commit, altrimenti si alza la cache e si
// lascia scritto il numero vecchio. E' successo due volte: nella v54 avevo alzato
// solo questo file, e dopo la v55 avevo smesso di alzarlo del tutto.
const VERSIONE = 'palestra-v89';

const FILE = [
  './',
  './index.html',
  // IL FOGLIO DI STILE HA LA VERSIONE, come il collegamento in index.html.
  //
  // Ste (10/10/2026): "le animazioni non le vedo". Il CSS era online e aggiornato,
  // ma la cache del browser continuava a restituire il vecchio perche' l'indirizzo
  // era sempre lo stesso. Con `?v=84` anche qui la chiave cambia a ogni versione,
  // quindi la cache vecchia non viene più richiesta.
  //
  // Il numero deve essere uguale a quello di `stile.css?v=` in index.html e a
  // `window.PALESTRA_VERSIONE`: se i tre non coincidono, l'app carica un foglio di
  // stile e dice un altro numero.
  './stile.css?v=89',
'./manifest.webmanifest',
  './manifest-p1.webmanifest',
  './manifest-p2.webmanifest',
  // il manifest di chi si registra col link (?n=nome&k=chiave): senza, l'app
  // installata di un amico prenderebbe quello di Ste, con lo stesso id e con
  // start_url che punta a ?p=1
  './manifest-nuovo.webmanifest',
  './src/app.js',
  './src/numeri.js',
  './src/confronto.js',
  './src/confronto-mensile.js',
  './src/esercizi-classificatore.js',
  './src/esercizi-personali.js',
  './src/muscoli-parti.js',
  './src/scala-esercizi.js',
  './src/forza-generale.js',
  './src/scala-auto.js',
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
  './src/update-via-sw.js',
  './src/rank-config.js',
  './src/rank.js',
'./src/streak.js',
  // i suoni. Sta qui perché senza questo file nella cache l'app è MUTA quando non
  // c'è rete: non parte nessun errore, semplicemente non si sente niente, ed è il
  // modo peggiore in cui può rompersi una cosa che dovrebbe funzionare sempre.
  './src/audio.js',
  // il glossario. Come i suoni, se non sta nella cache l'app non parte senza rete,
  // e questa volta la cosa che manca è una pagina di spiegazioni: si apre e non
  // c'è, e sembra che l'app sia rotta.
  './src/glossario-app.js',
  './src/missioni.js',
  './src/aura.js',
  './src/sociale.js',
  './src/avatar.js',
  './src/gioco.js',
  './src/grafici.js',
  './src/peso-corporeo.js',
  './src/avviso-peso.js',
  './src/rank.js',
  './src/rank-config.js',
  // l'avatar RPG (08/10/2026). Senza questa riga l'app funziona online ma si rompe
  // offline: il file non e' in cache, e il Profilo non si disegna. Il test di
  // integrita' controlla che ogni file che app.js importa sia qui dentro.
  './src/avatar-rpg.js',
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
  './img/esercizi/incline-single-arm-pulldown.png',
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

// Ste chiede la versione nuova: prendo subito, senza aspettare che tutte le
// schede del browser si chiudano. Dopo aver preso tutto, ricarico la pagina una
// volta sola cosi l'app passa davvero alla versione nuova.
self.addEventListener('message', (evento) => {
  const tipo = evento && evento.data && evento.data.tipo;
  if (tipo === 'aggiorna-subito') {
    evento.waitUntil(
      self.skipWaiting().then(() => self.clients.matchAll()).then((clienti) => {
        for (const c of clienti) {
          try { c.postMessage({ tipo: 'aggiornata', versione: VERSIONE }); } catch { /* pazienza */ }
        }
      }),
    );
  }
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
