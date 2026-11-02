import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nuovaVoceCronologia,eventoDaNota,storicoCronologia,variazioniSerie,
  modificheAncoraAttuali,annullaVoce} from '../src/cronologia.js';

const base=()=>nuovaVoceCronologia({
  id:'123',account:'ste',tipo:'serie_modificata',titolo:'Serie modificata',
  serieId:'s1',prima:{peso:35},dopo:{peso:40},quando:'2026-11-02T20:00:00Z',
});
test('cronologia usa la tabella note esistente e non condivide eventi tra account',()=>{
  const r=base();
  assert.equal(r.livello,'cronologia_app');
  assert.equal(eventoDaNota(r,'ste').serieId,'s1');
  assert.equal(eventoDaNota(r,'andrea'),null);
});
test('l evento annullato resta visibile senza doppio ripristino',()=>{
  const r=base(), e=eventoDaNota(r,'ste');
  const annullata=annullaVoce(r,e);
  assert.equal(eventoDaNota(annullata,'ste').annullato,true);
  assert.equal(annullata.sync,undefined);
});
test('annulla solo se i valori corrispondono al momento della modifica',()=>{
  const e=eventoDaNota(base(),'ste');
  assert.equal(modificheAncoraAttuali({id:'s1',peso:40},e),true);
  assert.equal(modificheAncoraAttuali({id:'s1',peso:45},e),false);
  assert.equal(modificheAncoraAttuali({id:'s1',peso:40,eliminata:true},e),false);
  assert.equal(modificheAncoraAttuali({id:'s2',peso:40},e),false);
});
test('conserva soltanto i campi cambiati ed evita eventi identici',()=>{
  assert.deepEqual(variazioniSerie({peso:30,ripetizioni:5},{peso:35,ripetizioni:5},{peso:35,ripetizioni:5}),
    {prima:{peso:30},dopo:{peso:35}});
  assert.equal(variazioniSerie({peso:35},{peso:35},{peso:35}),null);
});
test('lo storico ignora eventi malformati, cancellati e degli altri account',()=>{
  const good=base();
  const newer=nuovaVoceCronologia({id:'124',account:'ste',tipo:'sedute_eliminate',
    titolo:'Seduta eliminata',quando:'2026-11-03T08:00:00Z',sedute:['w1'],serie:['s1'],ricompense:['r1']});
  assert.deepEqual(storicoCronologia([good,newer,{...good,id:'broken',testo:'non-json'},
    {...good,id:'deleted',eliminata:true}], 'ste').map(x=>x.id), [newer.id,good.id]);
});
