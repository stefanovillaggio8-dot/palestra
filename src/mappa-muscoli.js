// mappa-muscoli.js -- l'omino che dice DOVE lavori.
//
// Ste (13/10/2026): "deve essere l'omino come quello nella foto. si deve capire
// anche fronte e retro e qua non si capisce e i quadratini grigi che
// rappresenterebbero i muscoli non mi piacciono".
//
// I "quadratini grigi" erano i miei muscoli: ellissi e poligoni grezzi. Qui i
// muscoli sono sagome vere, disegnate con dei punti e chiuse con una curva
// morbida (Catmull-Rom), quindi hanno il contorno che ha un muscolo e non un
// riquadro.
//
// FRONTE E DIETRO SI DISTINGUONO PER TRE MOTI:
//   1) la testa. Davanti c'è la faccia (occhi, naso, bocca). Dietro no: solo
//      i capelli, che coprono tutto.
//   2) il petto. Davanti si vedono i pettorali e l'ombelico. Dietro no.
//   3) sotto ogni figura c'è scritto FRONTE o DIETRO, perché la differenza
//      dev'essere immediata e non un quiz.
//
/* eslint-disable no-unused-vars */

// ---------------------------------------------------------------------------
// LE CURVE
// ---------------------------------------------------------------------------

/**
 * Chiude una lista di punti con una curva morbida che passa per tutti.
 *
 * Serve per i muscoli: con i segmenti retti venivano fuori dei poligoni con
 * gli spigoli, e sembravano dei quadratini. Con questa passano da un punto
 * all'altro come fa un contorno vero.
 */
