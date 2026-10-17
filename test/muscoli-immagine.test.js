// Z19. OGNI SAGOMA DEVE STARE SOPRA IL MUSCOLO DISEGNATO (16/10/2026).
//
// Questo test nasce da un buco che Z18 non chiudeva. Z18 dice che due muscoli
// diversi non possono stare nello stesso posto, e aveva ragione: era quello il
// difetto dei dorsali che invadevano il tricipite. Ma c'era anche il difetto
// opposto, e Z18 non lo vedeva: una sagoma puo' non sovrapporsi a nessuno ed
// essere lo stesso nel BUIO, cioe' sopra una parte del disegno dove il muscolo non
// c'e'.
//
// E' successo due volte, e in entrambi i casi la sagoma sembrava a posto guardando
// i numeri. I dorsali erano a x=498-550 mentre il muscolo disegnato sta a x=528-576:
// la sagoma finiva dentro il braccio e dentro la V scura fra braccio e schiena, e
// copriva solo il 57% del vero dorso largo. Un avambraccio simile, al 47%.
//
// IL CONFRONTO E' SU `muscoli.png`, che e' il disegno originale dei muscoli ed e'
// trasparente fuori dal corpo. Quindi "quanto della sagoma cade sul muscolo
// disegnato" e' una domanda che si puo' fare, e la risposta e' un numero.
//
// Qui non sipretende il 100%: le sagome sono volutamente un po' larghe (e' scritto
// anche nel codice), e la parte fuori dal corpo non si vede. Si pretende pero' che
// non PEGIORINO, e per questo ogni muscolo ha il suo pavimento, preso dalla
// copertura di oggi. Se una modifica spinge una sagoma nel buio, il test la vede
// anche se non si nota a occhio.
//
// I valori non sono giudizi: sono la copertura misurata quando il test e' stato
// scritto. Ogni volta che una sagoma viene spostata, il numero va rimisurato e il
// pavimento spostato con lei, altrimenti il test mente.
//
// NOTA TECNICA: per leggere il PNG serve decodificarlo, e Node non ha un
// decodificatore PNG. Qui sotto c'e' il minimo necessario per questo file solo:
// 8 bit, colore RGBA (tipo 6), nessun interlacciamento. Se un giorno l'immagine
// cambia di formato, questo legge una schifezza e il test mente: me accorgerebbe,
// perche' i numeri diventerebbero 0.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { RITAGLI } from '../src/mappa-muscoli.js';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Il solo canale alpha di un PNG RGBA a 8 bit: serve sapere dove c'e' il muscolo. */
async function alphaDelPng(percorso) {
  const png = await readFile(percorso);

  // firma + IHDR: larghezza, altezza, profondita', tipo colore, compressione,
  // filtro, interlacciamento
  const larghezza = png.readUInt32BE(16);
  const altezza = png.readUInt32BE(20);
  const profondita = png[24];
  const tipo = png[25];
  const interlacciato = png[28];
  assert.equal(profondita, 8, `${percorso}: questo test legge solo 8 bit per canale`);
  assert.equal(tipo, 6, `${percorso}: questo test legge solo RGBA (tipo 6), non il tipo ${tipo}`);
  assert.equal(interlacciato, 0, `${percorso}: l'immagine e' interlacciata e non si sa leggerla`);

  // tutti i blocchi IDAT messi insieme e sgonfiati
  const parti = [];
  let i = 8;
  while (i < png.length) {
    const lunghezza = png.readUInt32BE(i);
    const tipoBlocco = png.toString('ascii', i + 4, i + 8);
    if (tipoBlocco === 'IDAT') parti.push(png.subarray(i + 8, i + 8 + lunghezza));
    if (tipoBlocco === 'IEND') break;
    i += 12 + lunghezza;
  }
  const grezzo = inflateSync(Buffer.concat(parti));

  // ogni riga ha un byte di filtro e poi i pixel; il filtro va "annullato" riga per
  // riga, e serve il valore di sinistra, di sopra e di sopra-sinistra
  const bpp = 4;
  const passo = larghezza * bpp;
  const alpha = Buffer.alloc(larghezza * altezza);
  let sopra = Buffer.alloc(passo);
  let posizione = 0;
  for (let y = 0; y < altezza; y++) {
    const filtro = grezzo[posizione];
    posizione += 1;
    const riga = Buffer.from(grezzo.subarray(posizione, posizione + passo));
    posizione += passo;
    for (let x = 0; x < passo; x++) {
      const a = x >= bpp ? riga[x - bpp] : 0;
      const b = sopra[x];
      const c = x >= bpp ? sopra[x - bpp] : 0;
      if (filtro === 0) { /* gia' il valore vero */ }
      else if (filtro === 1) riga[x] = (riga[x] + a) & 255;
      else if (filtro === 2) riga[x] = (riga[x] + b) & 255;
      else if (filtro === 3) riga[x] = (riga[x] + ((a + b) >> 1)) & 255;
      else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const scelto = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        riga[x] = (riga[x] + scelto) & 255;
      } else assert.fail(`filtro PNG sconosciuto: ${filtro}`);
    }
    for (let x = 0; x < larghezza; x++) alpha[y * larghezza + x] = riga[x * bpp + 3];
    sopra = riga;
  }
  return { alpha, larghezza, altezza };
}

