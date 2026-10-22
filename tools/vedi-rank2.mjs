import { ESERCIZI } from '../src/dati-iniziali.js';
import { recordEsercizio } from '../src/rank.js';

const e = ESERCIZI.find((x) => x.nome.includes('One Arm Overhead'));
console.log('convenzione: ' + e.convenzione + ' | carrucola: ' + e.carrucola);
for (const [peso, rip, nota] of [[28, 8, '28 sul carrello (doppia: lui scrive 14 per un braccio)'],
  [14, 8, '14 per un braccio'], [30, 8, '30 con due mani']]) {
  const r = recordEsercizio([{ peso, ripetizioni: rip, stato: 'fatta', ordine: 1 }], e, null, 66);
  console.log('  ' + String(peso).padStart(3) + ' kg x ' + rip + ' -> '
    + (r.rank ? r.rank.nome : '?') + ' | LP: ' + (r.lp !== null && r.lp !== undefined ? Math.round(r.lp) : '?')
    + ' | carico reale: ' + (r.caricoReale !== null && r.caricoReale !== undefined ? r.caricoReale : '?')
    + ' | ' + nota);
}
