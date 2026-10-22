import { parteDiMuscolo } from '../src/muscoli-parti.js';
import { RITAGLI } from '../src/mappa-muscoli.js';

const ETICHETTE = {
  petto: 'petto', dorsale: 'dorso', romboidi: 'dorso centrale', trapezio: 'trapezi',
  deltoide_fronte: 'deltoide', deltoide_posteriore: 'deltoide dietro', bicipite: 'bicipiti',
  tricipite: 'tricipiti', avambraccio: 'avambraccio', quadricipite: 'quadricipiti',
  femorale: 'femorali', polpaccio: 'polpacci', glutei: 'glutei', addome: 'addome',
  brachiale: 'brachiale', brachioradiale: 'brachioradiale',
};

for (const nome of ['Cable Lateral Raise', 'Dumbbell Lateral Raise', 'Seated Dumbbell Lateral Raise', 'Incline Side Lying Lateral Raise', 'Shoulder Pin Press']) {
  const p = parteDiMuscolo({ nome });
  const gruppo = p.gruppoPrincipale;
  console.log(nome.padEnd(32) + ' parte: ' + String(p.parte).padEnd(20) + ' gruppo: ' + String(gruppo).padEnd(20)
    + ' etichetta: ' + String(ETICHETTE[gruppo]).padEnd(16) + ' zone del gruppo: ' + (RITAGLI[gruppo] ? RITAGLI[gruppo].zone.join(',') : '??'));
}
