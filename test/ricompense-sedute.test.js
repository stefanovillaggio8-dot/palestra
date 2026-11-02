import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collegaPremioASeduta, sedutaDelPremio, premiDaAnnullare } from '../src/ricompense-sedute.js';
import { totaliDaRicompense } from '../src/aura.js';

const sedute = [
  { id:'a', data:'2026-11-01', stato:'completata' },
  { id:'b', data:'2026-11-01', stato:'completata' },
  { id:'c', data:'2026-11-02', stato:'completata' },
];
const serie = [
  { id:'s1', seduta_id:'a', esercizio_id:'panca' },
  { id:'s2', seduta_id:'b', esercizio_id:'lat' },
];
const premio = (id,tipo,fonte,aggiunte={}) => ({
  id, tipo, fonte, account_id:'io', aura:10, xp:20,
  quando:'2026-11-01', dettaglio:'premio', ...aggiunte,
});
const ricompense = [
  premio('p-a','allenamento','a'),
  premio('p-b','allenamento','b'),
  collegaPremioASeduta(premio('r-a','record','panca'), 'a'),
  collegaPremioASeduta(premio('pr-b','promozione','lat:gold'), 'b'),
  collegaPremioASeduta(premio('t-a','traguardo','2026-11-01:10'), 'a'),
  premio('old-a','record','panca'), // vecchio premio senza ID: esercizio soltanto in a
  premio('old-b','record','lat'), // vecchio premio senza ID: esercizio soltanto in b
  premio('old-t','traguardo','2026-11-01:20'), // ambiguo finche' resta b
  premio('mission','missione','missione-1'),
  premio('spesa','spesa_aura','shop:armatura', {aura:-90,xp:0}),
  premio('amico','allenamento','a', {account_id:'altro'}),
];
const calcola=ids=>premiDaAnnullare({account:'io',ids,sedute,serie,ricompense})
  .map(p=>p.id).sort();

test('premi nuovi: la seduta resta identificabile anche con caratteri speciali',()=>{
  const r=collegaPremioASeduta(premio('x','record','panca'),'id:/@1');
  assert.equal(sedutaDelPremio(r),'id:/@1');
  assert.equal(sedutaDelPremio(collegaPremioASeduta(r,'b')),'b');
});
test('eliminare una seduta annulla solo i premi relativi, inclusi record e streak',()=>{
  assert.deepEqual(calcola(['a']), ['old-a','p-a','r-a','t-a']);
});
test('eliminare piu sedute annulla tutti i premi collegabili senza toccare missioni, shop o amici',()=>{
  assert.deepEqual(calcola(['a','b']), ['old-a','old-b','old-t','p-a','p-b','pr-b','r-a','t-a']);
});
test('premio legacy ambiguo su due sedute dello stesso giorno non viene cancellato a caso',()=>{
  assert.ok(!calcola(['a']).includes('old-t'));
  assert.ok(!calcola(['b']).includes('old-t'));
});
test('seduta assente, non completata, eliminata o di altri account non da accesso ai premi',()=>{
  assert.deepEqual(calcola(['non-esiste']),[]);
  const invalide=[{id:'a',data:'2026-11-01',stato:'in_corso'}];
  assert.deepEqual(premiDaAnnullare({account:'io',ids:['a'],sedute:invalide,serie,ricompense}),[]);
  assert.deepEqual(premiDaAnnullare({account:'io',ids:['a'],sedute:[{...sedute[0],eliminata:true}],serie,ricompense}),[]);
});
test('XP e Aura si ricalcolano dopo aver messo nel cestino le ricompense revocate',()=>{
  const annullati=new Set(calcola(['a']));
  const prima=totaliDaRicompense(ricompense.filter(x=>x.account_id==='io'));
  const dopo=totaliDaRicompense(ricompense.filter(x=>x.account_id==='io' && !annullati.has(x.id)));
  assert.equal(prima.aura-dopo.aura,40);
  assert.equal(prima.xp-dopo.xp,80);
});
