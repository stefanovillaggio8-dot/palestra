import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  decidiPush, dopoInvioRiuscito, segnaDaSalvare, applicaRemote, risolviConflitto,
  costruisciConflitto, attesaRiprovo, contaDaSincronizzare, statoSalvataggio,
  nuovoId, rigaPerInvio, CAMPI_CARICO, riallineaEsercizi,
} from '../src/sincronizzazione.js';

const riga = (over = {}) => ({
  id: 'r1', tabella: 'serie', peso: 45, ripetizioni: 7.5,
  rev: 1, base_rev: 1, updated_at: '2026-10-02T10:00:00.000Z',
  device_id: 'telefono', sync: 'pulito', ...over,
});

test('17. la sincronizzazione e\' idempotente: due righe con lo stesso id non si duplicano', () => {
  const a = riga({ sync: 'da_salvare', rev: 2 });
  const b = riga({ sync: 'da_salvare', rev: 2 });
  const id1 = nuovoId(); const id2 = nuovoId();
  assert.notEqual(id1, id2, 'ogni riga ha un id proprio');
  assert.equal(rigaPerInvio(a).id, 'r1');
  // inviare due volte la stessa riga produce sempre la stessa chiave primaria
  assert.equal(rigaPerInvio(a).id, rigaPerInvio(b).id);
});

