import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { confronta } from '../src/sociale.js';

const radice = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(radice, 'src/app.js'), 'utf8');
const css = readFileSync(join(radice, 'stile-premium.css'), 'utf8');
const paginaAmico = app.slice(app.indexOf('function vistaAmico('), app.indexOf('function puoVedereAmico('));

test('v514: la barra mobile è fuori dalla vista scrollabile, unica e stabile ai ridisegni', () => {
  assert.match(app, /document\.body\.appendChild\(navigazione\)/);
  assert.match(app, /vecchiaNavigazione\.dataset\.rotta !== rottaMenu/);
  assert.match(css, /body > #navigazione-principale\s*\{position:fixed/);
  assert.match(css, /#navigazione-principale \.menu-basso\s*\{[\s\S]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test('v514: la pagina confronta mostra un duello leggibile e filtra senza rifare i calcoli', () => {
  for (const classe of ['confronto-duello', 'confronto-punteggi', 'confronto-filtri', 'confronto-colonne', 'confronto-allenamenti']) {
    assert.ok(paginaAmico.includes(classe), `manca ${classe}`);
    assert.ok(css.includes(`.${classe}`), `manca lo stile di ${classe}`);
  }
  for (const opzione of ["['tutti', 'Tutti']", "['mio', 'Punti miei']", "['suo', 'Punti suoi']", "['pareggio', 'Pari']", "['non_confrontabile', 'Da completare']"]) {
    assert.ok(paginaAmico.includes(opzione), `manca il filtro ${opzione}`);
  }
  assert.match(paginaAmico, /scheda\.hidden = !mostra/);
  assert.match(css, /\.confronto-esercizio\[hidden\]\s*\{display:none;/);
  assert.ok(paginaAmico.indexOf('privacyDi(amico).performance') < paginaAmico.indexOf('confronta('),
    'i controlli della privacy devono precedere ogni record');
});

test('v517: record assenti non diventano vittorie e le varianti restano separate', () => {
  const esercizio = (id, nome) => ({ id, nome });
  const mio = [{ esercizio: esercizio('lat-neutra', 'Lat neutra'), valido: true, punteggio: 400, testo: '75 kg × 8' }];
  const suo = [
    { esercizio: esercizio('lat-neutra', 'Lat neutra'), valido: true, punteggio: 350, testo: '70 kg × 8' },
    { esercizio: esercizio('lat-larga', 'Lat larga'), valido: true, punteggio: 410, testo: '65 kg × 10' },
  ];
  const risultato = confronta({}, {}, mio, suo);
  assert.equal(risultato.vinti, 1);
  assert.equal(risultato.persi, 0);
  assert.equal(risultato.nonConfrontabili, 1);
  assert.equal(risultato.righe.length, 2);
  assert.equal(risultato.righe.find((r) => r.esercizio_id === 'lat-larga').mio, null);
  assert.match(paginaAmico, /r\.mio \? r\.mio\.testo : 'Nessun record'/);
});
