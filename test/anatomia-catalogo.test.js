import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { parteDiMuscolo } from '../src/muscoli-parti.js';
import { zoneAtlante, righeDaAccendere } from '../src/mappa-muscoli.js';
import { ATLANTE_FRONTE, ATLANTE_RETRO } from '../src/anatomia-vettoriale.js';
const ids = [...(ATLANTE_FRONTE + ATLANTE_RETRO).matchAll(/<path\b[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
test('tutte le zone attive del catalogo hanno tracciati originali su entrambi i lati', () => {
  for (const e of ESERCIZI) {
    const r = parteDiMuscolo({nome:e.nome, descrizione:e.nota_permanente || ''});
    assert.ok(r.trovata, e.nome);
    for (const zona of righeDaAccendere(r.parte,r.livelli,r.anatomia).map(r => r.zona)) {
      const tracciati = ids.filter(id => zoneAtlante(id).includes(zona));
      assert.ok(tracciati.some(id => /_r(?:_|$)/.test(id)), e.nome + ': destra ' + zona);
      assert.ok(tracciati.some(id => /_l(?:_|$)/.test(id)), e.nome + ': sinistra ' + zona);
    }
  }
});
test('Bench Pull colora il trapezio medio e inferiore, non il superiore', () => {
  for (const lato of ['r','l']) {
    assert.deepEqual(zoneAtlante('trapezius_middle_' + lato),['dorso_centrale']);
    assert.deepEqual(zoneAtlante('trapezius_lower_' + lato),['dorso_centrale']);
    assert.deepEqual(zoneAtlante('trapezius_upper_' + lato),['dorso_alto']);
  }
});
test('stacchi e pin press conservano i muscoli che assistono il movimento', () => {
  for (const nome of ['Deadlift','Dumbbell Deadlift']) {
    const r = parteDiMuscolo({nome});
    const zone = righeDaAccendere(r.parte,r.livelli,r.anatomia).map(r => r.zona);
    for (const id of ['femorale','glutei','quadricipite','dorso_basso']) assert.ok(zone.includes(id), nome + id);
  }
  for (const nome of ['Bench Pin Press','Shoulder Pin Press']) {
    const r = parteDiMuscolo({nome});
    assert.ok(righeDaAccendere(r.parte,r.livelli,r.anatomia).some(r => r.gruppo === 'tricipite'), nome);
  }
});
