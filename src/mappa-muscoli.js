// mappa-muscoli.js -- l'omino che dice DOVE lavori.
//
// Ste (13/10/2026), dall'esercizio: "voglio che spunti questo omino con il
// muscolo allenato colorato di viola se possibile, non di giallo".
//
// LA COLLEZIONE DEVE ESSERE ESATTA, quindi qui sotto ogni forma ha un nome e un
// posto, e i nomi sono gli stessi di `PARTI` in muscoli-parti.js. Se un giorno
// aggiungi un pezzo di muscolo e non gli disegni niente, il test Z1 fallisce e
// te lo dice: non può succedere in silenzio.
//
// LE MISURE: il corpo e' alto 330 e largo 210. Il centro sta a x = 0, e ogni
// forma si scrive con la distanza dal centro: così il sinistro e' lo specchio
// del destro e non possono sbagliarsi.
//
// L'ANATOMIA, pezzo per pezzo (e il posto dove va, di fronte e di dietro):
//
//   PETTO            davanti
//     petto_alto      clavicolare: in alto, sotto la clavicola
//     petto_centrale  sternale: nel mezzo, sotto il clavicolare
//     petto_basso     sternale in basso, verso lo sterno
//   DORSO            dietro
//     dorso_alto      trapezio: dalla nuca alle spalle
//     dorso_centrale  romboidi: fra le scapole, in mezzo
//     dorso_lati      dorsali larghi: i lati, sotto le ascelle
//   SPALLE
//     spalle_frontali    deltoide davanti: la spalla di fronte
//     spalle_laterali    deltoide di lato: si vede da entrambe le viste
//     spalle_posteriori  deltoide dietro: la spalla di dietro
//   BRACCIO
//     braccio_alto     bicipite, parte alta, davanti
//     braccio_basso    bicipite, parte bassa, davanti
//     spalla_gomito    tricipite: dietro al braccio, SOLO dietro
//     avambraccio      sotto il gomito, davanti
//   GAMBE
//     quadricipite     davanti alla coscia
//     femorale         dietro alla coscia
//     polpaccio        dietro al polpaccio (gemelli e soleo)
//     glutei           il sedere
//   CORE
//     addome           davanti, a fette

export const L = 210;
export const A = 330;
export const CENTRO = L / 2;

// IL CORPO. Poligoni chiusi, disegnati una volta e specchiati.
const BUSTO_DAVANTI = [
  [-40, 56], [40, 56], [33, 92], [26, 116], [33, 140],
  [-33, 140], [-26, 116], [-33, 92],
];
const BUSTO_DIETRO = [
  [-40, 56], [40, 56], [34, 92], [27, 116], [33, 140],
  [-33, 140], [-27, 116], [-34, 92],
];
const BRACCIO = [[40, 60], [52, 66], [50, 178], [38, 178], [37, 66]];
const GAMBA_DAVANTI = [[-32, 138], [-6, 138], [-8, 292], [-22, 292], [-28, 200]];
const GAMBA_DIETRO = [[-32, 138], [-6, 138], [-8, 292], [-22, 292], [-28, 200]];
const COLLO = [[-8, 44], [8, 44], [8, 58], [-8, 58]];
const PIEDE_DAVANTI = [[-26, 292], [-8, 292], [-6, 300], [-30, 300]];
const PIEDE_DIETRO = [[-26, 292], [-8, 292], [-6, 300], [-30, 300]];
const MANO = [[38, 178], [50, 178], [49, 192], [39, 192]];

/** Il guscio del corpo, per vista. */
export const CORPO = {
  fronte: {
    testa: { cy: 28, r: 18 },
    poligoni: [BUSTO_DAVANTI, COLLO, BRACCIO, GAMBA_DAVANTI, PIEDE_DAVANTI, MANO],
  },
  retro: {
    testa: { cy: 28, r: 18 },
    poligoni: [BUSTO_DIETRO, COLLO, BRACCIO, GAMBA_DIETRO, PIEDE_DIETRO, MANO],
  },
};

/**
 * Ogni zona: dove sta e che forma ha.
 *
 * `dx` e' la distanza dal centro del corpo. `doppio: false` vuol dire che la zona
 * c'e' una volta sola al centro (gli addomi, la testa del trapezio).
 */
