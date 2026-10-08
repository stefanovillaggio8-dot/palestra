// rank-config.js -- la configurazione del gioco: rank, soglie, misure.
//
// Tutto quello che si puo' cambiare senza toccare la logica sta QUI dentro.
// Se domani vuoi un rank nuovo, una soglia diversa o un esercizio con un
// riferimento proprio, si modifica questo file e basta: nessun'altra riga di
// codice da toccare.
//
// Le soglie sono MULTIPLI del riferimento dell'esercizio, quindi ogni esercizio
// ha soglie sue. 50 kg di Chest Press e 50 kg di Lateral Raise NON possono
// darsi lo stesso rank, perche' i due esercizi hanno due riferimenti diversi.

// ---------------------------------------------------------------------------
// 1. I sette rank, in ordine.
// ---------------------------------------------------------------------------

export const RANK = [
  { id: 'bronze',   nome: 'BRONZE',   colore: '#c9743a', ombra: '#5a2f14' },
  { id: 'silver',   nome: 'SILVER',   colore: '#c3ccdb', ombra: '#4a5568' },
  { id: 'gold',     nome: 'GOLD',     colore: '#ffc93c', ombra: '#6b4d00' },
  { id: 'platinum', nome: 'PLATINUM', colore: '#4fe3c1', ombra: '#0d5c4c' },
  { id: 'diamond',  nome: 'DIAMOND',  colore: '#8ad6ff', ombra: '#12496f' },
  { id: 'titan',    nome: 'TITAN',    colore: '#ff4d5e', ombra: '#5c0f18' },
  { id: 'olympian', nome: 'OLYMPIAN', colore: '#ffd166', ombra: '#0d5fa8' },
];

/** I due colori dell'Olympian: oro + azzurro, come richiesto. */
export const OLYMPIAN_SECONDARIO = '#4fc3ff';

export const RANK_PER_ID = new Map(RANK.map((r, i) => [r.id, { ...r, indice: i }]));

/**
 * Le divisioni dentro un rank.
 *
 * Ste (07/10/2026): "comunque falli al contrario. Nel senso che GOLD 3 e' piu' alto
 * di GOLD 1 ecc" e "il massimo deve essere GOLD 3".
 *
 * Prima erano al contrario (III la piu' bassa, I la piu' alta): e' la convenzione
 * dei videogiochi, dove si parte da Diamond IV e si sale a Diamond I. Ma qui e'
 * controintuitivo perche' sembra che "Gold 1" valga piu' di "Gold 3", e uno che
 * non ha mai giocato lo legge al contrario. Ste ha deciso: il numero sale con la
 * prestazione.
 *
 * Quindi: I = il gradino basso (0 LP), II = quello di mezzo, III = il piu' alto
 * (dai 67 LP in su, fino alla soglia del Rank dopo). E i due trattini sono la
 * divisione, i punti invece sono gli LP, che vanno da 0 a 99 dentro il Rank.
 */
export const DIVISIONI = [
  { id: 1, nome: 'I',   min: 0 },
  { id: 2, nome: 'II',  min: 34 },
  { id: 3, nome: 'III', min: 67 },
];

export function divisioneDaLp(lp) {
  const n = Math.max(0, Number(lp) || 0);
  let scelta = DIVISIONI[0];
  for (const d of DIVISIONI) if (n >= d.min) scelta = d;
  return scelta;
}

/**
 * La divisione DOPO quella indicata, con gli LP in cui la raggiungi.
 *
 * Prima questa cosa stava dentro rank.js con un elenco scritto a mano
 * (['III','II','I']) e un conto fatto a mano (100 - 33 * (2 - i)): due numeri
 * scritti due volte che potevano andare in disaccordo, ed e' successo (la
 * divisione risultava sempre null). Adesso l'elenco UNO e' DIVISIONI e l'aLp e'
 * il "min" della divisione che viene dopo: non c'e' piu' niente da tenere
 * allineato a mano.
 */
export function divisioneSuccessiva(divisione) {
  const nome = divisione && divisione.nome ? String(divisione.nome).toUpperCase() : '';
  const i = DIVISIONI.findIndex((d) => d.nome === nome);
  if (i < 0 || i >= DIVISIONI.length - 1) return null;
  const d = DIVISIONI[i + 1];
  return { nome: d.nome, aLp: d.min };
}

// ---------------------------------------------------------------------------
// 2. I tipi di misura di un esercizio.
//    Ogni tipo ha il suo modo di calcolare la "forza" della serie.
// ---------------------------------------------------------------------------

export const MISURE = {
  KG_REPS: 'kg_reps',      // kg + ripetizioni -> stima 1RM
  SOLO_REPS: 'solo_reps',  // solo ripetizioni (corpo libero, panca, trazioni)
  TEMPO: 'tempo',          // secondi tenuti
  DISTANZA: 'distanza',     // metri
  KG_TEMPO: 'kg_tempo',    // kg tenuti per dei secondi
};

export const ETICHETTE_MISURA = {
  [MISURE.KG_REPS]: 'KG + REPS',
  [MISURE.SOLO_REPS]: 'SOLO REPS',
  [MISURE.TEMPO]: 'TEMPO',
  [MISURE.DISTANZA]: 'DISTANZA',
  [MISURE.KG_TEMPO]: 'KG + TEMPO',
};

/** Il campo della serie dove scrivere il valore, e come chiamarlo. */
export const CAMPO_MISURA = {
  [MISURE.KG_REPS]: { valore: 'peso', unita: 'kg', secondario: 'ripetizioni' },
  [MISURE.SOLO_REPS]: { valore: 'ripetizioni', unita: 'rip', secondario: null },
  [MISURE.TEMPO]: { valore: 'ripetizioni', unita: 'secondi', secondario: null },
  [MISURE.DISTANZA]: { valore: 'ripetizioni', unita: 'metri', secondario: null },
  [MISURE.KG_TEMPO]: { valore: 'peso', unita: 'kg', secondario: 'ripetizioni' },
};

