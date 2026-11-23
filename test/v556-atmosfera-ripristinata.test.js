import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('v556: four feather edges are minimal and intersect, preserving original stage center',()=>{
  const css=read('stile-rpg.css');
  const mask=css.slice(css.lastIndexOf('/* v555: sfuma SOLO'),css.indexOf('/* v556: il fondale'));
  assert.ok(mask.includes('linear-gradient(to right,transparent 0%,#000 2.5%,#000 97.5%,transparent 100%)'));
  assert.ok(mask.includes('linear-gradient(to bottom,transparent 0%,#000 2%,#000 99.5%,transparent 100%)'));
  assert.ok(mask.includes('-webkit-mask-composite:source-in!important'));
  assert.ok(mask.includes('mask-composite:intersect!important'));
  assert.ok(mask.includes('> .rpg-reference-environment-v541 {'));
  assert.ok(!mask.includes('> .rpg-reference-subject-v539 {'));
});
test('v556: five individual atmospheres are outside the cropped asset and inside the preview only',()=>{
  const css=read('stile-rpg.css');
  const colors=css.slice(css.indexOf('/* v556: il fondale'));
  for(const effect of Object.values(EFFETTI_REFERENCE_V532)){
    assert.ok(colors.includes('):has(.rpg-reference-'+effect.classe+')'),effect.classe);
  }
  assert.ok(colors.includes('radial-gradient(ellipse 68% 57% at 50% 42%'));
  assert.ok(colors.includes('.aura-preview-panel .aura-preview-reference-scene'));
  assert.ok(colors.includes('.rpg-atelier-stage:has(.rpg-reference-stage-v548)'));
  assert.ok(css.includes("approved-environments-v548.webp?v=548"));
  assert.ok(css.includes('width:148%!important'));
});
test('v556: PNG uses same stops and still renders original character after background',()=>{
  const src=read('src/rpg-atelier.js');
  assert.ok(src.includes('const fxW=dw*1.48,fxH=fxW*(710/626)'));
  for(const x of ['.025','.975','.02','.995'])assert.ok(src.includes('addColorStop('+x+','),x);
  for(const x of ['.065','.935','.055','.98'])assert.ok(!src.includes('addColorStop('+x+','),'old '+x);
  assert.ok(src.includes("fxCtx.globalCompositeOperation='destination-in'"));
  const bg=src.indexOf('ctx.drawImage(sfuma,fxX,fxY,fxW,fxH)');
  const hero=src.indexOf('ctx.drawImage(riferimentoCompleto?ritaglioEsportabile:immagine,dx,dy,dw,dh)');
  assert.ok(bg>0&&hero>bg,'Original face and body draw AFTER the scenery');
});
test('v556: iPhone/PWA assets use the new release revision',()=>{
  const index=read('index.html'),sw=read('sw.js'),ui=read('src/rpg-atelier-ui.js'),app=read('src/app.js');
  assert.ok(index.includes("PALESTRA_VERSIONE = 'palestra-v558'"));
  assert.ok(index.includes('stile-rpg.css?v=558'));
  assert.ok(sw.includes("const VERSIONE = 'palestra-v558'"));
  assert.ok(ui.includes('./rpg-atelier.js?v=558'));
  assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=558'));
});
