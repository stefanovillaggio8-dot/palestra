import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { segnaliProgressione } from '../src/analisi-progressi.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('coach confronta due sedute completate, senza inventare progressi',()=>{
 const sedute=[
  {id:'a',stato:'completata',data:'2026-10-20'},
  {id:'b',stato:'completata',data:'2026-10-27'},
  {id:'c',stato:'iniziata',data:'2026-11-01'},
 ];
 const serie=[
  {seduta_id:'a',esercizio_id:'ex1',stato:'fatta',peso:60,ripetizioni:8},
  {seduta_id:'b',esercizio_id:'ex1',stato:'fatta',peso:62.5,ripetizioni:8},
  {seduta_id:'c',esercizio_id:'ex1',stato:'fatta',peso:120,ripetizioni:20},
  {seduta_id:'a',esercizio_id:'ex2',stato:'fatta',peso:65,ripetizioni:8},
  {seduta_id:'b',esercizio_id:'ex2',stato:'fatta',peso:70,ripetizioni:6},
  {seduta_id:'b',esercizio_id:'ex1',stato:'fatta',peso:100,ripetizioni:8,spotter:true},
 ];
 const x=segnaliProgressione(sedute,serie,[{id:'ex1',nome:'Lat'},{id:'ex2',nome:'Curl'}],10);
 const lat=x.find(z=>z.esercizio_id==='ex1'),curl=x.find(z=>z.esercizio_id==='ex2');
 assert.equal(lat.esito,'miglioramento');
 assert.equal(lat.ultima.peso,62.5,'Escludi serie assistite e sedute incomplete');
 assert.equal(curl.esito,'non_confrontabile','Peso maggiore con meno ripetizioni non basta');
 assert.equal(serie.length,6,'Non mutare le serie originali');
});
test('coach gestisce dati assenti senza errori',()=>{
 assert.deepEqual(segnaliProgressione([],[],[],4),[]);
 assert.deepEqual(segnaliProgressione([{id:'a',stato:'completata',data:'2026-10-30'}],[],[],4),[]);
});
test('coach visibile e disponibile offline senza modificare la scheda',()=>{
 const app=read('src/app.js'),sw=read('sw.js');
 assert.match(app,/extraDentro\.appendChild\(cardCoachProgressi\(\)\)/);
 assert.match(sw,/src\/analisi-progressi\.js/);
 const body=app.slice(app.indexOf('function cardCoachProgressi()'),app.indexOf('function vistaProgressi('));
 assert.doesNotMatch(body,/db\.salva\(|sb\.scrivi\(/);
});
