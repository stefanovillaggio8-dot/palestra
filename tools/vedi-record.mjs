import { ESERCIZI } from '../src/dati-iniziali.js';
import { recordEsercizio } from '../src/rank.js';

const e = ESERCIZI.find((x) => x.nome.includes('One Arm Overhead'));
const serie = [{ peso: 28, ripetizioni: 8, stato: 'fatta', ordine: 1 }];
const r = recordEsercizio(serie, e, null, 66);
console.log('le chiavi del record: ' + Object.keys(r).join(', '));
console.log('');
for (const k of Object.keys(r)) {
  const v = r[k];
  if (v && typeof v === 'object') console.log('  ' + k + ': ' + JSON.stringify(v).slice(0, 150));
  else console.log('  ' + k + ': ' + v);
}
