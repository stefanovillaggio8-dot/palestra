// tools/verifica-ripetizioni.mjs -- quanti Rank ti toglie fare MENO ripetizioni.
//
// Il problema: i tetti sono dichiarati per 8 ripetizioni (perche' 8 e' il modo in
// cui si ragiona, "3x8"). Ma Ste fa 5, 6, 7 o 9 ripetizioni a seconda
// dell'esercizio. Quindi chi fa 5 ripetizioni viene penalizzato due volte:
//   1) lo score e' naturalmente piu' basso (5 rip pesate = 4,4 contro 8 = 6,5);
//   2) ma il tetto e' SEMPRE calcolato su 8, quindi il suo 5 rip finisce contro
//      un tetto che non e' il suo.

import { ripetizioniPiene } from '../src/rank-v2/curve.js';

const CASI = [
  { nome: 'Cable Overhead Tricep', kg: 30, tetto: 46.2, ingresso: 19.8 },
  { nome: 'Lat Pulldown', kg: 88, tetto: 132, ingresso: 66 },
  { nome: 'Seated Cable Row', kg: 90, tetto: 132, ingresso: 66 },
  { nome: 'Chest Press', kg: 37, tetto: 66, ingresso: 29.7 },
  { nome: 'Cable Hammer Curl', kg: 25, tetto: 46.2, ingresso: 13.2 },
  { nome: 'Leg Extension', kg: 65, tetto: 92.4, ingresso: 33 },
];

console.log('Quanto vale lo stesso carico con 5, 6, 7, 8, 9, 10 ripetizioni.');
console.log('La percentuale e\' sempre sullo score, che e\' quello che il motore usa.');
console.log();

for (const c of CASI) {
  console.log(c.nome + '  (' + c.kg + ' kg, tetto ' + c.tetto + ' per 8 rip)');
  const fattore8 = ripetizioniPiene(8);
  const prima8 = c.ingresso * fattore8;
  const tetra8 = c.tetto * fattore8;
  for (const n of [5, 6, 7, 8, 10, 12]) {
    const score = c.kg * ripetizioniPiene(n);
    const q = Math.round(((score - prima8) / (tetra8 - prima8)) * 100);
    const segnalazione = n === 8 ? '   <- il riferimento' : '';
    console.log('  ' + String(n).padStart(2) + ' rip: score ' + String(Math.round(score)).padStart(4)
      + '  ->  ' + String(q).padStart(4) + '% della scala' + segnalazione);
  }
  console.log();
}

console.log('CONCLUSIONE: fare meno ripetizioni AL MASSIMO PESATO ti taglia');
console.log('diversi Rank rispetto a farne 8. E il tetto "132 kg" vale solo per 8.');
console.log('Il numero in kg da solo non basta mai: contano kg E ripetizioni insieme.');