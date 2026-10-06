/**
 * scala-auto.js -- la scala di un esercizio, DERIVATA invece che scritta a mano.
 *
 * Ste (04/10/2026): "e dovrebbe farlo in automatico in realta'". Ha ragione, ed e'
 * il vero difetto di come l'avevo costruito: avevo UNA tabella con una riga per
 * esercizio e dentro tutti i fattori insieme. Il risultato e' che ogni riga
 * poteva sbagliare l'unita', e in una settimana ne sono usciti sette uno dietro
 * l'altro (lo shrug con 120 che era un numero da bilanciere, le tirate tarate su
 * 1.64 volte il peso, il -23,2 kg della media...).
 *
 * Qui i fattori stanno in TRE posti separati e vengono applicati una volta sola:
 *
 *   1) il MOVIMENTO dice quanto e' grande l'esercizio in assoluto, e l'UNITA'
 *      dice in che numero lo si registra (una spinta su macchina si registra per
 *      lato, una panca col bilanciere no: sono due numeri che non si confrontano)
 *   2) i CORRETTIVI spostano la soglia dentro un tetto del 20%
 *      (macchina a dischi, stack, braccia indipendenti, tipo di movimento)
 *   3) il NUMERO VERIFICATO vince su tutto (scala-esercizi.js)
 *
 * IL NUMERO GIUSTO, E IL MODO IN CUI SBAGLIARLO
 *
 * Tutti i numeri di questo file sono CHILOGRAMMI, non rapporti. E' il punto su
 * cui la v53 ha sbagliato e da cui riparto: scriveva i rapporti (kg per kg di
 * peso corporeo) e poi restituiva il rapporto, quindi la chest press dava 0.84
 * invece di circa 32. Un rapporto non e' un peso: se torni da 0.84 capisci che
 * hai dimenticato il corpo. Qui il numero e' un peso sul corpo di riferimento,
 * e chi lo riporta sul peso vero e' uno solo (scalaSulCorpo).
 *
 * LA CARRUCOLA: IL MIO SECONDO ERRORE DELLA STESSA CLASSE
 *
 * Nella v53 avevo scritto che sul doppio carrucola la scala andava dimezzata,
 * perche' "li' il numero che leggi e' il carrello e il peso che senti e' meta'".
 * Il ragionamento e' giusto e la conclusione e' sbagliata, perche' il
 * dimezzamento c'e' GIA', e sta in pesoReale() dentro rank.js: la prestazione
 * che viene confrontata con la scala e' gia' meta'. Se anche la scala viene
 * dimezzata si dimezza due volte, e il risultato e' un riferimento la meta' del
 * giusto: e' esattamente il 15.7 kg di cui Ste si e' lamentato sul Cable Fly
 * ("37x5 -> 18.5 sentiti, riferimento 15.7, OLympiAN... deve essere realistico in
 * confronto al tuo peso").
 *
 * Quindi: sul doppio carrucola la scala e' quella di UN LATO, senza fattori. Il
 * 0.5 sta nel posto giusto, quello della prestazione, e non si tocca.
 *
 * LA REGOLA CHE RIEPILOGA TUTTO
 *
 * La scala e' SEMPRE nella stessa unita' in cui l'esercizio si registra, e non
 * si converte niente. L'unita' non e' un dettaglio: e' l'unica cosa che faceva
 * sbagliare sette numeri di fila, quindi qui si calcola in un posto solo
 * (unitaDi) e chi chiama non deve ricordarsela.
 */

// l'unica fonte dei numeri verificati: questo file calcola, scala-esercizi.js
// solo ricorda cosa e' stato approvato a mano. Nessun ciclo fra i due.
import { scalaVerificata } from './scala-esercizi.js';

/** Tetto di ogni correttivo: il fattore puo' spostare, non stravolgere. */
export const TETTO_CORRETTIVO = 0.20;

/** Le tre unita' in cui un esercizio si registra davvero. */
export const UNITA = {
  LATO: 'lato',
  TOTALE: 'totale',
  CARRELLO: 'carrello',
};