// ---------------------------------------------------------------------------
// 3. La scala dei rank.
//    I multipli sono relativi al RIFERIMENTO dell'esercizio, che vale
//    come un PLATINUM. Sotto il riferimento si sta bene, molto sopra si e' un
//    campione. Ogni esercizio ha il suo riferimento, quindi le soglie sono sue.
// ---------------------------------------------------------------------------

/**
 * x il riferimento: bronze, silver, gold, platinum(=1), diamond, titan, olympian.
 *
 * Ste (04/10/2026), due volte sulla stessa cosa:
 *  - "il posizionamento del grado deve variare per esercizio, ci sono esercizi
 *    piu' difficili e piu' facili tipo con la chest press 35 kg x 8 mi sembra
 *    poco argento 3 o no?"  -> l'argento deve arrivare con una serie normale
 *  - poi, sapendo che pesa 66 kg: la stessa 35x8 doveva dargli ARGENTO 3
 *
* Quindi: l'oro resta impegnativo (88%), il platino è il traguardo (100%), e
 * l'argento è il salto vero ma raggiungibile con una serie onesta. Il bronzo
 * è il gradino d'ingresso, non un premio.
 *
 * Ste (04/10/2026): "per essere olympian 110 kg? manco Ronnie Coleman
 * riuscirebbe, devi renderla realistica". Aveva ragione: sopra il platino la
 * scala cresceva a multiplicative (1.22, 1.52, 1.90) e l'OLYMPIAN finiva a
 * 1.9 volte il platino. Su una chest press, a 66 kg di persona, voleva dire
 * 113 kg di massimale, cioe' 89 kg x 8: non e' un obiettivo, e' un numero
 * inventato.
 *
 * Quindi sopra il platino i gradini sono ravvicinati: il diamondo e' un passo
 * oltre, il titan e' il serio, l'olympian e' il vertice. E resta un tetto:
 * nessun rank puo' chiedere piu' di 2.2 volte il peso della persona, che
 * sarebbe gia' fuori scala umana.
 */
export const MOLTIPLICATORI_SOGLIA = [0.50, 0.72, 0.88, 1.00, 1.10, 1.22, 1.35];

/** Oltre questo multiplo del peso, il rank non e' piu' realistico. */
export const TETTO_PER_PESO = 2.2;

/** Sotto questa soglia non c'e' rank: l'esercizio e' "non ancora valutato". */
export const SOGLIA_MINIMA_ASSOLUTA = 0.0001;

/**
 * Quanti punti di differenza servono per salire di un rank: serve a trasformare
 * il progresso in LP. Ogni rank ha lo stesso "spessore" in multipli, quindi i
 * LP sono sempre comparabili fra un esercizio e l'altro.
 */
export function spessoreSoglia(profilo, indiceRank) {
  const soglie = profilo.soglie;
  const i = Math.max(0, Math.min(indiceRank, soglie.length - 1));
  const sotto = soglie[i];
  const sopra = soglie[i + 1];
  if (sopra === undefined || sopra <= sotto) return 1;
  return sopra - sotto;
}

// ---------------------------------------------------------------------------
// 3 bis. Quanto e' difficile l'esercizio.
// Ste (04/10/2026): "i rank per ogni esercizio devono adattarsi al tipo di
// esercizio, se e' difficile, facile, medio. Tipo alzate laterali e'
// difficile quindi anche un carico basso puo' essere tanto".
//
// Ha ragione, ed e' il punto che mancava: avevo scritto 27 numeri a mano e non
// si capiva da dove venissero. Ora ogni esercizio ha un LIVELLO di difficolta'
// e il suo riferimento nasce da li'.
//
// I rapporti dicono quanto vale il PLATINUM in rapporto al peso della persona:
// sull'esercizio grande e forte (leg press) vale circa il doppio del peso, su
// un esercizio vero di palestra circa il peso, e su un isolamento circa un
// quarto. E' esattamente il punto di Ste: sulle alzate laterali un carico
// basso e' gia' tanto.
// ---------------------------------------------------------------------------

// il classificatore: se l'esercizio non e' nella lista scritta a mano,
// il livello lo capisce dal nome ("Dumbbell Lateral Raise" -> isolamento)
import { classificaEsercizio } from './esercizi-classificatore.js';
import { parteDiMuscolo, intrinsecoDi } from './muscoli-parti.js';
import { scalaSulCorpo } from './scala-esercizi.js';
import { scalaDerivata } from './scala-auto.js';

export const LIVELLI_DIFFICOLTA = {
  grande:     { id: 'grande',     nome: 'GRANDE',     rapporto: 1.85 },
  composto:   { id: 'composto',   nome: 'COMPOSTO',   rapporto: 0.90 },
  isolamento: { id: 'isolamento', nome: 'ISOLAMENTO', rapporto: 0.34 },
  assistito:  { id: 'assistito',  nome: 'ASSISTITO',  rapporto: null },
};

/**
 * Il livello NON e' piu' scritto a mano.
 *
 * Ste: "deve capire il livello di difficolta', deve essere molto forte questo
 * classificatore, e' la cosa piu' importante quindi falla bene".
 *
 * Prima c'era una lista di 27 righe scritte da me. Adesso l'unica fonte e' il
 * classificatore, che guarda che movimento e', come e' fatto e con che cosa, e
 * la lista e' sparita. Motivo: due elenchi che possono andare in disaccordo
 * sono due risposte diverse alla stessa domanda, e quello che conta e' che la
 * risposta sia sempre la stessa.
 *
 * Se un giorno un esercizio va corretto, si corregge UNA parola chiave nel
 * classificatore, e vale per tutti quelli che sembrano a lui.
 */
export const LIVELLO_ESERCIZI = {};

/**
 * Come si spiega il livello di un esercizio, in italiano semplice.
 *
 * Serve perché il numero da solo non dice niente: 12 kg su un esercizio di
 * isolamento sono tantissimi, e 12 kg su un leg press sono niente.
 * Ste: "tipo alzate laterali e' difficile quindi anche un carico basso puo'
 * essere tanto".
 */
