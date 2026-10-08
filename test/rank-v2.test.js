// rank-v2.test.js -- il motore nuovo, provato PRIMA che diventi il Rank vero.
//
// Ste (07/10/2026): "procedi prima creando la struttura e mostrando i nuovi
// valori/soglie per gli esercizi, senza modificare ancora il codice del Rank".
//
// Quindi qui non c'e' ancora nessun uso nell'app: sono i calcoli, provati da soli.
// E l'ultimo test controlla la cosa che Ste ha chiesto esplicitamente: che il
// Rank VECCHIO sia rimasto identico.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const curve = await import('../src/rank-v2/curve.js');
const scalata = await import('../src/rank-v2/scalata.js');
const valori = await import('../src/rank-v2/valori.js');
const misura = await import('../src/rank-v2/misura.js');
const v2 = await import('../src/rank-v2/index.js');
const { ESERCIZI } = await import('../src/dati-iniziali.js');
const { recordEsercizio } = await import('../src/rank.js');

const CHEST = ESERCIZI.find((e) => /chest press/i.test(e.nome));
const LAT_RAISE = ESERCIZI.find((e) => /cable lateral raise/i.test(e.nome));

// ---------------------------------------------------------------------------
// 1. La curva delle ripetizioni
// ---------------------------------------------------------------------------

test('V1. ogni ripetizione conta, ma meno della precedente, e non satura MAI', () => {
  const uno = curve.ripetizioniPiene(1);
  const cinque = curve.ripetizioniPiene(5);
  const otto = curve.ripetizioniPiene(8);
  const venti = curve.ripetizioniPiene(20);
  const quaranta = curve.ripetizioniPiene(40);
  assert.equal(uno, 1, 'una ripetizione vale una ripetizione piena');
  assert.ok(cinque > otto * 0.6 && cinque < otto, '5 ripetizioni valgono meno di 8');
  assert.ok(otto > cinque, 'la progressione 40x6 -> 40x8 -> 40x10 deve sentire qualcosa');
  // il punto del sistema nuovo rispetto a quello vecchio: qui non c'e' il tetto
  // "peso x 4,3" oltre le 30 ripetizioni. Quindi 40 rip valgono piu' di 30
  assert.ok(quaranta > venti, 'la curva cresce anche oltre 30 ripetizioni (nel vecchio era bloccata)');
  assert.ok(venti < otto * 2, 'ma raddoppiare le ripetizioni non raddoppia il punteggio');
});

test('V2. il volume non cresce oltre il 20%, e una serie sola non da\' niente', () => {
  assert.equal(curve.moltiplicatoreSerie(1), 1, 'una serie: niente premio');
  assert.equal(curve.moltiplicatoreSerie(2), 1.10, 'due serie: +10%');
  assert.equal(curve.moltiplicatoreSerie(3), 1.16, 'tre serie: +16%');
  assert.equal(curve.moltiplicatoreSerie(4), 1.20, 'quattro serie: +20%');
  assert.equal(curve.moltiplicatoreSerie(30), 1.20,
    'trenta serie valgono come quattro: il volume da solo non compra Rank');
});

test('V3. la meccanica sposta al massimo il 10%, e la carrucola dimezza', () => {
  const solo = curve.fattoreMeccanica({});
  assert.equal(solo, 1, 'senza meccanica non si tocca niente');
  const stack = curve.fattoreMeccanica({ attrezzatura: 'macchina_stack' });
  assert.ok(stack > 1 && stack <= 1.10, `la macchina a stack sposta ${stack}`);
  assert.equal(curve.caricoReale(40, { carrucola: 'carrucola_doppia' }), 20,
    'doppia carrucola: 40 sul foglio sono 20 sentiti');
  assert.equal(curve.caricoReale(40, { carrucola: 'carrucola_mono' }), 40,
    'carrucola singola: il numero resta com\'e\'');
  assert.equal(curve.caricoReale(40, { convenzione: 'per_braccio' }), 40,
    'per braccio: il numero resta quello che ha scritto lui');
});

