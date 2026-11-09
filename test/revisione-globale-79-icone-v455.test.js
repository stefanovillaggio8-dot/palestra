import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { sorgenteMiniatura } from '../src/exercise-icons.js';

const read = p => readFileSync(new URL('../'+p,import.meta.url));
const txt = p => read(p).toString('utf8');

test('v455: tutte le 79 miniature sono presenti e distinguibili', () => {
  assert.equal(ESERCIZI.length,81);
  assert.equal(new Set(ESERCIZI.map(x=>x.id)).size,81);
  let sprite=0, speciale=0, originale=0;
  const sprites=new Set();
  for (const e of ESERCIZI) {
    const i=sorgenteMiniatura(e);
    assert.ok(i,'senza miniatura: '+e.id);
    if (i.tipo==='sprite') {
      sprite++;
      const key=(i.atlas || 'img/esercizi/esercizi-uniformi-v455.webp')+' '+i.x.toFixed(5)+' '+i.y.toFixed(5);
      assert.ok(!sprites.has(key),'cella duplicata: '+e.id);
      sprites.add(key);
    } else {
      assert.ok(i.src.startsWith('img/esercizi/'),'path non locale: '+e.id);
      assert.ok(read(i.src).length>1500,'immagine assente: '+e.id);
      if(i.tipo==='dedicata') speciale++;
      else originale++;
    }
  }
  assert.deepEqual({sprite,speciale,originale},{sprite:69,speciale:1,originale:11});
});

test('v455: la galleria e la PWA usano la stessa palette globale', () => {
  const css=txt('stile.css'),gallery=txt('verifica-icone.html'),sw=txt('sw.js');
  const img='img/esercizi/esercizi-uniformi-v455.webp';
  const atlas=read(img);
  assert.equal(atlas.toString('ascii',0,4),'RIFF');
  assert.equal(atlas.toString('ascii',8,12),'WEBP');
  assert.ok(atlas.length>200000,'atlante insufficiente');
  assert.ok(css.includes(img),'atlante non usato dalla app');
  assert.ok(gallery.includes(img),'atlante non usato dalla galleria');
  assert.ok(sw.includes('./'+img),'atlante non incluso nella cache');
  assert.match(css,/background-size: 800% 1000%/);
  assert.equal((gallery.match(/<article class="tile /g)||[]).length,81);
  for (const id of ['ex-one-arm-overhead-tricep-extension',
    'ex-chest-supported-shrug',
    'ex-smith-machine-bent-over-row','ex-smith-machine-shrug',
    'ex-dumbbell-face-pull','ex-bent-over-row']) {
    const path=id==='ex-dumbbell-face-pull' ? 'img/esercizi/verificati-v458/ex-dumbbell-face-pull.webp' : 'img/esercizi/uniformi-v455/'+id+'.webp';
    assert.ok(read(path).length>3000,'foto storica non normalizzata: '+id);
    assert.ok(gallery.includes(path),'la galleria non mostra '+id);
    assert.ok(sw.includes('./'+path),'offline manca '+id);
    const e=ESERCIZI.find(x=>x.id===id);
    assert.equal(sorgenteMiniatura(e).src,path);
  }
  assert.match(txt('index.html'),/PALESTRA_VERSIONE = 'palestra-v461'/);
  assert.match(sw,/const VERSIONE = 'palestra-v461'/);
  assert.ok(css.includes('.foto-esercizio-arte-originale[src*="/uniformi-v455/"]'));
});

test('v455: non scrive dati personali durante il rendering', () => {
  const module=txt('src/exercise-icons.js');
  for(const name of ['localStorage.setItem','supabase.from','salvaSerie','eliminaSeduta']) {
    assert.ok(!module.includes(name),'scrittura dati vietata: '+name);
  }
});
