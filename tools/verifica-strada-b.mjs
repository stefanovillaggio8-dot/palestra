// tools/verifica-strada-b.mjs -- la strada B: le soglie sono per 8 ripetizioni,
// il Rank premia le ripetizioni vere, e la schermata dice quanto manca.
//
// Prova che il numero non piu' mente: con lo stesso carico e piu' ripetizioni il
// Rank sale, e in ogni caso la schermata sa dire quante ne servono per il dopo.

import { ESERCIZI } from '../src/dati-iniziali.js';
import { valutaEsercizio } from '../src/rank-v2/index.js';
import { ripetizioniPiene } from '../src/rank-v2/curve.js';

const PESO = 66;
const perNome = new Map();
for (const e of ESERCIZI) perNome.set(e.nome.toLowerCase(), e);

const nomi = (r) => {
  if (!r || !r.rank) return 'sotto il primo';
  return r.rank.nome + (r.divisione ? ' ' + r.divisione.nome : '') + ' ' + r.lp + 'LP';
};

const CASI = [
  { nome: 'Lat Pulldown macchina', kg: 88 },
  { nome: 'Chest Press', kg: 37 },
  { nome: 'Cable Overhead Tricep Extension', kg: 60 },
  { nome: 'Cable Hammer Curl', kg: 50 },
  { nome: 'Leg Extension', kg: 65 },
];

console.log('STRADA B: stesso carico, quante ripetizioni, e quanto manca.');
console.log(`Corpo ${PESO} kg. Le soglie sono per 8 ripetizioni.\n`);

for (const c of CASI) {
  const e = perNome.get(c.nome.toLowerCase());
  console.log(c.nome + '  a ' + c.kg + ' kg');
  let ultimo = '';
  for (const rip of [5, 6, 7, 8, 9, 10, 12]) {
    const serie = [{ id: 's', esercizio_id: e.id, stato: 'fatta', peso: c.kg, ripetizioni: rip }];
    const r = valutaEsercizio({ esercizio: e, serie, pesoCorporeo: PESO });
    if (!r.valido) continue;
    const testo = nomi(r.rank ? r : r);
    const salito = ultimo && testo !== ultimo ? '  <- sale' : '';
    ultimo = testo;
    const d = r.distanza;
    console.log(
      '  ' + String(rip).padStart(2) + ' rip: '
      + testo.padEnd(18)
      + '| manca: ' + (d ? d.frase : 'niente: sei in cima').padEnd(46)
      + salito,
    );
  }
  console.log();
}

console.log('CONTROLLO: il Rank sale sempre col crescere delle ripetizioni?');
let problemi = 0;
for (const c of CASI) {
  const e = perNome.get(c.nome.toLowerCase());
  let precedente = -Infinity;
  for (const rip of [5, 6, 7, 8, 9, 10, 12]) {
    const serie = [{ id: 's', esercizio_id: e.id, stato: 'fatta', peso: c.kg, ripetizioni: rip }];
    const r = valutaEsercizio({ esercizio: e, serie, pesoCorporeo: PESO });
    const indice = r.indice === undefined ? -1 : r.indice;
    if (indice < precedente) {
      console.log('  PROBLEMA su ' + c.nome + ' a ' + rip + ' rip: il Rank e\' sceso');
      problemi++;
    }
    precedente = indice;
  }
}
if (!problemi) console.log('  Nessun caso in cui il Rank scende aggiungendo ripetizioni.');