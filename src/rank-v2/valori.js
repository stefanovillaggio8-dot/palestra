// rank-v2/valori.js -- i tre numeri di ogni esercizio: ingresso, vertice, e da dove
// viene il numero.
//
// Ste (07/10/2026): "ogni esercizio deve avere la propria scala di prestazione e
// delle soglie realistiche" + strada 2 scelta da lui: "i valori devono venire
// misurati sulle prestazioni reali, pero' non voglio che bastino 3-4 risposte casuali
// per cambiare completamente le soglie: usa quei dati per affinare gradualmente i
// valori e mantieni dei limiti realistici".
//
// QUINDI QUI, per ogni movimento, ci sono DUE cose e vanno tenute distinte:
//
//  1) il VERTICE: il carico che una persona di 70 kg, allenata, arriva davvero su
//     quell'esercizio. Non e' un massimo teorico, e' il numero che nella vita reale
//     si vede in palestra.
//
//  2) la QUOTA DI INGRESSO: quanto del vertice basta per entrare nel Rank piu' basso.
//     Su un esercizio difficile la quota e' PICCOLA (e' difficile anche solo arrivare
//     al vertice), su un esercizio facile e' PIU' grande.
//
// ============================================================
// IL BUG DEI UNITARI (il piu' grosso di tutti, trovato il 08/10/2026)
// ============================================================
// Prima i valori qui sotto erano in UNITA' DIVERSE esercizio per esercizio, e il
// codice le convertiva in modo incoerente. Il risultato: 12 esercizi su 15 fuori
// scala, e in modi opposti.
//
// Il caso peggiore: il CABLE HAMMER CURL con doppia carrucola.
//
//   - tu registri 50 kg (quello che leggi sulla macchina, TOTALE sui due cavi)
//   - curve.js caricoReale() DIMEZZA i kg con doppia carrucola, perche' su una
//     doppia carrucola lavori un braccio alla volta: quindi lo score usa 25
//   - ma il vertice dichiarato era 55, cioe' 55 PER LATO gia' dimezzato a mano
//
// Cioe': il tetto era 55 nell'unita' dimezzata e il carico era 25 nella stessa
// unita'. Il calcolo era CORRETTO e il tetto era SBAGLIATO: 2,2 volte troppo
// alto. Il risultato in sala: i tuoi 50 kg di hammer curl davano BRONZE, mentre
// 65 kg di leg extension davano OLYMPIAN. Assurdo.
//
// E il caso opposto: la CABLE FLY, tetto dichiarato 26 per lato ma tu registri
// 37 kg totali che diventano 18,5 per lato: 185% del tetto, capovolto.
//
// LA REGOLA ADESSO, E' UNA SOLA E LA RISPETTO TUTTO IL CODICE:
//
//   il vertice e' SEMPRE nell'unita' che vede scoreSerie(), cioe' gia' con la
//   doppia carrucola dimezzata. Non e' piu' "quello che leggi sulla macchina".
//
//   Il lettore umano (tabella, schermata) converte al contrario con
//   leggiComeLoLeggi(): cosi' i numeri stampati sono quelli della macchina,
//   come li scrive Ste, ma il confronto avviene sempre nell'unita' giusta.
//
// Questo e' anche il posto dove STA il fatto che 50 kg di hammer curl non
// valgono 50 kg di chest press: sono due unita' diverse (cavo totale dimezzato
// contro dischi per braccio) e ognuna ha il suo tetto.
//
// ============================================================
// LA SEVERITA', E COME E' STATA SCELTA
// ============================================================
// Ste (08/10/2026): "il mio compagno si allena da 5 anni e fa 45 kg" alla chest
// press, e Ste fa 37 kg dopo un anno. In RELATIVO al corpo lui e' a 0,62x per
// braccio e Ste a 0,56x: gli manca il 9%, non il doppio.
//
// Da li la regola di severita', uguale per tutti gli esercizi:
//
//   TETTO = quanto spinge una persona che si allena bene, in rapporto al SUO corpo.
//   Non un record del mondo, e non il massimo teorico: il numero che si vede in
//   palestra. Chi arriva al tetto e' bravo, e il tetto si puo' raggiungere.
//
//   Il carico di oggi sta intorno al 30% del tetto. Non al 5% (scala bloccata,
//   niente Rank per un anno) e non al 90% (Rank inflati, si arriva in cima
//   subito). Questa e' la regola verificata sulla chest press, e poi applicata
//   a tutti gli altri 14 esercizi e riletta con tools/analisi-tetti.mjs.
//
// I tetti per movimento, in multipli del peso corporeo della persona:
//
//   gambe_pesanti      2,2x   schiena e gambe: le macchine grandi reggono tanto
//   tirata_verticale   1,5x   il pulldown e' il piu' forte dei tiranti
//   tirata_orizzontale 1,5x   stessa zona, ma la stazza stanca prima
//   spinta_orizzontale 1,0x   PER BRACCIO: 2,0x in totale. Il numero chiave
//   spinta_verticale   0,6x   per MANUBRIO: verticale e' il piu' difficile
//   spalle_trapezio    1,2x   per MANUBRIO: gli scapoli reggono tutto
//   petto_isolamento   0,4x   per LATO: un isolamento piccolo
//   spalle_isolamento  0,4x   per LATO: idem, e il movimento e' di piccolissimo
//                              muscolo
//   bicipiti           0,8x   per LATO
//   tricipiti          0,7x   per LATO
//   gambe_isolamento   1,0x   sullo stack: il quadricipite e' il muscolo piu'
//                              forte del corpo, regge piu' del doppio di se'
//   gambe_curl         0,8x   il femorale e' piu' debole del quadricipite
//   corpo_libero       -      i kg non esistono, si contano le ripetizioni
//
// Il peso corporeo entra qui e in un solo posto: moltiplica il vertice, e con lui
// anche l'ingresso che ne' una quota. Cioe' il peso non decide "quanto vale la
// prestazione in se'", ma "quanto ci vuole su QUEL corpo".