test('V4. lo score NON e\' il massimale stimato', () => {
  const s = curve.scoreSerie({ peso: 45, ripetizioni: 8, esercizio: CHEST });
  // 45 kg x 8 = 290 kg-equivalenti (6,46 rip piene), NON 57 kg di "1RM"
  assert.equal(s.carico, 45);
  assert.equal(s.ripetizioniPiene, 6.458);
  assert.ok(s.score > 200 && s.score < 400,
    `lo score deve stare nell'ordine di grandezza del lavoro fatto, non del 1RM: ${s.score}`);
  // e le due cose non coincidono: se coincidessero staremmo usando il 1RM
  const comeSeFosse1RM = 45 * (1 + 8 / 30);
  assert.notEqual(Math.round(s.score), Math.round(comeSeFosse1RM),
    'lo score deve essere diverso dal massimale stimato');
});

// ---------------------------------------------------------------------------
// 2. Le soglie
// ---------------------------------------------------------------------------

test('V5. le soglie vanno dall\'ingresso al vertice, e sono SEVERE', () => {
  const soglie = scalata.soglieDaValori({ ingresso: 40, vertice: 100 });
  assert.equal(soglie[0], 40, 'BRONZE = ingresso');
  assert.equal(soglie[6], 100, 'OLYMPIAN = vertice');
  // severita': i gradini alti devono essere piu' larghi di quelli bassi, altrimenti
  // i Rank alti si prendono con niente
  const bassi = soglie[3] - soglie[0];
  const alti = soglie[6] - soglie[3];
  assert.ok(alti > bassi,
    `dal PLATINUM all'OLYMPIAN ci deve essere piu' strada che dal bronzo al platino: ${alti} contro ${bassi}`);
  for (let i = 1; i < soglie.length; i++) {
    assert.ok(soglie[i] > soglie[i - 1], 'le soglie crescono sempre');
  }
});

test('V6. il volume fa salire gli LP dentro il Rank, ma non compra il Rank da solo', () => {
  const soglie = scalata.soglieDaValori({ ingresso: 100, vertice: 300 });
  // soglie: 100 / 120 / 148 / 184 / 220 / 256 / 300
  const mediocre = 130; // dentro il Rank 2, ma sotto il 92% della soglia dopo (136)
  assert.equal(scalata.rankDaScore(mediocre, soglie).indice, 1, 'la serie migliore da sola: indice 1');
  const colVolume = scalata.rankDaScore(mediocre, soglie, { serieFatte: 4 });
  assert.equal(colVolume.indice, 1, '4 serie NON comprano il Rank: la prestazione e\' mediocre');
  assert.equal(colVolume.volumeBloccato, true, 'e l\'app deve poterlo dire');
  // ma i LP salgono: il lavoro delle serie non sparisce
  assert.ok(colVolume.lp > scalata.rankDaScore(mediocre, soglie).lp,
    'le serie spengono gli LP anche quando non cambiano il Rank');
  // e se la serie migliore e\' davvero vicina alla soglia, il volume puo\' far salire
  const vicino = Math.round(soglie[2] * 0.99 * 100) / 100;
  const su = scalata.rankDaScore(vicino, soglie, { serieFatte: 4 });
  assert.equal(su.volumeBloccato, false, 'qui la serie e\' al 99% della soglia: il volume puo\' spingere');
  assert.ok(su.indice > scalata.rankDaScore(vicino, soglie).indice,
    'e infatti sale di un gradino');
});

