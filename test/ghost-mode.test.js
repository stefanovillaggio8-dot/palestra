import {test} from 'node:test';
import assert from 'node:assert/strict';
import {confrontoGhost} from '../src/ghost-mode.js';

const sedute=[
  {id:'old',stato:'completata',data:'2026-10-20',ora_fine:'2026-10-20T20:00:00'},
  {id:'next',stato:'completata',data:'2026-10-28',ora_fine:'2026-10-28T20:00:00'},
  {id:'now',stato:'in_corso',data:'2026-11-02'},
];
const row=(id,seduta_id,esercizio_id,ordine,peso,ripetizioni,more={})=>
  ({id,seduta_id,esercizio_id,ordine,peso,ripetizioni,stato:'fatta',...more});
test('Ghost sta nel flusso della seduta e confronta soltanto sessioni completate',()=>{
  const serie=[
    row('a','old','dips',1,30,5),row('b','next','dips',1,35,5),
    row('c','now','dips',1,40,5),
  ];
  const g=confrontoGhost({sedute,serie,sedutaAttivaId:'now',esercizioId:'dips'});
  assert.equal(g.disponibile,true);
  assert.equal(g.sedutaId,'next');
  assert.equal(g.ghost,'35 kg × 5');
  assert.equal(g.oggi,'40 kg × 5');
  assert.equal(g.risultati.vinta,1);
  assert.equal(g.stato,'vinci');
});
test('serie non fatte: nessuna vittoria o record inventato',()=>{
  const serie=[row('a','next','dips',1,35,5),row('b','now','dips',1,45,5,{stato:'da_fare'})];
  const g=confrontoGhost({sedute,serie,sedutaAttivaId:'now',esercizioId:'dips'});
  assert.equal(g.comparate,0);
  assert.equal(g.stato,'inizia');
});
test('spotter rende il confronto non omogeneo',()=>{
  const serie=[row('a','next','dips',1,35,5),row('b','now','dips',1,40,5,{spotter:true})];
  const g=confrontoGhost({sedute,serie,sedutaAttivaId:'now',esercizioId:'dips'});
  assert.equal(g.risultati.non_confrontabile,1);
  assert.equal(g.comparate,0);
});
test('meno assistenza vale come avanzamento',()=>{
  const serie=[
    row('a','next','assistito',1,null,10,{peso_assistenza:30}),
    row('b','now','assistito',1,null,10,{peso_assistenza:20}),
  ];
  const g=confrontoGhost({sedute,serie,sedutaAttivaId:'now',esercizioId:'assistito',assistito:true});
  assert.equal(g.risultati.vinta,1);
});
test('cambi misti non sono una vittoria fasulla',()=>{
  const serie=[row('a','next','lat',1,70,10),row('b','now','lat',1,80,8)];
  const g=confrontoGhost({sedute,serie,sedutaAttivaId:'now',esercizioId:'lat'});
  assert.equal(g.risultati.mista,1);
  assert.equal(g.risultati.vinta,0);
});
test('una seduta eliminata o di altro esercizio non diventa Ghost',()=>{
  const old=sedute.map(s=>s.id==='next'?{...s,eliminata:true}:s);
  const g=confrontoGhost({sedute:old,serie:[row('a','next','lat',1,70,10)],sedutaAttivaId:'now',esercizioId:'lat'});
  assert.equal(g.disponibile,false);
});


test('serie precompilata ma non spuntata: OGGI non conta come allenamento',()=>{
  const serie=[row('old1','next','dips',1,20,7),
    row('today1','now','dips',1,20,7,{stato:'da_fare'})];
  const g=confrontoGhost({sedute,serie,sedutaAttivaId:'now',esercizioId:'dips'});
  assert.equal(g.oggi,'— Da segnare');
  assert.equal(g.risultati.pari,0);
  assert.equal(g.bozza,false);
});
test('bozza 22 x 7 visibile subito, possibile vittoria ma nessun record finche non spunti',()=>{
  const serie=[row('old1','next','dips',1,20,7),
    row('today1','now','dips',1,22,7,{stato:'da_fare'})];
  const g=confrontoGhost({sedute,serie,sedutaAttivaId:'now',
    esercizioId:'dips',bozzaIds:['today1'],serieFocusId:'today1'});
  assert.equal(g.oggi,'22 kg × 7');
  assert.equal(g.anteprima,'vinta');
  assert.equal(g.statoVisuale,'bozza');
  assert.match(g.etichetta,/Bozza migliore/);
  assert.equal(g.risultati.vinta,0);
  const fatta=confrontoGhost({sedute,serie:serie.map(s=>s.id==='today1'?{...s,stato:'fatta'}:s),
    sedutaAttivaId:'now',esercizioId:'dips'});
  assert.equal(fatta.risultati.vinta,1);
});
test('Ghost segue la serie che sto modificando, non la prima ancora vuota',()=>{
  const serie=[row('p1','next','lat',1,40,7),row('p2','next','lat',2,45,7),
    row('a1','now','lat',1,40,7,{stato:'da_fare'}),
    row('a2','now','lat',2,50,7,{stato:'da_fare'})];
  const g=confrontoGhost({sedute,serie,sedutaAttivaId:'now',
    esercizioId:'lat',serieFocusId:'a2',bozzaIds:['a2']});
  assert.equal(g.indice,2);
  assert.equal(g.oggi,'50 kg × 7');
  assert.equal(g.ghost,'45 kg × 7');
});