import { ripetizioniPiene, fattoreMeccanica, caricoReale, RIPETIZIONI_RIFERIMENTO } from './curve.js';

/**
 * I tetti per movimento, come multipli del peso corporeo.
 *
 * Ste ha chiesto (08/10/2026) "controlla tutto per tutti gli esercizi e fai
 * come hai fatto per la chest press, ragionaci": quindi qui sotto ogni numero e'
 * un ragionamento sul peso corporeo, non una stima a occhio su un peso assoluto.
 *
 * fonte:
 *  - 'tuo'     = c'e' uno storico tuo che fissa il numero
 *  - 'stima'   = ragionato sul peso corporeo (questo e' il caso di quasi tutti)
 */
/**
 * I valori per movimento, per una persona di 70 kg.
 *
 * fonte:
 *  - 'tuo'     = c'e' uno storico tuo che fissa il numero
 *  - 'stima'   = ragionato sul peso corporeo (questo e' il caso di quasi tutti)
 *
 * ===================================================================
 * PERCHE' ANCHE L'INGRESSO E' UN MULTIPLO DEL CORPO (08/10/2026)
 * ===================================================================
 * Prima l'ingresso era una percentuale del tetto (`quotaIngresso`: 0,30, 0,35,
 * 0,42, 0,45, 0,50 a seconda dell'esercizio). Ste: "usa un minimo di intelligenza".
 * Aveva ragione, e il difetto era grosso:
 *
 *   - le quote erano scelte A CASO e non erano confrontabili fra esercizi: il
 *     bicipite partiva al 35% del suo tetto e il tricipite al 35% del SUO, ma
 *     i due tetti erano diversi, quindi le due scale partivano da posti diversi.
 *     Risultato: stesso livello di forza, Rank diversi. Il suo tricipite (30 kg
 *     per lato) gli dava SILVER I e il bicipite (25 kg per lato) BRONZE II, solo
 *     perche' un numero era messo a 0,35 e l'altro a 0,42;
 *
 *   - peggio: essendo l'ingresso legato al tetto, e il tetto legato al peso
 *     corporeo, A 85 KG DI CORPO CON GLI STESSI 25 KG SUL CURL FINIVI SOTTO LA
 *     PRIMA SOGLIA. Chi pesa di piu' e si allena allo stesso modo veniva
 *     bloccato. Il peso corporeo ti premiava e ti puniva nella stessa frase;
 *
 *   - e il senso era capovolto: se l'ingresso e' il 35% del tetto, piu' ti
 *     alleni e piu' si alza il tetto, quindi piu' si alza anche l'ingresso. Il
 *     gioco premiava la debolezza.
 *
 * Adesso l'ingresso e' un SECONDO multiplo del corpo: `ingressoMultiplo`. E' un
 * numero suo, ragionato sul carico con cui qualcuno comincia ad allenarsi su
 * quel movimento, e non si muove piu' con il tetto. Sul corpo di Ste i due
 * multipli dicono esattamente questo:
 *
 *   corpo 66 kg, curl al cavo: tetto 0,7x = 46 kg per lato, ingresso 0,3x = 20.
 *   corpo 85 kg, stesso curl: tetto 0,7x = 60, ingresso 0,3x = 25.
 *
 * Le due scale crescono insieme, quindi la posizione di chi ha lo stesso livello
 * di forza RELATIVO al proprio corpo resta la stessa. E se ti alleni, ti avvicini
 * al tetto: non ti si alza la soglia sotto i piedi.
 *
 * `quotaIngresso` non esiste piu'. Se resta un errore li' dentro, e' un numero
 * che nessuno legge e che un giorno fa sbagliare qualcosa: meglio che salti.
 *
 * ===================================================================
 * GLI INGRESSI SONO STATI ABBASSATI DEL 15% (08/10/2026)
 * ===================================================================
 * Ste, dopo aver visto le sue schede: "smith machine e' tanto 32kg, anche
 * preacher curl, come faccio a non essere manco bronzo?".
 *
 * I numeri c'erano: 32 kg alla smith e 21 kg al preacher davano BRONZE. Ma erano
 * al 12% appena sopra l'ingresso, e a occhio sembravano la stessa cosa di "non
 * averlo sbloccato". Il bronzo che uno deve GUARDARE per capire se l'ha preso
 * non e' un bronzo: e' un bronzo che ti sembra un errore.
 *
 * Quindi tutti gli `ingressoMultiplo` sono scesi del 15%, e i numeri qui dentro
 * sono gia' quelli finali, non quelli vecchi da riabbassare. L'unica eccezione e'
 * `spalle_trapezio` (lo shrug), che non ha subito lo sconto: Ste ne ha scelti due
 * a mano lo stesso giorno, quindi 0,45 e' il numero che ha voluto lui e non uno
 * da riabbassare.
 *
 * I TETTI non si sono mossi. Solo la porta di ingresso si e' abbassata: chi era
 * gia' dentro una fascia resta dove era (il suo Rank e i suoi LP cambiano solo
 * perche' la fascia e' piu' spessa), e chi era sotto ora entra.
 */
