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
  assert.equal(one.rapportoCarrucolaDaVerificare,true);
  assert.equal(two.rapportoCarrucolaDaVerificare,true);
  assert.ok(!one.carrucola && !two.carrucola,'non presumere il rapporto del cavo');
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
  assert.match(sw,/palestra-v459/);
  assert.match(read('index.html'),/palestra-v459/);
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
  assert.equal(caricoEffettivo({peso:30},c1,{esercizio:ESERCIZI.find(e=>e.id==='ex-wrist-curl')}).carico,30);
});
