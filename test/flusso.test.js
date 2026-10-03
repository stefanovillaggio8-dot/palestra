import { test } from 'node:test';
import assert from 'node:assert/strict';

// Qui si prova il ciclo completo di una seduta sul motore di salvataggio vero.
// Node non ha IndexedDB, quindi parte il motore "memoria del browser": e' lo
// stesso codice che gira se il browser blocca IndexedDB, e mi fa vedere se i
// dati entrano davvero nel database con i valori giusti.

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};

const db = await import('../src/db.js');
const { ESERCIZI, GIORNI, SCHEDA_ID, costruisciSnapshot } = await import('../src/dati-iniziali.js');
const { nuovoId } = await import('../src/sincronizzazione.js');
const { analizzaDecimale, formattaNumero, convenzioneMisuraCarico } = await import('../src/numeri.js');

async function semina() {
  for (const e of ESERCIZI) await db.salva('esercizi', e, { segna: false });
  await db.salva('schede', { id: SCHEDA_ID, nome: 'gym 3', versione_corrente: 'ver-1' }, { segna: false });
  await db.salva('versioni', { id: 'ver-1', scheda_id: SCHEDA_ID, numero: 1, snapshot: costruisciSnapshot() }, { segna: false });
}

test('il motore di salvataggio parte e scrive davvero', async () => {
  await db.apriDb();
  assert.notEqual(db.MOTORE_SCELTO.tipo, 'non-aperto');
  await db.salva('meta-prova', { id: 'x', valore: 1 }, { segna: false }).catch(() => { /* tabella inesistente: va bene, la prova e\' su quella giusta */ });
  await db.scriviMeta('prova', 'va bene');
  assert.equal(await db.leggiMeta('prova'), 'va bene');
});

test('la scheda viene seminata per intero', async () => {
  await semina();
  assert.equal((await db.tutti('esercizi')).length, 27);
  assert.equal((await db.tutti('schede')).length, 1);
  assert.equal((await db.tutti('versioni')).length, 1);
  const v = (await db.tutti('versioni'))[0];
  assert.equal(v.numero, 1);
  assert.equal(v.snapshot.giorni.length, 4);
});

test('9/11. inizio allenamento, cronometro, fine allenamento con durata', async () => {
  const ora = new Date('2026-10-02T18:00:00Z');
  const seduta = await db.salva('sedute', {
    id: nuovoId(), scheda_id: SCHEDA_ID, versione_id: 'ver-1', giorno_id: 'giorno-1',
    nome_giorno: 'giorno 1', data: '2026-10-02',
    ora_inizio: ora.toISOString(), ora_fine: null, durata_secondi: null, stato: 'in_corso', note: '',
  });
  assert.equal(seduta.stato, 'in_corso');
  assert.equal(seduta.durata_secondi, null);

  // ripresa dopo chiusura e riapertura dell'app: l'orario di inizio basta
  const riletta = await db.prendi('sedute', seduta.id);
  const secondi = Math.floor((new Date('2026-10-02T19:12:30Z') - new Date(riletta.ora_inizio)) / 1000);
  assert.equal(secondi, 4350, '1h 12m 30s calcolato dall\'orario di inizio');

  await db.salva('sedute', {
    ...riletta,
    ora_fine: new Date('2026-10-02T19:12:30Z').toISOString(),
    durata_secondi: secondi,
    stato: 'completata',
  });
  const chiusa = await db.prendi('sedute', seduta.id);
  assert.equal(chiusa.stato, 'completata');
  assert.equal(chiusa.durata_secondi, 4350);
});

test('una sola seduta attiva per volta', async () => {
  const gia = await db.sedutaInCorso();
  assert.equal(gia, null, 'la seduta precedente e\' stata chiusa');
  const s1 = await db.salva('sedute', {
    id: nuovoId(), scheda_id: SCHEDA_ID, versione_id: 'ver-1', giorno_id: 'giorno-2',
    nome_giorno: 'giorno 2', data: '2026-10-04', ora_inizio: new Date().toISOString(), stato: 'in_corso',
  });
  assert.ok((await db.sedutaInCorso()).id === s1.id);
});

