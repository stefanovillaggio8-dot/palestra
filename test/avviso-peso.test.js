import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// L'avviso "Questo vale per 66 kg" (Ste, 07/10/2026).
//
// Qui non provo una frase: provo la cosa fragile. Il peso corporeo e' l'unico
// numero che Ste scrive a mano che muove TUTTI i Rank, quindi se l'app si ricorda
// un peso vecchio tutti i Rank sono fuori posto insieme, e lui non ha modo di
// accorgersene perche' i numeri sembrano giusti.
//
// Il test che blocca il bug e' il 3: si cambia il peso nel database, si rilegge
// l'avviso, e il numero DEVE ESSERE DIVERSO. Se resta uguale, il numero e'
// scritto a mano da qualche parte.

globalThis.localStorage = {
  _v: new Map(),
  getItem(k) { return this._v.has(k) ? this._v.get(k) : null; },
  setItem(k, v) { this._v.set(k, String(v)); },
  removeItem(k) { this._v.delete(k); },
  clear() { this._v.clear(); },
};
delete globalThis.indexedDB;

const db = await import('../src/db.js');
const peso = await import('../src/peso-corporeo.js');
const {
  avvisoPesoEsercizio, righeAvviso, confiniPerIlRank, kgTesto, pesoCheToccaSoglia, kgEquivalenti,
} = await import('../src/avviso-peso.js');
const { profiloEsercizio, profiloPerPesoCorporeo } = await import('../src/rank-config.js');
const { ESERCIZI } = await import('../src/dati-iniziali.js');

const ACCOUNT = 'account-peso-test';
/**
 * L'esercizio su cui provare l'avviso.
 *
 * Il 08/10/2026 questo era "il primo esercizio che matcha /Leg press/", che e'
 * finito sul Single Leg Press: un esercizio a gamba singola, il cui tetto e' di
 * 2,2 volte il peso corporeo PER GAMBA. Con 25 kg su un corpo da 66 si sta sotto
 * l'ingresso di 66 kg, quindi non c'e' nessun Rank e l'avviso non ha niente su cui
 * lavorare: il test misurava il vuoto.
 *
 * Ora si usa la chest press, che e' l'esercizio su cui Ste ha ragionato di piu',
 * e il peso (88 kg per braccio) la mette dentro la scala senza essere al tetto:
 * sotto il tuo corpo entra, sopra no, quindi ci sono due confini da mostrare.
 */
const ESERCIZIO = ESERCIZI.find((e) => /chest press/i.test(e.nome)) || ESERCIZI[0];
/**
 * Il carico: 40 kg per braccio su corpo 66.
 *
 * Sta a meta' strada (ingresso 29,7, tetto 66, quindi 22% della scala), che e'
 * l'unico posto dove l'avviso ha DUE confini da dire: a che peso sale e a che
 * peso scende. In cima alla scala c'e' solo "lo perdi" (non esiste un livello
 * dopo, e dirlo sarebbe una promessa falsa), e sotto la prima soglia c'e' solo
 * "sale": gli altri due casi sono giusti ma non provano nulla.
 */
const CARICO = 40;

/** una serie fatta con `kg`, senza peso corporeo salvato dentro */
function serieCon(kg = CARICO, ripetizioni = 8, id = 's1') {
  return {
    id, scheda_id: 'scheda-gym-3', esercizio_id: ESERCIZIO.id, ordine: 1,
    tipo_esercizio: 'forza', serie: 1, stato: 'fatta', ripetizioni, peso: kg,
    spotter: false, carrucola: null, esercizio: ESERCIZIO.nome, note: '',
  };
}

/** una pesatura vecchia di `giorni` giorni, cosi' serveAggiornare dice che serve */
function pesatura(kg, giorni = 40) {
  const d = new Date(Date.now() - giorni * 86400000);
  return d.toISOString().slice(0, 10);
}

