import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { valutaPrestazione, soglieLegibiliNuove } from '../src/rank-v3/valutazione.js';
import { recordEsercizio } from '../src/rank.js';

const ex = id => ESERCIZI.find(e => e.id === id);
function prova(esercizio, peso, rep=8, {corpo=70, spotter=false, giorno='2026-11-04', assistenza}={}) {
  return valutaPrestazione({esercizio,pesoCorporeo:corpo,
    serie:[{
      id:'serie-test',esercizio_id:esercizio.id,seduta_id:'sed-finita',
      stato:'fatta',peso,ripetizioni:rep,spotter,_giorno:giorno,
      ...(assistenza !== undefined ? {peso_assistenza:assistenza} : {}),
    }]});
}
function verificaObiettivo(originale, esercizio, peso, rep, options={}) {
  assert.equal(originale.valido,true);
  assert.ok(originale.distanza?.kgNecessari !== null && originale.distanza?.kgNecessari !== undefined,
    'manca il peso successivo per '+esercizio.id);
  const k = originale.distanza.kgNecessari;
  const next = prova(esercizio, esercizio.convenzione === 'zavorri' ? null : k, rep,
    {...options,...(esercizio.convenzione === 'zavorri' ? {assistenza:k} : {})});
  assert.ok(next.valido, 'serie suggerita non valida per '+esercizio.id);
  assert.ok(next.indice > originale.indice, `Suggeriti ${k} kg ma ${originale.indice} -> ${next.indice} per ${esercizio.id}`);
  return next;
}

test('v423: obiettivo spotter: il peso suggerito raggiunge davvero il rank anche assistito', () => {
  const e = ex('ex-one-arm-preacher-curl');
  const originale = prova(e,22,8,{corpo:66,spotter:true});
  assert.equal(originale.distanza.spotterConsiderato,true);
  assert.equal(originale.distanza.unitaCarico,'kg per manubrio');
  verificaObiettivo(originale,e,22,8,{corpo:66,spotter:true});
  const pulita = prova(e,22,8,{corpo:66});
  // Con lo spotter la fascia attuale puo' essere inferiore: confrontare
  // i due obiettivi successivi direttamente sarebbe matematicamente scorretto.
  assert.ok(originale.score < pulita.score);
});

test('v423: doppia carrucola: soglia in kg da leggere sul carrello, non forza per cavo', () => {
  const e = ex('ex-cable-lateral-raise');
  const originale = prova(e,28,8,{corpo:66});
  assert.equal(originale.valido,true);
  assert.equal(originale.caricoReale,14);
  assert.equal(originale.caricoRegistrato,28);
  assert.equal(originale.distanza.unitaCarico,'kg sul carrello');
  assert.ok(originale.distanza.kgNecessari > originale.caricoRegistrato);
  verificaObiettivo(originale,e,28,8,{corpo:66});
});

test('v423: obiettivo zavorra: suggerimento kg aggiunti, non peso corpo + zavorra',()=>{
  const e=ex('ex-dips');
  const originale=prova(e,null,8,{corpo:66,assistenza:20});
  assert.equal(originale.valido,true);
  assert.equal(originale.caricoReale,86);
  assert.equal(originale.caricoRegistrato,20);
  assert.equal(originale.distanza.unitaCarico,'kg di zavorra');
  assert.ok(originale.distanza.kgNecessari < 100);
  verificaObiettivo(originale,e,null,8,{corpo:66,assistenza:20});
});

test('v423: se la soglia supera il manubrio 60 kg, non si scrive un falso valore in kg',()=>{
  const e=ex('ex-dumbbell-curl');
  const r=prova(e,50,8,{corpo:200});
  assert.equal(r.valido,true);
  const soglie=soglieLegibiliNuove(r.soglie,{esercizio:e,cfg:r.cfg,pesoCorporeo:200});
  assert.equal(soglie.length,7);
  assert.ok(soglie.some(s=>s === null), 'soglie fuori catalogo devono essere null');
  for(const x of soglie){if(x!==null)assert.ok(x<=60);}
});

test('v423: data migliore serie su doppia carrucola verificata per ID e registrato',()=>{
  const e=ex('ex-cable-lateral-raise');
  const s=[{id:'serie-record',esercizio_id:e.id,seduta_id:'finita',
    stato:'fatta',peso:28,ripetizioni:8,ordine:1,_giorno:'2026-11-04'}];
  const r=recordEsercizio(s,e,null,66);
  assert.equal(r.motore,'nuovo');
  assert.equal(r.serieId,'serie-record');
  assert.equal(r.caricoRegistrato,28);
  assert.equal(r.caricoReale,14);
  assert.match(r.testo,/del 04\/11/);
  assert.match(r.testo,/28 kg sul carrello/);
});

test('v423: ricerca unica usata anche nella prova e dettagli non mostrano soglie false',()=>{
  const code=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(code,/costruisciSelettoreEsercizi\(V\.esercizi \|\| \[\]/);
  assert.match(code,/corrispondeRicercaEsercizi\(v, testoRicerca\)/);
  assert.match(code,/oltre i carichi elencati/);
  assert.match(code,/distanza\.unitaCarico/);
});