export function descrizioneLivello(livello) {
  const d = LIVELLI_DIFFICOLTA[livello] || LIVELLI_DIFFICOLTA.composto;
  if (livello === 'isolamento') {
    return 'ISOLAMENTO · carico basso, ma il muscolo lavora tanto';
  }
  if (livello === 'grande') {
    return 'GRANDE · carichi alti, movimento facilitato';
  }
  if (livello === 'assistito') {
    return 'ASSISTITO · contano le ripetizioni, non i kg';
  }
  return 'COMPOSTO · esercizio di forza vero, qui contano i kg';
}

/**
 * Il livello di un esercizio.
 *
 * Ste (04/10/2026): "deve riconoscere si, per questo ti ho detto se puoi
 * metterci un ia".
 *
 * L'ordine e' importante:
 *   1) se l'esercizio e' nella lista scritta a mano,vinca quella (l'ho
 *      verificata una per una e so che e' giusta);
 *   2) altrimenti lo RICONOSCO dal nome, con il classificatore.
 */
/**
 * Le correzioni che Ste ha fatto dal telefono: esercizio -> livello.
 *
 * Ste: "imparare dalle tue correzioni... la correzione resta salvata e vale per
 * sempre". Quando corregge un livello, la correzione entra qui dentro e da quel
 * momento vince su tutto il resto.
 *
 * Vive in memoria perche' il Rank lo calcola mille volte mentre disegna una
 * schermata: leggerlo dal database ogni volta sarebbe lentissimo. Lo carico una
 * volta sola all'avvio dell'app.
 */
let LIVELLI_IMPARATI = {};

export function impostaLivelliImparati(mappa) {
  LIVELLI_IMPARATI = (mappa && typeof mappa === 'object') ? mappa : {};
}

export function livelliImparati() {
  return { ...LIVELLI_IMPARATI };
}

export function livelloEsercizio(esercizio) {
  const id = (esercizio && esercizio.id) || '';
  const nome = (esercizio && esercizio.nome) || id;
  const convenzione = (esercizio && esercizio.convenzione) || null;

  // 1) se l'ha imparato, vale quello che ha detto Ste
  const imparato = LIVELLI_IMPARATI[id];
  if (imparato) return imparato;

  // 2) se e' scritto "corpo libero", si contano le ripetizioni
  if (convenzione === 'corpo_libero' || convenzione === 'assistenza') return 'assistito';

  // 3) altrimenti lo riconosce dal nome
  return classificaEsercizio({
    nome, convenzione,
    attrezzatura: (esercizio && esercizio.attrezzatura) || null,
    bracciaIndipendenti: !!(esercizio && esercizio.bracciaIndipendenti),
  }).livello;
}

/** Anche il gruppo muscolare, quando serve saperlo. */
export function gruppoEsercizio(esercizio) {
  const id = (esercizio && esercizio.id) || '';
  const nome = (esercizio && esercizio.nome) || id;
  return classificaEsercizio({ nome, convenzione: (esercizio && esercizio.convenzione) || null }).gruppo;
}

/**
 * Il rapporto di difficolta' di un esercizio, CORRETTO sul muscolo.
 *
 * Ste: "deve capire cosa lavora quell'esercizio e quindi capire se e'
 * difficile o facile".
 *
 * Questa e' la riga che decide il Rank, quindi qui il muscolo smette di essere
 * una frase a schermo e diventa un numero. Prima la soglia dipendeva solo dal
 * livello: tutte le alzate laterali valevano come tutte le altre spinte. Non
 * e' vero. Sul deltoide laterale 4 kg sono gia' tanto, perche' il muscolo e'
 * piccolo e ti tiene in equilibrio; sul quadricipite 40 kg sono la norma.
 *
 * Per questo il rapporto SCENDA quando il muscolo e' piccolo e instabile: e'
 * piu' facile impressionare, quindi il PLATINUM arriva con meno peso. Non
 * sale mai, e per una ragione precisa: se il muscolo e' grande e la macchina
 * aiuta, lo sa gia' il classificatore dagli accorgimenti. Se anche qui
 * alzassimo, si contava due volte e il giudizio finiva sotto terra.
 *
 * Cosa resta identico, e va detto perche' Ste ci ha fatto i conti: la panca
 * (composto, petto) non cambia di una virgola, quindi il suo Silver III a 35
 * kg x 8 resta esattamente quello.
 */
/**
 * Correzione per TIPO DI MOVIMENTO, non solo per livello.
 *
 * Ste: "ma sono diversi". Aveva ragione, e si riferiva a una cosa che avevo
 * scritto io: avevo detto che chest press e iso-lateral row si comportano
 * uguale. Uguagliano SOLO la parte meccanica (dischi veri, bracci indipendenti).
 * L'esercizio e' un altro e il Rank non lo sapeva: entrambi sono "composto",
 * quindi prendevano lo stesso rapporto 0.90. Un petto e un dorso non valgono la
 * stessa cosa, e con un solo rapporto per livello l'app non poteva distinguerli.
 *
 * Perche' questi numeri sono (e non sono) una scienza:
 *  - NON sono inventati a caso: la direzione e' quella nota da chi si allena.
 *    Di solito su una TIRATA ORIZZONTALE si carica piu' che su una SPINTA
 *    ORIZZONTALE, quindi impressionare tirando e' piu' difficile e la soglia
 *    deve SALIRE. E la SPINTA VERTICALE (military) e' l'esercizio di spinta che
 *    regge meno, quindi la soglia scende.
 *  - NON sono misurati sulla persona di Ste: sono percentuali prudenti. Chiunque
 *    puo' correggerli, e l'app li mostra ogni volta, quindi un numero sbagliato
 *    almeno si vede.
 *
 * Il correttivo e' PICCOLO di proposito. Sui Rank veri di Ste vale 6-12%: se
 * questi numeri fossero sbagliati di molto, gli sposterebbero tutti insieme e io
 * non potrei accorgermene. Meglio una correzione piccola e discussa che una
 * grossa e arbitraria.
 */
