// I TRE NUMERI DELLA VERSIONE DEVONO ESSERE UGUALI.
//
// Ste (22/10/2026): "appena apro l’app in basso spunta c’è la versione 248, ti
// aggiorno e mi si aggiorna all’infinito".
//
// Il motivo era questo: la pagina dichiarava una versione vecchia (247) mentre
// il sw.js online diceva già 248. Ogni volta che l’app partiva vedeva "c’è una
// versione nuova", ricaricava, e al ricaricamento rivedeva la stessa cosa:
// un ciclo che non finiva più.
//
// I tre numeri che devono stare insieme:
//   1. window.PALESTRA_VERSIONE in index.html (quello che l’app mostra in basso)
//   2. il nome della cache in sw.js (palestra-vNNN)
//   3. i numeri dei fogli di stile (stile.css?v=NNN) in index.html e in sw.js
//
// Se uno dei tre resta indietro, l’app si ricarica all’infinito: quindi qui
// non si controlla solo che i numeri esistano, ma che dicano la stessa cosa.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (nome) => readFileSync(join(RADICE, nome), 'utf8');

function numeroPagina(testo) {
  const m = /window\.PALESTRA_VERSIONE\s*=\s*'(\d+)'/.exec(testo);
  return m ? m[1] : null;
}

function numeroCache(testo) {
  const m = /palestra-v(\d+)/.exec(testo);
  return m ? m[1] : null;
}

test('T6. il numero che la pagina dichiara è lo stesso della cache del worker', () => {
  const pagina = leggi('index.html');
  const sw = leggi('sw.js');

  const dichiarato = numeroPagina(pagina);
  const cache = numeroCache(sw);
  assert.ok(dichiarato, 'index.html deve dichiarare window.PALESTRA_VERSIONE');
  assert.ok(cache, 'sw.js deve dichiarare il numero della cache (palestra-vNNN)');
  assert.equal(dichiarato, cache,
    `la pagina dice v${dichiarato} e il service worker dice v${cache}: se non sono `
    + 'uguali l’app si ricarica all’infinito');

  // i fogli di stile devono chiedere la stessa versione
  const cssPagina = [...pagina.matchAll(/stile(?:-rpg)?\.css\?v=(\d+)/g)].map((m) => m[1]);
  const cssSw = [...sw.matchAll(/stile(?:-rpg)?\.css\?v=(\d+)/g)].map((m) => m[1]);
  assert.ok(cssPagina.length >= 2, 'index.html deve chiedere i due fogli di stile col numero');
  assert.ok(cssSw.length >= 2, 'sw.js deve mettere in cache i due fogli di stile col numero');
  for (const n of [...cssPagina, ...cssSw]) {
    assert.equal(n, dichiarato,
      `un foglio di stile chiede la versione ${n} e la pagina dice ${dichiarato}`);
  }
});

test('T7. l’app non si ricarica in giro se la versione non cambia', () => {
  const src = leggi('src/update-via-sw.js');
  assert.match(src, /sessionStorage\.getItem\(.palestra:versione-provata.\)/,
    'il controllo della versione deve ricordare quale versione ha già provato a prendere');
  assert.match(src, /if \(giaProvata === remota\) return null;/,
    'se la versione è già stata provata, l’app non deve ricaricare all’infinito');
});
