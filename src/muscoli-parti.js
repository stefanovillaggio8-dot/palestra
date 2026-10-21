// muscoli-parti.js -- QUALE pezzo di muscolo stai lavorando.
//
// IL GRUPPO DEL MUSCOLO, CHE È LA COSA CHE MANCAVA.
// `PARTI[].muscolo` dice 'braccio' sia per il bicipite sia per il tricipite, perché
// anatomicamente è vero: sono due muscoli diversi dentro lo stesso braccio. Ma per
// le etichette brevi 'braccio' non serve a niente. Il gruppo vero ('tricipite',
// 'bicipite', 'petto', ...) sta in `GRUPPI` dentro mappa-muscoli.js, e quel file non
// importa niente, quindi qui si può importare senza creare un ciclo.
//
// Ste (04/10/2026): "deve capire pure che il petto come il bicipite e le altre
// parti sono formati da diverse fibre muscolari e ci sono esercizi che per
// esempio servono per la parte alta e altri esercizi che servono per la parte
// bassa del petto".
//
// UNA CORREZIONE, detta con rispetto ma bisogna dirla: non sono "fibre
// muscolari diverse". Un muscolo è fatto da un solo tipo di fibre; quello che
// cambia è il CAPO (la parte che si attiva). Il petto, per esempio, ha due
// capi: il clavicolare (che parte dalla clavicola, cioè la parte ALTA) e lo
// sternale (che parte dallo sterno, cioè la parte BASSA). Cambiando l'angolo
// della panca non stai "isolando" una parte: stai mettendo il peso in
// posizioni diverse, e il corpo risponde spostando il lavoro.
//
// Detto questo, la tua intuizione è giusta e utile: se io faccio due esercizi
// di petto, uno mi lavora più in alto e uno più in basso. Saperlo serve a
// due cose concrete:
//   1) capire se due esercizi sono davvero diversi o se sono la stessa cosa
//      due volte (e le missioni non dovrebbero chiederti lo stesso capo due
//      volte lo stesso giorno);
//   2) scrivere il giudizio con parole vere: "questa ti spinge più in alto".
//
// Quindi qui NON creo un errore clinico: segno DOVE va il lavoro principale,
// con un avvertimento che la separazione non è mai totale.

/**
 * I pezzi che l'app distingue, per ogni muscolo.
 *
 * "alto"/"basso" non significa "solo lì": ogni esercizio lavora un po' tutto.
 * Significa "dove pesa di più".
 */
import { GRUPPI } from './mappa-muscoli.js';

/** Il gruppo muscolare di un pezzo: 'tricipite', 'petto', 'bicipite'... */
export function gruppoMuscoloDi(id) {
  return GRUPPI[id] ? GRUPPI[id].gruppo : null;
}