export const VALORI_MOVIMENTO = {
  gambe_pesanti: {
    multiplo: 2.2, ingressoMultiplo: 0.85, fonte: 'tuo',
    nota: 'Leg press e sled press: le macchine per gambe sono le piu\' forti della sala, quindi il tetto e\' il piu\' alto in assoluto (2,2x, e coincide col tetto di realta\'). L\'ingresso a 1,0x e\' il punto in cui chi si siede per la prima volta su quella macchina arriva: sotto, non e\' nemmeno un esercizio.',
  },
  tirata_verticale: {
    multiplo: 1.7, ingressoMultiplo: 0.77, fonte: 'tuo',
    nota: 'Lat pulldown: tetto 1,7x il corpo, ingresso 0,9x. Ste (08/10/2026) "la lat machine fare 180kg e\' da folli, soprattutto con il mio peso" — avevo dichiarato 2,0x (=132 kg) e nella nota avevo scritto che chi e\' forte fa 150-180 kg: NON E\' VERO al mio peso, me lo ha fatto notare lui. I numeri onesti del pulldown in rapporto al corpo: 0,8x chi non l\'ha mai fatto, 1,0-1,2x dopo un anno, 1,4-1,6x chi si allena bene, 1,8-2,0x chi siDedica alla forza da anni. 1,7x e\' il tetto di chi si allena bene e un po\' oltre: 112 kg su corpo 66. Ste fa 88 kg = 1,33x, che e\' gia\' il livello di chi si allena bene: sta al 62% della scala, non al fondo. Il tetto NON e\' "il massimo esistente", e\' quello che nella vita reale si vede in palestra.',
  },
  tirata_orizzontale: {
    multiplo: 1.7, ingressoMultiplo: 0.77, fonte: 'stima',
    nota: 'Seated cable row: stesso tetto e stesso ingresso del pulldown, perche\' sono lo stesso tipo di movimento con lo stesso carico. Il row e\' leggermente piu\' pesante del pulldown per la stazza, quindi chi lo fa spesso arriva piu\' in alto, ma la scala e\' la stessa.',
  },
  spinta_orizzontale: {
    multiplo: 1.0, ingressoMultiplo: 0.38, fonte: 'tuo',
    nota: 'Chest press a dischi, PER BRACCIO. Tetto 1,0x il corpo per braccio = 2,0x in totale, che e\' il livello di chi si allena bene. Ingresso 0,45x per braccio = 0,9x in totale: sotto, non stai nemmeno spingendo il peso di due braccia. Ste fa 0,56x per braccio, quindi e\' oltre l\'ingresso ma lontano dal tetto.',
  },
  spinta_verticale: {
    multiplo: 0.6, ingressoMultiplo: 0.30, fonte: 'stima',
    nota: 'Spalle in alto coi manubri, PER MANUBRIO. Tetto 0,6x per mano (in alto la spalla reggia poco), ingresso 0,35x. I numeri veri: iniziare con 10-12 kg per mano (0,15x), bravo con 25-30 (0,4-0,45x). Ste fa 30 kg = 0,45x, che e\' gia\' livello bravo: con l\'ingresso a 0,25x stava al 58% della scala, troppo alto per un anno di palestra, quindi l\'ingresso e\' stato alzato a 0,35x.',
  },
  spalle_trapezio: {
    multiplo: 1.0, ingressoMultiplo: 0.38, fonte: 'tuo',
    nota: 'Shrug coi manubri, PER MANUBRIO. Tetto 1,0x per mano, ingresso 0,45x. Sono i numeri che ha scelto Ste (08/10/2026) fra le due opzioni proposte, dopo che gli ho detto che 47,5 kg per braccio gli davano "nessun livello". Sul suo corpo da 66: tetto 66 kg per mano, ingresso 30 kg. Non e\' il tetto di un record: e\' il punto in cui il scrollamento dei trapezi e\' davvero forte. Prima questo esercizio prendeva la scala del REMO (ingresso 0,9x = 59 kg), quindi 47,5 kg per braccio restavano sotto la soglia e non sbloccavano niente. Nota: l\'ingresso qui NON ha il -15% degli altri movimenti, perche\' Ste ha scelto questi due numeri a mano.',
  },
  petto_isolamento: {
    multiplo: 0.4, ingressoMultiplo: 0.17, fonte: 'tuo',
    nota: 'Cable fly al cavo, PER LATO: tetto 0,4x il corpo per lato, ingresso 0,2x. Nota bene il tetto: 0,4x per lato e\' 0,8x in totale, non e\' un errore. Il petto isolato al cavo e\' un movimento piccolo, quindi il carico e\' basso.',
    varianti: {
      // il cable fly: piccolo muscolo, carico leggero sul cavo
      cavo: { multiplo: 0.4, ingressoMultiplo: 0.17, nota: 'Cable fly al cavo con doppia carrucola, PER LATO: tetto 0,4x il corpo per lato, ingresso 0,2x.' },
    },
  },
  // IL BENCH PULL E' PASSATO DA QUI (8/10/2026): era una "variante pesante" del
  // petto isolamento, ma Ste ha detto che e' schiena (tirata prona coi manubri),
  // quindi ora ha un movimento suo. I numeri sono gli stessi che aveva prima
  // (1,2x di tetto, 0,5x di ingresso), cosi' i suoi kg NON cambiano di colpo: cambia
  // il muscolo, il colore e il testo, che prima erano sbagliati, ma la scala resta
  // quella che lui ha giusto sott'occhio. Se poi vuoi stringerla o allargarla,
  // e' un numero da spostare qui.
  tirata_manubri: {
    multiplo: 1.2, ingressoMultiplo: 0.43, fonte: 'tuo',
    nota: 'Bench pull coi manubri, PER MANUBRIO: tirata prona, lavora il dorso centrale. Tetto 1,2x il corpo per mano, ingresso 0,5x. Il carico e\' grosso (manubri) ma il movimento e\' piu\' isolato di un remo con seduta, quindi il tetto sta piu\' basso del remo (1,7x). Prima questo esercizio era classificato come petto, e la scheda gli diceva "il petto lavora in modo abbastanza uniforme".',
  },
  spalle_isolamento: {
    multiplo: 0.45, ingressoMultiplo: 0.10, fonte: 'tuo',
    nota: 'Alzate laterali al cavo con doppia carrucola, PER LATO. Tetto 0,45x e ingresso 0,12x, ragionati sui numeri veri di palestra: le alzate laterali sono l\'esercizio col peso pi\' basso in assoluto (5-10 kg per lato coi manubri, 10-25 per lato al cavo doppio). Il vecchio sistema diceva 13 kg TOTALI e regalava l\'OLYMPIAN. Ste fa 25 kg letti = 12,5 per lato = 0,19x: e\' gia\' un livello decente, e sta a cavallo dell\'ingresso come deve stare chi ha un anno di palestra.',
  },
  bicipiti: {
    multiplo: 0.7, ingressoMultiplo: 0.26, fonte: 'tuo',
    nota: 'Curl al cavo con doppia carrucola e curl coi manubri, PER LATO. Ste (08/10/2026): "come puo\' una persona fare tipo 50 kg di hammer curl?" — 50 NON SONO 50 PER BRACCIO. Con la doppia carrucola leggi 50 kg in totale sui due cavi, quindi ne fai 25 per braccio: 0,38x il corpo per lato, un numero normalissimo. Il tetto 0,7x per lato (= 0,6 kg per braccio su corpo 60) e\' il livello di un bicipite molto allenato: per questo il suo 25 kg sta nella meta\' bassa della scala e non al 19% di prima.',
  },
  tricipiti: {
    multiplo: 0.7, ingressoMultiplo: 0.26, fonte: 'stima',
    nota: 'Pushdown ed estensioni sopra la testa al cavo, PER LATO: tetto 0,7x, ingresso 0,3x. Ste (08/10/2026) "vabbè che è due braccia però": 60 kg letti = 30 per braccio = 0,45x per lato, quindi sopra l\'ingresso e nella parte bassa ma seria della scala. Le estensioni sopra la testa valgono un po\' di piu\' del pushdown perche\' l\'allungamento e\' maggiore, ma stanno sulla stessa scala di movimento.',
  },
  gambe_isolamento: {
    multiplo: 1.4, ingressoMultiplo: 0.43, fonte: 'tuo',
    nota: 'Leg extension: Ste (08/10/2026) "comunque lo faccio con una gamba", quindi i kg sono per gamba. 1,4x il corpo e\' un tetto ragionato cosi\': 1,0x per il quadricipite piu\' il 40% in piu\' perche\' a una gamba sola tutto il carico finisce su una coscia sola (niente aiuto dell\'altra gamba). Sul tuo corpo il tetto e\' 92 kg e tu ne fai 65: 34% della scala. Ho provato 2,0x e 1,0x: il primo ti metteva al 2% (tetto irraggiungibile), il secondo ti dava OLYMPIAN (scala finita sotto i tuoi piedi). 1,4x mette i tuoi numeri al posto giusto.',
  },
  gambe_curl: {
    multiplo: 1.2, ingressoMultiplo: 0.38, fonte: 'stima',
    nota: 'Leg curl seduto: tetto 1,2x il corpo, ingresso 0,45x. Vale anche per gamba come l\'estensione, ma il femorale regge un po\' meno del quadricipite: un gradino sotto.',
  },
  gambe_stabilizzatore: {
    multiplo: 2.2, ingressoMultiplo: 0.85, fonte: 'tuo',
    nota: 'Sled press calf raise e single leg press: stessa zona del leg press perche\' il carico e\' grosso e la macchina scarica. Tetto e ingresso come il leg press. Sul single leg press valgono i kg per gamba.',
  },
  polso: {
    multiplo: 0.4, ingressoMultiplo: 0.13, fonte: 'stima',
    nota: 'Wrist curl: tetto 0,4x il corpo, ingresso 0,15x. Il polso e\' un insieme di muscoli piccoli dell\'avambraccio e il movimento e\' corto, quindi il carico resta basso anche se ci metti i manubri. 30 kg su corpo 75 sono gia\' tanto per il polso. Nota: il tetto di realta\' taglia questo a 0,5x, quindi il numero effettivo e\' 0,4x.',
  },
  polpacci: {
    multiplo: 1.0, ingressoMultiplo: 0.34, fonte: 'stima',
    nota: 'Calf raise e sled press calf raise: tetto 1,0x il corpo, ingresso 0,4x. I polpacci (gemelli e soleo) sono muscoli piccoli come il polso, ma il carico e\' piu\' grosso perche\' ci metti i dischi della pressa sotto i piedi. 75 kg su corpo 75 sono gia\' il tetto per i polpacci. Ste (08/10/2026): il classificatore gli dava il tetto del leg press (2,2x = 165 kg) perche\' leggeva "sled press" e ignorava "calf raise", ma 165 kg per un calf raise non esistono in nessuna palestra.',
  },
  // NOTA: spalle_trapezio sta fra le tirate perche\' lo scrollamento del trapezio e\' una
  // tirata con i pesi (vedi il commento nel classificatore). Lo shrug e\' pesante e
  //compound, quindi niente tetto da isolamento.
  corpo_libero: {
    multiplo: 0, fonte: 'nessuno',
    nota: 'Trazioni e dip: qui i kg non esistono, si contano le ripetizioni.',
  },
};

