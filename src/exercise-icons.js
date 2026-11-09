// Miniature corrette: alcune foto storiche erano COPIE IDENTICHE per esercizi
// completamente diversi (Face Pull -> EZ Bar Curl, row -> Bench Press, ecc.).
// v456: nove pose biomeccaniche corrette su sfondo viola; nessun dato personale modificato.
// Gli esercizi non elencati mantengono le proprie immagini e le foto personali.
import { el } from './ui.js';

// ID storico: si chiama ancora ex-lying-cable-curl per non perdere lo storico.
// Il movimento reale è Incline Single Arm Pulldown, con PETTO sul supporto.
export const FOTO_INCLINE_PULLDOWN_CORRETTA = 'img/esercizi/verificati-v456/ex-lying-cable-curl.webp';

// Coordinate [colonna, riga] per 79 esercizi, atlante 8 x 10.
// Una cella distinta per ogni ID; la variante Incline Single Arm Pulldown
// continua a usare il SVG biomeccanico dedicato e non la propria cella.
export const POSIZIONI_ICONE_CORRETTE = Object.freeze({
  'ex-one-arm-overhead-tricep-extension': [0, 0],
  'ex-chest-press': [1, 0],
  'ex-cable-hammer-curl': [2, 0],
  'ex-cable-lateral-raise': [3, 0],
  'ex-cable-overhead-tricep': [4, 0],
  'ex-leg-extension': [5, 0],
  'ex-wide-grip-lat-pulldown': [6, 0],
  'ex-neutral-grip-lat-pulldown': [7, 0],
  'ex-dumbbell-bench-pull': [0, 1],
  'ex-seated-db-shoulder-press': [1, 1],
  'ex-cable-fly': [2, 1],
  'ex-scott-bench-curl': [3, 1],
  'ex-single-arm-tricep-pushdown': [4, 1],
  'ex-seated-leg-curl': [5, 1],
  'ex-smith-incline-bench': [6, 1],
  'ex-seated-cable-row': [7, 1],
  'ex-chest-supported-shrug': [0, 2],
  'ex-sled-press-calf-raise': [1, 2],
  'ex-single-leg-press': [2, 2],
  'ex-one-arm-preacher-curl': [3, 2],
  'ex-one-arm-cable-reverse-fly': [4, 2],
  'ex-pull-ups': [5, 2],
  'ex-dips': [6, 2],
  'ex-wrist-curl': [7, 2],
  'ex-iso-lateral-row': [0, 3],
  'ex-lat-pulldown-lats': [1, 3],
  'ex-db-lateral-raise': [2, 3],
  'ex-incline-side-lying-lateral-raise': [4, 3],
  'ex-iso-lateral-low-row': [5, 3],
  'ex-hammer-curl-dumbbell': [6, 3],
  'ex-high-to-low-cable-fly': [7, 3],
  'ex-dumbbell-reverse-fly': [0, 4],
  'ex-dumbbell-row': [1, 4],
  'ex-dumbbell-spider-curl': [2, 4],
  'ex-iso-lateral-high-row': [3, 4],
  'ex-double-kettlebell-row': [4, 4],
  'ex-dumbbell-bench-press': [5, 4],
  'ex-dumbbell-concentration-curl': [6, 4],
  'ex-dumbbell-curl': [7, 4],
  'ex-dumbbell-deadlift': [0, 5],
  'ex-dumbbell-face-pull': [1, 5],
  'ex-incline-bench-press': [2, 5],
  'ex-incline-cable-curl': [3, 5],
  'ex-incline-dumbbell-bench-press': [4, 5],
  'ex-incline-dumbbell-curl': [5, 5],
  'ex-incline-hammer-curl': [6, 5],
  'ex-strict-curl-ez-wall': [7, 5],
  'ex-ez-bar-curl': [0, 6],
  'ex-ez-bar-lying-tricep-extension': [1, 6],
  'ex-ez-bar-preacher-curl': [2, 6],
  'ex-ez-bar-spider-curl': [3, 6],
  'ex-seated-dumbbell-curl': [4, 6],
  'ex-seated-dumbbell-lateral-raise': [5, 6],
  'ex-seated-dumbbell-tricep-extension': [6, 6],
  'ex-seated-hammer-curl': [7, 6],
  'ex-shoulder-pin-press': [0, 7],
  'ex-bench-pin-press': [1, 7],
  'ex-bench-press': [2, 7],
  'ex-bench-pull': [3, 7],
  'ex-bent-arm-barbell-pullover': [4, 7],
  'ex-bent-over-dumbbell-row': [5, 7],
  'ex-bent-over-row': [6, 7],
  'ex-cable-bicep-curl': [7, 7],
  'ex-cable-chest-press': [0, 8],
  'ex-cable-crunch': [1, 8],
  'ex-cable-reverse-fly': [2, 8],
  'ex-deadlift': [3, 8],
  'ex-decline-bench-press': [4, 8],
  'ex-decline-dumbbell-bench-press': [5, 8],
  'ex-face-pull': [6, 8],
  'ex-back-extension': [7, 8],
  'ex-back-extension-chest': [0, 9],
  'ex-back-extension-hanging': [1, 9],
  'ex-smith-machine-bench-press': [2, 9],
  'ex-smith-machine-bent-over-row': [3, 9],
  'ex-smith-machine-shrug': [4, 9],
  'ex-trazioni-corpo-libero': [5, 9],
  'ex-dips-corpo-libero': [6, 9],
});

