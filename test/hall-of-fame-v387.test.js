import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ordinaRecordRank } from '../src/rank-ordina.js';
const source=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Hall of Fame mostra soltanto i migliori cinque record validi',()=>{
  const input=[
    {valido:true,rankId:'gold',lp:20,esercizio:{id:'a',nome:'A'}},
    {valido:true,rankId:'olympian',lp:60,esercizio:{id:'b',nome:'B'}},
    {valido:true,rankId:'bronze',lp:70,esercizio:{id:'c',nome:'C'}},
    {valido:true,rankId:'diamond',lp:15,esercizio:{id:'d',nome:'D'}},
    {valido:true,rankId:'titan',lp:33,esercizio:{id:'e',nome:'E'}},
    {valido:true,rankId:'silver',lp:11,esercizio:{id:'f',nome:'F'}},
  ];
  const best=ordinaRecordRank(input.filter(x=>x.valido)).slice(0,5);
  assert.deepEqual(best.map(r=>r.rankId),['olympian','titan','diamond','gold','silver']);
  assert.equal(input.length,6,'Nessun record originale viene cancellato');
});
test('Hall of Fame nel tab Progressi senza modifiche al database',()=>{
 const app=source('src/app.js');
 const view=app.slice(app.indexOf('function cardHallOfFame()'),app.indexOf('function vistaProgressi('));
 assert.match(view,/ordinaRecordRank\(statoMio\(\)\.recordValidi \|\| \[\]\)\.slice\(0, 5\)/);
 assert.match(app,/extraDentro\.appendChild\(cardHallOfFame\(\)\)/);
 assert.doesNotMatch(view,/db\.salva\(|sb\.scrivi\(|sync\.sincronizza\(/);
 assert.match(source('stile-premium.css'),/\.hall-of-fame-riga/);
});
