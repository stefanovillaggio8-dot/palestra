import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tabellaEserciziAnnuale } from '../src/recap-palestra.js';

const esercizi=[
  {id:'dips',nome:'Dips zavorrati',convenzione:'zavorri'},
  {id:'chest',nome:'Chest Press',convenzione:'macchina'},
  {id:'lat',nome:'Lat Machine',convenzione:'macchina'},
  {id:'assist',nome:'Trazioni assistite',convenzione:'assistenza'},
  {id:'libero',nome:'Trazioni a corpo libero',convenzione:'corpo_libero'},
];
const seduta=(id,data,extra={})=>({id,data,stato:'completata',...extra});
const set=(id,sid,eid,peso,rip,extra={})=>({
  id,seduta_id:sid,esercizio_id:eid,peso,ripetizioni:rip,stato:'fatta',...extra,
});
test('gennaio e febbraio: una riga per esercizio, kg × rip e mesi ordinati',()=>{
  const sedute=[seduta('a','2026-01-05'),seduta('b','2026-01-20'),seduta('c','2026-02-09')];
  const serie=[set('1','a','chest',65,8),set('2','b','chest',68,7),
    set('3','a','lat',72,10),set('4','c','chest',70,6)];
  const m=tabellaEserciziAnnuale({sedute,serie,esercizi,anno:2026,oggi:'2026-11-02'});
  assert.equal(m.length,12);
  assert.equal(m[0].nome,'Gennaio');
  assert.equal(m[0].esercizi.length,2);
  assert.deepEqual(m[0].esercizi.map(x=>x.nome),['Chest Press','Lat Machine']);
  assert.deepEqual([m[0].esercizi[0].peso,m[0].esercizi[0].ripetizioni],[68,7]);
  assert.equal(m[1].esercizi[0].peso,70);
  assert.equal(m[2].esercizi.length,0);
});
test('peso corporeo storico: pesata precedente, niente pesate future',()=>{
  const sedute=[seduta('a','2026-01-20'),seduta('b','2026-02-04')];
  const serie=[set('1','a','chest',65,8),set('2','b','chest',70,6)];
  const pesi=[{data:'2026-01-15',kg:65},{data:'2026-02-01',kg:66},{data:'2026-11-02',kg:70}];
  const m=tabellaEserciziAnnuale({sedute,serie,esercizi,anno:2026,pesi,oggi:'2026-11-02'});
  assert.equal(m[0].esercizi[0].pesoCorporeo,65);
  assert.equal(m[1].esercizi[0].pesoCorporeo,66);
});
test('se manca il peso storico non si inventa quello attuale',()=>{
  const sedute=[seduta('a','2026-01-04')];
  const serie=[set('1','a','chest',65,8)];
  const pesi=[{data:'2026-03-01',kg:67}];
  const m=tabellaEserciziAnnuale({sedute,serie,esercizi,anno:2026,pesi,oggi:'2026-11-02'});
  assert.equal(m[0].esercizi[0].pesoCorporeo,null);
});
test('peso nella serie e nella seduta prevale su pesata successiva',()=>{
  const sedute=[seduta('a','2026-01-04',{peso_corpo:65}),seduta('b','2026-02-04')];
  const serie=[set('1','a','dips',null,5,{peso_assistenza:40,peso_corpo:64}),
    set('2','b','chest',65,8)];
  const pesi=[{data:'2026-01-01',kg:62}];
  const m=tabellaEserciziAnnuale({sedute,serie,esercizi,anno:2026,pesi,oggi:'2026-11-02'});
  assert.equal(m[0].esercizi[0].pesoCorporeo,64);
  assert.equal(m[0].esercizi[0].convenzione,'zavorri');
  assert.equal(m[0].esercizi[0].peso,40);
  assert.equal(m[1].esercizi[0].pesoCorporeo,62);
});
test('dips e trazioni assistite non sono confusi: migliore zavorra sale, assistenza scende',()=>{
  const sedute=[seduta('a','2026-03-05'),seduta('b','2026-03-10')];
  const serie=[set('1','a','dips',null,7,{peso_assistenza:30}),
    set('2','b','dips',null,6,{peso_assistenza:40}),
    set('3','a','assist',null,8,{peso_assistenza:30}),
    set('4','b','assist',null,6,{peso_assistenza:20})];
  const m=tabellaEserciziAnnuale({sedute,serie,esercizi,anno:2026,oggi:'2026-11-02'});
  assert.equal(m[2].esercizi.find(x=>x.esercizio_id==='dips').peso,40);
  assert.equal(m[2].esercizi.find(x=>x.esercizio_id==='assist').peso,20);
});
test('conserva risultati validi sotto 5 ripetizioni senza spacciarli per PR',()=>{
  const m=tabellaEserciziAnnuale({sedute:[seduta('a','2026-04-01')],
    serie:[set('1','a','chest',85,3)],esercizi,anno:2026,oggi:'2026-11-02'});
  assert.equal(m[3].esercizi[0].ripetizioni,3);
});
test('esclude serie eliminate, non completate, assistite da spotter, future e duplicati',()=>{
  const sedute=[seduta('a','2026-06-01'),seduta('b','2026-06-12',{eliminata:true}),
    seduta('c','2026-06-19',{stato:'in_corso'}),seduta('d','2026-12-31')];
  const serie=[set('1','a','chest',70,7),set('1','a','chest',70,7),
    set('2','a','chest',90,10,{spotter:true}),
    set('3','a','chest',100,10,{eliminata:true}),
    set('4','a','chest',100,10,{stato:'da_fare'}),
    set('5','b','chest',105,10),set('6','c','chest',110,10),set('7','d','chest',120,12)];
  const m=tabellaEserciziAnnuale({sedute,serie,esercizi,anno:2026,oggi:'2026-11-02'});
  assert.equal(m[5].esercizi.length,1);
  assert.equal(m[5].esercizi[0].peso,70);
  assert.equal(m[11].esercizi.length,0);
});
test('tabella annuale con intestazioni, mesi ed account isolato',()=>{
  const ui=readFileSync(new URL('../src/recap-ui.js',import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(ui,/tabellaMensileEsercizi/);
  assert.match(ui,/Kg × rip\./);
  assert.match(ui,/Peso corporeo/);
  assert.match(ui,/recap-mese-esercizi/);
  assert.match(app,/pesiCronologici\(account\)/);
  assert.doesNotMatch(ui,/db\.salva|db\.cestino|localStorage\.setItem/);
});
