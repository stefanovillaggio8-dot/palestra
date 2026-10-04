// confronto-mensile.test.js -- "un mese fa su questo esercizio come stavo?"
//
// Ste (04/10/2026): "ogni mese fai il confronto appena finisci l'esercizio di
// tutte le serie con gli stessi esercizi di un mese prima, fai questa cosa per
// giorno 1 giorno 2 giorno 3 e giorno 4".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { confrontoGiorno, confrontiMensili, GIORNI_UN_MESE } from '../src/confronto-mensile.js';

const chest = { id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'macchina' };
const curl = { id: 'ex-cable-hammer-curl', nome: 'Cable Hammer Curl', convenzione: 'cavo_totali' };

const seduta = (id, data, giornoId) => ({
  id, data, giorno_id: giornoId, stato: 'completata', eliminata: false, nome_giorno: 'Giorno 1',
});

const serie = (id, seduta_id, esercizio_id, peso, rip) => ({
  id, seduta_id, esercizio_id, peso, ripetizioni: rip, stato: 'fatta', ordine: 1, spotter: false,
});

test('M1. senza un mese fa non c\'e\' nessun confronto', () => {
  const ieri = '2026-10-03';
  const risultato = confrontoGiorno({
    seduta: seduta('s1', ieri, 'giorno-1'),
    serie: [serie('x1', 's1', chest.id, 40, 8)],
    esercizi: [chest, curl],
    sedute: [seduta('s1', ieri, 'giorno-1')],
    peso: 66,
  });
  assert.equal(risultato, null, 'con una seduta sola non c\'e\' niente da confrontare');
});

test('M2. senza le serie di un mese fa non c\'e\' niente da confrontare', () => {
  const oggi = '2026-10-04';
  const risultato = confrontoGiorno({
    seduta: seduta('s2', oggi, 'giorno-1'),
    serie: [serie('n1', 's2', chest.id, 45, 8)],
    esercizi: [chest, curl],
    sedute: [seduta('s2', oggi, 'giorno-1')],
    peso: 66,
  });
  assert.equal(risultato, null, 'senza il mese fa non si inventa un confronto');
});

test('M3. il confronto vero: dice quanto hai guadagnato, per ogni esercizio', () => {
  const oggi = '2026-10-04';
  const meseFa = '2026-09-04';
  const serieTutte = [
    serie('n1', 's2', chest.id, 45, 8),
    serie('n2', 's2', curl.id, 32, 10),
    serie('v1', 's1', chest.id, 35, 8),
    serie('v2', 's1', curl.id, 28, 8),
  ];
  const risultato = confrontoGiorno({
    seduta: seduta('s2', oggi, 'giorno-1'),
    serie: serieTutte,
    esercizi: [chest, curl],
    sedute: [seduta('s2', oggi, 'giorno-1'), seduta('s1', meseFa, 'giorno-1')],
    peso: 66,
    oggi,
  });

  assert.ok(risultato, 'il confronto deve esistere');
  assert.equal(risultato.righe.length, 2, 'un esercizio per riga');
  assert.equal(risultato.quanteMeglio, 2, 'sono due le cose in cui stai meglio');
  assert.match(risultato.frase, /meglio/, 'e la frase lo dice');

  for (const r of risultato.righe) {
    assert.ok(r.ora.testo && r.prima.testo, 'ogni riga mostra prima e adesso');
    assert.ok(r.meglio, r.nome + ' deve essere migliore');
    assert.ok(r.differenza > 0, 'e la differenza e\' positiva');
    // e i due lati non vengono mescolati fra esercizi diversi
    assert.ok(r.prima.punteggio < r.ora.punteggio, 'il punteggio di allora e\' minore');
  }
});

test('M4. vale per tutti e quattro i giorni della scheda', () => {
  const giorni = ['giorno-1', 'giorno-2', 'giorno-3', 'giorno-4'];
  const sedute = [];
  const serieTutte = [];
  for (let i = 0; i < giorni.length; i++) {
    // la seduta di un mese fa e quella di oggi, per ogni giorno
    sedute.push(seduta(`vecchio-${i}`, '2026-09-04', giorni[i]));
    sedute.push(seduta(`oggi-${i}`, '2026-10-04', giorni[i]));
    serieTutte.push(serie(`v-${i}`, `vecchio-${i}`, chest.id, 35, 8));
    serieTutte.push(serie(`n-${i}`, `oggi-${i}`, chest.id, 45, 8));
  }
  const risultati = confrontiMensili({
    sedute, serie: serieTutte, esercizi: [chest], oggi: '2026-10-04', peso: 66,
  });
  assert.equal(risultati.length, 4, 'devono esserci i confronti di tutti e quattro i giorni');
  for (const c of risultati) {
    assert.equal(c.righe.length, 1, 'ogni giorno confronta il suo esercizio');
    assert.equal(c.righe[0].meglio, true, c.nome_giorno + ': stai meglio');
  }
});

test('M5. se un mese fa non avevi quell\'esercizio, non inventa il confronto', () => {
  const risultato = confrontoGiorno({
    seduta: seduta('s2', '2026-10-04', 'giorno-1'),
    serie: [serie('n1', 's2', curl.id, 25, 10), serie('v1', 's1', chest.id, 35, 8)],
    esercizi: [chest, curl],
    sedute: [seduta('s2', '2026-10-04', 'giorno-1'), seduta('s1', '2026-09-04', 'giorno-1')],
    peso: 66,
    oggi: '2026-10-04',
  });
  // il curl non c'era un mese fa: non deve comparire in nessun modo
  assert.ok(!risultato || risultato.righe.every((r) => r.esercizio_id !== curl.id),
    'niente dati inventati per un esercizio che non avevi fatto');
});

test('M6. le serie col solo spotter non contano nel confronto', () => {
  const serieSpotter = { ...serie('v1', 's1', chest.id, 100, 20), spotter: true };
  const risultato = confrontoGiorno({
    seduta: seduta('s2', '2026-10-04', 'giorno-1'),
    serie: [serie('n1', 's2', chest.id, 45, 8), serieSpotter],
    esercizi: [chest],
    sedute: [seduta('s2', '2026-10-04', 'giorno-1'), seduta('s1', '2026-09-04', 'giorno-1')],
    peso: 66,
    oggi: '2026-10-04',
  });
  // un mese fa c'era solo una serie col solo spotter: non e' un record pulito
  assert.equal(risultato, null, 'senza un record pulito di un mese fa non si confronta');
});

test('M7. un mese fa quanto? trenta giorni', () => {
  assert.equal(GIORNI_UN_MESE, 30);
  // 29 giorni non bastano, 30 sì
  const troppoPresto = confrontoGiorno({
    seduta: seduta('s2', '2026-10-04', 'giorno-1'),
    serie: [serie('n1', 's2', chest.id, 45, 8), serie('v1', 's1', chest.id, 35, 8)],
    esercizi: [chest],
    sedute: [seduta('s2', '2026-10-04', 'giorno-1'), seduta('s1', '2026-09-05', 'giorno-1')],
    peso: 66,
  });
  assert.equal(troppoPresto, null, '29 giorni non sono un mese');
});