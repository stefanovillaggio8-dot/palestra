import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { sorgenteMiniatura } from '../src/exercise-icons.js';

const text = p => readFileSync(new URL('../'+p, import.meta.url),'utf8');
const filePath = {
  'ex-high-cable-wrist-curl-one-arm': 'img/esercizi/high-pulley-wrist-one-arm-v468.webp',
  'ex-high-cable-wrist-curl-two-arm': 'img/esercizi/high-pulley-wrist-two-arm-v468.webp'
};

test('v468: entrambi i Wrist Curl al cavo alto hanno WebP indipendenti e HD', () => {
  const bins = [];
  for(const [id,path] of Object.entries(filePath)) {
    const e = ESERCIZI.find(x=>x.id === id);
    assert.ok(e,id);
    assert.equal(e.foto,path);
    const icon = sorgenteMiniatura(e);
    assert.equal(icon.tipo,'originale');
    assert.equal(icon.src,path);
    assert.equal(icon.zoom,1,'non tagliare la cornice dell icona');
    const bytes = readFileSync(new URL('../'+path,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.ok(bytes.length>20000,'l immagine non deve essere un segnaposto');
    bins.push(bytes);
  }
  assert.notDeepEqual(bins[0], bins[1], 'monobraccio e bilaterale sono pose diverse');
});

test('v468: catalogo, galleria e cache usano le stesse immagini, non la v462', () => {
  const gallery=text('verifica-icone.html'),sw=text('sw.js'),catalog=text('src/dati-iniziali.js');
  for(const path of Object.values(filePath)) {
    assert.ok(gallery.includes(path), 'galleria: '+path);
    assert.ok(sw.includes('./'+path), 'precache: '+path);
    assert.ok(catalog.includes(path), 'catalogo: '+path);
  }
  assert.doesNotMatch(gallery,/high-pulley-wrist-(?:one|two)-arm-v462\.webp/);
  assert.doesNotMatch(catalog,/high-pulley-wrist-(?:one|two)-arm-v462\.webp/);
});

test('v468: le altre icone approvate rimangono identiche e gli esercizi sono 81', () => {
  assert.equal(ESERCIZI.length,81);
  const preserved={
    'ex-scott-bench-curl':'img/esercizi/cad-curl-v467.webp',
    'ex-wrist-curl':'img/esercizi/wrist-curl-v467.webp',
    'ex-cable-reverse-fly':'img/esercizi/cable-reverse-fly-v465.webp',
    'ex-incline-cable-curl':'img/esercizi/incline-cable-curl-v466.webp',
    'ex-lying-cable-curl':'img/esercizi/incline-single-arm-pulldown-v465.webp'
  };
  for(const [id,path] of Object.entries(preserved)) {
    assert.equal(sorgenteMiniatura(ESERCIZI.find(x=>x.id===id)).src,path,id);
  }
});

test('v468: versioni sincronizzate e rendering senza scritture dei dati',()=>{
  assert.match(text('sw.js'),/const VERSIONE = 'palestra-v489'/);
  assert.match(text('index.html'),/PALESTRA_VERSIONE = 'palestra-v489'/);
  assert.match(text('index.html'),/app\.js\?v=489/);
  assert.match(text('verifica-icone.html'),/Palestra v474/);
  for(const forbidden of ['localStorage.setItem','supabase.from','salvaSerie','eliminaSeduta']) {
    assert.ok(!text('src/exercise-icons.js').includes(forbidden),forbidden);
  }
});
