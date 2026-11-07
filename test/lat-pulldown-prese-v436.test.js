import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { LAT_PULLODOWN_VARIANTI, standardAutomaticoPerEsercizio } from '../src/rank-v3/standard-automatici.js';
import { valutaPrestazione } from '../src/rank-v3/valutazione.js';

const ids=['ex-neutral-grip-lat-pulldown','ex-lat-pulldown-lats','ex-wide-grip-lat-pulldown'];
const ex=id=>ESERCIZI.find(x=>x.id===id);
const prova=(e,kg=70,rep=8)=>valutaPrestazione({esercizio:e,pesoCorporeo:66,serie:[
  {esercizio_id:e.id,peso:kg,ripetizioni:rep,stato:'fatta',seduta_id:'ok'}]});

test('v436: tre ID storici separati, normale rinominata neutra e nessuna migrazione carichi',()=>{
 assert.equal(new Set(ids).size,3);
 assert.deepEqual(ids.map(x=>ex(x).nome),[
  'Lat Pulldown presa stretta','Lat Pulldown presa neutra','Lat Pulldown presa larga']);
 const src=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const mig=src.slice(src.indexOf('async function aggiornaPreseLatSalvate'),src.indexOf('async function aggiornaCadCurlSalvato'));
 assert.match(mig,/db\.salva\('esercizi'/);
 assert.doesNotMatch(mig,/db\.cestino|db\.salva\('serie'/);
});
test('v436: standard delle prese separati, dati 6RM solo proxy scientificamente limitato',()=>{
 const std=ids.map(x=>standardAutomaticoPerEsercizio(ex(x)));
 for(const x of std) {
   assert.equal(x.fonte,'proxy_lat_presa_non_validato');
   assert.equal(x.affidabilitaBase,'bassa');
   assert.match(x.limite,/NON misurate direttamente/);
   assert.equal(x.soglie1RMPerPeso.length,3);
 }
 assert.ok(std[0].soglie1RMPerPeso[0][1]>std[1].soglie1RMPerPeso[0][1]);
 assert.ok(std[1].soglie1RMPerPeso[0][1]>std[2].soglie1RMPerPeso[0][1]);
 assert.ok(Math.abs(std[2].soglie1RMPerPeso[1][3]/std[1].soglie1RMPerPeso[1][3]-77.3/80)<0.00005);
 for(const id of ids) assert.ok(LAT_PULLODOWN_VARIANTI[id]);
});
test('v436: serie reale e storico isolato tra prese, 1RM non stimato',()=>{
 const rs=ids.map(x=>prova(ex(x)));
 for(const r of rs) {
   assert.equal(r.valido,true);
   assert.equal(r.caricoReale,70);
   assert.equal(r.metodoMassimale,null);
 }
 assert.ok(rs[0].indice<=rs[1].indice);
 assert.ok(rs[1].indice<=rs[2].indice);
 const neutra=ex(ids[1]);
 const r=valutaPrestazione({esercizio:neutra,pesoCorporeo:66,serie:[
   {esercizio_id:ids[0],peso:100,ripetizioni:8,stato:'fatta'},
   {esercizio_id:neutra.id,peso:50,ripetizioni:8,stato:'fatta'}]});
 assert.equal(r.caricoReale,50);
});
test('v436: CAD Curl icona offline e versione PWA allineata',()=>{
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(sw,/\.\/img\/esercizi\/cad-curl-app\.jpg/);
 assert.match(sw,/const VERSIONE = 'palestra-v436'/);
 assert.match(index,/window\.PALESTRA_VERSIONE = 'palestra-v436'/);
});