/**
 * 1b) In che unita' si registra questo esercizio.
 *
 * Non si deduce dal nome e non si ricorda: si legge dai due campi che gia'
 * esistono nell'esercizio, quindi non puo' dimenticarsene.
 */
const CONVENZIONI_PER_LATO = new Set(['per_braccio', 'per_gamba', 'per_manubrio']);

export function unitaDi({ convenzione = null, carrucola = null } = {}) {
  // il doppio carrucola si usa su un braccio alla volta: il numero che leggi e'
  // quello del carrello, e il peso che senti e' meta'. La scala resta quella di
  // un lato (vedi la spiegazione in testa al file).
  if (carrucola === 'carrucola_doppia') return UNITA.CARRELLO;
  if (CONVENZIONI_PER_LATO.has(convenzione)) return UNITA.LATO;
  // tutto il resto (macchina a stack, cavo mono, bilanciere, dischi) si registra
  // con il carico intero
  return UNITA.TOTALE;
}

/**
 * 1) Il movimento: quanto e' grande l'esercizio in assoluto.
 *
 * Chilogrammi sul corpo di riferimento (70 kg), come nella tabella dei numeri
 * verificati: cosi' i due posti si confrontano a occhio e nessuno dei due puo'
 * essere un rapporto per sbaglio.
 *
 * "lato"   = il peso di un braccio, di una gamba, di un manubrio
 * "totale" = il carico intero, come lo registri quando ti metti davanti alla
 *            macchina con un solo numero (stack, cavo mono, bilanciere)
 *
 * Perche' due numeri e non uno solo: perche' il movimento da solo non basta.
 * Una spinta orizzontale su macchina a dischi la registri 35 per braccio, la
 * stessa identica spinta col bilanciere libero la registri 70 in tutto. Sono lo
 * stesso movimento e due numeri che non si confrontano: se il movimento avesse
 * un numero solo, uno dei due sarebbe sbagliato, e' il caso che ha prodotto lo
 * shrug da 120 e la chest press da 0.84.
 *
 * Perche' il "totale" NON e' il "lato" per due. Un movimento bilaterale e' piu'
 * debole della somma dei due lati, e su un isolamento molto piu' debole: due
 * curl con 21 kg per mano non sono un curl da 42, sono circa 36. Percio' i due
 * numeri si scrivevano uno per uno, non si moltiplicava per due.
 *
 * Da dove vengono: quasi tutti sono la media dei numeri che Ste ha verificato
 * per quel movimento e quell'unita' (scala-esercizi.js). Dove non c'e' nessun
 * numero verificato il valore e' la fascia media di chi si allena bene, e si
 * sa: sono percentuali prudenti, non misure. Ogni numero qui dentro si vede
 * sempre, quindi se e' sbagliato si nota.
 */
