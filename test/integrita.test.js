import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Questo test controlla una classe di errori che il controllo di sintassi NON
// vede: un modulo che importa una funzione che non e' stata esportata.
// E' successo piu\' volte: lo chiama solo quando serve, quindi i test verdi
// non se ne accorgerebbero e l\'app mostrerebbe una schermata vuota.

const QUI = dirname(fileURLToPath(import.meta.url));
const SRC = join(QUI, '..', 'src');

function fileJs() {
  return readdirSync(SRC).filter((f) => f.endsWith('.js')).map((f) => join(SRC, f));
}

/** Nomi esportati da un modulo (export function/const/class/let/var). */
function esporta(nomeFile) {
  const testo = readFileSync(nomeFile, 'utf8');
  const fuori = new Set();
  const es1 = /export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g;
  const es2 = /export\s+(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/g;
  for (const re of [es1, es2]) {
    let m;
    while ((m = re.exec(testo)) !== null) fuori.add(m[1]);
  }
  // export { a, b as c }
  const blocchi = testo.match(/export\s*\{[^}]*\}/g) || [];
  for (const b of blocchi) {
    const dentro = b.replace(/export\s*\{/, '').replace(/\}/, '');
    for (const pezzo of dentro.split(',')) {
      const p = pezzo.trim();
      if (!p) continue;
      const parti = p.split(/\s+as\s+/);
      fuori.add((parti[1] || parti[0]).trim());
    }
  }
  return fuori;
}

/** Nomi importati da un modulo, per ciascun percorso. */
function importazioni(testo) {
  const uscite = [];
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(testo)) !== null) {
    const nomi = m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    uscite.push({ percorso: m[2], nomi });
  }
  return uscite;
}

test('ogni modulo importa solo cose che esistono davvero', () => {
  const problemi = [];
  for (const f of fileJs()) {
    const testo = readFileSync(f, 'utf8');
    for (const imp of importazioni(testo)) {
      if (!imp.percorso.startsWith('.')) continue; // solo moduli nostri
      const bersaglio = join(SRC, imp.percorso.replace('./', ''));
      const disponibili = esporta(bersaglio);
      for (const nome of imp.nomi) {
        if (!disponibili.has(nome)) {
          problemi.push(`${f.split(/[\\/]/).pop()} importa "${nome}" da ${imp.percorso}, ma lì non è esportato`);
        }
      }
    }
  }
  assert.deepEqual(problemi, [], 'importazioni rotte:\n' + problemi.join('\n'));
});

test('ogni modulo importa solo da file che esistono', () => {
  const problemi = [];
  for (const f of fileJs()) {
    const testo = readFileSync(f, 'utf8');
    for (const imp of importazioni(testo)) {
      if (!imp.percorso.startsWith('.')) continue;
      const bersaglio = join(SRC, imp.percorso.replace('./', ''));
      try { readFileSync(bersaglio); }
      catch { problemi.push(`${f.split(/[\\/]/).pop()} importa da ${imp.percorso} che non c'è`); }
    }
  }
  assert.deepEqual(problemi, []);
});

test('nessun modulo importa librerie esterne: zero dipendenze', () => {
  const problemi = [];
  for (const f of fileJs()) {
    const testo = readFileSync(f, 'utf8');
    const re = /import\s+[^;]*?from\s*['"]([^.'"][^'"]*)['"]/g;
    let m;
    while ((m = re.exec(testo)) !== null) {
      problemi.push(`${f.split(/[\\/]/).pop()} importa "${m[1]}"`);
    }
  }
  assert.deepEqual(problemi, [], 'l\'app deve funzionare senza npm install:\n' + problemi.join('\n'));
});

test('i nomi delle foto degli esercizi corrispondono ai file sul disco', () => {
  const dati = readFileSync(join(SRC, 'dati-iniziali.js'), 'utf8');
  const foto = [...dati.matchAll(/img\/esercizi\/([a-z0-9-]+\.png)/g)].map((m) => m[1]);
  const sw = readFileSync(join(QUI, '..', 'sw.js'), 'utf8');
  for (const f of new Set(foto)) {
    assert.ok(sw.includes(f), `il service worker non mette in cache ${f}`);
  }
  assert.ok(foto.length >= 23, 'le foto citate sono almeno 23');
});