const dentro = (poligono, x, y) => {
  let dentro_ = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro_ = ! dentro_;
  }
  return dentro_;
};

/** Quanti punti della sagoma (su un reticolo a passo 2) cadono sul muscolo disegnato. */
function copertura(sagoma, alpha, larghezza, altezza, passo = 2) {
  const ys = sagoma.map((p) => p[1]);
  const xs = sagoma.map((p) => p[0]);
  let tot = 0;
  let sulMuscolo = 0;
  for (let y = 0; y < Math.min(altezza, Math.max(...ys) + 1); y += passo) {
    if (y < Math.min(...ys)) continue;
    for (let x = 0; x < Math.min(larghezza, Math.max(...xs) + 1); x += passo) {
      if (x < Math.min(...xs)) continue;
      if (!dentro(sagoma, x + 0.5, y + 0.5)) continue;
      tot += 1;
      if (alpha[y * larghezza + x] > 128) sulMuscolo += 1;
    }
  }
  return { tot, sulMuscolo };
}

// IL PAVIMENTO DI OGNI MUSCOLO, misurato quando questo test e' stato scritto.
//
// ATTENZIONE: qui dentro c'e' il PEGGIO dei due lati, non la copertura della
// sagoma "cosi' com'e'". Vedi la nota sulla specchiatura sotto.
// Se sposti una sagoma, rimisura e sposta qui.
const PAVIMENTO = {
  petto: 90,
  deltoide_fronte: 60,
// Il bicipite e' una fascia PIENA dal 16/10 (prima era un esagono che lasciava
  // un quarto del muscolo spento). Per coprire tutto il bicipite la sagoma deve
  // arrivare al bordo del braccio, e il ritaglio ne toglie 1,5 pixel: resta il
  // contorno scuro del corpo (3,6%) e le linee sottili di separazione (7,6%),
  // che il ritaglio del disegno NON colora di proposito. Con una sola sagoma
  // specchiata e un braccio disegnato 4-5 pixel piu' in fuori dell'altro, quei
  // pixel sono inevitabili: il pavimento scende a 86.
  bicipite: 86,
  brachiale: 79,
  // L'avambraccio e' una L dal 16/10: prende anche la striscia INTERNA del
  // davanzo, che prima restava sempre spenta. La sagoma attraversa per forza le
  // linee sottili che separano le due strisce (12,8% del suo area): sono i
  // confini del disegno e NON si colorano, quindi il pavimento scende a 74.
  // Non e' un difetto tollerato: e' il prezzo di coprire tutta la fascia.
  avambraccio: 74,
  // Il brachioradiale e' una striscia CONTINUA che parte dall'omero sopra il gomito
  // (16/10/2026, Ste: "il brachioradiale e' attaccato al bicipite no? devi farli
  // bene le fasce muscolari"). Non e' un difetto che il pavimento scenda: e' che le
  // due braccia del disegno NON sono uguali. La striscia laterale sta a x 39-56 a
  // sinistra e x 46-61 a destra, 5 pixel di differenza, e l'app disegna UNA sola
  // sagola specchiata. Per coprire la destra deve arrivare a x=61, e su quella
  // sinistra copre 5 pixel di vuoto. Il massimo possibile e' ~77%: misurato
  // 81,6% a sinistra e 77,4% a destra, pavimento 75.
  brachioradiale: 75,
  addome: 80,
  quadricipite: 87,
  trapezio: 87,
  dorsale: 85,
  romboidi: 80,
  deltoide_posteriore: 54,
  tricipite: 86,
  glutei: 66,
  femorale: 80,
  polpaccio: 92,
};