export function curvaChiusa(punti) {
  const n = punti.length;
  if (n < 3) return '';
  let d = `M ${punti[0][0].toFixed(1)},${punti[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = punti[(i - 1 + n) % n];
    const p1 = punti[i];
    const p2 = punti[(i + 1) % n];
    const p3 = punti[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}

export const L = 230;
export const A = 360;
export const CENTRO = L / 2;

/**
 * Una linea sottile, costruita come forma chiusa.
 *
 * Occhi, naso, bocca, spina e ombelico sono linee, ma qui tutto deve essere una
 * sagoma chiusa: così il disegno funziona anche senza stroke e si colora come
 * il resto.
 */
export function linea([x1, y1], [x2, y2], spessore = 1.5) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lung = Math.hypot(dx, dy) || 1;
  const nx = (-dy / lung) * (spessore / 2);
  const ny = (dx / lung) * (spessore / 2);
  return [
    [x1 + nx, y1 + ny], [x2 + nx, y2 + ny],
    [x2 - nx, y2 - ny], [x1 - nx, y1 - ny],
  ];
}

/** Un piccolo disco, per l'ombelico. */
export function cerchio([cx, cy, r = 3]) {
  const punti = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    punti.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return punti;
}

const specchio = (punti) => punti.map(([x, y]) => [-x, y]);

// ---------------------------------------------------------------------------
// IL CORPO
//
// Il guscio non e' un acero di rettangoli: e' una sagoma. Il capo ha i capelli,
// le braccia scendono lungo il corpo con il gomito e il polso, le gambe hanno
// il ginocchio e il piede. Serve ache perché si capisca quale parte e' cosa.
// ---------------------------------------------------------------------------

// Testa e capelli: stessi punti, ma davanti ci mettiamo la faccia e dietro no.
const CAPELLI_FRONT = [
  [-24, 40], [-26, 26], [-16, 12], [0, 8], [16, 12], [26, 26],
  [24, 40], [18, 32], [12, 26], [0, 23], [-12, 26], [-18, 32],
];
const CAPELLI_RETRO = [
  [-24, 42], [-27, 26], [-16, 11], [0, 7], [16, 11], [27, 26],
  [24, 42], [16, 34], [8, 28], [0, 27], [-8, 28], [-16, 34],
];

// La testa. Senza questa il disegno aveva solo i capelli e sembrava una cuffia.
const TESTA = [
  [-23, 42], [-26, 30], [-19, 16], [-7, 8], [7, 8], [19, 16],
  [26, 30], [23, 44], [14, 56], [0, 59], [-14, 56],
];

const COLLO = [[-10, 56], [10, 56], [12, 74], [-12, 74]];

const BUSTO_FRONT = [
  [-52, 78], [-40, 72], [-22, 70], [22, 70], [40, 72], [52, 78],
  [46, 104], [38, 128], [35, 148], [40, 166], [26, 176], [-26, 176],
  [-40, 166], [-35, 148], [-38, 128], [-46, 104],
];
const BUSTO_RETRO = [
  [-52, 78], [-40, 72], [-22, 70], [22, 70], [40, 72], [52, 78],
  [47, 106], [40, 130], [36, 150], [40, 168], [26, 178], [-26, 178],
  [-40, 168], [-36, 150], [-40, 130], [-47, 106],
];

// Braccia: spalla, bicipite, gomito, avambraccio, polso.
const BRACCIO = [
  [50, 76], [62, 86], [66, 112], [64, 140], [66, 168], [64, 196],
  [54, 196], [52, 168], [54, 140], [52, 112], [48, 86],
];
const MANO = [
  [54, 196], [65, 196], [68, 206], [66, 220], [58, 222], [53, 210],
];

// Gambe: anca, coscia, ginocchio, polpaccio, caviglia, piede.
const GAMBA = [
  [-38, 168], [-6, 168], [-6, 200], [-8, 236], [-8, 250], [-16, 296],
  [-32, 298], [-33, 244], [-32, 204],
];
const PIEDE = [[-33, 296], [-10, 296], [-8, 316], [-30, 318], [-40, 316], [-40, 300]];

/** Il guscio del corpo, per vista. */
export const GUSCIO = {
  fronte: {
    capelli: CAPELLI_FRONT,
    forme: [TESTA, COLLO, BUSTO_FRONT, BRACCIO, MANO, GAMBA, PIEDE],
    // LA FACCIA. E' quello che dice "questo e' il davanti" senza doverlo
    // scrivere: dietro non ci sono occhi, non c'e' il naso e non c'e' la bocca.
    volto: [
      linea([-9, 33], [-4, 33], 2.2), linea([4, 33], [9, 33], 2.2),
      linea([0, 35], [0, 45], 2.0), linea([-4, 50], [4, 50], 2.2),
    ],
    // l'ombelico e la linea dei pettorali: due cose che ci sono solo davanti
    extra: [
      { cerchio: [0, 150, 3] },
      linea([-22, 96], [22, 96], 1.4),
      linea([0, 100], [0, 138], 1.2),
    ],
  },
  retro: {
    capelli: CAPELLI_RETRO,
    forme: [TESTA, COLLO, BUSTO_RETRO, BRACCIO, MANO, GAMBA, PIEDE],
    // LA SPINA DORSALE. E' quello che dice "questo e' il dietro": davanti non
    // c'e' niente di tutto questo.
    volto: [],
    extra: [
      linea([0, 78], [0, 168], 1.6),
      linea([-26, 92], [26, 92], 1.4),
      linea([-22, 104], [22, 104], 1.4),
      linea([-16, 118], [16, 118], 1.2),
    ],
  },
};

// ---------------------------------------------------------------------------
// I MUSCOLI
//
// Ogni zona e' una lista di punti, scritti sul lato DESTRO del corpo (x >= 0)
// e specchiati a mano per il sinistro, così i due lati non possono
// sbagliarsi. `centrato: true` vuol dire che la forma sta al centro e non si
// specchia (gli addomi, la spina, il trapezio che fa da un pezzo solo).
//
// LA POSIZIONE E' L'UNICA COSA CHE NON SI NEGOZIA, e il test Z3 la controlla:
// i tricipiti dietro (non davanti: un dip non lavora coi bicipiti),
// i bicipiti davanti, gli addomi davanti, i glutei dietro, la schiena dietro.
// ---------------------------------------------------------------------------

export const ZONE = {
  // ---- petto: davanti, e si vede che il peso va in alto o in basso ----
  petto_alto: {
    vista: 'fronte', nome: 'parte alta del petto',
    punti: [[5, 78], [22, 76], [38, 81], [43, 91], [30, 93], [15, 91], [5, 87]],
  },
  petto_centrale: {
    vista: 'fronte', nome: 'petto nel mezzo',
    punti: [[6, 92], [22, 94], [39, 93], [43, 104], [28, 108], [14, 106], [6, 101]],
  },
  petto_basso: {
    vista: 'fronte', nome: 'parte bassa del petto',
    punti: [[8, 105], [22, 109], [37, 107], [38, 118], [25, 122], [13, 118], [8, 112]],
  },

  // ---- dorso: dietro ----
  dorso_alto: {
    vista: 'retro', nome: 'parte alta del dorso (trapezio)',
    // fa da un pezzo solo, da una spalla all'altra: non si specchia
    centrato: true,
    punti: [[-36, 78], [-24, 70], [0, 67], [24, 70], [36, 78], [24, 94], [12, 102],
      [-12, 102], [-24, 94]],
  },
  dorso_centrale: {
    vista: 'retro', nome: 'dorso centrale',
    // i romboidi: fra le scapole, in mezzo alla schiena
    centrato: true,
    punti: [[-12, 102], [12, 102], [13, 126], [12, 150], [-12, 150], [-13, 126]],
  },
  dorso_lati: {
    vista: 'retro', nome: 'dorso ai lati (lati del triangolare)',
    // i dorsali larghi: sotto le ascelle e ai lati della schiena, NON in mezzo
    punti: [[13, 100], [32, 97], [47, 107], [44, 132], [31, 154], [17, 149], [14, 124]],
  },

  // ---- spalle ----
  spalle_frontali: {
    vista: 'fronte', nome: 'spalle davanti (deltoide anteriore)',
    punti: [[38, 76], [50, 77], [58, 88], [55, 102], [45, 105], [38, 96], [36, 85]],
  },
  spalle_posteriori: {
    vista: 'retro', nome: 'spalle posteriori (deltoide posteriore)',
    punti: [[38, 76], [50, 77], [58, 88], [55, 102], [45, 105], [38, 96], [36, 85]],
  },
  // il deltoide di lato si vede da entrambe le viste: e' la spalla di profilo
  spalle_laterali: {
    vista: 'entrambe', nome: 'spalle laterali (deltoide laterale)',
    punti: [[52, 84], [62, 92], [63, 106], [55, 114], [50, 102], [50, 91]],
  },

  // ---- braccio ----
  braccio_alto: {
    vista: 'fronte', nome: 'bicipite: braccio in alto',
    punti: [[42, 105], [53, 107], [57, 124], [53, 140], [44, 139], [40, 122]],
  },
  braccio_basso: {
    vista: 'fronte', nome: 'bicipite: braccio in basso',
    punti: [[45, 142], [55, 144], [57, 158], [53, 170], [46, 168], [44, 154]],
  },
  avambraccio: {
    vista: 'fronte', nome: 'avambraccio (polso e avanti braccio)',
    punti: [[47, 172], [57, 174], [60, 192], [55, 208], [49, 205], [48, 188]],
  },
  // Il tricipite sta dietro al braccio. Davanti non si vede e non lo disegno:
  // metterlo davanti direbbe che un dip lavora coi bicipiti, che e' il
  // contrario del vero. Il test Z3 lo controlla.
  spalla_gomito: {
    vista: 'retro', nome: 'tricipite: sopra il gomito',
    punti: [[42, 106], [54, 108], [58, 126], [54, 144], [44, 142], [40, 124]],
  },

  // ---- gambe ----
  quadricipite: {
    vista: 'fronte', nome: 'quadricipite (davanti)',
    punti: [[8, 180], [28, 180], [31, 210], [27, 242], [13, 242], [8, 208]],
  },
  femorale: {
    vista: 'retro', nome: 'femorale (dietro)',
    punti: [[8, 186], [28, 186], [31, 216], [27, 244], [13, 244], [8, 212]],
  },
  polpaccio: {
    vista: 'retro', nome: 'polpaccio (gemelli e soleo)',
    punti: [[10, 250], [28, 250], [29, 274], [23, 292], [13, 290], [9, 268]],
  },
  glutei: {
    vista: 'retro', nome: 'glutei',
    punti: [[6, 158], [28, 158], [31, 176], [19, 186], [7, 178]],
  },

  // ---- core ----
  addome: {
    vista: 'fronte', nome: 'addome',
    // sta al centro e non si specchia
    centrato: true,
    punti: [[-11, 122], [11, 122], [12, 143], [11, 164], [-11, 164], [-12, 143]],
  },
};

export function zoneDiVista(vista) {
  return Object.keys(ZONE).filter((id) => ZONE[id].vista === vista || ZONE[id].vista === 'entrambe');
}

/** Il pezzo di muscolo da accendere per un id di `PARTI`. */
export function idZonaDaParte(parteId) {
  return parteId in ZONE ? parteId : null;
}

const sposta = (d) => d.replace(/-?\d+(\.\d+)?/g, (s, _f, off) => {
  // sposta solo le X: il numero e' preceduto da "x," oppure da "M "/"L "/"C "
  return s;
});

/** Costruisce il `d` di una forma, già traslata sul centro del figurino. */
function pathDi(punti) {
  const scalati = punti.map(([x, y]) => [CENTRO + x, y]);
  return curvaChiusa(scalati);
}

/**
 * Il disegno di un figurino, come stringa SVG.
 *
 * `acceso` è il pezzo di muscolo da colorare di viola: tutti gli altri restano
 * spenti, così si vede subito DOVE lavori.
 */
export function figurino(vista, acceso = null) {
  const g = GUSCIO[vista];
  const fuori = ['<g class="corpo-guscio">'];

  // il corpo, in un pezzo solo così non si vedono i punti di giunzione
  const guscio = [...g.forme].map((p) => pathDi(p));
  fuori.push(`<path d="${guscio[0]}"/>`);
  for (let i = 1; i < guscio.length; i++) fuori.push(`<path d="${guscio[i]}"/>`);
  // braccia e gambe dalla parte opposta
  for (const p of [BRACCIO, MANO, GAMBA, PIEDE]) {
    fuori.push(`<path d="${pathDi(specchio(p))}"/>`);
  }
  fuori.push('</g>');

  // i capelli
  fuori.push(`<path class="capelli" d="${pathDi(g.capelli)}"/>`);
  if (g.volto.length) {
    fuori.push('<g class="volto">');
    for (const pts of g.volto) fuori.push(`<path d="${pathDi(pts)}"/>`);
    fuori.push('</g>');
  }
  if (g.extra.length) {
    fuori.push('<g class="linee linee-' + (vista === 'retro' ? 'spina' : 'fronte') + '">');
    for (const f of g.extra) {
      const pts = f.cerchio ? cerchio(f.cerchio) : f;
      fuori.push(`<path d="${pathDi(pts)}"/>`);
    }
    fuori.push('</g>');
  }

  // i muscoli: spenti, e acceso quello giusto
  for (const id of zoneDiVista(vista)) {
    const accesoOra = acceso === id;
    fuori.push(`<g class="muscolo${accesoOra ? ' acceso' : ''}" data-muscolo="${id}">`);
    const z = ZONE[id];
    const daDisegnare = z.centrato ? [z.punti] : [z.punti, specchio(z.punti)];
    for (const pts of daDisegnare) fuori.push(`<path d="${pathDi(pts)}"/>`);
    fuori.push('</g>');
  }
  // L'ETICHETTA. Sta DENTRO il disegno e non nella didascalia perché sul
  // telefono la didascalia va a capo e l'etichetta sparirebbe: e quella che
  // dice se stai guardando il davanti o il dietro.
  fuori.push(`<text class="vista-label" x="${CENTRO}" y="${A - 6}" text-anchor="middle">`
    + (vista === 'retro' ? 'DIETRO' : 'FRONTE') + '</text>');

  return fuori.join('');
}