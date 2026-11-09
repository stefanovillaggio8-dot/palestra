import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { FOTO_INCLINE_PULLDOWN_CORRETTA, posizioneIconaCorretta } from '../src/exercise-icons.js';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const asset = 'img/esercizi/verificati-v456/ex-lying-cable-curl.webp';
const svgStorico='img/esercizi/uniformi-v455/ex-lying-cable-curl.svg';
const idStorico = 'ex-lying-cable-curl';

test('v446: panca dell Incline Single Arm Pulldown corretta senza cambiare ID o perdere lo storico', () => {
  const exercise=ESERCIZI.find(e=>e.id===idStorico);
  assert.ok(exercise);
  assert.equal(exercise.nome,'Incline Single Arm Pulldown');
  assert.equal(exercise.foto, 'img/esercizi/incline-single-arm-pulldown-v446.svg');
  assert.equal(FOTO_INCLINE_PULLDOWN_CORRETTA, asset);
  assert.match(exercise.nota_permanente,/petto appoggiato/);
  assert.equal(posizioneIconaCorretta(exercise),null, 'questa foto non e il vecchio sprite errato');
});

test('v446: un file vettoriale unico rappresenta il petto contro il supporto, cavo alto monobraccio',()=>{
  const svg=read(svgStorico);
  assert.match(svg, /<svg[^>]+viewBox="0 0 512 512"/);
  assert.match(svg, /petto contro la panca inclinata/);
  assert.match(svg, /chest-facing inclined pad/);
  assert.match(svg, /body leans forward\/right/);
  assert.match(svg, /working arm: upward reach to one D-handle/);
  assert.match(svg, /<rect width="512" height="512" rx="45" fill="#260a36"/);
  assert.match(svg, /url\(#bg\)/);
  assert.ok(svg.length>3000,'l immagine non e un placeholder');
  const webp=readFileSync(new URL('../'+asset,import.meta.url));
  assert.equal(webp.toString('ascii',0,4),'RIFF');
  assert.equal(webp.toString('ascii',8,12),'WEBP');
  assert.ok(webp.length>2000);
});

test('v446: le PWA esistenti ricevono la nuova foto anche con vecchio dato locale',()=>{
  const images=read('src/exercise-icons.js');
  const sw=read('sw.js');
  const html=read('index.html');
  const catalogo=read('src/dati-iniziali.js');
  assert.match(images,/esercizio\?\.id === 'ex-lying-cable-curl'/);
  assert.match(images,/src: FOTO_INCLINE_PULLDOWN_CORRETTA/);
  assert.match(sw,/const VERSIONE = 'palestra-v460'/);
  assert.ok(sw.includes("'./"+asset+"'"));
  assert.match(html,/PALESTRA_VERSIONE = 'palestra-v460'/);
  assert.match(html,/app\.js\?v=460/);
  assert.ok(catalogo.includes("foto: 'img/esercizi/incline-single-arm-pulldown-v446.svg'"));
});