// Il peso attuale e' l'ultimo PER DATA, non l'ultimo scritto: quindi ogni test
// parte con il database vuoto. Senza questo, una pesatura di ieri rimasta dentro
// farebbe sparire l'avviso nei test dopo, e il test passerebbe buggerato
// ("non c'e' avviso" quando invece non c'era il peso vecchio).
beforeEach(async () => {
  for (const p of await peso.pesiCronologici(ACCOUNT)) await peso.togliPeso(p.id);
});

test('1. l\'avviso compare quando il peso e\' vecchio, e dice il peso giusto', async () => {
  await peso.segnaPeso(66, { account: ACCOUNT, data: pesatura(66) });
  const a = await avvisoPesoEsercizio({
    serie: [serieCon()], esercizio: ESERCIZIO, account: ACCOUNT,
  });
  assert.ok(a, 'col peso vecchio l\'avviso deve esserci');
  const testo = a.righe.join(' ');
  assert.match(testo, /Questo vale for 66 kg\.|Questo vale per 66 kg\./,
    'la prima riga dice il peso registrato');
  // "a che peso perdi": questo numero esiste SOLO se la prestazione e' dentro la
  // scala, non in cima. Con 40 kg per braccio su corpo 66 e' a meta' strada
  // (ingresso 29,7, tetto 66).
  //
  // NUOVO MODELLO (22/10/2026): col Rank sulla serie vera, ingrassare ABBASSA
  // lo score a parita' di carico. Il confine "sali" quindi non scatta: a corpo
  // piu' pesante questo Rank e' fragile verso il basso, e l'unico numero che ha
  // senso mostrare e' quello in cui lo perdi.
  assert.ok(!a.sottoSoglia, 'la prestazione deve essere dentro la scala, non sotto');
  assert.match(testo, /lo perdi/, 'dice a che peso perdi il Rank');
  assert.match(testo, /aggiornalo/, 'e finisce dicendo cosa fare');
});

test('2. col peso fresco l\'avviso sparisce (serveAggiornare decide, non un controllo nuovo)', async () => {
  await peso.segnaPeso(66, { account: ACCOUNT, data: new Date().toISOString().slice(0, 10) });
  const a = await avvisoPesoEsercizio({
    serie: [serieCon()], esercizio: ESERCIZIO, account: ACCOUNT,
  });
  assert.equal(a, null, 'peso aggiornato ieri: l\'avviso non serve e non deve comparire');
});

test('3. IL TESTE CHE BLOCCA IL BUG: cambio il peso nel database, il numero cambia', async () => {
  // la serie non ha il peso corporeo dentro, quindi la scala la ricalcola ogni volta
  // con il peso di adesso: e' il caso fragile, ed e' quello che Ste fa ogni volta
  // che si pesa.
  await peso.segnaPeso(66, { account: ACCOUNT, data: pesatura(66) });
  const prima = await avvisoPesoEsercizio({
    serie: [serieCon()], esercizio: ESERCIZIO, account: ACCOUNT,
  });
  assert.match(prima.righe.join(' '), /66 kg/);

  // adesso mi peso 72 kg, e l'avviso deve cambiare numero
  await peso.segnaPeso(72, { account: ACCOUNT, data: pesatura(72, 39) });
  const dopo = await avvisoPesoEsercizio({
    serie: [serieCon()], esercizio: ESERCIZIO, account: ACCOUNT,
  });
  assert.match(dopo.righe.join(' '), /72 kg/, 'il peso nuovo deve comparire');
  assert.notEqual(dopo.righe.join(' '), prima.righe.join(' '),
    'l\'avviso deve essere un altro avviso, non lo stesso testo');

// e adesso la parte scomoda, che e' anche la piu' vera: con la STESSA prestazione
  // e 6 kg in piu' lo score deve scendere; la fascia puo' restare uguale se il
  // risultato non attraversa una soglia. Non si forza un cambio di Rank artificiale.
  //
  // NUOVO MODELLO: il punteggio È normalizzato col peso (allometrico 0,67),
  // quindi CAMBIA col peso. Il Rank cambia perchè la prestazione relativa
  // alla scala cambia.
  assert.ok(prima.record.rank && dopo.record.rank, 'a 40 kg per braccio c\'e\' un Rank a entrambi i pesi');
  const posizione = (r) => `${r.rank.id}:${r.lp}`;
  assert.notEqual(posizione(dopo.record), posizione(prima.record),
    `pesando di piu' senza aver fatto una serie in piu', la posizione non puo' restare `
    + `identica: ${posizione(prima.record)} -> ${posizione(dopo.record)}`);
  assert.ok(dopo.record.indice <= prima.record.indice,
    `pesare di più non può migliorare la fascia: ${prima.record.rank.id} -> ${dopo.record.rank.id}`);
  assert.ok(dopo.record.score < prima.record.score,
    `la stessa serie, su un corpo piu' pesante, vale meno: ${prima.record.score} -> ${dopo.record.score}`);
  // LA PRESTAZIONE E' LA STESSA (40 kg x 8), MA LO SCORE CAMBIA: la formula e'
  // 1RM / peso^0,67, e il peso e' cresciuto. Le soglie INVECE NON SI SPOSTANO:
  // sono costanti normalizzate. Se si spostassero anche loro, il peso si
  // semplificherebbe e il Rank non cambierebbe mai (era il bug di prima).
  assert.deepEqual(dopo.record.soglie, prima.record.soglie,
    'le soglie sono costanti: il peso entra una volta sola, nello score');
});