export const ZONE = {
  // ---- petto ----
  petto_alto: {
    vista: 'fronte', nome: 'parte alta del petto',
    forme: [{ tipo: 'ellisse', dx: 17, cy: 66, rx: 12, ry: 6 }],
  },
  petto_centrale: {
    vista: 'fronte', nome: 'petto nel mezzo',
    forme: [{ tipo: 'ellisse', dx: 18, cy: 77, rx: 13, ry: 7 }],
  },
  petto_basso: {
    vista: 'fronte', nome: 'parte bassa del petto',
    forme: [{ tipo: 'ellisse', dx: 17, cy: 88, rx: 12, ry: 6 }],
  },

  // ---- dorso ----
  dorso_alto: {
    vista: 'retro', nome: 'parte alta del dorso (trapezio)',
    forme: [{ tipo: 'poligono', punti: [[-30, 54], [30, 54], [16, 72], [-16, 72]], doppio: false }],
  },
  dorso_centrale: {
    vista: 'retro', nome: 'dorso centrale',
    forme: [{ tipo: 'ellisse', dx: 0, cy: 86, rx: 7, ry: 15, doppio: false }],
  },
  dorso_lati: {
    vista: 'retro', nome: 'dorso ai lati (lati del triangolare)',
    forme: [{ tipo: 'poligono', punti: [[11, 72], [32, 80], [23, 114], [12, 108]] }],
  },

  // ---- spalle ----
  spalle_frontali: {
    vista: 'fronte', nome: 'spalle davanti (deltoide anteriore)',
    forme: [{ tipo: 'ellisse', dx: 34, cy: 63, rx: 10, ry: 9 }],
  },
  spalle_posteriori: {
    vista: 'retro', nome: 'spalle posteriori (deltoide posteriore)',
    forme: [{ tipo: 'ellisse', dx: 33, cy: 63, rx: 11, ry: 10 }],
  },
  spalle_laterali: {
    vista: 'entrambe', nome: 'spalle laterali (deltoide laterale)',
    forme: [{ tipo: 'ellisse', dx: 42, cy: 66, rx: 6, ry: 8 }],
  },

  // ---- braccio ----
  braccio_alto: {
    vista: 'fronte', nome: 'bicipite: braccio in alto',
    forme: [{ tipo: 'ellisse', dx: 44, cy: 88, rx: 7, ry: 14 }],
  },
  braccio_basso: {
    vista: 'fronte', nome: 'bicipite: braccio in basso',
    forme: [{ tipo: 'ellisse', dx: 44, cy: 110, rx: 7, ry: 11 }],
  },
  avambraccio: {
    vista: 'fronte', nome: 'avambraccio (polso e avanti braccio)',
    forme: [{ tipo: 'ellisse', dx: 45, cy: 138, rx: 6, ry: 15 }],
  },
  // Il tricipite sta dietro al braccio: davanti non si vede, e disegnarlo
  // davanti sarebbe sbagliato.
  spalla_gomito: {
    vista: 'retro', nome: 'tricipite: sopra il gomito',
    forme: [{ tipo: 'ellisse', dx: 44, cy: 96, rx: 7, ry: 16 }],
  },

  // ---- gambe ----
  quadricipite: {
    vista: 'fronte', nome: 'quadricipite (davanti)',
    forme: [{ tipo: 'ellisse', dx: 19, cy: 170, rx: 11, ry: 26 }],
  },
  femorale: {
    vista: 'retro', nome: 'femorale (dietro)',
    forme: [{ tipo: 'ellisse', dx: 19, cy: 170, rx: 11, ry: 26 }],
  },
  polpaccio: {
    vista: 'retro', nome: 'polpaccio (gemelli e soleo)',
    forme: [{ tipo: 'ellisse', dx: 15, cy: 232, rx: 9, ry: 18 }],
  },
  glutei: {
    vista: 'retro', nome: 'glutei',
    forme: [{ tipo: 'ellisse', dx: 19, cy: 146, rx: 11, ry: 12 }],
  },

  // ---- core ----
  addome: {
    vista: 'fronte', nome: 'addome',
    forme: [{ tipo: 'ellisse', dx: 0, cy: 116, rx: 8, ry: 18, doppio: false }],
  },
};

/** Tutte le zone che si vedono da una certa vista. */
export function zoneDiVista(vista) {
  return Object.keys(ZONE).filter((id) => ZONE[id].vista === vista || ZONE[id].vista === 'entrambe');
}

/** Il pezzo di muscolo da accendere per un id di `PARTI`. */
export function idZonaDaParte(parteId) {
  return parteId in ZONE ? parteId : null;
}

function forma(f, lato) {
  const dx = f.dx * lato;
  if (f.tipo === 'ellisse') {
    return `<ellipse cx="${CENTRO + dx}" cy="${f.cy}" rx="${f.rx}" ry="${f.ry}"/>`;
  }
  return `<polygon points="${f.punti.map(([x, y]) => `${CENTRO + x * lato},${y}`).join(' ')}"/>`;
}

/**
 * Il disegno di un figurino, come stringa SVG.
 *
 * `acceso` e' il pezzo di muscolo da colorare di viola: tutti gli altri restano
 * grigi, cosi si vede subito DOVE lavori.
 */
export function figurino(vista, acceso = null) {
  const fuori = [];
  const c = CORPO[vista];
  fuori.push('<g class="corpo-guscio">');
  fuori.push(`<circle cx="${CENTRO}" cy="${c.testa.cy}" r="${c.testa.r}"/>`);
  for (const poly of c.poligoni) {
    const dx = poly.map(([x, y]) => `${CENTRO + x},${y}`).join(' ');
    const specchio = poly.map(([x, y]) => `${CENTRO - x},${y}`).join(' ');
    const simmetrico = poly.every(([x]) => x === 0);
    fuori.push(`<polygon points="${dx}"/>`);
    if (!simmetrico) fuori.push(`<polygon points="${specchio}"/>`);
  }
  fuori.push('</g>');

  for (const id of zoneDiVista(vista)) {
    const accesoOra = acceso === id;
    fuori.push(`<g class="muscolo${accesoOra ? ' acceso' : ''}" data-muscolo="${id}">`);
    for (const f of ZONE[id].forme) {
      if (f.doppio === false) fuori.push(forma(f, 1));
      else fuori.push(forma(f, 1), forma(f, -1));
    }
    fuori.push('</g>');
  }
  return fuori.join('');
}