export const PARTI = [
  // ---- petto ----
  {
    id: 'petto_alto', muscolo: 'petto', parte: 'parte alta del petto',
    // 'incline' e 'inclinata' DA SOLE non ci sono più (15/10/2026). Dicevano
    // "petto" alla "Incline Single Arm Pulldown", che è una TIRATA: si tira il
    // peso verso di sé, quindi lavora la schiena, non il petto. Le FRASI vere
    // restano, quindi "Incline Bench Press" e "Panca Inclinata" continuano a
    // trovare il petto alto.
    parole: ['incline bench', 'panca inclinata', 'spalle in alto',
      // Ste (15/10/2026): "che si aggiorni automaticamente" vuol dire anche
      // che un esercizio nuovo non può restare spento. "Incline Dumbbell
      // Press" non aveva nessuna parola riconosciuta e sulla figura non si
      // accendeva niente. Le FRASI con dentro la posizione sono sicure: se il
      // nome dice che è inclinata, inclinata è, e la spinta non può essere una
      // tirata. La parola "press" da sola invece non si mette: "Shoulder Press"
      // è una spinta alle spalle e la panca no, e senza sapere quale sia
      // finirebbe nel petto un esercizio che lavora le spalle.
      'incline press', 'inclined press', 'panca a 45', 'upper chest press',
      // LA DIREZIONE DEL FLY (Ste, 18/10/2026).
      //
      // "il cable fly la panca e' messa al primo blocco, e' quasi a 90 gradi". Il nome
      // "Cable Fly" non dice niente: e' lo stesso esercizio a seconda di come lo fai.
      // Conta la LINEA DI TIRATA: se le maniglie partono in basso e salgono, la
      // tensione tira verso l'alto e lavora il capo CLAVICOLARE (quello alto); se
      // partono in alto e scendono, la tensione tira verso il basso e lavora le fibre
      // STERNALI BASSSE.
      //
      // Sono frasi lunghe e per metà dell'esercizio, perché una parola sola
      // ("cavi alti", "fly basso") dice una cosa diversa a seconda di chi la scrive.
      'dal basso verso l alto', 'dal basso verso l’alto',
      'parto in basso e salgo', 'parte in basso e salgo',
      'parto dal basso e salgo', 'parte dal basso e salgo',
      'maniglie in basso e salgo', 'cavi in basso e salgo',
      'in basso e salgo', 'in basso e salgono',
      'partono in basso e salgono'],
    nota: 'Il peso va in alto: panca inclinata, spinte con le spalle alzate. Lavora di più il capo clavicolare, quello che parte dalla clavicola.',
  },
  {
    id: 'petto_basso', muscolo: 'petto', parte: 'parte bassa del petto',
    // I DIPS SONO QUI, non fra le tirate. Ste (13/10/2026): "nei dips dice che
    // lavora dorso e lati, ma i dips lavorano petto e tricipiti". Erano stati
    // messi nella lista del dorso, che è il contrario del vero: sui dips ti
    // spingi via dalle parallele, quindi è una spinta. E la spinta va in basso:
    // le braccia sono sotto il corpo e il peso arriva al capo sternale del petto,
    // quello che parte dallo sterno.
    // 'flat bench' ERA QUI, e sbagliava (18/10/2026).
    //
    // La panca STESA è la panca più classica e lavora il capo sternale, cioè il
    // centro del petto: metterla fra le "panche in basso" faceva accendere il petto
    // basso su "Flat Barbell Bench Press", e la frase diceva una cosa diversa da
    // quella che si vedeva sulla figura. Tolto: ora "Flat Barbell Bench Press"
    // cade sul "bench press", quindi sul petto nel mezzo.
    //
    // "decline" invece mancava, e senza quello la panca declinata finiva sul petto
    // nel mezzo. Le FRASI, non la parola: "decline crunch" e' un addominale, e con la
    // parola sola finiva sul petto.
    parole: ['declinato', 'declinata', 'decline bench', 'decline press', 'bench decline',
      'panca declinata', 'panca piana', 'low cable fly', 'fly basso',
      // 'in basso' era qui, e faceva danno: dentro "parte in basso e salgo" (il fly
      // che parte in basso e sale, che lavora il petto ALTO) la parola "in basso"
      // diceva "petto basso" e vinceva il conteggio. Tolta: le frasi vere dicono
      // da sole in che direzione va il fly.
      'dip', 'dips', 'dip alle parallele', 'dips al parallels', 'chest dip',
      // LA DIREZIONE DEL FLY: vedi la nota sul petto alto. Le maniglie che partono
      // in alto e scendono tirano verso il basso: lavorano le fibre sternali basse.
      'dall alto verso il basso', 'dal alto verso il basso',
      'parto in alto e scendo', 'parte in alto e scendo',
      'parto dall alto e scendo', 'parte dall alto e scendo',
      'maniglie in alto e scendo', 'cavi in alto e scendo',
      'in alto e scendo', 'in alto e scendono',
      'partono in alto e scendono'],
    nota: 'Il peso va in basso: panca piana o declinata, fly con i cavi bassi. Lavora di più il capo sternale, quello che parte dallo sterno.',
  },
  {
    id: 'petto_centrale', muscolo: 'petto', parte: 'petto nel mezzo',
    // 'bench' e 'fly' DA SOLI non ci sono, e il 15/10/2026 si è visto perché:
    // dicevano "petto" al Dumbbell Bench Pull, allo Scott Bench Curl e
    // all'One Arm Cable Reverse Fly. Sono parole generiche: un curl seduto non
    // è una panca, e un reverse fly dietro la spalla non è un fly per il petto.
    // Le frasi vere ("bench press", "cable fly") restano, quindi un esercizio
    // chiamato davvero "Bench Press" o "Cable Fly" continua a trovare il petto.
    // 'panca' DA SOLA non c'è più (15/10/2026), per lo stesso motivo di 'bench':
    // vuol dire il MOBILE, non la spinta. "sto sulla panca inclinata col petto
    // appoggiato e tiro il cavo verso di me" è una trazione, e "Panca Scott
    // normale" è un curl: in entrambi i casi il petto non lavora. Le frasi vere
    // restano ("bench press", "cable fly", "panca inclinata", "panca piana"),
    // quindi un esercizio di petto continua a essere trovato dal suo nome.
    // il bench col pin (la sbarra di sicurezza) e' una panca come le altre
    parole: ['chest press', 'bench pin press', 'pecorino', 'cable fly', 'cross over',
      'crossover', 'crucifix', 'bench press', 'pressione petto', 'horizontal press',
      // i push up sono una panca col peso del corpo (Ste, 21/10/2026)
      'push up', 'push-up', 'pushups', 'push ups', 'piegamenti', 'piegamento',
      'banch press',
      // il fly con i cavi in orizzontale: la tensione tira di lato, e il petto lavora
      // tutto: e' il pezzo medio, quello grande
      'cavi in orizzontale', 'movimento orizzontale', 'in orizzontale',
      // IL FLY "ABBRACCIO" (Ste, 18/10/2026).
      //
      // "il carrello non e' in basso, e' a 12 di altezza tipo altezza spalle. Il
      // movimento e' tipo quando abbracci qualcuno e allo stesso tempo spingo in avanti".
      //
      // Le maniglie si uniscono davanti e tirano in avanti: e' l'adduzione
      // orizzontale, la stessa della pec fly, e quindi lavora il capo STERNALE, il
      // pezzo grande del petto. Il carrello alto non cambia niente: conta la
      // DIREZIONE in cui le mani si muovono, non l'altezza del carrello.
      'come un abbraccio', 'movimento di abbraccio', 'abbraccio',
      'tiro in avanti', 'spingo in avanti', 'si uniscono e tirano in avanti'],
    // Ste (13/10/2026): "rivedi tutti i dettagli degli esercizi perché molti sono
    // sbagliati". Qui dentro c'era anche "incline single arm pulldown", e una
    // PULLOWN è una tirata: tiri il peso verso di te partendo dall'alto, e
    // quindi lavora il dorso, non il petto. Il nome era finito nella lista del
    // petto e la scheda gli diceva "il petto lavora in modo abbastanza uniforme",
    // che è il contrario di quello che fa. Tolto di qui e passato fra le tirate.
    //
    // Tolta anche "macchina": diceva il petto a QUALSIASI esercizio che avesse
    // la parola nel nome, quindi un "Lat Pulldown macchina" e un "Rematore
    // macchina" finivano fra i muscoli del petto solo per quello. Ora la parola
    // vale per quello che dice e basta.
    // QUI C'ERA "bench pull" E "dumbbell bench pull", E SONO STATI TOLTI L'8/10/2026.
    // Ste guardando la scheda del Dumbbell Bench Pull: "cÈ scritto 'il lavoro È
    // distribuito, il petto lavora in modo abbastanza uniforme'... ma quello fa
    // schiena, centro schiena". Ha ragione: il bench pull coi manubri È una
    // TIRATA prona (maniubri verso il busto, sdraiato sul piano), quindi lavora
    // la schiena centrale fra le scapole. Non È un fly col petto: su un fly il
    // peso ti viene davanti, su un bench pull lo tiri indietro.
    //
    // Il nome È ambiguo ("bench" può voler dire panca o poggiapiedi), quindi se
    // domani un esercizio chiamato "bench pull" intendi un fly col petto, questo
    // elenco va cambiato. Per l'esercizio di Ste vale la schiena.
    nota: 'Il lavoro è distribuito: il petto lavora in modo abbastanza uniforme. Le spinte e i fly caricano soprattutto il centro del petto.',
  },
  // ---- dorso ----
  {
    id: 'dorso_alto', muscolo: 'dorso', parte: 'parte alta del dorso (trapezio)',
    parole: ['shrug', 'spalle a y', 'upper trap', 'elevazione scapola', 'tirate alte'],
    nota: 'Alza le spalle: lavora il trapezio, la parte alta della schiena.',
  },
  {
    id: 'dorso_lati', muscolo: 'dorso', parte: 'dorso ai lati (lati del triangolare)',
    // Ste (13/10/2026): "nei dips dice che lavora dorso e lati, ma i dips
    // lavorano petto e tricipiti". Aveva ragione: qui dentro c'erano "dip" e
    // "dips", quindi i dips finivano fra le tirate. I dips sono una SPINTA: ti
    // spingi via dalle parallele. Per questo sono passati al petto, e il
    // tricipite li ho aggiunti sotto, dove vanno davvero.
    parole: ['pullover', 'lat pulldown', 'trazioni', 'trazione', 'pull up', 'pull-up', 'pull ups',
      // la macchina dei dorsali, detta in tre modi (Ste, 21/10/2026)
      'lat machine', 'lat pull down', 'pulldown machine',
      'single arm pulldown', 'pulldown', 'pulldowns', 'tirata verticale',
      'tirate', 'tirate in basso', 'straight arm', 'auzhang',
      // IL REMATORE E' UN DORSALE, NON CENTRO SCHIENA (16/10/2026).
      // Ste: "il seated cable row non fa centro schiena principalmente, fa i
      // dorsali e non fa proprio il centro schiena, sarebbe il pulley".
      //
      // Aveva ragione, e il motivo era una parola messa nel posto sbagliato: "row",
      // "rematore" e "tiremento" erano dentro `dorso_centrale`, quindi OGNI rematore
      // prendeva il centro schiena come muscolo pieno, e i dorsali restavano a 0,66.
      // Sulla scheda del rematore si leggeva "dorso centrale" pieno e dorsali in
      // secondo fascia, cioe' il contrario di quello che l'esercizio fa.
      //
      // Qui il rematore e i dorsali. Il centro schiena, come muscolo pieno, resta al
      // bench pull prono con i manubri, che e' la decisione dell'08/10 e non si tocca.
      'row', 'rematore', 'tiremento', 'tirate orizzontali', 'tirata orizzontale'],
    nota: 'Tira con le braccia: lavora il dorso largo, quello che si vede di lato sotto le ascelle.',
  },
  {
    id: 'dorso_centrale', muscolo: 'dorso', parte: 'bassa schiena (lombari)',
    // IL REMATORE NON E' QUI (16/10/2026). Le parole "rematore", "row",
    // "tiremento" e le tirate orizzontali stanno adesso dentro `dorso_lati`, perché
    // Ste ha detto che il rematore lavora i dorsali e non il centro schiena. Qui
    // resta solo la tirata PRONA con i manubri, che e' la decisione dell'08/10.
    parole: ['hyperextension', 'iperextensione', 'prone',
      // Ste (08/10/2026): il Dumbbell Bench Pull È una tirata prona coi
      // manubri, quindi dorso centrale. Stava fra le parole del PETTO e la
      // scheda gli diceva "il petto lavora in modo abbastanza uniforme".
      'bench pull', 'dumbbell bench pull'],
    nota: 'Tira verso il corpo: lavora la parte centrale della schiena, quella fra le scapole. I romboidi e gli erettori della colonna sono profondi e questa tavola superficiale non li disegna: l’omino accende il trapezio inferiore, la striscia che sta lungo la spina dorsale, e lascia i dorsali larghi più chiari, perché sono un supporto.',
  },

  // ---- spalle ----
  {
    id: 'spalle_laterali', muscolo: 'spalle', parte: 'spalle laterali (deltoide laterale)',
    parole: ['lateral raise', 'alzata laterale', 'alzate laterali', 'side raise', 'deltoide laterale'],
    nota: 'Alza le braccia di lato: è il deltoide laterale, quello che disegna la spalla tonda.',
  },
  {
    id: 'spalle_posteriori', muscolo: 'spalle', parte: 'spalle posteriori (deltoide posteriore)',
    parole: ['rear delt', 'rear deltoid', 'reverse fly', 'delt posteriori', 'tirate a braccia aperte',
      // il face pull e' il reverse fly col nome nuovo (Ste, 21/10/2026)
      'face pull',
      // la macchina del reverse fly: si chiama "Pec Deck" e lavora il deltoide
      // dietro, non il petto. Fino al 15/10/2026 la parola stava nella lista
      // del FLY col petto, che è l'esatto contrario: "pec" vuol dire "petto"
      // solo se la stai spingendo in avanti, e quella macchina tira indietro.
      'peck deck', 'pec deck', 'reverse pec'],
    nota: 'Tira le braccia dietro: lavora il deltoide posteriore, quello dietro la spalla.',
  },
  {
    id: 'spalle_frontali', muscolo: 'spalle', parte: 'spalle davanti (deltoide anteriore)',
    parole: ['front raise', 'shoulder press', 'military', 'militare', 'overhead press',
      'spinte in alto', 'presse in alto', 'press a spalle',
      // la spinta col manubrio infilzato nel bilanciere (Ste, 21/10/2026)
      'shoulder pin press', 'landmine press',
      // il landmine press e' una spinta in avanti delle spalle (Ste, 21/10/2026)
      'landmine press', 'landmine'],
    nota: 'Spinge in alto davanti: lavora il deltoide anteriore e i trapezi.',
  },

  // ---- braccio ----
  {
    // IL BRACHIALE, CHE IL HAMMER CURL NON E' UN BICIPITE (15/10/2026).
    //
    // Ste: "Cable Hammer Curl fa il brachiale". Ha ragione, ed è l'unico dei sei
    // muscoli che mi ha elencato dove l'app sbagliava davvero.
    //
    // Con la presa NEUTRA a martello il bicipite non è il motore della flessione:
    // è un pronatore, e in pronazione perde quasi tutta la forza di flessione. Il
    // motore diventa il BRACHIALE, il muscolo che sta sotto al bicipite e copre
    // l'osso. Per questo il curl con manubri normali è bicipite e quello a martello
    // è un muscolo diverso.
    //
    // "hammer curl" era anche nella lista del bicipite (v175 e prima), quindi i due
    // si pareggiavano a punti e vinceva il bicipite per ordine. Tolto di qui e messo
    // qui sotto, non è un pareggio: è la anatomia.
    //
    // NON si mette "neutral grip" o "neutro" qui dentro: il Neutral Grip Pulldown è
    // una tirata di schiena e abbasserebbe il brachiale dove non c'entra.
    id: 'brachiale', muscolo: 'braccio', parte: 'brachiale (sotto il bicipite)',
    parole: ['hammer curl', 'curl a martello', 'martello', 'impugnatura a martello'],
    nota: 'Presa neutra a martello: il motore della flessione è il brachiale, profondo sotto al bicipite. Questa tavola mostra i muscoli superficiali, quindi non lo disegna: l’omino accende il brachioradiale, l’avambraccio, che è il motore della flessione accanto al brachiale e il muscolo che si vede in un martello, e lascia il bicipite più chiaro, perché in presa neutra diventa pronatore e perde forza. Il bicipite in questa presa è un pronatore e in pronazione perde forza.',
  },
  {
    id: 'braccio_alto', muscolo: 'braccio', parte: 'bicipite: braccio in alto',
    parole: ['incline curl', 'curl inclinato', 'scott bench', 'preacher',
      // "Panca Scott" e' il preacher curl detto in italiano (Ste, 21/10/2026)
      'panca scott', 'panca scott inclinata'],
    nota: 'Braccio in alto: il bicipite si vede e lavora nella posizione più corta, quindi è più difficile.',
  },
  {
    id: 'braccio_basso', muscolo: 'braccio', parte: 'bicipite: braccio in basso',
    // "hammer curl" NON e' qui: e' il brachiale, vedi la nota sopra.
    parole: ['curl bilanciere', 'curl al cavo', 'bicipiti', 'curl con bilanciere',
      'in piedi', 'standing curl', 'curl a terra', 'curl basso'],
    nota: 'Braccio giù lungo il fianco: è la posizione facile, quella con la serie più lunga.',
  },
  {
id: 'avambraccio', muscolo: 'avambraccio', parte: 'avambraccio (polso e avanti braccio)',
    parole: ['wrist curl', 'polso', 'curl del polso', 'avambraccio'],
    nota: 'Muovi solo il polso: lavora l\'avambraccio, che sta sotto il gomito.',
  },
  // IL BRACHIORADIALE, IL SECONDO MOTORE DEL MARTELLO (16/10/2026).
  //
  // Ste: "l'hammer curl non fa anche il brachioradiale?". Sì: in presa neutra il
  // gomito si piega per opera del brachiale e del brachioradiale, e il bicipite è un
  // terzo motore solo perché diventa pronatore e perde forza.
  //
  // Non ha parole sue: nessun esercizio si chiama "brachioradiale", e metterlo qui
  // farebbe scattare la parola su qualunque descrizione. Viene acceso dal
  // MOVIMENTO `curl`, che è il posto giusto: è un muscolo che aiuta TUTTI i curl, e
  // non uno che identifica un esercizio in particolare.
  {
    id: 'brachioradiale', muscolo: 'avambraccio', parte: 'brachioradiale (sotto il gomito)',
    // La parola è il nome del muscolo: nessun esercizio del catalogo la contiene,
    // quindi non può scattare per sbaglio. Serve solo perché il pezzo sia
    // riconoscibile (vedi M7).
    parole: ['brachioradiale'],
    nota: 'Sta sul davanti dell\'avambraccio, sotto il gomito e verso l\'esterno. '
      + 'Piega il gomito insieme al brachiale, quindi lavora su ogni curl.',
  },
  // IL TRICIPITE SONO DUE CAPI, E L'APP LI CONFONDEVA (15/10/2026).
  //
  // Ste: "Overhead Tricep Ext. capo lungo del tricipite", "Single Arm Pushdown il
  // tricipite la parte laterale". Sono due muscoli diversi dentro lo stesso braccio,
  // e l'app li mostrava come uno solo.
  //
  // IL CAPO LUNGO parte dalla scapola e passa dietro la spalla. Per questo lavora
  // quando il braccio è IN ALTO (sopra la testa), ed è svantaggiato quando il
  // braccio è lungo il fianco o sotto, perché a braccio basso si accorcia e perde
  // la sua corsa utile.
  //
  // IL CAPO LATERALE è la pancia, quella che si vede e si sente: è il principale
  // con il braccio lungo il fianco, quindi nel pushdown, e quello che stende il
  // gomito spingendo dal basso (dips, panca).
  //
  // LE PAROLE. Il capo lungo ha frasi lunghe e precise ("overhead tricep", che è
  // una frase e quindi vale doppio), il capo laterale ha il generico "tricipite".
  // Se mettevo "estensioni" anche nel laterale, "Cable Overhead Tricep Extension"
//  faceva 2 a 2 e vinceva per ordine: lo stesso difetto del braccio, un'altra
  // volta. Quindi il laterale ha le parole generiche e il lungo le sue frasi.
  {
    id: 'spalla_gomito_alto', muscolo: 'braccio', parte: 'tricipite: capo lungo',
    parole: ['overhead tricep extension', 'overhead tricep', 'estensioni sopra la testa',
      'sopra la testa', 'french press', 'skull', 'tricep pushdown in alto'],
    nota: 'Capo lungo: parte dalla scapola e passa dietro la spalla. Lavora con il braccio in alto (sopra la testa) e a braccio basso è svantaggiato, perché si accorcia.',
  },
  {
    id: 'spalla_gomito_basso', muscolo: 'braccio', parte: 'tricipite: capo laterale',
    parole: ['tricep pushdown', 'pushdown', 'single arm tricep', 'tricipite', 'tricipiti',
      // "dip" e "dips" NON ci sono (15/10/2026, stesso lavoro del movimento sotto):
      // i dip sono una SPINTA, quindi i tricipiti non li aggiunge una parola ma il
      // fatto che l'esercizio spinga. Vedi `MOVIMENTI`.
      'tricep', 'estensioni'],
    nota: 'Capo laterale: è la pancia del tricipite, quella che si vede e si sente. È il principale con il braccio lungo il fianco, quindi nel pushdown, e quello che stende il gomito spingendo dal basso.',
  },

  // ---- gambe ----
  {
    id: 'quadricipite', muscolo: 'gambe', parte: 'quadricipite (davanti)',
    parole: ['leg extension', 'estensioni gambe', 'affondi', 'lunge', 'squat', 'leg press'],
    nota: 'Stendi il ginocchio: lavora il quadricipite, il muscolo davanti della coscia.',
  },
  {
    id: 'femorale', muscolo: 'gambe', parte: 'femorale (dietro)',
    // il deadlift: le gambe e la catena posteriore (Ste, 21/10/2026)
    parole: ['leg curl', 'curl gambe', 'prone curl', 'stacco', 'deadlift'],
    nota: 'Piega il ginocchio: lavora il femorale, il muscolo dietro la coscia.',
  },
  {
    id: 'polpaccio', muscolo: 'gambe', parte: 'polpaccio (gemelli e soleo)',
    parole: ['calf', 'polso', 'panturrino', 'sled press calf'],
    nota: 'Sui punta: lavora il polpaccio, dietro la gamba.',
  },
  {
    id: 'glutei', muscolo: 'gambe', parte: 'glutei',
    // l'hip extension e il back extension (iperextensione) sono i glutei:
    // i muscoli della schiena che lavorano con loro in questa tavola non ci sono.
    // l'iperextensione e' a 45 gradi: lavora i glutei, ma SOPRATTUTTO i lombari
    // (la bassa schiena), che sono la parte profonda
    parole: ['hip thrust', 'glute bridge', 'squat', 'stacco', 'affondi'],
    nota: 'Spinta coi fianchi: lavora il gluteo, il muscolo più forte del corpo.',
  },
  {
    id: 'addome', muscolo: 'core', parte: 'addome',
    parole: ['crunch', 'plank', 'addome', 'sit up', 'tCrunch',
      // due nomi che si sentono spesso e non erano nel vocabolario (Ste, 21/10/2026)
      'russian twist', 'hanging leg raise', 'leg raise', 'abs', 'sit-up', 'obliquo'],
    nota: 'Lavora il core: gli addominali e il fondo della schiena.',
  },
];

