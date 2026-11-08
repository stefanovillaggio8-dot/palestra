// Miniature corrette: alcune foto storiche erano COPIE IDENTICHE per esercizi
// completamente diversi (Face Pull -> EZ Bar Curl, row -> Bench Press, ecc.).
// 16 illustrazioni originali con fondo e cerchio VIOLA, non nero/fotografico; nessun dato personale modificato.
// Gli esercizi non elencati mantengono le proprie immagini e le foto personali.
import { el } from './ui.js';

// ID storico: si chiama ancora ex-lying-cable-curl per non perdere lo storico.
// Il movimento reale è Incline Single Arm Pulldown, con PETTO sul supporto.
export const FOTO_INCLINE_PULLDOWN_CORRETTA = 'img/esercizi/incline-single-arm-pulldown-v446.svg';

export const POSIZIONI_ICONE_CORRETTE = Object.freeze({
  'ex-iso-lateral-low-row': [0, 0],
  'ex-iso-lateral-row': [1, 0],
  'ex-high-to-low-cable-fly': [2, 0],
  'ex-dumbbell-reverse-fly': [3, 0],
  'ex-dumbbell-row': [0, 1],
  'ex-dumbbell-spider-curl': [1, 1],
  'ex-iso-lateral-high-row': [2, 1],
  'ex-double-kettlebell-row': [3, 1],
  'ex-dumbbell-bench-press': [0, 2],
  'ex-dumbbell-bench-pull': [1, 2],
  'ex-face-pull': [2, 2],
  'ex-wide-grip-lat-pulldown': [3, 2],
  'ex-cable-bicep-curl': [0, 3],
  'ex-ez-bar-lying-tricep-extension': [1, 3],
  'ex-incline-dumbbell-bench-press': [2, 3],
  'ex-back-extension-hanging': [3, 3],
});

export function posizioneIconaCorretta(esercizio) {
  if (!esercizio?.id || !String(esercizio?.foto || '').includes('img/esercizi/')) return null;
  const pos = POSIZIONI_ICONE_CORRETTE[esercizio.id];
  if (!pos) return null;
  return {
    x: pos[0] * 100 / 3,
    y: pos[1] * 100 / 3,
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

export function sorgenteMiniatura(esercizio) {
  if (esercizio?.id === 'ex-lying-cable-curl') {
    return { tipo: 'dedicata', src: FOTO_INCLINE_PULLDOWN_CORRETTA, zoom: 1 };
  }
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
