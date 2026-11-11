import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quadroSfideAutomatiche,interpretaPremioSfida,premioSfidaAutomatica,premioSfidaAncoraValido,SFIDE_AUTOMATICHE} from '../src/sfide-automatiche.js';

const profilo={giorni_allenamento:[2,3,5,6]}; // mar/mer/ven/sab
const esercizi=[{id:'ex-chest-press',nome:'Chest Press',convenzione:'macchina'}];
const crea=(giorno,peso=60)=>({
 seduta:{id:'sed-'+giorno,data:giorno,stato:'completata',eliminata:false},
 serie:[1,2,3].map(i=>({id:'serie-'+giorno+'-'+i,seduta_id:'sed-'+giorno,
   esercizio_id:'ex-chest-press',stato:'fatta',ripetizioni:8,peso,eliminata:false}))
});
const dati=(giorni,oggi,options={})=>{
 const input=giorni.map(x=>crea(x.date||x,x.peso||60));
 return {account:'account-1',oggi,profilo,esercizi,
  sedute:input.map(x=>x.seduta),serie:input.flatMap(x=>x.serie),
  ricompense:[],pesoCorporeo:70,...options};
};
const sfida=(q,categoria,id)=>q[categoria].find(x=>x.id===id);

test('v471: daily premia solo la seduta completata con almeno due serie eseguite',()=>{
 const args=dati(['2026-11-11'],'2026-11-11');
 const q=quadroSfideAutomatiche(args);
 assert.equal(sfida(q,'daily','allenamento-completo').raggiunta,true);
 assert.equal(sfida(q,'daily','tre-serie').raggiunta,true);
 const incompleto={...args,serie:args.serie.slice(0,1)};
 assert.equal(sfida(quadroSfideAutomatiche(incompleto),'daily','allenamento-completo').raggiunta,false);
 assert.equal(sfida(quadroSfideAutomatiche(incompleto),'daily','tre-serie').raggiunta,false);
 const finto={...args,sedute:args.sedute.map(s=>({...s,stato:'in_corso'}))};
 assert.equal(sfida(quadroSfideAutomatiche(finto),'daily','allenamento-completo').raggiunta,false);
});

test('v471: il riposo programmato non impone alcuna Daily Mission',()=>{
 assert.equal(quadroSfideAutomatiche(dati([], '2026-11-12')).daily.length,0); // giovedi
 assert.equal(quadroSfideAutomatiche(dati([], '2026-11-11')).daily.length,2);
});

test('v471: la weekly conta giorni diversi, non doppie sedute nello stesso giorno',()=>{
 const args=dati(['2026-11-10','2026-11-11','2026-11-13'],'2026-11-13');
 let q=quadroSfideAutomatiche(args);
 assert.equal(sfida(q,'weekly','due-allenamenti').raggiunta,true);
 assert.equal(sfida(q,'weekly','tre-allenamenti').raggiunta,true);
 const doppia=crea('2026-11-13');
 doppia.seduta.id='duplicata'; doppia.serie.forEach(x=>x.seduta_id='duplicata');
 const due=dati(['2026-11-10','2026-11-13'],'2026-11-13');
 q=quadroSfideAutomatiche({...due,sedute:[...due.sedute,doppia.seduta],serie:[...due.serie,...doppia.serie]});
 assert.equal(sfida(q,'weekly','due-allenamenti').raggiunta,true);
 assert.equal(sfida(q,'weekly','tre-allenamenti').raggiunta,false);
});

test('v471: premio con ID stabile e nessuna nuova ricompensa per doppio dispositivo',()=>{
 const args=dati(['2026-11-11'],'2026-11-11');
 const v=sfida(quadroSfideAutomatiche(args),'daily','allenamento-completo');
 const premio=premioSfidaAutomatica(v);
 assert.equal(premio.tipo,'missione_auto');
 assert.deepEqual(interpretaPremioSfida(premio),{categoria:'daily',id:'allenamento-completo',periodo:'2026-11-11'});
 const due=sfida(quadroSfideAutomatiche({...args,ricompense:[premio]}),'daily','allenamento-completo');
 assert.equal(v.chiave,due.chiave);
 assert.equal(due.premiata,true);
 assert.equal(premioSfidaAncoraValido(premio,args),true);
 assert.equal(premioSfidaAncoraValido(premio,{...args,sedute:[]}),false);
});

test('v471: la prima prestazione su un esercizio NON e un record battuto',()=>{
 const first=dati(['2026-11-11'],'2026-11-11');
 assert.equal(sfida(quadroSfideAutomatiche(first),'weekly','record-vero').raggiunta,false);
 const comparison=dati([{date:'2026-11-03',peso:40},{date:'2026-11-11',peso:65}],'2026-11-11');
 const q=quadroSfideAutomatiche(comparison);
 assert.equal(sfida(q,'weekly','record-vero').raggiunta,true);
 assert.equal(q.recordVeri,1);
});

test('v471: le sfide segrete si sbloccano solo con prove reali, senza pulsanti',()=>{
 const dates=['2026-10-06','2026-10-07','2026-10-09','2026-10-10','2026-10-13',
  '2026-10-14','2026-10-16','2026-10-17','2026-11-10','2026-11-11'];
 const q=quadroSfideAutomatiche(dati(dates,'2026-11-11'));
 assert.equal(sfida(q,'secret','dieci-allenamenti').raggiunta,true);
 assert.equal(sfida(quadroSfideAutomatiche(dati(dates.slice(0,9),'2026-11-11')),'secret','dieci-allenamenti').raggiunta,false);
 assert.equal(sfida(q,'secret','tre-record-veri').raggiunta,false);
});

test('v471: saldi storici e shop non sono resettati; nessuna conferma manuale',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const missioni=app.slice(app.indexOf('// Daily, Weekly e Secret sono verificate'),app.indexOf('// --- cronologia delle sfide fatte ---'));
 assert.doesNotMatch(missioni,/L.ho fatta|Riscatta premio settimanale|completaMissione\(/);
 assert.doesNotMatch(app,/function completaMissione\(/);
 assert.ok(app.includes("await aggiornaSfideAutomatiche({rivalida:true})"));
 assert.match(app,/await sb\.acquistaAura\(account, o\.id\)/);
 const p=app.match(/id:'skin-mitica'[^\n]*prezzo:(\d+)/);
 assert.equal(Number(p[1]),14000);
 assert.equal(SFIDE_AUTOMATICHE.weekly.find(x=>x.id==='record-vero').aura,150);
});
