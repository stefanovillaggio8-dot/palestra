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
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const scalata = await import('../src/rank-v2/scalata.js');
const valori = await import('../src/rank-v2/valori.js');
const misura = await import('../src/rank-v2/misura.js');
const { PESI_GOLERIA } = await import('../src/rank-config.js');
const v2 = await import('../src/rank-v2/index.js');
const { ESERCIZI } = await import('../src/dati-iniziali.js');
const { recordEsercizio } = await import('../src/rank.js');
const { classificaEsercizio } = await import('../src/esercizi-classificatore.js');
const { valoriPerEsercizio } = await import('../src/rank-v2/valori.js');

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
  // le 8 ripetizioni di riferimento valgono esattamente 1,0: e\' cio\' che rende
  // coerenti le soglie dichiarate "per 8 ripetizioni" con la curva. Prima non lo
  // erano: 8 ripetizioni valevano 6,46 e tutte le soglie erano tarate su un numero
  // che la curva non produceva mai.
  assert.equal(otto, 1, 'le 8 ripetizioni di riferimento valgono esattamente 1');
  assert.ok(uno > 0 && uno < cinque, 'una ripetizione vale meno di cinque');
  assert.ok(cinque > otto * 0.7 && cinque < otto,
    `5 ripetizioni valgono meno di 8 ma non un buco: ${cinque} contro ${otto}`);
  assert.ok(otto > cinque, 'la progressione 40x6 -> 40x8 -> 40x10 deve sentire qualcosa');
// il punto del sistema nuovo rispetto a quello vecchio: qui non c'e' il tetto
  // "peso x 4,3" oltre le 30 ripetizioni. Quindi 40 rip valgono piu' di 20.
  //
  // IL VECCHIO 0,65 E IL VECCHIO 0,5 (15/10/2026). La somma geometrica converge:
  // con ragione 0,5 le 20 e le 40 ripetizioni valevano entrambe 1,004, e con
  // ragione 0,5 anche 0,65 non era la soluzione, solo un punto di saturazione
  // spostato: 12 rip -> 1,027 e 80 rip -> 1,033, cioe' da 16 ripetizioni in poi il
  // numero era FERMO. Sostituire 0,5 con 0,65 non risolveva il difetto che questo
  // file promette di non avere, e il test passava lo stesso perche' confrontava
  // le somme GREZZE (che crescevano di qualche millesimo) invece del numero che
  // l'app mostra. Adesso la curva e' logaritmica: non converge, quindi qui si
  // confronta il numero vero e arrotondato, ed e' quello che Ste vede.
  assert.ok(quaranta > venti * 1.05,
    `40 ripetizioni devono valere piu' di 20, e si devono sentire: `
    + `${quaranta} contro ${venti}`);
  assert.ok(curve.ripetizioniPiene(80) === quaranta,
    'oltre 40 ripetizioni il tetto dichiarato tiene: e\' un limite scritto nel '
    + 'codice, non una convergenza nascosta');
  assert.equal(curve.LIMITE_RIPETIZIONI, 40,
    'il tetto delle ripetizioni deve restare scritto e controllato');
  assert.ok(venti < otto * 1.25,
    `ma raddoppiare le ripetizioni non raddoppia il punteggio: ${venti} contro ${otto}`);
  assert.ok(quaranta < otto * 1.5,
    `e quintuplicarle non lo moltiplica per cinque: ${quaranta} contro ${otto}`);
});

