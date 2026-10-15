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
test('V17. il MONOBRACCIO non dimezza: se leggi 21 kg, sono 21', async () => {
  // Ste (08/10/2026): "di tricipiti pushdown monobraccio faccio 21kg, e' isolamento
  // e sono solo bronzo?". Non era bronzo: nessun livello. Il motivo stava qui.
  //
  // La doppia carrucola dimezza, perche' su una doppia carrucola lavori un braccio
  // alla volta e il numero che leggi e' gia' meta'. Ma questo vale per gli
  // esercizi A DUE BRACCIA (la corda del fly, il curl, le alzate laterali): leggi
  // 50 kg, ne fai 25 per braccio.
  //
  // Il pushdown MONOBRACCIO si fa con un manubrio solo: leggi 21 kg e quei 21 kg
  // sono gia' del tuo braccio. L'app li dimezzava a 10,5, quindi meta' del lavoro
  // spariva e il tricipite restava sotto la soglia d'ingresso senza spiegazione.
  //
  // La regola nuova: si dimezza SOLO se l'esercizio si fa a due braccia. Il nome
  // e' l'unica prova, perche' non esiste un campo dedicato.
  const { caricoReale, lavoroMonobraccio } = await import('../src/rank-v2/curve.js');
  const { ESERCIZI } = await import('../src/dati-iniziali.js');
  const perId = (id) => ESERCIZI.find((e) => e.id === id);

  // il caso di Ste
  const pushdown = perId('ex-single-arm-tricep-pushdown');
  assert.equal(lavoroMonobraccio(pushdown), true, 'il pushdown e\' monobraccio: lo dice il nome');
  assert.equal(caricoReale(21, pushdown), 21,
    '21 kg su un monobraccio sono 21: NON dimezzati a 10,5');

  // e il caso opposto, che non deve cambiare: STESSO attrezzo, due braccia
  const curl = perId('ex-cable-hammer-curl');
  assert.equal(lavoroMonobraccio(curl), false, 'il hammer curl si fa a due braccia');
  assert.equal(caricoReale(50, curl), 25,
    '50 kg letti sul curl sono 25 per braccio: qui dimezzare e\' giusto');

  // e i due casi che stanno in mezzo
  assert.equal(caricoReale(21, perId('ex-one-arm-cable-reverse-fly')), 21,
    'il reverse fly monobraccio non dimezza');
  assert.equal(caricoReale(88, perId('ex-lat-pulldown-macchina')), 88,
    'il pulldown non ha doppia carrucola: non si tocca');

  // e la prova finale, quella che conta per l'utente: il Rank c\'e\'.
  // Il nome esatto NON e\' fissato qui: quando Ste ha chiesto gli ingressi piu\' bassi
  // (08/10/2026) i tricipiti sono saliti di fascia, e questo test continuava a
  // chiedere il bronzo che era il numero di ieri. Qui si fissa la cosa che non
  // deve cambiare MAI: 21 kg su un monobraccio devono contare come 21, e devono
  // dare un livello (prima non ne davano nessuno: 10,5 kg su un ingresso di 19,8).
  const { recordEsercizio } = await import('../src/rank.js');
  const rec = recordEsercizio([{ id: 's', peso: 21, ripetizioni: 8, stato: 'fatta' }],
    pushdown, null, 66);
  assert.ok(rec.rank,
    '21 kg di pushdown monobraccio devono dare un livello: prima non ne davano nessuno');
  assert.ok(rec.progresso > 0, 'e non possono essere "sotto soglia": sono 21 kg veri');
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

test('V21. nessun esercizio di Ste puo\' stare AL TETTO della propria scala', () => {
  // Il difetto che ha fatto trovare il tetto del polso sbagliato (15/10/2026).
  //
  // Un tetto che coincide con la tua migliore prestazione non e' un tetto: e' un
  // muro con la porta giusta dentro. I 30 kg di wrist curl di Ste erano il 113% del
  // tetto dichiarato, e l'app gli dava il massimo assoluto della scala con una
  // prestazione che da l\'in poi poteva solo scendere. E la nota dello stesso file
  // diceva il contrario ("30 kg su corpo 75 sono gia\' tanto"), quindi non era un
  // numero deciso male: erano due numeri in due posti che si contraddicevano.
  //
  // Qui sotto i carichi sono quelli documentati nelle note di valori.js, quindi
  // sono i numeri VERI di Ste, non numeri inventati per far passare il test.
  const CARICHI = {
    'Chest Press': 37, 'Lat Pulldown macchina': 88, 'Seated Dumbbell Shoulder Press': 30,
    'Cable Hammer Curl': 50, 'One Arm Dumbbell Preacher Curl': 18,
    'Scott Bench Curl seduto al contrario': 18, 'Cable Lateral Raise': 25,
    'Dumbbell Lateral Raise': 12, 'Cable Fly': 37, 'Single Arm Tricep Pushdown': 21,
    'Seated Leg Curl': 45, 'Leg Extension': 65, 'Chest Supported Dumbbell Shrug': 47.5,
    'Smith Machine Incline Bench Press': 32, 'Seated Cable Row': 60,
    'Sled Press Calf Raise': 110, 'One Arm Cable Reverse Fly': 15, 'Wrist Curl': 30,
    'Dumbbell Bench Pull': 50,
  };
  const problemi = [];
  for (const [nome, kg] of Object.entries(CARICHI)) {
    const e = ESERCIZI.find((x) => x.nome === nome);
    if (!e) continue;
    const r = v2.valutaEsercizio({
      esercizio: e, pesoCorporeo: 66, serie: [{ peso: kg, ripetizioni: 8, stato: 'fatta' }],
    });
    if (!r.valido || !r.vertice) continue;
    const quota = (r.score / r.vertice) * 100;
    if (quota >= 97) problemi.push(`${nome}: ${kg} kg sono il ${quota.toFixed(1)}% del tetto`);
  }
  assert.deepEqual(problemi, [],
    'nessuna prestazione documentata puo\' stare al tetto della propria scala:\n  '
    + problemi.join('\n  '));
});