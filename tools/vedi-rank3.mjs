import { ESERCIZI } from '../src/dati-iniziali.js';
import { recordEsercizio } from '../src/rank.js';

const e = ESERCIZI.find((x) => x.nome.includes('One Arm Overhead'));
for (const [carrello, rip, nota] of [[28, 8, 'un braccio: 28 sul carrello = 14 reali'],
  [60, 8, 'due mani: 60 sul carrello = 30 reali']]) {
  const r = recordEsercizio([{ peso: carrello, ripetizioni: rip, stato: 'fatta', ordine: 1 }], e, null, 66);
  console.log('  ' + String(carrello).padStart(3) + ' sul carrello -> ' + (r.caricoReale) + ' kg reali | '
    + (r.rank ? r.rank.nome : '?') + ' | LP ' + (r.lp !== null && r.lp !== undefined ? Math.round(r.lp) : '?')
    + ' | tetto ' + r.vertice + ' | ingresso ' + r.ingresso + ' | soglia attuale ' + r.sogliaAttuale
    + ' -> ' + r.sogliaSuccessiva + '  (' + nota + ')');
}
console.log('');
console.log('  iRank: ' + (r.rank ? r.rank.nome : '?'));