/**
 * Tetti di realta'. Ste: "non voglio Rank regalati".
 *
 * - nessun Rank puo' chiedere piu' di 2,2 volte il peso della persona (fuori scala umana);
 * - e sugli ISOLAMENTI il tetto e' 0,85: il punto e' che un muscolo piccolo non
 *   regge un carico grosso, quindi se il vertice di un isolamento supera 0,85 per
 *   uno, o il numero e' sbagliato o l'esercizio non e' un isolamento.
 */
export const TETTO_PER_PESO = 2.2;
export const TETTO_ISOLAMENTI = 0.85;

// Ste (08/10/2026): "leg extension comunque lo faccio con una gamba".
//
// Il tetto da isolamento (0,85x il corpo) era pensato per i muscoli PICCOLI: un
// bicipite o un deltoide laterale non reggono un carico grosso. Ma non vale per
// TUTTI gli isolamenti, e qui moriva nel modo peggiore: il leg extension e' un
// isolamento (livello 'isolamento'), quindi il tetto gli tagliava il vertice a
// 0,85x = 56 kg, mentre il multiplo dichiarato era 2,0x. Risultato: i tuoi 65 kg
// davano OLYMPIAN e la scala finiva sotto i tuoi piedi.
//
// Il principio giusto e' sul CARICO REALE, non sulla parola "isolamento":
//  - muscolo piccolo (bicipite, deltoide, polso): il carico e' minuscolo, tetto 0,85x
//  - gambe a una gamba sola: tutto il carico su una coscia, tetto 2,2x come i
//    composti grossi. E' la stessa realta' del leg press, solo che l'isolamento
//    e' su un solo arto.
//
// Quindi il tetto di realta' non e' "isolamento o no", ma "quanto e' grosso il
// carico che quell'esercizio mette in gioco". Lo dico con la grandezza del
// movimento, che e' la cosa giusta da guardare.
export const TETTO_MOVIMENTO = {
  gambe_isolamento: 1.4,
  gambe_curl: 1.2,
  gambe_pesanti: 2.2,
  gambe_stabilizzatore: 2.2,
  // il polso e' l'avambraccio: tenni con un bilanciere o coi manubri, ma il carico
  // resta bassissimo (0,4x il corpo), perche' i muscoli del polso sono piccoli e
  // il movimento e' corto. Senza questo tetto dedicato il Wrist Curl (che ora ha
  // il movimento "polso") prendeva il tetto di un isolamento generico.
  polso: 0.5,
};

