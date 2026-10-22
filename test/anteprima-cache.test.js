/* UNA SOLA VERSIONE, OVUNQUE.
 *
 * Questo test esiste perché Ste ha perso tre versioni di fila.
 *
 * Cosa era successo: l'app chiedeva il CSS come `stile.css?v=253`, l'anteprima lo
 * chiedeva come `stile.css`, senza numero. Due indirizzi diversi per lo stesso
 * file. Il browser tiene in cache il secondo per sempre, perché GitHub Pages manda
 * le cartelle statiche con una scadenza lunghissima, e quindi l'anteprima mostrava
 * il CSS di TRE VERSIONI FA per sempre.
 *
 * La cosa peggiore e' che l'errore e' invisibile: il sito funziona, la cache
 * funziona, i test passano, e uno guarda l'anteprima e dice "non e' cambiato
 * nulla". Sembra che siano i CSS a non funzionare, invece e' una riga dimenticata.
 *
 * E il secondo peggio e' che si era tagliata la strada: si poteva pensare che il
 * difetto fosse nell'effetto (e quindi continuare a ritoccare i colori, che e'
 * quello che e' successo per tre versioni), invece era nel modo in cui la pagina
 * chiedeva il file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');

const LEGGI = (nome) => readFile(join(RADICE, nome), 'utf8');

test('T1. ogni pagina chiede il CSS con lo stesso numero di versione', async () => {
  const index = await LEGGI('index.html');
  const anteprima = await LEGGI('anteprima-aura.html');

  // Il numero lo dichiara l'app...
  const versioneApp = index.match(/stile\.css\?v=(\d+)/)?.[1];
  assert.ok(versioneApp, 'index.html deve chiedere il CSS con un numero di versione');

  // ...e l'anteprima deve chiedere LO STESSO numero, non uno qualsiasi.
  const versioneAnteprima = anteprima.match(/stile\.css\?v=(\d+)/)?.[1];
  assert.ok(
    versioneAnteprima,
    'anteprima-aura.html DEVE chiedere il CSS con un numero: senza, il browser ' +
    'lo tiene in cache per sempre e l\'anteprima mostra una versione vecchia',
  );
  assert.equal(
    versioneAnteprima, versioneApp,
    `l'anteprima e' ferma al CSS v${versioneAnteprima} mentre l'app e' a v${versioneApp}: ` +
    'quello che Ste vede in anteprima non e\' quello che c\'e\' nell\'app',
  );
});

test('T2. nessuna pagina chiede stile.css senza numero', async () => {
  // Il controllo piu' semplice da sbagliare: `href="./stile.css"` e' un indirizzo
  // valido, il browser non lo rifiuta, e funziona benissimo. Solo che non si aggiorna
  // piu'. Per questo qui si cerca il pezzo di indirizzo SENZA `?v=`.
  for (const pagina of ['index.html', 'anteprima-aura.html']) {
    const testo = await LEGGI(pagina);
    const richieste = [...testo.matchAll(/href="(\.\/stile\.css[^"]*)"/g)].map((m) => m[1]);
    assert.ok(richieste.length > 0, `${pagina} deve chiedere il CSS`);
    for (const indirizzo of richieste) {
      assert.match(
        indirizzo, /\?v=\d+$/,
        `${pagina} chiede "${indirizzo}" senza numero di versione: il browser lo ` +
        'cachea per sempre e la pagina mostra sempre il CSS di una volta fa',
      );
    }
  }
});

test('T3. nessuna pagina chiede una foto senza numero di versione', async () => {
  // Lo stesso difetto del CSS, ma sulle immagini, e Ste l'ha trovato per la terza
  // volta: "ma non e' cambiato nulla", con il file nuovo gia' online e verificato
  // byte per byte. Il CSS aveva `?v=253`, le foto no: indirizzo identico per
  // sempre, scadenza lunghissima, e il browser restituiva la copia di prima.
  //
  // `src="./img/....webp"` e' un indirizzo valido e funziona: nessuno lo rifiuta.
  // Semplicemente non si aggiorna piu'.
  const anteprima = await LEGGI('anteprima-aura.html');
  const foto = [...anteprima.matchAll(/src="(\.\/img\/personaggi\/stati\/[^"]+)"/g)].map((m) => m[1]);
  assert.ok(foto.length > 0, 'l\'anteprima deve mostrare le foto');
  for (const indirizzo of foto) {
    assert.match(indirizzo, /\?v=\d+$/,
      `l'anteprima chiede "${indirizzo}" senza numero: il browser lo tiene in cache ` +
      'per sempre e le foto non si aggiornano piu\'');
  }

  // E l'app deve fare lo stesso, altrimenti l'anteprima e' aggiornata e l'app no.
  const avatar = await LEGGI('src/avatar-rpg.js');
  assert.match(
    avatar, /percorsoStato[\s\S]{0,1500}\?v=\$\{/,
    'percorsoStato() deve mettere la versione nell\'indirizzo della foto',
  );
  assert.match(
    avatar, /globalThis\.PALESTRA_VERSIONE/,
    'la versione delle foto va letta da window.PALESTRA_VERSIONE, cosi\' non si ' +
    'dimentica di allinearla a mano',
  );
});

test('T4. la lista di immagini del service worker usa la versione dichiarata', async () => {
  // Le 18 foto in cache erano scritte a mano, una per riga, e sono state
  // dimenticate due volte. Ora la lista le genera dalla versione, quindi non può
  // piu' restare indietro. Qui si controlla tre cose: che la generazione ci sia,
  // che non restino indirizzi scritti a mano, e che il numero sia unico in tutto
  // il progetto (se ne divergono due, la pagina mente su se stessa).
  const sw = await LEGGI('sw.js');
  assert.match(sw, /function immaginiPersonaggi\(\)/,
    'sw.js deve generare la lista delle foto invece di scriverla a mano');
  assert.doesNotMatch(sw, /'\.\/img\/personaggi\/stati\/[a-z]+-\d\.webp',/,
    'non ci devono piu\' essere indirizzi di foto scritti a mano: si generano');
  assert.match(sw, /\$\{classe\}-\$\{n\}\.webp\?v=\$\{NUMERO\}/,
    'la lista generata deve mettere la versione nell\'indirizzo');

  const versione = sw.match(/const VERSIONE = 'palestra-v(\d+)'/)?.[1];
  assert.ok(versione, 'sw.js deve dichiarare la versione');
  const numeri = new Set([versione]);
  for (const n of [...(await LEGGI('index.html')).matchAll(/stile\.css\?v=(\d+)/g)].map((m) => m[1])) {
    numeri.add(n);
  }
  for (const n of [...(await LEGGI('anteprima-aura.html')).matchAll(/stile\.css\?v=(\d+)/g)].map((m) => m[1])) {
    numeri.add(n);
  }
  for (const n of [...sw.matchAll(/stile\.css\?v=(\d+)/g)].map((m) => m[1])) {
    numeri.add(n);
  }
  assert.equal(numeri.size, 1,
    `i numeri di versione non coincidono: ${[...numeri].join(', ')}`);
});

test('T5. le 18 foto ci sono davvero in cache, tutte e 18', async () => {
  // La funzione che genera la lista viene eseguita davvero, non solo letta: se
  // qualcuno la cambia e sbaglia il numero di stati, o la dimentica di chiamare,
  // questo test lo dice. Si riesegue la funzione copiata dal service worker.
  const sw = await LEGGI('sw.js');
  const corpo = sw.match(/function immaginiPersonaggi\(\)\s*\{[\s\S]*?\n\}/)?.[0];
  assert.ok(corpo, 'la funzione che genera la lista deve esistere in sw.js');
  const NUMERO = sw.match(/const VERSIONE = 'palestra-v(\d+)'/)?.[1];
  // Si rilegge il corpo della funzione e si esegue davvero: `function X() {...}`
  // diventa `return function() {...}`, che e' gia' un corpo valido. Serve perché
  // una lista generata e' buona solo se genera davvero quello che dice.
  const eseguibile = corpo.replace('function immaginiPersonaggi()', 'return function()');
  // La funzione va richiamata due volte: la prima eseguita il corpo (che
  // restituisce la funzione), la seconda eseguita la funzione per ottenere l'elenco.
  const immagini = new Function('NUMERO', eseguibile)(NUMERO)();
  assert.equal(immagini.length, 18, `devono essere 18 foto, ne' sono ${immagini.length}`);
  for (const classe of ['guerriero', 'berserker', 'assassino']) {
    const sue = immagini.filter((u) => u.includes(`${classe}-`));
    assert.equal(sue.length, 6, `${classe}: devono essere 6 foto, ne' sono ${sue.length}`);
  }
  for (const u of immagini) {
    assert.ok(u.endsWith(`?v=${NUMERO}`), `${u} non ha il numero di versione`);
  }
});

test('T3. il service worker conosce anche l\'anteprima', async () => {
  // Il service worker scarica i file all'installazione, e lo fa chiedendo `reload`
  // per non prendere la copia vecchia dalla cache del browser. Ma un file che non
  // e' nella lista non viene scaricato: su quell pagina, in caso di problemi, non
  // c'e' nessuna rete di sicurezza.
  const sw = await LEGGI('sw.js');
  assert.match(
    sw, /'\.\/anteprima-aura\.html'/,
    'sw.js deve precaricare anteprima-aura.html, altrimenti su quella pagina non ' +
    'c\'e\' nessun fallback e si torna a dipendere dalla cache del browser',
  );
  assert.match(sw, /'\.\/stile\.css\?v=\d+'/, 'sw.js deve precaricare il CSS con la versione');
});

test('T4. il CSS chiede davvero i colori che l\'anteprima promette', async () => {
  // Se l'anteprima mente sul CSS che sta usando, il test T1 passa ma non serve a
  // niente: quindi si controlla anche che l'app usi davvero `--forza` e che il
  // contorno esista. Sono le due cose che Ste ha chiesto di vedere cambiare.
  const css = await LEGGI('stile.css');
  assert.match(css, /\.personaggio-scena-grafica\.personaggio-aura\s*\{[^}]*--forza:\s*[\d.]+/,
    'l\'aura deve avere --forza, e cosi\' l\'anteprima mostra l\'aura vera');
  assert.match(css, /drop-shadow\(0 0 \d+px/,
    'il personaggio deve avere il contorno luminoso: e\' la parte che si vede');
});

test('T5. i tre finali hanno le stesse dimensioni', async () => {
  // Ste (12/10/2026): "dovevi soltanto mettere lo sfondo uguale per tutti".
  //
  // Lo sfondo e' stato uniformato correggendo il colore dei pixel scuri dei tre
  // finali, e la verifica e' stata fatta con Pillow: lo scarto fra i tre sfondi e'
  // sceso da 13,5 a 0,43 su 255, e la figura e' rimasta identica (scarto massimo
  // 3,6 su 200, dentro il rumore della compressione).
  //
  // Qui si controlla la cosa che il test PUO' controllare da solo: che i tre file
  // abbiano le stesse dimensioni. Le dimensioni stanno nelle prime byte del file
  // WebP (il formato e' un contenitore RIFF), quindi si leggono senza decodificare
  // l'immagine e senza nessuna libreria. Se un giorno i tre finali venissero
  // rigenerati separatamente, il test se ne accorgerebbe.
  const { readFile: leggi } = await import('node:fs/promises');
  const dimensioni = [];
  for (const classe of ['guerriero', 'berserker', 'assassino']) {
    const buf = await leggi(join(RADICE, 'img', 'personaggi', 'stati', `${classe}-5.webp`));
    assert.equal(buf.toString('ascii', 0, 4), 'RIFF', `${classe}: non sembra un WebP`);
    assert.equal(buf.toString('ascii', 8, 12), 'WEBP', `${classe}: non sembra un WebP`);
    // 'VP8X' = esteso (con alfa), 'VP8L' = lossless, 'VP8 ' = con perdita.
    const tipo = buf.toString('ascii', 12, 16);
    let larghezza, altezza;
    if (tipo === 'VP8X') {
      larghezza = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      altezza = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    } else if (tipo === 'VP8L') {
      const b = buf.readUInt32LE(21);
      larghezza = (b & 0x3FFF) + 1;
      altezza = ((b >> 14) & 0x3FFF) + 1;
    } else {
      larghezza = buf.readUInt16LE(26) & 0x3FFF;
      altezza = buf.readUInt16LE(28) & 0x3FFF;
    }
    dimensioni.push({ classe, larghezza, altezza });
  }
  const primo = dimensioni[0];
  for (const d of dimensioni) {
    assert.deepEqual(
      { larghezza: d.larghezza, altezza: d.altezza },
      { larghezza: primo.larghezza, altezza: primo.altezza },
      `${d.classe} e' ${d.larghezza}x${d.altezza} mentre ${primo.classe} e' ` +
      `${primo.larghezza}x${primo.altezza}: i tre finali hanno forme diverse`,
    );
  }
});

// T6. UN SOLO SERVICE WORKER, E SOLO SW.JS (16/10/2026).
//
// Il bug più costoso mai stato in questo progetto, e non l'aveva scritto nessun
// test perché è una cosa che su carta sembra giusta.
//
// `app.js` registrava `./sw.js` e poi `registraAggiornamentoRapido()` registrava
// `./update-via-sw.js`. Nessuno dei due specificava `scope`, quindi entrambi
// prendevano la RADICE del sito come scope. Due service worker sullo stesso scope
// non convivono: il secondo sostituisce il primo. Quindi:
//
//  1. `sw.js` smetteva di controllare la pagina (via la cache per offline);
//  2. il messaggio "aggiorna-subito" finiva a `update-via-sw.js`, che non ha
//     nessun `message` listener: la ricarica non arrivava MAI.
//
// Per Ste la conseguenza era che l'app restava ferma sulla stessa versione per
// giorni. Io intanto pubblicavo correzioni (la v176, la v177, la v178, la v179) e
// lui le vedeva solo nella mia chat: la foto che gli ho chiesto aveva tre
// versioni di ritardo. È il caso peggiore in assoluto, perché il difetto è
// invisibile da chi lo introduce e sembra che sia l'altro a non aggiornare.
test('T6. nessun service worker oltre a sw.js', async () => {
  const sw = await LEGGI('sw.js');
  const app = await LEGGI('src/app.js');
  const viaSw = await LEGGI('src/update-via-sw.js');

  // ogni chiamata a register() in tutto il progetto, con il file che la contiene.
  // I COMMENTI si tolgono prima: il bug da cui viene questo test sta scritto per
  // intero nella nota di `update-via-sw.js`, e senza toglierli il test leggeva
  // quello e diceva che il bug c'è ancora.
  const senzaCommenti = (testo) => testo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((riga) => !riga.trim().startsWith('//'))
    .join('\n');

  const fileDaLeggere = { 'sw.js': sw, 'src/app.js': app, 'src/update-via-sw.js': viaSw };
  const chiamate = [];
  for (const [file, testo] of Object.entries(fileDaLeggere)) {
    for (const m of senzaCommenti(testo).matchAll(/serviceWorker\s*\.\s*register\s*\(\s*['"]([^'"]+)['"]/g)) {
      chiamate.push({ file, script: m[1] });
    }
  }

  assert.ok(chiamate.length > 0, 'il progetto deve registrare almeno un service worker');
  for (const c of chiamate) {
    assert.equal(c.script, './sw.js',
      `${c.file} registra "${c.script}": sullo stesso scope un secondo worker SOSTITUISCE `
      + 'il primo, e sw.js smette di controllare la pagina');
  }

  // e il numero di registrazioni non cresce: `sw.js` è registrato una volta sola
  const registrazioniSw = chiamate.filter((c) => c.script === './sw.js');
  assert.equal(registrazioniSw.length, chiamate.length,
    'sw.js deve essere l\'unico script registrato, e una volta sola');

  // la funzione che c'era prima non deve più registrare niente
  const corpo = viaSw.slice(viaSw.indexOf('export function registraAggiornamentoRapido'));
  const prossima = corpo.indexOf('\n}');
  const funzione = prossima > 0 ? corpo.slice(0, prossima) : corpo;
  assert.doesNotMatch(funzione, /register\s*\(/,
    'registraAggiornamentoRapido non deve registrare un service worker');

  // e `applicaAggiornamento` deve ricaricare SENZA aspettare una risposta: era
  // quello il motivo per cui la pagina restava ferma sulla versione vecchia.
  const corpoApplicazione = viaSw.slice(viaSw.indexOf('export async function applicaAggiornamento'));
  assert.match(corpoApplicazione, /setTimeout\(/,
    'applicaAggiornamento deve ricaricare la pagina con un setTimeout: '
    + 'è l\'unico modo di uscire da un worker che non ascolta i messaggi');
  assert.match(corpoApplicazione, /location\.reload\(\)/,
    'applicaAggiornamento deve chiamare location.reload()');

  // il messaggio "aggiorna-subito" non deve più essere l'unica strada: se è
  // l'unica, e nessuno lo ascolta, la pagina non si muove
  const soloPostMessage = /postMessage\(\{ tipo: 'aggiorna-subito' \}\);\s*return;/;
  assert.doesNotMatch(senzaCommenti(corpoApplicazione), soloPostMessage,
    'applicaAggiornamento non puo\' finire subito dopo il postMessage: '
    + 'se il worker non ascolta, la pagina resta ferma per sempre');
});
