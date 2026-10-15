// rank-v2/leva.js -- LA MECCANICA DELLE LEVE, e il controllo che ne fa.
//
// Ste (15/10/2026): ha fatto leggere a un'altra app un motore biomeccanico che
// ragiona sulle leve ("nelle alzate laterali a braccio teso, il peso è a 70 cm
// dalla spalla, leva svantaggiosa di 3° genere: 12 kg di alzate laterali
// chiedono uno sforzo proporzionalmente superiore a 70 kg di chest press"), e ha
// chiesto di mettere nella nostra app "tutto quello che è giusto e reale".
//
// QUELLO CHE MANCA DA NOI, e che questa pagina mette in chiaro. I numeri dei tetti
// sono GIUSTI, ma sono giusti per un motivo sbagliato: sono stati calibrati a mano
// guardando i carichi veri di Ste e dicendo "su questo esercizio il tetto è
// basso". Il tetto basso c'è, e il Rank viene fuori giusto, ma l'app non sa
// PERCHÉ è basso. Quindi un esercizio nuovo non si arrangia e la scheda non
// spiega niente.
//
// QUI NON SI CAMBIA NESSUN RANK. Qui si costruisce il conto e si confronta con i
// numeri dichiarati, e si segnalano i posti dove i due non tornano. Decidere se
// spostare un numero è una cosa che fa Ste guardando i disaccordi e dicendo se
// sono strani: lui non sa niente di leve, ma sa cosa è pesante e cosa no, e
// quella è l'informazione che manca.
//
// ---------------------------------------------------------------------------
// LA FISICA, in quattro righe
// ---------------------------------------------------------------------------
//
// Un braccio è un'asta che appoggia su un'articolazione. L'articolazione è
// l'APPOGGIO, il peso sta a una certa distanza, il muscolo tira a un'altra.
//
//   coppia sul peso   =  W × braccio del CARICO
//   coppia del muscolo =  F × braccio del MUSCOLO
//
// Per stare in equilibrio servono uguali, quindi il muscolo deve tirare con:
//
//   F = W × braccioCARICO / braccioMUSCOLO
//
// E il muscolo può tirare al massimo con una forza proporzionale alla sua
// sezione trasversale (CSA): più fibre in parallelo, più forza.
//
//   F_max ≈ CSA × tensione specifica
//
// Mettendo le due insieme, il carico massimo che quell'esercizio regge è:
//
//   W_max = CSA × tensione specifica × braccioMUSCOLO / braccioCARICO
//
// E il rapporto braccioCARICO / braccioMUSCOLO è il "grado di svantaggio": se è
// 17, il muscolo deve tirare con una forza 17 volte il peso. È la leva di terzo
// genere, la peggiore: appoggio in mezzo, sforzo corto, carico lungo.
//
// SU UN ESERCIZIO COMPOSTO il conto cambia, e per il meglio. In panca non lavora
// solo il petto: c'è il tricipite che stende il gomito e il deltoide che tiene
// la spalla. Ognuno tira sul proprio braccio di leva, e i tre insieme coprono
// quasi tutta la coppia. Quindi la sezione che conta è la SOMMA dei muscoli che
// partecipano, non quella del muscolo "principale".
//
// ---------------------------------------------------------------------------
// PERCHÉ I NUMERI NON VENGONO DIRETTAMENTE DA QUI
// ---------------------------------------------------------------------------
//
// Perché c'è una tensione specifica (quanto newton per cm² di muscolo) che varia
// da persona a persona, da muscolo a muscolo e con l'età, e perché ogni esercizio
// ha convenzioni diverse ("per braccio", "per lato", "per gamba", "totali al
// cavo") che trasformano la stessa coppia in kg diversi. Mettere dentro quei
// numeri significa inventare una precisione che non si ha.
//
// Quindi il modello serve a UNA cosa sola: dare l'ORDINE di grandezza. Si calcola
// un numero per ogni movimento, si moltiplica per una costante unica scelta perché
// la mediana del modello coincida con la mediana dei numeri dichiarati, e poi si
// guarda il RAPPORTO. Dove il rapporto è vicino a 1, la meccanica e il numero
// dichiarato dicono la stessa cosa. Dove non lo è, uno dei due mente.
//
// La costante unica è onesta: assorbe tutto quello che non si sa (la tensione
// specifica, le convenzioni, la differenza fra fibra lenta e veloce) e lascia
// libero solo il confronto fra un esercizio e l'altro, che è l'unica cosa su cui
// la meccanica ha voce.
//
// ---------------------------------------------------------------------------
// LE CIFRE
// ---------------------------------------------------------------------------
//
// CSA: sezione trasversale fisiologica, in cm², per una persona di circa 70 kg.
// Sono valori da manuale di anatomia, ripresi e arrotondati. Non sono la misura
// di nessuno in particolare: sono la taglia giusta, e il giudizio è sul confronto.
//
// braccioMUSCOLO e braccioCARICO: distanze in centimetri. Il braccio del carico è
// la distanza dall'articolazione al PESO, e per la maggior parte degli esercizi è
// la lunghezza del braccio o della gamba. Il braccio del muscolo è
// perpendicolare all'asse dell'articolazione, e cambia molto con la posizione:
// il tricipite in alto ha il braccio peggiore di tutto il corpo (per questo le
// estensioni sopra la testa sono l'esercizio più duro in assoluto).