export const SCALA_MOVIMENTO = {
  gambe_pesanti: {
    // 40 per gamba era un numero PRESTATO: veniva dalla leg press normale a 100 kg
    // per lato, che e' un esercizio diverso fatto su un'altra macchina (l'obliqua
    // scarica il peso di lato e ha un percorso piu' corto). Ste (06/10/2026):
    // "il riferimento viene dalla leg press normale a 100 per lato che facevi
    // prima, ma l'obliqua e' un esercizio diverso".
    //
    // Adesso e' una stima dichiarata e non un numero copiato: una pressa su una
    // gamba sola, per un adulto che si allena bene, sta fra 0,3 e 0,7 volte il
    // suo peso, e qui prendo circa meta' (0,49 -> 34 kg su un corpo di 70).
    //
    // Attenzione: questa e' una STIMA, e lo dice anche il test S17, perche' su
    // una macchina sola conta la sua geometria: due macchine con lo stesso nome
    // si leggono numeri completamente diversi. Il numero giusto lo puo' dare solo
    // chi ci va in palestra, quindi va nella tabella dei verificati, non qui.
    lato: 34, totale: 140,
  },
  // Ste: "la lat machine e la seated cable row sono di tirata, faccio quasi 30kg
  // in piu' del mio corpo". Le tirate sono nella fascia 1.3-1.5 volte il peso, e
  // qui sono i 102 (=1.46) che lui ha verificato. Per lato 50 e' la sua iso-lateral
  // row, che e' una tirata orizzontale registrata per braccio.
  tirata_orizzontale: { lato: 50, totale: 102 },
  // 110 e' il numero piu' alto delle tirate verticali, e viene dal suo "liac" (tirata
  // da sdraiato a un braccio solo col petto appoggiato): la posizione e' la piu'
  // difficile fra le tirate, quindi il suo riferimento sale. Le due lat machine,
  // che hanno un numero verificato di 101 e 102, restano quelle.
  tirata_verticale: { lato: 49, totale: 110 },
  // 41 e' la media fra la chest press a dischi (50) e lo Smith (32), che sono
  // lo stesso movimento registrato per lato ma su due macchine diverse.
  spinta_orizzontale: { lato: 41, totale: 101 },
  // 32 e' il suo shoulder press con i manubri, per mano. In totale 56: il
  // military con bilanciere regge molto meno della somma dei due manubri.
  spinta_verticale: { lato: 32, totale: 56 },
  // 20 e' il Cable Fly, e il numero e' piu' basso di quanto sembrasse.
  //
  // Ste (06/10/2026): "il cable fly e' un movimento corto e pesante, non un cavo da
  // 32 kg. Secondo me il riferimento e' troppo alto e va abbassato". Aveva ragione:
  // il 34 di prima non era un numero ragionato, era il numero che c'era gia' nella
  // tabella per movimento e che nella v54 avevo lasciato li' solo per non spostare
  // nulla. Un riferimento di 34 kg per UN braccio di fly al cavo non e' realistico
  // per nessuno.
  //
  // Il numero lo prendo dal suo vicino piu' vicino, che e' verificato: il One Arm
  // Cable Reverse Fly e' 16 kg, sullo stesso cavo a doppia carrucola, sullo stesso
  // braccio, con lo stesso numero di carrello. Il fly e' il davanti invece che il
  // dietro: muscolo piu' grande e percorso piu' ampio, quindi un quarto in piu' ->
  // 20. Il test S17 blocca questo ragionamento: se il reverse fly si sposta, il fly
  // si deve spostare con lui.
  //
  // In totale 55 e' un pec deck bilaterale: regge piu' della somma dei due lati
  // (che sarebbe 40), perche' la macchina ti fa vincere. Non e' un numero che ho
  // misurato: e' una fascia.
  petto_isolamento: { lato: 20, totale: 55 },
  // 13 e' la sua alzata laterale al cavo, il punto debole di tutti. Sulle spalle
  // il "totale" non esiste come numero: un paio di alzate laterali non si
  // registra come 26, si registra per mano. Quindi totale = lato, e la ragione
  // e' scritta qui perche' sembra una dimenticanza.
  spalle_isolamento: { lato: 13, totale: 13 },
  // 21 e' la mediana dei suoi tre curl verificati (hammer 32, scott 21, preacher
  // 19). In totale 36: il curl col bilanciere e' molto piu' debole della somma dei
  // due lati, quindi non e' il doppio.
  bicipiti: { lato: 21, totale: 36 },
  // 32 e' il numero che aveva l'overhead tricep al cavo (dalla vecchia tabella per
  // movimento). Il pushdown verificato e' 30, quindi la mediana sarebbe 31: tengo
  // 32 perche' e' il numero che Ste ha gia' visto e non cambio una soglia senza
  // che lui l'abbia verificata.
  tricipiti: { lato: 32, totale: 50 },
  // 88 e' la media dei suoi due esercizi verificati (leg extension 92, leg curl
  // 85), entrambi registrati col carico intero su macchina a stack.
  gambe_isolamento: { lato: 44, totale: 88 },
  // il core non ha kg: si contano le ripetizioni e il peso non c'entra
  core: { lato: 0, totale: 0 },
};