test('ogni file .js di src e\' nella lista del service worker (altrimenti offline si rompe)', () => {
  const sw = readFileSync(join(QUI, '..', 'sw.js'), 'utf8');
  for (const f of readdirSync(SRC).filter((x) => x.endsWith('.js'))) {
    assert.ok(sw.includes(`./src/${f}`), `sw.js non precarica src/${f}`);
  }
});

test('sw.js precarica anche index.html, stile.css e il manifest', () => {
  const sw = readFileSync(join(QUI, '..', 'sw.js'), 'utf8');
  for (const f of ['./index.html', './stile.css', './manifest.webmanifest']) {
    assert.ok(sw.includes(f), `sw.js non precarica ${f}`);
  }
});

// ---------------------------------------------------------------------------
// Il numero di versione e' in due file, e devono dire la stessa cosa.
// ---------------------------------------------------------------------------
// Ste controlla il sito guardando la versione che gli scrive in faccia: se dice
// un numero vecchio, il sito non e' stato pubblicato. Quel numero e' in due posti
// (la cache del service worker e la pagina), quindi sono due numeri che possono
// non essere d'accordo: e' successo nella v54, quando avevo alzato solo sw.js e
// index.html era ancora al 52. Il sito sembrava regolare e invece serviva la
// versione di due versioni fa.

test('I2. la versione di index.html e quella di sw.js sono lo stesso numero', () => {
  const radice = join(QUI, '..');
  const sw = readFileSync(join(radice, 'sw.js'), 'utf8');
  const html = readFileSync(join(radice, 'index.html'), 'utf8');

  const dalWorker = /const VERSIONE = 'palestra-v(\d+)'/.exec(sw);
  const dallaPagina = /window\.PALESTRA_VERSIONE = '(\d+)'/.exec(html);
  assert.ok(dalWorker, 'sw.js deve dichiarare la versione come palestra-vNUMERO');
  assert.ok(dallaPagina, 'index.html deve dichiarare window.PALESTRA_VERSIONE');

  assert.equal(dalWorker[1], dallaPagina[1],
    `sw.js e' alla v${dalWorker[1]} e index.html alla v${dallaPagina[1]}: `
    + 'chi le guarda vede due versioni diverse');

  // e non puo' tornare indietro: se qualcuno copia una versione vecchia, il numero
  // deve saltare fuori
  const numero = Number(dallaPagina[1]);
  assert.ok(Number.isInteger(numero) && numero > 0, 'la versione e\' un numero intero');
});

// ---------------------------------------------------------------------------
// Il numero di versione di IndexedDB.
// ---------------------------------------------------------------------------
// Ste ha visto sul telefono: "Failed to execute 'transaction' on
// 'IDBDatabase': One of the specified object stores was not found".
// Il motivo era che la versione del database era scritta a mano (2) e non si
// e' alzata quando ho aggiunto le tabelle nuove ('pesi', 'profili',
// 'missioni', 'ricompense'): senza upgrade le tabelle non venivano create e
// ogni lettura esplodeva. Adesso la versione si calcola dalle tabelle, quindi
// non puo' piu' succedere. Questo test lo blocca per l'avvenire.

test('I1. la versione di IndexedDB sale da sola quando aggiungi una tabella', async () => {
  const { TABELLE, VERSIONE_IDB } = await import('../src/db.js');
  assert.ok(Array.isArray(TABELLE) && TABELLE.length > 0, 'la lista delle tabelle esiste');
  assert.equal(typeof VERSIONE_IDB, 'number', 'la versione e\' un numero');
  // deve dipendere dalle tabelle: se qualcuno aggiunge "pesi" o "profili",
  // la versione sale da sola e l'upgrade scatta davvero
  assert.equal(VERSIONE_IDB, 1 + TABELLE.length,
    'la versione deve essere legata al numero di tabelle, altrimenti si rompe di nuovo');
  assert.ok(VERSIONE_IDB > 2, 'la versione deve essere gia\' salita oltre la 2 bloccata');

  // ogni tabella deve comparire nel codice di apertura, altrimenti esiste solo
  // nella lista e il gioco non la trova mai
  const sorgente = readFileSync(join(SRC, 'db.js'), 'utf8');
  for (const t of TABELLE) {
    assert.ok(sorgente.includes(t), 'la tabella ' + t + ' deve comparire in db.js');
  }
});
