import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const leggi = (p) => readFileSync(new URL('../' + p, import.meta.url));
const tagJpeg = (buf) => buf[0] === 0xff && buf[1] === 0xd8
  && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;

test('v435: CAD Curl usa esattamente la foto gia presente, fonte conservata senza modifica', () => {
  const backup = leggi('img/esercizi/cad-curl-originale-v435.jpg');
  const app = leggi('img/esercizi/cad-curl-app.jpg');
  assert.equal(createHash('sha256').update(backup).digest('hex'),
    '8a227a7dbfc2685d44d077c5314e14731f180943ee421a9c577685d609073f80',
    'la fonte non deve cambiare: e la foto esistente con i manubri');
  assert.ok(tagJpeg(backup) && tagJpeg(app), 'entrambe sono JPEG validi');
  assert.notDeepEqual(app, backup, 'sfondo viola realmente pubblicato');
  assert.ok(app.length > 3000, 'la foto modificata non deve essere vuota');
  const dati = leggi('src/dati-iniziali.js').toString('utf8');
  assert.ok(dati.includes("foto: 'img/esercizi/cad-curl-app.jpg'"));
  const sw = leggi('sw.js').toString('utf8');
  assert.ok(sw.includes("'./img/esercizi/cad-curl-app.jpg'"));
});

test('v435: 11 ritagli restano immagini quadrate senza cambiare la scheda', () => {
  const nomi = [
    'db-lateral-raise.png','lat-pulldown-lats.png','ez-bar-preacher-curl.png',
    'dumbbell-curl.png','seated-hammer-curl.png','bench-press.png',
    'dumbbell-bench-pull.png','decline-dumbbell-bench-press.png',
    'hammer-curl-dumbbell.png','iso-lateral-row.png','back-extension.png',
  ];
  const script = leggi('tools/ritagli-esercizi-v435.py').toString('utf8');
  for (const nome of nomi) {
    const png = leggi('img/esercizi/' + nome);
    assert.equal(png.toString('ascii',1,4),'PNG');
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    assert.equal(w,h, nome + ' non deve essere deformata');
    assert.ok([160,256].includes(w), nome + ' dimensione inattesa');
    assert.ok(script.includes('"' + nome + '"'), nome + ' non nel piano zoom');
  }
});

test('v435: cache e HTML allineati, senza cambiare il Rank', () => {
  const html = leggi('index.html').toString('utf8');
  const sw = leggi('sw.js').toString('utf8');
  assert.ok(html.includes("window.PALESTRA_VERSIONE = 'palestra-v449'"));
  assert.ok(sw.includes("const VERSIONE = 'palestra-v449'"));
  assert.ok(sw.includes("'./img/esercizi/cad-curl-app.jpg'"));
});
