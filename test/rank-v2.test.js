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

test('V13. il tetto di realta\' vince sulle risposte', () => {
  // risposte che direbbero un vertice assurdo su un isolamento
  const risposte = Array.from({ length: 10 }, () => ({ caricoReale: 200, risposta: 'massimo' }));
  const r = misura.affinaVertice({
    verticeDichiarato: 30, risposte, livello: 'isolamento', movimento: 'spalle_isolamento',
    pesoCorporeo: 70,
  });
  assert.equal(r.tettoMesso, true, 'la misura supera il tetto: deve restare scritto');
  assert.ok(r.vertice <= 70 * 0.85 + 0.01, 'e il numero non supera il tetto');
  // e il tetto usato e' quello del movimento, quindi la misura e la scala non
  // possono litigare sullo stesso numero
  assert.equal(r.limite, 70 * 0.85, 'il tetto viene da valori.js, non ricalcolato qui');
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
// Le trazioni sono ZAVORRI, non assistenza (Ste, 13/10/2026). Il motore nuovo
  // non le sa valutare, quindi l'app torna al vecchio: e il vecchio deve
  // sommare i kg di zavorra al corpo, non contarli al contrario.
  const trazioni = ESERCIZI.find((e) => /pull ups/i.test(e.nome));
  assert.equal(trazioni.convenzione, 'zavorri',
    'le trazioni devono essere zavorri: i kg che metti sono addosso a te, non kg che la macchina ti toglie');

  const senzaZavorra = recordEsercizio(
    [{ id: 's', esercizio_id: trazioni.id, stato: 'fatta', peso: null, ripetizioni: 7 }],
    trazioni, null, 66);
  assert.equal(senzaZavorra.valido, false,
    'senza i kg di zavorra non c\'e\' niente da valutare: prima tornava un record vuoto');

  const conZavorra = recordEsercizio(
    [{ id: 's', esercizio_id: trazioni.id, stato: 'fatta', peso: null, peso_assistenza: 20, ripetizioni: 7 }],
    trazioni, null, 66);
  assert.equal(conZavorra.motore, 'vecchio',
    'le trazioni non si valutano in kg col motore nuovo: l\'app torna al vecchio');
  assert.match(conZavorra.testo, /20 kg di zavorri \+ 66 kg del tuo corpo/,
    'i kg di zavorra si sommano al corpo: 20 kg di zavorra non sono 20 kg di lavoro');
  assert.ok(conZavorra.rank, 'con i zavorri scritti la trazione ha un Rank, prima non lo aveva');
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