export function posizioneIconaCorretta(esercizio) {
  if (!esercizio?.id || !String(esercizio?.foto || '').includes('img/esercizi/')) return null;
  const pos = POSIZIONI_ICONE_CORRETTE[esercizio.id];
  if (!pos) return null;
  return {
    x: pos[0] * 100 / 7,
    y: pos[1] * 100 / 9,
  };
}

// Le icone delle vecchie versioni avevano figure minuscole e margini molto
// diversi. Zoom moderati, specifici per le sole illustrazioni piccole;
// l'inquadratura viene sempre contenuta nel riquadro, senza object-fit:cover.
export const ZOOM_ICONE_STORICHE = Object.freeze({
  'ex-back-extension': 1.28,
  'ex-back-extension-chest': 1.28,
  'ex-lat-pulldown-lats': 1.17,
  'ex-cable-fly': 1.13,
  'ex-cable-hammer-curl': 1.12,
  'ex-bench-press': 1.12,
  'ex-incline-bench-press': 1.11,
  'ex-seated-cable-row': 1.11,
});

// Una nuova immagine con l'attrezzo SBAGLIATO è peggio di una miniatura
// storica meno nitida. Queste sette varianti conservano la posa specifica
// già disponibile finché il disegno nuovo non supera la verifica manuale.
// Non alterare le foto degli esercizi personalizzati.
export const FOTO_VERIFICATE_TECNICAMENTE = Object.freeze({
  "ex-seated-dumbbell-lateral-raise": "img/esercizi/verificati-v456/ex-seated-dumbbell-lateral-raise.webp",
  "ex-iso-lateral-high-row": "img/esercizi/verificati-v456/ex-iso-lateral-high-row.webp",
  "ex-one-arm-cable-reverse-fly": "img/esercizi/verificati-v456/ex-one-arm-cable-reverse-fly.webp",
  "ex-single-arm-tricep-pushdown": "img/esercizi/verificati-v456/ex-single-arm-tricep-pushdown.webp",
  "ex-cable-overhead-tricep": "img/esercizi/verificati-v456/ex-cable-overhead-tricep.webp",
  "ex-one-arm-overhead-tricep-extension": "img/esercizi/uniformi-v455/ex-one-arm-overhead-tricep-extension.webp",
  "ex-scott-bench-curl": "img/esercizi/cad-curl-app.jpg",
  "ex-chest-supported-shrug": "img/esercizi/uniformi-v455/ex-chest-supported-shrug.webp",
  "ex-lat-pulldown-lats": "img/esercizi/verificati-v456/ex-lat-pulldown-lats.webp",
  "ex-bench-pull": "img/esercizi/bench-pull-v453.webp",
  "ex-smith-machine-bent-over-row": "img/esercizi/uniformi-v455/ex-smith-machine-bent-over-row.webp",
  "ex-smith-machine-shrug": "img/esercizi/uniformi-v455/ex-smith-machine-shrug.webp",
  // v452: tre illustrazioni tecniche dedicate; non sostituire le 76 già verificate.
  "ex-dips": "img/esercizi/verificati-v456/ex-dips.webp",
  "ex-wrist-curl": "img/esercizi/uniformi-v455/ex-wrist-curl.svg",
  "ex-strict-curl-ez-wall": "img/esercizi/verificati-v456/ex-strict-curl-ez-wall.webp",
  "ex-dumbbell-face-pull": "img/esercizi/uniformi-v455/ex-dumbbell-face-pull.webp",
  "ex-bent-over-row": "img/esercizi/uniformi-v455/ex-bent-over-row.webp",
});

export function sorgenteMiniatura(esercizio) {
  if (esercizio?.id === 'ex-lying-cable-curl') {
    return { tipo: 'dedicata', src: FOTO_INCLINE_PULLDOWN_CORRETTA, zoom: 1 };
  }
  const preferita = FOTO_VERIFICATE_TECNICAMENTE[esercizio?.id];
  if (preferita) return { tipo: 'originale', src: preferita, zoom: (preferita.includes("/uniformi-v455/") || preferita.includes("/verificati-v456/")) || esercizio?.id === "ex-bench-pull" ? 1 : 1.04 };
  const posizione = posizioneIconaCorretta(esercizio);
  if (posizione) return { tipo: 'sprite', ...posizione, zoom: 1 };
  return {
    tipo: 'originale',
    src: esercizio?.foto || './img/esercizi/chest-press.png',
    zoom: ZOOM_ICONE_STORICHE[esercizio?.id] || 1.08,
  };
}

// UN SOLO componente per tutto il catalogo. Sfondo, dimensioni, margine,
// maschera e tonalita' sono uguali su PC/iPhone; soltanto il disegno
// dell'esercizio cambia. Non modificare mai i record o il path personale.
export function miniaturaEsercizio(esercizio, grande = false) {
  const fonte = sorgenteMiniatura(esercizio);
  const classe = 'foto-esercizio foto-esercizio-uniforme' + (grande ? ' grande' : '');
  const contenitore = el('span', {
    class: classe,
    role: 'img',
    aria: { label: 'Illustrazione di ' + String(esercizio?.nome || 'esercizio') },
  });

  if (fonte.tipo === 'sprite') {
    contenitore.appendChild(el('span', {
      class: 'foto-esercizio-arte foto-esercizio-sprite',
      style: '--sprite-x:' + fonte.x + '%;--sprite-y:' + fonte.y + '%',
      'aria-hidden': 'true',
    }));
  } else {
    contenitore.appendChild(el('img', {
      src: fonte.src,
      alt: '',
      class: 'foto-esercizio-arte foto-esercizio-arte-originale',
      style: '--icon-zoom:' + fonte.zoom,
      loading: 'lazy',
      decoding: 'async',
      'aria-hidden': 'true',
    }));
  }
  return contenitore;
}
