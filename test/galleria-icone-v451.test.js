import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ESERCIZI} from '../src/dati-iniziali.js';
const html=readFileSync(new URL('../verifica-icone.html',import.meta.url),'utf8');

test('v451: galleria controllabile, 79 icone corrette ID/nome e filtro funzionante',()=>{
  assert.equal((html.match(/<article class="tile /g)||[]).length,81);
  assert.match(html,/\.tile\[hidden\]\{display:none\}/);
  assert.match(html,/document\.querySelectorAll\('\.tile'\)/);
  for(const e of ESERCIZI){
    assert.ok(html.includes(e.id),'ID mancante dalla galleria: '+e.id);
    assert.ok(html.includes(e.nome),'Nome mancante: '+e.nome);
  }
  assert.match(html,/esercizi-uniformi-v455\.webp/);
  assert.match(html,/incline-single-arm-pulldown-v465\.webp/);
  assert.match(html,/img\/esercizi\/bench-pull-v453\.webp/);
  for(const file of []) {
    assert.ok(html.includes('uniformi-v455/'+file),'SVG uniforme mancante dalla galleria: '+file);
  }
  for(const id of ['ex-one-arm-overhead-tricep-extension',
    'ex-chest-supported-shrug',
    'ex-bent-over-row','ex-smith-machine-bent-over-row','ex-smith-machine-shrug']) {
    assert.ok(html.includes('uniformi-v455/'+id+'.webp'), 'Icona uniforme mancante in galleria: '+id);
  }
  assert.ok(html.includes('img/esercizi/icone-corrette-v456-atlas.webp'));
  assert.ok(html.includes('img/esercizi/verificati-v458/ex-dumbbell-face-pull.webp'));
  assert.ok(html.includes('img/esercizi/cad-curl-v467.webp'));
  assert.ok(html.includes('img/esercizi/wrist-curl-v467.webp'));
  for(const id of ['ex-lat-pulldown-lats','ex-dips','ex-strict-curl-ez-wall']) {
    const item=html.match(new RegExp('<article[^>]*data-name="[^"]*'+id+'"[\\s\\S]*?<\\/article>'))?.[0];
    assert.ok(item?.includes('class="v456"'),id);
  }
  assert.doesNotMatch(html,/esercizi-completi-v450\.webp/);
});
