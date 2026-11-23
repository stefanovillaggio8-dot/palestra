import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v559: the old atlas hole is repaired from a FULL source behind the genuine avatar',()=>{
 const css=read('stile-rpg.css');
 const compositor=read('src/rpg-reference-compositing-v539.js');
 const section=css.slice(css.lastIndexOf('/* v559: ripara il VUOTO'));
 assert.ok(section.includes('> .rpg-reference-center-repair-v559 {'));
 assert.ok(section.includes("url('./img/effetti/effetti-reference-v536.webp?v=536')"));
 assert.ok(section.includes('radial-gradient(ellipse 35% 45% at 50% 44%'));
 assert.ok(section.includes('mix-blend-mode:screen!important'));
 assert.ok(section.includes('z-index:1!important'));
 assert.ok(section.includes('.rpg-reference-stage-v548'));
 assert.ok(!section.includes('> .rpg-reference-subject-v539 {'));
 assert.ok(compositor.includes("ripristino.className='rpg-reference-center-repair-v559 rpg-reference-'+reference.classe"));
 assert.ok(statSync(new URL('../img/effetti/effetti-reference-v536.webp',import.meta.url)).size>100000);
});
test('v559: all five effects are independently aligned and central repair cannot cover the hero',()=>{
 const css=read('stile-rpg.css'),comp=read('src/rpg-reference-compositing-v539.js');
 const sec=css.slice(css.lastIndexOf('/* v559: ripara il VUOTO'));
 const stage=comp.slice(comp.indexOf('const attiva=()=>'));
 for(const fx of Object.values(EFFETTI_REFERENCE_V532))
   assert.ok(sec.includes('.rpg-reference-center-repair-v559.rpg-reference-'+fx.classe));
 for(const name of ['fondale','ripristino','ambiente','soggetto'])
   assert.ok(stage.includes('grafica.appendChild('+name+');'));
 assert.ok(stage.indexOf('grafica.appendChild(fondale);')<stage.indexOf('grafica.appendChild(ripristino);'));
 assert.ok(stage.indexOf('grafica.appendChild(ripristino);')<stage.indexOf('grafica.appendChild(ambiente);'));
 assert.ok(stage.indexOf('grafica.appendChild(ambiente);')<stage.indexOf('grafica.appendChild(soggetto);'));
 assert.ok(css.includes('> .rpg-reference-subject-v539 {\n  z-index:3!important;'));
 assert.ok(css.includes('width:min(67.5%,275px)!important'));
});
test('v559: exported PNG uses the same old complete energy center, then original front art',()=>{
 const src=read('src/rpg-atelier.js');
 const section=src.slice(src.indexOf('if(palcoDinamicoV548){'),src.indexOf('}else if(palcoFotoV547)'));
 assert.ok(src.includes("new URL('../img/effetti/effetti-reference-v536.webp?v=536'"));
 assert.ok(section.includes("energiaCentraleV536?.naturalWidth===1440"));
 assert.ok(section.includes("energiaCentraleV536?.naturalHeight===1200"));
 assert.ok(section.includes("rc.globalCompositeOperation='destination-in'"));
 assert.ok(section.includes("fxCtx.globalCompositeOperation='screen'"));
 assert.ok(section.includes("fxCtx.drawImage(riempie,0,0,w,h)"));
 assert.ok(section.indexOf('fxCtx.drawImage(riempie,0,0,w,h)')<section.indexOf('fxCtx.drawImage(foto,'));
 const avatar=src.indexOf('ctx.drawImage(riferimentoCompleto?ritaglioEsportabile:immagine,dx,dy,dw,dh)');
 assert.ok(avatar>src.indexOf('ctx.drawImage(sfuma,fxX,fxY,fxW,fxH)'));
});
test('v559: PWA cache matches the new effect compositor',()=>{
 const sw=read('sw.js'),idx=read('index.html'),app=read('src/app.js'),ui=read('src/rpg-atelier-ui.js');
 assert.ok(sw.includes("const VERSIONE = 'palestra-v559'"));
 assert.ok(idx.includes("PALESTRA_VERSIONE = 'palestra-v559'"));
 assert.ok(idx.includes('stile-rpg.css?v=559'));
 assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=559'));
 assert.ok(ui.includes('./rpg-atelier.js?v=559'));
 assert.ok(sw.includes('effetti-reference-v536.webp?v=536'));
});
