import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONVENZIONI } from '../src/numeri.js';
import {
  riepilogoGenerale, testoProgresso, serieRiferimentoProgressi,
  confrontoCompattoProgressi,
} from '../src/progressi.js';

const dip = { id: 'ex-dips', nome: 'Dips zavorrati', convenzione: CONVENZIONI.ZAVORRI };
const pull = { id: 'ex-pull-ups', nome: 'Trazioni zavorrate', convenzione: CONVENZIONI.ZAVORRI };
const aid = { id: 'ex-trazioni-assistite', nome: 'Trazioni assistite', convenzione: CONVENZIONI.ASSISTENZA };
const press = { id: 'ex-press', nome: 'Chest Press', convenzione: CONVENZIONI.MACCHINA };
const set = (carico, rip, campo = 'peso_assistenza') =>
  ({ [campo]: carico, ripetizioni: rip, stato: 'fatta', spotter: false });
const voce = (e, prima, ultima, campo = 'peso_assistenza') => ({
  nome:e.nome, esercizio:e,
  punti: [
    { data:'2026-10-01', serie:[set(prima[0],prima[1],campo)] },
    { data:'2026-10-20', serie:[set(ultima[0],ultima[1],campo)] },
  ],
});

test('dips e trazioni: zavorra più alta NON è assistenza e fa avanzare', () => {
  for (const e of [dip,pull]) {
    const r = riepilogoGenerale([voce(e,[35,6],[40,5])]);
    assert.equal(r.migliorati,1);
    assert.equal(r.indietro,0);
    const x=r.gruppi.migliorati[0];
    assert.equal(x.zavorre,true);
    assert.equal(x.assistito,false);
    assert.match(confrontoCompattoProgressi(x),/\+40 kg × 5 vs \+35 kg × 6/);
    assert.doesNotMatch(x.frase,/assistenza|aiuto/i);
    assert.match(x.frase,/zavorra/i);
  }
});
test('meno zavorra nei dips: peggiorato non significa più aiuto', () => {
  const r=riepilogoGenerale([voce(dip,[40,6],[30,8])]);
  assert.equal(r.indietro,1);
  const x=r.gruppi.indietro[0];
  assert.equal(x.assistito,false);
  assert.equal(x.zavorre,true);
  assert.match(confrontoCompattoProgressi(x),/\+30 kg × 8 vs \+40 kg × 6/);
  assert.doesNotMatch(x.frase,/aiuto|assistenza/i);
});
test('una VERA macchina assistita mantiene il verso inverso', () => {
  const r=riepilogoGenerale([voce(aid,[30,6],[20,7])]);
  assert.equal(r.migliorati,1);
  assert.equal(r.gruppi.migliorati[0].assistito,true);
  assert.equal(r.gruppi.migliorati[0].zavorre,false);
});
test('peso normale: il confronto include il numero di ripetizioni', () => {
  const r=riepilogoGenerale([voce(press,[65,8],[68,7],'peso')]);
  const x=r.gruppi.migliorati[0];
  assert.match(confrontoCompattoProgressi(x),/68 kg × 7 vs 65 kg × 8/);
});
test('record zavorra: serie più pesante, a parità di kg più ripetizioni', () => {
 const s=[set(40,5),set(40,7),set(35,12)];
 assert.deepEqual(serieRiferimentoProgressi(s,pull),{peso:40,ripetizioni:7});
});
test('nessuna ripetizione inventata nel confronto con scheda',()=>{
 const v={da:35,a:40,ripA:6,ripDa:null,zavorre:true,contro:'scheda'};
 assert.match(confrontoCompattoProgressi(v),/\+40 kg × 6 vs \+35 kg previsti in scheda/);
});
test('dettagli zavorra e grafici non scrivono mai "aiuto" nei zavorrati',()=>{
 const s=testoProgresso(pull.nome,pull,voce(pull,[30,5],[40,5]).punti).linee.join(' ');
 assert.match(s,/più zavorra/);
 assert.doesNotMatch(s,/assistenz|aiuto/i);
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/zavorre \? 'Zavorra \(kg\)'/);
 assert.match(app,/confrontoCompattoProgressi\(v\)/);
});