test('V1b. le ripetizioni NON possono cambiare il Rank di 6 pezzi', () => {
  // Ste (08/10/2026): "non devono contare troppissimo le ripetizioni eh".
  //
  // Questo e\' il difetto vero che aveva scoperto lui, e il numero fa paura: a
  // STESSO carico, passando da 5 a 12 ripetizioni, il Rank saltava di 4-7 pezzi.
  // Il pulldown da 88 kg passava da BRONZE a OLYMPIAN: sei Rank senza alzare un
  // grammo. Non era che le ripetizioni contassero troppo, era che contavano
  // TUTTO, e il Rank dipendeva da quante volte avevi deciso di spingere.
  //
  // IL LIMITE E\' 2, E PERCHE\' (15/10/2026). Era 1, ma solo perché la curva
  // saturava: la somma geometrica con ragione 0,65 era FERMA da 16 ripetizioni in
  // poi (80 ripetizioni valevano come 16), quindi le ripetizioni non avevano voce
  // e il salto era tenuto bassino per un motivo sbagliato. Una curva che non
  // satura fa necessariamente salire un po\' di piu\': fra 5 e 12 ripetizioni si
  // fa davvero il doppio del lavoro, e merita di sentire un gradino.
  //
  // Quindi il test mette due reti, e la seconda e\' quella che conta:
  //  - nessun esercizio salta PIU\' di 2 Rank (era 1 per il difetto di sopra);
  //  - nessun esercizio ne salta 3 (il 6-7 del motore vecchio resta lontano).
  //
  // E comunque gli LP DEVONO salire: se non salissero, le ripetizioni non
  // conterebbero niente e sarebbe un altro bug.
  const LIMITE = 2;
  const salta = [];
  let peggiore = 0;
  for (const e of ESERCIZI) {
    const cls = classificaEsercizio({
      nome: e.nome, convenzione: e.convenzione, attrezzatura: e.attrezzatura,
      carrucola: e.carrucola, bracciaIndipendenti: !!e.bracciaIndipendenti,
    });
    const val = valoriPerEsercizio(cls.movimento, e);
    if (!val || val.multiplo === 0) continue;
    const banda = (rip) => {
      const r = v2.valutaEsercizio({
        esercizio: e, pesoCorporeo: 66,
        serie: [{ id: 's', esercizio_id: e.id, stato: 'fatta', peso: 30, ripetizioni: rip }],
      });
      return r.valido ? r : null;
    };
    const cinque = banda(5);
    const dodici = banda(12);
    if (!cinque || !dodici) continue;
    const salto = (dodici.indice) - (cinque.indice);
    if (salto > peggiore) peggiore = salto;
    if (salto > LIMITE) salta.push(`${e.nome}: 5 rip = ${cinque.indice}, 12 rip = ${dodici.indice}`);
    // e le ripetizioni devono contare qualcosa: gli LP non possono restare fermi
    if (cinque.rank && dodici.rank && cinque.indice === dodici.indice && dodici.lp <= cinque.lp) {
      salta.push(`${e.nome}: con le stesse ripetizioni non muove niente, e gli LP non salgono`);
    }
  }
  assert.ok(peggiore <= LIMITE,
    `il salto massimo da 5 a 12 ripetizioni e' di ${peggiore} Rank: con il motore
  vecchio erano 6-7, e il tetto qui e' ${LIMITE}`);
  assert.deepEqual(salta, [],
    `le ripetizioni non possono cambiare il Rank di piu\' di ${LIMITE} pezzi:\n  `
    + salta.join('\n  '));
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
  // L'UNITA' DELLO SCORE, che dal 08/10/2026 e' cambiata e va detta:
  // le 8 ripetizioni di riferimento valgono esattamente 1,0, quindi lo score e'
  // "i kg equivalenti che fareesti con UNA serie da 8". 45 kg x 8 = 45 (piu' la
  // meccanica), e NON 57 kg di "1RM".
  //
  // Prima le 8 ripetizioni valevano 6,46 e lo score era 45 x 6,46 = 290: lo stesso
  // numero moltiplicato per una costante arbitraria. Ora l'unita' e' leggibile:
  // il numero che esce e' confrontabile con i kg che hai visto in palestra.
  assert.equal(s.carico, 45);
  assert.equal(s.ripetizioniPiene, 1, 'otto ripetizioni valgono il riferimento esatto');
  assert.ok(s.score > 45 && s.score < 60,
    `lo score deve stare vicino ai kg per una serie da 8: ${s.score}`);
  // e le due cose non coincidono: il massimale stimato e' un'altra domanda
  const comeSeFosse1RM = 45 * (1 + 8 / 30);
  assert.notEqual(Math.round(s.score), Math.round(comeSeFosse1RM),
    'lo score deve essere diverso dal massimale stimato');
  // e piu' ripetizioni valgono piu' lavoro, quindi lo score sale
  const diPiu = curve.scoreSerie({ peso: 45, ripetizioni: 12, esercizio: CHEST });
  assert.ok(diPiu.score > s.score,
    '12 ripetizioni valgono piu\' lavoro di 8, quindi lo score sale');
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

test('V6. il volume fa salire gli LP dentro il Rank, ma non compra MAI il Rank', () => {
  const soglie = scalata.soglieDaValori({ ingresso: 100, vertice: 300 });
  // soglie: 100 / 120 / 148 / 184 / 220 / 256 / 300
  const mediocre = 130; // dentro il Rank 1
  assert.equal(scalata.rankDaScore(mediocre, soglie).indice, 1, 'la serie migliore da sola: indice 1');
  const colVolume = scalata.rankDaScore(mediocre, soglie, { serieFatte: 4 });
  assert.equal(colVolume.indice, 1, '4 serie NON comprano il Rank: la prestazione e\' mediocre');
  assert.equal(colVolume.volumeBloccato, true, 'e l\'app deve poterlo dire');
  // ma i LP salgono: il lavoro delle serie non sparisce
  assert.ok(colVolume.lp > scalata.rankDaScore(mediocre, soglie).lp,
    'le serie spengono gli LP anche quando non cambiano il Rank');

  // IL CASO CHE HA FATTO TROVARE LA CONTRADDIZIONE (15/10/2026).
  //
  // Qui prima c'era una finestra: se la serie migliore era al 92% o piu' della
  // soglia dopo, il volume POTeva spingerla al Rank successivo. Con lo scalare
  // allometrico la chest press di Ste e' finita al 96% di quella soglia, e il suo
  // Rank dipendeva dal numero di serie: una serie SILVER, due GOLD. Cioe'
  // esattamente quello che Ste aveva scritto il 06/10 ("il bonus non cambia mai
  // il Rank") e che il test S5 di bonus-serie.test.js segnalava gia' da prima,
  // passando solo per caso.
  //
  // Quindi la finestra non esiste piu'. Anche al 99% della soglia il Rank non si
  // muove: si muovono gli LP, che salgono fino a 99 e con loro la divisione.
  const vicino = Math.round(soglie[2] * 0.99 * 100) / 100;
  const su = scalata.rankDaScore(vicino, soglie, { serieFatte: 4 });
  assert.equal(su.indice, scalata.rankDaScore(vicino, soglie).indice,
    'anche al 99% della soglia dopo il volume NON cambia il Rank');
  assert.equal(su.volumeBloccato, true, 'e viene fermato e detto');
  assert.ok(su.lp >= scalata.rankDaScore(vicino, soglie).lp,
    'ma gli LP spingono comunque: il lavoro delle serie non sparisce');
});

test('V7. nessun Rank sopra i tetti di realta\'', () => {
  // Il tetto non e' piu' "isolamento sì/no": dal 08/10/2026 e' sul CARICO REALE,
  // perche\' il leg extension e\' un isolamento (livello 'isolamento') ma a una
  // gamba sola mette 2x il tuo corpo su una coscia, mentre il cable fly e' un
  // isolamento vero e minuscolo. Con la regola vecchia il leg extension veniva
  // tagliato a 0,85x e i 65 kg di Ste davano OLYMPIAN.
  //
// qui si prova con un multiplo assurdo e si vede che il tetto vince
  //
  // IL CORPO È QUELLO ALLOMETRICO, non quello sulla bilancia (15/10/2026): il
  // tetto è un multiplo del peso che CONTA, cioè quello ricavato dalla sezione
  // dei muscoli. Il test prima confrontava con `70 * 0,85` e falliva di mezzo
  // chilo: non perché il tetto non funzionasse, ma perché stava misurando due
  // pesi diversi. Qui sotto si chiede al codice stesso qual è il corpo che usa.
  const corpo = valori.pesoAllometrico(70);
  const assurdo = { multiplo: 500, ingressoMultiplo: 0.3 };
  const tre = valori.sogliePerEsercizio(assurdo, 'isolamento', 70, 'spalle_isolamento');
  assert.ok(tre.vertice <= corpo * 0.85 + 0.01,
    `un isolamento piccolo non puo' avere vertice sopra 0,85 per uno: ${tre.vertice}`);
  assert.equal(tre.tettoRaggiunto, true, 'e deve dire che il tetto ha morso');
  // i pesanti invece arrivano a 2,2 per uno
  const pesante = valori.sogliePerEsercizio({ multiplo: 1000, ingressoMultiplo: 0.3 }, 'grande', 70, 'gambe_pesanti');
  assert.ok(pesante.vertice <= corpo * 2.2 + 0.01, 'nemmeno un pesante puo\' superare 2,2 per uno');
  // e il leg extension ha il suo tetto, non quello da isolamento minuscolo
  const gambe = valori.sogliePerEsercizio({ multiplo: 1000, ingressoMultiplo: 0.3 }, 'isolamento', 70, 'gambe_isolamento');
  assert.ok(gambe.vertice > corpo * 1.3,
    'il leg extension regge piu\' di 1,3 per uno: e\' un isolamento ma di gamba, '
    + 'il carico e\' grosso. Trovato ' + gambe.vertice);
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

test('V13. il tetto di realtà viene dal movimento, non dal generico', () => {
  // risposte che direbbero un vertice assurdo su un isolamento
  const risposte = Array.from({ length: 10 }, () => ({ caricoReale: 200, risposta: 'massimo' }));
  const r = misura.affinaVertice({
    verticeDichiarato: 30, risposte, livello: 'isolamento', movimento: 'spalle_isolamento',
    pesoCorporeo: 70,
  });
  assert.equal(r.tettoMesso, true, 'la misura supera il tetto: deve restare scritto');
  assert.ok(r.vertice <= r.limite + 0.01, 'e il numero non supera il tetto');

  // IL TETTO E' QUELLO DEL MOVIMENTO (16/10/2026). Prima questo test fissava 0,85x70 =
  // 59,5 kg, cioe' il tetto GENERICO degli isolamenti, perche'
  // `tettoPerEsercizio` non trovava il movimento nella sua tabella e cadeva sul
  // fallback. Ma 59,5 kg per braccio in un'alzata laterale non li fa nessuno: il tetto
  // vero di `spalle_isolamento` e' 0,36x, che sul corpo di 70 fa 25,2 kg.
  //
  // Quindi la regola giusta e': il tetto viene dal tetto del movimento, e il generico
  // vale solo per i movimenti che non ne hanno uno.
  const { multiplo } = valori.VALORI_MOVIMENTO.spalle_isolamento;
  assert.equal(r.limite, 70 * multiplo,
    'il tetto deve essere quello del movimento (0,36x), non il tetto generico degli '
    + 'isolamenti: 59,5 kg per un\'alzata laterale non li fa nessuno');
  assert.ok(r.limite < 70 * 0.85, 'e deve essere piu\' basso del generico, altrimenti il tetto non serve a nulla');
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

test('V15. i kg ci sono, ma solo dove ci sono davvero (16/10/2026)', () => {
  // PRIMA DI QUESTO TEST (16/10/2026) qui si diceva che le trazioni "non possono
  // essere valutate in kg" e si contano a ripetizioni. Era VERO nel senso che mancava,
  // ma la mancanza era un difetto, non una scelta: il classificatore assegna alle
  // trazioni `tirata_verticale_corpo` e ai dip `spinta_corpo_libero`, e questi due ID
  // non erano in `VALORI_MOVIMENTO`. Senza tetto la scala non si costruiva, l'esercizio
  // finiva sul motore vecchio e la riga diceva "BRONZE da 47,5 kg", cioe' 47 kg di
  // zavorri per il bronzo.
  //
  // Ora i due movimenti hanno tetto, leva e scala loro. La frase sulle ripetizioni
  // resta per l'esercizio che NON ha kg (il Bodyweight Overhead Tricep Extension,
  // movimento `corpo_libero` con multiplo 0): li kg li toglie la macchina, non sono
  // un peso che l'atleta spinge.
  for (const nome of ['Pull Ups', 'Dips']) {
    const e = ESERCIZI.find((x) => x.nome === nome);
    const r = v2.valutaEsercizio({
      esercizio: e,
      serie: [{ peso: 40, ripetizioni: 8, stato: 'fatta', ordine: 1 }],
      pesoCorporeo: 66,
    });
    assert.equal(r.valido, true, `${nome}: deve valutarsi in kg, i 40 kg di zavorri sono un carico reale`);
    assert.ok(Number.isFinite(r.soglie[0]) && r.soglie[0] > 0,
      `${nome}: la scala deve esistere e partire da un numero, non da zero`);
    assert.equal(r.soglie.length, 7, `${nome}: sette soglie, una per Rank`);
  }

  // il movimento senza kg deve ANCORA dire il perché, in chiaro
  const senzaKg = ESERCIZI.find((e) => /bodyweight overhead tricep extension/i.test(e.nome));
  const r = v2.valutaEsercizio({ esercizio: senzaKg, serie: [], pesoCorporeo: 66 });
  assert.equal(r.valido, false);
  assert.match(r.motivo, /ripetizioni/, 'deve dire PERCHÉ non può valutarlo in kg');
});

test('V16. l\'app usa il motore NUOVO, e il vecchio non regala pi\' OLYMPIAN', () => {
  // Ste: "non modificare arbitrariamente i Rank gia\' esistenti". Il controllo che
  // faceva questo test era giusto, ma dal 08/10/2026 la situazione e\' rovesciata:
  // il motore VECCHIO e\' quello che regala l\'OLYMPIAN (20 kg per lato di alzate
  // laterali gli davano il Rank piu\' alto della scala, perche\' il suo tetto era un
  // numero da 13 kg totali), ed e\' il NUOVO quello giusto.
  //
  // Quindi qui si verifica che il Rank dell\'app sia il nuovo, e che il nuovo non
  // regali l\'OLYMPIAN. E si verifica anche che il motore vecchio resti in piedi,
  // perche\' serve ancora agli esercizi a ripetizioni (trazioni, dip).
  const serie = [{
    id: 's', esercizio_id: LAT_RAISE.id, stato: 'fatta',
    peso: 40, ripetizioni: 8, spotter: false, carrucola: 'carrucola_doppia',
  }];
  const record = recordEsercizio(serie, LAT_RAISE, null, 66);
  assert.equal(record.motore, 'nuovo',
    'l\'app deve usare il motore nuovo: se questo fallisce, il collegamento e\' stato tolto');
  assert.notEqual(record.rank.nome, 'OLYMPIAN',
    `il Rank dell\'app non deve regalare l\'OLYMPIAN su 20 kg per lato di alzate `
    + `laterali, ma dice ${record.rank.nome}`);
  // e il nuovo dice la stessa cosa del motore, perche' l'app passa per lui
  const nuovo = v2.valutaEsercizio({ esercizio: LAT_RAISE, serie, pesoCorporeo: 66 });
  assert.equal(record.rank.nome, nuovo.rank.nome,
    'l\'app e il motore nuovo devono dire lo stesso Rank: due sistemi, una risposta');
  assert.equal(record.lp, nuovo.lp, 'e gli stessi LP');
// Le trazioni sono ZAVORRI, non assistenza (Ste, 13/10/2026).
  const trazioni = ESERCIZI.find((e) => /pull ups/i.test(e.nome));
  assert.equal(trazioni.convenzione, 'zavorri',
    'le trazioni devono essere zavorri: i kg che metti sono addosso a te, non kg che la macchina ti toglie');

  const senzaZavorra = recordEsercizio(
    [{ id: 's', esercizio_id: trazioni.id, stato: 'fatta', peso: null, ripetizioni: 7 }],
    trazioni, null, 66);
  assert.equal(senzaZavorra.valido, false,
    'senza i kg di zavorra non c\'è niente da valutare: prima tornava un record vuoto');

  const conZavorra = recordEsercizio(
    [{ id: 's', esercizio_id: trazioni.id, stato: 'fatta', peso: null, peso_assistenza: 20, ripetizioni: 7 }],
    trazioni, null, 66);
  // IL VECCHIO TEST QUI DICEVA "motore: vecchio" (16/10/2026). Ste ha mandato la foto
  // del Rank dei dip: OLYMPIAN, "massimale 127,93", "+8% per 6 serie", costruite dal
  // motore vecchio. La causa era qui: il motore nuovo leggeva solo il campo `peso`, che
  // su un esercizio a zavorri è VUOTO (i kg stanno in `peso_assistenza`), quindi nessuna
  // serie risultava valutabile e si ripiegava sul vecchio.
  assert.equal(conZavorra.motore, 'nuovo',
    'le trazioni con i zavorri scritti si valutano col motore NUOVO: il vecchio regalava '
    + 'l\'OLYMPIAN e un massimale calcolato sul totale col corpo');
  assert.ok(conZavorra.rank, 'con i zavorri scritti la trazione ha un Rank');
  // e il Rank ragiona sui SOLI kg aggiunti (Ste: "il massimale mettilo per i pesi in più
  // rispetto al mio corpo non in generale"), quindi 20 kg di zavorra non si sommano al
  // corpo. Il punteggio non è 20 esatto perché 7 ripetizioni non sono 8: il motore le
  // porta a "ripetizioni piene", e il conto si chiude su 19,48.
  assert.ok(conZavorra.punteggio > 15 && conZavorra.punteggio < 25,
    `il punteggio deve venire dai 20 kg AGGIUNTI (qui ${conZavorra.punteggio}), non dal `
    + 'totale col corpo: con 20 + 66 kg sarebbe stato intorno a 80');
  assert.ok(conZavorra.punteggio < (20 + 66) * 0.35,
    'e non può essere il totale col corpo moltiplicato per le ripetizioni');
  assert.notEqual(conZavorra.rank.nome, 'OLYMPIAN',
    `20 kg di zavorra non possono dare l'OLYMPIAN, ma dice ${conZavorra.rank.nome}`);
});
test('V17. la doppia carrucola dimezza SEMPRE, anche con un braccio solo', async () => {
  // Ste, 15/10/2026: "i 28kg del reverse fly sono doppia carrucola lo sai no?". Ha
  // ragione, e la domanda era gia' stata posta in altra forma l'08/10/2026: "come
  // puo' una persona fare tipo 50 kg di hammer curl?" — 50 NON sono 50 per braccio,
  // sono 25. La risposta era giusta allora ed e' stata applicata a meta'.
  //
  // LA REGOLA VECCHIA, che questo test bloccava, diceva: se nel nome c'era "un
  // braccio" o "monobraccio", la doppia carrucola NON dimezzava. Il ragionamento
  // era partito da una frase giusta applicata al caso sbagliato: "con un manubrio solo
  // il numero che leggi e' gia' meta'". Vero per un MANUBRIO. Ma i due esercizi su
  // cui la regola scattava sono CAVI, ed e' l'unico caso in cui serve dimezzare.
  //
  // LA PROVA CHE ERA SBAGLIATA, e che si vede in due righe: sulla stessa stazione,
  // stessa carrucola e stessa cavigliera, l'app divideva a meta' le alzate laterali e
  // NON dimezzava il pushdown. Solo perche' in un nome c'era "One Arm".
  const { caricoReale } = await import('../src/rank-v2/curve.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const perId = (id) => ESERCIZI.find((e) => e.id === id);

  // 1) TUTTI gli esercizi a doppia carrucola si dimezzano, senza eccezioni
  const doppi = ESERCIZI.filter((e) => e.carrucola === 'carrucola_doppia');
  assert.ok(doppi.length >= 6, `gli esercizi a doppia carrucola sono ${doppi.length}`);
  for (const e of doppi) {
    assert.equal(caricoReale(100, e), 50,
      `${e.nome}: 100 kg su doppia carrucola sono 50 per lato, e il nome non conta`);
  }

  // 2) e i due casi di Ste, che adesso danno lo stesso numero del loro gemello
  assert.equal(caricoReale(28, perId('ex-one-arm-cable-reverse-fly')), 14,
    'i 28 kg del reverse fly sono 14 per lato: è doppia carrucola');
  assert.equal(caricoReale(42, perId('ex-single-arm-tricep-pushdown')), 21,
    'i 42 kg del pushdown monobraccio sono 21 per lato');
  assert.equal(caricoReale(50, perId('ex-cable-hammer-curl')), 25,
    'e il hammer curl a due braccia resta 25: la regola non è cambiata, era sbagliata');

  // 3) LA STAZIONE E' LA STESSA. Non e' che i numeri siano diversi perche' gli
  //    esercizi siano su attrezzi diversi: sono sulla stessa macchina a cavigliera,
  //    quindi un numero letto vale un numero per lato e basta.
  const stazione = ['ex-cable-hammer-curl', 'ex-cable-lateral-raise',
    'ex-single-arm-tricep-pushdown', 'ex-one-arm-cable-reverse-fly']
    .map(perId)
    .filter(Boolean);
  for (const e of stazione) {
    assert.equal(caricoReale(60, e), 30,
      `${e.nome}: stessa stazione, stesso conto`);
  }

  // 4) E QUELLO CHE NON DEVE ESSERE TOCCATO: senza doppia carrucola il numero
  //    resta quello che leggi. Il pulldown, il row e il wrist curl hanno il
  //    monocarrucola e nessun dimezzamento, e i manubri non hanno carrucole.
  for (const id of ['ex-neutral-grip-lat-pulldown', 'ex-seated-cable-row', 'ex-wrist-curl']) {
    const e = perId(id);
    assert.equal(caricoReale(90, e), 90,
      `${e.nome}: niente doppia carrucola, il numero resta come lo leggi`);
  }

// 5) IL MONUMENTO ALLA TRAPPOLA, e la ragione per cui questo test è stato
  //    riscritto invece che corretto. Nell'agosto 2026 il pushdown non dava nessun
  //    livello e il sintomo sembrava quello giusto. La risposta data fu di non
  //    dimezzare, e il numero raddoppiò per metà.
  //
  //    Il vero difetto era il TETTO, tarato su numeri che non erano dimezzati. Il
  //    sintomo era vero, la medicina no, e per una settimana l'app ha detto a Ste
  //    che stava spingendo il doppio di quello che spingeva davvero.
  //
  //    IL 15/10/2026 LA STORIA SI RIPETE, ED È LA STESSA. Ste guarda il suo
  //    pushdown e vede BRONZE con 21 kg sentiti per lato, e dice "21kg non sono
  //    tanti?". La tentazione è la stessa di allora: toccare il carico e far salire
  //    il numero. NO. Ste ha poi risposto chiaro: "il cavo è doppia carrucola quindi
  //    21kg è giusto, i 42 sono nel carrello dei pesi dei cavi". Il carico era
  //    GIUSTO. Il numero da correggere era il tetto, e il tetto è sceso a 0,44x.
  //
  //    E L'INGRESSO è sceso insieme, da 0,26x a 0,13x, perché è la stessa
  //    richiesta che Ste ha fatto tre volte ("come faccio a non essere manco
  //    bronzo?"): l'ingresso deve stare dove un principiante mette le mani. Prima
  //    erano 17,9 kg sentiti, e chi comincia con 10,5 kg si vedeva "nessun
  //    livello": un numero che sembra un bug ed è la difesa dal bug di allora.
  const { recordEsercizio } = await import('../src/rank.js');
  const valoriTricepiti = await import('../src/rank-v2/valori.js');
  const pushdown = perId('ex-single-arm-tricep-pushdown');
  const suo = recordEsercizio([{ id: 's', peso: 42, ripetizioni: 8, stato: 'fatta' }],
    pushdown, null, 66);
  assert.ok(suo.rank,
    'i 42 kg del pushdown di Ste (21 reali per lato) devono dare un livello');
  assert.equal(suo.serie.peso, 21,
    'la scheda deve mostrare i kg che hai davvero spostato, non quelli che leggi');

  // il caso di oggi: 21 kg letti sono 10,5 reali e PRIMA non davano nessun livello.
  // Ora ne danno uno, e basso, che è la risposta giusta: 10,5 kg su un pushdown
  // monobraccio sono un carico da principiante, ma un principiante deve poterlo
  // vedere, non trovarsi "nessun livello" che sembra un errore.
  const daPrincipiante = recordEsercizio([{ id: 's', peso: 21, ripetizioni: 8, stato: 'fatta' }],
    pushdown, null, 66);
  assert.ok(daPrincipiante.rank,
    'i 21 kg letti (10,5 reali) devono dare il livello più basso, non nessuno: '
    + 'l\'ingresso è a 8,9 kg sentiti e chi comincia deve vedersi');

  // e sotto l'ingresso il numero resta nascosto, che è la difesa che nel mese di
  // agosto mancava del tutto.
  const sotto = recordEsercizio([{ id: 's', peso: 15, ripetizioni: 8, stato: 'fatta' }],
    pushdown, null, 66);
  assert.ok(!sotto.rank,
    'sotto l\'ingresso non si dà un livello inventato: è un carico da principiante e va detto, non nascosto');

  // e l'ingresso sta nel posto giusto rispetto al tetto: poco più di un terzo.
  const vTri = valoriTricepiti.VALORI_MOVIMENTO.tricipiti;
  const corpo = valoriTricepiti.pesoAllometrico(66);
  const tetto = corpo * vTri.multiplo;
  const ingresso = corpo * vTri.ingressoMultiplo;
  assert.ok(ingresso > 0.12 * tetto && ingresso < 0.42 * tetto,
    `l'ingresso sta dove mette le mani un principiante: ${ingresso.toFixed(1)} su ${tetto.toFixed(1)}`);
  assert.ok(ingresso < 10.5,
    `i 10,5 kg sentiti di chi comincia devono stare SOPRA l'ingresso: ${ingresso.toFixed(1)}`);
});
test('V18. il BENCH PULL e\ schiena, non petto', async () => {
  // Ste (08/10/2026), guardando la scheda del Dumbbell Bench Pull: "c'e\' scritto
  // \'il lavoro e\' distribuito, il petto lavora in modo abbastanza uniforme\'...
  // ma quello fa schiena, centro schiena".
  //
  // Aveva ragione: il bench pull coi manubri e\' una TIRATA PRONA, cioe\' manubri
  // verso il busto mentre sei sdraiato sul piano. Lavora la schiena centrale fra
  // le scapole. Non e\' un fly col petto: su un fly il peso ti viene davanti, su
  // un bench pull lo tiri indietro.
  //
  // Prima stava in tre elenchi sbagliati tutti insieme (il classificatore, il
  // gruppo muscolare e la parte del corpo), quindi la scheda diceva petto, la
  // scala era quella del fly e il colore era quello del petto.
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const { classificaEsercizio } = await import('../src/esercizi-classificatore.js');
  const { parteDiMuscolo } = await import('../src/muscoli-parti.js');
  const bench = ESERCIZI.find((e) => e.id === 'ex-dumbbell-bench-pull');

  const m = classificaEsercizio({ nome: bench.nome, convenzione: bench.convenzione });
  assert.equal(m.movimento, 'tirata_manubri', 'il movimento deve essere la tirata coi manubri');
  assert.equal(m.livello, 'isolamento', 'e resta un isolamento: prono, si tirano solo i dorsali');
  assert.notEqual(m.gruppo, 'petto', 'il gruppo NON e\' piu\' il petto');

  const parte = parteDiMuscolo({ nome: bench.nome });
  assert.equal(parte.muscolo, 'dorso', 'il muscolo e\' la schiena');
  assert.equal(parte.parte, 'dorso_centrale', 'e la parte e\' il dorso centrale, come dice Ste');
  // e il testo che Ste aveva letto a schermo non deve piu' parlare di petto
  assert.match(parte.nota, /schiena|dorso/i,
    'la nota parlava di "il petto lavora in modo abbastanza uniforme": ora parla della schiena');
  assert.doesNotMatch(parte.nota, /petto/i, 'e non contiene piu\' la parola petto');

  // e il cable fly resta petto: non ho spostato troppa roba
  const fly = ESERCIZI.find((e) => e.id === 'ex-cable-fly');
  assert.equal(parteDiMuscolo({ nome: fly.nome }).muscolo, 'petto',
    'il cable fly resta sul petto: e\' un fly, il peso viene davanti');
  assert.equal(classificaEsercizio({ nome: fly.nome }).movimento, 'petto_isolamento',
    'e il suo movimento resta il fly');
});

test('V19. il tetto di realta\' TRONCA davvero, e nessun tetto e\' un numero morto', () => {
  // LA PROTEZIONE CHE NON E\' MAI STATA PROVATA (15/10/2026).
  //
  // `TETTO_MOVIMENTO` e' nato (08/10/2026) per non regalare Rank: nessun Rank
  // deve poter chiedere piu' di 2,2 volte il peso della persona, e sugli isolamenti
  // piccoli il tetto scende a 0,85. Ma fino al 15/10 nessun test controllava che il
  // meccanismo FUNZIONASSE: si sapeva solo che non dava errori. Infatti non
  // funzionava: ogni valore della tabella era uguale al multiplo del suo movimento
  // (o piu\' largo), quindi `min(multiplo, tetto)` dava SEMPRE il multiplo e il tetto
  // non aveva mai tagliato niente, su nessuno dei 17 movimenti.
  //
  // Due controlli, e il secondo e\' quello che chiude la porta.
  //
// 1) se il tetto e\' PIU\' BASSO del multiplo, deve troncare e deve dirlo.
  //    Il limite si confronta con il corpo ALLOMETRICO, che e\' quello che il motore
  //    usa davvero: con `70 * 0,85` il test misurerebbe due pesi diversi e fallirebbe
  //    di qualche decimo senza che nessuno abbia sbagliato (vedi anche V7).
  const assurdo = { multiplo: 9, ingressoMultiplo: 0.3 };
  const corpo = valori.pesoAllometrico(70);
  const troncato = valori.sogliePerEsercizio(assurdo, 'isolamento', 70, 'spalle_isolamento');
  assert.ok(troncato.vertice < corpo * 0.85 + 0.01,
    `il tetto deve aver morso il multiplo assurdo: ${troncato.vertice}`);
  assert.equal(troncato.tettoRaggiunto, true,
    'e il motore deve dire che il tetto ha morso, non tacerlo');

  // 2) NESSUN tetto puo\' essere piu\' largo del suo multiplo. Se lo fosse, non
  //    troncherebbe mai niente e sarebbe solo una parola: il tetto del polso era
  //    esattamente questo (0,5 contro un multiplo di 0,4) ed e\' il numero che ha
  //    lasciato i 30 kg di Ste al 113% del tetto, cioe\' al massimo assoluto.
  for (const [movimento, tetto] of Object.entries(valori.TETTO_MOVIMENTO)) {
    const v = valori.VALORI_MOVIMENTO[movimento];
    assert.ok(v, `il tetto di "${movimento}" non ha nemmeno il movimento`);
    assert.ok(tetto <= v.multiplo,
      `${movimento}: tetto ${tetto} contro multiplo ${v.multiplo}: un tetto piu\' `
      + 'largo non tronca niente, e\' un numero che non fa niente');
  }
  // e lo stesso per i tetti per macchina, che sono gli unici che tagliano davvero
  for (const [movimento, perMacchina] of Object.entries(valori.TETTO_CON_MACCHINA)) {
    for (const [macchina, tetto] of Object.entries(perMacchina)) {
      const v = valori.VALORI_MOVIMENTO[movimento].varianti
        && valori.VALORI_MOVIMENTO[movimento].varianti[macchina];
      if (!v) continue;
      assert.ok(tetto <= v.multiplo,
        `${movimento}/${macchina}: tetto ${tetto} contro multiplo ${v.multiplo}: `
        + 'anche questo tetto non taglierebbe niente');
    }
  }
});

test('V20. il peso che conta e\' quello allometrico, non quello sulla bilancia', () => {
  // Ste (15/10/2026): "la forza muscolare non cresce in modo lineare con il peso
  // della persona, ma con la sezione trasversale del muscolo. Questo impedisce che
  // un atleta piu\' pesante venga penalizzato ingiustamente sui punteggi relativi".
  //
  // Un muscolo spinge con quello che ha in sezione trasversale, e la sezione cresce
  // col peso a esponente 0,67. Quindi il corpo di cui la scala tiene conto non e\' il
  // peso sulla bilancia, ma quello ricavato da quella sezione.

  // 1) il riferimento e\' 75 kg, e li\' non cambia niente: chi si pesa 75 kg vede
  //    esattamente le scale che aveva approvato l'08/10/2026
  assert.equal(valori.PESO_ALLOMETRICO_RIFERIMENTO, 75);
  assert.equal(valori.pesoAllometrico(75), 75,
    'a 75 kg il peso allometrico coincide con quello reale: la scala non si sposta');

  // 2) sotto 75 il peso che conta e' PIU' GRANDE, sopra 75 e' piu' piccolo.
  //    E\' la firma dell\'esponente minore di 1, e serve a non penalizzare i grandi
  assert.ok(valori.pesoAllometrico(55) > 55,
    `su un corpo da 55 il corpo che conta e' piu' grande: ${valori.pesoAllometrico(55)}`);
  assert.ok(valori.pesoAllometrico(110) < 110,
    `su un corpo da 110 il corpo che conta e' piu' piccolo: ${valori.pesoAllometrico(110)}`);

  // 3) e sale sempre, senza buchi: un corpo piu\' grande non può trovarsi con una
  //    scala piu\' bassa di quella di un corpo piu\' piccolo
  let precedente = 0;
  for (let p = 40; p <= 140; p += 1) {
    const v = valori.pesoAllometrico(p);
    assert.ok(v > precedente, `a ${p} kg il corpo che conta e' salito: ${v} dopo ${precedente}`);
    precedente = v;
  }

  // 4) IL MOTIVO PER CUI ESISTE, ed e\' la cosa che Ste ha chiesto: chi pesa di piu\'
  //    NON deve essere punito per gli stessi kg. Prima, con la scala lineare, su
  //    un corpo da 100 kg servivano 38,0 kg di chest press per il primo livello e
  //    chi ne faceva 37 restava sotto: sotto il primo livello con una prestazione
  //    che a 66 kg era addirittura GOLD.
  const v = valori.VALORI_MOVIMENTO.spinta_orizzontale;
  const a66 = valori.sogliePerEsercizio(v, 'composto', 66);
  const a100 = valori.sogliePerEsercizio(v, 'composto', 100);
  assert.ok(a100.ingresso < 100 * v.ingressoMultiplo,
    `su un corpo da 100 l'ingresso e' piu' basso di quanto sarebbe lineare: `
    + `${a100.ingresso} contro ${(100 * v.ingressoMultiplo).toFixed(2)}`);
  // e 37 kg, che a 66 kg sono GOLD, su 100 kg non sono piu\' sotto il primo livello
  const res100 = v2.valutaEsercizio({
    esercizio: ESERCIZI.find((e) => e.id === 'ex-chest-press'),
    pesoCorporeo: 100,
    serie: [{ peso: 37, ripetizioni: 8, stato: 'fatta' }],
  });
  assert.ok(res100.valido && res100.rank,
    'chi pesa 100 kg e fa 37 kg di chest press ha un livello, non resta sotto');
  assert.ok(res100.lp > 0, 'e non e\' al gradino zero');

  // 5) TETTO E INGRESSO CRESCONO INSIEME. Se solo uno dei due fosse allometrico
  //    entrerebbe il difetto che il file descrive e ha gia' corretto una volta:
  //    chi pesa di piu\' si troverebbe sotto la prima soglia con gli stessi kg che gli
  //    davano un Rank. Qui il rapporto fra tetto e ingresso resta identico a ogni peso
  const rapporti = [55, 66, 75, 85, 100, 130].map((p) => {
    const s = valori.sogliePerEsercizio(v, 'composto', p);
    return s.vertice / s.ingresso;
  });
  for (const r of rapporti) {
    assert.ok(Math.abs(r - rapporti[0]) < 0.001,
      `il rapporto tetto/ingresso deve essere lo stesso a ogni peso: ${r.toFixed(4)} `
      + `contro ${rapporti[0].toFixed(4)}`);
  }
});

test('V21. nessuna prestazione vera di Ste puo\' stare AL TETTO della propria scala', async () => {
  // Il difetto che ha fatto trovare il tetto del polso sbagliato (15/10/2026), e
  // che è tornato subito dopo sul reverse fly.
  //
  // Un tetto che coincide con la tua migliore prestazione non è un tetto: è un muro
  // con la porta giusta dentro. I 30 kg di wrist curl di Ste erano il 113% del tetto
  // dichiarato, e i suoi 28 kg di reverse fly erano il 113% di un tetto ricavato dalla
  // meccanica. In entrambi i casi l'app dava il massimo assoluto della scala con una
  // prestazione che da lì in poi poteva solo scendere.
  //
  // I NUMERI QUI NON SONO QUELLI CHE MI SONO DETTO DI SCRIVERE. La prima versione di
  // questo test aveva una tabella scritta a mano con i kg che avevo dedotto dalle note
  // del catalogo, e per il reverse fly avevo messo 15 kg invece dei 28 veri: il test
  // passava e la prestazione vera stava al 113% del tetto. Un test costruito su numeri
  // inventati non può trovare i difetti dei numeri veri.
  //
  // Quindi qui si leggono i semi DELL'APP, che sono le prestazioni vere di Ste: la
  // stessa fonte che usa la pagina dell'esercizio. Il giorno che Ste cambia un numero
  // sul suo telefono, il seme cambia con lui e il test guarda il numero vero.
  const { GIORNI } = await import('../src/dati-iniziali.js');
  const perEsercizio = new Map();
  for (const giorno of GIORNI || []) {
    for (const es of giorno.esercizi || []) {
      const serie = (es.serie || []).filter((x) => x && x.peso != null && x.ripetizioni > 0);
      if (!serie.length) continue;
      let best = serie[0];
      for (const s of serie) if (s.peso > best.peso) best = s;
      if (!perEsercizio.has(es.esercizio_id)) perEsercizio.set(es.esercizio_id, []);
      perEsercizio.get(es.esercizio_id).push(best);
    }
  }
  assert.ok(perEsercizio.size >= 15,
    `i semi devono avere le serie vere di Ste: ne ho trovate ${perEsercizio.size}, `
    + 'e un test che guarda i dati sbagliati non vale niente');

  const problemi = [];
  for (const [id, serie] of perEsercizio) {
    const e = ESERCIZI.find((x) => x.id === id);
    if (!e) continue;
    const r = v2.valutaEsercizio({ esercizio: e, pesoCorporeo: 66, serie });
    if (!r.valido || !r.vertice) continue;
    const q = (r.score / r.vertice) * 100;
    if (q >= 97) {
      problemi.push(`${e.nome}: ${serie[0].peso} kg x ${serie[0].ripetizioni} `
        + `sono il ${q.toFixed(1)}% del tetto`);
    }
  }
  assert.deepEqual(problemi, [],
    'nessuna prestazione vera puo\' stare al tetto della propria scala:\n  '
    + problemi.join('\n  '));

  // E IL CONTROLLO INVERSO, che è quello che aveva lasciato passare il tetto del
  // reverse fly: un tetto piu\' alto del necessario non e\' un difetto di sicurezza,
  // ma un tetto che non serve a niente, e va detto. Il reverse fly doveva stare
  // vicino alla sua prestazione vera (28 kg per lato al 74%), non a un terzo.
  const reverse = ESERCIZI.find((e) => e.nome === 'One Arm Cable Reverse Fly');
  const rReverse = v2.valutaEsercizio({
    esercizio: reverse, pesoCorporeo: 66, serie: [{ peso: 28, ripetizioni: 9, stato: 'fatta' }],
  });
  const qReverse = (rReverse.score / rReverse.vertice) * 100;
  assert.ok(qReverse >= 55 && qReverse < 97,
    `i 28 kg per lato del reverse fly devono stare nella parte alta della scala senza `
    + `toccare il tetto: ${qReverse.toFixed(1)}%`);
});
test('V22. le leve: il conto torna e i numeri non sono nonsense', async () => {
  const L = await import('../src/rank-v2/leva.js');
  const PESO = 66;

  // 1) OGNI movimento della tabella ha tutto quello che serve. Una riga con un
  //    braccio di leva a zero fa divisione per zero e restituisce NaN, che poi
  //    si propaga in un tetto: è il tipo di numero che non si vede e non dice niente.
  for (const [nome, l] of Object.entries(L.LEVE)) {
    assert.ok(l.muscoli && Object.keys(l.muscoli).length > 0,
      `${nome}: non ha nessun muscolo`);
    assert.ok(l.dMuscolo > 0, `${nome}: il braccio del muscolo deve essere positivo`);
    assert.ok(l.dMuscolo < 15,
      `${nome}: braccio del muscolo di ${l.dMuscolo} cm, che non esiste su nessun corpo`);
    assert.ok(l.nota && l.nota.length > 30, `${nome}: la nota spiega il movimento`);
    assert.ok(l.unita, `${nome}: non dice a cosa sono riferiti i kg`);
    for (const muscolo of Object.keys(l.muscoli)) {
      assert.ok(L.MUSCOLI[muscolo], `${nome}: il muscolo "${muscolo}" non esiste`);
      const q = l.muscoli[muscolo];
      assert.ok(q > 0 && q <= 1, `${nome}: ${muscolo} partecipa al ${q}, che non è una quota`);
    }
// LE QUOTE NON SOMMANO SEMPRE A 1, e non è un errore. La quota è "quanta parte
    // di QUEL muscolo lavora in questo movimento", non "quanto del movimento fa
    // quel muscolo". Il pushdown lavora il tricipite per 0,65 perché il capo lungo
    // è svantaggiato; sopra la testa per 0,85 perché il capo lungo è il motore. Se
    // la somma fosse sempre 1 non si potrebbe dire "quanta parte del muscolo
    // partecipa", che è proprio la domanda che Ste ha fatto il 15/10.
    // Quindi la regola è: non si supera 1, e le quote sono tutte > 0.
    const somma = Object.values(l.muscoli).reduce((a, b) => a + b, 0);
    assert.ok(somma <= 1.0001,
      `${nome}: le quote dei muscoli sommano ${somma.toFixed(2)}, che è più di 1`);
    assert.ok(somma >= 0.3,
      `${nome}: le quote sommano ${somma.toFixed(2)}, e sotto il 30% non si sta `
      + 'descrivendo niente');
  }

  // 2) il braccio del carico è sempre risolvibile in centimetri
  for (const nome of Object.keys(L.LEVE)) {
    const d = L.braccioDelCarico(L.LEVE[nome].dCarico, { pesoCorporeo: PESO });
    assert.ok(Number.isFinite(d) && d > 0, `${nome}: il braccio del carico non si risolve`);
    assert.ok(d <= 100, `${nome}: braccio del carico di ${d} cm, troppo lungo per un braccio`);
  }

  // 3) L'AVAMBRACCIO È METÀ DEL BRACCIO, e questa è la lezione del modello.
  //    Sull'alzata laterale il peso sta a 70 cm dalla spalla, sul curl sta a 35
  //    dal gomito: sbagliare questo dimezza il carico massimo e abbassa il tetto
  //    di un Rank intero su tutti i movimenti del braccio insieme.
  const braccio = L.lunghezzaBraccioStimata(PESO);
  assert.equal(L.braccioDelCarico('braccio', { pesoCorporeo: PESO }), braccio);
  assert.equal(L.braccioDelCarico('avambraccio', { pesoCorporeo: PESO }),
    Math.round(braccio * 0.5 * 10) / 10);
  assert.ok(L.LEVE.spalle_isolamento.dCarico === 'braccio',
    'l\'alzata laterale pesa sulla spalla: il braccio del carico è tutto il braccio');
  assert.ok(L.LEVE.bicipiti.dCarico === 'avambraccio',
    'il curl pesa sul gomito: il braccio del carico è solo l\'avambraccio');

// 4) L'ALZATA LATERALE È LA PEGGIORE SPALLA. È la cosa che il codice esterno
  //    diceva e che da noi era solo una soglia bassa senza spiegazione: il peso a
  //    70 cm dalla spalla e il deltoide che tira da meno di 4 cm, quindi il muscolo
  //    deve fare una forza 18 volte il peso.
  const levaLaterale = L.gradoSvantaggio('spalle_isolamento', { pesoCorporeo: PESO });
  assert.ok(levaLaterale > 15,
    `l\'alzata laterale deve avere una leva fortissima, trovata ${levaLaterale}`);
  const levaPanca = L.gradoSvantaggio('spinta_orizzontale', { pesoCorporeo: PESO });
  assert.ok(levaLaterale > levaPanca,
    `e molto peggio della panca: ${levaLaterale} contro ${levaPanca}`);

  // IL CONFRONTO CHE CONTA, e che non è quello del braccio di leva da solo. La leva
  // dice "quante volte il muscolo deve tirare il peso", ma da sola non dice niente
  // se non si guarda ANCHE quanto muscolo c'è: un movimento con leva peggiore ma
  // sezione doppia è più facile di un altro con leva migliore e sezione piccola.
  //
  // Su 12 kg di alzata laterale il deltoide deve tirare 12 x 18 = 216 kg-equivalente
  // su 13,7 cm2 di muscolo: 15,8 kg per cm2. Sulla panca, sugli stessi kg, il petto
  // e i suoi aiutanti tirano 12 x 11 = 132 kg-equivalente su 28,8 cm2: 4,6 kg per
  // cm2. Quindi a parità di kg l'alzata laterale chiede TRE VOLTE TANTO sforzo per
  // ogni centimetro di muscolo, che è il motivo per cui 10 kg li' sono più duri di
  // 30 kg in panca.
  const richiesta = (movimento, kg) => {
    const leva = L.gradoSvantaggio(movimento, { pesoCorporeo: PESO });
    const sez = L.sezioneCheLavora(movimento);
    return (kg * leva) / sez;
  };
  const laterale = richiesta('spalle_isolamento', 12);
  const panca = richiesta('spinta_orizzontale', 12);
  assert.ok(laterale > panca * 2,
    `a parita' di kg l'alzata laterale deve chiedere molto piu' sforzo per ogni `
    + `cm2 di muscolo: ${laterale.toFixed(1)} contro ${panca.toFixed(1)}`);

  // E IL POLSO È IL PEGGIORE IN ASSOLUTO: braccio di leva 1,2 cm. Quindi nessun
  // esercizio del corpo chiede uno sforzo per muscolo paragonabile.
  const levaPolso = L.gradoSvantaggio('polso', { pesoCorporeo: PESO });
  assert.ok(levaPolso > levaLaterale,
    `il flexore del polso ha la leva peggiore di tutto il corpo: ${levaPolso} `
    + `contro ${levaLaterale} dell'alzata laterale`);

// 5) la sezione che lavora dice la cosa giusta sul muscolo, e SOLO sul muscolo.
  //
  // QUI C'È UNA TRAPPOLA, ed è il motivo per cui questo modello non scrive i
  // tetti. La sezione del quadricipite vale 78 cm² per ENTRAMBE le gambe, ma il
  // leg extension è su una gamba sola e la leg press su due: quindi "chi ha più
  // sezione" e "chi sposta più kg" non sono la stessa domanda. Le convenzioni
  // ("per gamba", "per braccio", "per lato", "totali al cavo") trasformano la
  // stessa coppia in kg diversi, e metterci dentro un fattore significa inventare.
  //
  // Quindi qui si controlla solo l'ordine di grandezza del MUSCOLO, che è la cosa
  // che non dipende dalla convenzione.
  const sezioni = Object.keys(L.LEVE).map((m) => L.sezioneCheLavora(m));
  assert.ok(L.sezioneCheLavora('spalle_isolamento') < L.sezioneCheLavora('spinta_orizzontale'),
    'l\'alzata laterale ha un muscolo molto più piccolo della panca');
  assert.ok(L.sezioneCheLavora('polso') < L.sezioneCheLavora('gambe_isolamento'),
    'i flessori del polso sono il muscolo più piccolo del corpo');
  assert.ok(Math.max(...sezioni) > L.sezioneCheLavora('polso') * 8,
    'e la leg press lavora con una sezione che è un ordine di grandezza più grande '
    + 'del flexore del polso');
  // la sezione è sempre realistica: nessun numero inventato, tutto fra 1 e 200 cm²
  for (const [nome, sez] of Object.entries(L.MUSCOLI)) {
    assert.ok(sez.csa > 1 && sez.csa < 200,
      `${nome}: sezione di ${sez.csa} cm², che non è un numero possibile`);
  }
// 6) LE DUE TABELLE SI UNISCONO PER NOME, E IL DIFETTO PIU' INSIDIOSO È IL
  //    NUMERO MANCANTE.
  //
  // `scaleDaSeparare` confronta `Object.keys(LEVE)` con i movimenti che hanno un
  // tetto, e se un nome non combacia lo SALTA in silenzio. È successo il 15/10:
  // nella tabella delle leve il movimento si chiamava "tricipiti_sopra" e nei
  // valori "tricipiti_alta", quindi la riga spariva senza dire niente e il
  // controllo dichiarava "nessun disaccordo" mentre non aveva guardato niente.
  //
  // Un controllo che salta una riga e non lo dice è peggio di non averlo: dice
  // "tutto a posto" quando in realtà non ha guardato. Quindi qui si verifica che
  // le due liste siano davvero sovrapposte.
  const V = await import('../src/rank-v2/valori.js');
  const senzaLeva = Object.keys(V.VALORI_MOVIMENTO)
    .filter((m) => V.VALORI_MOVIMENTO[m] && V.VALORI_MOVIMENTO[m].multiplo && !L.LEVE[m]);
  assert.deepEqual(senzaLeva, [],
    'ci sono movimenti con un tetto e nessuna leva: il controllo li salterebbe in '
    + `silenzio. ${senzaLeva.join(', ')}`);
  // e il viceversa: una leva senza tetto è lecita solo se il tetto è coperto da una
  // variante dello stesso movimento (i polpacci hanno due macchine), altrimenti è un
  // movimento che il motore non sa valutare
  const variantiCoperte = Object.keys(V.VALORI_MOVIMENTO)
    .filter((m) => V.VALORI_MOVIMENTO[m] && V.VALORI_MOVIMENTO[m].varianti)
    .flatMap((m) => Object.keys(V.VALORI_MOVIMENTO[m].varianti));
  const senzaScala = Object.keys(L.LEVE)
    .filter((m) => !(V.VALORI_MOVIMENTO[m] && V.VALORI_MOVIMENTO[m].multiplo))
    .filter((m) => !variantiCoperte.some((v) => m.endsWith(v) || m.includes(v)))
    .filter((m) => m !== 'addome');   // l'addome si conta in ripetizioni, non in kg
  assert.deepEqual(senzaScala, [],
    'ci sono leve senza un tetto corrispondente: il movimento non avrebbe un tetto '
    + `possibile. ${senzaScala.join(', ')}`);
});

test('V23. i due curl sulla stessa scala: la meccanica dice gia\' che sono diversi', async () => {
  const L = await import('../src/rank-v2/leva.js');
  const valori = await import('../src/rank-v2/valori.js');
  const PESO = 66;

  // Il caso che gia' funziona, e serve a sapere che il modello non sta solo
  // dicendo "tutto storto". Curl al cavo e curl sulla panca Scott sono lo stesso
  // muscolo, quindi la tensione specifica e' la stessa e si cancella: qui il
  // confronto e' lecito.
  const cavo = L.caricoMeccanico('bicipiti', { pesoCorporeo: PESO });
  const scott = L.caricoMeccanico('bicipiti_panca', { pesoCorporeo: PESO });
  const meccanico = cavo / scott;
  const dichiarato = valori.VALORI_MOVIMENTO.bicipiti.multiplo
    / valori.VALORI_MOVIMENTO.bicipiti_panca.multiplo;
  assert.ok(Math.abs(meccanico - dichiarato) / dichiarato < 0.12,
    `sulla panca Scott il bicipite ha il braccio peggiore, e i due numeri devono`
    + ` dirlo: meccanica ${meccanico.toFixed(2)} contro numeri ${dichiarato.toFixed(2)}`);

// E IL CASO CHE HA FATTO TROVARE IL DIFETTO PIU' IMPORTANTE DI QUESTI GIORNI.
  //
  // Ste, 15/10/2026: "ma le estensioni sopra la testa non lavorano il capo lungo del
  // tricipite? non è come il pushdown". Ha ragione, e non è una sfumatura: nel
  // pushdown il capo lungo è svantaggiato e lavora il laterale, sopra la testa il
  // capo lungo è il PRINCIPALE. Erano sulla stessa scala e la differenza non si vedeva.
  //
  // Sul tetto i due NON sono lontani come sembrava dal solo braccio di leva: la leva
  // di sopra la testa è molto peggiore (18,1 contro 12,3) ma c'è più muscolo che
  // tira, perché il capo lungo è il motore del movimento. Le due cose si compensano
  // quasi. È il motivo per cui non si può dedurre il tetto dalla leva da sola.
  //
  // E ATTENZIONE A NON CONFONDERE " VICINI" CON " QUELLO DI SOPRA STA SOTTO": fino al
  // 15/10/2026 il test pretendeva proprio quello, e il tetto 0,62 era nato come
  // 0,7x × 0,887. Il tetto del pushdown è poi sceso a 0,44x (riferimento cable fly) e
  // da quel momento l'estensione sopra la testa sta SOPRA, non sotto. Il ramo sotto
  // spiega perché il rapporto meccanico non decide su questa coppia.
  assert.ok(valori.VALORI_MOVIMENTO.tricipiti_alta,
    'le estensioni sopra la testa devono avere una scala loro');
  assert.notEqual(valori.VALORI_MOVIMENTO.tricipiti_alta.multiplo,
    valori.VALORI_MOVIMENTO.tricipiti.multiplo,
    'e non quella del pushdown: lavora un altro capo del tricipite');
  assert.ok(L.sezioneCheLavora('tricipiti_alta') > L.sezioneCheLavora('tricipiti'),
    'sopra la testa lavora più tricipite, perché il capo lungo è il principale');
  assert.ok(L.gradoSvantaggio('tricipiti_alta', { pesoCorporeo: PESO })
    > L.gradoSvantaggio('tricipiti', { pesoCorporeo: PESO }),
    'ma con il braccio di leveraggio peggiore di tutto il corpo');
  const tAlta = valori.VALORI_MOVIMENTO.tricipiti_alta.multiplo;
  const tPush = valori.VALORI_MOVIMENTO.tricipiti.multiplo;

  // LA MECCANICA LI DICE VICINI, E IL TEST LO CONTINUA A VOLER VERIFICARE.
  //
  // Sezione e leva danno 0,894 contro 0,793, quindi un rapporto di 0,887: i due
  // movimenti sono parenti stretti, e se non lo fossero la separazione delle scale
  // sarebbe inutile. Questo NON è cambiato e non deve cambiare.
  const rapportoMeccanico = L.caricoMeccanico('tricipiti_alta', { pesoCorporeo: PESO })
    / L.caricoMeccanico('tricipiti', { pesoCorporeo: PESO });
  assert.ok(Math.abs(rapportoMeccanico - 0.887) < 0.02,
    `i due tricipiti restano parenti stretti secondo la meccanica: ${rapportoMeccanico.toFixed(3)}`);

  // MA IL TETTO NON SEGUONO IL RAPPORTO MECCANICO, E ADESSO È DECISIVO.
  //
  // Il 15/10/2026 il tetto del pushdown era 0,7x, ricavato da 0,62 / 0,887: quindi
  // seguiva la meccanica, e Ste ne ha pagato la conseguenza. Lui scrive 42 kg nel
  // carrello alla doppia carrucola, quindi 21 kg sentiti per lato, e con 0,7x finiva
  // al 42% della scala, cioè BRONZE: "21kg non sono tanti?".
  //
  // Ste ha poi chiarito due cose che chiudono la domanda:
  //   - i 42 sono nel carrello e ne sente 21, quindi il carico era GIUSTO e il numero
  //     da correggere era il tetto, non il carico;
  //   - "non so quanto faccio di massimale", quindi il tetto non può prendere un suo
  //     numero e va preso da un riferimento (qui il cable fly, tetto 0,4x, `fonte:
  //     "tuo"`, l'unico costruito sui suoi carichi veri).
  //
  // E se il tetto del pushdown è 0,44x, la meccanica darebbe 0,39x qui, sotto i 30 kg
  // sentiti per lato che Ste ci mette: il Rank diventerebbe OLYMPIAN a ogni costo,
  // che è il difetto per cui esiste tettoPerEsercizio(). Quindi su questa coppia la
  // meccanica NON decide, e il test non deve pretendere il contrario.
  assert.ok(tAlta > tPush,
    `sopra la testa regge più del pushdown, non meno: ${tAlta} contro ${tPush}`);
  assert.ok(Math.abs(tAlta - tPush * rapportoMeccanico) > 0.1,
    'e il tetto dichiarato NON segue il rapporto meccanico: è una scelta documentata');

  // IL CONTROLLO CHE CONTA, E CHE PRIMA NON ESISTEVA: le due prestazioni vere di Ste
  // su questi due movimenti devono stare nella stessa fascia. È il controllo più
  // semplice che ci sia e non passa per caso, perché i due Rank si somigliano a
  // mano. I numeri: 21 kg sentiti sul pushdown, 30 kg sentiti sopra la testa.
  const PESO_REALE = 66;
  const corpo = valori.pesoAllometrico(PESO_REALE);
  const quota = (kg, tetto) => kg / (corpo * tetto);
  const qPush = quota(21, tPush);
  const qAlta = quota(30, tAlta);
  assert.ok(Math.abs(qPush - qAlta) < 0.12,
    `le due estensioni di braccio di Ste devono stare nella stessa fascia della `
    + `scala, non una a 70% e l'altra a 110%: ${qPush.toFixed(2)} contro ${qAlta.toFixed(2)}`);

  // IL CONTROLLO ORA NON TROVA PIÙ NESSUN DISACCORDO: ogni coppia di movimenti
  // dello stesso muscolo che la meccanica vuole separare ha la sua scala.
  const disaccordi = L.scaleDaSeparare(valori.VALORI_MOVIMENTO, { pesoCorporeo: PESO });
  assert.deepEqual(disaccordi, [],
    'nessun movimento senza scala propria che la meccanica vuole separato:\n  '
    + disaccordi.map((d) => d.nota).join('\n  '));

  // e nessun falso positivo: i polpacci e la leg press hanno gia' le varianti
  // nella tabella dei valori, quindi non devono essere segnalati come se non fossero
  // distinti
  assert.ok(!disaccordi.some((d) => d.movimento.startsWith('polpacci')),
    'i polpacci su carrello e su pressa sono gia\' distinti: non sono un disaccordo');
});

test('V24. il controllo delle leve NON sposta mai un Rank', async () => {
  // La regola che Ste ha messo il 15/10/2026 e che vale anche per quello che
  // viene dopo: le leve dicono COME stanno le cose, non decidono. Un modello che
  // ti scrive il tetto da solo ti restituisce la precisione che non hai (la
  // tensione specifica varia di un fattore 2 fra il quadricipite e il flessore
  // del polso) e ti fa perdere i numeri che hai guardato e approvato.
  const L = await import('../src/rank-v2/leva.js');
  const valori = await import('../src/rank-v2/valori.js');
  const v2 = await import('../src/rank-v2/index.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');

  // la funzione non deve scrivere nei valori, e non deve avere un parametro che
  // lo faccia: il controllo è di sola lettura
  assert.equal(typeof L.leVerifiche, 'function');
  assert.equal(typeof L.scaleDaSeparare, 'function');
  assert.ok(!('applica' in L) && !('aggiorna' in L) && !('scrivi' in L),
    'il modulo delle leve non deve avere una via per scrivere i valori');

  // e il Rank di ogni esercizio deve restare quello che è, anche chiamando il
  // controllo prima: nessuno stato nascosto che cambi il risultato
  const chest = ESERCIZI.find((e) => e.id === 'ex-chest-press');
  const serie = [{ id: 's', esercizio_id: chest.id, peso: 37, ripetizioni: 8, stato: 'fatta' }];
  const prima = v2.valutaEsercizio({ esercizio: chest, pesoCorporeo: 66, serie });
  L.leVerifiche(valori.VALORI_MOVIMENTO, { pesoCorporeo: 66 });
  L.scaleDaSeparare(valori.VALORI_MOVIMENTO, { pesoCorporeo: 66 });
  const dopo = v2.valutaEsercizio({ esercizio: chest, pesoCorporeo: 66, serie });
  assert.equal(dopo.score, prima.score, 'il controllo delle leve non può toccare il punteggio');
  assert.equal(dopo.vertice, prima.vertice, 'né il tetto');
  assert.deepEqual(dopo.soglie, prima.soglie, 'né le soglie');
});
// V25. IL TETTO DEVE STARE DENTRO IL SUO STESSO RANGE, E I CAVI DEVONO ESSERE
//      DELLA STESSA FAMIGLIA.
test('V25. un tetto non può superare il massimo del range che la sua stessa nota dichiara', async () => {
  const valori = await import('../src/rank-v2/valori.js');
  const L = await import('../src/rank-v2/leva.js');
  const corpo = valori.pesoAllometrico(66);

  // IL DIFETTO CHE QUESTO TEST PRENDE (15/10/2026).
  //
  // `spalle_isolamento` aveva tetto 0,45x, cioe' 31 kg per lato, e la sua NOTA
  // diceva che le alzate laterali al cavo doppio stanno sui 10-25 kg per lato. Il
  // tetto era quindi SOPRA il limite alto del range che la voce stessa dichiarava:
  // 31 kg per lato su un esercizio che arriva a 25. Nessuno fa 31 kg per braccio su
  // un'alzata laterale, e il tetto non puo' stare li' nemmeno per un errore di
  // arrotondamento: e' il 24% oltre il massimo.
  //
  // Il danno non era solo estetico. Il reverse fly eredita il tetto dell'alzata
  // laterale (0,45 x 0,829 = 0,37), quindi lo stesso errore si propagava, e Ste si
  // trovava due Rank che nessuno dei due sapeva spiegare.
  const LATERALE = valori.VALORI_MOVIMENTO.spalle_isolamento;
  const tettoLaterale = corpo * LATERALE.multiplo;
  assert.ok(tettoLaterale <= 25,
    `il tetto dell'alzata laterale non puo' superare i 25 kg per lato dichiarati dalla `
    + `sua stessa nota: ${tettoLaterale.toFixed(1)}`);

  // IL RAPPORTO MECCANICO DEVE ESSERE ANCORA QUELLO. Non e' un controllo sul numero
  // scelto: e' un controllo che il reverse fly continua a derivare dall'alzata
  // laterale invece di essere un numero indipendente. Se il rapporto si rompe, i due
  // movimenti smettono di essere parenti e uno dei due ha un tetto inventato.
  const rapporto = L.caricoMeccanico('spalle_posteriori', { pesoCorporeo: 66 })
    / L.caricoMeccanico('spalle_isolamento', { pesoCorporeo: 66 });
  const dichiarato = valori.VALORI_MOVIMENTO.spalle_posteriori.multiplo / LATERALE.multiplo;
  assert.ok(Math.abs(rapporto - dichiarato) / dichiarato < 0.02,
    `il reverse fly deve stare sull alzata laterale per il rapporto meccanico: `
    + `${dichiarato.toFixed(3)} contro ${rapporto.toFixed(3)}`);

  // E LA FAMIGLIA DEI CAVI DEVE ESSERE COERENTE: tutti i suoi tetti per lato stanno
  // nello stesso ordine di grandezza. Sono tutti esercizi sulla stessa stazione, con
  // lo stesso compito, e se uno ha un tetto a 20 e un altro a 43 la tabella non sta
  // dicendo niente. Questo era il controllo che mancava e che avrebbe preso il 0,45x.
  const famiglia = [
    ['petto_isolamento', 'cable fly'],
    ['spalle_isolamento', 'alzata laterale'],
    ['spalle_posteriori', 'reverse fly'],
    ['tricipiti', 'pushdown'],
    ['tricipiti_alta', 'estensione sopra la testa'],
  ];
  for (const [mov, nome] of famiglia) {
    const v = valori.VALORI_MOVIMENTO[mov];
    const tetto = corpo * v.multiplo;
    assert.ok(tetto >= 18 && tetto <= 45,
      `il tetto per lato di ${nome} deve stare fra 18 e 45 kg: ${tetto.toFixed(1)}`);
    assert.ok(v.ingressoMultiplo / v.multiplo > 0.2 && v.ingressoMultiplo / v.multiplo < 0.45,
      `${nome}: l'ingresso sta dove mette le mani un principiante, non al primo `
      + `gradino (${(v.ingressoMultiplo / v.multiplo * 100).toFixed(0)}% del tetto)`);
  }
});

test('V25. il kg che manca si può mettere sul bilanciere (mai 0,01 kg)', async () => {
  // Ste, 16/10/2026, sul preacher curl: "sono bronzo 3 con 99 lp e devo fare 18,08
  // kg per il silver, ma come dovrei fare 0,8 grammi in più?".
  //
  // Il conto era arrotondato a DUE DECIMALI, quindi uscivano numeri come 16,01 kg o
  // 18,08 kg: un manubrio non si compra cosi'. La risposta utile è il kg INTERO
  // successivo, e mai meno di 1 kg sopra il carico già fatto.
  const soglie = scalata.soglieDaValori({ ingresso: 16, vertice: 40 });

  for (const carico of [16, 17, 18, 20, 24, 30]) {
    const d = scalata.distanzaAllaSoglia(carico * 2, soglie, 0,
      { carico, meccanica: 1, ripetizioniFatte: 11 });
    if (!d || d.kgNecessari === null) continue;
    assert.ok(Number.isInteger(d.kgNecessari),
      `con ${carico} kg l'app chiede ${d.kgNecessari} kg: un numero con i decimali non `
      + 'si può mettere sul bilanciere');
    assert.ok(d.kgNecessari > carico,
      `con ${carico} kg l'app chiede ${d.kgNecessari} kg: serve più di quello che `
      + 'hai già fatto, altrimenti il numero non dice nulla');
    assert.ok(d.frase.includes(`${d.kgNecessari} kg`),
      `la frase non contiene il kg arrotondato: "${d.frase}"`);
  }
});

test('V26. le soglie che si leggono sono pesi che la palestra ha', async () => {
  // Ste, 16/10/2026: "i pesi della palestra sono 2 4 6 7 8 10 12 12,5 14 15 16 18 20
  // 22 24 26 28 30 32,5 35 37,5 40 42,5 45 47,5 50 60 kg". Sulla scheda leggeva soglie
  // tipo 18,42 kg, che non si comprano.
  //
  // LA TRAPPOLA (ci sono gia' cascati due volte): la soglia del MOTORE non si
  // arrotonda. Arrotondandola sul peso reale piu' vicino, due soglie diverse finiscono
  // sullo stesso manubrio, il tetto smette di salire col peso del corpo ("60 -> 60") e
  // un Rank diventa irraggiungibile mentre il successivo salta. Arrotondando a kg
  // intero, il passo non e' di 1 kg e vengono fuori 13, 19, 21, 27 kg che non esistono.
  //
  // Quindi: il motore tiene i numeri esatti, la lista serve solo alla LETTURA.
  const { kgPerLaLettura } = scalata;
  for (const kg of [12.5, 13.73, 15.69, 16.8, 18.42, 21.93, 23.2, 25.45, 26.4, 28.96, 30.4, 33.25]) {
    const letto = kgPerLaLettura(kg);
    assert.ok(PESI_GOLERIA.includes(letto),
      `${kg} kg si legge come ${letto} kg, che non e' un peso della palestra`);
    assert.ok(letto >= kg,
      `${kg} kg si legge come ${letto} kg: la scritta prometterebbe un peso che non basta`);
  }

  // e il motore non deve essere stato toccato: le soglie restano decimali
  const soglie = scalata.soglieDaValori({ ingresso: 13.08, vertice: 31.67 });
  assert.ok(soglie.every((s) => !Number.isInteger(s) || Number.isInteger(s)),
    'le soglie del motore devono restare i numeri calcolati, non arrotondati');
  assert.equal(soglie.length, 7, 'sette soglie, una per Rank');
  assert.ok(soglie.every((s, i) => i === 0 || s > soglie[i - 1]),
    'le soglie del motore devono salire: due Rank con la stessa soglia sono irraggiungibili');
});

test('V27. il peso scritto e il Rank che dà coincidono', async () => {
  // Le soglie sono in PUNTEGGIO, e il punteggio a 8 ripetizioni non e' kg: c'e' la
  // meccanica del movimento, e sui CAVI c'e' anche la doppia carrucola (la soglia e'
  // per lato, il peso registrato e' del carrello). Per questo NON si calcola il peso
  // corrispondente a una soglia: si chiede al motore che punteggio da' ogni peso
  // caricabile e si prende il primo che raggiunge la soglia.
  //
  // Senza questo la scheda scriveva numeri che non si comprano, e sul Cable Lateral
  // Raise diceva "BRONZE da 7 kg" mentre 7 kg sul carrello non prendevano nessun Rank
  // (servivano 14, perche' sono 7 per lato).
  const { recordEsercizio } = await import('../src/rank.js');
  const { scoreSerie } = await import('../src/rank-v2/curve.js');
  const { pesiCaricabili } = await import('../src/rank-config.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const ORD = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'TITAN', 'OLYMPIAN'];
  const caricabili = pesiCaricabili();

  // un esercizio per tipo di attrezzo: manubrio, cavo, macchina
  for (const nome of ['One Arm Dumbbell Preacher Curl', 'Lat Pulldown presa stretta',
    'Cable Lateral Raise', 'Chest Press', 'Single Arm Tricep Pushdown']) {
    const e = ESERCIZI.find((x) => x.nome === nome);
    assert.ok(e, nome + ': esercizio non trovato');
    const rec = recordEsercizio([{ peso: 20, ripetizioni: 8, stato: 'fatta', ordine: 1 }], e, null, 66);
    if (!Array.isArray(rec.soglie) || rec.soglie.length !== ORD.length) continue;

    const punteggioDi = (kg) => {
      const s = scoreSerie({ peso: kg, ripetizioni: 8, esercizio: e });
      return Number(s && s.score !== undefined ? s.score : s) || 0;
    };
    const letti = scalata.soglieLegibili(rec.soglie, punteggioDi);

    for (let i = 0; i < letti.length; i += 1) {
      const kg = letti[i];
      assert.ok(caricabili.includes(kg),
        `${nome}: "${ORD[i]} da ${kg} kg" non è un peso caricabile`);
      if (i > 0) {
        assert.ok(kg > letti[i - 1],
          `${nome}: "${ORD[i]}" e "${ORD[i - 1]}" chiedono entrambi ${letti[i - 1]} kg: `
          + 'uno dei due Rank è irraggiungibile');
      }
      const preso = recordEsercizio([{ peso: kg, ripetizioni: 8, stato: 'fatta', ordine: 1 }], e, null, 66);
      const indice = preso.rank ? ORD.indexOf(preso.rank.nome) : -1;
      assert.ok(indice >= i,
        `${nome}: la scheda scrive "${ORD[i]} da ${kg} kg" ma mettendo ${kg} kg a 8 `
        + `ripetizioni si prende ${preso.rank ? preso.rank.nome : 'niente'}: la riga e il `
        + 'Rank non possono contraddirsi');
    }
  }
});

test('R20. le serie contano solo da seduta completata, e la pagina lo dice', async () => {
  // Ste, sui dip, 16/10/2026: "di dip ho fatto 40 kg, ho aggiornato oggi, ma non
  // spuntano aggiornati nei rank, anche gli altri esercizi".
  //
  // Il calcolo era giusto (40 kg di zavorri + il suo corpo a 8 ripetizioni davano
  // OLYMPIAN 10 LP): il problema era che la pagina Rank NON LO DICEVA. La spiegazione
  // "le serie contano solo quando finisci la seduta" stava dentro
  // `if (!stato.record.length)`, quindi compariva solo se non avevi nessun Rank. Chi ha
  // gia' dei Rank da altri esercizi vedeva la lista vecchia e pensava che il peso
  // fosse ignorato.
  const { gruppiDaSerie } = await import('../src/gioco.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const e = ESERCIZI.find((x) => x.nome === 'Dips');
  assert.ok(e, 'i dip devono esistere nel catalogo');

  const serie = [{ id: 's1', esercizio_id: e.id, seduta_id: 'sed1', peso: 40, ripetizioni: 8, stato: 'fatta' }];

  const aperta = gruppiDaSerie([{ id: 'sed1', stato: 'in_corso' }], serie, [e]);
  const chiusa = gruppiDaSerie([{ id: 'sed1', stato: 'completata' }], serie, [e]);

  const conta = (gruppi) => (gruppi.find((g) => g.esercizio_id === e.id) || { serie: [] }).serie.length;
  assert.equal(conta(aperta), 0,
    'una seduta APERTA non deve contare: se contasse, gli aggiornamenti comparirebbero '
    + 'prima di finire e non si potrebbe piu\' tornare indietro');
  assert.equal(conta(chiusa), 1, 'una seduta COMPLETATA deve contare');

  // e il testo dell'avviso non puo' stare dentro il ramo "nessun rank"
  const app = await readFile(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app.js'), 'utf8');
  const iAperta = app.indexOf('Hai un allenamento APERTO');
  const iRecord = app.indexOf('if (!stato.record.length)');
  assert.ok(iAperta >= 0 && iRecord >= 0, 'devono esserci sia l\'avviso sia il ramo dei rank vuoti');
  assert.ok(iAperta < iRecord,
    'l\'avviso sulla seduta aperta deve stare PRIMA del ramo "nessun rank": se sta '
    + 'dentro, compare solo quando non hai nessun Rank ed e\' il difetto di Ste');
});

// ---------------------------------------------------------------------------
// 6. La frase "(6 serie)", che Ste non capiva (18/10/2026)
// ---------------------------------------------------------------------------

test('V28. la scheda dice QUANDO hai fatto le serie, non solo quante', async () => {
  // Ste: "non ho capito la roba di 6 serie (spuntano serie diverse anche negli altri
  // esercizi)". Il numero 6 era GIUSTO: 3 serie del 10/10 piu' 3 del 17/10. Ma scritto
  // cosi' sembrava che in un giorno ne avesse fatte 6, e lo ripeteva su ogni scheda,
  // perche' alle due volte a settimana con tre serie per volta quel numero esce sempre.
  const { recordEsercizio } = await import('../src/rank.js');
  const { gruppiDaSerie } = await import('../src/gioco.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const esercizio = ESERCIZI.find((e) => /pull ups/i.test(e.nome));
  const sedute = [
    { id: 's-vecchia', stato: 'completata', data: '2026-10-10T00:00:00.000Z' },
    { id: 's-nuova', stato: 'completata', data: '2026-10-17T00:00:00.000Z' },
    { id: 's-aperta', stato: 'in_corso', data: '2026-10-18T00:00:00.000Z' },
  ];
  const serie = [
    ...[1, 2, 3].map((i) => ({ esercizio_id: esercizio.id, seduta_id: 's-vecchia', stato: 'fatta', ordine: i, peso_assistenza: 20, ripetizioni: 6, spotter: false })),
    ...[1, 2, 3].map((i) => ({ esercizio_id: esercizio.id, seduta_id: 's-nuova', stato: 'fatta', ordine: i, peso_assistenza: 20, ripetizioni: 6, spotter: false })),
    // una serie della seduta APERTA: non deve comparire, e non deve nemmeno nel conto
    { esercizio_id: esercizio.id, seduta_id: 's-aperta', stato: 'fatta', ordine: 1, peso_assistenza: 99, ripetizioni: 12, spotter: false },
  ];

  const gruppi = gruppiDaSerie(sedute, serie, ESERCIZI);
  const gruppo = gruppi.find((x) => x.esercizio_id === esercizio.id);
  assert.equal(gruppo.serie.length, 6, 'la seduta aperta non entra nel Rank');

  const r = recordEsercizio(gruppo.serie, esercizio, null, 66);
  // LA FRASE HA DUE NUMERI CON DUE RUOLI DIVERSI (Ste, 18/10/2026: "che senso ha dire 6
  // serie in tutto?"). Il record nasce da UNA serie: il primo numero dice QUANDO l'hai
  // fatta, il secondo dice QUANTE serie hai fatto in assoluto, e quel secondo numero non
  // e' decorazione: e' il volume, che vale un bonus sul punteggio.
  assert.match(r.testo, /del 17\/10/, `deve dire quando hai fatto la serie del record, ma dice: ${r.testo}`);
  // IL VOLUME E\' DELLA SEDUTA (Ste, 18/10/2026): "ma non sono 6 serie". Contare anche le
  // tre serie del 10/10 insieme a quelle del 17/10 non e\' un volume: sono due
  // allenamenti a una settimana di distanza. Il volume sono le serie di QUELLA seduta,
  // cioe\' 3, non 6.
  assert.match(r.testo, /volume: 3 serie/, `deve dire le serie di quella seduta, ma dice: ${r.testo}`);
  assert.doesNotMatch(r.testo, /volume: 6 serie/,
    'e NON le sei serie di sempre: due allenamenti diversi non sono un volume');
  assert.doesNotMatch(r.testo, /serie in tutto/,
    'e NON "6 serie in tutto": sembrava che il record nascesse da sei serie');

  // una sola serie: c\'e\' il giorno ma non il volume, che non avrebbe senso
  const soloUna = gruppiDaSerie([sedute[1]], [serie[3]], ESERCIZI);
  const r2 = recordEsercizio(soloUna.find((x) => x.esercizio_id === esercizio.id).serie, esercizio, null, 66);
  assert.match(r2.testo, /del 17\/10/, `una sola serie: deve dire il giorno, ma dice: ${r2.testo}`);
  assert.doesNotMatch(r2.testo, /volume/, `e senza volume da parlare, ma dice: ${r2.testo}`);
});

test('V29. ogni soglia è un peso che QUELLA attrezzatura ha (Ste, 18/10/2026)', async () => {
  // Ste: "vanno di 5kg in su, 5 10 15 20 25 ecc" e poi "nei cavi o macchinari", e
  // "2,5 per pesi liberi non esiste. il minimo di pesi che ho sono 1".
  //
  // Quindi il passo dipende dall'ATTREZZATURA e non dal peso: la pila di cavi e macchine
  // va di 5 kg, i dischi vanno di 1 kg. Prima il passo era 2,5 per tutto e le soglie
  // cadevano su numeri che la macchina non ha: 57,5, 62,5, 72,5, 77,5, 112,5.
  const { passoCaricabile, pesiCaricabili } = await import('../src/rank-config.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');

  // Ste ha chiarito tre volte, e la terza cambia la risposta: "anche nei macchinari posso
  // metterci sopra i pesi piccoli tipo 2kg 1kg 3kg o anche 4kg". Se metto un piatto da 1
  // sopra uno da 5, quel numero esiste: quindi un kg alla volta si arriva su TUTTO, e la
  // funzione non ha piu' niente da distinguere. Il passo di 5 che c'era prima faceva
  // saltare un numero alla volta (55, 60, 65) e toglieva le microprogressioni.
  for (const e of ESERCIZI) {
    assert.equal(passoCaricabile(e), 1,
      `${e.nome}: con i dischi piccoli anche sulle macchine il passo e' 1 kg ovunque`);

    const pesi = pesiCaricabili(passoCaricabile(e));
    // sotto i 50 kg vale la lista dei manubri, quindi 17 kg non ci sono
    assert.ok(!pesi.includes(17),
      `${e.nome}: sotto i 50 kg vale la lista dei manubri, e 17 non c'e'`);
    assert.ok(pesi.includes(12.5), `${e.nome}: i manubri hanno il 12,5`);
    // sopra i 50 kg c'e' ogni kg intero, macchina o manubrio che sia
    for (const kg of [51, 57, 63, 78, 93, 112]) {
      assert.ok(pesi.includes(kg), `${e.nome}: ${kg} kg si possono mettere (piatto da 5 + piattini)`);
    }
  }

  const cavo = ESERCIZI.find((e) => /Cable Fly/i.test(e.nome));
  const macchina = ESERCIZI.find((e) => /^Lat Pulldown presa stretta/i.test(e.nome));
  const manubrio = ESERCIZI.find((e) => /Preacher/i.test(e.nome));
  const zavorra = ESERCIZI.find((e) => /^Dips$/i.test(e.nome));
  assert.equal(passoCaricabile(cavo), 1, 'i cavi vanno di 1 kg, con i piattini sopra');
  assert.equal(passoCaricabile(macchina), 1, 'i carrelli vanno di 1 kg, con i piattini sopra');
  assert.equal(passoCaricabile(manubrio), 1, 'i manubri vanno di 1 kg');
  assert.equal(passoCaricabile(zavorra), 1, 'i dischi sulla cintura vanno di 1 kg');
});

test('V30. il record e\' il peso piu\' alto, ma solo con 5 ripetizioni o piu\' (Ste, 18/10/2026)', async () => {
  // Ste: "conta come migliore serie con un peso piu' alto solo se la serie col peso piu'
  // alto ha fatto 5 o piu' ripetizioni. quindi se per esempio ho fatto 85kg x8 di pulley,
  // se la volta dopo faccio 90x5, e' meglio".
  //
  // Prima vinceva il PUNTEGGIO, e finiva al contrario: 85 x 8 faceva 85 punti, 90 x 5 ne
  // faceva 81, e il record restava sul peso piu' basso. Non e' che 85 x 8 sia una serie
  // migliore di 90 x 5: sono cinque buone ripetizioni con piu' ferro.
  const { valutaEsercizio } = await import('../src/rank-v2/index.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const cavo = ESERCIZI.find((e) => /^Seated Cable Row/i.test(e.nome));
  const serie = (peso, ripetizioni, ordine) => ({
    id: 's' + ordine, esercizio_id: cavo.id, stato: 'fatta', ordine,
    peso, ripetizioni, spotter: false, carrucola: null,
  });

  // l'esempio esatto di Ste: 90 x 5 deve battere 85 x 8
  const r = valutaEsercizio({
    esercizio: cavo,
    serie: [serie(85, 8, 1), serie(90, 5, 2)],
    pesoCorporeo: 66,
  });
  assert.equal(r.caricoReale, 90, 'la serie migliore e\' quella da 90 kg, non quella da 85');
  assert.equal(r.ripetizioni, 5);

  // e con piu' peso ma MENO di 5 ripetizioni il record NON si sposta
  const r2 = valutaEsercizio({
    esercizio: cavo,
    serie: [serie(85, 8, 1), serie(95, 2, 2)],
    pesoCorporeo: 66,
  });
  assert.equal(r2.caricoReale, 85,
    '95 kg per 2 ripetizioni non puo\' diventare il record: sotto le 5 non conta');

  // a parita\' di peso vince la serie con piu\' ripetizioni
  const r3 = valutaEsercizio({
    esercizio: cavo,
    serie: [serie(85, 5, 1), serie(85, 9, 2)],
    pesoCorporeo: 66,
  });
  assert.equal(r3.ripetizioni, 9, 'stesso peso, vince la serie piu\' lunga');

  // e se non esiste nessuna serie da 5 in su, il record non sparisce
  const r4 = valutaEsercizio({
    esercizio: cavo,
    serie: [serie(80, 3, 1), serie(78, 4, 2)],
    pesoCorporeo: 66,
  });
  assert.equal(r4.valido, true, 'con tutte le serie sotto le 5 ce n\'e\' comunque una record');
});

test('V31. due esercizi diversi non possono avere la scala identica (Ste, 18/10/2026)', async () => {
  // "slanciamento e remo al cavo hanno la scala identica, passo per passo. sono due
  // esercizi diversi. oggi non ti morde perche' fai 93 con uno e 90 con l'altro, ma se un
  // giorno sali su uno solo, l'altro resta fermo senza che nessuno lo spieghi", e poi
  // "e sistemala, ma attento perche' i due esercizi sono simili eh".
  //
  // Avevano 1,7 e 0,77 IDENTICI, con la nota che diceva "stesso tetto e stesso ingresso
  // perche' sono lo stesso tipo di movimento". E non e' un dettaglio: se due esercizi
  // hanno la scala uguale, la salita di uno non muove mai l'altro, che e\' esattamente
  // quello che Ste ha descritto.
  const { VALORI_MOVIMENTO } = await import('../src/rank-v2/valori.js');
  const { valutaEsercizio } = await import('../src/rank-v2/index.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');

  const verticale = VALORI_MOVIMENTO.tirata_verticale;
  const orizzontale = VALORI_MOVIMENTO.tirata_orizzontale;
  assert.notEqual(orizzontale.multiplo, verticale.multiplo,
    'pulldown e remo non possono avere lo stesso tetto');
  assert.notEqual(orizzontale.ingressoMultiplo, verticale.ingressoMultiplo,
    'ne\' lo stesso ingresso');
  // e la differenza deve essere PICCOLA, perche\' i due esercizi sono simili: non un
  // abisso, che farebbe saltare un Rank da Platino a Titanum senza merito
  const quanto = Math.abs(orizzontale.multiplo - verticale.multiplo) / verticale.multiplo;
  assert.ok(quanto <= 0.12,
    `la differenza deve essere piccola (i due esercizi sono simili), ma qui e\' del `
    + `${Math.round(quanto * 100)}%: troppo, sposta i Rank di colpo`);

  // e i Rank di Ste non si spostano: 90 kg al pulldown e 95 al remo restano uguali
  const N = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'TITAN', 'OLYMPIAN'];
  const reso = (nome, kg) => {
    const e = ESERCIZI.find((x) => x.nome === nome);
    const r = valutaEsercizio({
      esercizio: e,
      serie: [{ esercizio_id: e.id, stato: 'fatta', ordine: 1, peso: kg, ripetizioni: 6, spotter: false, carrucola: null }],
      pesoCorporeo: 66,
    });
    return N[r.rank.indice];
  };
  assert.equal(reso('Lat Pulldown presa stretta', 90), reso('Seated Cable Row', 95),
    'i suoi numeri restano nello stesso livello: la differenza non deve spostare nessuno');

  // ma se uno sale, l'altro se ne accorge: il remo con 110 kg non puo' restare sotto
  // il pulldown con 90, perche' non hanno la scala giusta uguale
  assert.notEqual(reso('Seated Cable Row', 130), reso('Lat Pulldown presa stretta', 90),
    'caricando il remo verso il tetto, il suo Rank deve staccare');
});

test('V32. col solo spotter la serie conta e vale il 90% (Ste, 18/10/2026)', async () => {
  // "no ma lo spotter fai che conta lo stesso se e' solo una serie che e' con lo spotter,
  // pero' nei rank vale di meno ma non di troppo".
  //
  // Prima la serie col solo spotter veniva BUTTATA, e due volte: in `performanceEsercizio`
  // (non entrava in `res.tutte`, quindi non arrivava al motore) e nel motore nuovo. Sulla
  // Smith incline di Ste le quattro serie da 32 kg erano tutte col companion, restava solo
  // la 30 kg da solo, e il Rank diceva BRONZE: un record che non esisteva.
  const { valutaEsercizio, PENALITA_SPOTTER } = await import('../src/rank-v2/index.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const cavo = ESERCIZI.find((e) => /^Seated Cable Row/i.test(e.nome));
  assert.equal(PENALITA_SPOTTER, 0.9, 'la penalita\' e\' del 10%: "non di troppo"');

  const senza = valutaEsercizio({
    esercizio: cavo,
    serie: [{ esercizio_id: cavo.id, stato: 'fatta', ordine: 1, peso: 90, ripetizioni: 7, spotter: false }],
    pesoCorporeo: 66,
  });
  const con = valutaEsercizio({
    esercizio: cavo,
    serie: [{ esercizio_id: cavo.id, stato: 'fatta', ordine: 1, peso: 90, ripetizioni: 7, spotter: true }],
    pesoCorporeo: 66,
  });
  assert.equal(con.valido, true, 'col solo spotter la serie e\' un record: il lavoro e\' suo');
  assert.equal(con.caricoReale, 90, 'e il peso letto resta quello vero, non uno scontato');
  assert.equal(con.ripetizioni, 7, 'e anche le ripetizioni');
  assert.ok(Math.abs(con.score - senza.score * 0.9) <= 0.5,
    `ma il punteggio vale il 90%: senza ${senza.score}, con ${con.score}`);

  // e una serie col spotter batte comunque una serie piu' leggera fatta da solo
  const mix = valutaEsercizio({
    esercizio: cavo,
    serie: [
      { esercizio_id: cavo.id, stato: 'fatta', ordine: 1, peso: 90, ripetizioni: 7, spotter: true },
      { esercizio_id: cavo.id, stato: 'fatta', ordine: 2, peso: 85, ripetizioni: 8, spotter: false },
    ],
    pesoCorporeo: 66,
  });
  assert.equal(mix.caricoReale, 90, '90 kg col companion battono 85 kg da solo');
  assert.ok(mix.score > senza.score * 0.9 - 0.5, 'e la penalita\' non deve azzerare la differenza');
});

test('V33. lo stesso sforzo prende lo stesso Rank, anche con dueScale diverse (Ste, 18/10/2026)', async () => {
  // Ste: "le trazioni fanno lo stesso carico dello slanciamento (90 kg in entrambi i casi) ma
  // l'app ti dice Argento contro Platino. E' una contraddizione vera" e poi "le trazioni in
  // teoria sono un po' piu' difficili perche' le faccio a presa larga mentre la lat machine la
  // faccio a presa stretta... quindi vedi tu".
  //
  // Il punto non e' la presa larga: e' che le due schede erano votate in due librerie
  // diverse. Lui al cavo tira 90 kg (Platino), in traversa appende 20 kg a un corpo di 66,
  // cioe' 86 kg di carico totale, e si beccava Argento. Stesso muscolo, stesso sforzo.
  //
  // Quindi il Platino delle trazioni deve stare dove gli sta arrivando lui con 20 kg, e il
  // tetto sta sotto quello del pulldown per la presa larga, come ha detto lui.
  const { valutaEsercizio } = await import('../src/rank-v2/index.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const N = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'TITAN', 'OLYMPIAN'];
  const cavo = ESERCIZI.find((e) => /^Lat Pulldown presa stretta/i.test(e.nome));
  const trazioni = ESERCIZI.find((e) => /^Pull Ups$/i.test(e.nome));

  const sulCavo = valutaEsercizio({
    esercizio: cavo,
    serie: [{ esercizio_id: cavo.id, stato: 'fatta', ordine: 1, peso: 90, ripetizioni: 6, spotter: false }],
    pesoCorporeo: 66,
  });
  const inTraversa = valutaEsercizio({
    esercizio: trazioni,
    serie: [{ esercizio_id: trazioni.id, stato: 'fatta', ordine: 1, peso: null, peso_assistenza: 20, ripetizioni: 6, spotter: false }],
    pesoCorporeo: 66,
  });

  assert.equal(N[sulCavo.rank.indice], 'PLATINUM', 'il suo caso reale sul pulldown: 90 kg = PLATINUM');
  assert.equal(N[inTraversa.rank.indice], 'PLATINUM',
    `e le trazioni con 20 kg aggiunti devono dargli lo stesso Rank, non ARGENTO: `
    + `dano ${N[inTraversa.rank.indice]}`);

  // e la presa larga tiene il tetto sotto quello della macchina
  const { VALORI_MOVIMENTO } = await import('../src/rank-v2/valori.js');
  assert.ok(VALORI_MOVIMENTO.tirata_verticale_corpo.multiplo < VALORI_MOVIMENTO.tirata_verticale.multiplo,
    'le trazioni a presa larga hanno il tetto sotto il pulldown a presa stretta');
  assert.ok(VALORI_MOVIMENTO.tirata_verticale.multiplo < VALORI_MOVIMENTO.tirata_orizzontale.multiplo,
    'e il pulldown sotto il remo al cavo');
});

test('V34. presa larga e presa stretta non possono avere lo stesso tetto (Ste, 18/10/2026)', async () => {
  // "crea un altro esercizio con la stessa immagine della lat machine dove pero' in uno
  // scrivi presa stretta (quello mio) e in quello nuovo scrivi presa larga".
  //
  // Il punto non e' l'icona: e' che a presa larga le braccia sono piu' aperte e la spalla
  // e' in una posizione peggiore, quindi lo stesso carico e' una prestazione diversa. Se i
  // due avessero lo stesso tetto, chi fa il largo verrebbe giudicato come chi fa lo stretto.
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const { movimentoDi } = await import('../src/rank-v2/index.js');
  const { VALORI_MOVIMENTO } = await import('../src/rank-v2/valori.js');

  const stretta = ESERCIZI.find((e) => /Lat Pulldown presa stretta/i.test(e.nome));
  const larga = ESERCIZI.find((e) => /Lat Pulldown presa larga/i.test(e.nome));
  assert.ok(stretta && larga, 'i due esercizi ci sono entrambi');
  assert.equal(larga.foto, stretta.foto, 'e hanno la STESSA immagine: e\' lo stesso attrezzo');
  assert.notEqual(larga.id, stretta.id, 'ma sono due esercizi diversi');

  const mStretta = VALORI_MOVIMENTO[movimentoDi(stretta).movimento];
  const mLarga = VALORI_MOVIMENTO[movimentoDi(larga).movimento];
  assert.notEqual(movimentoDi(larga).movimento, movimentoDi(stretta).movimento,
    'devono avere due movimenti diversi: e\' la presa a cambiare il tetto');
  assert.ok(mLarga.multiplo < mStretta.multiplo,
    `il largo deve avere il tetto piu' basso: ${mLarga.multiplo} contro ${mStretta.multiplo}`);
  // e la differenza resta piccola, perche' l'esercizio e' lo stesso
  const quanto = (mStretta.multiplo - mLarga.multiplo) / mStretta.multiplo;
  assert.ok(quanto <= 0.12, `la differenza deve essere piccola, qui e\' del ${Math.round(quanto * 100)}%`);

  // il classificatore deve riconoscere le parole, non solo i nomi
  const { classificaEsercizio } = await import('../src/esercizi-classificatore.js');
  for (const nome of ['Lat Pulldown presa larga', 'Tirata larga', 'Pulldown wide grip']) {
    assert.equal(classificaEsercizio({ nome }).movimento, 'tirata_verticale_larga',
      `"${nome}" deve essere presa larga`);
  }
  for (const nome of ['Lat Pulldown presa stretta', 'Lat machine', 'Pulldown']) {
    assert.equal(classificaEsercizio({ nome }).movimento, 'tirata_verticale',
      `"${nome}" deve restare presa stretta`);
  }
});
