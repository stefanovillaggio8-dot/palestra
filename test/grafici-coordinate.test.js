import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montaDom, trova } from './dom-minimo.js';
import { graficoLinea, graficoBarre } from '../src/grafici.js';
montaDom();

test('asse X indipendente dai carichi e punto singolo centrato', () => {
  for (const base of [0, 30, 10000, -100]) {
    const grafico = graficoLinea([{ v: base, etichetta: '01/10' }, { v: base + 2, etichetta: '20/10' }], { chiaveY: 'v', titoloY: 'kg' });
    const linea = trova(grafico, n => String(n.tagName).toLowerCase() === 'polyline')[0];
    assert.deepEqual(linea.getAttribute('points').split(' ').map(p => Number(p.split(',')[0])), [46, 594]);
  }
  const singolo = graficoLinea([{ v: 40 }], { chiaveY: 'v', titoloY: 'kg' });
  const punto = trova(singolo, n => String(n.tagName).toLowerCase() === 'circle')[0];
  assert.equal(Number(punto.getAttribute('cx')), 320);
  assert.match(punto.getAttribute('aria-label'), /40 kg/);
});

test('barre proporzionali da zero anche quando tutti i valori sono alti', () => {
  const g = graficoBarre([{v:100},{v:200}], {chiaveY:'v',titoloY:'kg'});
  const barre = trova(g,n => n.tagName === 'RECT');
  assert.ok(Math.abs(Number(barre[1].getAttribute('height')) / Number(barre[0].getAttribute('height')) - 2) < 0.001);
});
