import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ESERCIZI} from '../src/dati-iniziali.js';
import {FOTO_VERIFICATE_TECNICAMENTE, sorgenteMiniatura} from '../src/exercise-icons.js';
const txt=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const assets=[
  [
    "ex-one-arm-overhead-tricep-extension",
    "one-arm-overhead-tricep-extension-v454.webp",
    "537af47df8833a95a19e244ac074d78ef962cd9749f889f1abe138ad07da516d"
  ],
  [
    "ex-scott-bench-curl",
    "cad-curl-v454.webp",
    "4bd5f38bd7bc148fbfa3527b5c9765ebca2becf3b62d8b6666bd70c9a9391932"
  ],
  [
    "ex-chest-supported-shrug",
    "chest-supported-dumbbell-shrug-v454.webp",
    "43a374bdd2e5c477dc8d953a985a9ee5e63fcf179f9fed8dfa41dde15bd463f3"
  ],
  [
    "ex-lat-pulldown-lats",
    "lat-pulldown-neutral-v454.webp",
    "c0673d711a2de47f3b7a38236dfc8556ab2e58142693b06251658c94d3b24b7c"
  ],
  [
    "ex-dumbbell-face-pull",
    "dumbbell-face-pull-v454.webp",
    "f8827e26a9d9b5ce587bae43c576321de4cef87f90978f740c6c435b8e5b4ba8"
  ],
  [
    "ex-bent-over-row",
    "bent-over-row-v454.webp",
    "2a72033f6a337d4aaeed915d61139e0f72eb5307a37c6d411826d94923de556f"
  ],
  [
    "ex-smith-machine-bent-over-row",
    "smith-machine-bent-over-row-v454.webp",
    "66a59b2363dece59a3370d68c4d42c60c52cd277b9a87574c7088b3ec45eccc0"
  ],
  [
    "ex-smith-machine-shrug",
    "smith-machine-shrug-v454.webp",
    "81207c0e2fd4b2078a8c0f3091789fd357daf386b4a05c9758c663fa9bbdcbb3"
  ]
];
test('v454: otto immagini WebP originali e abbinate ai rispettivi ID',()=>{
  const gallery=txt('verifica-icone.html'),sw=txt('sw.js');
  assert.equal(ESERCIZI.length,81);
  for(const [id,name,sha] of assets){
    const path=id==='ex-dumbbell-face-pull' ? 'img/esercizi/verificati-v458/ex-dumbbell-face-pull.webp' : 'img/esercizi/uniformi-v455/'+id+'.webp';
    const original=read('img/esercizi/'+name);
    assert.equal(createHash('sha256').update(original).digest('hex'),sha,'Originale v454 alterato: '+id);
    const record=ESERCIZI.find(x=>x.id===id);
    assert.ok(record,'esercizio sconosciuto: '+id);
    const preview=sorgenteMiniatura(record);
    if(id==='ex-scott-bench-curl') assert.equal(preview.src,'img/esercizi/cad-curl-v467.webp');
    else if(id==='ex-lat-pulldown-lats') {
      assert.equal(preview.tipo,'sprite');
      assert.equal(preview.atlas,'img/esercizi/icone-corrette-v456-atlas.webp');
    } else {
      assert.equal(FOTO_VERIFICATE_TECNICAMENTE[id],path);
      assert.deepEqual(preview,{tipo:'originale',src:path,zoom:1});
    }
    const file=read(path);
    assert.ok(file.length>5000,'immagine eccessivamente piccola: '+id);
    assert.equal(file.toString('ascii',0,4),'RIFF');
    assert.equal(file.toString('ascii',8,12),'WEBP');
    assert.ok(file.length>3000,'WebP ricomposto vuoto: '+id);
    assert.ok(gallery.includes(id==='ex-scott-bench-curl' ? 'img/esercizi/cad-curl-v467.webp' : id==='ex-lat-pulldown-lats' ? 'img/esercizi/icone-corrette-v456-atlas.webp' : path),'icona non aggiornata in galleria: '+id);
    assert.ok(sw.includes('./'+path),'WebP non disponibile offline: '+id);
  }
});
test('v454: figure a tutto riquadro senza sfumatura e stessa PWA',()=>{
  const css=txt('stile.css');
  assert.ok(css.includes('.foto-esercizio-arte-originale[src*="/uniformi-v455/"]'));
  assert.match(css,/-webkit-mask: none/);
  assert.match(css,/object-fit: cover/);
  assert.match(txt('index.html'),/PALESTRA_VERSIONE = 'palestra-v489'/);
  assert.match(txt('sw.js'),/const VERSIONE = 'palestra-v489'/);
  const gallery=txt('verifica-icone.html');
  assert.equal((gallery.match(/<article class="tile /g)||[]).length,81);
});
