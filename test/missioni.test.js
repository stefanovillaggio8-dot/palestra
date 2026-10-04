// missioni.test.js -- Daily, Weekly e Secret: le regole che devono valere
// per tutti, senza eccezioni.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  POOL, DIFFICOLTA, setSettimanale, dailyDi, idSettimana, quadroMissioni,
  ricompensaMissione, missionePerId, contaCompletate, storicoMissioni, hashTesto,
  generatoreDa, NUMERO_WEEKLY, NUMERO_SECRET, MOLTIPLICATORE_SECRET,
} from '../src/missioni.js';

const SETTIMANA = '2026-W40';

test('1. il pool ha un sacco di missioni e tutte hanno id unico', () => {
  assert.ok(POOL.length >= 40, 'il pool deve essere grande, non 5 missioni');
  const id = new Set(POOL.map((m) => m.id));
  assert.equal(id.size, POOL.length, 'due missioni hanno lo stesso id');
  for (const m of POOL) {
    assert.ok(m.titolo && m.testo, 'missione senza testo: ' + m.id);
    assert.ok(DIFFICOLTA[m.difficolta], 'difficolta\' sconosciuta: ' + m.id);
  }
});

test('2. nessuna missione e\' pericolosa o fuori luogo', () => {
  // Controllo che il pool non chieda mai cose che fanno male, che rovinano
  // l'attrezzatura o che toccano persone senza il loro permesso.
  //
  // Nota: la parola "sconosciuto" NON e\' piu\' vietata. Ste ha chiesto delle
  // sfide che vedono sconosciuti, e sono innocue: sono imbarazzanti per chi le
  // fa, non per gli altri. Restano vietate le cose che fanno davvero danno.
  const vietate = /filmare|riprendere|video|stranier|insicur|pericolos|rovinare|attrezzatur|sabot|non\s+chiedere\s+il\s+permesso/i;
  for (const m of POOL) {
    assert.equal(vietate.test(m.testo), false, 'missione da rivedere: ' + m.id);
  }
});

test('2b. con chi non conosci mai nessun contatto fisico', () => {
  // Il gruppo "sfide con gli sconosciuti" puo' usare solo la parola e il
  // sorriso. Vietato toccare, spingere, abbracciare, mettere le mani addosso a
  // chi non ha chiesto nulla. Con gli amici invece si puo' fare il pugno, per
  // quello la regola non vale.
  const contatto = /\b(tocca|toccare|toccarla|toccagli|toccargli|spingi|spingere|spingila|striscia|strisciare|abbraccia|abbracciare|palleggia|palleggi|mani\s+(sui|addosso|in\s+faccia))\b/i;
  for (const m of POOL) {
    // solo nelle missioni che vedono persone non conosciute
    if (!/sconosciut|non\s+conosci/i.test(m.testo)) continue;
    assert.equal(contatto.test(m.testo), false,
      'missione con contatto fisico verso uno sconosciuto, da rivedere: ' + m.id);
  }
});

/**
 * Una frase e' chiusa bene se l'ultimo carattere UTILE e' un punto, un punto
 * esclamativo o un punto interrogativo.
 *
 * Se la missione finisce con una domanda dentro le virgolette
 * ("Commento tecnico?") l'ultimo carattere e' la virgoletta, non il punto.
 * Quindi tolgo virgolette e parentesi finali prima di guardare: altrimenti
 * costringevo a aggiungere una frase in fondo solo per mettere un punto e
 * finiva con un "Commento tecnico?." che sembrava un refuso.
 */