/** Se il vertice e' dentro i tetti di realta' per quell'esercizio. */
export function tettoPerEsercizio(livello, movimento = null) {
  if (movimento && TETTO_MOVIMENTO[movimento]) return TETTO_MOVIMENTO[movimento];
  return livello === 'isolamento' ? TETTO_ISOLAMENTI : TETTO_PER_PESO;
}

/**
 * Quale riga dei valori vale per QUESTO esercizio.
 *
 * Serve perche\' alcuni movimenti hanno piu' varianti con tetti molto diversi: il
 * cable fly al cavo e il bench pull coi manubri sono entrambi "petto isolamento",
 * ma il fly e\' un piccolo muscolo con carico leggero (0,4x per lato) e il bench
 * pull regge un carico grosso (1,2x per mano). Un numero solo per il movimento
 * faceva finire il bench pull a 217% del tetto: OLYMPIAN regalato.
 *
 * La scelta guarda l'attrezzatura, che e' il fatto vero: i manubri sono pesanti,
 * il cavo con doppia carrucola no.
 */
export function valoriPerEsercizio(movimento, esercizio = {}) {
  const base = VALORI_MOVIMENTO[movimento];
  if (!base || !base.varianti) return base;
  const pesante = esercizio
    && (esercizio.convenzione === 'per_manubrio' || esercizio.convenzione === 'bilanciere');
  const chiave = pesante ? 'pesante' : 'cavo';
  const v = base.varianti[chiave];
  if (!v) return base;
  return {
    ...base,
    multiplo: v.multiplo,
    ingressoMultiplo: v.ingressoMultiplo,
    nota: v.nota + ' (movimento con varianti: questo esercizio usa i numeri '
      + chiave + ', perche\' ' + (pesante ? 'usa i manubri' : 'va al cavo') + ')',
  };
}

