import { ESERCIZI } from '../src/dati-iniziali.js';
import { livelloEsercizio } from '../src/rank-config.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { schedaProgressione } from '../src/avatar-rpg.js';

console.log('--- i badge ---');
for (const nome of ['Dips a corpo libero', 'Trazioni a corpo libero', 'Back Extension', 'Hip Extension',
  'Cable Crunch', 'Dips zavorrati', 'Trazioni zavorrate', 'Chest Press']) {
  const e = ESERCIZI.find((x) => x.nome === nome);
  if (!e) { console.log('  ' + nome + ': non trovato'); continue; }
  console.log('  ' + nome.padEnd(26) + ' -> "' + livelloEsercizio(e) + '"');
}

console.log('');
console.log('--- lo streak: gli sblocchi restano, il contatore riparte ---');
const premi = [
  { id: 'p1', giorni: 3, sbloccato: true },
  { id: 'p2', giorni: 7, sbloccato: false },
  { id: 'p3', giorni: 15, sbloccato: false },
];
const conRecord = schedaProgressione(premi, 'x', 7, 7);
const senza = schedaProgressione(premi, 'x', 7, 0);
console.log('  con la streak a 7 (record 7):');
for (const c of conRecord) console.log('     ' + c.chiave.padEnd(10) + ' sbloccato=' + c.sbloccato + ' mancano=' + c.mancano);
console.log('  con la streak a 0 (record 7, la hai persa):');
for (const c of senza) console.log('     ' + c.chiave.padEnd(10) + ' sbloccato=' + c.sbloccato + ' mancano=' + c.mancano);
