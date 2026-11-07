// Miniature corrette: alcune foto storiche erano COPIE IDENTICHE per esercizi
// completamente diversi (Face Pull -> EZ Bar Curl, row -> Bench Press, ecc.).
// Spritesheet originale leggera, 4 colonne x 3 righe; non altera i dati esercizi.
// Gli esercizi non elencati mantengono le proprie immagini e le foto personali.
import { el } from './ui.js';

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
});

export function posizioneIconaCorretta(esercizio) {
  if (!esercizio?.id || !String(esercizio?.foto || '').includes('img/esercizi/')) return null;
  const pos = POSIZIONI_ICONE_CORRETTE[esercizio.id];
  if (!pos) return null;
  return {
    x: pos[0] * 100 / 3,
    y: pos[1] * 50,
  };
}

export function miniaturaEsercizio(esercizio, grande = false) {
  const classe = 'foto-esercizio' + (grande ? ' grande' : '');
  const pos = posizioneIconaCorretta(esercizio);
  if (!pos) {
    return el('img', {
      src: esercizio?.foto || './img/esercizi/chest-press.png',
      alt: '', class: classe, loading: 'lazy',
    });
  }
  // CSS background-position ritaglia UNA cella senza deformarla. Un solo asset
  // occupa meno cache di dodici risorse separate, anche nella PWA iOS.
  return el('span', {
    class: classe + ' foto-esercizio-sprite',
    role: 'img',
    aria: { label: 'Illustrazione di ' + String(esercizio?.nome || 'esercizio') },
    style: '--sprite-x:' + pos.x + '%;--sprite-y:' + pos.y + '%',
  });
}
