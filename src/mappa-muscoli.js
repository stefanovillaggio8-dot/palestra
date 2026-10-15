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

// ---------------------------------------------------------------------------
// I GRUPPI: UN MUSCOLO, UN PEZZO.
//
// Ste (13/10/2026): "i muscoli formati da piu parti muscolari falli uniti,
// come nella foto". Nella foto di riferimento il pettorale e' UN muscolo giallo,
// non due o tre macchie: dentro ci sono delle linee sottili che lo dividono, ma
// il contorno e' uno solo. Il bicipite idem: un pezzo, non due.
//
// Quindi qui sotto ogni gruppo e' una sagoma sola. Le "linee" dentro non
// dividono il disegno: sono le stesse linee bianche della foto, e servono a
// far capire che quel muscolo ha più capi senza fingere che siano muscoli
// diversi.
//
// Ogni gruppo ha: la vista in cui si vede, i punti della sagoma (scritti sul
// lato destro, il sinistro e' lo specchio) e le linee interne.
// ---------------------------------------------------------------------------

export const GRUPPI = {
  // ---- petto: tutto il pettorale, alto centro e basso insieme ----
  petto: {
    vista: 'fronte',
    punti: [[5, 76], [24, 74], [40, 80], [46, 93], [40, 111], [28, 121], [14, 118], [6, 104]],
    linee: [[[7, 90], [41, 88]], [[7, 105], [39, 103]]],
  },

  // ---- braccio: il bicipite e' un pezzo solo, alto e basso ----
  bicipite: {
    vista: 'fronte',
    punti: [[41, 104], [54, 106], [58, 129], [55, 151], [46, 152], [42, 130]],
    linee: [[[43, 128], [57, 126]]],
  },

  avambraccio: {
    vista: 'fronte',
    punti: [[46, 170], [58, 172], [61, 193], [55, 210], [49, 207], [47, 188]],
    linee: [],
  },

  // ---- spalle ----
  deltoide_fronte: {
    vista: 'fronte',
    punti: [[37, 74], [51, 76], [59, 88], [55, 105], [44, 106], [37, 94]],
    linee: [],
  },
  deltoide_posteriore: {
    vista: 'retro',
    punti: [[37, 74], [51, 76], [59, 88], [55, 105], [44, 106], [37, 94]],
    linee: [],
  },
  // il deltoide di lato si vede da tutte e due le viste: e' la spalla di profilo
  deltoide_laterale: {
    vista: 'entrambe',
    punti: [[52, 82], [63, 92], [64, 108], [55, 116], [50, 102], [50, 90]],
    linee: [],
  },

  // ---- addome: un pezzo solo con le fette dentro, come nella foto ----
  addome: {
    vista: 'fronte', centrato: true,
    punti: [[-13, 120], [13, 120], [14, 167], [-14, 167]],
    linee: [[[-13, 137], [13, 137]], [[-13, 152], [13, 152]]],
  },

  // ---- gambe ----
  quadricipite: {
    vista: 'fronte',
    punti: [[8, 180], [29, 180], [32, 212], [28, 245], [13, 245], [8, 208]],
    linee: [],
  },
  femorale: {
    vista: 'retro',
    punti: [[8, 186], [29, 186], [32, 218], [28, 247], [13, 247], [8, 212]],
    linee: [],
  },
  polpaccio: {
    vista: 'retro',
    punti: [[10, 250], [29, 250], [30, 276], [23, 295], [13, 293], [9, 268]],
    linee: [],
  },
  glutei: {
    vista: 'retro',
    punti: [[6, 158], [28, 158], [31, 179], [19, 189], [7, 178]],
    linee: [],
  },

  // ---- schiena ----
  // il trapezio fa da un pezzo solo, da una spalla all'altra
  trapezio: {
    vista: 'retro', centrato: true,
    punti: [[-39, 77], [-24, 67], [0, 64], [24, 67], [39, 77], [26, 95], [12, 103], [-12, 103], [-26, 95]],
    linee: [],
  },
  dorsale: {
    vista: 'retro',
    punti: [[13, 98], [34, 95], [48, 106], [45, 133], [31, 157], [16, 150], [14, 122]],
    linee: [],
  },
  romboidi: {
    vista: 'retro', centrato: true,
    punti: [[-14, 100], [14, 100], [15, 127], [14, 151], [-14, 151], [-15, 127]],
    linee: [],
  },

  // ---- dietro del braccio: il tricipite ----
  tricipite: {
    vista: 'retro',
    punti: [[41, 105], [55, 107], [59, 129], [55, 151], [45, 149], [40, 126]],
    linee: [[[43, 128], [57, 126]]],
  },
};

