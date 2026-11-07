import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { valutaPrestazione, RIP_MINIME_PER_PESO, PENALITA_SPOTTER } from '../src/rank-v3/valutazione.js';
import { modelloRipetizioniRank } from '../src/rank-v3/ripetizioni-rank.js';
import { standardAutomaticoPerEsercizio } from '../src/rank-v3/standard-automatici.js';
import { calcolaCaricoStrictCurl } from '../src/strict-curl.js';

const strict=ESERCIZI.find(e=>e.id==='ex-strict-curl-ez-wall');
const s=(id,peso,ripetizioni=8,opzioni={})=>({
  id, esercizio_id:strict.id, seduta_id:'seduta-prova',
  peso, ripetizioni, stato:'fatta', ...opzioni,
});
const rank=(serie,pesoCorporeo=66)=>valutaPrestazione({esercizio:strict,serie,pesoCorporeo});
const vicino=(a,b)=>assert.ok(Math.abs(a-b)<1e-4,`Valori diversi: ${a} e ${b}`);

test('v439: Strict Curl usa la configurazione e le soglie del suo esercizio, non soltanto il peso corporeo',()=>{
  const res=rank([s('a',28)]);
  assert.equal(res.valido,true);
  assert.equal(res.movimento,'bicipiti');
  assert.equal(res.livello,'isolamento');
  assert.equal(res.cfg.caricamento,'bilanciere');
  assert.equal(res.cfg.modello,'carico_esterno');
  assert.equal(res.cfg.tipoAttrezzatura,'bilanciere');
  assert.equal(res.caricoReale,28);
  assert.equal(res.caricoRegistrato,28);
  assert.equal(res.serieId,'a');
  assert.equal(res.ripetizioni,8);
  assert.equal(res.massimale,null);
  assert.ok(Array.isArray(res.soglie) && res.soglie.length===7);
  for(let i=1;i<res.soglie.length;i++) assert.ok(res.soglie[i]>res.soglie[i-1]);
  assert.ok(Number.isFinite(res.score));
  assert.ok(Number.isFinite(res.lp));
  assert.ok(res.calibrazione);
  assert.equal(res.calibrazione.livello,'indicativa');
  assert.match(standardAutomaticoPerEsercizio(strict).fonteUrl,/strict-curl/);
  assert.equal(RIP_MINIME_PER_PESO,5);
  assert.equal(PENALITA_SPOTTER,0.9);
});

test('v439: la barra viene contata una sola volta, entrambi i lati, e le ripetizioni contano davvero',()=>{
  const calcolo=calcolaCaricoStrictCurl(8,10);
  assert.equal(calcolo.totale,28);
  const a=rank([s('r1',calcolo.totale,5)]);
  const b=rank([s('r2',calcolo.totale,8)]);
  const c=rank([s('r3',calcolo.totale,12)]);
  assert.equal(b.caricoReale,28);
  assert.equal(b.caricoRegistrato,28);
  assert.ok(a.score<b.score);
  assert.ok(b.score<c.score);
  assert.ok(b.indice<=c.indice);
  assert.equal(b.massimale,null);
});

test('v439: migliore serie effettiva, esclusione eliminata, minimo 5 ripetizioni',()=>{
  const due=rank([s('leggera',28,8),s('pesante',34,8)]);
  assert.equal(due.serieId,'pesante');
  assert.equal(due.caricoRegistrato,34);
  const sottoCinque=rank([s('valida',28,8),s('tripla',70,3)]);
  assert.equal(sottoCinque.serieId,'valida');
  const eliminata=rank([s('valida',28,8),s('rimossa',70,8,{eliminata:true})]);
  assert.equal(eliminata.serieId,'valida');
  const soloTre=rank([s('tripla',70,3)]);
  assert.equal(soloTre.valido,true);
  assert.equal(soloTre.serieId,'tripla');
  assert.equal(soloTre.calibrazione.livello,'bassa');
});

test('v439: spotter penalizzato come tutti gli esercizi, non annulla il record',()=>{
  const libero=rank([s('libero',30,8)]);
  const aiutato=rank([s('aiutato',30,8,{spotter:true})]);
  assert.equal(aiutato.valido,true);
  assert.equal(aiutato.spotter,true);
  assert.ok(aiutato.score<libero.score);
  vicino(aiutato.score,libero.score*PENALITA_SPOTTER);
  const insieme=rank([s('libero',30,8),s('aiutato',30,8,{spotter:true})]);
  assert.equal(insieme.serieId,'libero');
});

test('v439: peso corporeo modifica il riferimento ma non sostituisce carico e ripetizioni',()=>{
  const leggero=rank([s('r',35,8)],65);
  const pesante=rank([s('r',35,8)],85);
  assert.ok(leggero.score>pesante.score);
  assert.ok(leggero.indice>=pesante.indice);
  const recordPesoSalvato=rank([s('r',35,8,{peso_corpo:65})],85);
  vicino(recordPesoSalvato.score,leggero.score);
  assert.equal(recordPesoSalvato.pesoCorporeo,65);
});

test('v439: LP, volume, soglia successiva e modello ripetizioni restano quelli comuni',()=>{
  const uno=rank([s('uno',30,8)]);
  const tre=rank([s('uno',30,8),s('due',30,8),s('tre',30,8)]);
  assert.equal(uno.valido,true);
  assert.equal(tre.valido,true);
  vicino(uno.score,tre.score);
  assert.ok(tre.serieFatte>uno.serieFatte);
  assert.ok(tre.scoreConSerie>=uno.scoreConSerie);
  assert.ok(tre.distanza && typeof tre.distanza==='object');
  assert.ok(uno.calibrazione);
  const mod=modelloRipetizioniRank(uno.movimento,strict,standardAutomaticoPerEsercizio(strict));
  assert.equal(mod.tipo,'strict_curl_basse_rip');
  assert.equal(mod.massimo,15);
});
