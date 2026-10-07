// tasti-basso.test.js -- la barra in basso.
//
// Ste (07/10/2026): "andare a trovare lo storico è un'impresa. Sistemare tutta
// l'app in generale e riordinare tutto, anche i tasti in basso".
//
// Due cose da non perdere di vista quando si spostano le voci della barra:
//  1) ogni schermata deve restare raggiungibile. Tolgo Amici dalla barra, quindi
//     se non metto un link ad Amici da Casa e Profilo la lista amici sparisce dal
//     mondo e nessuno se ne accorge (è già successo con lo storico);
//  2) la barra deve stare nel LIMITE DEL TELEFONO. Cinque voci in una riga sul
//     più stretto dei telefoni fanno spuntare la voce fuori dallo schermo, e
//     allora la quinta voce non si vede proprio: cioè proprio quella che ho
//     appena messo per sistemare lo storico.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../stile.css', import.meta.url), 'utf8');
const APP = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('B1. la barra ha cinque voci e lo storico è una di quelle', () => {
  const blocco = /\/\/ La barra in basso[\s\S]*?const resto = el\('div', \{ class: 'basso' \}, \[([\s\S]*?)\]\),/.exec(APP);
  assert.ok(blocco, 'non trovo la costruzione della barra in basso');
  const voci = [...(blocco[1].matchAll(/voce\('([^']*)', '([^']*)'/g))]
    .map((m) => ({ href: m[1], testo: m[2] }));
  assert.equal(voci.length, 5, `la barra ha ${voci.length} voci invece di 5`);
  const testi = voci.map((v) => v.testo);
  assert.deepEqual(testi, ['Allenamento', 'Rank', 'Storico', 'Casa', 'Profilo'],
    'l\'ordine deve essere per quanto si usa: allenarsi, quanto sei forte, cosa hai fatto, il gioco, il profilo');
  assert.ok(testi.includes('Storico'),
    'lo storico nella barra: è la schermata che Ste apriva di meno ("un\'impresa")');
});

test('B2. ogni rotta della barra punta a una schermata che esiste davvero', () => {
  for (const rotta of ['/', '/rank', '/storico', '/casa', '/profilo']) {
    assert.ok(APP.includes(`rotta === '${rotta}'`), `manca il ramo di disegno per ${rotta}`);
  }
});

test('B3. Amici esce dalla barra ma resta raggiungibile da Casa e da Profilo', () => {
  // il motivo per cui questo test esiste: il collegamento a #/amici c'era SOLO
  // nella barra e dentro la pagina di un amico. Togliendolo dalla barra, senza
  // questi link la lista amici diventava irraggiungibile
  const casa = APP.slice(APP.indexOf('Allenamento e storico'), APP.indexOf('Allenamento e storico') + 1200);
  assert.ok(casa.includes("'#/amici'"), 'dalla Casa manca il link agli amici');
  const profilo = APP.slice(APP.lastIndexOf("'#/storico', class: 'bot fantasma'"), APP.length);
  assert.ok(profilo.includes("'#/amici'"), 'dal Profilo manca il link agli amici');
});

test('B4. le cinque voci ci stanno nel telefono più stretto (nessuna fuori schermo)', () => {
  // Cinque voci lunghe ("Allenamento" è la più lunga) su 320px: se il CSS non
  // stringe la voce, la quinta esce dal bordo e non si tocca.
  //
  // Guardo TUTTI i blocchi da telefono, non solo il primo: nel foglio ce ne sono
  // piu' di uno, e controllando solo il primo questo test passerebbe anche se la
  // regola che serve sta in un altro (l'ho gia' scritto una volta cosi').
  const blocchi = [...CSS.matchAll(/@media \(max-width: 430px\)\s*\{([\s\S]*?)\n\}/g)];
  assert.ok(blocchi.length >= 2, 'i blocchi da telefono devono essere piu\' di uno');
  const testo = blocchi
    .flatMap(([, dentro]) => (dentro.match(/[^{}]+\{[^{}]*\}/g) || []))
    .filter((r) => /\.menu-basso|\.voce-menu/.test(r))
    .join(' ');
  assert.match(testo, /\.menu-basso/, 'deve esserci una regola per la barra dentro il blocco da telefono');
  assert.match(testo, /\.voce-menu/, 'e una per la voce: la barra si stringe, ma è la voce che deve diventare piccola');
  const haFontPiccolo = /font-size:\s*(\d*\.?\d+)rem/.exec(testo);
  assert.ok(haFontPiccolo && Number(haFontPiccolo[1]) <= 0.78,
    `la voce del menu sul telefono deve stare sotto .78rem, trovato ${haFontPiccolo ? haFontPiccolo[1] : 'niente'}rem`);
  assert.match(testo, /white-space:\s*nowrap/,
    'la voce non deve andare a capo: due righe in una barra di cinque voci sono un pasticcio');
  // e il padding laterale stretto, altrimenti le cinque voci non ci stanno comunque
  // il padding e' "verticale laterale": mi interessa il LATERALE, cioe' il secondo
  // numero. Se guardo il primo leggo l'alto (5px) e il test passa senza guardare
  // niente: e' la stessa trappola del primo @media, un'altra volta.
  const padding = /\.menu-basso\s*\{[^}]*padding:\s*\d+px\s+(\d+)px/.exec(testo);
  assert.ok(padding, `non capisco il padding della barra: ${testo}`);
  assert.ok(Number(padding[1]) <= 3,
    `il padding laterale della barra deve essere di 3px o meno, trovato ${padding[1]}px`);
});

test('B5. la barra in basso resta in basso anche con la barra di stato', () => {
  // la barra di stato cresce quando il messaggio va a capo, e una barra bassa
  // senza spazio per lei viene coperta: i tasti che Ste preme sono quelli che
  // devono restare sempre raggiungibili
  const regola = /\.menu-basso\s*\{([^}]*)\}/.exec(CSS)[1];
  assert.ok(/padding-bottom|inset|env\(safe-area/.test(regola),
    'la barra deve tenere conto dello spazio del telefono (safe-area) o del messaggio in alto');
});