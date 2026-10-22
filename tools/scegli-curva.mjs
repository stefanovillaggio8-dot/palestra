// tools/scegli-curva.mjs -- che cosa metto come FATTORE_RIPETIZIONI.
//
// Vincoli da soddisfare tutti insieme:
//  1) 8 ripetizioni = 1,0 esatto (le soglie sono dichiarate per 8)
//  2) il salto di Rank da 5 a 12 ripetizioni <= 1  (Ste: "non contano troppo")
//  3) la curva NON satura: 40 ripetizioni valgono piu' di 20 (nel vecchio c'era
//     il tetto assurdo "peso x 4,3" oltre le 30 rip)
//  4) le ripetizioni contano qualcosa: gli LP salgono

import { ESERCIZI } from '../src/dati-iniziali.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';

function piene(n, f) {
  const rif = somma(8, f);
  const limite = Math.min(n, 40);
  let t = 0;
  for (let i = 1; i <= limite; i++) t += Math.pow(f, i - 1);
  return t / rif;
}
function somma(n, f) {
  let t = 0;
  for (let i = 1; i <= n; i++) t += Math.pow(f, i - 1);
  return t;
}

console.log('fattore | 5 rip | 8 rip | 12 rip | 20 rip | 40 rip | 5->12 | 8->40');
console.log('-'.repeat(78));
for (const f of [0.5, 0.6, 0.7, 0.8, 0.85, 0.9]) {
  const a5 = piene(5, f), a8 = piene(8, f), a12 = piene(12, f);
  const a20 = piene(20, f), a40 = piene(40, f);
  console.log(
    String(f).padEnd(8) + '|'
    + a5.toFixed(3).padStart(6) + '|'
    + a8.toFixed(3).padStart(6) + '|'
    + a12.toFixed(3).padStart(6) + '|'
    + a20.toFixed(3).padStart(7) + '|'
    + a40.toFixed(3).padStart(7) + '|'
    + (Math.round((a12 / a5 - 1) * 100) + '%').padStart(6) + '|'
    + (Math.round((a40 / a8 - 1) * 100) + '%').padStart(6),
  );
}

console.log('');
console.log('LEGGERE:');
console.log('- la colonna "5->12" e\' quanto crescono le ripetizioni: se e\' altissima');
console.log('  il volume comanda; se e\' bassa le ripetizioni contano poco. Prima della');
console.log('  correzione era 101% da 5 a 12 ripetizioni, e il Rank saltava di 6 pezzi.');
console.log('- la colonna "8->40" dice quanto la curva continua a crescere: deve essere');
console.log('  POSITIVA, altrimenti la curva satura e il tetto assurdo del sistema');
console.log('  vecchio ("peso x 4,3") ricomparirebbe.');
console.log('');
console.log('Il compromesso: fattore alto = le ripetizioni contano meno, ma la curva');
console.log('satura prima. 0,7 e il punto in cui le ripetizioni contano poco E la curva');
console.log('non satura del tutto.');