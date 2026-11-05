import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ESERCIZI, GIORNI } from '../src/dati-iniziali.js';
import { movimentoDi, valutaPrestazione } from '../src/rank-v3/valutazione.js';
import { standardPerMovimento, configEsercizio } from '../src/rank-v3/modello.js';
import { recordEsercizio } from '../src/rank.js';

const cad = ESERCIZI.find(e => e.id === 'ex-scott-bench-curl');
const preacher = ESERCIZI.find(e => e.id === 'ex-one-arm-preacher-curl');
const ez = ESERCIZI.find(e => e.id === 'ex-ez-bar-preacher-curl');
const record = (kg, rep) => recordEsercizio([
  { id:'s1', seduta_id:'fatta', esercizio_id:cad.id, stato:'fatta',
    peso:kg, ripetizioni:rep, ordine:1, spotter:false },
], cad, null, 66);

test('v430: esercizio chiamato CAD Curl, ID invariato e nota esecuzione esatta', () => {
  assert.ok(cad);
  assert.equal(cad.nome, 'CAD Curl');
  assert.equal(cad.convenzione, 'per_manubrio');
  assert.equal(cad.usoBraccia, 'due_braccia');
  assert.match(cad.nota_permanente, /AL CONTRARIO/);
  assert.match(cad.nota_permanente, /gomiti sul cuscinetto/);
  assert.match(cad.nota_permanente, /busto leggermente indietro/);
  assert.match(cad.nota_permanente, /UN manubrio/);
  assert.ok(GIORNI.some(g => g.esercizi?.some(e => e.esercizio_id === cad.id)),
    'lo storico e la scheda devono continuare a riferirsi allo stesso esercizio');
});

test('v430: la foto scelta è un JPEG valido realmente incluso nella cache offline', () => {
  assert.equal(cad.foto, 'img/esercizi/cad-curl-app.jpg');
  const file = new URL('../' + cad.foto, import.meta.url);
  assert.ok(existsSync(file));
  const bytes = readFileSync(file);
  assert.ok(bytes.length > 3000, 'foto troppo piccola o vuota');
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  assert.equal(bytes[bytes.length-2], 0xff);
  assert.equal(bytes[bytes.length-1], 0xd9);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("'./img/esercizi/cad-curl-app.jpg'"));
});

test('v430: CAD Curl usa una propria scala stimata distinta da preacher monobraccio', () => {
  assert.equal(movimentoDi(cad).movimento, 'bicipiti_panca');
  const standard = standardPerMovimento('bicipiti_panca', cad);
  assert.ok(Math.abs(standard.ingresso - 8 * 0.85 / 75) < 1e-8);
  assert.ok(Math.abs(standard.vertice - 41 * 0.85 / 75) < 1e-8);
  assert.equal(standard.fonte, 'modello_tecnica_cad_curl');
  assert.equal(standard.affidabilitaBase, 'bassa');
  assert.equal(standard.soglie1RMPerPeso.length, 3);
  assert.match(standard.nota, /CAD Curl/);
  assert.match(standard.nota, /panca Scott al contrario/);
  assert.match(standard.limite, /non uno standard misurato/);
  assert.equal(standardPerMovimento('bicipiti_panca', preacher).fonte, 'strengthlevel_esercizio');
  assert.equal(standardPerMovimento('bicipiti_panca', ez).vertice, 0.85);
  assert.equal(configEsercizio({esercizio:cad,movimento:'bicipiti_panca'}).caricamento,'manubri');
});

test('v430: anche il vecchio nome locale mantiene il nuovo standard grazie all’ID', () => {
  const legacy = { ...cad, nome: 'Scott Bench Curl seduto al contrario' };
  assert.ok(Math.abs(standardPerMovimento('bicipiti_panca',legacy).vertice
    - 41 * 0.85 / 75) < 1e-8);
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /async function aggiornaCadCurlSalvato\(\)/);
  assert.match(app, /await aggiornaCadCurlSalvato\(\)/);
  assert.match(app, /db\.salva\('esercizi', \{ \.\.\.locale, \.\.\.novita \}\)/);
});

test('v430: serie migliori e ripetizioni contano senza trasformarle in massimali', () => {
  const leggero = record(14,8), pesante = record(20,8), piuRep = record(20,10);
  assert.ok(leggero.valido && pesante.valido && piuRep.valido);
  assert.ok(pesante.punteggio > leggero.punteggio);
  assert.ok(piuRep.punteggio > pesante.punteggio);
  assert.equal(pesante.motore,'nuovo');
  const s = [
    {id:'a',esercizio_id:cad.id,stato:'fatta',peso:16,ripetizioni:8},
    {id:'b',esercizio_id:cad.id,stato:'fatta',peso:20,ripetizioni:8},
  ];
  const valutato = valutaPrestazione({esercizio:cad,serie:s,pesoCorporeo:66});
  assert.equal(valutato.valido,true);
  assert.equal(valutato.serieId,'b');
  assert.equal(valutato.massimale,null);
});

test('v430: non si duplicano esercizi e il vecchio gruppo non viene riutilizzato', () => {
  assert.equal(ESERCIZI.filter(e => e.id === cad.id).length, 1);
  assert.ok(!ESERCIZI.some(e => /Scott Bench Curl seduto al contrario/i.test(e.nome)));
});
