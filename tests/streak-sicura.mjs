// Test puro della streak: nessuna scrittura su dati o database.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/streak.js', import.meta.url), 'utf8');
const streak = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const days = ['2026-10-26','2026-10-27','2026-10-29','2026-10-30'];
assert.deepEqual(streak.giorniPrevistiDa({giorni_allenamento:[5,1,2,4,1]}),[1,2,4,5]);
assert.equal(streak.contaAllenamentiConsecutiviConGiorni(days,[1,2,4,5],'2026-10-31'),4,
  'Il sabato di riposo non deve azzerare quattro allenamenti');
assert.equal(streak.contaAllenamentiConsecutiviConGiorni(days,[1,2,4,5],'2026-11-03'),0,
  'Saltare un lunedi previsto deve interrompere la streak');
assert.equal(streak.dataPossibile('2026-02-30'),false);
assert.equal(streak.dataPossibile('2026-10-30'),true);
const sessions=[
 {stato:'completata',data:'2026-10-30'},
 {stato:'completata',data:'2026-10-30'},
 {stato:'iniziata',data:'2026-10-31'},
 {stato:'completata',data:'2026-11-04'},
 {stato:'completata',data:'2026-10-29',eliminata:true},
];
assert.deepEqual(streak.giorniAllenati(sessions,'2026-11-02'),['2026-10-30'],
  'Sedute duplicate, non completate, eliminate o future non devono contare');
console.log('OK: riposi, giorni mancati, date e sedute valide');
