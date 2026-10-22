// tools/calibra-tetti.mjs -- prova i tetti e dice dove finiscono i Rank.
//
// Serve perche' la severita' non si decide a occhio: qui si mettono i numeri e si
// vede cosa esce, esercizio per esercizio, con i carichi REALI di Ste.
//
//   node tools/calibra-tetti.mjs

import { ESERCIZI, costruisciSnapshot } from '../src/dati-iniziali.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { valutaEsercizio } from '../src/rank-v2/index.js';
import { valoriPerEsercizio, sogliePerEsercizio, unitaCarico } from '../src/rank-v2/valori.js';
import { caricoReale } from '../src/rank-v2/curve.js';

const PESO = Number(process.argv[2]) || 66;

// I carichi di Ste, scritti come li LEGGE lui sulla macchina, piu' il suo peso
// corporeo. Non sono inventati: sono i numeri che ha usato finora.
const MIEI = [
  { nome: 'Chest Press', kg: 37, rip: 8, corpo: 66 },
  { nome: 'Cable Hammer Curl', kg: 50, rip: 6, corpo: 66 },
  { nome: 'Cable Lateral Raise', kg: 25, rip: 7, corpo: 66 },
  { nome: 'Cable Overhead Tricep Extension', kg: 60, rip: 5, corpo: 66 },
  { nome: 'Seated Dumbbell Shoulder Press', kg: 30, rip: 8, corpo: 66 },
  { nome: 'Lat Pulldown macchina', kg: 88, rip: 6, corpo: 66 },
  { nome: 'Seated Cable Row', kg: 90, rip: 6, corpo: 66 },
  { nome: 'Leg Extension', kg: 65, rip: 9, corpo: 66 },
  { nome: 'Dumbbell Bench Pull', kg: 45, rip: 7, corpo: 66 },
];

const nomi = (r) => {
  if (!r || !r.rank) return 'sotto il primo';
  return r.rank.nome + (r.divisione ? ' ' + r.divisione.nome : '') + ' ' + r.lp + 'LP';
};

const eserciziPerNome = new Map();
for (const e of ESERCIZI) eserciziPerNome.set(e.nome.toLowerCase(), e);

console.log(`I tuoi carichi, corpo ${PESO} kg. Ogni riga: cosa esce adesso.`);
console.log('La colonna "leggi" e\' il numero sulla macchina, "reale" e\' quello che');
console.log('entra nel calcolo (doppia carrucola dimezzata = un braccio alla volta).');
console.log();

const visti = new Set();
const righe = [];

for (const mio of MIEI) {
  const e = eserciziPerNome.get(mio.nome.toLowerCase());
  if (!e) { console.log('  (non trovo ' + mio.nome + ')'); continue; }
  const cls = classificaEsercizio({
    nome: e.nome, convenzione: e.convenzione,
    attrezzatura: e.attrezzatura, carrucola: e.carrucola,
    bracciaIndipendenti: !!e.bracciaIndipendenti,
  });
  const valori = valoriPerEsercizio(cls.movimento, e);
  if (!valori || valori.multiplo === 0) continue;
  if (visti.has(cls.movimento + cls.livello)) continue;
  visti.add(cls.movimento + cls.livello);

  const serie = [{ id: 's', esercizio_id: e.id, stato: 'fatta', peso: mio.kg, ripetizioni: mio.rip }];
  const r = valutaEsercizio({ esercizio: e, serie, pesoCorporeo: mio.corpo });
  if (!r.valido) { console.log('  ' + mio.nome + ': non valutabile (' + r.motivo + ')'); continue; }
  const s = sogliePerEsercizio(valori, cls.livello, mio.corpo, cls.movimento);
  const reale = r.caricoReale;
  const quota = Math.round(((reale - s.ingresso) / (s.vertice - s.ingresso)) * 100);

  righe.push({
    nome: mio.nome, leggi: mio.kg + 'x' + mio.rip, reale,
    unita: unitaCarico(e), movimento: cls.movimento,
    multiplo: valori.multiplo,
    tetto: s.vertice, tettoLettibile: s.vertice * (e.carrucola === 'carrucola_doppia' ? 2 : 1),
    quota, rank: nomi(r),
  });
}

righe.sort((a, b) => a.quota - b.quota);

console.log('esercizio'.padEnd(32) + 'leggi'.padEnd(10) + 'reale'.padEnd(8)
  + 'x corpo'.padEnd(9) + 'tetto reale'.padStart(11) + 'leggibile'.padStart(11)
  + '%scala'.padStart(8) + '  rank');
console.log('-'.repeat(124));
for (const g of righe) {
  const segnalazione = g.quota < 15 ? '  <-- troppo basso'
    : g.quota > 70 ? '  <-- troppo alto' : '';
  console.log(
    g.nome.slice(0, 31).padEnd(32)
    + g.leggi.padEnd(10)
    + String(g.reale).padEnd(8)
    + (Math.round((g.reale / PESO) * 100) / 100 + 'x').padEnd(9)
    + g.tetto.toFixed(1).padStart(11)
    + g.tettoLettibile.toFixed(1).padStart(11)
    + (g.quota + '%').padStart(8)
    + '  ' + g.rank + segnalazione,
  );
}

const bassi = righe.filter((g) => g.quota < 15);
const alti = righe.filter((g) => g.quota > 70);
console.log();
if (bassi.length) console.log('TROPPO BASSO: ' + bassi.map((g) => g.nome).join(', '));
if (alti.length) console.log('TROPPO ALTO: ' + alti.map((g) => g.nome).join(', '));
if (!bassi.length && !alti.length) console.log('Tutti fra il 15% e il 70%: severita\' uniforme.');