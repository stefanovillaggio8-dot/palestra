import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { calcolaRankDiProva } from '../src/prova-rank.js';
import { recordEsercizio } from '../src/rank.js';
import { valutaPrestazione, movimentoDi } from '../src/rank-v3/valutazione.js';
import { standardPerMovimento } from '../src/rank-v3/modello.js';
import { modelloRipetizioniRank, ripetizioniPieneRank } from '../src/rank-v3/ripetizioni-rank.js';

const trova = id => ESERCIZI.find(e => e.id === id);
const serie = (e, peso, ripetizioni, extra = {}) => ({
  id:'prova-521',esercizio_id:e.id,seduta_id:'sessione-521',stato:'fatta',
  peso,ripetizioni,peso_corpo:72,...extra,
});
const valuta = (e,peso,ripetizioni) => valutaPrestazione({
  esercizio:e,pesoCorporeo:72,serie:[serie(e,peso,ripetizioni)],
});

test('v521: Brzycki e monotono e coerente con il riferimento di 8 rip dei dati 1RM',()=>{
  const e=trova('ex-dumbbell-curl');
  const s=standardPerMovimento(movimentoDi(e).movimento,e);
  const modello=modelloRipetizioniRank('bicipiti',e,s);
  assert.equal(s.fonte,'strengthlevel_esercizio');
  assert.equal(modello.fonte,'brzycki_normalizzato_8rip');
  for(let n=1;n<=8;n++){
    const rapporto=(37-8)/(37-n);
    assert.ok(Math.abs(ripetizioniPieneRank(n,modello)-rapporto)<1e-10,`Brzycki ${n}`);
    if(n>1)assert.ok(ripetizioniPieneRank(n,modello)>ripetizioniPieneRank(n-1,modello));
  }
  assert.equal(ripetizioniPieneRank(8,modello),1);
  assert.ok(ripetizioniPieneRank(9,modello)>1);
  // Una serie di 3 rip conta davvero, senza regalarle un livello estremo.
  const triplo=valuta(e,30,3);
  assert.equal(triplo.caricoReale,30);
  assert.equal(triplo.ripetizioni,3);
  assert.equal(triplo.rank.id,'platinum');
  assert.equal(triplo.lp,28);
  assert.equal(triplo.massimale,null);
  assert.match(triplo.calibrazione.descrizione,/Brzycki/);
});

test('v521: ogni standard specifico usa il confronto breve, senza alterare la prestazione a 8 rip',()=>{
  let specifici=0;
  for(const e of ESERCIZI){
    const mov=movimentoDi(e).movimento;
    const s=standardPerMovimento(mov,e);
    if(s?.fonte!=='strengthlevel_esercizio')continue;
    specifici++;
    const m=modelloRipetizioniRank(mov,e,s);
    assert.equal(ripetizioniPieneRank(8,m),1,e.nome);
    assert.ok(ripetizioniPieneRank(3,m)<1,e.nome);
    if(e.id==='ex-strict-curl-ez-wall')assert.equal(m.tipo,'strict_curl_basse_rip');
    else if(e.id==='ex-one-arm-preacher-curl')assert.equal(m.tipo,'isolamento_preacher');
    else assert.equal(m.tipo,'standard_specifico_basse_rip',e.nome);
  }
  assert.ok(specifici>=8,'copertura delle fonti esatte nel catalogo');
  const preacher=trova('ex-one-arm-preacher-curl');
  const p=modelloRipetizioniRank(movimentoDi(preacher).movimento,preacher,
    standardPerMovimento(movimentoDi(preacher).movimento,preacher));
  assert.equal(p.tipo,'isolamento_preacher');
  assert.equal(ripetizioniPieneRank(3,p),(37-8)/(37-3));
  assert.equal(ripetizioniPieneRank(15,p),ripetizioniPieneRank(12,p),
    'il limite del preacher non aumenta solo per reps molto lunghe');
});

test('v521: Prova un esercizio usa il medesimo Rank reale e lascia intatti gli input',()=>{
  let testati=0;
  for(const e of ESERCIZI){
    if(e.convenzione==='corpo_libero')continue;
    const input={esercizio:e,peso:'30',ripetizioni:'3',pesoCorporeo:'72'};
    const prima=JSON.stringify(input);
    const prova=calcolaRankDiProva(input);
    const reale=recordEsercizio([serie(e,30,3)],e,null,72);
    assert.equal(JSON.stringify(input),prima,e.nome+': nessuna mutazione di input');
    assert.equal(prova.valido,reale.valido,e.nome);
    if(!prova.valido)continue;
    testati++;
    assert.equal(prova.record.motore,reale.motore,e.nome);
    assert.equal(prova.record.rank?.id,reale.rank?.id,e.nome);
    assert.equal(prova.record.divisione?.id,reale.divisione?.id,e.nome);
    assert.equal(prova.record.lp,reale.lp,e.nome);
    assert.equal(prova.record.punteggio,reale.punteggio,e.nome);
    assert.equal(prova.record.fuoriScalaProvvisoria,reale.fuoriScalaProvvisoria,e.nome);
  }
  assert.ok(testati>=75,'il confronto include quasi tutto il catalogo');
});

test('v521: hyperextension alla panca romana e al limite del benchmark non diventa Olympian',()=>{
  const e=trova('ex-back-extension-hanging');
  const prova=calcolaRankDiProva({esercizio:e,peso:80,ripetizioni:7,pesoCorporeo:72});
  assert.equal(prova.valido,true);
  assert.equal(prova.record.caricoReale,80);
  assert.equal(prova.record.fuoriScalaProvvisoria,true);
  assert.equal(prova.record.rank.id,'diamond');
  assert.equal(prova.record.divisione.id,3);
  assert.equal(prova.record.lp,99);
  assert.equal(prova.record.distanza,null);
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(app,/FUORI SCALA PROVVISORIA: 99 LP/,
    'anche la simulazione spiega che 99 LP non significa promozione');
  assert.match(app,/record\.modelloRipetizioni\.massimo/,
    'nella prova si spiega il limite delle ripetizioni lunghe');
});

test('v521: le tre prese della lat dichiarano il proxy e non si fingono percentili misurati',()=>{
  for(const id of ['ex-neutral-grip-lat-pulldown','ex-lat-pulldown-lats','ex-wide-grip-lat-pulldown']){
    const r=valuta(trova(id),55,8);
    assert.equal(r.valido,true,id);
    assert.equal(r.fonte,'proxy_lat_presa_non_validato');
    assert.equal(r.calibrazione.origine,'Lat pulldown: proxy della presa non validato');
    assert.equal(r.calibrazione.livello,'bassa');
    assert.match(r.calibrazione.descrizione,/prese PRONE/);
    assert.match(r.calibrazione.descrizione,/non sono stati misurati direttamente/);
  }
});
