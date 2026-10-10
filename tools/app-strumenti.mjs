// app-strumenti.mjs -- carica le funzioni interne di src/app.js per poterle provare.
//
// `src/app.js` e' un modulo che si disegna da solo appena importato: non ha export
// per `bloccoCalendario` e per le altre funzioni di mattoni, e non si puo' importare
// "pulito" in un test senza che provochi il disegno.
//
// Qui si legge il file e si mette su un `vm` un modulo finto: si eseguono i suoi
// `import`, si raccolgono gli `export`, e si espone un `app` finto. Le funzioni
// interne non sono exportate, quindi non si possono prendere cosi'.
//
// Il trucco che funziona e' un altro: si estrae il TESTO delle funzioni che servono
// e lo si esegue in un contesto dove `el` e gli altri mattoni sono quelli veri di
// `ui.js`. Non e' una copia: e' il testo IDENTICO di src/app.js, quindi se la
// funzione cambia qui dentro cambia anche li'. Se le due copie divergessero, il
// confronto del sorgente (in fondo a questo file) fallirebbe.

import { readFile } from 'node:fs/promises';
import { montaDom } from '../test/dom-minimo.js';
import * as ui from '../src/ui.js';
import { isoGiorno } from '../src/streak.js';

const src = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

montaDom();

/** Estrae il corpo di una funzione dal sorgente, con le graffe contate. */
function corpo(nome) {
  const inizio = src.indexOf(`function ${nome}(`);
  if (inizio < 0) throw new Error(`non trovo ${nome} in app.js`);
  let i = src.indexOf('{', inizio);
  let prof = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') prof++;
    else if (src[i] === '}') { prof--; if (prof === 0) return src.slice(inizio, i + 1); }
  }
  throw new Error(`non chiudo ${nome}`);
}

/** Le funzioni che servono, con tutte quelle da cui dipendono. */
const disegna = () => {};
const NOMI = [
  'NOMI_MESCE', 'prossimoGiornoPrevisto', 'ariaGiorno', 'rigaOggi',
  'bloccoMese', 'dettaglioGiorno', 'bloccoCalendario',
];

const parti = NOMI.map((n) => {
  if (n === 'NOMI_MESCE') {
    const inizio = src.indexOf('const NOMI_MESCE = [');
    const fine = src.indexOf('];', inizio) + 2;
    return src.slice(inizio, fine);
  }
  return corpo(n);
});

// `const NOMI_MESCE` dentro un blocco non si può dichiarare due volte, quindi qui la
// dichiaro come `var` per non rompere il contesto.
const sorgente = parti.join('\n\n')
  + '\nreturn { NOMI_MESCE, prossimoGiornoPrevisto, ariaGiorno, rigaOggi, bloccoMese, dettaglioGiorno, bloccoCalendario };\n';

// LO STATO DEL CALENDARIO.
//
// In `src/app.js` e' un oggetto unico che vive nel modulo, e il calendario ci
// scrive l'anno mostrato e il giorno aperto. Qui lo creo uguale e lo passo dentro:
// non viene dalla sorgente copiata (la dichiarazione sta FUORI dalle funzioni che
// estraggo), quindi senza questo parametro il calendario non avrebbe nulla su cui
// scrivere l'anno.
const statoCalendario = { anno: null, giorno: null };
const CONTESTO = new Function(
  'el', 'avviso', 'svuota', 'bottone', 'campoTesto', 'campoNumero', 'perClasse',
  'isoGiorno', 'disegna', 'seduteDellaPersona', 'serieDellaPersona', 'esercizioPerId',
  'statoCalendario',
  sorgente,
);
const mod = CONTESTO(
  ui.el, () => {}, ui.svuota, ui.bottone, ui.campoTesto, ui.campoNumero, () => [],
  isoGiorno, () => {}, () => [], () => [], () => null,
  statoCalendario,
);

export { isoGiorno };
export const NOMI_MESCE = mod.NOMI_MESCE;
export const prossimoGiornoPrevisto = mod.prossimoGiornoPrevisto;
export const ariaGiorno = mod.ariaGiorno;
export const bloccoCalendario = mod.bloccoCalendario;