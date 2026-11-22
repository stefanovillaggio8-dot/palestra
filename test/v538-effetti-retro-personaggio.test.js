import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v538: nessun effetto integrale sopra il volto e la corporatura',()=>{
  const css=read('stile-rpg.css');
  const app=read('src/app.js');
  assert.match(css,/\.rpg-reference-fx\.rpg-reference-fx-back\{[\s\S]*?z-index:1!important/);
  assert.match(css,/\.rpg-reference-fx\.rpg-reference-fx-front\{[\s\S]*?z-index:3!important/);
  assert.match(css,/\.personaggio-ritratto\{[\s\S]*?z-index:2!important/);
  assert.match(css,/mask-image:radial-gradient\(ellipse 31% 45% at 50% 43%/);
  assert.match(app,/\['rpg-reference-fx-back','rpg-reference-fx-front'\]/);
  assert.match(css,/background-image:url\('\.\/img\/effetti\/effetti-reference-v540\.webp\?v=540'\)!important/);
});

test('v538: anche il PNG ha lo stesso retro, sfumatura e immagine reale',()=>{
  const atelier=read('src/rpg-atelier.js');
  assert.match(atelier,/disegnaReferenceV538\(ctx,atlanteV539,riferimentoV532,dx,dy,dw,dh,'retro'\)/);
  assert.match(atelier,/disegnaReferenceV538\(ctx,atlanteV539,riferimentoV532,dx,dy,dw,dh,'fronte'\)/);
  assert.match(atelier,/riferimentoV532 \? fotoBase/);
  assert.match(atelier,/globalCompositeOperation='destination-out'/);
  assert.match(atelier,/dx-dw\*\.32,dy-dh\*\.04,dw\*1\.64,dh\*1\.08/);
});

test('v538: il tasto salvataggio Shop include cinque effetti',()=>{
  const app=read('src/app.js'),exporter=read('src/anteprima-combinata-rpg.js');
  assert.match(app,/grafica\.dataset\.referenceEffetto=effettoEquipaggiato\.id/);
  assert.match(exporter,/const \{salvaFotoAtelier\}=await import\('\.\/rpg-atelier\.js\?v=540'\)/);
  assert.match(exporter,/effetto:grafica\.dataset\.referenceEffetto\|\|''/);
});

test('v538: nessuna regressione PWA e texture reference storica preservata',()=>{
  const sw=read('sw.js'),index=read('index.html');
  assert.match(sw,/const VERSIONE = 'palestra-v540'/);
  assert.match(index,/PALESTRA_VERSIONE = 'palestra-v540'/);
  assert.match(sw,/effetti-reference-v537\.webp\?v=537/);
});
