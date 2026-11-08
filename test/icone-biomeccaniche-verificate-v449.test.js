import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { POSIZIONI_ICONE_CORRETTE, sorgenteMiniatura,
  FOTO_INCLINE_PULLDOWN_CORRETTA } from '../src/exercise-icons.js';

const text = file => readFileSync(new URL('../' + file, import.meta.url),'utf8');
const pos = id => POSIZIONI_ICONE_CORRETTE[id];
const asset = readFileSync(new URL('../img/esercizi/esercizi-verificati-v449.webp',import.meta.url));

test('v449: approvate trazioni con sovraccarico e shoulder press a dischi hanno celle dedicate',() => {
  assert.deepEqual(pos('ex-pull-ups'),[0,4]);
  assert.deepEqual(pos('ex-shoulder-pin-press'),[1,4]);
  assert.deepEqual(pos('ex-trazioni-corpo-libero'),[0,5]);
  assert.notDeepEqual(pos('ex-pull-ups'),pos('ex-trazioni-corpo-libero'));
  assert.deepEqual(pos('ex-cable-bicep-curl'),[0,3]);
  assert.deepEqual(pos('ex-cable-lateral-raise'),[2,4]);
  assert.deepEqual(pos('ex-dumbbell-bench-press'),[0,2]);
  assert.deepEqual(pos('ex-back-extension-hanging'),[3,3]);
  assert.deepEqual(pos('ex-back-extension-chest'),[3,4]);
});

test('v449: 24 illustrazioni distinte mappate a esercizi realmente presenti',() => {
  const ids = new Set(ESERCIZI.map(e=>e.id));
  assert.equal(ESERCIZI.length,79);
  const entries=Object.entries(POSIZIONI_ICONE_CORRETTE);
  assert.equal(entries.length,24);
  const tiles=new Set();
  for(const [id,[x,y]] of entries) {
    assert.ok(ids.has(id),'esercizio inesistente '+id);
    assert.ok(Number.isInteger(x)&&x>=0&&x<4);
    assert.ok(Number.isInteger(y)&&y>=0&&y<6);
    assert.ok(!tiles.has(x+':'+y),'cella condivisa '+id);
    tiles.add(x+':'+y);
    assert.equal(sorgenteMiniatura(ESERCIZI.find(e=>e.id===id)).tipo,'sprite');
  }
  assert.equal(tiles.size,24);
  assert.equal(sorgenteMiniatura(ESERCIZI.find(e=>e.id==='ex-lying-cable-curl')).src,FOTO_INCLINE_PULLDOWN_CORRETTA);
});

test('v449: atlas WebP HD effettivo, PWA e CSS senza crop o sfocatura',() => {
  assert.equal(asset.toString('ascii',0,4),'RIFF');
  assert.equal(asset.toString('ascii',8,12),'WEBP');
  assert.ok(asset.length>=90_000, 'non sostituire con asset piccolo e sfocato');
  const css=text('stile.css'),sw=text('sw.js'),html=text('index.html');
  assert.match(css,/background-image: url\('\.\/img\/esercizi\/esercizi-verificati-v449\.webp'\)/);
  assert.match(css,/background-size: 400% 600%/);
  assert.match(css,/\.foto-esercizio-arte-originale[\s\S]*object-fit: contain/);
  const cssIcons=css.slice(css.indexOf('/* v448: un solo sistema visivo'),css.indexOf('@media (max-width: 390px)'));
  assert.doesNotMatch(cssIcons,/blur\(/i);
  assert.match(sw,/const VERSIONE = 'palestra-v449'/);
  assert.match(sw,/'\.\/img\/esercizi\/esercizi-verificati-v449\.webp'/);
  assert.match(html,/PALESTRA_VERSIONE = 'palestra-v449'/);
});
