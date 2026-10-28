import { test } from 'node:test';
import assert from 'node:assert/strict';
import { medaglie } from '../src/aura.js';
test('una banda vuota nella distribuzione non assegna una medaglia', () => {
  const risultati = medaglie({rank:{bronze:1,silver:0,gold:0,platinum:0,diamond:0,titan:0,olympian:0}});
  for (const m of risultati.filter(m => m.campo.startsWith('rank_'))) {
    assert.equal(m.ottenuta,m.campo === 'rank_bronze',m.id);
  }
});