function normalizza(testo) {
  return String(testo == null ? '' : testo)
    .toLowerCase()
    .replace(/[àáâ]/g, 'a').replace(/[èéê]/g, 'e').replace(/[ìíî]/g, 'i')
    .replace(/[òóô]/g, 'o').replace(/[ùúû]/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function conta(testo, parola) {
  const p = normalizza(parola);
  if (!p) return 0;
  const t = ' ' + testo + ' ';
  let n = 0;
  let i = t.indexOf(p);
  while (i !== -1) {
    if (t[i - 1] === ' ' && (t[i + p.length] === ' ' || i + p.length === t.length)) n++;
    i = t.indexOf(p, i + 1);
  }
  return n;
}

// LE PAROLE CHE NON SONO MUSCOLI.
//
// Un esercizio si chiama quasi sempre "attrezzo + posizione + movimento":
// "Incline Dumbbell Press", "Cavo Alzate laterali", "Macchina per le trazioni".
// La posizione e il movimento ci sono tutti e due, ma la FRASE non si trova se
// le parole non stanno attaccate: "incline press" non c'è dentro "incline
// dumbbell press". Quindi, se una frase non si trova, si riprova sul testo con
// le parole dell'attrezzo tolte.
//
// È solo una prova IN PIÙ: prima si cerca il testo come è, e se la frase c'è già
// non si cambia niente. E la lista contiene solo accessori e paroline di
// raccordo: nessuna parola che dica quale muscolo si muove. "curl", "raise",
// "row", "fly", "press" ed "extension" restano fuori apposta, altrimenti
// "cable lateral raise" perderebbe "lateral" e diventerebbe un semplice raise.
const ACCESSORI = /\b(dumbbell|kettlebell|manubrio|manubri|bilanciere|barbell|barra|cable|cavo|cavi|machine|macchina|smith|iso|seated|seduto|single|arm|braccio|double|doppio|weighted|zavorra|assistito|assisted|in|al|alla|dal|della|delle|di|da|con|per|a)\b/g;

/** Il testo con le parole dell'attrezzo tolte: vedi la nota su ACCESSORI. */
function senzaAccessori(testo) {
  return ' ' + String(testo).replace(ACCESSORI, ' ').replace(/\s+/g, ' ').trim() + ' ';
}

/**
 * Quale pezzo di muscolo lavora quest'esercizio?
 *
 * nome e descrizione insieme: spesso la parte è nella descrizione ("panca
 * inclinata") e nel nome c'è solo il nome dell'esercizio.
 */
/**
 * Cache dei pezzi riconosciuti. Vedi la nota in esercizi-classificatore.js:
 * gli stessi nomi vengono guardati decine di volte quando la pagina disegna una
 * lista, e rifare la conta delle parole ogni volta È sprecato.
 */
const CACHE = new Map();
const CACHE_MAX = 500;

// Vedi `livelli` in riconosciParte(): a parità di punti il pezzo primo in
// classifica resta pieno e gli altri scendono di questo gradino.
const SCONTO_POSIZIONE = 0.7;

// Ste (15/10/2026): "più evidenziati devono essere i muscoli allenanti
// principali di quell'esercizio. fallo in tutto e che si aggiorni
// automaticamente".
//
// I MUSCOLI DI SPINTA SU UNA TIRATA. Il petto si spinge: se stai TIRANDO il
// peso verso di te il petto non lavora, e accenderlo è proprio l'errore che ha
// fatto dire a Ste che sulla figura "non è giusto".
//
// Le parole che dicono "tiro" sono nel NOME dell'esercizio, non nella
// descrizione: "Incline Single Arm Pulldown" era finito nel petto per la frase
// "panca inclinata" dentro la sua descrizione ("sto sulla panca inclinata col
// petto appoggiato e tiro il cavo"), che è il mobile su cui sei sdraiato.
//
// Quindi: se il nome è di una tirata, il petto non viene ne' considerato come
// principale, ne' come secondario. Non è una lista di muscoli sbagliati: è la
// regola che un movimento di tirata non può essere una spinta.
const TIRATA = /\b(pulldown|pull[\s-]?up|pullover|tirat[ae]|trazione|trazioni|curl|row|rematore|rowing|chin|sled pull)\b/i;
const SPINGONO = ['petto'];

// I MUSCOLI CHE LAVORANO MA NON SONO IL MOTORE DELL'ESERCIZIO.
//
// Ste (15/10/2026): "i dips non fanno anche tricipiti? e poi nell' one arm cable
// reverse fly non lavora anche tricipiti o si? o comunque se lo fa non lo fa
// principalmente. più evidenziati devono essere i muscoli allenanti principali di
// quell'esercizio. fallo in tutto e che si aggiorni automaticamente".
//
// LA RAGIONE DI QUESTA TABELLA. Fin qui il classificatore contava solo le PAROLE
// del nome. È il metodo giusto per capire QUALE muscolo è il principale, ma è la
// parte sbagliata per i muscoli che ci stanno accanto, perché quasi nessun
// esercizio muove un muscolo solo: una panca è petto più tricipiti più deltoide,
// una trazione è dorsale più bicipiti più trapezi. Prima si reggeva con una
// keyword aggiunta a mano ("dip" dentro la lista dei tricipiti), e quella reggeva
// per un esercizio solo: il giorno che Ste aveva aggiunto "Incline Dumbbell
// Press", sulla figura veniva il petto pieno e nient'altro.
//
// Qui si scrive invece il MOVIMENTO una volta sola, con i muscoli che lo
// sostengono e quanto. Poi qualsiasi esercizio che fa quel movimento — oggi come
// fra un anno, con o senza le parole che oggi lo fanno riconoscere — accende
// anche quelli. È il "che si aggiorni automaticamente" di Ste: non è una lista di
// esercizi, è anatomia.
//
// LE QUOTE. Sono quanto il muscolo lavora rispetto al pezzo principale, e si
// leggono così:
//   da 0.45 in su  il muscolo muove davvero insieme al principale: si vede, ma
//                  più chiaro
//   sotto 0.2     tiene l'equilibrio e basta: si accende appena accennato
//   0.2 - 0.44    aiuta e stabilizza: una sfumatura discreta
//
// NESSUN secondario MAI arriva a 1. Il pieno è riservato al pezzo che
// l'esercizio sceglie, ed è la regola che Ste ha scritto: "più evidenziati devono
// essere i muscoli allenanti principali di quell'esercizio".
export const MOVIMENTI = [
  {
    id: 'dip',
    parole: ['dip', 'dips', 'dip alle parallele', 'chest dip', 'push up', 'push ups',
      'pushup', 'pushups'],
    // Ste ha chiesto proprio dei dip ("i dips non fanno anche tricipiti?"): sì, e
    // parecchio, perché il peso resta su braccia estese. Il deltoide invece
    // passa quasi inosservato, e per quello non lo si accende: accendere tutto
    // quello che c'è vicino è il contrario di quello che hai chiesto.
    //
    // ANCHE IL CAPO LUNGO, PERCHÉ SI VEDAVA L'AVAMBRACCIO (16/10/2026).
    // Ste: "i dips sono evidenziati gli avambracci", con l'omino davanti agli occhi.
    // Qui dentro c'era un solo capo acceso (il laterale, 0,66) e il disegno ne
    // faceva una macchia sola, in basso sul braccio di dietro.
    //
    // E il motivo per cui sembrava l'avambraccio è geometrico, non anatomico: sul
    // disegno di DIETRO l'avambraccio non è disegnato, il braccio va dritto alla
    // mano. Quindi qualsiasi luce, per quanto spostata in su, finisce per sembrare
    // "la parte bassa del braccio". Spostarla non bastava (l'avevo già fatto
    // nella v179): a mettere la parola fine è accendere il tricipite per intero,
    // così la cosa accesa è il BRACCIO e non una chiazza vicino al gomito.
    //
    // Il capo lungo tiene 0,42 e il laterale 0,66: due sfumature diverse sullo
    // stesso muscolo, e i due capi restano distinguibili come nel pushdown.
    secondari: { spalla_gomito_alto: 0.42, spalla_gomito_basso: 0.66 },
  },
  {
    id: 'spinta_petto',
    // NIENTE "panca" DA SOLA. Il mobile non è il movimento: su una panca si fa
    // un curl, una panca Scott e un rematore quanto un peso. Qui contano le
    // frasi che dicono che stai SPINGENDO il petto ("panca piana", "panca
    // inclinata"), non il posto dove stai sdraiato.
    parole: ['bench press', 'chest press', 'pecorino', 'pressione petto',
      'panca piana', 'panca inclinata', 'panca declinata', 'panca con bilanciere',
      'horizontal press', 'floor press', 'spinta petto',
      // la posizione dentro la frase, non la parola "press" da sola: un
      // "shoulder press" o un "military press" spingono in alto e lavorano le
      // spalle, e quelle parole devono continuare a trovare le spalle.
      'incline press', 'inclined press', 'decline press', 'declined press',
      'flat press', 'dumbbell press', 'machine press', 'press inclinato',
      'pressorino', 'spinta orizzontale'],
    // Le braccia che spingono il peso non si limitano al petto: il gomito è
    // steso e lì dentro c'è il tricipite, e la spalla davanti fa da pivot. Il
    // tricipite viene prima del deltoide perché su una panca il gomito è
    // letteralmente il motore del movimento.
    secondari: { spalla_gomito_basso: 0.66, spalle_frontali: 0.35 },
  },
  {
    id: 'fly_petto',
    parole: ['cable fly', 'cross over', 'crossover', 'crucifix', 'fly basso',
      'low cable fly', 'fly con i cavi'],
    // Il fly è l'unico caso in cui il gomito NON si stende: qui i tricipiti non
    // lavorano quasi per niente, e non c'è motivo di accenderli.
    //
    // E NON C'È NEMMENO LA SPALLA DAVANTI, che fino al 15/10/2026 c'era a 0,15 e
    // quindi si accendeva comunque (vedi la nota su `alzata_laterale`: un numero
    // sotto la soglia si accende lo stesso, perché `anatomia` certifica i
    // secondari veri). Sul fly la spalla anteriore segue le braccia ma non è un
    // muscolo che il movimento allena, e accenderlo è esattamente l'errore che
    // Ste ha segnalato guardando la figura.
    secondari: {},
  },
  {
    id: 'spinta_verticale',
    parole: ['shoulder press', 'military', 'militare', 'overhead press',
      'spinte in alto', 'presse in alto', 'press a spalle', 'press militare',
      'front raise', 'alzata frontale', 'alzate frontali'],
    // Spingere in alto stende il gomito (tricipite) e tira le spalle su (trapezi).
    secondari: { spalla_gomito_alto: 0.66, dorso_alto: 0.4 },
  },
  {
    id: 'tirata_verticale',
    // "trazione" e "tirata" al singolare sono dritte: al plurale ("tirate")
    // non si sa, perché "tirate a braccia aperte" e "tirate orizzontali"
    // sono due movimenti diversi e stanno più in basso nell'elenco.
    parole: ['pulldown', 'pull down', 'pull up', 'pull ups', 'pull-up', 'pull-ups',
      'trazioni', 'trazione', 'tirata in basso', 'pullover', 'auzhang',
      'tirata verticale', 'tirate in basso'],
    // I TRAPEZI NON LAVORANO SU UNA TIRATA IN BASSO, e i lombari no nemmeno
    // (15/10/2026).
    //
    // Ste: "il pulley fa dorsali, i lombari stanno in isometria, e i bicipiti pure
    // lavorano perché è di tirata". È la risposta giusta, e in due pezzi.
    //
    // I Bicipiti restano, e la ragione e' quella che ha detto lui: e' una TIRATA,
    // quindi il gomito si piega e chi lo piega e' il bicipite. Vale per tutte le
    // tirate, non solo per il pulley.
    //
    // I TRAPEZI vanno via. Qui prima c'era `dorso_alto: 0,3`, cioe' la zona fra collo
    // e spalle, e Ste guardando la figura ha chiesto "i trapezi dove? nel pulley non
    // lavorano i trapezi". Ha ragione: tirare in basso tira i latini e il centro
    // della schiena, la fascia alta fra collo e spalle resta ferma. Era un secondario
    // messo li' per completezza, e la regola del progetto dice che un secondario o ha
    // una quota sua e si vede, o non si mette: questo non si vedeva, non c'era.
    //
    // I LOMBARI invece non sono un errore da correggere: è che la figura non li ha,
    // e Ste ha spiegato perché è giusto così. Stanno in ISOMETRIA, cioè tengono la
    // schiena ferma senza accorciarsi: un muscolo in isometria non produce movimento e
    // non si dipinge. (È il caso classico, e su un pulley col fermo coscia i lombari
    // sono scaricati due volte: dalla posizione seduta e dal fermo.)
    //
    // Quindi qui restano due muscoli: i latini, che sono il pezzo principale e
    // vengono dalle parole, e il bicipite. Nient'altro da accendere.
    //
    // Il CENTRO SCHIENA NON C'È, e me l'ha detto Ste due volte (16/10/2026).
    // Prima avevo capito che il centro schiena dovesse passare qui, e l'avevo messo
    // con quota 0,42: era sbagliato. Sul pulley, sul pull up e sulle trazioni fanno
    // i dorsali e il bicipite, il centro schiena no.
    secondari: { braccio_basso: 0.5 },
  },
  {
    id: 'tirata_orizzontale',
    parole: ['row', 'rematore', 'tiremento', 'tirate orizzontali', 'tirata orizzontale',
      'bench pull', 'dumbbell bench pull'],
    // La tirata a braccia piegati è l'esercizio che lavora più muscoli insieme:
    // dorsale largo, deltoide dietro (che è quello che si vede quando apri le
    // braccia) e bicipiti. Il bicipite è l'ultimo dei tre: tiene il gomito piegato
    // ma non è lui a tirare il peso.
    secondari: { dorso_lati: 0.6, spalle_posteriori: 0.5, braccio_basso: 0.4 },
  },
  {
    id: 'shrug',
    parole: ['shrug', 'spalle a y', 'elevazione scapola'],
    // Alzare le spalle è l'esercizio più solo che ci sia: qui non si accende
    // nient'altro, e va bene così.
    secondari: {},
  },
  {
    id: 'curl_avambraccio',
    parole: ['wrist curl', 'curl del polso', 'curl polso', 'avambraccio'],
    secondari: {},
  },
  {
    id: 'curl_gambe',
    parole: ['leg curl', 'curl gambe', 'prone curl', 'stacco'],
    secondari: {},
  },
  {
    id: 'curl',
    parole: ['curl', 'bilanciere', 'incline curl', 'curl inclinato', 'scott bench',
      'preacher'],
    // IL BRACHIORADIALE SI ACCENDE, E IL COMMENTO PRIMA DICEVA IL CONTRARIO (16/10/2026).
    //
    // Qui c'era scritto: "l'avambraccio dell'app è il piegatore del polso, che in un
    // curl non lavora. Il brachioradiale è un muscolo diverso e non è quello
    // disegnato qui: meglio acceso niente che acceso il muscolo sbagliato".
    //
    // Ste: "l'hammer curl non fa anche il brachioradiale?". Aveva ragione, e il
    // commento aveva due errori: il brachioradiale è proprio uno dei due motori
    // della flessione del gomito in presa neutra, e il pezzo c'era disegnato (sotto
    // il gomito, sul lato esterno). Vedi la sagoma in mappa-muscoli.js.
    //
    // Quindi ora il curl accende anche il brachioradiale. L'AVAMBRACCIO PIEGA IL
    // POLSO e su un curl continua a non lavorare, quindi resta spento.
    secondari: { brachioradiale: 0.5, braccio_alto: 0.35 },
  },
  {
    id: 'estensione_gomito',
    parole: ['tricep pushdown', 'pushdown', 'french press', 'skull', 'tricep extension',
      'tricep ext', 'estensioni sopra la testa', 'overhead extension', 'jm press', 'single arm tricep',
      'overhead tricep', 'tricipite', 'tricipiti'],
    // IL DELTOIDE POSTERIORE E' STATO TOLTO (15/10/2026). La spalla dietra tiene il
    // braccio fermo mentre il gomito si stende: lavora un po', ma era messo a 0,15 e
    // quindi si accendeva comunque (vedi la nota su `alzata_laterale`). Ste ha
    // scritto che l'app evidenziava muscoli che non c'entrano, e il deltoide
    // posteriore su un pushdown è esattamente uno di quelli.
    //
    // Nota: sul FRENCH PRESS e sullo SKULL CRUSHER il posteriore lavora sul serio,
    // perché il braccio passa dietro la testa e lì il movimento è diverso dal
    // pushdown. Se un domani si vuole distinguere, la via giusta è un movimento
    // `estensione_gomito_alta` con la sua quota, non un numero più basso qui.
    secondari: {},
  },
  {
    id: 'reverse_fly',
    parole: ['reverse fly', 'rear delt', 'rear deltoid', 'delt posteriori',
      'tirate a braccia aperte', 'peck deck', 'pec deck', 'reverse pec'],
    // Ste (15/10/2026): "nell' one arm cable reverse fly non lavora anche
    // tricipiti o si?". Risposta onesta: il gomito sta quasi fermo, quindi i
    // tricipiti tengono solo l'equilibrio e NON sono il motore del movimento —
    // che è esattamente quello che ha scritto lui, "se lo fa non lo fa
    // principalmente". Quindi si accendono, ma all'ultima sfumatura: si vedono
    // appena e non si possono confondere col deltoide, che è quello che lavora.
    // Dietro, le scapole tirano: dorsale e trapezi sono i veri aiutanti.
    // IL TRAPEZIO E' STATO TOLTO (15/10/2026). C'era a 0,15 con la frase "sotto
    // la soglia, quindi non si accende", e invece si accendeva: `anatomia` certifica
    // un secondario come vero, e un certificato si accende sotto soglia. Ste ha
    // scritto che l'app evidenziava muscoli che non c'entrano, e aveva ragione.
    // Un numero che non si vede non serve a niente: o il muscolo lavora e ha una
    // quota sua, o non si mette e se ne parla in una riga di commento come questa.
    // IL CENTRO SCHIENA ESCE (16/10/2026). Ste: "one arm cable reverse fly fa
    // deltoide anteriore non il centro schiena".
    //
    // Sul centro schiena ha ragione, e infatti l'ha detto anche per il rematore e
    // per il pulley: era un secondoario messo lì "per completezza", e la regola del
    // progetto dice che un secondario o ha una quota sua e si vede, o non si mette.
    // Qui si vedeva e non c'entrava: il reverse fly muove le braccia, non tira la
    // parte centrale della schiena. Quindi via.
    //
    // Resta solo il tricipite all'ultima sfumatura, per la richiesta del 15/10.
    secondari: { spalla_gomito_alto: 0.1 },
  },
{
    id: 'alzata_laterale',
    parole: ['lateral raise', 'side raise', 'alzata laterale', 'alzate laterali',
      'deltoide laterale'],
    // NESSUN SECONDARIO, e fino al 15/10/2026 qui c'era il trapezio a 0,15 con
    // la frase "sotto la soglia, quindi non si accende". Il codice diceva una cosa
    // e faceva un'altra: `anatomia` certifica un muscolo come secondario VERO, e un
    // certificato si accende anche sotto la soglia (vedi SOGLIA_SECONDARIO). Quindi
    // il trapezio finiva dipinto sul cavo, e Ste guardando la scheda delle alzate
    // laterali ha scritto che l'app "evidenzia muscoli che non c'entrano".
    //
    // Aveva ragione, ed è un numero che non serviva a niente: sotto la soglia non si
    // vede, e se si vedesse sarebbe rumore. Se un giorno si volesse dire "qui il
    // trapezio sfiora", quello è un-commento come questo, non una voce nella mappa.
    secondari: {},
  },
  {
    id: 'stacco_gambe',
    parole: ['leg press', 'squat', 'hack', 'affondi', 'lunge', 'hip thrust',
      'glute bridge', 'stacco'],
    // Scendere e alzare con le gambe è lavoro di tre muscoli: i quadricipiti
    // spingono, i glutei aprono l'anca e il femorale frena la discesa.
    // Ste chiede sempre "chi lavora PRINCIPALMENTE": per questo il
    // quadricipite resta pieno, il gluteo segue forte e il femorale resta
    // sotto, perché lavora soprattutto quando scendi, non quando spingi.
    secondari: { glutei: 0.66, femorale: 0.4 },
  },
  {
    id: 'estensione_gambe',
    parole: ['leg extension', 'estensione gambe', 'estensioni gambe'],
    secondari: {},
  },
  {
    id: 'polpaccio',
    parole: ['calf', 'panturrino', 'sled press calf'],
    secondari: {},
  },
  {
    id: 'addome',
    parole: ['crunch', 'plank', 'addome', 'sit up', 'tCrunch', 'Crunch'],
    secondari: {},
  },
];

/**
 * Che movimento è? Serve per sapere che muscoli ci stanno accanto.
 *
 * PRIMA IL NOME, POI LA DESCRIZIONE. Un esercizio si chiama come il movimento
 * che fa, e il nome non mente: "Incline Single Arm Pulldown" resta una tirata
 * anche se nella descrizione Ste scrive "col petto appoggiato", e anzi è proprio
 * la descrizione a far sbagliare il classificatore (la frase "panca inclinata"
 * dentro il testo di un pulldown diceva il petto).
 *
 * Solo se il nome non dice niente ("Panca", "Curl") si guarda anche la
 * descrizione, perché lì spesso c'è scritto come lo esegue.
 *
 * Vince il primo movimento che trova nell'elenco, quindi l'elenco va tenuto dal
 * più specifico al più generico: "wrist curl" prima di "curl", "leg curl" prima
 * di "curl", "dip" prima di "panca".
 */
function movimentoDi(nome = '', descrizione = '') {
  const soloNome = ' ' + normalizza(nome) + ' ';
  const ancheDescrizione = soloNome + normalizza(descrizione) + ' ';
  // Come in `riconosciParte`: il riprovo senza accessori è su nome e descrizione
  // SEPARATI, perché uniti inventano frasi che non esistono (vedi la nota lì).
  const testi = [
    soloNome,
    ancheDescrizione,
    senzaAccessori(soloNome),
    senzaAccessori(' ' + normalizza(descrizione) + ' '),
  ];
  for (const testo of testi) {
    for (const m of MOVIMENTI) {
      if (m.parole.some((w) => conta(testo, w) > 0)) return m;
    }
  }
  return null;
}

// Gli id che l'app sa disegnare: serve per non mettere in `livelli` un muscolo
// che non esiste (una parola scritta male nella tabella deve restare innocua, non
// rompere la figura).
const ID_PARTI = new Set(PARTI.map((p) => p.id));

// LA FASE PER ESERCIZIO (Ste, 18/10/2026).
//
// La nota del petto era una frase sola per tutti gli esercizi: "le spinte e i fly
// caricano soprattutto il centro del petto". Ma il fly è un movimento DIVERSO dalla
// panca: il fly ALLARGA le fibre del petto, la panca SPINGE. E la panca inclinata
// carica il petto alto, quella stesa il centro, quella declinata il basso.
//
// Quindi la frase dipende dall'esercizio: prima si guarda che movimento è (spinta o
// fly) e in che zona del petto sta lavorando. Il testo e la figura dicono la stessa
// cosa, perché leggono la stessa zona.
//
// Le altre zone (braccia, schiena, spalle) hanno già la loro nota giusta: quella
// parla del movimento, non della zona, e quindi va bene per ogni esercizio.
const FRASI_PETTO = {
  spinta_alto: 'Le spinte con le spalle alzate caricano soprattutto il petto alto, il capo che parte dalla clavicola.',
  spinta_centro: 'Le spinte con le spalle in piano caricano soprattutto il centro del petto, il capo più grande.',
  spinta_basso: 'Le spinte con le spalle abbassate caricano soprattutto il petto basso, le fibre più in basso del capo sternale.',
  dip: 'I dip spingono il corpo in avanti: caricano le fibre più in basso del petto e tirano molto sui tricipiti.',
  fly_alto: 'Il fly alto allarga le fibre del petto alto, quello che parte dalla clavicola.',
  fly_centro: 'Il fly allarga le fibre del petto, soprattutto al centro: non spinge, allunga.',
  fly_basso: 'Il fly basso allarga le fibre più in basso del petto.',
};

const ZONA_PETTO = { petto_alto: 'alto', petto_centrale: 'centro', petto_basso: 'basso' };

function notaPerEsercizio(parte, movimento) {
  if (!parte) return null;
  const zona = ZONA_PETTO[parte.id];
  if (!zona) return parte.nota;
  if (movimento === 'dip') return FRASI_PETTO.dip;
  if (movimento === 'fly_petto') return FRASI_PETTO['fly_' + zona];
  if (movimento === 'spinta_petto') return FRASI_PETTO['spinta_' + zona];
  return parte.nota;
}

export function parteDiMuscolo({ nome = '', descrizione = '' } = {}) {
  const chiave = nome + ' ' + descrizione;
  const gia = CACHE.get(chiave);
  if (gia !== undefined) return gia;
  const risultato = riconosciParte({ nome, descrizione });
  if (CACHE.size >= CACHE_MAX) CACHE.clear();
  CACHE.set(chiave, risultato);
  return risultato;
}

function riconosciParte({ nome = '', descrizione = '' } = {}) {
  const soloNome = ' ' + normalizza(nome) + ' ';
  // Uno SPAZIO solo tra nome e descrizione, non due. `soloNome` finisce già con
  // uno spazio: aggiungendone un altro, "Panca" + "inclinata" diventava
  // "panca  inclinata" e la frase "panca inclinata" non poteva mai trovarsi,
  // perché il confronto cerca una parola sola. Le frasi attraversavano il
  // confine e non funzionavano (15/10/2026).
  const ancheDescrizione = soloNome + normalizza(descrizione) + ' ';
  // Un pezzo è detto da una FRASE ("panca inclinata"), non da una parola
  // sola. Quindi una frase trovata solo nella descrizione conta come nella
  // descrizione: se scrivevo "panca" e la descrizione diceva "inclinata",
  // il pezzo giusto era l'alto, non quello generico.
  //
  // E se la frase non c'è nemmeno così, si riprova senza le parole
  // dell'attrezzo: "Incline Dumbbell Press" contiene "incline" e "press", ma la
  // frase "incline press" è separata dal manubrio. Vedi ACCESSORI.
  const cerca = (p, w) => {
    const soloN = conta(soloNome, w);
    if (soloN > 0) return { n: soloN, soloNome: true };
    const nelTutto = conta(ancheDescrizione, w);
    if (nelTutto > 0) return { n: nelTutto, soloNome: false };
    // IL RIPROVO SENZA ACCESSORI E' SU NAME E DESCRIZIONE SEPARATI (16/10/2026).
    //
    // Prima si toglievano gli accessori dal testo UNITO di nome e descrizione, e li si
    // incollava: "Cable Hammer Curl" + "Cavo basso, alla cavigliera" diventava, tolte
    // le parole dell'attrezzo, "hammer curl basso", che contiene la frase "curl basso".
    // Quindi il Cable Hammer Curl veniva riconosciuto come BRACCIO BASSO invece che
    // come brachiale, e sull'app si accendevano bicipite e brachiale insieme. Ste:
    // "il bicipite/brachiale non sono divise", e il motivo non era la figura: era il
    // testo che faceva il classificatore.
    //
    // Le frasi attraversavano il confine fra nome e descrizione e non esistevano. Il
    // riprova quindi su ciascuno dei due, altrimenti si ricrea lo stesso guaio.
    const nelNome = conta(senzaAccessori(soloNome), w);
    if (nelNome > 0) return { n: nelNome, soloNome: true };
    return { n: conta(senzaAccessori(' ' + normalizza(descrizione) + ' '), w), soloNome: false };
  };

  const trovati = [];
  const soloTirata = TIRATA.test(nome);
  // LE PAROLE GENERICHE (Ste, 21/10/2026).
  //
  // "Barbell Curl", "Dumbbell Curl", "Curl manubri", "Curls": l'app non li
  // riconosceva, perché il bicipite aveva solo le FRASI ("curl con bilanciere",
  // "curl al cavo") e non la parola "curl" da sola. E la parola da sola non può stare
  // nella lista principale: il "Cable Hammer Curl" e' un martello (brachiale), e con la
  // parola "curl" farebbe pari punti col bicipite, e a parita' di punti vince chi
  // arriva prima nella lista.
  //
  // Quindi: se il nome non ha dato niente, si riprova con le parole generiche. Sono
  // l'ultimo tentativo, non il primo: ogni nome che una parola specifica riconosce
  // resta riconosciuto da quella.
  const PAROLE_GENERICHE = { curl: 'braccio_basso', curls: 'braccio_basso' };
  for (const p of PARTI) {
    // una tirata non può essere una spinta: vedi la nota su TIRATA
    if (soloTirata && SPINGONO.includes(p.muscolo)) continue;
    let punti = 0;
    const parole = [];
    let soloNelNome = true;
    for (const w of p.parole) {
      const r = cerca(p, w);
      if (r.n === 0) continue;
      const peso = r.n * (normalizza(w).includes(' ') ? 2 : 1);
      punti += peso;
      if (!r.soloNome) soloNelNome = false;
      parole.push(w);
    }
    if (punti > 0) trovati.push({ parte: p, punti, parole, soloNelNome });
  }
  if (!trovati.length) {
    // il riprovo con le parole generiche
    for (const [parola, idParte] of Object.entries(PAROLE_GENERICHE)) {
      if (conta(soloNome, parola) === 0) continue;
      const p = PARTI.find((x) => x.id === idParte);
      if (!p) continue;
      trovati.push({ parte: p, punti: 1, parole: [parola], soloNelNome: true });
    }
  }
  if (!trovati.length) {
    return {
      trovata: false,
      muscolo: null, parte: null, nome: null, nota: null,
      livelli: {},
      frase: 'Non so quale pezzo di muscolo lavori: è un esercizio generico.',
    };
  }
  // nel nome c'è solo una parola generica, ma nella descrizione c'è un pezzo
  // preciso: vince il pezzo preciso
  trovati.sort((a, b) => {
    if (a.punti !== b.punti) return b.punti - a.punti;
    return (a.soloNelNome ? 1 : 0) - (b.soloNelNome ? 1 : 0);
  });
  const v = trovati[0];

  // QUANTO lavora ogni pezzo, da 0 a 1, con il migliore a 1.
  //
  // Ste (15/10/2026): "la parte che lavora di più deve essere più evidenziata,
  // la parte che lavora di meno deve essere evidenziata più chiara. tipo il dip
  // qua segna tutto il petto che e' giusto ma allena principalmente la parte
  // bassa".
  //
  // Qui i pezzi sono già ordinati per punti, quindi basta dividere per il primo:
  // il pezzo migliore fa 1, uno che ha la meta' dei punti fa 0,5. I pezzi che
  // l'esercizio non nomina affatto non ci sono: sulla figura restano al viola
  // più chiaro, che vuol dire "ci passa, ma il lavoro vero e' un altro".
  //
  // LO SCONTO DI POSIZIONE. Su "Smith Machine Incline Bench Press" il capo
  // clavicolare e quello centrale danno gli stessi punti (la parola "bench" e' in
  // entrambe le liste), e senza scontarli la figura accenderebbe i due pezzi
  // uguali: proprio la cosa che Ste ha detto di non volere. Quindi a parita' di
  // punti il pezzo più in alto nella classifica resta pieno e gli altri scendono
  // un gradino. Non e' una misura: e' il modo di dire "quando i dati non
  // distinguono, mostrami comunque quale lavora di più".
  const migliore = trovati[0].punti;
  const livelli = {};
  trovati.forEach((t, i) => {
    livelli[t.parte.id] = Math.round((t.punti / migliore) * SCONTO_POSIZIONE ** i * 100) / 100;
  });

  // I MUSCOLI CHE CI STANNO ACCANTO. Vedi la nota su MOVIMENTI.
  //
  // Qui non si contano parole: si chiede che movimento è e si accendono i muscoli
  // che lo sostengono. Per questo si aggiornano da soli anche gli esercizi che
  // ancora non esistono.
  //
  // DUE SALVAGUE.
  // 1. Non si abbassa mai un muscolo che le parole hanno già messo più in alto:
  //    l'anatomia può confermare una quota, non può smontarla.
  // 2. A una TIRATA i muscoli di spinta non si accendono mai, come già vale per
  //    il pezzo principale (vedi TIRATA): tirare non è spingere, e vale anche per
  //    i muscoli secondari.
  //
  // `anatomia` tiene conto di QUALI muscoli sono arrivati da qui e non dalle
  // parole: sono quelli su cui l'app si può fidare anche sotto la soglia dei
  // secondari, perché sono scritti una volta sola e non sono un'ipotesi.
  const anatomia = {};
  const movimento = movimentoDi(nome, descrizione);
  if (movimento) {
    for (const [id, quota] of Object.entries(movimento.secondari || {})) {
      if (!ID_PARTI.has(id) || id === v.parte.id) continue;
      const muscolo = PARTI.find((p) => p.id === id).muscolo;
      if (soloTirata && SPINGONO.includes(muscolo)) continue;
      if ((livelli[id] || 0) < quota) livelli[id] = quota;
      anatomia[id] = quota;
    }
  }

  // GLI ID DEI SECONDARI, e non solo i loro nomi.
  //
  // `anche` resta come era, una lista di nomi da leggere (ed è quello che il test
  // Z14 controlla). Ma per le etichette brevi che stanno accanto alla FOTO serve il
  // pezzo, non la frase: 'tricipite: sopra il gomito' è giusto da leggere e troppo
  // lungo da mettere in una riga. Quindi qui si tiene anche l'id, e chi deve
  // accorciare lo fa con la mappa dei gruppi invece di tagliare la stringa a parole.
  const ancheDettaglio = Object.entries(anatomia)
    .filter(([id]) => (livelli[id] || 0) >= anatomia[id])
    .sort((a, b) => b[1] - a[1])
    .map(([id, quota]) => ({
      id,
      quota,
      nome: PARTI.find((p) => p.id === id).parte,
      gruppo: ID_PARTI.has(id) ? gruppoMuscoloDi(id) : null,
    }));

  const anche = ancheDettaglio.map((x) => x.nome);

  // La nota parla dell'ESERCIZIO, non solo del pezzo di muscolo
  const nota = notaPerEsercizio(v.parte, movimento ? movimento.id : null);

  return {
    trovata: true,
    muscolo: v.parte.muscolo,
    gruppoPrincipale: gruppoMuscoloDi(v.parte.id),
    parte: v.parte.id,
    nome: v.parte.parte,
    nota,
    parole: v.parole,
    livelli,
    anatomia,
    movimento: movimento ? movimento.id : null,
    anche,
    ancheDettaglio,
    frase: `${v.parte.parte}. ${nota}`,
    altre: trovati.slice(1, 3).map((x) => x.parte.parte),
  };
}

/**
 * 'Sul petto', 'Sulle spalle': una frase suona bene solo se lo sai. Senza
 * questo l'app scriveva "Sul spalle", che fa capire subito che la cosa È
 * fatta a pezzi invece che pensata.
 */
export const PREP = {
  petto: 'Sul petto',
  dorso: 'Sul dorso',
  spalle: 'Sulle spalle',
  braccio: 'Sul braccio',
  gambe: 'Sulle gambe',
  addome: "Sull'addome",
};

export function preposizioneMuscolo(muscolo) {
  return PREP[muscolo] || 'Nel muscolo ' + muscolo;
}

/**
 * Quanto è duro quel pezzo di muscolo da lavorare, a parità di carico.
 *
 * Ste: "deve capire cosa lavora quell'esercizio e quindi capire se è
 * difficile o facile". Ecco il pezzo che mancava: il giudizio non veniva solo
 * dal nome, ma anche dal muscolo. Un carico bassissimo sul deltoide laterale
 * è più difficile di uno medio sul quadricipite, perché il muscolo è piccolo
 * e ti tiene in equilibrio.
 *
 * Il numero è quanto pesa il muscolo, da 0 (facile) a 6 (arduo).
 */
export const INTRINSECO = {
  "petto_alto": 1,
  "petto_centrale": 0,
  "petto_basso": 2,
  "dorso_alto": 3,
  "dorso_centrale": 0,
  "dorso_lati": 2,
  "spalle_laterali": 6,
  "spalle_posteriori": 4,
  "spalle_frontali": 1,
  braccio_alto: 5, // il bicipite in alto lavora in posizione corta: è il caso difficile
  braccio_basso: 0, // in basso è in posizione lunga: il modo più facile di arrivare a fare i bicipiti
  // Il brachiale NON e' un caso come l'alzata laterale (che ha 6 perché la leva è
  // la peggiore del corpo). Qui la leva e' buona e il movimento e' a corsa
  // completa: il brachiale sta solo sotto al bicipite e non si vede, ma non e' un
  // muscolo piccolo e instabile. Quindi numero neutro, 2, e nessuna spinta ne in
  // su ne giu': il giudizio lo danno il movimento e l'attrezzo, che e' come deve
  // essere. (Prima avevo messo 6 e la soglia SCENDEVA del 24%, cioe' l'app lo
  // trattava come il muscolo più facile del braccio: il contrario di come si vede
  // lifting in presa neutra.)
  brachiale: 2,
  "spalla_gomito_alto": 1,
  "spalla_gomito_basso": 1,
  "avambraccio": 2,
  "quadricipite": 0,
  "femorale": 1,
  "polpaccio": 2,
  "glutei": 1,
  "addome": 3
};

/** Quanto è duro questo pezzo di muscolo (0-6). */
export function intrinsecoDi(parte) {
  if (!parte || !parte.trovata) return null;
  return INTRINSECO[parte.parte] === undefined ? null : INTRINSECO[parte.parte];
}

export function livelloConMuscolo({
  nome = '', descrizione = '', convenzione = null,
  livelloDalMovimento = 'composto',
} = {}) {
  const parte = parteDiMuscolo({ nome, descrizione });
  const intrinseco = intrinsecoDi(parte);
  const base = livelloDalMovimento;
  const ordine = ['isolamento', 'composto', 'grande'];
  let i = Math.max(0, ordine.indexOf(base === 'assistito' ? 'composto' : base));
  const spinta = intrinseco === null ? 0 : intrinseco - 2;
  let livello = base;
  const motivi = [];
  if (base === 'assistito') {
    livello = 'assistito';
    motivi.push('è un esercizio col peso del corpo: si contano le ripetizioni');
  } else if (spinta >= 3) {
    // Un muscolo piccolo e instabile su un movimento di forza: È più duro di
    // quanto sembra. Il lateral raise È il caso limite: 4 kg li' sono duri.
    //
    // Il muscolo può solo ALZARE la difficolta', mai abbassarla: se la
    // macchina ti aiuta, lo sa già il classificatore dagli accorgimenti.
    // Qui altrimenti si contava due volte e il giudizio finiva sotto terra.
    livello = ordine[Math.min(ordine.length - 1, i + 1)];
    motivi.push(parte.nome + ': muscolo piccolo e instabile, più duro di quanto sembra');
  } else {
    motivi.push('movimento ' + base + ', muscolo ' + parte.nome + ': difficoltà normale');
  }
  return { livello, livelloDalMovimento: base, parte, intrinseco, spinta, frase: motivi.join(' | ') };
}
export function ordinePerMuscolo(esercizi) {
  const perMuscolo = new Map();
  for (const e of (esercizi || [])) {
    const p = parteDiMuscolo({ nome: e.nome, descrizione: e.nota_permanente || '' });
    const intr = intrinsecoDi(p);
    if (!p.trovata || intr === null) continue;
    if (!perMuscolo.has(p.muscolo)) perMuscolo.set(p.muscolo, []);
    perMuscolo.get(p.muscolo).push({ nome: e.nome, parte: p, intrinseco: intr });
  }
  const fuori = [];
  for (const [muscolo, lista] of perMuscolo) {
    if (lista.length < 2) continue;
    lista.sort((a, b) => a.intrinseco - b.intrinseco);
    fuori.push({
      muscolo, esercizi: lista,
      frase: preposizioneMuscolo(muscolo) + ': il più facile è ' + lista[0].nome
        + ', il più duro è ' + lista[lista.length - 1].nome + '.',
    });
  }
  return fuori;
}
/**
 * L'avvertimento che va detto ogni volta, perché il nome "parte alta" fa
 * pensare a un muscolo separato e non è così.
 */
export const AVVERTIMENTO_PARTI =
  'Nessun esercizio lavora SOLO un pezzo di muscolo: questo dice dove pesa di più. '
  + 'Lo stesso muscolo è fatto di un solo tipo di fibre, ma ha capi diversi '
  + 'che si attivano in modo diverso a seconda dell\'angolo.';

/**
 * Due esercizi sono la stessa cosa? Stesso muscolo e stessa parte.
 * Serve a non chiedere due volte la stessa sfida missione, e a far notare
 * che nella scheda ci sono due esercizi quasi identici.
 */
export function stessoLavoro(a, b) {
  if (!a || !b || !a.trovata || !b.trovata) return false;
  return a.muscolo === b.muscolo && a.parte === b.parte;
}
