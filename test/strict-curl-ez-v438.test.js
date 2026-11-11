import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { calcolaCaricoStrictCurl, strictCurlConBarraInclusa, STRICT_CURL_ID } from '../src/strict-curl.js';
import { standardAutomaticoPerEsercizio, tipoAttrezzaturaRank } from '../src/rank-v3/standard-automatici.js';
import { valutaPrestazione } from '../src/rank-v3/valutazione.js';
import { filtraEserciziPerRicerca } from '../src/ricerca-esercizi.js';

const esercizio=ESERCIZI.find(e=>e.id===STRICT_CURL_ID);
const perRank=(kg,bw=66,reps=8)=>valutaPrestazione({
  esercizio,pesoCorporeo:bw,serie:[
    {esercizio_id:STRICT_CURL_ID,peso:kg,ripetizioni:reps,stato:'fatta',seduta_id:'test'}],
});

test('v438: il catalogo contiene lo strict curl con barra EZ e presa interna',()=>{
  assert.ok(esercizio);
  assert.equal(ESERCIZI.filter(e=>e.id===STRICT_CURL_ID).length,1);
  assert.equal(esercizio.convenzione,'bilanciere');
  assert.equal(tipoAttrezzaturaRank(esercizio),'bilanciere');
  assert.ok(strictCurlConBarraInclusa(esercizio));
  assert.match(esercizio.nota_permanente,/presa interna/);
  assert.match(esercizio.nota_permanente,/glutei/);
  assert.match(esercizio.nota_permanente,/totale|TOTALE/);
  assert.match(esercizio.foto,/strict-curl-ez-wall\.jpg$/);
  assert.equal(strictCurlConBarraInclusa({...esercizio,caricoIncludeBarra:false}),true);
  assert.equal(strictCurlConBarraInclusa({id:'ex-ez-bar-curl',convenzione:'per_manubrio'}),false);
});

test('v438: barra piu entrambi i lati: niente peso barra inventato o doppio',()=>{
  assert.deepEqual(calcolaCaricoStrictCurl('8','10'),{
    valido:true,barra:8,dischiPerLato:10,totale:28,formula:'8 + 2 × 10 = 28 kg',
  });
  assert.equal(calcolaCaricoStrictCurl('12,5','7,5').totale,27.5);
  assert.equal(calcolaCaricoStrictCurl('9','0').totale,9);
  assert.equal(calcolaCaricoStrictCurl('0','10').valido,false);
  assert.equal(calcolaCaricoStrictCurl('','10').valido,false);
  assert.equal(calcolaCaricoStrictCurl('8','').valido,false);
  assert.equal(calcolaCaricoStrictCurl('8','abc').valido,false);
  assert.equal(calcolaCaricoStrictCurl('8','-10').valido,false);
  assert.equal(calcolaCaricoStrictCurl('8','2.345').valido,false);
});

test('v438: soglie statistico-specifiche strict curl per corpo 65/75/85 senza confondere EZ normale',()=>{
  const std=standardAutomaticoPerEsercizio(esercizio);
  assert.ok(std);
  assert.deepEqual(std.soglie1RMPerPeso,[
    [65,21,30,43,57,73],
    [75,25,35,49,64,81],
    [85,29,40,54,70,88],
  ]);
  assert.equal(std.fonte,'strengthlevel_esercizio');
  assert.equal(std.affidabilitaBase,'indicativa');
  assert.match(std.fonteUrl,/strength-standards\/strict-curl\/kg$/);
  assert.ok(std.nota.includes('peso TOTALE'));
  const ez=ESERCIZI.find(e=>e.id==='ex-ez-bar-curl');
  assert.equal(standardAutomaticoPerEsercizio(ez),null);
  assert.equal(standardAutomaticoPerEsercizio({...esercizio,convenzione:'per_manubrio'}),null);
});

test('v438: migliore serie e non 1RM ipotetico; tutto il carico e peso corporeo nel Rank',()=>{
  const a=perRank(28),b=perRank(34),c=perRank(34,90);
  for(const x of [a,b,c]){
    assert.equal(x.valido,true);
    assert.equal(x.massimale,null);
    assert.equal(x.metodoMassimale,null);
  }
  assert.equal(a.caricoRegistrato,28);
  assert.equal(a.caricoReale,28);
  assert.equal(b.caricoReale,34);
  assert.ok(b.score>a.score);
  assert.ok(b.indice>=a.indice);
  assert.ok(b.indice>=c.indice);
  assert.equal(perRank(28,66,10).caricoReale,28);
  assert.ok(perRank(28,66,10).score>perRank(28,66,6).score);
});

test('v439: panca Scott include EZ preacher, manubri e CAD Curl, ma non lo Strict Curl',()=>{
  const ids=q=>filtraEserciziPerRicerca(ESERCIZI,q).map(x=>x.id);
  assert.ok(ids('panca scott').includes('ex-one-arm-preacher-curl'));
  assert.ok(ids('panca scott').includes('ex-scott-bench-curl'));
  assert.ok(ids('panca scott').includes('ex-ez-bar-preacher-curl'));
  assert.ok(ids('PÁNCA SCÓTT').includes('ex-ez-bar-preacher-curl'));
  assert.ok(!ids('panca scott').includes(STRICT_CURL_ID));
  assert.ok(!ids('panca scott al contrario').includes('ex-ez-bar-preacher-curl'));
  assert.ok(!ids('panca scott manubri').includes('ex-ez-bar-preacher-curl'));
  assert.ok(ids('panca scott bilanciere').includes('ex-ez-bar-preacher-curl'));
  assert.ok(ids('panca scott EZ').includes('ex-ez-bar-preacher-curl'));
  assert.ok(ids('preacher').includes('ex-ez-bar-preacher-curl'));
  assert.ok(ids('curl rigoroso').includes(STRICT_CURL_ID));
  assert.ok(ids('curl alla parete').includes(STRICT_CURL_ID));
  assert.ok(ids('strict curl').includes(STRICT_CURL_ID));
});

test('v438: il calcolatore salva il TOTALE nellunico campo serie.peso e foto e offline',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const photo=readFileSync(new URL('../img/esercizi/strict-curl-ez-wall.jpg',import.meta.url));
  assert.match(app,/calcolaCaricoStrictCurl\(campoBarraEz\.value, campoDischiLato\.value\)/);
  assert.match(app,/scriviPeso\(calc\.totale\)/);
  assert.match(app,/etichetta: strictCurlConBarraInclusa\(e\) \? 'kg TOTALI/);
  assert.match(sw,/'\.\/src\/strict-curl\.js'/);
  assert.match(sw,/'\.\/img\/esercizi\/strict-curl-ez-wall\.jpg'/);
  assert.match(sw,/const VERSIONE = 'palestra-v475'/);
  assert.match(html,/window\.PALESTRA_VERSIONE = 'palestra-v475'/);
  assert.ok(photo.length>2000);
  assert.equal(photo[0],0xff);
  assert.equal(photo[1],0xd8);
});