// La lunghezza del braccio di una persona: serve per i movimenti dove il braccio
// del carico È il braccio. Non si misura a runtime, è una stima ragionata sul
// peso (vedi `lunghezzaBraccioStimata`) e si può sostituire con la misura vera.
export const BRACCIO_RIFERIMENTO = 70;

/**
 * Una stima della lunghezza del braccio (spalla → mano) dal peso corporeo.
 *
 * Serve SOLO per riempire i movimenti il cui braccio del carico è il braccio, e
 * non è un numero da cui dipende la sicurezza di niente: dentro `leVerifiche` il
 * suo peso è marginale, e un errore di 5 cm sposta la stima di qualche punto
 * percentuale senza cambiare l'ordine.
 *
 * Se un domandi Ste misura il braccio, si mette il numero vero qui e basta.
 */
export function lunghezzaBraccioStimata(pesoCorporeo) {
  const p = Number(pesoCorporeo);
  if (!Number.isFinite(p) || p <= 0) return BRACCIO_RIFERIMENTO;
  return Math.round((BRACCIO_RIFERIMENTO * Math.pow(p / 70, 0.33)) * 10) / 10;
}

// I muscoli: CSA, e il loro braccio di leva nel movimento in cui lavorano meglio.
// Il braccio del muscolo cambia con l'articolazione, quindi due muscoli diversi
// possono avere lo stesso valore in esercizi diversi.
export const MUSCOLI = {
  quadricipiti: { csa: 78, nome: 'Quadricipiti' },
  glutei: { csa: 60, nome: 'Glutei' },
  femorali: { csa: 36, nome: 'Femorali' },
  polpacci: { csa: 50, nome: 'Polpacci' },
  addome: { csa: 40, nome: 'Addome' },
  petto: { csa: 34, nome: 'Pettorali' },
  dorsali: { csa: 34, nome: 'Dorsali larghi' },
  romboidi: { csa: 24, nome: 'Romboidi e dorsale medio' },
  trapezi: { csa: 26, nome: 'Trapezi' },
  deltoide_avanti: { csa: 16, nome: 'Deltoide anteriore' },
  deltoide_laterale: { csa: 13, nome: 'Deltoide laterale' },
  deltoide_dietro: { csa: 11, nome: 'Deltoide posteriore' },
  bicipiti: { csa: 11, nome: 'Bicipiti' },
  tricipiti: { csa: 17, nome: 'Tricipiti' },
  avambraccio: { csa: 5, nome: 'Flessori del polso' },
};