/**
 * L'ultimo ripiego, quando il nome non dice quale movimento e' e il livello non
 * aiuta: il numero del LIVELLO, come nella tabella di prima.
 *
 * Serve perche' Ste ha detto una cosa che e' anche un requisito tecnico:
 * "ogni esercizio deve avere la sua scala". Se qui tornasse 0, un esercizio nuovo
 * con un nome che il classificatore non conosce resterebbe senza soglie e la
 * pagina di quell'esercizio si romperebbe. Non va bene: meglio una scala
 * generica del livello che un esercizio che non si apre.
 *
 * Nota: questi numeri non hanno l'unita'. E' una resa, non una scala: valgono per
 * qualunque modo di registrazione, e servono solo quando non si sa nient'altro.
 */
export const SCALA_LIVELLO = {
  grande: 210,
  composto: 95,
  isolamento: 32,
  assistito: 0,
};

/**
 * 2) I correttivi di difficolta'. Ogni voce sposta la soglia di poco e ha un tetto.
 * Non e' un vezzo mettere il tetto: la prima volta che ho sommato i fattori
 * senza tetto il risultato e' stato un -30% e il riferimento del Cable Fly e'
 * finito a 15.7 kg, un numero bassissimo per il quale i suoi 18.5 kg sembravano
 * un'arma. Col tetto il fattore sposta la soglia, ma non la cancella.
 */
export const CORRETTIVO = {
  attrezzatura: { macchina_dischi: 0.96, macchina_stack: 1.08 },
  bracciaIndipendenti: 0.93, // l'equilibrio lo fai tu
  spinta: 0.95, // spingere e' piu' difficile che tirare
};

function limita(x, tetto = TETTO_CORRETTIVO) {
  return Math.max(1 - tetto, Math.min(1 + tetto, x));
}

function arrotonda2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Il numero di base di un movimento nell'unita' in cui si registra.
 *
 * Se la coppia (movimento, unita') non ha un numero suo si prende quello per
 * lato: il carrello del doppio carrucola e' un lato, e quando un movimento non
 * ha un "totale" (le spalle) il totale e' il lato.
 *
 * Se il movimento non e' riconosciuto si scende al LIVELLO, che non ha un'unita':
 * e' una resa, non una scala.
 */
function baseMovimento(movimento, unita, livello) {
  const voce = SCALA_MOVIMENTO[movimento];
  if (voce) {
    const n = unita === UNITA.TOTALE ? voce.totale : voce.lato;
    return Number.isFinite(n) ? n : 0;
  }
  const perLivello = SCALA_LIVELLO[livello];
  if (Number.isFinite(perLivello)) return perLivello;
  return SCALA_LIVELLO.composto;
}

/**
 * La scala di un esercizio, in kg sul corpo di riferimento, PRIMA di riportarla
 * sul peso vero della persona (per quello c'e' scalaSulCorpo, in un posto solo).
 *
 * Il numero verificato vince sempre: se qualcuno ha guardato quell'esercizio e ha
 * scritto il numero giusto, il calcolo non lo tocca. Se invece non c'e', la scala
 * si deriva dal movimento e da come' e' fatto il carico: cosi' un esercizio che
 * Ste crea domani ha gia' il suo numero senza che io debba scrivere niente.
 */
export function scalaDerivata(esercizio = {}) {
  const {
    id = '', movimento = null, livello = null, convenzione = null,
    attrezzatura = null, carrucola = null, bracciaIndipendenti = false,
  } = esercizio || {};

  const verificata = scalaVerificata(id);
  if (Number.isFinite(verificata)) return verificata;

  const base = baseMovimento(movimento, unitaDi({ convenzione, carrucola }), livello);
  if (!(base > 0)) return 0; // core: si contano le ripetizioni

  const correttivi = [
    CORRETTIVO.attrezzatura[attrezzatura],
    bracciaIndipendenti ? CORRETTIVO.bracciaIndipendenti : 1,
    String(movimento || '').startsWith('spinta') ? CORRETTIVO.spinta : 1,
  ];

  let scala = base;
  for (const c of correttivi) scala *= limita(Number.isFinite(c) ? c : 1);

  return arrotonda2(scala);
}