const CORRETTIVO_MOVIMENTO = {
  // spinte
  spinta_orizzontale: 1.00, // panca, chest press: la base di paragone
  spinta_verticale: 0.88, // military: regge meno del petto, soglia piu' bassa
  // tirate
  tirata_verticale: 1.00, // trazioni, pulldown: soglia simile alla base
  tirata_orizzontale: 1.06, // remo: di solito si tira piu' di quanto si spinga
  // gambe
  gambe_pesanti: 1.00, // leg press: e' gia' "grande", non serve altro
  // isolamento
  petto_isolamento: 1.00,
  spalle_isolamento: 1.00,
  bicipiti: 1.00,
  tricipiti: 1.00,
  gambe_isolamento: 1.00,
  core: 1.00,
};

/** Il correttivo per tipo di movimento, 1 se non si sa niente. */
export function correttivoMovimento(movimento) {
  const v = CORRETTIVO_MOVIMENTO[movimento];
  return Number.isFinite(v) ? v : 1;
}

const NOME_MOVIMENTO = {
  spinta_orizzontale: 'spinta orizzontale',
  spinta_verticale: 'spinta verticale',
  tirata_verticale: 'tirata verticale',
  tirata_orizzontale: 'tirata orizzontale',
  gambe_pesanti: 'gambe, movimento pesante',
  petto_isolamento: 'isolamento petto',
  spalle_isolamento: 'isolamento spalle',
  bicipiti: 'isolamento bicipiti',
  tricipiti: 'isolamento tricipiti',
  gambe_isolamento: 'isolamento gambe',
  core: 'core',
};

export function rapportoDifficolta(esercizio) {
  const livello = livelloEsercizio(esercizio);
  const base = LIVELLI_DIFFICOLTA[livello];
  if (!base || base.rapporto === null) return { rapporto: null, livello, spinta: 0, spiegazione: null };

  const nome = (esercizio && (esercizio.nome || esercizio.id)) || '';
  const convenzione = (esercizio && esercizio.convenzione) || null;
  const parte = parteDiMuscolo({ nome });
  const intrinseco = intrinsecoDi(parte);

  // ---- l'attrezzatura
  //
  // Ste (04/10/2026), mostrando la foto: "ma non e' una panca, la chest press
  // e' tipo questa". Ha ragione, e il difetto era grosso: il classificatore
  // gia' sapeva che su una macchina e' piu' facile (pesoModificatori -6), ma
  // quella informazione finiva in un cassetto. La soglia di una chest press a
  // macchina era identica a quella di una panca con il bilanciere libero, ed e'
  // falso: sulla macchina il busto e' appoggiato, il percorso e' guidato e la
  // barra non ti puo' scivolare addosso. Lo stesso 44 kg li' sono piu' duri
  // liberi che al cavo.
  const riconosciuto = classificaEsercizio({
    nome, convenzione,
    attrezzatura: (esercizio && esercizio.attrezzatura) || null,
    bracciaIndipendenti: !!(esercizio && esercizio.bracciaIndipendenti),
  });
  const mod = riconosciuto.pesoModificatori || 0;

  // Ogni 10 punti di modificatore spostano la soglia del 4%. Il segno e'
  // inverso rispetto al muscolo: un attrezzo che rende piu' facile (macchina,
  // cavo, pesi -) ALZA la soglia, perche' impressionare e piu' difficile.
  const correttivoAttrezzo = 1 - 0.004 * mod;

  // ---- il tipo di movimento
  //
  // Ste: "ma sono diversi". Chest press e iso-lateral row sono entrambe
  // "composto", quindi fin qui avevano lo stesso rapporto. Ma una e' una SPINTA e
  // l'altra una TIRATA, e non valgono la stessa cosa.
  const mov = correttivoMovimento(riconosciuto.movimento);

  // ---- il muscolo
  const spintaMuscolo = intrinseco === null ? 0 : Math.max(0, intrinseco - 2);

  const spinta = spintaMuscolo;
  const rapporto = Math.round(base.rapporto * correttivoAttrezzo * mov * (1 - 0.06 * spintaMuscolo) * 1000) / 1000;

  const spiegazioni = [];
  if (mod !== 0) {
    spiegazioni.push(mod < 0
      ? `${nome}: attrezzo che aiuta, la soglia sale del ${Math.abs(Math.round(mod * 0.4))}%`
      : `${nome}: attrezzo che rende più duro, la soglia scende del ${Math.round(mod * 0.4)}%`);
  }
  if (spintaMuscolo > 0) {
    spiegazioni.push(`${parte.nome}: muscolo piccolo e instabile, la soglia scende del `
      + `${Math.round(spintaMuscolo * 6)}%`);
  }
  if (mov !== 1) {
    const su = mov > 1;
    spiegazioni.push(`${NOME_MOVIMENTO[riconosciuto.movimento] || riconosciuto.movimento}: `
      + (su ? `movimento dove di solito si carica piu', la soglia sale del `
        : `movimento dove di solito si regge meno, la soglia scende del `)
      + `${Math.abs(Math.round((mov - 1) * 100))}%`);
  }

  return {
    rapporto,
    // Il correttivo RELATIVO: quanto questo esercizio e' piu' o meno difficile
    // della media del suo livello. E' quello che va moltiplicato per la scala
    // dell'esercizio.
    //
    // Perche' serve due valori e non uno solo: il rapporto assoluto (0.907, 1.006
    // ...) e' "quanto pesa come frazione del corpo", quindi contiene GIAA' il peso
    // corporeo. Se lo moltiplicassi a una scala che e' gia' stata riportata sul
    // peso della persona, il peso entrerebbe due volte: e' il doppio conteggio
    // che ho gia' fatto due volte, e la volta prima proprio qui.
    correttivoRelativo: Math.round((rapporto / base.rapporto) * 1000) / 1000,
    livello,
    spinta,
    spintaMuscolo,
    modificatori: mod,
    intrinseco,
    parte,
    spiegazione: spiegazioni.length ? spiegazioni.join(' · ') : null,
  };
}

