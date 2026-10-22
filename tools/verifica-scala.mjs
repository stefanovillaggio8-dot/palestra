// tools/verifica-scala.mjs -- controlla che i due numeri che mostriamo non si
// contraddicano: la percentuale sulla scala e il Rank che esce davvero.
//
// Sono due calcoli diversi e devono dire la stessa cosa. Se dicono cose diverse,
// uno dei due e' sbagliato: e' il caso peggiore, perche' la schermata ti
// mostrerebbe "40% della scala" e "sotto il primo" nello stesso momento.

import { ESERCIZI } from '../src/dati-iniziali.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { valutaEsercizio } from '../src/rank-v2/index.js';
import { valoriPerEsercizio, sogliePerEsercizio, unitaCarico } from '../src/rank-v2/valori.js';
import { RIPETIZIONI_RIFERIMENTO, fattoreSogliaDaKg } from '../src/rank-v2/valori.js';
import { ripetizioniPiene } from '../src/rank-v2/curve.js';

const PESO = 66;

const MIEI = [
  { nome: 'Chest Press', kg: 37, rip: 8 },
  { nome: 'Cable Hammer Curl', kg: 50, rip: 6 },
  { nome: 'Cable Lateral Raise', kg: 25, rip: 7 },
  { nome: 'Cable Overhead Tricep Extension', kg: 60, rip: 5 },
  { nome: 'Seated Dumbbell Shoulder Press', kg: 30, rip: 8 },
  { nome: 'Lat Pulldown macchina', kg: 88, rip: 6 },
  { nome: 'Seated Cable Row', kg: 90, rip: 6 },
  { nome: 'Leg Extension', kg: 65, rip: 9 },
  { nome: 'Dumbbell Bench Pull', kg: 45, rip: 7 },
];

const perNome = new Map();
for (const e of ESERCIZI) perNome.set(e.nome.toLowerCase(), e);

console.log(`Corpo ${PESO} kg.`);
console.log('Il problema che sto controllando: la "% scala" e il Rank devono');
console.log('concordare. Con 6-9 ripetizioni lo SCORE non e\' il carico, e la');
console.log('percentuale calcolata sul carico puo\' dire una cosa mentre il Rank');
console.log('ne dice un\'altra.');
console.log();

console.log('esercizio'.padEnd(32) + 'reale'.padEnd(8) + 'rip'.padEnd(6)
  + '% sui kg'.padStart(10) + '% sullo score'.padStart(14) + '  rank');
console.log('-'.repeat(120));

const problemi = [];
for (const mio of MIEI) {
  const e = perNome.get(mio.nome.toLowerCase());
  if (!e) continue;
  const cls = classificaEsercizio({
    nome: e.nome, convenzione: e.convenzione,
    attrezzatura: e.attrezzatura, carrucola: e.carrucola,
    bracciaIndipendenti: !!e.bracciaIndipendenti,
  });
  const valori = valoriPerEsercizio(cls.movimento, e);
  if (!valori || valori.multiplo === 0) continue;

  const serie = [{ id: 's', esercizio_id: e.id, stato: 'fatta', peso: mio.kg, ripetizioni: mio.rip }];
  const r = valutaEsercizio({ esercizio: e, serie, pesoCorporeo: PESO });
  if (!r.valido) continue;
  const s = sogliePerEsercizio(valori, cls.livello, PESO, cls.movimento);

  const quotaKg = ((r.caricoReale - s.ingresso) / (s.vertice - s.ingresso)) * 100;

  // la percentuale sullo SCORE, che e\' quello che il motore usa davvero
  const fattore = fattoreSogliaDaKg(e);
  const primaSoglia = s.ingresso * fattore;
  const ultimaSoglia = s.vertice * fattore;
  const quotaScore = ((r.score - primaSoglia) / (ultimaSoglia - primaSoglia)) * 100;

  const rankTesto = r.rank
    ? r.rank.nome + (r.divisione ? ' ' + r.divisione.nome : '') + ' ' + r.lp + 'LP'
    : 'sotto il primo';

  // se il motore dice "sotto il primo" la percentuale sullo score e' negativa
  const incoerente = !r.rank && quotaScore > 0;
  if (incoerente) problemi.push(mio.nome + ': Rank dice "sotto il primo" ma la scala e\' al ' + Math.round(quotaScore) + '%');

  console.log(
    mio.nome.slice(0, 31).padEnd(32)
    + String(r.caricoReale).padEnd(8)
    + String(mio.rip).padEnd(6)
    + (Math.round(quotaKg) + '%').padStart(10)
    + (Math.round(quotaScore) + '%').padStart(14)
    + '  ' + rankTesto + (incoerente ? '   <-- INCOERENTE' : ''),
  );
}

console.log();
if (problemi.length) {
  console.log('PROBLEMI:');
  for (const p of problemi) console.log('  ' + p);
} else {
  console.log('Nessuna incoerenza fra percentuale e Rank.');
}