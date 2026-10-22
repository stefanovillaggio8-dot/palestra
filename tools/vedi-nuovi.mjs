import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { parteDiMuscolo } from '../src/muscoli-parti.js';

const nomi = [
  ['Bench Pin Press', 'Upper Chest'],
  ['Bench Press', 'Upper Chest'],
  ['Bench Pull', 'Lats'],
  ['Bent Arm Barbell Pullover', 'Upper Chest'],
  ['Bent Over Dumbbell Row', 'Lats'],
  ['Bent Over Row', 'Upper Back'],
  ['Cable Bicep Curl', 'Biceps'],
  ['Cable Chest Press', 'Upper Chest'],
  ['Cable Crunch', 'Abdominals'],
  ['Cable Reverse Fly', 'Rear Delt'],
  ['Deadlift', 'Lower Back'],
  ['Decline Bench Press', 'Lower Chest'],
  ['Decline Dumbbell Bench Press', 'Lower Chest'],
];
for (const [n, m] of nomi) {
  const c = classificaEsercizio({ nome: n });
  const p = parteDiMuscolo({ nome: n });
  const problema = [];
  if (!c.movimento) problema.push('NESSUN MOVIMENTO');
  if (!p.trovata) problema.push('NESSUN MUSCOLO');
  console.log((problema.length ? 'X ' : '  ') + n.padEnd(32) + ' ' + (c.movimento || '-').padEnd(22) + ' ' + (p.nome || '-').padEnd(28) + (problema.length ? ' <<< ' + problema.join(',') : ''));
}
