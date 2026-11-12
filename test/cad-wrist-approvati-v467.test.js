import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { sorgenteMiniatura } from '../src/exercise-icons.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url));
const txt = p => read(p).toString('utf8');
const icons = Object.freeze({
  'ex-scott-bench-curl': 'img/esercizi/cad-curl-v467.webp',
  'ex-wrist-curl': 'img/esercizi/wrist-curl-v467.webp',
});
test('v467: CAD Curl e Wrist Curl hanno file WebP HD dedicati, immagini e ID distinti', () => {
  for (const [id, path] of Object.entries(icons)) {
    const e = ESERCIZI.find(x => x.id === id);
    assert.ok(e, id + ' deve restare nel catalogo');
    const img = sorgenteMiniatura(e);
    assert.equal(img.tipo, 'originale');
    assert.equal(img.src, path);
    assert.equal(img.zoom, 1, 'non tagliare il bordo neon dell immagine');
    const bytes = read(path);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(bytes.length > 15000, 'l immagine deve essere nitida');
  }
});
test('v467: miniature presenti in galleria e precache offline PWA', () => {
  for (const path of Object.values(icons)) {
    assert.ok(txt('verifica-icone.html').includes(path), 'galleria: ' + path);
    assert.ok(txt('sw.js').includes('./' + path), 'offline: ' + path);
  }
});
test('v467: le altre foto approvate non cambiano, incluse le due varianti al cavo alto', () => {
  const unchanged = {
    'ex-cable-reverse-fly': 'img/esercizi/cable-reverse-fly-v465.webp',
    'ex-lying-cable-curl': 'img/esercizi/incline-single-arm-pulldown-v465.webp',
    'ex-incline-cable-curl': 'img/esercizi/incline-cable-curl-v466.webp',
    'ex-high-cable-wrist-curl-one-arm': 'img/esercizi/high-pulley-wrist-one-arm-v468.webp',
    'ex-high-cable-wrist-curl-two-arm': 'img/esercizi/high-pulley-wrist-two-arm-v468.webp',
  };
  for (const [id, path] of Object.entries(unchanged)) {
    assert.equal(sorgenteMiniatura(ESERCIZI.find(e => e.id === id)).src, path, id);
  }
});
test('v467: versione unica, nessuna scrittura ai dati allenamento in icone', () => {
  assert.match(txt('sw.js'), /const VERSIONE = 'palestra-v484'/);
  assert.match(txt('index.html'), /window\.PALESTRA_VERSIONE = 'palestra-v484'/);
  assert.match(txt('index.html'), /app\.js\?v=484/);
  assert.match(txt('verifica-icone.html'), /Verifica icone esercizi · v470/);
  const code = txt('src/exercise-icons.js');
  for (const forbidden of ['localStorage.setItem', 'salvaSerie', 'eliminaSeduta', 'db.salva']) {
    assert.ok(!code.includes(forbidden));
  }
});