test('15. un id generato e\' un UUID valido', () => {
  const id = nuovoId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('campi locali non vengono mai inviati al server', () => {
  const out = rigaPerInvio(riga({ sync: 'da_salvare', ultimo_errore: 'timeout', tentativi: 3 }));
  assert.equal(out.sync, undefined);
  assert.equal(out.ultimo_errore, undefined);
  assert.equal(out.tentativi, undefined);
  assert.equal(out.peso, 45);
});

test('15b. le regole di invio: crea, aggiorna, identico, conflitto', () => {
  assert.equal(decidiPush(riga(), null), 'crea');
  assert.equal(decidiPush(riga({ rev: 2 }), riga({ rev: 1 })), 'aggiorna');
  assert.equal(decidiPush(riga(), riga()), 'identico');
  assert.equal(decidiPush(riga({ rev: 3, base_rev: 1 }), riga({ rev: 2, base_rev: 2 })), 'conflitto');
  assert.equal(decidiPush(null, riga()), 'ignora');
});

test('dopo un invio riuscito la base avanza e la riga e\' pulita', () => {
  const out = dopoInvioRiuscito(riga({ sync: 'da_salvare', rev: 2 }), 2);
  assert.equal(out.sync, 'pulito');
  assert.equal(out.base_rev, 2);
  assert.equal(out.rev, 2);
  assert.equal(out.ultimo_errore, null);
});

test('segnaDaSalvare incrementa la revisione e rimette in coda', () => {
  const out = segnaDaSalvare(riga({ rev: 4, sync: 'pulito' }));
  assert.equal(out.rev, 5);
  assert.equal(out.sync, 'da_salvare');
  assert.notEqual(out.updated_at, riga().updated_at);
});

test('14. una riga remota che arriva mentre la locale e\' in coda e\' un conflitto', () => {
  const locale = riga({ sync: 'da_salvare', rev: 3, base_rev: 1 });
  const remoto = riga({ rev: 2, base_rev: 2, peso: 40, device_id: 'pc' });
  const esito = applicaRemote(locale, remoto);
  assert.equal(esito.azione, 'conflitto');
  assert.equal(esito.riga.peso, 40);
});

test('14b. se la locale non e\' in coda, la remota applica e la riga resta pulita', () => {
  const esito = applicaRemote(riga({ sync: 'pulito', rev: 1 }), riga({ rev: 2, peso: 42, device_id: 'pc' }));
  assert.equal(esito.azione, 'applica');
  assert.equal(esito.riga.peso, 42);
  assert.equal(esito.riga.sync, 'pulito');
  assert.equal(esito.riga.base_rev, 2);
});

test('14c. se la remota e\' piu\' vecchia viene ignorata (nessuna sovrascrittura)', () => {
  const esito = applicaRemote(riga({ sync: 'pulito', rev: 5 }), riga({ rev: 2 }));
  assert.equal(esito.azione, 'ignora');
  assert.equal(esito.riga.peso, 45);
});

test('16. il conflitto conserva entrambe le versioni e la scelta rimette in coda', () => {
  const locale = riga({ rev: 3, base_rev: 1, peso: 45, sync: 'da_salvare' });
  const remoto = riga({ rev: 2, peso: 40, device_id: 'pc' });
  const c = costruisciConflitto('c1', 'serie', locale, remoto);
  assert.equal(c.stato, 'da_scegliere');
  assert.equal(c.locale.peso, 45);
  assert.equal(c.remoto.peso, 40);
  assert.equal(c.locale._etichetta, 'Questo dispositivo');

  const sceltoLocale = risolviConflitto(c, 'locale');
  assert.equal(sceltoLocale.riga.peso, 45);
  assert.equal(sceltoLocale.riga.sync, 'da_salvare');
  assert.equal(sceltoLocale.perso.peso, 40, 'la versione scelta resta conservata nell\'altro record');

  const sceltoRemoto = risolviConflitto(c, 'remoto');
  assert.equal(sceltoRemoto.riga.peso, 40);
  assert.equal(sceltoRemoto.perso.peso, 45);
});

// ---------------------------------------------------------------------------
// I TRE CAMPI CHE DICONO COME SI REGISTRA IL CARICO.
// Ste (06/10/2026): "e' il buco piu' serio di tutti quelli trovati finora,
// perche' perde dati invece di sbagliare un numero".
//
// Cosa era successo: la tabola `esercizi` del database non ha le colonne
// carrucola / attrezzatura / bracciaIndipendenti, e applicaRemote SOSTITUISCE la
// riga locale con quella remota. Quindi i tre campi non venivano ignorati:
// venivano cancellati, e al riavvio non tornavano, perche' il catalogo si semina
// solo quando la tabella e' vuota.
//
// Il conto che faceva: perduta la carrucola, il punteggio del cavo doppio non
// veniva dimezzato (leggevi il carrello invece del peso che senti) e la scala
// sceglieva la base "carico intero" invece di quella per lato. Cinque esercizi su
// venti diventavano OLYMPIAN di colpo, e il Cable Fly scendeva a GOLD.
// ---------------------------------------------------------------------------

test('31. il catalogo rimette i tre campi a ogni avvio, anche se il database li ha persi', () => {
  // Il caso vero: la riga nel database e' quella che arriva dal server, senza i
  // tre campi. Il catalogo li sa, quindi vanno rimessi.
  const catalogo = [
    { id: 'ex-cable-lateral-raise', nome: 'Cable Lateral Raise', convenzione: 'cavo_totali', carrucola: 'carrucola_doppia' },
    { id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'per_braccio', attrezzatura: 'macchina_dischi', bracciaIndipendenti: true },
    { id: 'ex-leg-extension', nome: 'Leg Extension', convenzione: 'macchina', attrezzatura: 'macchina_stack' },
  ];
  const persiDalServer = [
    { id: 'ex-cable-lateral-raise', nome: 'Cable Lateral Raise', convenzione: 'cavo_totali', rev: 1, sync: 'pulito' },
    { id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'per_braccio', rev: 1, sync: 'pulito' },
    { id: 'ex-leg-extension', nome: 'Leg Extension', convenzione: 'macchina', rev: 1, sync: 'pulito' },
  ];

  const daScrivere = riallineaEsercizi(catalogo, persiDalServer);
  assert.equal(daScrivere.length, 3, 'tutti e tre gli esercizi vanno risistemati');

  const laterale = daScrivere.find((r) => r.id === 'ex-cable-lateral-raise');
  assert.equal(laterale.carrucola, 'carrucola_doppia',
    'la carrucola torna: senza, i kg del carrello non vengono dimezzati');

  const chest = daScrivere.find((r) => r.id === 'ex-chest-press');
  assert.equal(chest.attrezzatura, 'macchina_dischi');
  assert.equal(chest.bracciaIndipendenti, true);
  assert.equal(chest.rev, 1, 'il resto della riga resta com\'e\'');
  assert.equal(chest.nome, 'Chest Press', 'e non si perde nessun altro campo');

  // LA CONDIZIONE 1 E' ANCHE CHE NON RIMETTA IN CODA: il server non ha le
  // colonne, quindi rimandare la riga su non serve a niente e lascerebbe
  // l'app con una coda che non si svuota mai.
  for (const r of daScrivere) {
    assert.notEqual(r.sync, 'da_salvare', 'i tre campi non si rimettono in coda per il server');
  }

  // se la riga e' gia' giusta non si scrive niente (non si riscrive tutto ogni volta)
  const giaGiusta = riallineaEsercizi(catalogo, [
    { id: 'ex-cable-lateral-raise', convenzione: 'cavo_totali', carrucola: 'carrucola_doppia' },
    { id: 'ex-chest-press', convenzione: 'per_braccio', attrezzatura: 'macchina_dischi', bracciaIndipendenti: true },
    { id: 'ex-leg-extension', convenzione: 'macchina', attrezzatura: 'macchina_stack' },
  ]);
  assert.deepEqual(giaGiusta, [], 'riga gia\' giusta: niente da fare');

  // e se un esercizio del catalogo non esiste ancora nel database non lo inventa:
  // quello lo crea il semina, non questo
  const senza = riallineaEsercizi(catalogo, []);
  assert.deepEqual(senza, [], 'nessuna riga da creare');

  // i campi che il catalogo NON dichiara non si toccano: non si cancella niente
  const conAltro = riallineaEsercizi(
    [{ id: 'x', nome: 'X', convenzione: 'bilanciere' }],
    [{ id: 'x', nome: 'X', convenzione: 'bilanciere', carrucola: 'carrucola_doppia' }],
  );
  assert.deepEqual(conAltro, [], 'il catalogo non dichiara la carrucola: non si cancella');

  assert.deepEqual([...CAMPI_CARICO].sort(), ['attrezzatura', 'bracciaIndipendenti', 'carrucola']);
});

test('32. una riga remota SENZA quei campi non cancella quelli locali', () => {
  // E\' il buco vero, e da solo spiega i 7 OLYMPIAN.
  const locale = riga({
    tabella: 'esercizi', nome: 'Cable Lateral Raise', convenzione: 'cavo_totali',
    carrucola: 'carrucola_doppia', attrezzatura: 'macchina_dischi', bracciaIndipendenti: true,
  });
  // il server non ha le colonne: la riga che torna NON le contiene
  const remoto = {
    id: locale.id, nome: 'Cable Lateral Raise', convenzione: 'cavo_totali',
    rev: 2, updated_at: '2026-10-07T10:00:00.000Z', device_id: 'pc',
  };

  const esito = applicaRemote(locale, remoto);
  assert.equal(esito.azione, 'applica', 'la remota e\' piu\' nuova, quindi si applica');
  assert.equal(esito.riga.carrucola, 'carrucola_doppia',
    'la carrucola LOCALE deve restare: il server non puo\' cancellarla');
  assert.equal(esito.riga.attrezzatura, 'macchina_dischi');
  assert.equal(esito.riga.bracciaIndipendenti, true);
  // e i campi che il server HA davvero vengono presi da lui
  assert.equal(esito.riga.nome, 'Cable Lateral Raise');
  assert.equal(esito.riga.convenzione, 'cavo_totali');
  assert.equal(esito.riga.device_id, 'pc', 'il resto arriva dal server');
  assert.equal(esito.riga.rev, 2, 'e la revisione e\' la sua');
});

test('33. una riga remota CHE HA quei campi aggiornati li applica', () => {
  // Il verso opposto deve funzionare, altrimenti questo fix blocca le correzioni
  // vere: se Ste corregge la carrucola dal telefono, quella correzione deve
  // arrivare. Qui non si puo' "proteggere" il campo locale per sempre.
  const locale = riga({
    tabella: 'esercizi', nome: 'Cable Lateral Raise', convenzione: 'cavo_totali',
    carrucola: 'carrucola_doppia',
  });
  const remoto = {
    id: locale.id, nome: 'Cable Lateral Raise', convenzione: 'cavo_totali',
    carrucola: 'carrucola_mono', attrezzatura: 'macchina_dischi',
    rev: 3, updated_at: '2026-10-07T11:00:00.000Z', device_id: 'pc',
  };

  const esito = applicaRemote(locale, remoto);
  assert.equal(esito.azione, 'applica');
  assert.equal(esito.riga.carrucola, 'carrucola_mono',
    'il valore CHE HA il server vince: altrimenti le correzioni vere non arrivano');
  assert.equal(esito.riga.attrezzatura, 'macchina_dischi', 'e un campo che il server ha in piu\' entra');

  // e se il server dice esplicitamente null, null vale: non e\' "non so"
  const conNull = applicaRemote(
    riga({ tabella: 'esercizi', carrucola: 'carrucola_doppia' }),
    { id: 'r1', rev: 9, updated_at: '2026-10-07T12:00:00.000Z', carrucola: null },
  );
  assert.equal(conNull.riga.carrucola, null, 'un null del server e\' una cancellazione vera');
});

test('15c. ritentativi con attese crescenti', () => {
  assert.equal(attesaRiprovo(1), 5000);
  assert.equal(attesaRiprovo(2), 30000);
  assert.equal(attesaRiprovo(3), 120000);
  assert.equal(attesaRiprovo(9), 600000);
});

test('contaDaSincronizzare conta solo quello che manca davvero', () => {
  const c = [
    { sync: 'da_salvare' }, { sync: 'errore' }, { sync: 'pulito' },
    { sync: 'da_salvare' }, { sync: 'conflitto' }, { sync: 'in_corso' },
  ];
  assert.equal(contaDaSincronizzare(c), 3);
});

test('30. gli stati mostrati in alto sono corretti', () => {
  const configurato = true;
  assert.match(statoSalvataggio({ online: true, configurato, coda: 0, errori: 0, inCorso: false }).testo, /Salvato online/);
  assert.match(statoSalvataggio({ online: false, configurato, coda: 4, errori: 0, inCorso: false }).testo, /Offline \/ da sincronizzare \(4\)/);
  assert.match(statoSalvataggio({ online: true, configurato, coda: 2, errori: 0, inCorso: true }).testo, /^Salvataggio\.\.\.$/);
  assert.match(statoSalvataggio({ online: true, configurato, coda: 0, errori: 2, inCorso: false }).testo, /^Errore \(2\)$/);
  const solo = statoSalvataggio({ online: true, configurato: false, coda: 0, errori: 0, inCorso: false });
  assert.match(solo.testo, /Solo su questo dispositivo/);
});

test('"Salvato online" compare solo quando non c\'e\' una coda', () => {
  const s1 = statoSalvataggio({ online: true, configurato: true, coda: 1, errori: 0, inCorso: false });
  assert.doesNotMatch(s1.testo, /Salvato online/);
  assert.doesNotMatch(statoSalvataggio({ online: false, configurato: true, coda: 0, errori: 0, inCorso: false }).testo, /Salvato online/);
  assert.doesNotMatch(statoSalvataggio({ online: true, configurato: true, coda: 0, errori: 1, inCorso: false }).testo, /Salvato online/);
});

test('ogni tabella che SALVA deve anche SCENDERE e SALIRE', async () => {
  // IL PROBLEMA DEI TRE ELENCHI DIVERSI, e il test che lo chiude.
  //
  // In questo progetto i nomi delle tabelle stanno in TRE elenchi separati:
  //  - db.js                 (13 tabelle: quello che il database crea davvero)
  //  - sincronizzazione.js   (le tabelle che il motore di sync considera)
  //  - sync.js               (le tabelle che scendono e salono da Supabase)
  //
  // Sono tre elenchi che possono andare in disaccordo, e sono andati in
  // disaccordo: `pesi` era in quello del database e non in nessuno degli altri
  // due. Il risultato era che il peso corporeo si salvava sul dispositivo ma
  // non viaggiava mai: aprendo l'app su un telefono nuovo i tuoi record c'era
  // tutti, ma il peso no, e il Rank veniva valutato senza sapere quanto pesi.
  //
  // Nessun errore, nessun rosso: solo un numero sbagliato sul telefono nuovo.
  // Un test che confronta i tre elenchi lo rende impossibile.
  const { TABELLE: TABELLE_DB } = await import('../src/db.js');
  const { TABELLE: TABELLE_SYNC } = await import('../src/sincronizzazione.js');
  // sync.js non esporta la lista: la leggo dal sorgente perche' e' una costante
  // interna, e quello che mi interessa e' che sia uguale a quella di sync.js
  const sorgente = await readFile(new URL('../src/sync.js', import.meta.url), 'utf8');
  const m = /const TABELLE_SINCRONIZZATE\s*=\s*\[([^\]]*)\]/.exec(sorgente);
  assert.ok(m, 'non trovo TABELLE_SINCRONIZZATE in sync.js: se hai cambiato il nome, aggiorna questo test');
  const TABELLE_PULL = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);

  // le tabelle che il database conosce ma che NON viaggiano, e perche'. Sono una
  // scelta, non una dimenticanza, quindi qui sono scritte per nome: se domani ne
  // aggiungi una nuova, il test ti chiede di metterla in questa lista.
  const LOCALI_PER_CHOIERE = {
    // i conflitti nascono da una scelta di Ste fra due versioni: scaricarli da
    // un altro dispositivo non ha senso
    conflitti: 'scelta locale di Ste',
    // le correzioni che Ste ha insegnato all'app: se viaggiassero, la correzione
    // fatta sul telefono arriverebbe anche al computer. Serve una decisione di Ste
    appreso: 'decisione di Ste pendente',
    // la coda e i metadati sono gia\' dentro le righe, non sono tabelle
  };

  for (const t of TABELLE_DB) {
    if (LOCALI_PER_CHOIERE[t]) continue;
    assert.ok(TABELLE_SYNC.includes(t),
      `la tabella "${t}" e\' nel database ma non fra le tabelle della sincronizzazione: `
      + 'o la aggiungi, o spieghi perche\' resta solo su questo dispositivo');
    assert.ok(TABELLE_PULL.includes(t),
      `la tabella "${t}" e\' nel database ma non fra le tabelle che scendono e salgono: `
      + 'i dati non viaggiano fra i dispositivi senza comparire qui');
  }

  // e il contrario non deve succedere: non si sincronizza una tababella che il
  // database non conosce, perche\' la riga arriverebbe e non ci sarebbe dove metterla
  for (const t of TABELLE_PULL) {
    assert.ok(TABELLE_DB.includes(t),
      `la tabella "${t}" viene sincronizzata ma il database non la conosce: `
      + 'la riga che arriva non avrebbe dove essere salvata');
  }

  // e le due liste della sincronizzazione devono dire le stesse cose
  const soloInPull = TABELLE_PULL.filter((t) => !TABELLE_SYNC.includes(t));
  assert.deepEqual(soloInPull, [],
    `scaricano e salgono tabelle diverse: ${soloInPull.join(', ')}`);
});