/**
 * I movimenti, con la meccanica.
 *
 * `carico`   : i muscoli che lavorano, e quanto ciascuno partecipa (0-1).
 * `dCarico`  : distanza articolazione → peso, in cm. Può essere un numero
 *              scritto, o una delle due parole `'braccio'` e `'avambraccio'`,
 *              che vengono calcolate dalla lunghezza del braccio della persona.
 *              La differenza non è un dettaglio: sull'alzata laterale il peso
 *              sta a 70 cm dalla spalla (tutto il braccio), e sul curl sta a 35 cm
 *              dal gomito (solo l'avambraccio). Usare il numero sbagliato cambia
 *              il carico massimo di un fattore 2, e di conseguenza sposta il
 *              tetto di un Rank intero.
 * `dMuscolo` : braccio di leva del muscolo principale, in cm, perpendicolare
 *              all'articolazione NELLA POSIZIONE DELL'ESERCIZIO.
 * `unita`    : a cosa sono riferiti i kg che Ste scrive (per arm, per lato, ...).
 *              Serve solo per capire il conto, non per cambiare i numeri.
 */
export const LEVE = {
  spinta_orizzontale: {
    muscoli: { petto: 0.7, tricipiti: 0.2, deltoide_avanti: 0.1 },
    dMuscolo: 5.0,
    dCarico: 55,
    unita: 'per braccio',
    nota: 'Braccia orizzontali: la panca. Il petto ha il braccio di leva piu\' generoso di tutti i muscoli della spalla, e per meta\' del movimento non e\' solo lui a tirare.',
  },
  petto_isolamento: {
    muscoli: { petto: 0.85, deltoide_avanti: 0.15 },
    dMuscolo: 4.5,
    dCarico: 'braccio',
    
    unita: 'per lato',
    nota: 'Il gomito e\' leggermente piegato e non si stende: e\' il caso in cui il tricipite non lavora quasi per niente. Per questo il carico resta basso.',
  },
  spinta_verticale: {
    muscoli: { deltoide_avanti: 0.6, tricipiti: 0.3, trapezi: 0.1 },
    dMuscolo: 3.5,
    dCarico: 'braccio',
    
    unita: 'per manubrio',
    nota: 'Braccia in alto: la leva sul deltoide e\' la peggiore della spalla, e il peso e\' a 70 cm. Ma il tricipite stende il gomito per meta\' del movimento e quello ha un braccio suo.',
  },
  spalle_isolamento: {
    muscoli: { deltoide_laterale: 0.95, trapezi: 0.05 },
    // il caso peggiore in assoluto: braccio del carico a 70 cm, deltoide che
    // tira da 3,8 cm. Il muscolo deve fare una forza 18 volte il peso.
    dMuscolo: 3.8,
    dCarico: 'braccio',
    
    unita: 'per lato',
    nota: 'Braccia a teso di lato, il peso a 70 cm dalla spalla e il deltoide che tira da meno di 4 cm: leva di terzo genere, la peggiore che ci sia. Per questo 10 kg qui sono piu\' duri di 50 kg in panca.',
  },
  spalle_posteriori: {
    muscoli: { deltoide_dietro: 0.9, romboidi: 0.1 },
    dMuscolo: 2.8,
    // NUMERO SCRITTO, e NON 'braccio'. Sul reverse fly i gomiti sono piegati, quindi
    // la mano sta lontana dalla spalla molto meno che con il braccio teso: 55 cm e
    // non 70. Con 'braccio' la leva veniva gonfiata del 27% e il tetto sarebbe
    // uscito più basso del dovuto.
    dCarico: 55,
    unita: 'per lato',
    nota: 'Braccia aperte dietro: il deltoide posteriore è il muscolo più piccolo della spalla e con il braccio di leva più corto, perché lavora in posizione raccorciata. I gomiti piegati portano il peso più vicino alla spalla che nell\'alzata laterale, e per questo regge un po\' più nonostante il muscolo sia più piccolo.',
  },
  spalle_trapezio: {
    muscoli: { trapezi: 1 },
    dMuscolo: 6.0,
    dCarico: 30,
    unita: 'per manubrio',
    nota: 'Scrollare le spalle: le braccia sono corte e il trapezio tira su per meta\' della spalla, quindi ha un braccolo buono. E\' il movimento piu\' generoso della spalla.',
  },
  tirata_verticale: {
    muscoli: { dorsali: 0.6, bicipiti: 0.25, romboidi: 0.15 },
    dMuscolo: 5.0,
    dCarico: 65,
    unita: 'sul carico',
    nota: 'Tirare in basso: il dorsale ha il braccio di leva del bicipite (la scapola ruota attorno all\'omero) ed e\' un muscolo grande, ma il bicipite tiene il gomito piegato e lavora con un braccolo suo.',
  },
  tirata_orizzontale: {
    muscoli: { romboidi: 0.5, dorsali: 0.3, deltoide_dietro: 0.2 },
    dMuscolo: 6.0,
    dCarico: 60,
    unita: 'sul carico',
    nota: 'Tirare verso di se\': il romboide ha il braccio di leva piu\' lungo di tutti i muscoli della schiena, perche\' la scapola raddrizza. Per questo regge piu\' del dorsale largo.',
  },
  tirata_manubri: {
    muscoli: { romboidi: 0.6, dorsali: 0.25, deltoide_dietro: 0.15 },
    dMuscolo: 6.0,
    dCarico: 50,
    unita: 'per manubrio',
    nota: 'Tirata prona coi manubri: stessa meccanica del remo ma il carico e\' piu\' vicino al corpo, e il petto del tutto non partecipa.',
  },
  bicipiti: {
    muscoli: { bicipiti: 1 },
    // il bicipite ha il braccio di leva peggiore quando il gomito e\' disteso,
    // e quindi la panca Scott (braccio in alto) e' piu' difficile del cavo
    // (braccio in basso) con gli stessi kg.
    dMuscolo: 3.5,
    dCarico: 'avambraccio',
    unita: 'per lato',
    nota: 'Il bicipite e\' un muscolo piccolo con un braccio di leveraggio molto corto, e il braccio del carico e\' metà del braccio della persona.',
  },
  bicipiti_panca: {
    muscoli: { bicipiti: 1 },
    dMuscolo: 2.6,
    dCarico: 'avambraccio',
    unita: 'per braccio',
    nota: 'In panca Scott il braccio e\' in alto: il bicipite e\' allungato e il suo braccio di leva scende a 2,6 cm, il peggiore. E\' per questo che lo stesso numero di kg li\' e\' piu\' difficile che al cavo.',
  },
  tricipiti: {
    muscoli: { tricipiti: 1 },
    dMuscolo: 2.8,
    dCarico: 'avambraccio',
    unita: 'per lato',
    nota: 'Stendere il gomito: il tricipite tira vicino all\'articolazione, quindi ha uno dei bracci di leva peggiori del braccio.',
  },
  tricipiti_sopra: {
    muscoli: { tricipiti: 1 },
    // il peggiore di tutti: braccio in alto, il tricipite allungato, e la
    // spalla in posizione estremamente flessa che scarica poco.
    dMuscolo: 1.9,
    dCarico: 'avambraccio',
    unita: 'per lato',
    nota: 'Sopra la testa il tricipite e\' al suo peggio: braccio di leva 1,9 cm, il piu\' corto del corpo. E\' il motivo per cui le estensioni sopra la testa reggono cosi\' poco.',
  },
  gambe_pesanti: {
    muscoli: { quadricipiti: 0.45, glutei: 0.35, femorali: 0.2 },
    dMuscolo: 4.5,
    dCarico: 55,
    unita: 'sul carico',
    nota: 'Leg press e simili: e\' il movimento con la sezione muscolare piu\' grande del corpo (quadricipiti + glutei + femorali, oltre 170 cm2) e con tre muscoli che tirano insieme. Per questo regge piu\' di ogni altra cosa.',
  },
  gambe_stabilizzatore: {
    muscoli: { polpacci: 0.5, quadricipiti: 0.5 },
    dMuscolo: 4.0,
    dCarico: 45,
    unita: 'per gamba',
    nota: 'Calf raise su pressa orizzontale: i polpacci tirano ma le gambe spingono la pedana come in una leg press, quindi il carico e\' molto piu\' grosso di quanto dicano i kg di polpaccio.',
  },
  gambe_isolamento: {
    muscoli: { quadricipiti: 1 },
    dMuscolo: 4.0,
    dCarico: 40,
    unita: 'per gamba',
    nota: 'Leg extension a una gamba sola: tutto il carico su un quadricipite solo, e\' un muscolo grande ma da solo.',
  },
  gambe_curl: {
    muscoli: { femorali: 1 },
    dMuscolo: 4.0,
    dCarico: 40,
    unita: 'per gamba',
    nota: 'Leg curl: il femorale e\' circa la meta\' del quadricipite, e su un solo arto.',
  },
  polso: {
    muscoli: { avambraccio: 1 },
    dMuscolo: 1.2,
    dCarico: 30,
    unita: 'sul carico',
    nota: 'Flessori del polso: il braccio di leva e\' 1,2 cm, il piu\' corto del corpo dopo le estensioni sopra la testa. Per questo il carico resta bassissimo pur essendo un muscolo piccolo.',
  },
  polpacci: {
    muscoli: { polpacci: 1 },
    dMuscolo: 5.0,
    dCarico: 45,
    unita: 'per gamba',
    nota: 'Calf raise col carrello: il polpaccio ha un braccio di leva buono (5 cm) e il carico arriva dal basso, quindi regge piu\' di quanto sembri, ma resta un muscolo piccolo.',
  },
  polpacci_pressa: {
    // la stessa identica muscolatura, ma il carico arriva dalla pila di dischi
    // sotto i piedi e le gambe spingono come in una leg press.
    muscoli: { polpacci: 0.35, quadricipiti: 0.65 },
    dMuscolo: 4.0,
    dCarico: 50,
    unita: 'per gamba',
    nota: 'Calf raise sulla pressa orizzontale: gli stessi polpacci, ma il carico e\' una pila di dischi e le gambe spingono come in una leg press. Per questo lo stesso muscolo regge molto di piu\' su questa macchina.',
  },
  addome: {
    muscoli: { addome: 1 },
    dMuscolo: 3.0,
    dCarico: 30,
    unita: 'sul carico',
    nota: 'Crunch: il braccio del carico e\' corto (gli avambracci appoggiati al capo non sono un braccio di 70 cm), quindi regge piu\' di quanto sembri.',
  },
};

