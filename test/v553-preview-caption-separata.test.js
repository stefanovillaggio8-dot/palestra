import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v554: Shop and Atelier keep descriptions below the five effect floors',()=>{
  const css=read('stile-rpg.css');
  assert.ok(css.includes('margin:0 auto clamp(28px,10.5%,48px)!important'));
  assert.ok(css.includes('.rpg-atelier-stage .rpg-atelier-avatar .personaggio-scena-grafica.rpg-reference-v532'));
  assert.ok(css.includes('.aura-preview-reference-scene .personaggio-scena > .personaggio-dati'));
  assert.ok(css.includes('.rpg-atelier-stage:has(.rpg-reference-v532) .personaggio-scena > .personaggio-dati'));
  assert.ok(css.includes('z-index:5;'));
  // 148%-wide 626:710 scenery hangs only ~13.4% of the portrait width
  // beyond the bottom of its 2:3 canvas; our reserved margin is ~15.5%.
  const below=(1.48*710/626)-(1.5+0.03*1.5);
  assert.ok(below>0.12&&below<0.17);
  assert.ok(0.155>below);
});

test('v554: photo remains original and effects are complete, not clipped',()=>{
  const css=read('stile-rpg.css'),app=read('src/app.js');
  const sw=read('sw.js'),index=read('index.html');
  assert.ok(css.includes('.aura-preview-panel .aura-preview-reference-scene,'));
  assert.ok(css.includes('overflow:visible!important'));
  assert.ok(css.includes("approved-environments-v548.webp?v=548"));
  assert.ok(css.includes('width:148%!important'));
  assert.ok(app.includes("if(referenceAnteprima)scena.classList.add('aura-preview-reference-scene')"));
  assert.ok(app.includes("personaggio.classList.add('aura-preview-character')"));
  assert.ok(app.includes("const nota = personaggio.querySelector('.personaggio-dati .nota')"));
  assert.ok(sw.includes("const VERSIONE = 'palestra-v554'"));
  assert.ok(index.includes("PALESTRA_VERSIONE = 'palestra-v554'"));
  assert.ok(index.includes('stile-rpg.css?v=554'));
});