test('1/2. 7,5 e 7.5 finiscono nel database come 7.5', async () => {
  const seduta = await db.sedutaInCorso();
  const perChiave = (testo) => {
    const n = analizzaDecimale(testo);
    return Number(String(n).replace(',', '.'));
  };
  const s1 = await db.salva('serie', {
    id: nuovoId(), seduta_id: seduta.id, esercizio_id: 'ex-chest-press', ordine: 1,
    peso: perChiave('35,5'), ripetizioni: perChiave('7,5'), spotter: false, rip_assistite: null,
  });
  const s2 = await db.salva('serie', {
    id: nuovoId(), seduta_id: seduta.id, esercizio_id: 'ex-chest-press', ordine: 2,
    peso: perChiave('35.5'), ripetizioni: perChiave('7.5'), spotter: false, rip_assistite: null,
  });
  assert.equal(s1.peso, 35.5);
  assert.equal(s1.ripetizioni, 7.5);
  assert.equal(s2.ripetizioni, 7.5);
  assert.equal(s2.peso, 35.5);
  const rilevate = (await db.perIndice('serie', 'seduta_id', seduta.id)).filter((x) => x.esercizio_id === 'ex-chest-press');
  assert.equal(rilevate.length, 2);
  assert.equal(formattaNumero(rilevate[0].ripetizioni), '7,5');
});

test('3/4/5/6. spotter, assistite, assistite non specificate, decimali + spotter', async () => {
  const seduta = await db.sedutaInCorso();
  const conAss = await db.salva('serie', {
    id: nuovoId(), seduta_id: seduta.id, esercizio_id: 'ex-dumbbell-bench-pull', ordine: 1,
    peso: 45, ripetizioni: 7.5, spotter: true, rip_assistite: 2,
  });
  assert.equal(conAss.spotter, true);
  assert.equal(conAss.rip_assistite, 2);
  assert.equal(conAss.ripetizioni, 7.5, 'le 2 assistite stanno dentro le 7,5, non si sommano');

  const senzaNumero = await db.salva('serie', {
    id: nuovoId(), seduta_id: seduta.id, esercizio_id: 'ex-dumbbell-bench-pull', ordine: 2,
    peso: 45, ripetizioni: 6, spotter: true, rip_assistite: null,
  });
  assert.equal(senzaNumero.spotter, true);
  assert.equal(senzaNumero.rip_assistite, null, 'nessun numero = "non specificato", non zero');

  // rileggendo dal database il "non specificato" resta null
  const riletta = await db.prendi('serie', senzaNumero.id);
  assert.equal(riletta.rip_assistite, null);
});

test('il dropset ha 3 posti in piu\' oltre a peso e ripetizioni', async () => {
  const giri = [{ peso: 20, ripetizioni: 8 }, { peso: 17.5, ripetizioni: 6 }, { peso: 15, ripetizioni: 9 }];
  const s = await db.salva('serie', {
    id: nuovoId(), seduta_id: (await db.sedutaInCorso()).id, esercizio_id: 'ex-wrist-curl', ordine: 1,
    peso: 25, ripetizioni: 6, spotter: false, rip_assistite: null, dropset: true, giri_extra: giri,
  });
  const riletta = await db.prendi('serie', s.id);
  assert.equal(riletta.dropset, true);
  assert.equal(riletta.giri_extra.length, 3);
  assert.equal(riletta.giri_extra[1].peso, 17.5, 'i decimali nel dropset sopravvivono');
});

test('7. le note si salvano e si rileggono', async () => {
  const seduta = await db.sedutaInCorso();
  const notaEsercizio = await db.salva('note', {
    id: 'nota-' + seduta.id + '-ex-chest-press', livello: 'esercizio_seduta',
    esercizio_id: 'ex-chest-press', seduta_id: seduta.id, testo: 'oggi il cavo era diverso',
  });
  const riletta = await db.prendi('note', notaEsercizio.id);
  assert.equal(riletta.testo, 'oggi il cavo era diverso');
  // riapertura: stessa nota, stesso testo
  const perEsercizio = await db.perIndice('note', 'esercizio_id', 'ex-chest-press');
  assert.equal(perEsercizio.length, 1);

  // nota permanente: resta sull'esercizi e non tocca lo storico
  const prima = (await db.prendi('esercizi', 'ex-chest-press')).nota_permanente;
  await db.salva('esercizi', { ...(await db.prendi('esercizi', 'ex-chest-press')), nota_permanente: 'spalle piu\' basse' });
  const dopo = await db.prendi('esercizi', 'ex-chest-press');
  assert.equal(dopo.nota_permanente, 'spalle piu\' basse');
  const noteVecchie = await db.perIndice('note', 'esercizio_id', 'ex-chest-press');
  assert.equal(noteVecchie[0].testo, 'oggi il cavo era diverso', 'le note passate non cambiano');
});