/**
 * Il braccio del carico in centimetri, risolto dai numeri scritti e dalla
 * lunghezza del braccio della persona.
 *
 * 'braccio'     = tutto il braccio, dalla spalla alla mano: è dove sta il peso
 *                 quando l'articolazione che lavora è la SPALLA.
 * 'avambraccio' = dal gomito alla mano: è dove sta il peso quando l'articolazione
 *                 che lavora è il GOMITO, cioè curl, pushdown ed estensioni.
 *
 * La distinzione è quella che il modello di prima sbagliava, e sbagliava grosso:
 * mettere 70 cm dove ne servono 35 dimezza il carico massimo e abbassa il tetto di
 * un Rank intero, su tutti i movimenti del braccio insieme.
 */
export function braccioDelCarico(dCarico, { pesoCorporeo = 70 } = {}) {
  const braccio = lunghezzaBraccioStimata(pesoCorporeo);
  if (dCarico === 'braccio') return braccio;
  if (dCarico === 'avambraccio') return Math.round(braccio * 0.5 * 10) / 10;
  return Number(dCarico);
}

/**
 * Il "grado di svantaggio" di un movimento: quante volte il muscolo deve tirare
 * piu\' di quanto tira il peso.
 *
 * 1 significa che il muscolo ha vantaggio (braccio del muscolo = braccio del
 * carico). 18 significa che deve tirare 18 volte tanto: e\' l\'alzata laterale.
 */
