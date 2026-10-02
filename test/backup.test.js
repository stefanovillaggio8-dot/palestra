import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  creaPacchetto, validaPacchetto, unisci, riepilogo,
  csvSerie, csvSedute, csvEsercizi, FORMATO, VERSIONE_SCHEMA,
} from '../src/backup.js';

const esercizi = [
  { id: 'ex-chest-press', nome: 'Chest Press', gruppo: 'Chest Press', convenzione: 'macchina', foto: 'img/esercizi/chest-press.png' },
  { id: 'ex-pull-ups', nome: 'Pull Ups', gruppo: 'Pull Ups', convenzione: 'assistenza', foto: 'img/esercizi/pull-ups.png' },
];
const sedute = [
  { id: 's1', data: '2026-10-01', ora_inizio: '2026-10-01T18:00:00Z', ora_fine: '2026-10-01T19:12:00Z', durata_secondi: 4320, stato: 'completata' },
  { id: 's2', data: '2026-10-03', ora_inizio: '2026-10-03T10:00:00Z', ora_fine: '2026-10-03T11:00:00Z', durata_secondi: 3600, stato: 'completata' },
];
const serie = [
  { id: 'r1', seduta_id: 's1', esercizio_id: 'ex-chest-press', ordine: 1, peso: 35, ripetizioni: 8, spotter: false, peso_assistenza: null, nota: '' },
  { id: 'r2', seduta_id: 's1', esercizio_id: 'ex-chest-press', ordine: 2, peso: 35, ripetizioni: 7.5, spotter: true, rip_assistite: 2, peso_assistenza: null, nota: 'ultima serie' },
  { id: 'r3', seduta_id: 's2', esercizio_id: 'ex-pull-ups', ordine: 1, peso: null, ripetizioni: 7, spotter: false, peso_assistenza: 15, nota: '' },
];

const dati = { esercizi, schede: [{ id: 'p1', nome: 'gym 3' }], versioni: [{ id: 'v1', scheda_id: 'p1', numero: 1, snapshot: {} }], sedute, serie, note: [{ id: 'n1', livello: 'esercizio', esercizio_id: 'ex-chest-press', testo: 'spalle basse' }], conflitti: [] };

test('25. il JSON contiene tutto quello che serve per un ripristino completo', () => {
  const p = creaPacchetto(dati);
  assert.equal(p.formato, FORMATO);
  assert.equal(p.versione_schema, VERSIONE_SCHEMA);
  for (const k of ['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note']) {
    assert.ok(Array.isArray(p.tabelle[k]), `manca ${k}`);
  }
  assert.equal(p.tabelle.serie.length, 3);
  assert.equal(p.tabelle.serie[1].ripetizioni, 7.5, 'i decimali sopravvivono all\'esportazione');
  assert.equal(p.tabelle.serie[1].rip_assistite, 2);
  assert.equal(p.tabelle.sedute[0].durata_secondi, 4320, 'la durata e\' nel backup');
  assert.equal(p.tabelle.versioni.length, 1, 'le versioni della scheda sono nel backup');
});

test('26. un backup valido supera la validazione e mostra l\'anteprima', () => {
  const p = creaPacchetto(dati);
  const r = validaPacchetto(JSON.parse(JSON.stringify(p)));
  assert.equal(r.valido, true);
  assert.equal(r.problemi.length, 0);
  assert.equal(r.anteprima.esercizi, 2);
  assert.equal(r.anteprima.sedute, 2);
  assert.equal(r.anteprima.serie, 3);
  assert.equal(r.anteprima.note, 1);
  assert.equal(r.anteprima.primaData, '2026-10-01');
  assert.equal(r.anteprima.ultimaData, '2026-10-03');
});