test('19/20. modificare la scheda crea una versione nuova e non tocca le sedute', async () => {
  const sedutaPrima = await db.sedutaInCorso();
  const versionePrima = await db.prendi('versioni', 'ver-1');
  const eserciziPrima = versionePrima.snapshot.giorni[0].esercizi.length;

  // come fa Ste: cambio l'ordine con le frecce e salvo
  const bozza = JSON.parse(JSON.stringify(versionePrima.snapshot));
  const primo = bozza.giorni[0].esercizi[0];
  bozza.giorni[0].esercizi.splice(0, 1);
  bozza.giorni[0].esercizi.push(primo);
  const nuovoIdVer = 'ver-2';
  await db.salva('versioni', { id: nuovoIdVer, scheda_id: SCHEDA_ID, numero: 2, snapshot: bozza, nota: 'Ordine cambiato' });
  await db.salva('schede', { ...(await db.prendi('schede', SCHEDA_ID)), versione_corrente: nuovoIdVer });

  // la versione 1 e' rimasta identica
  const versioneVecchia = await db.prendi('versioni', 'ver-1');
  assert.equal(versioneVecchia.snapshot.giorni[0].esercizi.length, eserciziPrima);
  assert.equal(versioneVecchia.snapshot.giorni[0].esercizi[0].esercizio_id, 'ex-chest-press', 'l\'ordine vecchio non e\' stato toccato');

  // la nuova versione ha l'ordine nuovo
  const versioneNuova = await db.prendi('versioni', 'ver-2');
  assert.equal(versioneNuova.snapshot.giorni[0].esercizi[0].esercizio_id, 'ex-cable-hammer-curl');
  assert.equal(versioneNuova.snapshot.giorni[0].esercizi.at(-1).esercizio_id, 'ex-chest-press');
  assert.equal(versioneNuova.numero, 2);

  // la seduta continua a puntare alla versione 1
  const sedutaDopo = await db.prendi('sedute', sedutaPrima.id);
  assert.equal(sedutaDopo.versione_id, 'ver-1', 'la seduta conserva la versione con cui e\' stata fatta');

  // e le serie registrate non cambiano
  const serie = await db.perIndice('serie', 'seduta_id', sedutaPrima.id);
  assert.ok(serie.length >= 4, 'le serie sono ancora tutte li\'');
});

test('30. la coda di invio contiene quello che ho appena modificato', async () => {
  const coda = await db.codaDiInvio();
  assert.ok(coda.length > 0, 'le modifiche sono in coda per il sync');
  for (const voce of coda) {
    assert.ok(['esercizi', 'schede', 'versioni', 'sedute', 'serie', 'note'].includes(voce.tabella));
    assert.ok(voce.riga.sync === 'da_salvare');
  }
  // e una volta "spedito" sparisce dalla coda
  const prima = coda.length;
  for (const voce of coda) await db.salva(voce.tabella, { ...voce.riga, sync: 'pulito' }, { segna: false });
  assert.equal((await db.codaDiInvio()).length, 0);
  assert.ok(prima > 0);
});

test('12. nel cestino la riga sparisce dalle liste ma resta recuperabile', async () => {
  const s = await db.salva('serie', {
    id: nuovoId(), seduta_id: 'inesistente', esercizio_id: 'ex-dips', ordine: 1,
    peso: 30, ripetizioni: 5, spotter: false, rip_assistite: null,
  });
  assert.ok((await db.perIndice('serie', 'seduta_id', 'inesistente')).length >= 1);
  await db.cestino('serie', s.id);
  const visibili = (await db.perIndice('serie', 'seduta_id', 'inesistente')).filter((x) => x.esercizio_id === 'ex-dips');
  assert.equal(visibili.length, 0, 'non la vedo piu\' nella lista');
  const nelCestino = (await db.tutti('serie', { includiEliminati: true })).find((x) => x.id === s.id);
  assert.equal(nelCestino.eliminata, true, 'ma c\'e\' ancora e posso recuperarla');
  await db.recupera('serie', s.id);
  const recuperata = (await db.prendi('serie', s.id));
  assert.ok(!recuperata.eliminata);
});

test('gli esercizi assistiti non mettono peso ma assistenza', async () => {
  const snap = costruisciSnapshot();
  const g3 = snap.giorni[2].esercizi.find((e) => e.esercizio_id === 'ex-pull-ups' || e.esercizio_id === 'ex-bodyweight-overhead-tricep');
  for (const s of g3.serie) {
    assert.equal(s.peso, null);
    assert.ok(Number.isFinite(s.peso_assistenza));
  }
  const es = ESERCIZI.find((e) => e.id === 'ex-pull-ups');
  assert.equal(convenzioneMisuraCarico(es.convenzione), false);
});

test('i 4 giorni sono disponibili con tutte le serie previste', async () => {
  for (const g of GIORNI) {
    const totale = g.esercizi.reduce((a, e) => a + e.serie.length, 0);
    assert.ok(totale > 0, g.nome + ' ha serie');
  }
  assert.equal(GIORNI.length, 4);
});