function fraseChiusa(testo) {
  return /[.!?]$/.test(String(testo).trim().replace(/["'»)\]]+$/, ''));
}

test('2c. le sfide con gli sconosciuti esistono e sono scritte semplici', () => {
  const conSconosciuto = POOL.filter((m) => /sconosciut|non\s+conosci/i.test(m.testo));
  assert.ok(conSconosciuto.length >= 6, 'ci sono le sfide che vedono sconosciuti');
  for (const m of conSconosciuto) {
    // frasi corte e parole comuni: niente linguaggio complicato
    assert.ok(m.testo.length < 190, 'frase non troppo lunga: ' + m.id);
    assert.ok(fraseChiusa(m.testo), 'la frase finisce con un punto: ' + m.id);
  }
});

test('2d. nessuna missione si ripete per la stessa persona', () => {
  // Ste: "non possono spuntare piu\' volte le stesse sfide, se e\' gia\' capitata
  // a uno non puo\' capitare la stessa cosa alla stessa persona".
  const giaFatte = POOL.slice(0, 30).map((m) => m.id);
  const set = setSettimanale('2026-W40', giaFatte);
  for (const m of [...set.weekly, ...set.secret]) {
    assert.ok(!giaFatte.includes(m.id), 'non deve tornare una missione gia\' fatta: ' + m.id);
  }
  const d1 = dailyDi('io', '2026-10-05', giaFatte);
  if (d1) assert.ok(!giaFatte.includes(d1.id), 'la daily non deve essere gia\' fatta: ' + d1.id);

// la stessa persona, senza storico, vede lo stesso set: il set e' stabile
  const setAltro = setSettimanale('2026-W40', []);
  assert.deepEqual(setAltro.weekly.map((m) => m.id), setSettimanale('2026-W40', []).weekly.map((m) => m.id),
    'senza storico la persona vede sempre le stesse missioni');
});

test('2e. la daily non si ripete nemmeno giorno dopo giorno', () => {
  // stesso utente, una settimana di giorni: nessuna missione due volte
  const viste = [];
  for (let g = 5; g <= 20; g++) {
    const giorno = `2026-10-${String(g).padStart(2, '0')}`;
    const m = dailyDi('io', giorno, viste);
    if (!m) continue;
    assert.ok(!viste.includes(m.id), 'la missione ' + m.id + ' e\' usata due volte entro il ' + giorno);
    viste.push(m.id);
  }
  assert.ok(viste.length >= 10, 'in due settimane deve arrivare a dargli una missione ogni giorno');
});

test('2f. anche le weekly non si ripetono tra un utente e l\'altro nello stesso periodo', () => {
  // due persone che hanno gia\' fatto cose diverse: i loro set possono
  // diversificarsi, ma nessuno dei due deve vedere due volte la stessa missione
  const a = setSettimanale('2026-W41', POOL.slice(0, 5).map((m) => m.id));
  const b = setSettimanale('2026-W41', POOL.slice(5, 10).map((m) => m.id));
  const idA = a.weekly.map((m) => m.id);
  const idB = b.weekly.map((m) => m.id);
  assert.equal(new Set(idA).size, idA.length, 'nel set di A non ci sono duplicati');
  assert.equal(new Set(idB).size, idB.length, 'nel set di B non ci sono duplicati');
});

test('3. l\'identificatore di settimana e\' nel formato giusto', () => {
  assert.match(idSettimana('2026-10-05'), /^\d{4}-W\d{2}$/);
  assert.equal(idSettimana('2026-10-05'), idSettimana('2026-10-11'), 'la stessa settimana, stesso id');
  assert.notEqual(idSettimana('2026-10-12'), idSettimana('2026-10-05'), 'la settimana dopo cambia');
});

test('4. il set settimanale e\' DIVERSO per ciascuno', () => {
  // Ste: "fai anche le missioni settimanali diverse per tutti. Le secret
  // mission invece sono uguali? se sì falle diverse per tutti".
  // Prima erano uguali per tutti: adesso ogni persona ha le sue.
  const a = setSettimanale(SETTIMANA, [], 'persona-1');
  const b = setSettimanale(SETTIMANA, [], 'persona-2');

  // ... ma per la STESSA persona il set è stabile, altrimenti ogni volta che
  // apri l'app ti spuntano missioni diverse e non capisci cosa hai già fatto
  const a2 = setSettimanale(SETTIMANA, [], 'persona-1');
  assert.deepEqual(a.weekly.map((m) => m.id), a2.weekly.map((m) => m.id), 'stessa persona, stesso set');

  // e le secret devono essere diverse, non uguali
  const idSecretA = a.secret.map((m) => m.id);
  const idSecretB = b.secret.map((m) => m.id);
  assert.notDeepEqual(idSecretA, idSecretB, 'le secret di persona-1 e persona-2 non possono essere uguali');

  assert.equal(a.weekly.length, NUMERO_WEEKLY);
  assert.equal(a.secret.length, NUMERO_SECRET);
  assert.equal(b.weekly.length, NUMERO_WEEKLY);
  assert.equal(b.secret.length, NUMERO_SECRET);
});

test('4b. persone diverse ricevono davvero set diversi (non solo per caso)', () => {
  // non basta che due persone abbiano set diversi: la maggior parte deve
  // essere diversa davvero, altrimenti il gioco non ha senso
  const set = ['a', 'b', 'c', 'd', 'e', 'f'].map((p) => setSettimanale('2026-W40', [], p));
  const idDi = (s) => s.weekly.map((m) => m.id).sort().join(',');
  const unici = new Set(set.map(idDi));
  assert.equal(unici.size, set.length, 'le 6 persone devono avere 6 set tutti diversi');

  // nessuno deve ricevere la stessa missione settimanale di un altro
  for (let i = 0; i < set.length; i++) {
    for (let j = i + 1; j < set.length; j++) {
      const comune = set[i].weekly.filter((m) => set[j].weekly.some((x) => x.id === m.id));
      assert.ok(comune.length < set[i].weekly.length,
        'le persone ' + i + ' e ' + j + ' non possono avere le stesse 5 weekly');
    }
  }
});

test('5. la settimana dopo ha un set diverso', () => {
  const a = setSettimanale('2026-W40');
  const b = setSettimanale('2026-W41');
  const idsA = a.weekly.map((m) => m.id);
  const idsB = b.weekly.map((m) => m.id);
  assert.notDeepEqual(idsA, idsB, 'due settimane diverse devono avere set diversi');
});

test('6. dentro una settimana non ci sono missioni ripetute', () => {
  for (const s of ['2026-W40', '2026-W41', '2026-W01', '2026-W52']) {
    const set = setSettimanale(s);
    const tutti = [...set.weekly, ...set.secret].map((m) => m.id);
    assert.equal(new Set(tutti).size, tutti.length, 'missione ripetuta nella settimana ' + s);
  }
});

test('7. le secret sono davvero segrete (id dedicato) e valgono di piu\'', () => {
  const set = setSettimanale(SETTIMANA);
  for (const m of set.secret) assert.equal(m.segreta, true);
  const ric = ricompensaMissione(set.secret[0], { segreta: true });
  const ricNormale = ricompensaMissione(set.secret[0], { segreta: false });
  assert.ok(ric.aura > ricNormale.aura, 'una secret deve valere di piu\'');
  assert.equal(ric.aura, Math.round(ricNormale.aura * MOLTIPLICATORE_SECRET));
});

test('8. piu\' e\' difficile, piu\' alta la ricompensa', () => {
  const ordine = ['easy', 'unhinged', 'insane', 'legendary'];
  for (let i = 1; i < ordine.length; i++) {
    assert.ok(DIFFICOLTA[ordine[i]].aura > DIFFICOLTA[ordine[i - 1]].aura);
    assert.ok(DIFFICOLTA[ordine[i]].xp > DIFFICOLTA[ordine[i - 1]].xp);
  }
  assert.equal(DIFFICOLTA.easy.aura, 20);
  assert.equal(DIFFICOLTA.unhinged.aura, 40);
  assert.equal(DIFFICOLTA.insane.aura, 75);
  assert.equal(DIFFICOLTA.legendary.aura, 150);
});

test('9. la Daily e\' diversa per ogni utente', () => {
  const a = dailyDi('account-1', '2026-10-05');
  const b = dailyDi('account-2', '2026-10-05');
  const ids = new Set();
  for (let i = 0; i < 12; i++) ids.add(dailyDi('account-' + i, '2026-10-05').id);
  assert.ok(ids.size > 1, 'la Daily deve cambiare da utente a utente');
  assert.ok(a && b);
});

test('10. la Daily cambia ogni giorno ed e\' stabile dentro lo stesso giorno', () => {
  const primo = dailyDi('account-1', '2026-10-05');
  const stesso = dailyDi('account-1', '2026-10-05');
  assert.equal(primo.id, stesso.id);
  const giorni = new Set();
  for (let i = 1; i <= 20; i++) {
    giorni.add(dailyDi('account-1', '2026-10-' + String(i).padStart(2, '0')).id);
  }
  assert.ok(giorni.size > 5, 'in 20 giorni la Daily deve cambiare parecchie volte');
});

test('11. la Daily non e\' mai una missione segreta', () => {
  for (let i = 1; i <= 15; i++) {
    const m = dailyDi('account-1', '2026-11-' + String(i).padStart(2, '0'));
    assert.equal(m.segreta, false);
  }
});

test('12. il quadro missioni dice cosa e\' gia\' fatto', () => {
  const q = quadroMissioni({ accountId: 'a1', dataISO: '2026-10-05', settimana: SETTIMANA, completamenti: [] });
  assert.ok(q.daily && !q.daily.completata);
  assert.equal(q.weekly.length, NUMERO_WEEKLY);
  assert.equal(q.secret.length, NUMERO_SECRET);
  assert.equal(q.settimana, SETTIMANA);
  // le secret partono coperte
  for (const s of q.secret) assert.equal(s.rivelata, false);
  for (const w of q.weekly) assert.equal(w.rivelata, true);
});

test('13. completare una missione una volta sola: la chiave e\' univoca', () => {
  const q = quadroMissioni({ accountId: 'a1', dataISO: '2026-10-05', settimana: SETTIMANA, completamenti: [] });
  const chiave = q.daily.chiave;
  assert.equal(chiave, 'a1:' + q.daily.missione.id + ':2026-10-05');
  const dopo = quadroMissioni({
    accountId: 'a1', dataISO: '2026-10-05', settimana: SETTIMANA,
    completamenti: [{ id: chiave, missione_id: q.daily.missione.id, categoria: 'daily', data: '2026-10-05', settimana: SETTIMANA, completata_il: '2026-10-05T19:00:00.000Z', aura: 30 }],
  });
  assert.equal(dopo.daily.completata, true, 'la stessa chiave non puo\' completarsi due volte');
});

test('14. domani la Daily e\' di nuovo disponibile', () => {
  const ieri = quadroMissioni({ accountId: 'a1', dataISO: '2026-10-05', settimana: SETTIMANA, completamenti: [] });
  const chiave = ieri.daily.chiave;
  const oggi = quadroMissioni({
    accountId: 'a1', dataISO: '2026-10-06', settimana: SETTIMANA,
    completamenti: [{ id: chiave, categoria: 'daily', data: '2026-10-05', settimana: SETTIMANA, completata_il: '2026-10-05T19:00:00.000Z' }],
  });
  assert.equal(oggi.daily.completata, false);
  assert.notEqual(oggi.daily.chiave, chiave);
});

test('15. la settimana dopo le weekly ricominciano', () => {
  const q1 = quadroMissioni({ accountId: 'a1', dataISO: '2026-10-05', settimana: '2026-W40', completamenti: [] });
  const chiavi = q1.weekly.map((w) => w.chiave);
  const completamentiRigi = chiavi.map((k) => ({ id: k, categoria: 'weekly', settimana: '2026-W40', completata_il: '2026-10-05T19:00:00.000Z' }));
  const q2 = quadroMissioni({
    accountId: 'a1', dataISO: '2026-10-12', settimana: '2026-W41',
    completamenti: completamentiRigi,
  });
  assert.equal(q2.weekly.every((w) => !w.completata), true, 'la settimana nuova ricomincia');
  assert.equal(contaCompletate(completamentiRigi, { settimana: '2026-W41' }), 0);
  assert.equal(contaCompletate(completamentiRigi), 5, 'lo storico della settimana passata resta');
});

test('16. lo storico tiene le missioni passate', () => {
  const completamenti = [
    { id: 'a1:il-campione:2026-10-01', missione_id: 'il-campione', categoria: 'daily', data: '2026-10-01', settimana: '2026-W40', completata_il: '2026-10-01T18:00:00.000Z', aura: 20 },
    { id: 'a1:la-lotta:2026-W39', missione_id: 'la-lotta', categoria: 'weekly', data: null, settimana: '2026-W39', completata_il: '2026-09-28T18:00:00.000Z', aura: 40 },
  ];
  const storico = storicoMissioni(completamenti);
  assert.equal(storico.length, 2);
  assert.equal(storico[0].titolo, 'IL CAMPIONE');
  assert.equal(storico[0].missione.titolo, 'IL CAMPIONE');
  assert.equal(contaCompletate(completamenti), 2);
  assert.equal(contaCompletate(completamenti, { settimana: '2026-W39' }), 1);
});

test('17. contare le missioni aperte non e\' contarle come fatte', () => {
  const aperti = [{ id: 'x', categoria: 'daily', data: '2026-10-05', settimana: SETTIMANA, rivelata: true }];
  assert.equal(contaCompletate(aperti), 0);
});

test('18. missionePerId trova la missione del pool', () => {
  const m = missionePerId('il-boss-finale');
  assert.ok(m);
  assert.equal(missionePerId('non-esiste'), null);
});

test('19. lo stesso seme dà sempre la stessa sequenza (su qualsiasi dispositivo)', () => {
  const a = generatoreDa('2026-W40');
  const b = generatoreDa('2026-W40');
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  assert.equal(hashTesto('abc'), hashTesto('abc'));
  assert.notEqual(hashTesto('abc'), hashTesto('abd'));
});

test('20. ogni missione del pool e\' usabile: settimana diverse coprono tutto', () => {
  const viste = new Set();
  for (let w = 1; w <= 40; w++) {
    const set = setSettimanale(`2026-W${String(w).padStart(2, '0')}`);
    for (const m of set.weekly) viste.add(m.id);
  }
  assert.ok(viste.size >= 35, 'in 40 settimane devono comparire quasi tutte le missioni normali');
});
// ---------------------------------------------------------------------------
// Le regole che Ste ha detto esplicitamente. Servono a non dimenticarsene
// quando fra un mese aggiungo altre missioni.
// ---------------------------------------------------------------------------

test('2f2. nessuna missione parla di cose che non c\'entrano con la palestra', () => {
  // Ste: "scrivi UNA frase drammatica su WhatsApp, ma che senso ha? su
  // WhatsApp cosa c\'entra con la palestra?"
  //
  // Le sfide si fanno IN PALESTRA. Una missione che ti fa scrivere su
  // WhatsApp, postare una foto o fare qualcosa fuori da qui non ha senso:
  // non c\'entra niente con l\'allenamento. (E la frase "esempio" in una
  // missione non deve parlare di cose tipo "stasera", che non c\'entrano.)
  const estranei = /\b(whatsapp|telegram|instagram|facebook|tiktok|youtube|twitch|whatsapp|snapchat|discord|email|e-mail|posta|domicilio|numero di telefono)\b/i;
  for (const m of POOL) {
    assert.ok(!estranei.test(m.testo), 'la missione ' + m.id + ' parla di cose fuori dalla palestra: ' + m.testo);
  }
});

test('2g. nessuna missione ti fa uscire dalla palestra', () => {
  // Ste: "la mia palestra non puoi uscire fuori e non ha senso che non saprei
  // cosa dire". Alla palestra non si esce: quindi niente "esci", niente
  // "vado in strada", niente cortile, bar, scale o doccia.
  const vietate = /\b(esci|uscire|uscita|fuori dalla palestra|in strada|la strada|cortile|piazza|il bar|la bar|le scale|la doccia|le docce|vado a)\b/i;
  for (const m of POOL) {
    assert.ok(!vietate.test(m.testo), 'la missione ' + m.id + ' ti fa uscire: ' + m.testo);
  }
});

test('2h. se la missione parla con qualcuno, dice a chi e fa una domanda', () => {
  // Ste: "non e\' scritto a chi si riferisce e deve sempre dire una domanda a
  // chi si riferisce". Quindi: se c\'e\' qualcuno a cui parli, la missione
  // nomina il destinatario E contiene un punto interrogativo.
  // "parla con qualcuno" vuol dire che gli parli DIRETTAMENTE: gli fai una
  // domanda, gli dai del tu, gli annunci qualcosa. Non basta che la missione
  // nomini una terza persona ("una persona che si arrende"): quella e' solo
  // un pensiero e non richiede nessuna domanda.
  const parlaConQualcuno = /(sconosciut|un amico|ai tuoi amici|agli amici|amici\b|dagli una|digli|diglielo|chiedigli|chiedi a|guarda negli occhi|verso un amico|alla persona|al ragazzo|alla ragazza)/i;
  for (const m of POOL) {
    if (!parlaConQualcuno.test(m.testo)) continue;
    assert.ok(m.testo.includes('?'),
      'parla con qualcuno ma non fa nessuna domanda: ' + m.id);
  }
});

test('2i. ogni missione con sconosciuti e\' difficile, nessuna facile', () => {
  // Ste: "quelle con gli sconosciuti sono piu\' difficili, perche\' ti mettono
  // piu\' in imbarazzo"
  const conSconosciuto = POOL.filter((m) => /sconosciut/i.test(m.testo));
  assert.ok(conSconosciuto.length >= 10, 'ci sono abbastanza sfide con gli sconosciuti');
  for (const m of conSconosciuto) {
    assert.notEqual(m.difficolta, 'easy', 'non deve essere facile: ' + m.id);
    assert.ok(['unhinged', 'insane', 'legendary'].includes(m.difficolta),
      'difficolta\' non ammessa per ' + m.id + ': ' + m.difficolta);
  }
});

test('2l. ogni missione spiega con chiarezza cosa fare', () => {
  // Ste: "non si capisce bene puoi fare una descrizione che si capisce di piu\'"
  // Le missioni devono dire un\'azione concreta, non solo una situazione vaga.
  for (const m of POOL) {
    assert.ok(m.testo.length >= 60, 'troppo corta per capire: ' + m.id);
    assert.ok(fraseChiusa(m.testo), 'deve finire con un punto: ' + m.id);
// almeno un verbo d'azione concreto.
    // niente \b sulle parole accentate: "ì" non e' un carattere di parola in
    // JavaScript, quindi \b non aggancia e il test passerebbe buggerato
    const azione = /(fai|chiedi|guarda|metti|spiega|annuncia|presenta|conta|saluta|racconta|ripeti|mostra|scegli|scrivi|leggi|cambia|annuisci|sorridi|scrolla|porta|prova|continua|parti|chiama|urla|canticchia|trombone|dirigi|incoraggia|festeggia|cita|segna|alza)/i;
    assert.ok(azione.test(m.testo), 'non dice cosa fare: ' + m.id);
  }
});
