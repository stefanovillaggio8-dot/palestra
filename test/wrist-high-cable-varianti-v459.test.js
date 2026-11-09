import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ESERCIZI} from '../src/dati-iniziali.js';
import {sorgenteMiniatura} from '../src/exercise-icons.js';
import {caricoEffettivo, configEsercizio} from '../src/rank-v3/modello.js';
import {movimentoDi} from '../src/rank-v3/valutazione.js';

const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8');
const one = ESERCIZI.find(e => e.id === 'ex-high-cable-wrist-curl-one-arm');
const two = ESERCIZI.find(e => e.id === 'ex-high-cable-wrist-curl-two-arm');

test('v459: aggiunte 2 varianti al cavo ALTO, storico Wrist Curl intatto', () => {
  assert.equal(ESERCIZI.length, 81);
  assert.equal(new Set(ESERCIZI.map(e=>e.id)).size,81);
  const old=ESERCIZI.find(e => e.id==='ex-wrist-curl');
  assert.ok(old); assert.equal(old.nome,'Wrist Curl');
  assert.ok(one); assert.ok(two);
  assert.equal(one.usoBraccia,'un_braccio');
  assert.equal(two.usoBraccia,'due_braccia');
  assert.equal(one.convenzione,'cavo_totali'); assert.equal(two.convenzione,'cavo_totali');
  assert.equal(one.carrucola,'carrucola_mono');
  assert.equal(two.carrucola,'carrucola_mono');
  assert.equal(old.carrucola,'carrucola_doppia');
  assert.equal(old.usoBraccia,'un_braccio');
  assert.equal(one.rapportoCarrucolaDaVerificare,undefined);
  assert.equal(two.rapportoCarrucolaDaVerificare,undefined);
  assert.match(one.nota_permanente,/ALTA/);
  assert.match(two.nota_permanente,/sbarra/i);
});

test('v459: due foto indipendenti nell app e nella galleria, visibili offline', () => {
  const g=read('verifica-icone.html'),sw=read('sw.js');
  for(const e of [one,two]) {
    const img=sorgenteMiniatura(e);
    assert.equal(img.tipo,'originale');
    assert.equal(img.src,e.foto);
    assert.match(read(e.foto),/<svg/);
    assert.ok(g.includes(e.id));
    assert.ok(g.includes(e.foto));
    assert.ok(sw.includes('./'+e.foto));
  }
  assert.match(sw,/palestra-v460/);
  assert.match(read('index.html'),/palestra-v460/);
  assert.equal((g.match(/<article class="tile /g)||[]).length,81);
});

test('v459: Rank indipendente, kg per mano vs pila bilaterale', () => {
  const vOne=movimentoDi(one), vTwo=movimentoDi(two);
  assert.equal(vOne.movimento,'polso');
  assert.equal(vTwo.movimento,'polso');
  const c1=configEsercizio({esercizio:one,movimento:vOne.movimento,livello:vOne.livello});
  const c2=configEsercizio({esercizio:two,movimento:vTwo.movimento,livello:vTwo.livello});
  assert.equal(caricoEffettivo({peso:30},c1,{esercizio:one}).carico,30);
  assert.equal(caricoEffettivo({peso:30},c2,{esercizio:two}).carico,15);
  assert.equal(caricoEffettivo({peso:30},c1,{esercizio:ESERCIZI.find(e=>e.id==='ex-wrist-curl')}).carico,15);
});

test('v460: alto 1:1, basso 2:1, due mani /2 sullo stesso carico',()=>{
 const low=ESERCIZI.find(e=>e.id==='ex-wrist-curl');
 function reale(e,peso){
   const m=movimentoDi(e),cfg=configEsercizio({esercizio:e,movimento:m.movimento,livello:m.livello});
   return caricoEffettivo({peso},cfg,{esercizio:e}).carico;
 }
 for(const peso of [10,25,40,60]){
   assert.equal(reale(one,peso),peso,'alto monobraccio 1:1');
   assert.equal(reale(two,peso),peso/2,'alto sbarra: per polso');
   assert.equal(reale(low,peso),peso/2,'basso monobraccio 2:1');
 }
 assert.equal(low.id,'ex-wrist-curl','lo storico rimane sul vecchio ID');
});
