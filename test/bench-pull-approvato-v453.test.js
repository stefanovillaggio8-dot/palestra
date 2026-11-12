import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { FOTO_VERIFICATE_TECNICAMENTE, sorgenteMiniatura } from '../src/exercise-icons.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url));
const txt = p => read(p).toString('utf8');

test('v453: Bench Pull usa soltanto la miniatura con due manubri approvata', () => {
  const id='ex-bench-pull', path='img/esercizi/bench-pull-v453.webp';
  assert.equal(FOTO_VERIFICATE_TECNICAMENTE[id],path);
  const e=ESERCIZI.find(x=>x.id===id);
  assert.ok(e);
  assert.deepEqual(sorgenteMiniatura(e),{tipo:'originale',src:path,zoom:1});
  assert.equal(ESERCIZI.length,81);
  const img=read(path);
  assert.equal(img.toString('ascii',0,4),'RIFF');
  assert.equal(img.toString('ascii',8,12),'WEBP');
  assert.equal(img.length,5608);
  assert.equal(createHash('sha256').update(img).digest('hex'),
    '48f919f5e50d581284c04789c81fc70227be0fd05a1970955140437c82a2f1e6',
    'Il Bench Pull approvato non va sostituito senza una nuova approvazione');
  assert.match(txt('verifica-icone.html'),/bench-pull-v453\.webp/);
  assert.match(txt('sw.js'),/bench-pull-v453\.webp/);
  assert.match(txt('index.html'),/palestra-v486/);
  assert.match(txt('sw.js'),/palestra-v486/);
});
