import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { valutaPrestazione } from '../src/rank-v3/valutazione.js';
import { rankDaScore } from '../src/rank-v2/scalata.js';
import { recordEsercizio, rankPrincipale } from '../src/rank.js';

const hyper = ESERCIZI.find(e => e.id === 'ex-back-extension');
const serie = [{id:'hyper80',esercizio_id:hyper.id,seduta_id:'seduta-2026-11-07',
  peso:80,ripetizioni:7.5,stato:'fatta',spotter:false}];

test('v445: 80 kg x 7.5 @ 67 kg supera il riferimento modellato senza Titan inventato',()=>{
  const r=valutaPrestazione({esercizio:hyper,serie,pesoCorporeo:67});
  assert.equal(r.valido,true);
  assert.equal(r.caricoReale,80);
  assert.equal(r.fuoriScalaProvvisoria,true);
  assert.equal(r.indice,4);
  assert.equal(r.lp,99);
  assert.equal(r.distanza,null);
  assert.equal(r.prossimoObiettivo,undefined);
  assert.match(r.calibrazione.origine,/MODELLATO/i);
});

test('v445: il limite per Hyperextension arriva alla UI e non si spaccia per 1 LP da Titan',()=>{
  const rec=recordEsercizio(serie,hyper,null,67);
  assert.equal(rec.valido,true);
  assert.equal(rec.fuoriScalaProvvisoria,true);
  assert.equal(rec.rankId,'diamond');
  assert.equal(rec.distanza,null);
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/99 LP sono il limite della scala provvisoria/);
  assert.match(app,/99 LP è il massimo della fascia/);
  assert.match(app,/Titan non è valutabile in questo esercizio/);
});

test('v445: Titan è realmente raggiungibile con migliore serie a soglia',()=>{
  const soglie=[10,20,30,40,50,60,70];
  const prima=rankDaScore(59.99,soglie,{serieFatte:7});
  const dopo=rankDaScore(60,soglie,{serieFatte:1});
  assert.equal(prima.rank.id,'diamond');
  assert.equal(prima.lp,99);
  assert.equal(dopo.rank.id,'titan');
  assert.equal(dopo.indice,5);
  // 99 LP non sblocca Titan senza una migliore serie che superi la soglia.
  const lontano=rankDaScore(59.2,soglie,{serieFatte:9});
  assert.equal(lontano.rank.id,'diamond');
  assert.equal(lontano.lp,99);
});

test('v445: un record Titan valido supera Diamond III 99 nella classifica principale',()=>{
  const record=[{valido:true,rank:{id:'diamond',indice:4},rankId:'diamond',lp:99,
    fuoriScalaProvvisoria:true},{valido:true,rank:{id:'titan',indice:5},rankId:'titan',lp:0,
    fuoriScalaProvvisoria:false}];
  assert.equal(rankPrincipale(record).rankId,'titan');
});
