// tools/prova-rep.mjs -- quanti Rank ti danno le ripetizioni.
//
// Ste (08/10/2026): "non devono contare troppissimo le ripetizioni eh".
//
// Il numero che conta non e' la formula, e' la differenza di Rank fra 5 e 12
// ripetizioni a STESSO carico. Se quella differenza e' di tre Rank, le
// ripetizioni contano troppo. Se e' di uno, contano il giusto.

import { ESERCIZI } from '../src/dati-iniziali.js';
import { valutaEsercizio } from '../src/rank-v2/index.js';
import { RANK } from '../src/rank-config.js';

const PESO = 66;
const perNome = new Map();
for (const e of ESERCIZI) perNome.set(e.nome.toLowerCase(), e);

const MIEI = [
  { nome: 'Chest Press', kg: 37 },
  { nome: 'Lat Pulldown macchina', kg: 88 },
  { nome: 'Leg Extension', kg: 65 },
  { nome: 'Cable Hammer Curl', kg: 50 },
  { nome: 'Seated Dumbbell Shoulder Press', kg: 30 },
];

const nomi = (r) => {
  if (!r || !r.rank) return '---';
  return r.rank.nome;
};

const pieni = (r) => r.rank ? r.rank.nome + ' ' + r.lp + 'LP' : '---';

console.log('Quanti Rank ti danno le ripetizioni, a STESSO carico.');
console.log('Se fra 5 e 12 ripetizioni cambiano 2 o 3 Rank, contano troppo.');
console.log('Ma se non cambiano NEMMENO gli LP, allora non contano affatto.\n');

for (const m of MIEI) {
  const e = perNome.get(m.nome.toLowerCase());
  const indici = [];
  const nomiVisti = [];
  const conLp = [];
  for (const rip of [5, 6, 8, 10, 12]) {
    const serie = [{ id: 's', esercizio_id: e.id, stato: 'fatta', peso: m.kg, ripetizioni: rip }];
    const r = valutaEsercizio({ esercizio: e, serie, pesoCorporeo: PESO });
    indici.push(r.indice);
    nomiVisti.push(nomi(r));
    conLp.push(pieni(r));
  }
  const salto = indici[4] - indici[0];
  console.log(m.nome.slice(0, 28).padEnd(30) + ' salto di Rank: ' + salto);
  console.log('    5 rip: ' + conLp[0].padEnd(16) + ' 8 rip: ' + conLp[2].padEnd(16) + ' 12 rip: ' + conLp[4]);
}

console.log('\nOBIETTIVO: il salto da 5 a 12 ripetizioni deve essere 0-1 Rank,');
console.log('ma gli LP DEVONO salire, altrimenti le ripetizioni non contano niente.');