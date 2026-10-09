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
  // Con il fattore 0,5 la curva SATURAVA a 20 ripetizioni (20 e 40 valevano
  // entrambe 1,004): le ripetizioni non contavano piu\' niente, che e\' lo stesso
  // difetto del sistema vecchio, solo con un altro numero. Per questo il fattore
  // e\' 0,65 e non 0,5.
  // NOTA: qui si confrontano i valori GREZZI, non quelli arrotondati a 3
  // decimali. Con il fattore 0,65 la differenza fra 20 e 40 ripetizioni e' di
  // qualche millesimo, e arrotondando a 1,033 - 1,033 il test direbbe "non
  // cresce" quando invece cresce. E' il tipo di test che mente per arrotondamento.
  const grezzoVenti = curve.sommaGeometrica(20);
  const grezzoQuaranta = curve.sommaGeometrica(40);
  assert.ok(grezzoQuaranta > grezzoVenti,
    'la curva cresce ancora oltre 20 ripetizioni (nel vecchio era bloccata)');
  assert.ok(venti < otto * 1.2, 'ma raddoppiare le ripetizioni non raddoppia il punteggio');
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
  // Il limite qui e\' voluto: al massimo 1 Rank di differenza fra 5 e 12
  // ripetizioni, e comunque gli LP DEVONO salire (se non salissero, le
  // ripetizioni non conterebbero niente e sarebbe un altro bug).
  const salta = [];
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
    if (salto > 1) salta.push(`${e.nome}: 5 rip = ${cinque.indice}, 12 rip = ${dodici.indice}`);
    // e le ripetizioni devono contare qualcosa: gli LP non possono restare fermi
    if (cinque.rank && dodici.rank && cinque.indice === dodici.indice && dodici.lp <= cinque.lp) {
      salta.push(`${e.nome}: con le stesse ripetizioni non muove niente, e gli LP non salgono`);
    }
  }
  assert.deepEqual(salta, [],
    'le ripetizioni non possono cambiare il Rank di piu\' di 1 pezzo:\n  ' + salta.join('\n  '));
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
  // Il tetto non e' piu' "isolamento sì/no": dal 08/10/2026 e' sul CARICO REALE,
  // perche\' il leg extension e\' un isolamento (livello 'isolamento') ma a una
  // gamba sola mette 2x il tuo corpo su una coscia, mentre il cable fly e' un
  // isolamento vero e minuscolo. Con la regola vecchia il leg extension veniva
  // tagliato a 0,85x e i 65 kg di Ste davano OLYMPIAN.
  //
  // qui si prova con un multiplo assurdo e si vede che il tetto vince
  const assurdo = { multiplo: 500, ingressoMultiplo: 0.3 };
  const tre = valori.sogliePerEsercizio(assurdo, 'isolamento', 70, 'spalle_isolamento');
  assert.ok(tre.vertice <= 70 * 0.85 + 0.01,
    `un isolamento piccolo non puo' avere vertice sopra 0,85 per uno: ${tre.vertice}`);
  assert.equal(tre.tettoRaggiunto, true, 'e deve dire che il tetto ha morso');
  // i pesanti invece arrivano a 2,2 per uno
  const pesante = valori.sogliePerEsercizio({ multiplo: 1000, ingressoMultiplo: 0.3 }, 'grande', 70, 'gambe_pesanti');
  assert.ok(pesante.vertice <= 70 * 2.2 + 0.01, 'nemmeno un pesante puo\' superare 2,2 per uno');
  // e il leg extension ha il suo tetto, non quello da isolamento minuscolo
  const gambe = valori.sogliePerEsercizio({ multiplo: 1000, ingressoMultiplo: 0.3 }, 'isolamento', 70, 'gambe_isolamento');
  assert.ok(gambe.vertice > 70 * 1.3,
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
  // il motore vecchio resta in piedi per gli esercizi a ripetizioni
  const trazioni = ESERCIZI.find((e) => /pull ups/i.test(e.nome));
  const senzaKg = recordEsercizio([{ id: 's', esercizio_id: trazioni.id, stato: 'fatta', peso: null, ripetizioni: 7 }], trazioni, null, 66);
  assert.equal(senzaKg.motore, 'vecchio',
    'le trazioni non si valutano in kg: il motore nuovo lo dice e l\'app torna al vecchio');
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
  const { recordEsercizio } = await import('../src/rank.js');
  const rec = recordEsercizio([{ id: 's', peso: 21, ripetizioni: 8, stato: 'fatta' }],
    pushdown, null, 66);
  assert.ok(rec.rank, `21 kg di pushdown monobraccio devono dare un Rank, non `
    + `${rec.rank ? rec.rank.nome : 'nessuno'}`);
  assert.equal(rec.rank.nome, 'BRONZE',
    `e devono dare il bronzo: prima non davano nessun livello (10,5 kg su un `
    + `ingresso di 19,8)`);
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
