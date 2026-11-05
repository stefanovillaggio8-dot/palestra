import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nuovaVoceCronologia } from '../src/cronologia.js';
import { preparaAzzeramentoStorico } from '../src/reset-storico.js';

const sedute=[
  {id:'sa',scheda_id:'scheda-a',stato:'completata'},
  {id:'sb',scheda_id:'scheda-b',stato:'completata'},
];
const serie=[
  {id:'aa',seduta_id:'sa',esercizio_id:'curl'},
  {id:'ab',seduta_id:'sb',esercizio_id:'panca'},
];
const note=[
  {id:'nota-sa-curl',seduta_id:'sa',testo:'mia nota'},
  {id:'nota-sb-panca',seduta_id:'sb',testo:'nota dell altro'},
  nuovaVoceCronologia({id:'na',account:'account-a',tipo:'serie_modificata',titolo:'Mia serie'}),
  nuovaVoceCronologia({id:'nb',account:'account-b',tipo:'serie_modificata',titolo:'Serie del compagno'}),
  {id:'regolazione:account-a:curl',livello:'regolazioni',testo:'configurazione da preservare'},
];
const premio=(id,account_id,tipo)=>({id,account_id,tipo,aura:10,xp:20});
const ricompense=[
  premio('pa','account-a','allenamento'),premio('pra','account-a','record'),
  premio('pt','account-a','traguardo'),premio('pb','account-b','allenamento'),
  premio('pm','account-a','missione'),premio('ps','account-a','spesa_aura'),
];

test('v424: reset storico seleziona solo la persona, senza serie e note di altri',()=>{
  const r=preparaAzzeramentoStorico({
    account:'account-a',sedute:[sedute[0]],serie,note,ricompense,
  });
  assert.deepEqual(r.sedute.map(x=>x.id),['sa']);
  assert.deepEqual(r.serie.map(x=>x.id),['aa']);
  assert.deepEqual(r.notePersonali.map(x=>x.id).sort(),[
    note[0].id,note[2].id,
  ].sort());
  assert.deepEqual(r.premiAllenamenti.map(x=>x.id),['pa','pra','pt']);
  assert.ok(!r.notePersonali.some(x=>x.id.includes('account-b')));
  assert.ok(!r.premiAllenamenti.some(x=>x.account_id!=='account-a'));
});

test('v424: missioni, acquisti e impostazioni rimangono intatti nel reset',()=>{
  const r=preparaAzzeramentoStorico({
    account:'account-a',sedute:[sedute[0]],serie,note,ricompense,
  });
  assert.ok(!r.premiAllenamenti.some(x=>['pm','ps'].includes(x.id)));
  assert.ok(!r.notePersonali.some(x=>x.livello==='regolazioni'));
  assert.ok(!r.notePersonali.some(x=>x.id==='nota-sb-panca'));
});

test('v424: tombstone non si contano; account mancante non puo cancellare nulla',()=>{
  const r=preparaAzzeramentoStorico({
    account:'account-a',sedute:[{...sedute[0],eliminata:true}],
    serie,note,ricompense:ricompense.map(x=>x.id==='pra'?{...x,eliminata:true}:x),
  });
  assert.equal(r.sedute.length,0);
  assert.equal(r.serie.length,0);
  assert.ok(!r.premiAllenamenti.some(x=>x.id==='pra'));
  assert.deepEqual(preparaAzzeramentoStorico({account:null,sedute,serie,note,ricompense}),
    {sedute:[],serie:[],notePersonali:[],premiAllenamenti:[]});
});

test('v424: UI usa il selettore personale e il pulsante non cancella tutte le sedute globali',()=>{
  const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  const a=app.indexOf("bottone('Cancella tutto lo storico (la scheda resta)'");
  const b=app.indexOf("classe: 'pericolo'",a);
  assert.ok(a>=0 && b>a);
  const corpo=app.slice(a,b);
  assert.match(corpo,/preparaAzzeramentoStorico\(/);
  assert.match(corpo,/seduteDellaPersona\(\)/);
  assert.match(corpo,/serieDellaPersona\(\)/);
  assert.match(corpo,/premiAllenamenti/);
  assert.match(corpo,/eliminaSeduteEGuadagni/);
  assert.doesNotMatch(corpo,/db\.tutti\('sedute'\)/);
  assert.doesNotMatch(corpo,/for \(const n of V\.note\)/);
});