// I PEZZI CHE L'APP CONOSCE, e il gruppo in cui sono disegnati.
//
// Qui non c'e' più nessuna forma: solo il nome e il gruppo. Se domani aggiungi un
// pezzo di muscolo e gli dimentichi il gruppo, il test Z1 fallisce.
export const ZONE = {
  petto_alto: { nome: 'parte alta del petto', gruppo: 'petto' },
  petto_centrale: { nome: 'petto nel mezzo', gruppo: 'petto' },
  petto_basso: { nome: 'parte bassa del petto', gruppo: 'petto' },
  dorso_alto: { nome: 'parte alta del dorso (trapezio)', gruppo: 'trapezio' },
  dorso_centrale: { nome: 'dorso centrale', gruppo: 'romboidi' },
  dorso_lati: { nome: 'dorso ai lati (lati del triangolare)', gruppo: 'dorsale' },
  spalle_frontali: { nome: 'spalle davanti (deltoide anteriore)', gruppo: 'deltoide_fronte' },
  spalle_posteriori: { nome: 'spalle posteriori (deltoide posteriore)', gruppo: 'deltoide_posteriore' },
  spalle_laterali: { nome: 'spalle laterali (deltoide laterale)', gruppo: 'deltoide_laterale' },
  braccio_alto: { nome: 'bicipite: braccio in alto', gruppo: 'bicipite' },
  braccio_basso: { nome: 'bicipite: braccio in basso', gruppo: 'bicipite' },
  avambraccio: { nome: 'avambraccio (polso e avanti braccio)', gruppo: 'avambraccio' },
  spalla_gomito: { nome: 'tricipite: sopra il gomito', gruppo: 'tricipite' },
  quadricipite: { nome: 'quadricipite (davanti)', gruppo: 'quadricipite' },
  femorale: { nome: 'femorale (dietro)', gruppo: 'femorale' },
  polpaccio: { nome: 'polpaccio (gemelli e soleo)', gruppo: 'polpaccio' },
  glutei: { nome: 'glutei', gruppo: 'glutei' },
  addome: { nome: 'addome', gruppo: 'addome' },
};

/** Tutti i gruppi che si vedono da una certa vista. */
export function gruppiDiVista(vista) {
  return Object.keys(GRUPPI).filter((k) => GRUPPI[k].vista === vista || GRUPPI[k].vista === 'entrambe');
}

/** Il gruppo che disegna un certo pezzo di muscolo. */
export function gruppoDiParte(parteId) {
  return parteId in ZONE ? ZONE[parteId].gruppo : null;
}

export function zoneDiVista(vista) {
  return Object.keys(ZONE).filter((id) => {
    const g = GRUPPI[ZONE[id].gruppo];
    return g.vista === vista || g.vista === 'entrambe';
  });
}

export function idZonaDaParte(parteId) {
  return parteId in ZONE ? parteId : null;
}

const sposta = (d) => d.replace(/-?\d+(\.\d+)?/g, (s, _f, off) => {
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
 * `acceso` e' il pezzo di muscolo da colorare di viola: si accende tutto il
 * gruppo che lo contiene, perché il pettorale e' un muscolo solo e accenderne
 * un terzo sembrerebbe che ne stai lavorando un terzo.
 */
export function figurino(vista, acceso = null) {
  const g = GUSCIO[vista];
  const fuori = ['<g class="corpo-guscio">'];

  const guscio = [...g.forme].map((p) => pathDi(p));
  fuori.push(`<path d="${guscio[0]}"/>`);
  for (let i = 1; i < guscio.length; i++) fuori.push(`<path d="${guscio[i]}"/>`);
  for (const p of [BRACCIO, MANO, GAMBA, PIEDE]) {
    fuori.push(`<path d="${pathDi(specchio(p))}"/>`);
  }
  fuori.push('</g>');

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

  // I muscoli: un pezzo per gruppo, e dentro le linee sottili come nella foto.
  const accesoGruppo = acceso ? ZONE[acceso].gruppo : null;
  for (const chiave of gruppiDiVista(vista)) {
    const gruppo = GRUPPI[chiave];
    const accesoOra = chiave === accesoGruppo;
    fuori.push(`<g class="muscolo${accesoOra ? ' acceso' : ''}" data-gruppo="${chiave}">`);
    const daDisegnare = gruppo.centrato ? [gruppo.punti] : [gruppo.punti, specchio(gruppo.punti)];
    for (const pts of daDisegnare) fuori.push(`<path d="${pathDi(pts)}"/>`);
    if (gruppo.linee && gruppo.linee.length) {
      fuori.push('<g class="linee-muscolo">');
      const lati = gruppo.centrato ? [1] : [1, -1];
      for (const lato of lati) {
        for (const [a, b] of gruppo.linee) fuori.push(`<path d="${pathDi(linea([a[0] * lato, a[1]], [b[0] * lato, b[1]], 1.6))}"/>`);
      }
      fuori.push('</g>');
    }
    fuori.push('</g>');
  }

  fuori.push(`<text class="vista-label" x="${CENTRO}" y="${A - 6}" text-anchor="middle">`
    + (vista === 'retro' ? 'DIETRO' : 'FRONTE') + '</text>');

  return fuori.join('');
}