test('V7. nessun Rank sopra i tetti di realta\'', () => {
  // isolamento: 0,85 per uno. Il numero dichiarato era 30 kg per 70 kg di persona,
  // quindi sotto. Provo con un numero assurdo e vedo che il tetto vince
  const assurdo = { vertice: 500, quotaIngresso: 0.3 };
  const tre = valori.sogliePerEsercizio(assurdo, 'isolamento', 70);
  assert.ok(tre.vertice <= 70 * 0.85 + 0.01,
    `un isolamento non puo' avere vertice sopra 0,85 per uno: ${tre.vertice}`);
  assert.equal(tre.tettoRaggiunto, true, 'e deve dire che il tetto ha morso');
  // i pesanti invece arrivano a 2,2 per uno
  const pesante = valori.sogliePerEsercizio({ vertice: 1000, quotaIngresso: 0.3 }, 'grande', 70);
  assert.ok(pesante.vertice <= 70 * 2.2 + 0.01, 'nemmeno un pesante puo\' superare 2,2 per uno');
});

test('V8. il peso corporeo sposta le soglie, ma il tetto tiene', () => {
  const v = valori.VALORI_MOVIMENTO.spinta_orizzontale;
  const piccolo = valori.sogliePerEsercizio(v, 'composto', 50);
  const grande = valori.sogliePerEsercizio(v, 'composto', 90);
  assert.ok(grande.vertice > piccolo.vertice, 'un corpo pi\' grande ha il vertice pi\' alto');
  assert.ok(piccolo.ingresso > 0 && grande.ingresso > 0);
  assert.equal(valori.sogliePerEsercizio(v, 'composto', 0), null, 'senza peso non si inventa niente');
});

// ---------------------------------------------------------------------------
// 3. Misurare su di te, con i freni
// ---------------------------------------------------------------------------

test('V9. quattro risposte NON spostano niente (era il tuo dubbio)', () => {
  const quattro = Array.from({ length: 4 }, () => ({ caricoReale: 60, risposta: 'massimo' }));
  const r = misura.affinaVertice({ verticeDichiarato: 95, risposte: quattro, pesoCorporeo: 70 });
  assert.equal(r.mosso, false, 'quattro risposte non spostano una soglia');
  assert.equal(r.vertice, 95, 'il numero resta quello dichiarato');
  assert.ok(r.servono > 0, 'e dice quante risposte mancano');
});

test('V10. risposte in disaccordo NON spostano niente', () => {
  const rumore = [
    { caricoReale: 60, risposta: 'facile' },
    { caricoReale: 60, risposta: 'normale' },
    { caricoReale: 60, risposta: 'massimo' },
    { caricoReale: 60, risposta: 'facile' },
    { caricoReale: 60, risposta: 'normale' },
  ];
  const r = misura.affinaVertice({ verticeDichiarato: 95, risposte: rumore, pesoCorporeo: 70 });
  assert.equal(r.mosso, false, 'nessuna maggioranza: non si muove niente');
  assert.match(r.motivo, /d'accordo/, 'e dice perche\'');
});

test('V11. cinque risposte concordi spostano il numero di un PEZZO, non tutto', () => {
  const risposte = Array.from({ length: 5 }, () => ({ caricoReale: 60, risposta: 'massimo' }));
  const dichiarato = 95;
  const r = misura.affinaVertice({ verticeDichiarato: dichiarato, risposte, pesoCorporeo: 70 });
  assert.equal(r.mosso, true, 'cinque risposte d\'accordo spostano il numero');
  assert.ok(r.vertice < dichiarato, 'se "60 kg era il massimo", il vertice scende');
  assert.ok(Math.abs(dichiarato - r.vertice) <= dichiarato * misura.PASSO + 0.01,
    `ma di un pezzo solo (${misura.PASSO}), non tutto: ${dichiarato} -> ${r.vertice}`);
});

