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

test('il backup ridotto tiene SOLO i dati della mia scheda (Ste, 18/10/2026)', async () => {
  // Ste: "comunque io non voglio nel mio account anche quello di Andrea".
  //
  // Nell'app i dati sono gia' separati (47 sedute sue e 1 di Andrea nel suo backup del
  // 18/10/2026), ma il BACKUP COMPLETO esporta tutto il database. E un backup ridotto
  // serve a un altro scopo: se il file e' per MOSTRARE i tuoi dati a qualcuno, dentro
  // non ci deve finire l'allenamento dell'altro.
  const { soloMiaScheda } = await import('../src/backup.js');

  const database = {
    esercizi: [{ id: 'ex-1', nome: 'Chest Press' }, { id: 'ex-2', nome: 'Dips' }],
    schede: [
      { id: 'sc-mia', account_id: 'account-1' },
      { id: 'sc-sua', account_id: 'account-2' },
    ],
    versioni: [
      { id: 'v-mia-1', scheda_id: 'sc-mia' },
      { id: 'v-mia-2', scheda_id: 'sc-mia' },
      { id: 'v-sua-1', scheda_id: 'sc-sua' },
    ],
    sedute: [
      { id: 'se-1', versione_id: 'v-mia-1' },
      { id: 'se-2', versione_id: 'v-mia-2' },
      { id: 'se-3', versione_id: 'v-sua-1' },
    ],
    serie: [
      { id: 'a1', seduta_id: 'se-1', esercizio_id: 'ex-1', peso: 40 },
      { id: 'a2', seduta_id: 'se-2', esercizio_id: 'ex-2', peso: 35 },
      { id: 'b1', seduta_id: 'se-3', esercizio_id: 'ex-1', peso: 20 },
    ],
    profili: [{ id: 'account-1', username: 'Stefano' }, { id: 'account-2', username: 'Andrea' }],
    pesi: [
      { account_id: 'account-1', kg: 66 },
      { account_id: 'account-2', kg: 70 },
    ],
    missioni: [], ricompense: [], note: [], conflitti: [], appreso: [],
  };

  const mio = soloMiaScheda(database, 'sc-mia');
  assert.deepEqual(mio.schede.map((s) => s.id), ['sc-mia'], 'la sola scheda di Ste');
  assert.deepEqual(mio.versioni.map((v) => v.id), ['v-mia-1', 'v-mia-2'], 'e le sue versioni');
  assert.deepEqual(mio.sedute.map((s) => s.id), ['se-1', 'se-2'], 'e le sue sedute, non quella di Andrea');
  assert.deepEqual(mio.serie.map((s) => s.id), ['a1', 'a2'], 'e le sue serie: dentro NON c\'e\' b1');
  assert.equal(mio.serie.some((s) => s.id === 'b1'), false,
    'la serie dell\'altra persona non deve essere nel file');
  assert.deepEqual(mio.profili.map((p) => p.username), ['Stefano']);
  assert.deepEqual(mio.pesi.map((p) => p.kg), [66], 'e il peso corporeo solo il suo');
  // gli esercizi del catalogo sono di tutti e non sono dati di nessuno: restano
  assert.equal(mio.esercizi.length, 2, 'il catalogo degli esercizi resta: e\' la scheda, non i dati');

  // e senza scheda non si taglia niente: meglio un backup troppo grande che uno rotto
  assert.equal(soloMiaScheda(database, null), database);
});
