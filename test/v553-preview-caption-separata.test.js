import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v553: Shop preview and Atelier reserve scene height instead of painting over caption',()=>{
  const css=read('stile-rpg.css');
  assert.match(css,/margin:0 auto clamp\\(28px,10\\.5%,48px\\)!important/);
  assert.match(css,/\\.rpg-atelier-stage \\.rpg-atelier-avatar \\.personaggio-scena-grafica\\.rpg-reference-v532/);
  assert.match(css,/\\.aura-preview-reference-scene \\.personaggio-scena > \\.personaggio-dati/);
  assert.match(css,/\\.rpg-atelier-stage:has\\(\\.rpg-reference-v532\\) \\.personaggio-scena > \\.personaggio-dati/);
  assert.match(css,/z-index:5;[\\s\\S]*?align-items:center/);
  // The absolute 148%-wide 626:710 backdrop overflows a 2:3 portrait:
  // its bottom extends 13.3% of the portrait width, less than the reserved 17%.
  const below=(1.48*710/626)-(1.5+0.03*1.5);
  assert.ok(below>0.12&&below<0.17);
  assert.ok(0.155>below);
});

test('v553: approved effects are never clipped or regenerated; regular profile remains unchanged',()=>{
  const css=read('stile-rpg.css');
  const app=read('src/app.js');
  const sw=read('sw.js'),index=read('index.html');
  assert.match(css,/\\.aura-preview-panel \\.aura-preview-reference-scene,[\\s\\S]*?overflow:visible!important/);
  assert.match(css,/background-image:url\('\.\/img\/effetti\/approved-environments-v548\.webp\?v=548'\)!important/);
  assert.match(css,/width:148%!important/);
  assert.match(app,/personaggio\.classList\.add\('aura-preview-character'\)/);
  assert.match(app,/const nota = personaggio\.querySelector\('\.personaggio-dati \.nota'\)/);
  assert.match(sw,/const VERSIONE = 'palestra-v554'/);
  assert.match(index,/PALESTRA_VERSIONE = 'palestra-v554'/);
  assert.match(index,/stile-rpg\.css\?v=554/);
});
