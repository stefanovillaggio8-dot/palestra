import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaRecapPalestra, NOMI_MESI_RECAP } from '../src/recap-palestra.js';
const ex=[
 {id:'lat',nome:'Lat Machine',convenzione:'macchina'},
 {id:'dip',nome:'Dips zavorrati',convenzione:'zavorri'},
 {id:'aiutato',nome:'Trazioni assistite',convenzione:'assistenza'},
 {id:'libero',nome:'Plank',convenzione:'corpo_libero'},
];
const sed=(id,data,stato='completata',extra={})=>({id,data,stato,...extra});
const set=(id,seduta_id,esercizio_id,peso,rip,extra={})=>({
  id,seduta_id,esercizio_id,peso,ripetizioni:rip,stato:'fatta',...extra,
});
const base=()=>{
 const sedute=[
  sed('old','2025-12-20'),
  sed('a','2026-01-10','completata',{durata_secondi:3600}),
  sed('b','2026-01-15','completata',{durata_secondi:1800}),
  sed('c','2026-02-07'),
  sed('x','2026-02-09','in_corso'),
  sed('deleted','2026-02-11','completata',{eliminata:true}),
  sed('future','2026-12-31'),
  sed('a','2026-01-10'),
 ];
 const serie=[
  set('old-l','old','lat',60,7),
  set('a-l','a','lat',65,8),
  set('a-d','a','dip',null,6,{peso_assistenza:20}),
  set('b-l','b','lat',70,5),
  set('b-d','b','dip',null,6,{peso_assistenza:30}),
  set('c-l','c','lat',72,4),
  set('c-a','c','aiutato',null,6,{peso_assistenza:10}),
  set('old-a','old','aiutato',null,6,{peso_assistenza:20}),
  set('x-l','x','lat',200,20),
  set('deleted-l','deleted','lat',201,20),
  set('future-l','future','lat',205,20),
  set('b-l','b','lat',70,5), // stessa serie duplicata
  set('spot','c','lat',100,10,{spotter:true}),
 ];
 return {sedute,serie,esercizi:ex,oggi:'2026-11-02'};
};
test('mese: sessioni distinte, giorni, serie e PR dal passato',()=>{
 const result=calcolaRecapPalestra({...base(),anno:2026,mese:1});
 assert.equal(result.tipo,'mese');assert.equal(result.nome,'Gennaio');
 assert.equal(result.allenamenti,2);assert.equal(result.giorni,2);
 assert.equal(result.serie,4);assert.equal(result.esercizi,2);
 assert.equal(result.record,2,'due record lat rispetto a dicembre, primo dip senza storico non e record battuto');
 assert.equal(result.durataMinuti,90);
 assert.equal(result.esercizioPiuAllenato.nome,'Lat Machine');
});
test('mese febbraio non inventa record per carichi sotto 5 ripetizioni o serie spotter',()=>{
 const r=calcolaRecapPalestra({...base(),anno:2026,mese:2});
 assert.equal(r.allenamenti,1);assert.equal(r.record,1,'assistenza reale da 20 a 10 = PR');
 assert.equal(r.recordDettagli[0].unita,'assistenza');
});
test('anno: somma mesi, zero nei mesi senza sedute, futuro ignorato',()=>{
 const r=calcolaRecapPalestra({...base(),anno:2026});
 assert.equal(r.tipo,'anno');assert.equal(r.mesi.length,12);
 assert.equal(r.allenamenti,3);assert.equal(r.giorni,3);
 assert.equal(r.record,3);assert.equal(r.serie,7);
 assert.equal(r.mesi[10].allenamenti,0);
 assert.equal(r.meseMigliore.nome,'Gennaio');
 assert.equal(NOMI_MESI_RECAP[0],'Gennaio');
});
test('PR zavorre: +30 batte +20, aumento di aiuto vero NON e un PR',()=>{
 const s=[sed('p','2026-02-01'),sed('q','2026-03-01'),sed('r','2026-04-01')];
 const serie=[
  set('1','p','dip',null,6,{peso_assistenza:20}),
  set('2','q','dip',null,6,{peso_assistenza:30}),
  set('3','r','dip',null,6,{peso_assistenza:10}),
  set('4','p','aiutato',null,7,{peso_assistenza:15}),
  set('5','q','aiutato',null,7,{peso_assistenza:25}),
 ];
 const r=calcolaRecapPalestra({sedute:s,serie,esercizi:ex,anno:2026,mese:3,oggi:'2026-11-02'});
 assert.equal(r.record,1);assert.equal(r.recordDettagli[0].unita,'zavorra');
});
test('allenamenti con solo serie non finite non generano progressi inventati',()=>{
 const s=[sed('p','2026-10-01'),sed('q','2026-10-08')];
 const serie=[set('1','p','lat',65,8),set('2','q','lat',80,8,{stato:'da_fare'})];
 const r=calcolaRecapPalestra({sedute:s,serie,esercizi:ex,anno:2026,mese:10,oggi:'2026-11-02'});
 assert.equal(r.allenamenti,2);assert.equal(r.serie,1);assert.equal(r.record,0);
});
test('recap vuoto non genera record e non scrive in nessun database',()=>{
 const r=calcolaRecapPalestra({anno:2024,mese:11,oggi:'2026-11-02'});
 assert.equal(r.allenamenti,0);assert.equal(r.record,0);
 const ui=readFileSync(new URL('../src/recap-ui.js',import.meta.url),'utf8');
 assert.match(ui,/Mensile/);assert.match(ui,/Annuale/);assert.match(ui,/recap-colonne/);
 assert.doesNotMatch(ui,/db\.scrivi|sb\.scrivi|db\.salva|localStorage\.setItem/);
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.match(app,/else if \(rotta === '\/recap'\) vistaRecap\(contenuto\)/);
 assert.match(app,/href: '#\/recap'/);
});
test('nessuna data futura o eliminata contribuisce al passato',()=>{
 const r=calcolaRecapPalestra({...base(),anno:2026,mese:12});
 assert.equal(r.allenamenti,0);
});
