// cache-e-streak.test.js -- i due difetti del 10/10/2026.
//
// Ste: "la streak è accesa ma è a 0. quando è accesa lasciala gialla" e
// "comunque le animazioni non le vedo".
//
// Il primo era una riga di logica che non poteva mai essere falsa. Il secondo non
// era un difetto delle animazioni: erano tutte online, aggiornate e corrette. Il
// difetto era che il telefono non le mostrava, perché il foglio di stile si chiamava
// sempre "stile.css" e la cache del browser glielo restituiva vecchio per mesi.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const sw = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
const srcStreak = await readFile(new URL('../src/streak.js', import.meta.url), 'utf8');

const { aspettoStreak, calcolaStreak } = await import('../src/streak.js');

// ---- LA STREAK ACCESA A ZERO ----

test('S1. la streak non può essere "accesa" con il contatore a zero', () => {
  // IL DIFETTO. C'era scritto:
  //
  //   const viva = consecutive > 0 || (fattoOggi && consecutive >= 0);
  //
  // e `consecutive >= 0` è SEMPRE vero, perché un numero non può essere minore di
  // zero. Quindi la condizione diventava solo `|| fattoOggi`: se avevi allenato
  // oggi, la streak era "viva" anche con il conteggio a zero. La card diceva accesa e
  // dentro c'era 0, e il colore veniva dal livello zero, che è il GRIGIO della
  // spenta. Tre informazioni che si contraddicevano nella stessa riga.
  // La frase compare anche nel COMMENTO che spiega il difetto, quindi non basta
  // cercarla: conta che l'assegnazione sia quella giusta, senza nessuna scorciatoia
  // che possa risalire a `fattoOggi`.
  const assegnazione = /const viva = ([^;]+);/.exec(srcStreak);
  assert.ok(assegnazione, 'deve esserci l\'assegnazione di `viva`');
  assert.equal(assegnazione[1].trim(), 'consecutive > 0',
    `la streak è viva se conta almeno un giorno e basta: ora c'è "${assegnazione[1].trim()}"`);
  assert.equal(assegnazione[1].includes('fattoOggi'), false,
    'la clausola con `fattoOggi` era la causa: rendeva vera la condizione anche a zero');

  // e adesso il numero e lo stato non possono contraddirsi
  const oggi = new Date();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const sedute = [{ id: 'a', data: iso(oggi), stato: 'completata' }];
  const r = calcolaStreak(sedute, iso(oggi), { giorni_allenamento: [oggi.getDay()] });
  assert.ok(!(r.attiva && r.giorni === 0),
    `non può succedere "accesa con 0": è tornato giorni=${r.giorni} attiva=${r.attiva}`);

  // e senza sedute la streak è spenta, non accesa a zero
  const vuota = calcolaStreak([], iso(oggi), { giorni_allenamento: [oggi.getDay()] });
  assert.equal(vuota.attiva, false);
  assert.equal(vuota.giorni, 0);
});

// ---- I COLORI ----

test('S2. tutto quello che è acceso è GIALLO, il grigio è solo la spenta', () => {
  // Ste: "quando è accesa lasciala gialla" e, del caso in cui deve ancora allenare,
  // "non che spunta grigia come se l'avessi persa".
  //
  // Prima il colore veniva dal livello, e a livello zero quel colore è il grigio
  // della spenta: quindi "accesa" poteva uscire grigia. E "da accendere" era
  // arancione, che è il colore di un avviso, non di una streak che aspetta.
  const dow = new Date().getDay();

  const acceso = aspettoStreak({ giorni: 3, attiva: true, fattoOggi: true, giorniPrevisti: [dow] });
  const attesa = aspettoStreak({ giorni: 0, attiva: false, fattoOggi: false, giorniPrevisti: [dow] });
  const spenta = aspettoStreak({ giorni: 0, attiva: false, fattoOggi: false, giorniPrevisti: [(dow + 1) % 7] });

  // giallo = molto rosso, verde alto, poco blu. La soglia del verde è su 160 e non
  // su 180 perché il giallo "in attesa" è volutamente un po' più spento di quello
  // acceso: se i due fossero identici non si capirebbe quale dei due è quale.
  const giallo = (c) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(String(c).slice(i, i + 2), 16));
    return r > 200 && g > 160 && b < 120;
  };

  assert.ok(giallo(acceso.colore), `la streak accesa deve essere gialla, è ${acceso.colore}`);
  assert.ok(giallo(attesa.colore), `quella in attesa è gialla anche lei, è ${attesa.colore}`);
  assert.equal(spenta.colore.toLowerCase(), '#4a4a55',
    'e il grigio è solo della spenta: deve voler dire una cosa sola, "l\'hai persa"');

  // tre colori diversi, tre stati diversi
  const colori = new Set([acceso.colore, attesa.colore, spenta.colore]);
  assert.equal(colori.size, 3, 'i tre stati non possono confondersi a colpo d\'occhio');

  // e l'accessa non prende più il colore dal livello: era quello il buco
  const accesoDaZero = aspettoStreak({ giorni: 0, attiva: true, fattoOggi: true, giorniPrevisti: [dow] });
  assert.ok(giallo(accesoDaZero.colore),
    `anche se il contatore è 0, se è accesa resta gialla: era ${accesoDaZero.colore}`);
});

