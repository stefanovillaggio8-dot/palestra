/* UNA SOLA VERSIONE, OVUNQUE.
 *
 * Questo test esiste perche' Ste ha perso tre versioni di fila.
 *
 * Cosa era successo: l'app chiedeva il CSS come `stile.css?v=130`, l'anteprima lo
 * chiedeva come `stile.css`, senza numero. Due indirizzi diversi per lo stesso
 * file. Il browser tiene in cache il secondo per sempre, perche' GitHub Pages manda
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
