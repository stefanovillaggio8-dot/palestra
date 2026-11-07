import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rankDaScore } from '../src/rank-v2/scalata.js';

const dashboard = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const script = dashboard.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1] || '';
const definition = script.match(/function titleRank\(r\)\{[\s\S]*?\n\}/)?.[0];
const formatRank = new Function(definition + '\nreturn titleRank;')();

test('rank effettivo con oggetti rank e divisione: mostra etichetta e non object Object', () => {
  const r = rankDaScore(45, [10,20,30,40,50,60,70]);
  assert.equal(r.rank.nome, 'PLATINUM');
  assert.equal(r.divisione.nome, 'II');
  assert.equal(formatRank({ valido:true, ...r }), 'PLATINUM II');
});

test('Olympian non deve mostrare divisioni o oggetti JavaScript', () => {
  const r = rankDaScore(75, [10,20,30,40,50,60,70]);
  assert.equal(formatRank({ valido:true, ...r }), 'OLYMPIAN');
});

test('sotto la prima soglia e prestazione non valutabile sono distinti', () => {
  const r = rankDaScore(2, [10,20,30,40,50,60,70]);
  assert.equal(formatRank({ valido:true, ...r }), 'Sotto BRONZE');
  assert.equal(formatRank({ valido:false, rank:null }), 'Non valutato');
});

test('il formato resta compatibile con vecchi risultati stringa', () => {
  assert.equal(formatRank({ valido:true, rank:'DIAMOND', divisione:'III' }), 'DIAMOND III');
});

test('la dashboard non stampa oggetti anonimi come object Object', () => {
  const def = script.match(/function readable\(value\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(def);
  const readable = new Function(def+'\nreturn readable;')();
  assert.equal(readable({nome:'GOLD'}), 'GOLD');
  assert.equal(readable({nome:'TITAN',id:'titan'}), 'TITAN');
  assert.equal(readable({nested:{bad:true}}), '—');
  assert.equal(readable([{nome:'I'},{nome:'II'}]), 'I, II');
  assert.ok(!readable({nested:{bad:true}}).includes('[object Object]'));
});
