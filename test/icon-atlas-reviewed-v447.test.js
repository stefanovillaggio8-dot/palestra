import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { POSIZIONI_ICONE_CORRETTE, FOTO_INCLINE_PULLDOWN_CORRETTA, posizioneIconaCorretta } from '../src/exercise-icons.js';

const leggi = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const sprite = readFileSync(new URL('../img/esercizi/esercizi-verificati-v451.webp', import.meta.url));

test('v447: tutti i 16 esercizi del nuovo foglio hanno una cella unica e un ID reale', () => {
  const posizioni = Object.entries(POSIZIONI_ICONE_CORRETTE);
  assert.equal(posizioni.length, 78);
  const chiavi = new Set();
  for (const [id, [x,y]] of posizioni) {
    const e = ESERCIZI.find(item => item.id === id);
    assert.ok(e, 'esercizio inesistente: ' + id);
    assert.ok(Number.isInteger(x) && x>=0 && x<8, 'colonna sprite: ' + id);
    assert.ok(Number.isInteger(y) && y>=0 && y<10, 'riga sprite: ' + id);
    assert.ok(!chiavi.has(x+':'+y), 'foto duplicata fra esercizi: ' + id);
    chiavi.add(x+':'+y);
    const pos = posizioneIconaCorretta(e);
    assert.equal(pos.x, x * 100 / 7);
    assert.equal(pos.y, y * 100 / 9);
  }
});

test('v447: nuovo asset binario alta definizione e diverso dal vecchio file', () => {
  assert.equal(sprite.toString('ascii',0,4),'RIFF');
  assert.equal(sprite.toString('ascii',8,12),'WEBP');
  assert.ok(sprite.byteLength >= 80_000, 'non utilizzare miniature troppo compresse');
  const css=leggi('stile.css');
  const sw=leggi('sw.js');
  assert.match(css,/background-image: url\('\.\/img\/esercizi\/esercizi-uniformi-v455\.webp'\)/);
  assert.match(css,/background-size:\s*800% 1000%/);
  assert.doesNotMatch(css,/background-image: url\('\.\/img\/esercizi\/esercizi-illustrati-v445\.webp'\)/);
  assert.match(sw,/'\.\/img\/esercizi\/esercizi-uniformi-v455\.webp'/);
  assert.match(sw,/palestra-v473/);
  assert.match(leggi('index.html'),/PALESTRA_VERSIONE = 'palestra-v473'/);
});

test('v447: Incline Single Arm Pulldown v446 rimane corretto e separato', () => {
  const legacy = ESERCIZI.find(item => item.id === 'ex-lying-cable-curl');
  assert.ok(legacy);
  assert.equal(FOTO_INCLINE_PULLDOWN_CORRETTA,'img/esercizi/incline-single-arm-pulldown-v465.webp');
  assert.equal(legacy.foto,'img/esercizi/incline-single-arm-pulldown-v446.svg');
  assert.equal(posizioneIconaCorretta(legacy),null);
  assert.match(leggi('src/exercise-icons.js'),/id === 'ex-lying-cable-curl'/);
  assert.ok(leggi('sw.js').includes('img/esercizi/incline-single-arm-pulldown-v465.webp'));
});