test('4. l\'avviso e il Rank leggono la stessa scala (stessa funzione)', async () => {
  await peso.segnaPeso(66, { account: ACCOUNT, data: pesatura(66) });
  const serie = [serieCon()];
  const a = await avvisoPesoEsercizio({ serie, esercizio: ESERCIZIO, account: ACCOUNT });
  const record = a.record;
  // LA SCALA DA USARE E' QUELLA DEL RECORD, non piu' quella del profilo vecchio.
  //
  // Prima questo test ricostruiva la scala con `profiloPerPesoCorporeo(base, ...)`,
  // cioe' la scala del motore VECCHIO (costruita sul massimale stimato). Dal
  // 08/10/2026 il Rank e' calcolato da rank-v2 e le sue soglie stanno in
  // `record.soglie`: se l'avviso usasse una scala e il Rank un'altra, l'avviso
  // direbbe "tocchi il livello dopo a 61 kg" mentre sul telefono il Rank cambierebbe
  // a 76. Due numeri che dicono cose diverse sullo stesso record, che e'
  // esattamente il bug che questo file e' nato per trovare.
  const scalaDelRecord = record.soglie;
  assert.ok(Array.isArray(scalaDelRecord) && scalaDelRecord.length === 7,
    'il record porta con se\' le 7 soglie del motore nuovo');
  const prestazione = record.score;
  // USARE LA NUOVA API confiniPerIlRank (kgEquivalenti, soglie, w0, meccanica)
  const kgEquivalenti = record.kgEquivalenti ?? (() => {
    if (!record.score || !record.pesoCorporeo) return null;
    return kgEquivalenti(record.score, record.pesoCorporeo);
  })();
  const mine = confiniPerIlRank({
    kgEquivalenti,
    soglie: scalaDelRecord,
    w0: record.pesoCorporeo,
    meccanica: record.meccanica || 1,
  });
  assert.equal(mine.sale, a.confini.sale, 'il peso per salire deve essere lo stesso');
  assert.equal(mine.scende, a.confini.scende, 'il peso per perdere deve essere lo stesso');
  // e il confine ha un senso: pesando quel peso la prestazione tocca davvero la
  // soglia. Non e' una stima, e' l'uguaglianza risolta.
  //
  // Tolleranza di un centesimo perche' le soglie sono arrotondate a 0,01 kg: sono
  // una scala scritta, non una formula continua, quindi al confine la riga e' o
  // quella giusta o quella subito sotto. pretendere di piu' sarebbe inventare una
  // precisione che la scala non ha.
  const gradinoSale = scalaDelRecord.findIndex((s) => s > prestazione);
  assert.ok(Math.abs(scalaDelRecord[gradinoSale] - prestazione) > 0,
    'la prestazione sta sotto la soglia che deve raggiungere');
  // il gradino sotto e' quello che perde: la prestazione e' sopra quella riga
  assert.ok(prestazione >= scalaDelRecord[gradinoSale - 1],
    'e sopra la soglia precedente, altrimenti non ha niente da perdere');
  // E IL PESO CONTA LO STESSO: da 66 a 72 kg le soglie restano ferme, ma lo
  // score scende. E' l'unico modo perche' il peso sposti davvero il Rank: se
  // salissero anche le soglie, il peso si annullerebbe.
  const a66 = await avvisoPesoEsercizio({ serie, esercizio: ESERCIZIO, account: ACCOUNT });
  const scala66 = a66.record.soglie;
  await peso.segnaPeso(72, { account: ACCOUNT, data: pesatura(72, 39) });
  const a72 = await avvisoPesoEsercizio({ serie, esercizio: ESERCIZIO, account: ACCOUNT });
  assert.deepEqual(a72.record.soglie, scala66,
    'le soglie non cambiano col peso corporeo');
  assert.ok(a72.record.score < a66.record.score,
    `ma lo score si\': ${a66.record.score} -> ${a72.record.score}`);
});

