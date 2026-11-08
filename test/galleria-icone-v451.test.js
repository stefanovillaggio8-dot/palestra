import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ESERCIZI} from '../src/dati-iniziali.js';
const html=readFileSync(new URL('../verifica-icone.html',import.meta.url),'utf8');

test('v451: galleria controllabile, 79 icone corrette ID/nome e filtro funzionante',()=>{
  assert.equal((html.match(/<article class="tile /g)||[]).length,79);
  assert.match(html,/\.tile\[hidden\]\{display:none\}/);
  assert.match(html,/document\.querySelectorAll\('\.tile'\)/);
  for(const e of ESERCIZI){
    assert.ok(html.includes(e.id),'ID mancante dalla galleria: '+e.id);
    assert.ok(html.includes(e.nome),'Nome mancante: '+e.nome);
  }
  assert.match(html,/esercizi-verificati-v451\.webp/);
  assert.match(html,/incline-single-arm-pulldown-v446\.svg/);
  for(const file of ['dips-zavorrati-corretti-v452.svg','wrist-curl-cavo-v452.svg','strict-curl-parete-v452.svg']) {
    assert.ok(html.includes(file),'SVG v452 mancante dalla galleria: '+file);
  }
  assert.doesNotMatch(html,/esercizi-completi-v450\.webp/);
});
