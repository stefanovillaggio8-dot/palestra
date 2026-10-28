import test from 'node:test';
import assert from 'node:assert/strict';
import { montaEffettiRpg } from '../src/effetti-rpg-canvas.js';

test('effetti RPG: fallback sicuro senza API browser', () => {
  const cleanup = montaEffettiRpg({}, 'effetto-ambra');
  assert.equal(typeof cleanup, 'function');
  assert.doesNotThrow(cleanup);
  assert.doesNotThrow(() => montaEffettiRpg(null, 'effetto-nebula')());
});

test('effetti RPG: ogni variante disegna e libera il canvas senza cambiare la foto', t => {
  const originali = {};
  for (const chiave of ['window','document','requestAnimationFrame','cancelAnimationFrame']) {
    originali[chiave] = globalThis[chiave];
  }
  t.after(() => {
    for (const [chiave,valore] of Object.entries(originali)) {
      if(valore === undefined) delete globalThis[chiave];
      else globalThis[chiave] = valore;
    }
  });
  globalThis.window = { devicePixelRatio: 2 };
  const inCoda = new Map();
  let sequenza = 0, disegni = 0, rimozioni = 0;
  const ctx = new Proxy({
    createRadialGradient: () => ({addColorStop(){}}),
    clearRect: () => { disegni++; },
  }, {
    get(target,key) { return key in target ? target[key] : () => {}; },
  });
  const immagini = [];
  globalThis.document = {createElement(nome) {
    assert.equal(nome,'canvas');
    const canvas = {
      className:'', width:0,height:0, attributes:{},
      setAttribute(k,v){this.attributes[k]=v;},
      getContext:()=>ctx,
      remove(){rimozioni++},
    };
    immagini.push(canvas);
    return canvas;
  }};
  globalThis.requestAnimationFrame = cb => { const id=++sequenza; inCoda.set(id,cb);return id; };
  globalThis.cancelAnimationFrame = id => inCoda.delete(id);
  for(const tipo of ['effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula']) {
    const aggiunti = [];
    const host = {
      isConnected:true,
      appendChild(n){aggiunti.push(n);},
      getBoundingClientRect(){return {width:200,height:300};},
    };
    const fermati=montaEffettiRpg(host,tipo,{corona:true,divina:true});
    assert.equal(aggiunti.length,1);
    assert.equal(aggiunti[0].className,'rpg-effetti-canvas');
    const id=[...inCoda.keys()][0];
    const cb=inCoda.get(id);inCoda.delete(id);
    assert.doesNotThrow(()=>cb(1000));
    assert.equal(aggiunti[0].width,300); // DPR limitato a 1.5
    assert.equal(aggiunti[0].height,450);
    assert.equal(aggiunti[0].attributes['aria-hidden'],'true');
    assert.doesNotThrow(fermati);
    assert.doesNotThrow(fermati);
    assert.equal(inCoda.size,0);
  }
  assert.equal(immagini.length,4);
  assert.equal(rimozioni,4);
  assert.ok(disegni>=4);
});