export function gradoSvantaggio(movimento, { pesoCorporeo = 70 } = {}) {
  const l = LEVE[movimento];
  if (!l) return null;
  const dCarico = braccioDelCarico(l.dCarico, { pesoCorporeo });
  if (!Number.isFinite(dCarico) || dCarico <= 0) return null;
  return Math.round((dCarico / l.dMuscolo) * 100) / 100;
}

/**
 * La sezione muscolare che lavora davvero, in cm²: la somma dei muscoli del
 * movimento, ognuno pesato per quanto partecipa.
 */
export function sezioneCheLavora(movimento) {
  const l = LEVE[movimento];
  if (!l) return null;
  let totale = 0;
  for (const [nome, quota] of Object.entries(l.muscoli)) {
    const m = MUSCOLI[nome];
    if (!m) continue;
    totale += m.csa * quota;
  }
  return Math.round(totale * 10) / 10;
}

/**
 * Il carico massimo che il movimento regge, in "unita' di sezione muscolare".
 *
 * E' il numero che la meccanica dice, SENZA sapere la tensione specifica e senza
 * sapere se i kg che Ste scrive sono per braccio o totali: per questo si chiama
 * cosi' e non "kg". Serve solo a confrontare un movimento con l'altro.
 */
export function caricoMeccanico(movimento, { pesoCorporeo = 70 } = {}) {
  const l = LEVE[movimento];
  if (!l) return null;
  const svantaggio = gradoSvantaggio(movimento, { pesoCorporeo });
  const sezione = sezioneCheLavora(movimento);
  if (!svantaggio || !sezione) return null;
  return Math.round((sezione / svantaggio) * 100) / 100;
}