// La linea centrale di ogni figura, come in `mappa-muscoli.js`.
const CENTRI = { fronte: 162, retro: 577 };

test('Z19: ogni sagoma resta sopra il muscolo disegnato, anche specchiata', async () => {
  const { alpha, larghezza, altezza } = await alphaDelPng(
    join(RADICE, 'img', 'muscoli', 'muscoli.png'),
  );

  for (const [chiave, minimo] of Object.entries(PAVIMENTO)) {
    const gruppo = RITAGLI[chiave];
    assert.ok(gruppo, `il pavimento parla di "${chiave}" ma nei ritagli non c'e'`);

    const percentuale = (sagoma) => {
      const { tot, sulMuscolo } = copertura(sagoma, alpha, larghezza, altezza);
      assert.ok(tot > 20, `la sagoma di "${chiave}" e' troppo piccola per essere misurata`);
      return (100 * sulMuscolo) / tot;
    };

    const originale = percentuale(gruppo.sagoma);

    // IL PUNTO SULLO SPECCHIO. L'app disegna ogni sagoma una volta e la riflette, e
    // il FIGLIO NON E' SIMMETRICO: i muscoli sono disegnati a mano e i due lati non
    // coincidono. Le sagome hanno quindi due coperture diverse, e quella peggiore
    // e' quella che si vede male.
    //
    // Prima questo test guardava solo il lato sinistro, quindi una modifica poteva
    // sistemare il sinistro e rovinare il destro senza che nessuno se ne accorgesse.
    // Lo scarto fra i due lati arriva a 8,9 punti (tricipite 88% e 97%), quindi non
    // e' una differenza da arrotondare: e' la sagoma specchiata che cade peggio.
    const centro = CENTRI[gruppo.vista];
    const specchiata = gruppo.centro
      ? null
      : gruppo.sagoma.map(([x, y]) => [Math.round((2 * centro - x) * 100) / 100, y]);
    const altra = specchiata ? percentuale(specchiata) : originale;
    const peggiore = Math.min(originale, altra);

    assert.ok(
      peggiore >= minimo,
      `"${chiave}" copre solo il ${peggiore.toFixed(1)}% del muscolo disegnato `
      + `(pavimento ${minimo}%; sinistro ${originale.toFixed(1)}%, `
      + `destro ${altra.toFixed(1)}%): la sagoma sta nel buio, e li' l'app non accende niente`,
    );
  }
});

// Il comando per rimisurare i pavimenti, scritto cosi' non si perde:
//
//   node --input-type=module -e "import {RITAGLI} from './src/mappa-muscoli.js';
//   ... stampa la copertura di ogni sagoma su img/muscoli/muscoli.png"
//
// I valori qui sopra vengono da quel comando il 16/10/2026.
test('Z19b: le sagome esistono tutte e hanno un pavimento', () => {
  assert.deepEqual(
    Object.keys(RITAGLI).sort(),
    Object.keys(PAVIMENTO).sort(),
    'ogni ritaglio deve avere il suo pavimento in PAVIMENTO, e viceversa: '
    + 'un muscolo nuovo senza pavimento non e\' controllato da nessuna parte',
  );
});