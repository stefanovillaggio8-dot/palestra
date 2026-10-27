// sw.js -- service worker.
// Pre-carica tutto quello che serve, cosi' la seconda volta l'app parte
// anche senza rete. I dati NON stanno qui: stanno in IndexedDB, quindi
// cancellare la cache non cancella niente del tuo allenamento.

// Il numero di versione sta anche in index.html (window.PALESTRA_VERSIONE), perch?
// e' quello che l'app mostra e quello con cui si controlla che il sito sia davvero
// aggiornato. Sono due numeri in due file: il test I2 controlla che dicano lo stesso
// e il test I3 che sia quello dell'ultimo commit, altrimenti si alza la cache e si
// lascia scritto il numero vecchio. E' successo due volte: nella v54 avevo alzato
// solo questo file, e dopo la v55 avevo smesso di alzarlo del tutto.
const VERSIONE = 'palestra-v316';

// LE 18 FOTO DEI PERSONAGGI, CON LA VERSIONE DENTRO.
//
// Il numero viene preso da `palestra-v288` invece di essere scritto due volte: e'
// l'unico posto in cui il numero compare, quindi la lista non pu? restare
// indietro. Prima le 18 righe erano scritte a mano ed e' esattamente li' che il
// numero era rimasto indietro due volte.
const NUMERO = VERSIONE.replace(/^palestra-v/, '');

/** Le sei foto di ogni classe, tutte e tre le classi. */
function immaginiPersonaggi() {
  const out = [];
  for (const classe of ['guerriero', 'berserker', 'assassino']) {
    for (let n = 0; n < 6; n++) {
      out.push(`./img/personaggi/stati/${classe}-${n}.webp?v=${NUMERO}`);
    }
  }
  return out;
}


