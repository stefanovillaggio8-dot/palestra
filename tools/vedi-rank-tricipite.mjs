import { ESERCIZI } from '../src/dati-iniziali.js';
import { recordEsercizio } from '../src/rank.js';

const e = ESERCIZI.find((x) => x.nome.includes('One Arm Overhead'));
if (!e) { console.log('esercizio non trovato'); process.exit(1); }
console.log('esercizio: ' + e.nome + ' | convenzione: ' + e.convenzione + ' | carrucola: ' + (e.carrucola || '-'));

for (const [peso, rip] of [[8, 8], [14, 8], [15, 8], [30, 8], [14, 12], [28, 8]]) {
  const serie = [{ peso, ripetizioni: rip, stato: 'fatta', ordine: 1 }];
  const r = recordEsercizio(serie, e, null, 66);
  const rank = r && r.rank ? r.rank.nome : (r && r.motivo ? r.motivo : '?');
  console.log('  ' + String(peso).padStart(3) + ' kg x ' + rip + ' -> ' + String(rank).padEnd(12)
    + ' LP: ' + (r && r.lp !== null && r.lp !== undefined ? Math.round(r.lp) : '?')
    + '  | peso reale: ' + (r && r.pesoReale !== undefined && r.pesoReale !== null ? r.pesoReale : (r && r.pesoCorporeo !== undefined ? r.pesoCorporeo : '?'))
    + '  | ' + (r && r.testo ? r.testo.slice(0, 70) : ''));
}