/**
 * IL CONTROLLO: la meccanica e il numero dichiarato dicono la stessa cosa?
 *
 * Restituisce per ogni movimento: il multiplo che c'e' scritto oggi, quello che
 * la meccanica suggerisce, e il rapporto fra i due. Un rapporto lontano da 1 e'
 * un posto dove uno dei due numeri mente, e va guardato da Ste.
 *
 * La costante e' scelta sulla mediana, non sulla media: cosi' la scala non la
 * decide un solo esercizio su tre, e il confronto resta leggibile.
 */
export function leVerifiche(VALORI_MOVIMENTO, { pesoCorporeo = 70, raggio = 0.45 } = {}) {
  const righe = [];
  for (const movimento of Object.keys(LEVE)) {
    const dichiarato = VALORI_MOVIMENTO[movimento];
    if (!dichiarato || !dichiarato.multiplo) continue;
    const meccanico = caricoMeccanico(movimento, { pesoCorporeo });
    if (!meccanico) continue;
    righe.push({ movimento, dichiarato: dichiarato.multiplo, meccanico });
  }
  if (!righe.length) return [];

  const mediana = (numeri) => {
    const v = [...numeri].sort((a, b) => a - b);
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  };
  const centroMec = mediana(righe.map((r) => r.meccanico));
  const centroDic = mediana(righe.map((r) => r.dichiarato));
  const costante = centroDic / centroMec;

  return righe
    .map((r) => {
      const suggerito = Math.round((r.meccanico * costante) * 1000) / 1000;
      const rapporto = Math.round((r.dichiarato / suggerito) * 100) / 100;
      return {
        movimento: r.movimento,
        dichiarato: r.dichiarato,
        suggerito,
        rapporto,
        daccordo: Math.abs(rapporto - 1) <= raggio,
        gradoSvantaggio: gradoSvantaggio(r.movimento, { pesoCorporeo }),
        sezione: sezioneCheLavora(r.movimento),
        nota: LEVE[r.movimento].nota,
        unita: LEVE[r.movimento].unita,
      };
    })
    .sort((a, b) => a.rapporto - b.rapporto);
}

/**
 * LA DOMANDA A CUI STE PUÒ RISPONDERE: due esercizi che stanno sulla STESSA
 * scala, la meccanica li vuole diversi?
 *
 * Questa è la parte del controllo in cui il modello è fidato, e vale la pena di
 * dire perché. La tensione specifica (newton per cm² di muscolo) cambia molto da
 * un gruppo all'altro, quindi il confronto fra due muscoli DIVERSI non è lecito e
 * quello che dice va preso con le molle. Ma due movimenti dello STESSO muscolo
 * sono un confronto lecito: la tensione specifica è la stessa e si cancella dal
 * conto. E in quel caso la meccanica ha voce piena.
 *
 * E il caso è reale, perché l'app mette sulla stessa scala esercizi che sono
 * diversi per meccanica. Oggi `tricipiti` copre sia il pushdown sia l'estensione
 * sopra la testa: il gomito dell'una è piegato e la spalla in alto, il braccio
 * di leva del tricipite passa da 2,8 cm a 1,9 cm, e lo stesso numero di kg li' è
 * un altro esercizio.
 *
 * `ragione` è la differenza minima perché due movimenti vengano segnalati come
 * "dovrebbero stare su scale diverse": sotto quella soglia la differenza è vera
 * ma non vale un tetto diverso.
 */