// ---- LA CACHE DEL FOGLIO DI STILE ----

test('C1. il foglio di stile ha la versione nell\'indirizzo', () => {
  // Ste: "comunque le animazioni non le vedo".
  //
  // Il CSS era online e aggiornato: "dialogo-entra", "avviso-entra" e "numero-pulse"
  // c'erano tutti, verificati con una richiesta al sito. Ma il collegamento era
  // `<link href="stile.css">`, senza niente che cambiasse, e il browser tiene quel
  // file in cache per mesi. Quindi le animazioni esistevano per chi apriva la pagina
  // per la prima volta e non per chi le aveva già aperte: cioè non per Ste.
  //
  // Con `?v=85` l'indirizzo cambia a ogni versione e la cache non può più restituire
  // il file vecchio.
  const collegamento = /<link rel="stylesheet" href="\.\/stile\.css\?v=(\d+)"/.exec(indexHtml);
  assert.ok(collegamento, 'il foglio di stile deve avere la versione nell\'indirizzo');
  assert.match(indexHtml, /window\.PALESTRA_VERSIONE = '(\d+)'/,
    'e la versione deve essere dichiarata nella pagina');
  assert.equal(collegamento[1], /PALESTRA_VERSIONE = '(\d+)'/.exec(indexHtml)[1],
    'la versione del collegamento e quella della pagina devono essere la stessa: '
    + 'se non lo sono, la pagina disegna con un foglio e si dichiara un\'altra versione');
});

test('C2. anche il service worker mette in cache il foglio con la versione', () => {
  // Lo stesso discorso per la cache dell'app installata: se il nome è `./stile.css`
  // senza versione, l'app installata continua a usare il file vecchio anche dopo
  // che la cache è stata alzata, perché la chiave è la stessa.
  const precaricato = /'\.\/stile\.css\?v=(\d+)'/.exec(sw);
  assert.ok(precaricato, 'il service worker deve precaricare il foglio con la versione');
  const versioneCache = /const VERSIONE = 'palestra-v(\d+)'/.exec(sw);
  assert.ok(versioneCache, 'e la cache deve avere un numero di versione');
  assert.equal(precaricato[1], versioneCache[1],
    'il numero nel collegamento e quello della cache devono coincidere');
  // e non deve più esserci la copia senza versione, che starebbe lì a fare concorrenza
  assert.equal(/'\.\/stile\.css'/.test(sw), false,
    'non deve restare la voce vecchia senza versione: quale delle due viene servita '
    + 'è una lotta a chi indovina');
});

test('C3. le animazioni ci sono davvero, tutte', async () => {
  // La verifica finale: se le animazioni sparissero di nuovo dal CSS, il test
  // qui sotto diventa rosso prima che Ste debba accorgersene a mano.
  const css = await readFile(new URL('../stile.css', import.meta.url), 'utf8');
  for (const nome of [
    'dialogo-entra', 'dialogo-esce', 'avviso-entra', 'avviso-esce',
    'numero-pulse', 'cella-pulse', 'tocco', 'serie-accesa', 'calendario-entra',
    'attesa-streak',
  ]) {
    assert.ok(css.includes('@keyframes ' + nome), `manca l'animazione ${nome}`);
  }
  // e non ci sono regole che le annullano: una `animation: none` nascosta
  // farebbe fallire tutto senza che se ne accorga nessuno
  assert.equal(/^\s*animation:\s*none/m.test(css), false,
    'nessuna regola deve disattivare le animazioni');
  // e il blocco "riduci animazioni" è sempre l\'ultima cosa, così vince su tutto
  const riduci = css.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(riduci > css.length - 1200,
    'il blocco "riduci animazioni" deve stare in fondo: se sta in mezzo, una regola '
    + 'successiva lo annulla');
});