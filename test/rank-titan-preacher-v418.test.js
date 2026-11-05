import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RANK} from '../src/rank-config.js';
import {GRADI_RANK,tutteLeGraficheRank} from '../src/rank-stemmi.js';
import {ESERCIZI} from '../src/dati-iniziali.js';
import {movimentoDi,valutaPrestazione} from '../src/rank-v3/valutazione.js';
import {standardPerMovimento,soglieNormalizzate} from '../src/rank-v3/modello.js';
import {CURVA_SOGLIE,rankDaScore} from '../src/rank-v2/scalata.js';
import {recordEsercizio} from '../src/rank.js';

const preacher=ESERCIZI.find(e=>e.id==='ex-one-arm-preacher-curl');
const scott=ESERCIZI.find(e=>e.id==='ex-scott-bench-curl');
const ez=ESERCIZI.find(e=>e.id==='ex-ez-bar-preacher-curl');
const evalua=(ex,peso,ripetizioni,body=66)=>recordEsercizio([{
  id:'test-'+ex.id,esercizio_id:ex.id,seduta_id:'finita',stato:'fatta',
  peso,ripetizioni,ordine:1,spotter:false,
}],ex,null,body);

test('v418: Titan non è stato eliminato, compare anche con I/II/III nelle grafiche',()=>{
 assert.deepEqual(RANK.map(x=>x.id),['bronze','silver','gold','platinum','diamond','titan','olympian']);
 assert.equal(GRADI_RANK.find(x=>x.id==='titan')?.divisioni,3);
 const grafici=tutteLeGraficheRank();
 assert.ok(grafici.some(x=>x.id.includes('titan')||x.rankId==='titan'));
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/Olympian, Titan, Diamond/);
});

test('v418: il motore può assegnare Titan III e Titan I tra Diamond e Olympian',()=>{
 const std=standardPerMovimento('bicipiti_panca',preacher);
 const soglie=soglieNormalizzate({standard:std,meccanica:1.05,pesoCorporeo:66});
 assert.equal(soglie.length,7);
 for(let i=1;i<7;i++)assert.ok(soglie[i]>soglie[i-1],`soglia ${i}`);
 const q1=soglie[5]+(soglie[6]-soglie[5])*.1;
 const q3=soglie[5]+(soglie[6]-soglie[5])*.9;
 for(const q of [q1,q3]){
  const r=rankDaScore(q,soglie,{serieFatte:3});
  assert.equal(r.rank.id,'titan');
  assert.ok(['I','II','III'].includes(r.divisione?.nome));
 }
 assert.equal(rankDaScore(soglie[4]+(soglie[5]-soglie[4])*.4,soglie).rank.id,'diamond');
 assert.equal(rankDaScore(soglie[6]+1,soglie).rank.id,'olympian');
});

test('v418: prova end-to-end: una serie può davvero ricevere Titan dal motore v3',()=>{
 const titan=evalua(preacher,32,8);
 assert.equal(titan.motore,'nuovo');
 assert.equal(titan.rankId,'titan',`32kg x8: ${titan.rank?.nome}`);
 assert.ok(['I','II','III'].includes(titan.divisione?.nome));
 const oltre=evalua(preacher,40,8);
 assert.equal(oltre.rankId,'olympian');
});

test('v419: Titan ha spazio sufficiente grazie a un riferimento statistico dedicato',()=>{
 const std=standardPerMovimento('bicipiti_panca',preacher);
 const soglie=soglieNormalizzate({standard:std,pesoCorporeo:66});
 assert.ok(soglie[6]-soglie[5]>0);
 assert.ok(soglie[6]-soglie[5] > soglie[5]-soglie[4]);
 // La vecchia curva generica resta invariata per gli altri esercizi.
 assert.deepEqual(CURVA_SOGLIE,[0,.10,.24,.42,.60,1.05,1.075]);
});

test('v418: il Preacher Curl ha una classificazione dedicata, manubrio singolo',()=>{
 assert.equal(movimentoDi(preacher).movimento,'bicipiti_panca');
 assert.equal(preacher.convenzione,'per_manubrio');
 const std=standardPerMovimento('bicipiti_panca',preacher);
 assert.equal(std.ingresso,.12);
 assert.equal(std.vertice,.50);
 assert.match(std.nota,/singolo braccio|un solo braccio/i);
 // Il CAD Curl usa due manubri e busto arretrato: scala propria stimata,
 // distinta dal Preacher Curl a UN manubrio e dai percentili specifici.
 assert.equal(scott.nome,'CAD Curl');
 assert.ok(Math.abs(standardPerMovimento('bicipiti_panca',scott).ingresso - 8/75)<1e-8);
 assert.ok(Math.abs(standardPerMovimento('bicipiti_panca',scott).vertice - 41/75)<1e-8);
 assert.equal(standardPerMovimento('bicipiti_panca',scott).fonte,'proxy_cad_non_validato');
 assert.match(standardPerMovimento('bicipiti_panca',scott).nota,/CAD Curl/);
});

test('v419: 22 kg per un braccio non viene sovrastimato come Diamond',()=>{
 for(const reps of [5,6,8,10]){
  const r=evalua(preacher,22,reps);
  assert.equal(r.valido,true);
  assert.equal(r.rankId,reps===5?'gold':'platinum',
   `22kg x ${reps}: ${r.rank?.nome} (contano anche le ripetizioni reali)`);
  assert.equal(r.motore,'nuovo');
 }
});

test('v418: nessun effetto sulle soglie di EZ bar, curl generico, cavi e altri muscoli',()=>{
 const stdEz=standardPerMovimento('bicipiti_panca',ez);
 assert.equal(stdEz.ingresso,.15);
 assert.equal(stdEz.vertice,.85);
 const generic=standardPerMovimento('bicipiti',preacher);
 assert.equal(generic.ingresso,.15);
 assert.equal(generic.vertice,.95);
 const chest=ESERCIZI.find(x=>x.nome==='Chest Press');
 assert.ok(chest);
 assert.equal(standardPerMovimento(movimentoDi(chest).movimento,chest).vertice,.85);
 const src=readFileSync(new URL('../src/rank-v2/scalata.js',import.meta.url),'utf8');
 assert.match(src,/\[0, 0\.10, 0\.24, 0\.42, 0\.60, 1\.05, 1\.075\]/);
});

test('v418: la sola variante Scott a un braccio è calibrata con dati di riferimento',()=>{
 const std=standardPerMovimento('bicipiti_panca',preacher);
 assert.ok(Math.abs(std.ingresso - 9/75) < .001);
 assert.ok(Math.abs(std.vertice - 37/75) < .01);
 const sample=valutaPrestazione({esercizio:preacher,serie:[{
  peso:22,ripetizioni:8,stato:'fatta',seduta_id:'sed-1',
 }],pesoCorporeo:66});
 assert.equal(sample.valido,true);
 assert.equal(sample.movimento,'bicipiti_panca');
 assert.equal(sample.soglie.length,7);
 assert.equal(sample.rank.id,'platinum');
});