test('V12. il numero non puo\' scivolare via dal dichiarato (mai piu\' del 25%)', () => {
  const risposte = Array.from({ length: 20 }, () => ({ caricoReale: 10, risposta: 'massimo' }));
  const dichiarato = 95;
  const r = misura.affinaVertice({ verticeDichiarato: dichiarato, risposte, pesoCorporeo: 70 });
  assert.ok(r.vertice >= dichiarato * (1 - misura.SCARTO_MAX) - 0.01,
    `il vertice non puo' scendere sotto il 25% di scarto: ${r.vertice} contro ${dichiarato}`);
  assert.ok(r.vertice <= dichiarato * (1 + misura.SCARTO_MAX) + 0.01,
    'e non puo\' salire oltre il 25% di scarto');
});

test('V13. il tetto di realta\' vince sulle risposte', () => {
  // risposte che direbbero un vertice assurdo su un isolamento
  const risposte = Array.from({ length: 10 }, () => ({ caricoReale: 200, risposta: 'massimo' }));
  const r = misura.affinaVertice({
    verticeDichiarato: 30, risposte, livello: 'isolamento', pesoCorporeo: 70,
  });
  assert.equal(r.tettoMesso, true, 'la misura supera il tetto: deve restare scritto');
  assert.ok(r.vertice <= 70 * 0.85 + 0.01, 'e il numero non supera il tetto');
});

// ---------------------------------------------------------------------------
// 4. Il motore completo, e la prova che il Rank vecchio non si e\' mosso
// ---------------------------------------------------------------------------

test('V14. la valutazione completa restituisce Rank, soglie e da dove vengono', () => {
  const serie = [{ id: 's', esercizio_id: CHEST.id, stato: 'fatta', peso: 40, ripetizioni: 8, spotter: false, carrucola: null }];
  const r = v2.valutaEsercizio({ esercizio: CHEST, serie, pesoCorporeo: 66 });
  assert.equal(r.valido, true);
  assert.equal(r.movimento, 'spinta_orizzontale');
  assert.equal(r.soglie.length, 7, 'sette soglie, una per Rank');
  assert.ok(r.soglie[0] < r.soglie[6], 'e vanno dal basso all\'alto');
  assert.equal(r.fonte, 'tuo', 'la fonte del numero e\' scritta: non e\' un numero inventato');
  assert.ok(r.affinamento, 'e c\'e\' anche il verdetto sull\'affinamento');
});

test('V15. l\'esercizio a ripetizioni non viene valutato in kg (e lo dice)', () => {
  const trazioni = ESERCIZI.find((e) => /pull ups/i.test(e.nome));
  const r = v2.valutaEsercizio({ esercizio: trazioni, serie: [], pesoCorporeo: 66 });
  assert.equal(r.valido, false);
  assert.match(r.motivo, /ripetizioni/, 'deve dire PERCHE\' non puo\' valutarlo in kg');
});

test('V16. il Rank VECCHIO non si e\' mosso: sui lateral raise e\' ancora quello di prima', () => {
  // Ste: "non modificare arbitrariamente i Rank gia\' esistenti". Qui il Rank vecchio
  // deve dire ESATTAMENTE quello che diceva: e\' il controllo che nessuno abbia
  // cambiato il Rank mentre preparavo quello nuovo.
  const serie = [{
    id: 's', esercizio_id: LAT_RAISE.id, stato: 'fatta',
    peso: 40, ripetizioni: 8, spotter: false, carrucola: 'carrucola_doppia',
  }];
  const vecchio = recordEsercizio(serie, LAT_RAISE, null, 66);
  assert.equal(vecchio.rank.nome, 'OLYMPIAN',
    'il vecchio dice ancora OLYMPIAN: se questo test fallisce, qualcuno ha toccato il Rank vecchio');
  // e il nuovo dice un'altra cosa, che e' esattamente il punto della proposta
  const nuovo = v2.valutaEsercizio({ esercizio: LAT_RAISE, serie, pesoCorporeo: 66 });
  assert.notEqual(nuovo.rank.nome, 'OLYMPIAN',
    'il nuovo sistema non regala l\'OLYMPIAN su 20 kg per lato di alzate laterali');
});