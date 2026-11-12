import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ESERCIZI} from '../src/dati-iniziali.js';
import {sorgenteMiniatura} from '../src/exercise-icons.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const txt=p=>read(p).toString('utf8');
const path='img/esercizi/verificati-v458/ex-dumbbell-face-pull.webp';
test('v458: Dumbbell Face Pull inclinato, fonte corretta e storia invariata',()=>{
  const e=ESERCIZI.find(x=>x.id==='ex-dumbbell-face-pull');
  assert.ok(e);assert.equal(ESERCIZI.length,81);
  assert.deepEqual(sorgenteMiniatura(e),{tipo:'originale',src:path,zoom:1});
  assert.equal(createHash('sha256').update(read(path)).digest('hex'),
    'd5c7bc4d950fcd96f9836ccf8d99615dd30b3d125e7903020777c38771e61e11');
  assert.match(txt('sw.js'),/palestra-v489/);
  assert.match(txt('index.html'),/palestra-v489/);
  assert.ok(txt('sw.js').includes('./'+path));
  const g=txt('verifica-icone.html');
  const pos=g.indexOf('data-name="dumbbell face pull ex-dumbbell-face-pull"');
  assert.ok(pos>=0);
  const face=g.slice(g.lastIndexOf('<article',pos),g.indexOf('</article>',pos)+10);
  assert.ok(face?.includes(path));
  assert.ok(face?.includes('class="tile rivista"'));
  assert.equal((g.match(/<article class="tile /g)||[]).length,81);
  const src=txt('src/exercise-icons.js');
  for(const forbidden of ['salvaSerie','eliminaSeduta','supabase.from','localStorage.setItem'])
    assert.ok(!src.includes(forbidden));
});
