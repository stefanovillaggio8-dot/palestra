// tools/analisi-tetti.mjs -- controlla OGNI esercizio con i numeri VERI del
// giorno 1 e dice due cose:
//   1) dove ti mette la scala col carico che fai davvero
//   2) se quel carico e' o no una percentuale sensata del tetto
//
// Il principio di severita' e' quello della chest press: il tuo carico di oggi
// deve stare intorno al 30% del tetto, non al 5% e non al 90%.
//
//   node tools/analisi-tetti.mjs 66

import { ESERCIZI, costruisciSnapshot } from '../src/dati-iniziali.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { valutaEsercizio } from '../src/rank-v2/index.js';
import { valoriPerEsercizio, sogliePerEsercizio, unitaCarico } from '../src/rank-v2/valori.js';

const PESO = Number(process.argv[2]) || 66;

/** Ogni esercizio del primo giorno, con la serie migliore che ci hai fatto. */
function carichiReali() {
  const snap = costruisciSnapshot();
  const fuori = [];
  for (const g of snap.giorni) {
    for (const se of g.esercizi) {
      const e = ESERCIZI.find((x) => x.id === se.esercizio_id);
      if (!e) continue;
      const fatte = se.serie.filter((s) => s.peso && s.stato !== 'eliminata');
      if (!fatte.length) continue;
      const migliore = fatte.reduce((a, b) =>
        (b.peso * b.ripetizioni > a.peso * a.ripetizioni ? b : a));
      fuori.push({ e, serie: se.serie, kg: migliore.peso, rip: migliore.ripetizioni });
    }
  }
  return fuori;
}

const nome = (r) => {
  if (!r || !r.rank) return 'sotto il primo';
  return r.rank.nome + (r.divisione ? ' ' + r.divisione.nome : '') + ' ' + r.lp + 'LP';
};

const visti = new Set();
const righe = [];

for (const { e, serie, kg, rip } of carichiReali()) {
  const cls = classificaEsercizio({
    nome: e.nome, convenzione: e.convenzione,
    attrezzatura: e.attrezzatura, carrucola: e.carrucola,
    bracciaIndipendenti: !!e.bracciaIndipendenti,
  });
  if (visti.has(cls.movimento)) continue;
  visti.add(cls.movimento);

  const valori = valoriPerEsercizio(cls.movimento, e);
  if (!valori || valori.multiplo === 0) continue;

  const r = valutaEsercizio({ esercizio: e, serie, pesoCorporeo: PESO });
  if (!r.valido) continue;
  const s = sogliePerEsercizio(valori, cls.livello, PESO, cls.movimento);

  // il carico REALE, cioe' quello che entra nel calcolo (doppia carrucola dimezzata)
  const reale = r.caricoReale;
  const quota = Math.round(((reale - s.ingresso) / (s.vertice - s.ingresso)) * 100);

  righe.push({
    esercizio: e.nome, movimento: cls.movimento, livello: cls.livello,
    kg, rip, reale, unita: unitaCarico(e),
    multiplo: valori.multiplo,
    ingresso: s.ingresso, vertice: s.vertice, quota,
    xCorpo: Math.round((reale / PESO) * 100) / 100,
    tettoRaggiunto: s.tettoRaggiunto,
    rank: nome(r),
  });
}

righe.sort((a, b) => a.quota - b.quota);

console.log(`Tetti e severita'. Corpo ${PESO} kg.`);
console.log('Il "carico" e\' quello che leggi sulla macchina. Il "reale" e\' quello che');
console.log('entra nel calcolo: con la doppia carrucola e\' la meta\', perche\' lavori un');
console.log('braccio alla volta.');
console.log();
console.log('esercizio'.padEnd(31) + 'carico'.padEnd(10) + 'reale'.padEnd(8)
  + 'x corpo'.padEnd(9) + 'ingresso'.padStart(8) + 'tetto'.padStart(8)
  + '%scala'.padStart(8) + '  rank');
console.log('-'.repeat(122));
for (const g of righe) {
  const segnalazione = g.quota < 10 ? '  <-- sotto il primo, tetto troppo alto'
    : g.quota > 75 ? '  <-- vicino al tetto, tetto troppo basso'
      : g.tettoRaggiunto ? '  <-- tetto di realta\' attivo' : '';
  console.log(
    g.esercizio.slice(0, 30).padEnd(31)
    + (g.kg + 'x' + g.rip).padEnd(10)
    + String(g.reale).padEnd(8)
    + (g.xCorpo + 'x').padEnd(9)
    + g.ingresso.toFixed(1).padStart(8)
    + g.vertice.toFixed(1).padStart(8)
    + (g.quota + '%').padStart(8)
    + '  ' + g.rank + segnalazione,
  );
}

const sbagliate = righe.filter((g) => g.quota < 10 || g.quota > 75);
console.log();
console.log(sbagliate.length
  ? sbagliate.length + ' esercizi fuori scala: ' + sbagliate.map((g) => g.esercizio).join(', ')
  : 'Nessun esercizio fuori scala.');
console.log();
console.log('Le unita\', perche\' i kg non sono confrontabili cosi\' come sono:');
for (const g of righe) {
  console.log('  ' + g.esercizio.slice(0, 30).padEnd(32) + g.unita
    + '   (movimento ' + g.movimento + ')');
}