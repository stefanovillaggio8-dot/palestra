import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v555: all five original scene cells use one identical alpha feather without cutouts to original hero',()=>{
  const css=read('stile-rpg.css');
  const begin=css.lastIndexOf('/* v555:');
  assert.ok(begin>0);
  const tail=css.slice(begin);
  assert.ok(tail.includes('> .rpg-reference-environment-v541 {'));
  assert.ok(tail.includes('rpg-reference-stage-v548'));
  assert.ok(!tail.includes('> .rpg-reference-subject-v539 {'));
  assert.ok(tail.includes('-webkit-mask-image:'));
  assert.ok(tail.includes('mask-image:'));
  assert.ok(tail.includes('-webkit-mask-composite:source-in!important'));
  assert.ok(tail.includes('mask-composite:intersect!important'));
  for(const step of ['6.5%','93.5%','5.5%','98%'])assert.ok(tail.includes(step),step);
  assert.equal(Object.keys(EFFETTI_REFERENCE_V532).length,5);
  assert.ok(css.includes("approved-environments-v548.webp?v=548"));
  assert.ok(css.includes('width:148%!important'));
});

test('v555: PNG export keeps the original hero crisp while fading ONLY the background sprite',()=>{
  const src=read('src/rpg-atelier.js');
  assert.ok(src.includes('const palcoDinamicoV548=Boolean(ritaglioEsportabile&&'));
  assert.ok(src.includes('const fxW=dw*1.48,fxH=fxW*(710/626)'));
  assert.ok(src.includes("fxCtx.globalCompositeOperation='destination-in'"));
  assert.ok(src.includes('fxCtx.createLinearGradient(0,0,w,0)'));
  assert.ok(src.includes('fxCtx.createLinearGradient(0,0,0,h)'));
  for(const n of ['.065','.935','.055','.98'])assert.ok(src.includes('addColorStop('+n+','),n);
  assert.ok(src.includes('ctx.drawImage(sfuma,fxX,fxY,fxW,fxH)'));
  assert.ok(src.includes('ctx.drawImage(riferimentoCompleto?ritaglioEsportabile:immagine,dx,dy,dw,dh)'));
  assert.ok(src.indexOf('ctx.drawImage(sfuma,fxX,fxY,fxW,fxH)')<
    src.indexOf('ctx.drawImage(riferimentoCompleto?ritaglioEsportabile:immagine,dx,dy,dw,dh)'));
});

test('v555: no double frame and compatible PWA cache refresh',()=>{
  const css=read('stile-rpg.css'),idx=read('index.html'),sw=read('sw.js');
  const app=read('src/app.js'),ui=read('src/rpg-atelier-ui.js');
  assert.ok(css.includes('.aura-preview-reference-scene .personaggio-scena'));
  assert.ok(css.includes('width:min(67.5%,275px)!important'));
  assert.ok(idx.includes("PALESTRA_VERSIONE = 'palestra-v555'"));
  assert.ok(sw.includes("const VERSIONE = 'palestra-v555'"));
  assert.ok(idx.includes('stile-rpg.css?v=555'));
  assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=555'));
  assert.ok(ui.includes('./rpg-atelier.js?v=555'));
});