// Ste (04/10/2026): "deve capire che sono 35kg per braccio per chest press di
// petto, lo sa questo no?" No, e il buco era grosso.
//
// Su una macchina a dischi i dischi stanno su ENTRAMBI i bracci: 35 kg per
// braccio sono 70 kg in tutto. Prima l'app prendeva 35 kg come se fossero 35 in
// totale, quindi contava meta' del carico e il Rank veniva sotto. Non e' un
// dettaglio da visualizzazione: e' il numero con cui l'app giudica quanto sei
// forte, quindi sbagliarlo vuol dire sbagliare il Rank.
//
// Il totale si calcola una volta sola, qui, e non in mezzo ai calcoli: due posti
// che moltiplicano per due sono due posti che possono dimenticarselo.
/**
 * Quanto pesa davvero, secondo la carrucola.
 *
 * Ste: "di hammer curl faccio 50kg ma e' doppia carrucola quindi sarebbero 25".
 *
 * Sul mono carrucola il cavo arriva dritto: senti quello che c'e' sul carrello.
 * Sul doppio carrucola il cavo passa sopra una puleggia e torna indietro: il
 * guadagno e' 2:1, quindi senti META' del carrello.
 *
 * Sul doppio carrucola si lavora su un braccio alla volta, quindi il peso e'
 * gia' dimezzato e NON va anche raddoppiato come sulle macchine a dischi. Se si
 * applicassero i due insieme, 50 kg diventerebbero 25 e poi di nuovo 50: la
 * correzione si annullerebbe e l'app tornerebbe al numero sbagliato di prima.
 */
export function fattoreCarrucola(carrucola) {
  if (carrucola === 'carrucola_doppia') return 0.5;
  return 1;
}

/**
 * Il fattore da mettere sul peso che Ste ha scritto, per ottenere il peso vero.
 *
 * Restituisce anche se il peso e' gia' "per braccio" cosi' chi chiama non deve
 * ricordarsene: la regola "prima la carrucola, poi il per braccio" sta in un
 * posto solo invece che nella testa di chi scrive il codice.
 */
export function pesoReale(peso, { carrucola = null, perBraccio = false } = {}) {
  let p = Number(peso);
  if (!Number.isFinite(p)) return null;
  const carrucolaRaddoppia = carrucola === 'carrucola_doppia';
  // il doppio carrucola e' su un braccio alla volta: il peso e' gia' per braccio
  if (perBraccio && !carrucolaRaddoppia) p *= 2;
  p *= fattoreCarrucola(carrucola);
  return Math.round(p * 100) / 100;
}

// Ste: "il massimale deve restare il numero di peso che metto in una sola parte".
// Percio' per_braccio e per_gamba NON raddoppiano piu': valgono 1 come tutto il
// resto, e servono solo come etichetta per dire all'utente che quei kg sono per
// un lato.
//
// Il raddoppio c'era e non funzionava, perche' raddoppiava SOLO il massimale e non
// anche la scala: risultato che 35 kg diventavano 70 e la soglia restava quella di
// 90, quindi il suo 35 kg x 8 finiva a BRONZE. Due numeri nella stessa frase, due
// unita' diverse: e' il tipo di errore che si vede solo se guardi entrambi.
const PER_CORPO = {
  per_braccio: 1, // macchina a dischi: un disco per braccio, ma il numero resta com'e'
  per_gamba: 1, // leg press obliqua: 17 kg per gamba
  per_manubrio: 1, // 30 kg vuol dire 30 kg in UNA mano
  bilanciere: 1,
};

export function moltiplicatoreCarico(convenzione) {
  const m = PER_CORPO[convenzione || ''];
  return Number.isFinite(m) ? m : 1;
}

/**
 * Il riferimento PLATINUM di un esercizio, legato al peso della persona.
 *
 * Se il peso non c'e' uso il numero storico (valutato su una persona da 70 kg),
 * cosi' l'app resta usabile anche senza aver mai segnato il peso.
 */
export function riferimentoPerEsercizio(esercizio, pesoCorporeo = null, { storico = null } = {}) {
  // Ste (04/10/2026): "ogni esercizio deve avere la propria scala, senza confrontare direttamente
  // i kg tra esercizi diversi". Questa e' la riga che lo fa.
  //
  // Prima qui c'era "rapporto del livello x peso", e il rapporto dipendeva solo da
  // isolamento/composto/grande: quindi un curl e una lat machine avevano la stessa
  // soglia, e le alzate laterali avevano la soglia dei pushdown. Adesso la scala
  // la decide l'esercizio (o il movimento a cui appartiene) e la riporta sul peso
  // della persona. I due kg non si confrontano piu' fra esercizi diversi: ogni
  // esercizio misura la prestazione sulla SUA scala.
  //
  // I DUE campi che dicono COME' si registra il carico (convenzione e carrucola)
  // sono obbligatori, non opzionali: senza di loro la scala non sa se il numero e'
  // di un lato o del carico intero, e il confronto vale la meta' o il doppio.
  const riconosciuto = classificaEsercizio({
    nome: (esercizio && (esercizio.nome || esercizio.id)) || '',
    convenzione: (esercizio && esercizio.convenzione) || null,
    attrezzatura: (esercizio && esercizio.attrezzatura) || null,
    carrucola: (esercizio && esercizio.carrucola) || null,
    bracciaIndipendenti: !!(esercizio && esercizio.bracciaIndipendenti),
  });
  const scala = scalaDerivata({
    id: (esercizio && esercizio.id) || '',
    nome: (esercizio && (esercizio.nome || esercizio.id)) || '',
    movimento: riconosciuto.movimento,
    livello: riconosciuto.livello,
    convenzione: (esercizio && esercizio.convenzione) || null,
    attrezzatura: (esercizio && esercizio.attrezzatura) || null,
    carrucola: (esercizio && esercizio.carrucola) || null,
    bracciaIndipendenti: !!(esercizio && esercizio.bracciaIndipendenti),
  });
  if (scala === null) {
    // nessuna scala: meglio ammetterlo che tirare fuori un numero inventato
    return Number(storico) > 0 ? Number(storico) : 0;
  }

  // se la scala e' 0 il conto non ha senso (core: si contano le ripetizioni)
  if (scala <= 0) {
    return Number(storico) > 0 ? Number(storico) : (RIFERIMENTO_DEFAULT[MISURE.SOLO_REPS] || 12);
  }

  // Il riferimento e' il numero realistico di quell'esercizio per QUELLO corpo,
  // e basta. Non c'e' piu' nessuna catena di correzioni che lo abbassa.
  //
  // Ste: "Cable Fly 37x5 -> 18.5 sentiti, riferimento 15.7, OLymPIAN. Come mai
  // cosi' tanto? ... deve essere realistico in confronto al tuo peso, non deve
  // essere per non rendere triste la persona".
  //
  // Il motivo era questo: sul fly si sommavano tre correzioni (cavo -6%, muscolo
  // piccolo -24%, tipo di movimento) e insieme facevano piu' del 30%. Il
  // riferimento finiva a 15.7, che per un fly al cavo e' un numero bassissimo, e
  // allora 18.5 kg sembravano un'arma. Il riferimento era FALSO, non la prestazione.
  //
  // Adesso il significato e' uno solo e pulito: il riferimento e' quanto sposta
  // una persona forte su QUEL esercizio con QUEL peso. I correttivi restano, ma
  // solo per spiegare a voce perche' due esercizi simili non hanno la stessa soglia
  // esatta: nonabbassano piu' il numero.
  const peso = pesoCorporeoValido(pesoCorporeo);

  if (peso) return Math.round(scalaSulCorpo(scala, peso) * 100) / 100;
  if (Number(storico) > 0) return Number(storico);
  return Math.round(scalaSulCorpo(scala, PESO_RIFERIMENTO) * 100) / 100;
}

