import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v552: approved 626:710 scenery is centered around the untouched 2:3 portrait',()=>{
  const css=read('stile-rpg.css');
  const stage=css.match(/\.personaggio-scena-grafica\.rpg-reference-v532\.rpg-reference-integrated-v539\.rpg-reference-stage-v548\s*\n\s*> \.rpg-reference-environment-v541 \{[^}]+\}/)?.[0];
  assert.ok(stage,'active approved scenery selector');
  for(const declaration of ['top:-3%!important','left:-24%!important',
    'width:148%!important','aspect-ratio:626 / 710!important',
    'background-size:300% 200%!important'])
    assert.ok(stage.includes(declaration),declaration);
  assert.match(css,/\.personaggio-scena-grafica\.rpg-reference-v532\.rpg-reference-integrated-v539[\s\S]*?> \.rpg-reference-subject-v539 \{[\s\S]*?object-fit:contain!important/);
  assert.match(css,/\.aura-preview-panel \.personaggio-scena-grafica[^{]*\{[\s\S]*?width:min\(100%,350px\)!important/);
  // 360×540 subject => 532.8px scenery, i.e. 24% extra on both sides.
  const bodyWidth=360;
  const sceneryWidth=bodyWidth*1.48;
  assert.ok(Math.abs((sceneryWidth-bodyWidth)/2-86.4)<0.001);
  assert.ok(sceneryWidth*710/626>540,'floor stays near original boots');
});

test('v552: Shop and PNG export use identical size and keep real character assets',()=>{
  const css=read('stile-rpg.css');
  const atelier=read('src/rpg-atelier.js');
  const app=read('src/app.js');
  const sw=read('sw.js');
  const index=read('index.html');
  assert.match(atelier,/const fxW=dw\*1\.48,fxH=fxW\*\(710\/626\)/);
  assert.match(atelier,/dx-\(fxW-dw\)\/2,dy-dh\*\.03,fxW,fxH/);
  assert.match(atelier,/ctx\.drawImage\(riferimentoCompleto\?ritaglioEsportabile:immagine,dx,dy,dw,dh\)/);
  assert.match(app,/src: fotoAuraDivinaRpg \|\| fotoCoronaRpg \|\| fotoArmaturaRpg \|\| fotoProgressioneRpg/);
  assert.doesNotMatch(css,/approved-showcase-v550\.webp/);
  assert.equal(Object.keys(EFFETTI_REFERENCE_V532).length,5);
  assert.match(sw,/const VERSIONE = 'palestra-v555'/);
  assert.match(index,/PALESTRA_VERSIONE = 'palestra-v555'/);
});