export function scaleDaSeparare(VALORI_MOVIMENTO, { pesoCorporeo = 70, ragione = 1.2 } = {}) {
  const coppie = [];
  const conScala = Object.keys(VALORI_MOVIMENTO)
    .filter((m) => VALORI_MOVIMENTO[m] && VALORI_MOVIMENTO[m].multiplo && LEVE[m]);

  for (const movimento of Object.keys(LEVE)) {
    // il movimento e' gia' sulla sua scala: niente da segnalare
    const v = VALORI_MOVIMENTO[movimento];
    if (v && v.multiplo) continue;
    // ATTENZIONE AL FALSO POSITIVO. Un movimento puo' non avere una riga propria
    // e NON essere un bug: se il suo gemello ha delle `varianti`, l'app gia' lo
    // distingue per macchina. E' il caso dei polpacci, che hanno una riga sola
    // (`polpacci`) con due varianti dentro (`carrello` e `pressa`), e senza questo
    // controllo il modello segnalerebbe ogni volta che la pressa orizzontale
    // regge piu' del carrello, che e' una cosa che l'app sa gia'.
    const gemelloVarianti = Object.values(VALORI_MOVIMENTO)
      .some((x) => x && x.varianti && Object.keys(x.varianti)
        .some((k) => movimento.endsWith(k) || movimento.includes(k)));
    if (gemelloVarianti) continue;
    // il movimento c'e' ma nessuno lo usa: si vede solo se qualcuno nella
    // tabella dei movimenti ha lo stesso muscolo principale e una scala
    const dominante = muscoloDominante(movimento);
    for (const altro of conScala) {
      if (muscoloDominante(altro) !== dominante) continue;
      const ca = caricoMeccanico(movimento, { pesoCorporeo });
      const cb = caricoMeccanico(altro, { pesoCorporeo });
      if (!ca || !cb) continue;
      const rapporto = Math.round((Math.max(ca, cb) / Math.min(ca, cb)) * 100) / 100;
      if (rapporto < ragione) continue;
      coppie.push({
        movimento,
        gemello: altro,
        scalaDellAltro: VALORI_MOVIMENTO[altro].multiplo,
        rapporto,
        differenza: Math.round((Math.max(ca, cb) / Math.min(ca, cb) - 1) * 100),
        piuDifficile: ca < cb ? movimento : altro,
        nota: `"${movimento}" non ha una scala sua e finisce su quella di `
          + `"${altro}" (${VALORI_MOVIMENTO[altro].multiplo}x), ma la meccanica dice `
          + `che regge ${Math.round((Math.max(ca, cb) / Math.min(ca, cb) - 1) * 100)}% `
          + `in meno a parita' di kg`,
      });
      break;
    }
  }
  return coppie.sort((x, y) => y.rapporto - x.rapporto);
}

/**
 * Il muscolo che conta di piu' in un movimento: quello con la quota piu' alta fra
 * i muscoli dell'articolazione principale. Serve a capire "di cosa stiamo
 * parlando" quando due movimenti hanno nomi diversi ma lo stesso muscolo sotto.
 */
export function muscoloDominante(movimento) {
  const l = LEVE[movimento];
  if (!l) return null;
  let migliore = null;
  let quota = -1;
  for (const [nome, q] of Object.entries(l.muscoli)) {
    if (q > quota) { quota = q; migliore = nome; }
  }
  return migliore;
}

/**
 * LA DOMANDA A CUI STE NON PUÒ RISPONDERE (quindi non viene scritta da nessuna
 * parte): se un numero dichiarato sia giusto in assoluto.
 *
 * Per quello il modello non è abbastanza forte, e va detto chiaro invece di
 * fingere: la tensione specifica varia di parecchio fra il quadricipite e il
 * flessore del polso, e mettere la stessa costante per tutti bacia via metà del
 * segnale. Quindi `leVerifiche` serve per ordinare i movimenti per grandezza, non
 * per dichiarare che un numero è sbagliato.
 */