// ---------------------------------------------------------------------------
// 4. Il profilo di un esercizio.
//    E' l'unica cosa che serve per calcolare il rank: quale misura si usa e
//    quanto e' "bravura" il riferimento.
// ---------------------------------------------------------------------------

/** Riferimento di default quando un esercizio non ha un profilo suo. */
export const RIFERIMENTO_DEFAULT = {
  [MISURE.KG_REPS]: 60,
  [MISURE.SOLO_REPS]: 15,
  [MISURE.TEMPO]: 60,
  [MISURE.DISTANZA]: 1000,
  [MISURE.KG_TEMPO]: 120,
};

/**
 * Quanto vale 1 kg di assistenza, in ripetizioni perse.
 * Serve per gli esercizi assistiti (trazioni, dip, push up con zavorra):
 * se ti fai aiutare con 15 kg, le ripetizioni contano un po' meno.
 * Cambiabile esercizio per esercizio.
 */
export const COEFFICIENTE_ASSISTENZA_DEFAULT = 0.5;

/**
 * I profili dei singoli esercizio: qui ci sono solo le personalita' che NON
 * si ricavano dal livello di difficolta'.
 *
 * Il riferimento PLATINUM NON e' piu' scritto qui: nasce da
 * LIVELLO_ESERCIZI + il peso della persona (vedi riferimentoPerEsercizio).
 * Ste: "i rank per ogni esercizio devono adattarsi al tipo di esercizio, se e'
 * difficile, facile, medio. Tipo alzate laterali e' difficile quindi anche un
 * carico basso puo' essere tanto".
 *
 * Se un giorno un esercizio ha bisogno di un numero suo, si mette qui
 * `{ riferimento: 123 }` e vince lui.
 */
export const PROFILI = {
  // (nessun riferimento fisso: li decide il livello)
};

/** Le sette soglie di un esercizio, calcolate dal suo riferimento. */
export function soglieDaRiferimento(riferimento, moltiplicatori = MOLTIPLICATORI_SOGLIA) {
  const r = Number(riferimento);
  if (!Number.isFinite(r) || r <= 0) return null;
  return moltiplicatori.map((m) => Math.round(r * m * 100) / 100);
}

// ---------------------------------------------------------------------------
// 3. IL PESO DEL CORPO.
//    Ste ha chiesto che il Rank tenga conto del peso corporeo: chi pesa 60 kg e
//    chi pesa 90 kg non possono avere lo stesso Rank lifting gli stessi 60 kg.
//
//    Come funziona, senza creare un secondo sistema: le soglie di ogni
//    esercizio sono gia' sue (nascono dal suo riferimento).Qui le riscalo in
//    base al peso corporeo della persona. Un uno di 70 kg e' il "peso di
//    riferimento": per lui le soglie sono quelle scritte nella configurazione.
//    Chi pesa meno le soglie scendono, chi pesa piu' salgono.
// ---------------------------------------------------------------------------

export const PESO_RIFERIMENTO = 70;
export const PESO_MINIMO = 25;
export const PESO_MASSIMO = 300;

/** Le misure dove il peso corporeo conta davvero. */
export const MISURE_CON_PESO = {
  [MISURE.KG_REPS]: true,    // forza relativa: 60 kg sollevati su 60 kg corporei
  [MISURE.KG_TEMPO]: true,  // kg tenuti: conta quanto pesi rispetto a te
  [MISURE.SOLO_REPS]: false, // trazioni e push-up: contano le ripetizioni, non il rapporto
  [MISURE.TEMPO]: false,     // plank: 60 secondi sono 60 secondi per tutti
  [MISURE.DISTANZA]: false,  // corsa: metri, non kg
};