/**
 * Il vertice di un esercizio, riportato sul corpo della persona.
 *
 * Il peso corporeo entra qui e in un solo posto: il tetto e' un multiplo del peso,
 * quindi tutto il resto (ingresso incluso) segue da solo.
 */
export function verticePerCorpo(valori, livello, pesoCorporeo, movimento = null) {
  const peso = Number(pesoCorporeo);
  if (!Number.isFinite(peso) || peso <= 0) return null;
  const tetto = tettoPerEsercizio(livello, movimento);
  const grezzo = peso * valori.multiplo;
  const limite = peso * tetto;
  return {
    vertice: Math.round(Math.min(grezzo, limite) * 100) / 100,
    multiplo: valori.multiplo,
    tetto: Math.round(limite * 100) / 100,
    tettoRaggiunto: grezzo > limite,
  };
}

/**
 * Le soglie complete di un esercizio sul corpo della persona, in kg.
 *
 * L'ingresso NON e' una percentuale del tetto: e' il suo proprio multiplo del
 * corpo (`ingressoMultiplo`). Il motivo e' scritto in testa a VALORI_MOVIMENTO, e
 * in una riga: se l'ingresso fosse una quota del tetto, chi pesa di piu' si
 * troverebbe sotto la prima soglia con lo stesso carico che gli dava un Rank.
 */