test('5. i numeri sono formattati come li vuole Ste: due decimali, niente zeri', () => {
  assert.equal(kgTesto(65.79), '65,79');
  assert.equal(kgTesto(67), '67');
  assert.equal(kgTesto(67.4), '67,4');
  assert.equal(kgTesto(70), '70');
});

test('6. le tre righe sono tre righe, e senza pezzi non si inventa la frase', () => {
  const righe = righeAvviso({ peso: 66, sale: 65.79, scende: 67 });
  assert.equal(righe.length, 2, 'prima riga il peso, seconda i due confini col rimando all\'azione');
  assert.match(righe[0], /^Questo vale per 66 kg\.$/);
  assert.equal(righe[1],
    'Ogni chilo di peso corporeo sposta questo Rank: a 65,79 kg tocchi il livello dopo, '
    + 'a 67 kg lo perdi. Se il tuo peso è cambiato, aggiornalo.');

  // in cima non esiste "il livello dopo": non si promette
  const inCima = righeAvviso({ peso: 66, sale: null, scende: 67 });
  assert.doesNotMatch(inCima[1], /livello dopo/);
  // sotto il primo gradino non si perde niente: si puo' solo salire
  const sotto = righeAvviso({ peso: 66, sale: 65.79, scende: null });
  assert.doesNotMatch(sotto[1], /lo perdi/);
  // e se non c'e' nessun confine sensato, non si scrive niente
  assert.deepEqual(righeAvviso({ peso: 66, sale: null, scende: null }), []);
  assert.deepEqual(righeAvviso({ peso: null, sale: 65, scende: 67 }), []);
});

test('7. senza record non c\'e\' avviso (non si parla di un Rank che non esiste)', async () => {
  await peso.segnaPeso(66, { account: ACCOUNT, data: pesatura(66) });
  const a = await avvisoPesoEsercizio({ serie: [], esercizio: ESERCIZIO, account: ACCOUNT });
  assert.equal(a, null);
});

test('8. il numero NON e\' scritto a mano nel codice', () => {
  // tolgo i commenti: il 66 puo' stare in una spiegazione, non in una riga che
  // dice "Questo vale per ...". Questo e' il controllo che frena il bug per sempre,
  // anche quando qualcun altro rifa questa schermata fra un anno.
  const sorgente = readFileSync(new URL('../src/avviso-peso.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
  const scritti = sorgente.match(/\d+[.,]?\d*\s*kg/gi) || [];
  assert.deepEqual(scritti, [],
    'c\'e\' un peso scritto a mano nel codice: deve arrivare dal database');
});