import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v557: use real smoky photographic backgrounds rather than just adjusting a vignette',()=>{
 const css=read('stile-rpg.css');
 const begin=css.lastIndexOf('/* v557 — RIPRISTINO SCENARIO REALE');
 const newRule=css.slice(begin,css.indexOf('/* v558:',begin));
 assert.ok(newRule.includes('> .rpg-reference-environment-v541 {'));
 assert.ok(newRule.includes("approved-environments-v548.webp?v=548"));
 assert.ok(newRule.includes("reference-ambienti-v542.webp?v=542"));
 assert.ok(newRule.includes('background-size:300% 200%,300% 200%!important'));
 assert.ok(newRule.includes('background-blend-mode:screen,normal!important'));
 assert.ok(newRule.includes('background-repeat:no-repeat,no-repeat!important'));
 assert.ok(!newRule.includes('> .rpg-reference-subject-v539 {'));
 assert.ok(statSync(new URL('../img/effetti/reference-ambienti-v542.webp',import.meta.url)).size>100000);
 assert.equal(Object.keys(EFFETTI_REFERENCE_V532).length,5);
});

test('v557: previous edge feather and stage alignment remain, all five atlas positions preserved',()=>{
 const css=read('stile-rpg.css');
 for(const s of ['width:148%!important','left:-24%!important','-webkit-mask-composite:source-in!important','mask-composite:intersect!important'])
   assert.ok(css.includes(s),s);
 for(const effect of Object.values(EFFETTI_REFERENCE_V532))
   assert.ok(css.includes('.rpg-reference-environment-v541.rpg-reference-'+effect.classe),effect.classe);
 assert.ok(css.includes('width:min(67.5%,275px)!important'));
 assert.ok(css.includes('margin:0 auto clamp(28px,10.5%,48px)!important'));
});

test('v557: PNG export composites v542 atmosphere and v548 light on the same cell before original hero',()=>{
 const src=read('src/rpg-atelier.js');
 const start=src.indexOf('if(palcoDinamicoV548){');
 const end=src.indexOf('}else if(palcoFotoV547)',start);
 assert.ok(start>=0&&end>start);
 const branch=src.slice(start,end);
 for(const marker of ['ambienteV541?.naturalWidth===1383','ambienteV541?.naturalHeight===880',
  "fxCtx.globalCompositeOperation='screen'",'const cellW=foto.naturalWidth/3',
  "fxCtx.globalCompositeOperation='destination-in'",'ctx.drawImage(sfuma,fxX,fxY,fxW,fxH)'])
  assert.ok(branch.includes(marker),marker);
 const ambient=branch.indexOf('fxCtx.drawImage(ambienteV541,');
 const approved=branch.indexOf('fxCtx.drawImage(foto,');
 const feather=branch.indexOf("fxCtx.globalCompositeOperation='destination-in'");
 assert.ok(ambient>=0&&approved>ambient&&feather>approved);
 const originalHero=src.indexOf('ctx.drawImage(riferimentoCompleto?ritaglioEsportabile:immagine,dx,dy,dw,dh)');
 assert.ok(originalHero>src.indexOf('ctx.drawImage(sfuma,fxX,fxY,fxW,fxH)'));
});

test('v557: PWA service worker and import cache are synchronized',()=>{
 const sw=read('sw.js'),idx=read('index.html'),app=read('src/app.js'),ui=read('src/rpg-atelier-ui.js');
 assert.ok(sw.includes("const VERSIONE = 'palestra-v559'"));
 assert.ok(idx.includes("PALESTRA_VERSIONE = 'palestra-v559'"));
 assert.ok(idx.includes('stile-rpg.css?v=559'));
 assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=559'));
 assert.ok(ui.includes('./rpg-atelier.js?v=559'));
});
