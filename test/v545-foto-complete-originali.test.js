import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EFFETTI_REFERENCE_V532 } from '../src/rpg-reference-v532.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const bytes=p=>readFileSync(new URL('../'+p,import.meta.url));
test('v545: tutte e cinque le fotografie originali con base completa',()=>{
  const bin=bytes('img/effetti/reference-scene-v545.webp');
  const data=JSON.parse(read('img/effetti/reference-scene-v545.json'));
  assert.equal(bin.toString('ascii',0,4),'RIFF');
  assert.equal(bin.toString('ascii',8,12),'WEBP');
  assert.ok(bin.length>600000,'la scena completa non deve essere una mini-immagine');
  assert.deepEqual(Object.keys(data),['ambra','ombra','fulmine','nebula','astrale']);
  const refs=Object.values(EFFETTI_REFERENCE_V532);
  for(const ref of refs){
    const record=data[ref.classe];
    assert.ok(record.pixel_originali_preservati>36000,ref.classe);
    assert.deepEqual([record.colonna,record.riga],[ref.colonna,ref.riga],ref.classe);
  }
});
test('v545: Shop non comprime o ritaglia la fotografia e preserva il soggetto',()=>{
  const css=read('stile-rpg.css'),comp=read('src/rpg-reference-compositing-v539.js');
  assert.match(css,/\.rpg-reference-stage-v545\s*> \.rpg-reference-environment-v541\s*\{[\s\S]*?aspect-ratio:461 \/ 440!important/);
  assert.match(css,/\.rpg-reference-stage-v545\s*> \.rpg-reference-environment-v541\s*\{[\s\S]*?width:160%!important/);
  assert.match(css,/reference-scene-v545\.webp\?v=545/);
  assert.match(comp,/fotografia\.naturalWidth===1383&&fotografia\.naturalHeight===880/);
  assert.match(comp,/grafica\.classList\?\.add\?\.\('rpg-reference-stage-v545'\)/);
  assert.ok(comp.indexOf('grafica.appendChild(ambiente)')<comp.indexOf('grafica.appendChild(soggetto)'));
});
test('v545: PNG Atelier conserva la base intera e il vero personaggio',()=>{
  const src=read('src/rpg-atelier.js');
  assert.match(src,/const palcoV545=riferimentoV532/);
  assert.match(src,/const palcoFotoV545=Boolean\(ritaglioEsportabile&&/);
  assert.match(src,/riferimentoV532\.colonna\*cellW,riferimentoV532\.riga\*cellH/);
  assert.match(src,/const fxW=dw\*1\.60,fxH=fxW\*\(440\/461\)/);
  assert.match(src,/const larghezza=riferimentoV532\?1500:780,altezza=riferimentoV532\?1500:1170/);
});
test('v545: versione online, file statici e offline coincidono',()=>{
  const idx=read('index.html'),sw=read('sw.js'),app=read('src/app.js');
  assert.ok(idx.includes("PALESTRA_VERSIONE = 'palestra-v552'"));
  assert.ok(sw.includes("const VERSIONE = 'palestra-v552'"));
  for(const sheet of ['stile.css','stile-rpg.css','stile-premium.css']){
    assert.ok(idx.includes('./'+sheet+'?v=552'),sheet);
    assert.ok(sw.includes("'./"+sheet+"?v=552'"),sheet);
  }
  assert.ok(sw.includes("'./img/effetti/reference-scene-v545.webp?v=545'"));
  assert.ok(sw.includes("percorso.includes('reference-scene-v545.webp')"));
  assert.ok(app.includes("./rpg-reference-compositing-v539.js?v=552"));
});
