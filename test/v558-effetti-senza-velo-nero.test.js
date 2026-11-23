import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v558: independent photographic backdrop is placed BELOW bright FX and authentic hero',()=>{
  const comp=read('src/rpg-reference-compositing-v539.js');
  const stage=comp.slice(comp.indexOf('const attiva=()=>'));
  assert.ok(comp.includes("fondale.className='rpg-reference-backdrop-v558 rpg-reference-'+reference.classe"));
  assert.ok(stage.includes('grafica.appendChild(fondale);'));
  assert.ok(stage.includes('grafica.appendChild(ambiente);'));
  assert.ok(stage.includes('grafica.appendChild(soggetto);'));
  assert.ok(stage.indexOf('grafica.appendChild(fondale);') < stage.indexOf('grafica.appendChild(ambiente);'));
  assert.ok(stage.indexOf('grafica.appendChild(ambiente);') < stage.indexOf('grafica.appendChild(soggetto);'));
  assert.ok(comp.includes("fondale.setAttribute?.('aria-hidden','true')"));
  assert.ok(comp.includes("soggetto.src=alpha||url"));
});

test('v558: opacity and screen are isolated to FX and never to the character',()=>{
  const css=read('stile-rpg.css');
  const rule=css.slice(css.lastIndexOf('/* v558:'));
  assert.ok(rule.includes('.rpg-reference-backdrop-v558'));
  assert.ok(rule.includes("url('./img/effetti/reference-ambienti-v542.webp?v=542')"));
  assert.ok(rule.includes("url('./img/effetti/approved-environments-v548.webp?v=548')"));
  assert.ok(rule.includes('filter:brightness(1.65) saturate(1.14)!important'));
  assert.ok(rule.includes('mix-blend-mode:screen!important'));
  assert.ok(rule.includes('background-blend-mode:normal!important'));
  assert.ok(rule.includes('> .rpg-reference-subject-v539 {'));
  assert.ok(rule.includes('z-index:3!important'));
  assert.ok(rule.includes('mix-blend-mode:normal!important'));
  assert.ok(rule.includes('opacity:1!important'));
  assert.ok(rule.includes('z-index:1!important'));
  assert.ok(rule.includes('z-index:2!important'));
  for(const e of Object.values(EFFETTI_REFERENCE_V532)){
    assert.ok(rule.includes('.rpg-reference-backdrop-v558.rpg-reference-'+e.classe),e.classe);
  }
  assert.ok(css.includes('width:min(67.5%,275px)!important'));
});

test('v558: PNG composites brightened atmosphere and screened VFX before hero',()=>{
  const src=read('src/rpg-atelier.js');
  const start=src.indexOf('if(palcoDinamicoV548){');
  const end=src.indexOf('}else if(palcoFotoV547)',start);
  const branch=src.slice(start,end);
  for(const word of [
   "fxCtx.filter='brightness(1.65) saturate(1.14)'",
   'fxCtx.drawImage(ambienteV541,',
   'fxCtx.drawImage(foto,',
   "fxCtx.globalCompositeOperation='screen'",
   "fxCtx.globalCompositeOperation='destination-in'",
   'ctx.drawImage(sfuma,fxX,fxY,fxW,fxH)'
  ]) assert.ok(branch.includes(word),word);
  assert.ok(branch.indexOf('fxCtx.drawImage(ambienteV541,') <
    branch.indexOf('fxCtx.drawImage(foto,'));
  assert.ok(branch.indexOf('fxCtx.drawImage(foto,') <
    branch.indexOf("fxCtx.globalCompositeOperation='destination-in'"));
  assert.ok(src.indexOf('ctx.drawImage(sfuma,fxX,fxY,fxW,fxH)') <
    src.indexOf('ctx.drawImage(riferimentoCompleto?ritaglioEsportabile:immagine,dx,dy,dw,dh)'));
});

test('v558: cache and module version match the new 3-layer composition',()=>{
 const index=read('index.html'),sw=read('sw.js'),app=read('src/app.js'),ui=read('src/rpg-atelier-ui.js');
 assert.ok(index.includes("PALESTRA_VERSIONE = 'palestra-v559'"));
 assert.ok(sw.includes("const VERSIONE = 'palestra-v559'"));
 assert.ok(index.includes('stile-rpg.css?v=559'));
 assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=559'));
 assert.ok(ui.includes('./rpg-atelier.js?v=559'));
});
