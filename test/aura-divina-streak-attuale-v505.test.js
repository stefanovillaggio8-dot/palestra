import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {progressoAuraDivina,progressoCoronaInfinito} from '../src/aura-skin.js';

const app=()=>readFileSync(new URL('../src/app.js',import.meta.url),'utf8');

test('v505: Aura divina mostra 0/75 se la streak e zero, anche con record 19',()=>{
  assert.deepEqual(progressoAuraDivina({giorni:0,record:19,interrotta:true}),{
    giorni:0,record:19,sbloccata:false,mancanti:75,percentuale:0,
  });
  assert.deepEqual(progressoAuraDivina({giorni:19,record:19,interrotta:true}),{
    giorni:0,record:19,sbloccata:false,mancanti:75,percentuale:0,
  });
});

test('v505: Aura divina cresce soltanto con la streak attuale, come la Corona',()=>{
  for(const n of [0,1,11,19,30,50,74,75]){
    const x=progressoAuraDivina({giorni:n,record:74,interrotta:false});
    assert.equal(x.giorni,n);
    assert.equal(x.mancanti,75-n);
    assert.equal(x.percentuale,n/75*100);
    assert.equal(x.sbloccata,false,'la ricompensa non si anticipa');
  }
  assert.equal(progressoAuraDivina({giorni:76,record:76}).giorni,75);
  assert.equal(progressoAuraDivina({giorni:5.9,record:19}).giorni,5);
  assert.equal(progressoAuraDivina({giorni:-4,record:19}).giorni,0);
  assert.equal(progressoCoronaInfinito({giorni:19,record:19}).mancanti,61,
    'la Corona deve conservare la sua soglia di 80');
});

test('v505: dopo lo sblocco il premio resta anche se la streak torna a zero',()=>{
  const premio=progressoAuraDivina({giorni:0,record:75,interrotta:true});
  assert.equal(premio.giorni,0);
  assert.equal(premio.sbloccata,true);
  assert.equal(premio.percentuale,0);
});

test('v505: Shop e anteprima leggono il progresso Aura attuale e non il record',()=>{
  const src=app();
  assert.match(src,/const auraProgresso = progressoAuraDivina\(st\.streak\)/);
  assert.match(src,/auraProgresso\.giorni\+' \/ 75 giorni di streak'/);
  assert.match(src,/auraProgresso\.percentuale\+'%'/);
  assert.match(src,/progresso=progressoAuraDivina\(st\?\.streak\)/);
  assert.match(src,/progresso\.mancanti\+' giorni di Streak attuale/);
  assert.doesNotMatch(src,/75 giorni di record/);
});