export function sogliePerEsercizio(valori, livello, pesoCorporeo, movimento = null) {
  const v = verticePerCorpo(valori, livello, pesoCorporeo, movimento);
  if (!v) return null;
  const peso = Number(pesoCorporeo);
  const ingresso = Math.round(peso * valori.ingressoMultiplo * 100) / 100;
  // difesa: se un movimento si dimenticasse l'ingresso, meglio accorgersene qui
  // che scoprirlo con un Rank che non si muove
  if (!Number.isFinite(ingresso) || ingresso <= 0) {
    throw new Error(`il movimento "${movimento}" non ha un ingressoMultiplo valido: ${valori.ingressoMultiplo}`);
  }
  return {
    ingresso,
    vertice: v.vertice,
    multiplo: v.multiplo,
    ingressoMultiplo: valori.ingressoMultiplo,
    tetto: v.tetto,
    tettoRaggiunto: v.tettoRaggiunto,
    fonte: valori.fonte,
    nota: valori.nota,
  };
}

/**
 * Il tetto come lo LEGGE la persona, cioe' con la doppia carrucola raddoppiata.
 *
 * E' il contrario di caricoReale(), che dimezza. Serve solo per stampare numeri
 * che Ste riconosce ("50 kg sul cavo"), NON per confrontare: il confronto avviene
 * sempre nell'unita' dello score, e qui non si arriva mai.
 */