test('26b. un file non conforme viene rifiutato con motivi chiari', () => {
  assert.equal(validaPacchetto({}).valido, false);
  const r1 = validaPacchetto({ formato: 'altro', versione_schema: 1, tabelle: {} });
  assert.equal(r1.valido, false);
  assert.match(r1.problemi.join(' '), /non e' un backup dell'app palestra/);
  const r2 = validaPacchetto({ formato: FORMATO, versione_schema: 99, tabelle: { esercizi: [], schede: [], versioni: [], sedute: [], serie: [], note: [] } });
  assert.equal(r2.valido, false);
  assert.match(r2.problemi.join(' '), /versione piu' nuova/);
  const r3 = validaPacchetto({ formato: FORMATO, versione_schema: 1, tabelle: { esercizi: [], schede: [], versioni: [], sedute: [], serie: [{ id: 'x', ripetizioni: 'sette' }], note: [] } });
  assert.equal(r3.valido, false);
  assert.match(r3.problemi.join(' '), /ripetizioni non numeriche/);
  const r4 = validaPacchetto({ formato: FORMATO, versione_schema: 1, tabelle: { esercizi: [], schede: [], versioni: [], sedute: [], serie: [{ ripetizioni: 8 }], note: [] } });
  assert.match(r4.problemi.join(' '), /serie senza un id valido/);
});

test('26c. unione: aggiunge cio\' che manca e NON tocca il resto', () => {
  const attuale = [{ id: 'r1', peso: 35, rev: 5, sync: 'pulito' }];
  const importato = [
    { id: 'r1', peso: 99, rev: 2 },
    { id: 'r2', peso: 40, rev: 1 },
  ];
  const r = unisci(attuale, importato, 'serie');
  assert.equal(r.righe.length, 2);
  assert.equal(r.aggiunte, 1);
  assert.equal(r.lasciate, 1);
  const r1 = r.righe.find((x) => x.id === 'r1');
  assert.equal(r1.peso, 35, 'la riga locale piu\' recente vince e non viene schiacciata');
});

test('26d. unione: una versione piu\' recente nel backup aggiorna quella locale', () => {
  const attuale = [{ id: 'r1', peso: 35, rev: 2, sync: 'pulito' }];
  const r = unisci(attuale, [{ id: 'r1', peso: 40, rev: 7 }], 'serie');
  assert.equal(r.aggiornate, 1);
  assert.equal(r.righe[0].peso, 40);
  assert.equal(r.righe[0].sync, 'da_salvare');
});

test('27. il CSV delle serie contiene spotter, assistite, decimali e note', () => {
  const csv = csvSerie(serie, esercizi, sedute);
  const righe = csv.split('\r\n');
  assert.equal(righe[0].split(';')[0], 'data');
  assert.match(csv, /Chest Press/);
  assert.match(csv, /7,5/);
  const r2 = righe[2].split(';');
  assert.equal(r2[10], 'si', 'spotter = si');
  assert.equal(r2[11], '2', 'ripetizioni assistite');
  const r3 = righe[3].split(';');
  assert.equal(r3[9], '15', 'kg di assistenza');
  assert.equal(r3[10], 'no');
  assert.equal(r3[11], 'non specificato');
  assert.match(csv, /ultima serie/);
assert.equal(r2[15], 'ultima serie', 'la nota della serie e\' nel CSV');
assert.equal(r2[12], '', 'nessun dropset');
});

test('27b. il CSV mette fra virgolette i valori con separatori', () => {
  const csv = csvEsercizi([{ id: 'x', nome: 'Curl, variante "A"', convenzione: 'altro' }]);
  assert.match(csv, /"Curl, variante ""A"""/);
});

test('27c. il CSV delle sedute riporta la durata', () => {
  const csv = csvSedute(sedute);
  const righe = csv.split('\r\n');
  assert.equal(righe.length, 3);
  assert.ok(righe[1].includes('4320'));
  assert.ok(righe[2].includes('3600'));
});

test('riepilogo conta anche le sedute completate', () => {
  const r = riepilogo({ esercizi: [], schede: [], versioni: [], sedute, serie: [], note: [] });
  assert.equal(r.sedute, 2);
  assert.equal(r.seduteCompletate, 2);
});
