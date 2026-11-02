import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const premium=readFileSync(new URL('../stile-premium.css',import.meta.url),'utf8');

test('la Home usa la variante compatta senza modificare il Rank globale',()=>{
  const start=app.indexOf('function vistaCasa(zona) {');
  const end=app.indexOf('function vistaRank(zona)',start);
  const casa=app.slice(start,end);
  assert.match(casa,/teschio-rank casa-rank-compatto/);
  assert.match(casa,/badgeRank\(st\.rankPrincipale\.rankId/);
  assert.match(casa,/casa-rank-esercizio/);
  assert.match(casa,/titolo: st\.rankPrincipale/);
  const globalBadge=app.slice(app.indexOf('function badgeRank('),app.indexOf('function badgeRank(')+1000);
  assert.doesNotMatch(globalBadge,/casa-rank-compatto/);
});
test('la card Rank è una sola riga sottile, senza altezza minima di 70-95px',()=>{
  const css=premium.slice(premium.indexOf('/* v409 · Rank della sola CASA:'));
  assert.ok(css.length>1000);
  assert.match(css,/grid-template-columns:max-content max-content minmax\(0,1fr\)/);
  assert.match(css,/min-height:0/);
  assert.match(css,/padding:6px 11px/);
  assert.match(css,/height:38px/);
  assert.match(css,/height:34px/);
  assert.doesNotMatch(css,/min-height:95px/);
});
test('iPhone: le scritte lunghe non allargano la card o escono dallo schermo',()=>{
  const css=premium.slice(premium.indexOf('/* v409 · Rank della sola CASA:'));
  assert.match(css,/@media \(max-width:480px\)/);
  assert.match(css,/grid-template-columns:max-content minmax\(0,1\.4fr\) minmax\(0,1fr\)/);
  assert.match(css,/text-overflow:ellipsis/);
  assert.match(css,/overflow:hidden/);
  assert.match(css,/width:100%/);
});
test('la riduzione è limitata a Casa, non alla pagina Rank e non al profilo',()=>{
  const css=premium.slice(premium.indexOf('/* v409 · Rank della sola CASA:'));
  assert.doesNotMatch(css,/\.app-vista-rank/);
  assert.doesNotMatch(css,/\.testa-profilo/);
  assert.match(css,/\.app-vista-casa \.riga-teschio > \.teschio-rank\.casa-rank-compatto/);
});
