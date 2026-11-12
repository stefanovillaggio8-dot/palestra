import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calcolaStreak} from '../src/streak.js';
import {progressoCoronaInfinito, statoCoronaInfinito} from '../src/aura-skin.js';

const txt=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v469: se la streak e persa il record 11 NON compare nella barra 80',()=>{
 const x=progressoCoronaInfinito({giorni:0,record:11,interrotta:true});
 assert.deepEqual(x,{giorni:0,record:11,sbloccata:false,mancanti:80,percentuale:0});
});
test('v469: interruzione esplicita azzera anche un conteggio temporaneamente obsoleto',()=>{
 const x=progressoCoronaInfinito({giorni:11,record:11,interrotta:true});
 assert.equal(x.giorni,0);
 assert.equal(x.percentuale,0);
});
test('v469: la nuova streak cresce da 1 a 79 senza ereditare il record',()=>{
 for(const n of [1,2,11,37,79]){
  const x=progressoCoronaInfinito({giorni:n,record:78,interrotta:false});
  assert.equal(x.giorni,n);
  assert.equal(x.mancanti,80-n);
  assert.equal(x.percentuale,n/80*100);
 }
});
test('v469: un premio guadagnato non viene revocato se perdi la streak',()=>{
 const x=progressoCoronaInfinito({giorni:0,record:80,interrotta:true});
 assert.equal(x.sbloccata,true);
 assert.equal(x.percentuale,0);
 assert.equal(statoCoronaInfinito({},80).sbloccata,true);
 assert.equal(statoCoronaInfinito({},80).equipaggiata,true);
});
test('v469: valori invalidi o eccessivi non creano progressi falsi',()=>{
 for(const n of [undefined,NaN,Infinity,-7,'x']){
  const x=progressoCoronaInfinito({giorni:n,record:11});
  assert.equal(x.giorni,0);
  assert.equal(x.percentuale,0);
 }
 assert.equal(progressoCoronaInfinito({giorni:99,record:99}).percentuale,100);
 assert.equal(progressoCoronaInfinito({giorni:11.9,record:11.9}).giorni,11);
});
test('v469: anche dopo un vero salto la streak calcolata alimenta barra a zero',()=>{
 const sedute=[{id:'a',stato:'completata',data:'2026-11-01'},{id:'b',stato:'completata',data:'2026-11-02'}];
 const streak=calcolaStreak(sedute,'2026-11-11');
 assert.equal(streak.giorni,0);
 const progress=progressoCoronaInfinito(streak);
 assert.equal(progress.giorni,0);
 assert.equal(progress.percentuale,0);
});
test('v469: shop, anteprima e avatar non usano piu record per i giorni mancanti',()=>{
 const app=txt('src/app.js');
 const shop=app.slice(app.indexOf('function vistaAuraShop('),app.indexOf('const inventario=el(',app.indexOf('function vistaAuraShop(')));
 assert.match(shop,/const coronaProgresso = progressoCoronaInfinito\(st\.streak\)/);
 assert.match(shop,/coronaProgresso\.giorni\+' \/ 80 giorni di streak'/);
 assert.match(shop,/coronaProgresso\.percentuale\+'%'/);
 assert.doesNotMatch(shop,/Math\.min\(80,streak\)/);
 assert.match(app,/Ti mancano '\+progresso\.mancanti/);
 assert.match(app,/progressoCoronaInfinito\(st\?\.streak\)\.mancanti/);
});
test('v469: pubblicazione e cache allineate, nessuna scrittura nel calcolo',()=>{
 const src=txt('src/aura-skin.js');
 const sw=txt('sw.js');
 assert.match(sw,/const VERSIONE = 'palestra-v487'/);
 assert.match(txt('index.html'),/PALESTRA_VERSIONE = 'palestra-v487'/);
 assert.doesNotMatch(src,/localStorage|db\.salva|update\(/);
});