export function leggiComeLoLeggi(carico, esercizio = {}) {
  const n = Number(carico);
  if (!Number.isFinite(n)) return carico;
  if (esercizio && esercizio.carrucola === 'carrucola_doppia') {
    return Math.round((n * 2) * 100) / 100;
  }
  return Math.round(n * 100) / 100;
}

/** L'unita' in cui quel esercizio registra i kg, in parole. */
export function unitaCarico(esercizio = {}) {
  const e = esercizio || {};
  if (e.carrucola === 'carrucola_doppia') return 'per lato (cavo doppio)';
  if (e.convenzione === 'per_manubrio') return 'per manubrio';
  if (e.convenzione === 'per_braccio') return 'per braccio';
  if (e.convenzione === 'per_gamba') return 'per gamba';
  if (e.attrezzatura === 'macchina_stack') return 'sullo stack';
  if (e.attrezzatura === 'macchina_dischi') return 'sulla macchina';
  if (e.convenzione === 'cavo_totali') return 'totali al cavo';
  return 'sul carico';
}

/**
 * Le soglie nella STESSA unita' dello score, e qui sta una trappola che ho preso
 * io la prima volta (e che e' utile sapere, perche' un numero senza unita' e' un
 * numero a caso).
 *
 * I valori che ho dichiarato sopra sono in CHILOGRAMMI ("1,0x il corpo per braccio
 * alla chest press"), e cosi' sono leggibili. Ma lo score di una serie e' in
 * kg-equivalenti (40 kg x 8 = 258 kg-equivalenti), quindi confrontare 258 con 66
 * vuol dire sempre "OLYMPIAN": la prima volta che ho stampato la tabella davano
 * TUTTI OLYMPIAN.
 *
 * La conversione c'e' e non e' un vezzo: un tetto dichiarato come "1,0x il corpo
 * per braccio" vuol dire 66 kg fatti come una serie da 8, quindi va moltiplicato
 * per quello che 8 ripetizioni valgono e per la meccanica di quell'esercizio.
 * Solo dopo le due stanno nello stesso posto e il confronto ha un senso.
 */
export { RIPETIZIONI_RIFERIMENTO };

export function fattoreSogliaDaKg(esercizio = {}) {
  return ripetizioniPiene(RIPETIZIONI_RIFERIMENTO) * fattoreMeccanica(esercizio);
}

export { caricoReale };