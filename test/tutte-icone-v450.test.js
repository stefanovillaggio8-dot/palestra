import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { POSIZIONI_ICONE_CORRETTE, posizioneIconaCorretta,
  sorgenteMiniatura, FOTO_INCLINE_PULLDOWN_CORRETTA } from '../src/exercise-icons.js';

test('v450: tutti i 79 esercizi hanno una nuova immagine del catalogo oppure SVG dedicato', () => {
  assert.equal(ESERCIZI.length,81);
  assert.equal(Object.keys(POSIZIONI_ICONE_CORRETTE).length,78);
  let sprite=0, svg=0, originali=0;
  const celle=new Set();
  for(const [i,e] of ESERCIZI.entries()) {
    const origine=sorgenteMiniatura(e);
    if(e.id==='ex-lying-cable-curl'){
      assert.equal(origine.tipo,'dedicata');
      assert.equal(origine.src,FOTO_INCLINE_PULLDOWN_CORRETTA);
      assert.equal(posizioneIconaCorretta(e),null);
      svg++;
      continue;
    }
    if (origine.tipo === 'originale') {
      assert.ok(origine.src.startsWith('img/esercizi/'),'foto fuori dal catalogo');
      originali++;
      continue;
    }
    assert.equal(origine.tipo,'sprite','icona non collegata: '+e.id);
    assert.deepEqual(POSIZIONI_ICONE_CORRETTE[e.id],[i%8,Math.floor(i/8)],'ID fuori ordine: '+e.id);
    assert.ok(origine.x>=0&&origine.x<=100);
    assert.ok(origine.y>=0&&origine.y<=100);
    const key=(origine.atlas || 'img/esercizi/esercizi-uniformi-v455.webp')+'|'+origine.x.toFixed(6)+'|'+origine.y.toFixed(6);
    assert.ok(!celle.has(key),'sprite duplicato: '+e.id);
    celle.add(key);sprite++;
  }
  assert.equal(sprite,67);
  assert.equal(originali,13);
  assert.equal(svg,1);
});

test('v450: immagine WebP completa, caching PWA e scala 8x10',()=>{
  const asset=readFileSync(new URL('../img/esercizi/esercizi-verificati-v451.webp', import.meta.url));
  assert.equal(asset.toString('ascii',0,4),'RIFF');
  assert.equal(asset.toString('ascii',8,12),'WEBP');
  assert.ok(asset.length>150000,'atlante troppo compresso');
  const css=readFileSync(new URL('../stile.css',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(css,/esercizi-uniformi-v455\.webp/);
  assert.match(css,/background-size: 800% 1000%/);
  assert.match(sw,/palestra-v466/);
  assert.match(sw,/esercizi-uniformi-v455\.webp/);
  assert.match(html,/PALESTRA_VERSIONE = 'palestra-v466'/);
});
