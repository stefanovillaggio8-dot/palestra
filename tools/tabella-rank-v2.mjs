// tools/tabella-rank-v2.mjs -- la tabella dei valori NUOVI da approvare.
//
// Non modifica niente: stampa. Serve a te per guardare i numeri prima che diventino
// un Rank, e serve a me per vedere se ho scritto cavolate.
//
//   node tools/tabella-rank-v2.mjs            -> i valori e le soglie di ogni esercizio
//   node tools/tabella-rank-v2.mjs confronta  -> la tabella PRIMA (sistema vecchio) / DOPO
//   node tools/tabella-rank-v2.mjs 80         -> i numeri per una persona di 80 kg

import { ESERCIZI, costruisciSnapshot } from '../src/dati-iniziali.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { RANK } from '../src/rank-config.js';
import { recordEsercizio, stimaMassimo } from '../src/rank.js';
import { valutaEsercizio } from '../src/rank-v2/index.js';
import { VALORI_MOVIMENTO, sogliePerEsercizio, TETTO_ISOLAMENTI, TETTO_PER_PESO } from '../src/rank-v2/valori.js';

const PESO = Number(process.argv[3]) || 66;
const MODO = process.argv[2] === 'confronta' ? 'confronta' : 'valori';

function eserciziDellaScheda() {
  const snap = costruisciSnapshot();
  const visti = new Set();
  const fuori = [];
  for (const g of snap.giorni) {
    for (const se of g.esercizi) {
      if (visti.has(se.esercizio_id)) continue;
      visti.add(se.esercizio_id);
      const e = ESERCIZI.find((x) => x.id === se.esercizio_id);
      if (e) fuori.push(e);
    }
  }
  return fuori;
}

const fmt = (n, d = 2) => {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '-';
};
const nomeRank = (r) => (r && r.nome ? r.nome : 'sotto il primo');
const esercizi = eserciziDellaScheda();

if (MODO === 'valori') {
  console.log(`I tre numeri di ogni esercizio, per una persona di ${PESO} kg\n`);
  console.log('esercizio'.padEnd(32) + 'movimento'.padEnd(21) + 'ingresso'.padStart(9) + 'vertice'.padStart(9) + '  tetto   fonte');
  console.log('-'.repeat(96));
  const visti = new Set();
  for (const e of esercizi) {
    const r = classificaEsercizio({
      nome: e.nome, convenzione: e.convenzione,
      attrezzatura: e.attrezzatura, carrucola: e.carrucola,
      bracciaIndipendenti: !!e.bracciaIndipendenti,
    });
    if (visti.has(r.movimento)) continue;
    visti.add(r.movimento);
    const v = VALORI_MOVIMENTO[r.movimento];
    if (!v) { console.log(e.nome.slice(0, 31).padEnd(32) + String(r.movimento).padEnd(21) + '   nessun valore'); continue; }
    const tre = sogliePerEsercizio(v, r.livello, PESO);
    console.log(
      e.nome.slice(0, 31).padEnd(32)
      + String(r.movimento).padEnd(21)
      + fmt(tre.ingresso).padStart(9)
      + fmt(tre.vertice).padStart(9)
      + '  ' + fmt(tre.tetto).padStart(5) + '  ' + v.fonte,
    );
  }
  console.log(`\ntetti: ${TETTO_ISOLAMENTI}x il peso sugli isolamenti, ${TETTO_PER_PESO}x su tutto il resto.`);
  console.log('\nI movimenti e i loro numeri (per persona di 70 kg):\n');
  for (const [k, v] of Object.entries(VALORI_MOVIMENTO)) {
    console.log('  ' + k.padEnd(22) + (v.vertice
      ? `vertice ${String(v.vertice).padStart(4)} kg   ingresso ${(v.quotaIngresso * 100).toFixed(0)}%   [${v.fonte}]`
      : 'nessun valore (si contano le ripetizioni)'));
    if (v.nota) console.log('      ' + v.nota);
  }
} else {
  console.log(`Confronto alla stessa prestazione, corpo ${PESO} kg.`);
  console.log('Ogni riga: una serie da 40 kg x 8.\n');
  console.log(
    'esercizio'.padEnd(31)
    + 'carico reale'.padEnd(14)
    + '1RM (vecchio)'.padEnd(14)
    + 'rank vecchio'.padEnd(13)
    + 'kg equiv.'.padEnd(11)
    + 'rank nuovo',
  );
  console.log('-'.repeat(110));
  for (const e of esercizi) {
    const serie = [{ id: 's', esercizio_id: e.id, stato: 'fatta', spotter: false, carrucola: null, peso: 40, ripetizioni: 8 }];
    const vecchio = recordEsercizio(serie, e, null, PESO);
    const nuovo = valutaEsercizio({ esercizio: e, serie, pesoCorporeo: PESO });
    console.log(
      e.nome.slice(0, 30).padEnd(31)
      + (nuovo.valido ? `${fmt(nuovo.caricoReale)} kg` : '-').padEnd(14)
      + (vecchio.valido ? String(stimaMassimo(vecchio.punteggio, 8)) : '-').padEnd(14)
      + nomeRank(vecchio.rank).padEnd(13)
      + (nuovo.valido ? fmt(nuovo.kgEquivalenti, 1) : 'reps').padEnd(11)
      + (nuovo.valido ? nomeRank(nuovo.rank) + (nuovo.rank ? ' ' + nuovo.lp + 'LP' : '') : '-'),
    );
  }
  console.log('\nIl 1RM c\'e\' ancora nella colonna "vecchio" solo per confronto: nel nuovo');
  console.log('sistema non viene calcolato e non entra nel Rank.');
  console.log('\n"sotto il primo" = sotto la soglia d\'ingresso: non hai ancora sbloccato');
  console.log('il primo livello su quell\'esercizio. Non e\' un errore, e\' la soglia.');
}