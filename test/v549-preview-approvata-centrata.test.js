import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('stile-rpg.css');
const comp=read('src/rpg-reference-compositing-v539.js');
const exportJs=read('src/rpg-atelier.js');

test('v549: Shop unarmored assassin uses the approved image independent of streak stage',()=>{
 assert.match(comp,/avatarMockupConsentito=\(\)=>classe==='assassino'&&/);
 assert.match(comp,/grafica\.closest\?\.\('\.aura-preview-panel'\)/);
 const gate=comp.slice(comp.indexOf('const avatarMockupConsentito=()'),comp.indexOf('const attivaV548=',comp.indexOf('const avatarMockupConsentito=()')));
 assert.ok(!gate.includes('referenceStadio'),'The approved Shop preview must not depend on streak stage');
 assert.ok(gate.includes("referenceDivina!=='true'"));
 assert.ok(gate.includes("referenceCorona!=='true'"));
 assert.ok(gate.includes('!corona&&!arma'));
 assert.ok(comp.includes("rpg-reference-stage-v548-static"));
 assert.ok(comp.includes("globalThis.queueMicrotask?.(()=>{attiva();attivaV548();});"));
});

test('v549: exact 5 photo cells are full-width, never a cropped image behind another avatar',()=>{
 const header='.aura-preview-panel .aura-preview-avatar-container:has(.rpg-reference-stage-v548-static)::before';
 const start=css.indexOf(header);
 assert.ok(start>=0,'missing exact photo poster in preview');
 const end=css.indexOf('}',start),block=css.slice(start,end);
 assert.match(block,/width:min\(100%,360px\)/);
 assert.match(block,/aspect-ratio:626 \/ 710/);
 assert.match(block,/approved-showcase-v550\.webp\?v=550/);
 assert.match(block,/background-size:300% 200%/);
 assert.match(css,/\.aura-preview-avatar-container:has\(\.rpg-reference-stage-v548-static\)[\s\S]*?\.personaggio-scena-grafica \{\s*display:none!important/);
 const expected={
   ambra:'0% 0%',ombra:'50% 0%',fulmine:'100% 0%',nebula:'0% 100%',astrale:'50% 100%',
 };
 for(const ref of Object.values(EFFETTI_REFERENCE_V532)){
  assert.ok(expected[ref.classe]);
  if(ref.classe==='ambra')assert.ok(block.includes('background-position:0% 0%'));
  else assert.ok(css.includes('background-position:'+expected[ref.classe]+';'),ref.classe+' missing correct photo panel');
 }
});

test('v549: only promotional preview hides avatar; normal gameplay and armor remain unchanged',()=>{
 assert.match(css,/\.aura-preview-panel \.aura-preview-avatar-container:has\(\.rpg-reference-stage-v548-static\)/);
 assert.match(css,/\.personaggio-dati \{[\s\S]*?text-align:left!important/);
 assert.match(comp,/idContornoArmaturaCosmicaRpg\(url\)/);
 assert.match(comp,/grafica\.appendChild\(soggetto\)/);
 assert.match(comp,/if\(approvatoSfondoPronto&&approvatoShowcasePronto&&avatarMockupConsentito\(\)\)/);
});

test('v549: PNG export of approved Shop composition does not duplicate the subject',()=>{
 assert.match(exportJs,/const palcoEsattoV548=Boolean\(riferimentoV532&&/);
 assert.match(exportJs,/grafica\?\.closest\?\.\('\.aura-preview-panel'\)/);
 const gate=exportJs.slice(exportJs.indexOf('const palcoEsattoV548=Boolean('),exportJs.indexOf('const palcoDinamicoV548=Boolean('));
 assert.ok(!gate.includes('c.stadio===0'));
 assert.match(exportJs,/else if\(!palcoEsattoV548\) ctx\.drawImage/);
 assert.match(exportJs,/const fxW=dw\*1\.12,fxH=fxW\*\(710\/626\)/);
});

test('v549: PWA reloads the latest code while retaining the approved original WebP',()=>{
 const idx=read('index.html'),sw=read('sw.js'),app=read('src/app.js'),ui=read('src/rpg-atelier-ui.js'),combined=read('src/anteprima-combinata-rpg.js');
 assert.ok(idx.includes("PALESTRA_VERSIONE = 'palestra-v550'"));
 assert.ok(sw.includes("const VERSIONE = 'palestra-v550'"));
 for(const file of ['stile.css','stile-rpg.css','stile-premium.css']){
  assert.ok(idx.includes('./'+file+'?v=550'),file);
  assert.ok(sw.includes("'./"+file+"?v=550'"),file);
 }
 assert.ok(sw.includes("'./img/effetti/approved-showcase-v550.webp?v=550'"));
 assert.ok(app.includes('./rpg-reference-compositing-v539.js?v=550'));
 assert.ok(app.includes('./rpg-atelier-ui.js?v=550'));
 assert.ok(ui.includes('./rpg-atelier.js?v=550'));
 assert.ok(combined.includes('./rpg-atelier.js?v=550'));
});
