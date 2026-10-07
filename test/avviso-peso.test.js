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
  avvisoPesoEsercizio, righeAvviso, confiniPerIlRank, kgTesto, pesoCheToccaSoglia,
} = await import('../src/avviso-peso.js');
const { profiloEsercizio, profiloPerPesoCorporeo } = await import('../src/rank-config.js');
const { ESERCIZI } = await import('../src/dati-iniziali.js');

const ACCOUNT = 'account-peso-test';
/** un esercizio qualsiasi: il nome non conta, la scala conta */
const ESERCIZIO = ESERCIZI.find((e) => /Panca piana|Leg press|Lat machine|Dip/i.test(e.nome)) || ESERCIZI[0];

/** una serie fatta con `kg` al bilanciere, senza peso corporeo salvato dentro */
function serieCon(kg, ripetizioni = 8, id = 's1') {
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
    serie: [serieCon(25)], esercizio: ESERCIZIO, account: ACCOUNT,
  });
  assert.ok(a, 'col peso vecchio l\'avviso deve esserci');
  const testo = a.righe.join(' ');
  assert.match(testo, /Questo vale per 66 kg\./, 'la prima riga dice il peso registrato');
  assert.match(testo, /tocchi il livello dopo/, 'e dice a che peso sali');
  assert.match(testo, /lo perdi/, 'e a che peso perdi');
  assert.match(testo, /aggiornalo/, 'e finisce dicendo cosa fare');
});

test('2. col peso fresco l\'avviso sparisce (serveAggiornare decide, non un controllo nuovo)', async () => {
  await peso.segnaPeso(66, { account: ACCOUNT, data: new Date().toISOString().slice(0, 10) });
  const a = await avvisoPesoEsercizio({
    serie: [serieCon(25)], esercizio: ESERCIZIO, account: ACCOUNT,
  });
  assert.equal(a, null, 'peso aggiornato ieri: l\'avviso non serve e non deve comparire');
});

test('3. IL TESTE CHE BLOCCA IL BUG: cambio il peso nel database, il numero cambia', async () => {
  // la serie non ha il peso corporeo dentro, quindi la scala la ricalcola ogni volta
  // con il peso di adesso: e' il caso fragile, ed e' quello che Ste fa ogni volta
  // che si pesa.
  await peso.segnaPeso(66, { account: ACCOUNT, data: pesatura(66) });
  const prima = await avvisoPesoEsercizio({
    serie: [serieCon(25)], esercizio: ESERCIZIO, account: ACCOUNT,
  });
  assert.match(prima.righe.join(' '), /66 kg/);

  // adesso mi peso 72 kg, e l'avviso deve cambiare numero
  await peso.segnaPeso(72, { account: ACCOUNT, data: pesatura(72, 39) });
  const dopo = await avvisoPesoEsercizio({
    serie: [serieCon(25)], esercizio: ESERCIZIO, account: ACCOUNT,
  });
  assert.match(dopo.righe.join(' '), /72 kg/, 'il peso nuovo deve comparire');
  assert.doesNotMatch(dopo.righe.join(' '), /66 kg/,
    'e il peso vecchio NON: se resta, il numero e\' scritto a mano');
  assert.notEqual(dopo.righe.join(' '), prima.righe.join(' '),
    'l\'avviso deve essere un altro avviso, non lo stesso testo');

// e adesso la parte scomoda, che e' anche la piu' vera: con la STESSA prestazione
  // e 6 kg in piu' il Rank scende di una riga. E' esattamente per questo che il
  // peso e' fragile: non e' che il numero cambia da solo, e' che cambia la fascia
  // in cui stai senza che tu abbia sollevato un grammo in piu'.
  const base = profiloEsercizio(ESERCIZIO);
  // la prossima riga da raggiungere: la prima soglia sopra la prestazione
  const prossimaRiga = (w) => profiloPerPesoCorporeo(base, w).soglie
    .findIndex((s) => s > dopo.record.punteggio);
  assert.notEqual(dopo.record.rank.nome, prima.record.rank.nome,
    'pesando di piu\' senza aver fatto una serie in piu\', il Rank non puo\' restare identico');
  assert.notEqual(prossimaRiga(72), prossimaRiga(66),
    'e deve essere cambiato anche il gradino da raggiungere: la prestazione vale meno di prima');
  // il peso in cui tocchi QUELLA riga, invece, non dipende dalla pesatura di oggi
  // (vedi confiniPerIlRank): quello che cambia e' la riga che stai inseguendo
  assert.equal(pesoCheToccaSoglia(base, prossimaRiga(72), dopo.record.punteggio), dopo.confini.sale,
    'il peso in cui tocchi la prossima riga e\' lo stesso qualunque sia il peso di oggi');
});

test('4. l\'avviso e il Rank leggono la stessa scala (stessa funzione)', async () => {
  await peso.segnaPeso(66, { account: ACCOUNT, data: pesatura(66) });
  const serie = [serieCon(25)];
  const a = await avvisoPesoEsercizio({ serie, esercizio: ESERCIZIO, account: ACCOUNT });
  const base = profiloEsercizio(ESERCIZIO);
  const scalaDelRecord = profiloPerPesoCorporeo(base, a.peso).soglie;
  const mine = confiniPerIlRank(base, a.record.punteggio, scalaDelRecord);
  assert.equal(mine.sale, a.confini.sale, 'il peso per salire deve essere lo stesso');
  assert.equal(mine.scende, a.confini.scende, 'il peso per perdere deve essere lo stesso');
  // e il confine ha un senso: pesando quel peso la prestazione tocca davvero la
  // soglia. Non e' una stima, e' l'uguaglianza risolta.
  //
  // Tolleranza di un centesimo perche' le soglie sono arrotondate a 0,01 kg: sono
  // una scala scritta, non una formula continua, quindi al confine la riga e' o
  // quella giusta o quella subito sotto. pretendere di piu' sarebbe inventare una
  // precisione che la scala non ha.
  const gradinoSale = scalaDelRecord.findIndex((s) => s > a.record.punteggio);
  const scalaAlConfine = profiloPerPesoCorporeo(base, a.confini.sale).soglie;
  assert.ok(Math.abs(scalaAlConfine[gradinoSale] - a.record.punteggio) <= 0.0100001,
    `a ${a.confini.sale} kg la soglia doveva essere la prestazione, non ${scalaAlConfine[gradinoSale]}`);
  const scalaAlConfine2 = profiloPerPesoCorporeo(base, a.confini.scende).soglie;
  assert.ok(Math.abs(scalaAlConfine2[gradinoSale - 1] - a.record.punteggio) <= 0.0100001,
    `a ${a.confini.scende} kg la soglia sotto doveva essere la prestazione`);
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