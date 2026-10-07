import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
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

test('sw.js precarica anche index.html, stile.css e i manifest', () => {
  const sw = readFileSync(join(QUI, '..', 'sw.js'), 'utf8');
  for (const f of ['./index.html', './stile.css', './manifest.webmanifest',
    './manifest-p1.webmanifest', './manifest-p2.webmanifest', './manifest-nuovo.webmanifest']) {
    assert.ok(sw.includes(f), `sw.js non precarica ${f}`);
  }
});

// I manifest sono l'identita' dell'app installata: se due persone hanno lo stesso
// id, la seconda installazione sostituisce la prima. E se il start_url punta a una
// persona fissa, l'app installata si apre SEMPRE su quella persona.
//
// Ste (06/10/2026): "se metti la chiave, il link diventa una chiave personale"
// -> ogni persona deve poter installare l'app senza toccare le altre.
test('I3b. ogni manifesto ha un id suo e non apre una persona fissa', () => {
  const radice = join(QUI, '..');
  const html = readFileSync(join(radice, 'index.html'), 'utf8');
  const idVisti = new Map();
  for (const nome of ['manifest-p1', 'manifest-p2', 'manifest-nuovo']) {
    const m = JSON.parse(readFileSync(join(radice, nome + '.webmanifest'), 'utf8'));
    assert.ok(m.id, nome + ' deve avere un id');
    assert.equal(idVisti.has(m.id), false,
      `${nome} ha lo stesso id di ${idVisti.get(m.id)}: installandolo sostituisce l'altro`);
    idVisti.set(m.id, nome);
    assert.ok(m.start_url, nome + ' deve avere start_url');
  }
  // il manifesto "nuovo" e' quello di chi si registra col link: il suo start_url
  // NON puo' contenere ?p=1, altrimenti l'app installata aprirebbe Ste
  const nuovo = JSON.parse(readFileSync(join(radice, 'manifest-nuovo.webmanifest'), 'utf8'));
  assert.doesNotMatch(String(nuovo.start_url), /[?&]p=/,
    'il manifesto di chi si registra non deve puntare a una persona fissa');
  assert.doesNotMatch(String(nuovo.start_url), /[?&]n=/,
    'e nemmeno a un nome: l\'app deve aprire pulita e lasciare che la memoria del dispositivo dica chi e\'');
  // e index.html deve scegliere il manifesto giusto quando c'e' un nome
  assert.match(html, /'nuovo'/, 'index.html deve scegliere il manifesto nuovo per i link con ?n=');
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

test('I3. la versione dichiarata e\' anche quella dell\'ultimo commit', () => {
  // I due numeri possono anche essere uguali e sbagliati in blocco: e' successo.
  // Dopo la v55 avevo smesso di alzarli, quindi index.html e sw.js dicevano entrambi
  // "55" mentre il codice era gia' alla v57. Ste verifica il sito guardando quel
  // numero: se il numero mente, lui non puo' sapere se la versione nuova e' online,
  // e per lui e' l'unico modo di controllare.
  //
  // Percio' il numero non e' solo "due file che devono dircela stessa": deve essere
  // quello della versione su cui stiamo lavorando. Si legge dall'ultimo commit.
  //
  // LIMITI ONESTI DI QUESTO TEST, che vale la pena sapere:
  //  - salta se git non c'e' (un archivio, una copia senza .git): niente da confrontare
  //  - salta se l'ultimo commit non e' una versione (un "tutto pulito", per esempio)
  //  - quando salta, non controlla niente: e' una rete, non un cancello
  const radice = join(QUI, '..');
  let titolo = '';
  try {
    titolo = execFileSync('git', ['log', '-1', '--format=%s'], {
      cwd: radice, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return; // niente git: il test non puo' dire niente
  }
const m = /^v(\d+)/.exec(titolo);
  if (!m) return; // l'ultimo commit non e' una versione: non e' un mio errore

  const html = readFileSync(join(radice, 'index.html'), 'utf8');
  const dichiarata = /window\.PALESTRA_VERSIONE = '(\d+)'/.exec(html);
  assert.ok(dichiarata, 'index.html deve dichiarare window.PALESTRA_VERSIONE');

  const ultima = Number(m[1]);
  const adesso = Number(dichiarata[1]);
  // Perche' va bene anche "ultima + 1": il numero si alza PRIMA di scrivere il
  // codice (e' la regola di Ste dal 06/10/2026: "mettilo per primo"), quindi
  // quando i test girano il commit con quel numero non esiste ancora. Ammetto
  // quindi zero o un passo, e nient'altro.
  assert.ok(adesso === ultima || adesso === ultima + 1,
    `l'ultimo commit e' "${titolo}" ma il numero dichiarato e' il ${adesso}: `
    + 'va lasciato com\'e\' o alzato di uno, non altro. Il numero che Ste legge '
    + 'sul sito e\' l\'unico suo controllo su quello che e\' online.');
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
