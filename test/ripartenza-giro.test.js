import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indiceProssimoGiorno } from '../src/sedute.js';

const versione={id:'v25',scheda_id:'scheda-gym-3',snapshot:{giorni:[
  {id:'giorno-1',nome:'giorno 1'},{id:'giorno-2',nome:'giorno 2'},
  {id:'giorno-3',nome:'giorno 3'},{id:'giorno-4',nome:'giorno 4'}]}};
const vecchia={id:'sed-30',data:'2026-10-30',stato:'completata',
  scheda_id:'scheda-gym-3',giorno_id:'giorno-3',
  ora_inizio:'2026-10-30T18:09:25Z',ora_fine:'2026-10-30T18:10:20Z'};
const reset={scheda_id:'scheda-gym-3',giorno_id:'giorno-1',
  attivato_il:'2026-11-02T21:00:00Z'};
const nuova=(id,giorno,ora,altro={})=>({id,data:'2026-11-03',stato:'completata',
    scheda_id:'scheda-gym-3',giorno_id:giorno,
    ora_inizio:ora,ora_fine:ora,...altro});

test('senza ripartenza la rotazione normale rimane giorno 4',()=>{
  assert.equal(indiceProssimoGiorno(versione,[vecchia],[versione]),3);
});
test('ripartenza richiesta: mostra giorno 1 senza modificare lo storico',()=>{
  const dati=[{...vecchia}];
  assert.equal(indiceProssimoGiorno(versione,dati,[versione],reset),0);
  assert.deepEqual(dati,[vecchia]);
});
test('dopo aver completato giorno 1, il prossimo e giorno 2',()=>{
  const s=nuova('sed-03','giorno-1','2026-11-03T17:35:00Z');
  assert.equal(indiceProssimoGiorno(versione,[vecchia,s],[versione],reset),1);
});
test('dopo aver completato giorno 2, il prossimo e giorno 3',()=>{
  const primo=nuova('a','giorno-1','2026-11-03T17:35:00Z');
  const secondo=nuova('b','giorno-2','2026-11-04T18:15:00Z');
  assert.equal(indiceProssimoGiorno(versione,[vecchia,primo,secondo],[versione],reset),2);
});
test('le sedute in corso o di un altro profilo non consumano il reset',()=>{
  const inCorso=nuova('open','giorno-1','2026-11-03T19:00:00Z',{stato:'in_corso'});
  const amico=nuova('andre','giorno-4','2026-11-04T18:00:00Z',{scheda_id:'altro'});
  assert.equal(indiceProssimoGiorno(versione,[vecchia,inCorso,amico],[versione],reset),0);
});
test('una seduta eliminata dopo il reset non avanza la rotazione',()=>{
  const rimossa=nuova('gone','giorno-1','2026-11-03T19:00:00Z',{eliminata:true});
  assert.equal(indiceProssimoGiorno(versione,[vecchia,rimossa],[versione],reset),0);
});
test('il reset di un altra scheda non altera la rotazione corrente',()=>{
  assert.equal(indiceProssimoGiorno(versione,[vecchia],[versione],
    {...reset,scheda_id:'altra-scheda'}),3);
});