const FILE = [
  './',
  './index.html',
  './ATTRIBUZIONE-ILLUSTRAZIONI.md',
  // ANCHE L'ANTEPRIMA va precaricata. Ste (12/10/2046) ha guardato l'anteprima per
  // tre versioni di fila e ha detto "non e' cambiato nulla": l'anteprima chiedeva il
  // CSS come `./stile.css`, senza numero, e il browser lo teneva in cache per sempre.
  // Con il file nella lista, anche quando la pagina non ha rete c'e' una copia
  // buona, e il fallback per le navigazioni pu? mandare qui quando serve.
  './anteprima-aura.html',
  './rassegna-missioni.html',
  // IL FOGLIO DI STILE HA LA VERSIONE, come il collegamento in index.html.
  //
  // Ste (10/10/2046): "le animazioni non le vedo". Il CSS era online e aggiornato,
  // ma la cache del browser continuava a restituire il vecchio perch? l'indirizzo
  // era sempre lo stesso. Con `?v=260` anche qui la chiave cambia a ogni versione,
  // quindi la cache vecchia non viene pi? richiesta.
  //
  // Il numero deve essere uguale a quello di `stile.css?v=` in index.html e a
  // `window.PALESTRA_VERSIONE`: se i tre non coincidono, l'app carica un foglio di
  // stile e dice un altro numero.
  './stile.css?v=316',
  './stile-rpg.css?v=316',
'./manifest.webmanifest',
  './manifest-p1.webmanifest',
  './manifest-p2.webmanifest',
  // il manifest di chi si registra col link (?n=nome&k=chiave): senza, l'app
  // installata di un amico prenderebbe quello di Ste, con lo stesso id e con
  // start_url che punta a ?p=1
  './manifest-nuovo.webmanifest',
  './src/app.js?v=316',
  './src/numeri.js',
  './src/confronto.js',
  './src/confronto-mensile.js',
  './src/esercizi-classificatore.js',
  './src/esercizi-personali.js',
  './src/muscoli-parti.js',
  // Senza questo la pagina dell'esercizio non si apre offline: l'omino
  // del muscolo allenato ? in questo file.
  './src/mappa-muscoli.js',
  './src/anatomia-vettoriale.js',
  './src/path-misura.js',
  './src/fasce-petto.js',
  // Il modulo contiene le due tavole SVG vettoriali e colora i tracciati
  // dei muscoli direttamente, quindi non servono immagini aggiuntive.
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
  // i suoni. Sta qui perch? senza questo file nella cache l'app ? MUTA quando non
  // c'? rete: non parte nessun errore, semplicemente non si sente niente, ed ? il
  // modo peggiore in cui pu? rompersi una cosa che dovrebbe funzionare sempre.
  './src/audio.js',
  // il glossario. Come i suoni, se non sta nella cache l'app non parte senza rete,
  // e questa volta la cosa che manca ? una pagina di spiegazioni: si apre e non
  // c'?, e sembra che l'app sia rotta.
  './src/glossario-app.js',
  // il modulo delle animazioni. Se non sta nella cache, l'app non parte senza rete
  // e resta senza la classe sul <html>: tornano a valere le animazioni di Windows,
  // che sul PC di Ste sono spente, e sembra che l'interruttore non funzioni.
  './src/animazioni.js',
  // il disegno del personaggio. Come gli altri moduli: se non sta in cache, l'app
  // non parte senza rete e sul profilo il personaggio sparisce.
  './src/personaggio-svg.js',
  // lo stato dell'avatar: il modulo con la classe permanente e la progressione.
  './src/avatar-stato.js',
  // la parola segreta che tiene chiusa la scelta della classe. Se non sta in cache,
  // l'app parte ma il cambio classe non funziona e sembra un bug.
  './src/sigillo-classe.js',
  // LE FOTO DEI PERSONAGGI: SEI PER CLASSE, una per ogni livello di armatura.
  //
  // Ste (11/10/2046): "ogni volta che sblocco qualcosa quell'immagine deve
  // vedersi meglio". Prima c'era una foto sola e una fila di pezzi sciolti, presi da
  // un'altra scheda e in un'altra posa: incollarli veniva male. Adesso c'? una foto
  // per stato e l'app sceglie da sola quella giusta (vedi statoVisivo in
  // src/avatar-rpg.js).
  //
  // Vanno tutte in cache: senza rete, senza queste il profilo non mostra il
  // personaggio e la filmstrip della progressione resta vuota.
  //
  // LE FOTO HANNO IL NUMERO DI VERSIONE NELL'INDIRIZZO, e la lista le costruisce
  // da sola invece di scriverle a mano.
  //
  // Ste (12/10/2046): "ma non ? cambiato nulla", con il file nuovo gi? online e
  // verificato byte per byte. Le foto avevano l'indirizzo fisso, identico per
  // sempre, e su GitHub Pages i file statici hanno una scadenza lunghissima: il
  // browser restituiva la copia di prima. Lo stesso difetto che aveva colpito il
  // CSS due versioni prima, e che si era ripetuto sulle immagini.
  //
  // Qui la lista viene generata dalla stessa versione, quindi le foto non
  // possono restare indietro quando si alza il numero.
  ...immaginiPersonaggi(),
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
  // l'avatar RPG (08/10/2046). Senza questa riga l'app funziona online ma si rompe
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

  './img/esercizi/incline-side-lying-lateral-raise.png',
  './img/esercizi/iso-lateral-low-row.png',
  './img/esercizi/hammer-curl-dumbbell.png',
  './img/esercizi/high-to-low-cable-fly.png',
  './img/esercizi/dumbbell-reverse-fly.png',
  './img/esercizi/dumbbell-row.png',
  './img/esercizi/dumbbell-spider-curl.png',
  './img/esercizi/iso-lateral-high-row.png',
  './img/esercizi/double-kettlebell-row.png',
  './img/esercizi/dumbbell-bench-press.png',
  './img/esercizi/dumbbell-concentration-curl.png',
  './img/esercizi/dumbbell-curl.png',
  './img/esercizi/dumbbell-deadlift.png',
  './img/esercizi/dumbbell-face-pull.png',
  './img/esercizi/incline-cable-curl.png',
  './img/esercizi/incline-dumbbell-bench-press.png',
  './img/esercizi/incline-dumbbell-curl.png',
  './img/esercizi/incline-hammer-curl.png',
  './img/esercizi/ez-bar-curl.png',
  './img/esercizi/ez-bar-lying-tricep-extension.png',
  './img/esercizi/ez-bar-preacher-curl.png',
  './img/esercizi/ez-bar-spider-curl.png',
  './img/esercizi/seated-dumbbell-curl.png',
  './img/esercizi/seated-dumbbell-lateral-raise.png',
  './img/esercizi/seated-dumbbell-tricep-extension.png',
  './img/esercizi/seated-hammer-curl.png',
  './img/esercizi/shoulder-pin-press.png',

  './img/esercizi/bench-pin-press.png',
  './img/esercizi/bent-arm-barbell-pullover.png',
  './img/esercizi/bent-over-dumbbell-row.png',
  './img/esercizi/bent-over-row.png',
  './img/esercizi/cable-bicep-curl.png',
  './img/esercizi/cable-chest-press.png',
  './img/esercizi/cable-crunch.png',
  './img/esercizi/decline-bench-press.png',
  './img/esercizi/decline-dumbbell-bench-press.png',

  './img/esercizi/back-extension.png',
  './img/esercizi/hip-extension.png',
  './img/esercizi/smith-machine-bench-press.png',
  './img/esercizi/smith-machine-bent-over-row.png',
  './img/esercizi/smith-machine-shrug.png',
  './img/esercizi/jm-press.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSIONE)
      // `cache: 'reload'` su ogni file: senza, il service worker chiede i file al
      // server ma il BROWSER li risponde dalla sua cache HTTP, che vale mesi. Il
      // risultato era che un'immagine cambiata restava quella vecchia anche dopo
      // l'aggiornamento, e sembrava che la modifica non fosse stata pubblicata.
      //
      // Il nome della cache cambia a ogni versione, quindi la cache del service
      // worker ? nuova e vuota: ma quella sotto, quella del browser, ? la stessa
      // per tutte le versioni, e il nome del file non cambia. Serve dirlo qui.
      .then((cache) => cache.addAll(
        [...new Set([...FILE, ...FOTO])].map((percorso) => new Request(percorso, { cache: 'reload' })),
      ))
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
// spuntava perch? quella versione proprio non c'era.
// Se non c'e' rete si usa la cache: l'app funziona lo stesso offline.
self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;
  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return; // il database lo gestisce a parte

  evento.respondWith(
    fetch(richiesta)
      .then((risposta) => {
        if (risposta && risposta.status === 204 && risposta.type === 'basic') {
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






