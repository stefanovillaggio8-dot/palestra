// tools/tabella-finale.mjs -- la tabella da approvare.
//
// Una riga per esercizio, con i carichi e le RIPETIZIONI che Ste fa davvero, e
// quello che esce. Serve a lui per dire "va bene" o "qui no" prima che il motore
// venga attivato.
//
//   node tools/tabella-finale.mjs 66

import { ESERCIZI } from '../src/dati-iniziali.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { valutaEsercizio } from '../src/rank-v2/index.js';
import { valoriPerEsercizio, sogliePerEsercizio, unitaCarico } from '../src/rank-v2/valori.js';
import { RIPETIZIONI_RIFERIMENTO } from '../src/rank-v2/valori.js';

const PESO = Number(process.argv[2]) || 66;

// I numeri di Ste, come li ha detti lui. Non sono inventati qui: sono i suoi.
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

const nomi = (r) => {
  if (!r || !r.rank) return 'sotto il primo';
  return r.rank.nome + (r.divisione ? ' ' + r.divisione.nome : '') + ' ' + r.lp + 'LP';
};

console.log(`TAVOLA DA APPROVARE. Corpo ${PESO} kg.`);
console.log(`Le soglie sono per ${RIPETIZIONI_RIFERIMENTO} ripetizioni.`);
console.log('');
console.log('Nella colonna "reale" c\'e\' il carico che entra nel calcolo: con la doppia');
console.log('carrucola e\' meta\' di quello che leggi, perche\' lavori un braccio alla volta.');
console.log('');

const righe = [];
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
  const x = Math.round((r.caricoReale / PESO) * 100) / 100;

  // anche a 8 ripetizioni, cosi' si vede quanto valrebbe lo stesso carico al riferimento
  const serie8 = [{ id: 's', esercizio_id: e.id, stato: 'fatta', peso: mio.kg, ripetizioni: 8 }];
  const r8 = valutaEsercizio({ esercizio: e, serie: serie8, pesoCorporeo: PESO });

  righe.push({
    nome: mio.nome, leggi: mio.kg + 'x' + mio.rip, reale: r.caricoReale, x,
    unita: unitaCarico(e), movimento: cls.movimento,
    ingresso: s.ingresso, vertice: s.vertice,
    ingM: valori.ingressoMultiplo, tettoM: valori.multiplo,
    rank: nomi(r), rank8: nomi(r8), distanza: r.distanza,
  });
}

console.log('esercizio'.padEnd(31) + 'leggi'.padEnd(9) + 'reale'.padEnd(7) + 'x corpo'.padEnd(8)
  + 'ingresso'.padStart(8) + 'tetto'.padStart(7) + '  Rank (alle tue rip)'.padEnd(20) + 'Rank a 8 rip');
console.log('-'.repeat(126));
for (const g of righe) {
  console.log(
    g.nome.slice(0, 30).padEnd(31)
    + g.leggi.padEnd(9)
    + String(g.reale).padEnd(7)
    + (g.x + 'x').padEnd(8)
    + g.ingresso.toFixed(1).padStart(8)
    + g.vertice.toFixed(1).padStart(7)
    + '  ' + g.rank.padEnd(18)
    + g.rank8,
  );
}

console.log('');
console.log('Le colonne "ingresso" e "tetto" sono in kg per 8 ripetizioni,');
console.log('nell\'unita\' che vede il calcolo. "tetto" e\' anche il multiplo del corpo:');
console.log('');
console.log('esercizio'.padEnd(31) + 'ingresso'.padStart(10) + 'tetto'.padStart(9) + '   (multipli del corpo)');
console.log('-'.repeat(70));
for (const g of righe) {
  console.log(
    g.nome.slice(0, 30).padEnd(31)
    + (g.ingM + 'x').padStart(10)
    + (g.tettoM + 'x').padStart(9)
    + '   ' + g.unita,
  );
}

console.log('');
console.log('QUANTO TI MANCA (la strada B: le soglie sono per 8 ripetizioni):');
console.log('');
for (const g of righe) {
  if (!g.distanza) continue;
  console.log('  ' + g.nome.slice(0, 30).padEnd(32) + g.distanza.frase);
}