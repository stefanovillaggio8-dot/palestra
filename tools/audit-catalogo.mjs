import { ESERCIZI, GIORNI } from '../src/dati-iniziali.js';
import { parteDiMuscolo } from '../src/muscoli-parti.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { livelloEsercizio } from '../src/rank-config.js';

console.log('=== IL CATALOGO: l\'app riconosce tutto? ===');
for (const e of ESERCIZI) {
  const p = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
  const c = classificaEsercizio({ nome: e.nome, convenzione: e.convenzione });
  const liv = livelloEsercizio(e);
  const problemi = [];
  if (!p.trovata) problemi.push('NESSUN MUSCOLO');
  if (!c.movimento) problemi.push('NESSUN MOVIMENTO');
  if (liv === 'assistito' && e.convenzione !== 'assistenza') problemi.push('badge ASSISTITO ma non e assistenza');
  if (problemi.length) {
    console.log('  ' + e.nome.padEnd(34) + ' -> ' + problemi.join(' + ')
      + '   [conv: ' + e.convenzione + ']');
  }
}
console.log('  (se non c\'e\' nessuna riga, tutto riconosciuto)');

console.log('');
console.log('=== LA SCHEDINA: gli esercizi del programma ===');
const ids = new Set();
for (const g of GIORNI) for (const es of g.esercizi) ids.add(es.esercizio_id);
for (const id of ids) {
  const e = ESERCIZI.find((x) => x.id === id);
  if (!e) { console.log('  id senza esercizio: ' + id); continue; }
  const p = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
  const c = classificaEsercizio({ nome: e.nome, convenzione: e.convenzione });
  const problemi = [];
  if (!p.trovata) problemi.push('NESSUN MUSCOLO');
  if (!c.movimento) problemi.push('NESSUN MOVIMENTO');
  if (problemi.length) console.log('  ' + e.nome.padEnd(34) + ' -> ' + problemi.join(' + '));
}
console.log('  (se non c\'e\' nessuna riga, tutto a posto)');

console.log('');
console.log('=== LE NOTE CHE NON DICONO PIU\' LA VERITA\' ===');
for (const e of ESERCIZI) {
  const nota = (e.nota_permanente || '').toLowerCase();
  if (!nota) continue;
  if (e.convenzione === 'corpo_libero' && /assistenz|al cavo/.test(nota)) {
    console.log('  ' + e.nome + ': "' + e.nota_permanente + '"');
  }
}