/** Il peso corporeo e' sensato? */
export function pesoCorporeoValido(peso) {
  const n = Number(String(peso === null || peso === undefined ? '' : peso).replace(',', '.'));
  if (!Number.isFinite(n) || n < PESO_MINIMO || n > PESO_MASSIMO) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Il profilo di un esercizio con le soglie gia' adatte al peso corporeo.
 *
 * - se il peso non c'e' o non e' sensato, le soglie restano quelle scritte:
 *   l'app continua a funzionare, semplicemente non si valuta la forza relativa.
 * - se l'esercizio e' di tipo TEMPO o DISTANZA, il peso non entra: non ha
 *   senso che un plank di 60 secondi valga di piu' per uno leggero.
 *
 * NON crea un sistema nuovo: restituisce lo stesso profilo con le soglie
 * riscalate, quindi tutto il resto (rank, LP, progressione) resta identico.
 */
export function profiloPerPesoCorporeo(profilo, pesoCorporeo) {
  const p = profilo || profiloEsercizio(null);
  const peso = pesoCorporeoValido(pesoCorporeo);
  const usa = !!MISURE_CON_PESO[p.misura];
  // Il NOME insieme, per lo stesso motivo del riferimento qui sotto: senza, il
  // classificatore non riconosce il movimento e il livello torna sempre
  // "composto", che e' la risposta di quando non sa niente. Un esercizio pesante e
  // un isolamento finivano per sembrare uguali.
  const livello = livelloEsercizio({
    id: p.id,
    nome: p.nome,
    convenzione: p.assistito ? 'assistenza' : null,
    attrezzatura: p.attrezzatura || null,
    bracciaIndipendenti: !!p.bracciaIndipendenti,
  });

  if (!usa) {
    // trazioni, dip, plank: il riferimento sono le ripetizioni e non dipende
    // dal peso, quindi le soglie restano quelle del profilo
    return {
      ...p,
      livello,
      soglie: p.soglie,
      pesoCorporeo: peso,
      pesoConsiderato: false,
    };
  }

  // Due casi, e vanno tenuti separati (il bug che avevo: li tenevo uniti e il
  // riferimento diceva 63 mentre le soglie erano fatte su 59.4, quindi il
  // giudizio "quanto ho fatto" era sbagliato):
  //
  //  - riferimento FISSO: qualcuno l'ha scritto a mano. Vince lui, e le soglie
  //    si riscalano sul peso come prima.
  //  - riferimento DA LIVELLO: non l'ha scritto nessuno. Allora il riferimento
  //    e' rapporto x peso della persona e le soglie nascono da quel numero.
  let riferimento;
  let soglie;
  if (p.riferimentoFisso) {
    riferimento = p.riferimento;
    soglie = p.soglie.map((s) => Math.round(s * (peso / PESO_RIFERIMENTO) * 100) / 100);
  } else {
    // Il nome passa OBBLIGATORIO. Prima qui passavo solo id e convenzione: senza
    // il nome il classificatore non poteva riconoscere il movimento, e quindi due
    // esercizi diversi cadevano entrambi sulla scala generica. Il test R19 lo
    // trovava: l'isolamento e il movimento pesante avevano lo stesso identico
    // riferimento, che e' esattamente cio' che Ste non vuole ("non tutti gli
    // esercizi sono uguali").
    riferimento = riferimentoPerEsercizio({
      id: p.id,
      nome: p.nome,
      // La convenzione e la carrucola NON sono un dettaglio: dicono se il numero
      // che l'utente scrive e' di un lato, del carrello o del carico intero. Prima
      // qui passavo "convenzione: null" e non passavo la carrucola: la scala
      // non poteva scegliere la base giusta, e su un esercizio al cavo con la
      // doppia carrucola il riferimento usciva il doppio (o la meta').
      convenzione: (p.assistito ? 'assistenza' : p.convenzione) || null,
      attrezzatura: p.attrezzatura || null,
      carrucola: p.carrucola || null,
      bracciaIndipendenti: !!p.bracciaIndipendenti,
    }, peso);
    // tetto di realismo: l'OLYMPIAN non puo' valere piu' di 2.2 volte il peso,
    // altrimenti si arriva a numeri che nessuno umano puo' spingere
    const tetto = peso * TETTO_PER_PESO;
    const alto = soglieDaRiferimento(riferimento);
    // alto puo' essere null se il riferimento e' 0 o non e' un numero: succede con
    // gli esercizi creati dall'amministratore che nessun movimento riconosce. Non
    // e' un caso teorico, e' il percorso normale quando aggiungi un esercizio
    // nuovo, e senza questo controllo l'app si rompeva aprendo quella scheda.
    if (alto && alto.length && alto[alto.length - 1] > tetto) {
      // stringo i gradini alti per farlo entrare sotto il tetto, restando
      // strettamente crescenti: la prima volta li avevo scalati e senza
      // ricontrollare l'ordine, cosi' il diamondo era piu' basso del platino
      const fattore = tetto / alto[alto.length - 1];
      for (let i = 4; i < alto.length; i++) {
        alto[i] = Math.round(Math.max(alto[i] * fattore, alto[i - 1] + 0.5) * 100) / 100;
      }
      // se il tetto e' talmente streto da starci sotto il platino, il platino
      // stesso si abbassa: meglio una scala piccola che una scala rotta
      if (alto[4] <= alto[3]) {
        for (let i = 1; i < alto.length; i++) {
          alto[i] = Math.round(alto[i] * fattore * 100) / 100;
        }
        for (let i = 1; i < alto.length; i++) {
          if (alto[i] <= alto[i - 1]) alto[i] = Math.round((alto[i - 1] + 0.5) * 100) / 100;
        }
      }
    }
    soglie = alto;
  }
  if (!peso) {
    // nessun peso: il profilo resta come com'e'
    return { ...p, livello, pesoCorporeo: null, pesoConsiderato: false };
  }

  return {
    ...p,
    riferimento,
    soglie,
    livello,
    pesoCorporeo: peso,
    pesoConsiderato: true,
    fattorePeso: Math.round((peso / PESO_RIFERIMENTO) * 1000) / 1000,
  };
}

/** Il riferimento di riserva per una misura, quando nessuno lo ha scritto. */
function defaultRiferimentoPerMisura(misura) {
  return RIFERIMENTO_DEFAULT[misura] || 60;
}

/**
 * Il profilo completo di un esercizio: misura, soglie, unita'.
 * Se l'esercizio non ha un profilo scritto, si usa quello di default in base
 * alla misura, cosi' anche un esercizio creato dall'amministratore ha subito
 * un rank senza dover configurare niente.
 */
export function profiloEsercizio(esercizio, extra = {}) {
  const id = (esercizio && esercizio.id) || '';
  const configurato = Object.assign({}, PROFILI[id] || {}, extra || {});
  const convenzione = (esercizio && esercizio.convenzione) || null;
  const assistito = convenzione === 'assistenza' || convenzione === 'corpo_libero';
  const misura = configurato.misura
    || (esercizio && esercizio.misura)
    || (assistito ? MISURE.SOLO_REPS : MISURE.KG_REPS);
  const campo = CAMPO_MISURA[misura] || CAMPO_MISURA[MISURE.KG_REPS];

  // Il riferimento si distingue in due casi, ed e' importante non confonderli:
  //  - "fisso": qualcuno l'ha scritto a mano (PROFILI o il form admin). Vince
  //    sempre, e non viene toccato dal peso.
  //  - "da livello": non l'ha scritto nessuno. Allora dipende da quanto e'
  //    difficile l'esercizio (LIVELLO_ESERCIZI) e dal peso della persona.
  //    Prima mettevo qui il default per misura (60 kg) e questo rendeva inutile
  //    il livello: tutti gli esercizi avevano lo stesso riferimento.
  const scritto = Number(configurato.riferimento) > 0;
  // Un posto solo per il riferimento: questo e' riferimentoPerEsercizio.
  //
  // Prima qui c'era un secondo calcolo, fatto a parte ("rapporto x 70"), e i due
  // potevano dare numeri diversi: e' la stessa lezione del v37, detta peggio,
  // perche' qui non era un semplice doppio conteggio ma due formule intere che
  // potevano andare ognuna per conto proprio. Se un giorno l'app ti dicesse che
  // hai passato il livello mentre il prossimo obiettivo resta lontano, il
  // motivo sarebbe questo.
  let riferimento;
  if (scritto) {
    riferimento = Number(configurato.riferimento);
  } else if (misura === MISURE.SOLO_REPS) {
    // assistito: il riferimento sono le ripetizioni, e non dipendono dal peso
    riferimento = defaultRiferimentoPerMisura(misura);
  } else {
    riferimento = riferimentoPerEsercizio(
      {
        id,
        nome: (configurato.nome || esercizio.nome || ''),
        convenzione,
        attrezzatura: (configurato.attrezzatura || esercizio.attrezzatura) || null,
        carrucola: (configurato.carrucola || esercizio.carrucola) || null,
        bracciaIndipendenti: !!(configurato.bracciaIndipendenti || esercizio.bracciaIndipendenti),
      },
      null,
    );
    if (!Number.isFinite(riferimento) || riferimento <= 0) {
      riferimento = defaultRiferimentoPerMisura(misura);
    }
  }

  // Le soglie non possono mai essere null: sotto i NULL c'era un buco vero.
  // Se un esercizio non ha una scala sua (per esempio uno creato dall'amministratore
  // con un nome che nessun movimento riconosce), il riferimento tornava 0 e da li'
  // soglieDaRiferimento restituiva null, e il primo accesso a .length faceva
  // esplodere la pagina. Un esercizio nuovo non deve poter rompere l'app.
  const soglieConfigurate = Array.isArray(configurato.soglie)
    && configurato.soglie.length === RANK.length
    ? configurato.soglie.map((n) => Number(n))
    : null;
  let soglie = soglieConfigurate || soglieDaRiferimento(riferimento);
  if (!soglie) {
    riferimento = Number.isFinite(riferimento) && riferimento > 0
      ? riferimento
      : defaultRiferimentoPerMisura(misura);
    soglie = soglieDaRiferimento(riferimento)
      || soglieDaRiferimento(RIFERIMENTO_DEFAULT[misura] || 60);
  }
  return {
    id,
    nome: (esercizio && esercizio.nome) || id,
    misura,
    assistito,
    // La convenzione del carico viaggia dentro il profilo, e non solo con
    // l'esercizio: profiloPerPesoCorporeo ricalcola il riferimento da qui e,
    // senza questo campo, non saprebbe piu' se i kg che l'utente scrive sono di
    // un lato o del carico intero.
    convenzione,
    unita: (configurato.unita) || campo.unita,
    campoSecondario: (configurato.campoSecondario !== undefined && configurato.campoSecondario !== null)
      ? configurato.campoSecondario
      : campo.secondario,
    riferimento,
    // segnalo se il numero e' stato scritto a mano: se si', il peso non lo
    // tocca. Serve a profiloPerPesoCorporeo per non fare due calcoli diversi.
    riferimentoFisso: scritto,
    soglie,
       coefficientAssistenza: Number.isFinite(Number(configurato.coefficientAssistenza))
      ? Number(configurato.coefficientAssistenza)
      : COEFFICIENTE_ASSISTENZA_DEFAULT,
    // Ste: "35 kg per braccio". Il Rank usa il TOTALE, quindi qui c'e' il
    // fattore da moltiplicare. Vedi moltiplicatoreCarico().
    moltiplicatoreCarico: moltiplicatoreCarico(convenzione),
    attrezzatura: (configurato.attrezzatura || esercizio.attrezzatura) || null,
    bracciaIndipendenti: !!(configurato.bracciaIndipendenti || esercizio.bracciaIndipendenti),
    // Ste: mono o doppia carrucola. Sul doppio carrucola il peso vero e' META'
    // di quello che segna il carrello, quindi se questo resta null l'app legge
    // il numero del carrello e sbaglia di 2 su tutti i cavi.
    carrucola: (configurato.carrucola || esercizio.carrucola) || null,
    totaleDaMostrare: true,
  };
}

/** Etichetta leggibile del punteggio: "65 kg", "12 rip", "75 secondi". */
export function descriviPunteggio(profilo, valore) {
  if (valore === null || valore === undefined) return 'nessuna performance';
  const n = Math.round(Number(valore) * 100) / 100;
  if (profilo.misura === MISURE.KG_TEMPO) return `${n} kg x minuti`;
  return `${n} ${profilo.unita}`;
}