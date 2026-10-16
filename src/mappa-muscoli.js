// mappa-muscoli.js -- l'omino che dice DOVE e QUANTO lavori.
//
// Ste (13/10/2026), tre volte sulla stessa figura:
//  1. "voglio che spunti questo omino con il muscolo allenato colorato di viola";
//  2. "deve essere l'omino come quello nella foto. si deve capire anche fronte e
//     retro e qua non si capisce e i quadratini grigi non mi piacciono";
//  3. "e' veramente brutto, non puoi copiare la foto da download e incollarla?
//     pero' deve ovviamente avere colorati solo i muscoli allenanti" e poi
//     "lo sfondo deve avere lo stesso colore dell'app".
// E poi (15/10/2026) il quarto punto, quello sulla FORZA del colore:
//  4. "la parte che lavora di più deve essere più evidenziata, la parte che
//     lavora di meno deve essere evidenziata più chiara. tipo il dip qua segna
//     tutto il petto che e' giusto ma allena principalmente la parte bassa".
//
// COSA C'E' QUI ADESSO
//
// La figura non e' disegnata: e' la FOTO sua (muscoli.jpeg), ritagliata in due
// immagini che stanno nella cartella img/muscoli/:
//   - corpo.png    il corpo con i muscoli spenti e lo sfondo TRASPARENTE, così
//                   si vede il colore dell'app;
//   - muscoli.png  gli stessi musoli in viola e tutto il resto trasparente.
//
// Per accendere un muscolo basta mostrare muscoli.png ritagliato sulla sagoma
// di quel muscolo: e' un'immagine sola che l'app ritaglia, quindi sul telefono
// resta leggera.
//
// LA GRADAZIONE (punto 4 di Ste)
// Un pettorale tutto viola di uguale dice "qui si lavora", ma non dice quanto.
// Sui DIP il peso arriva al capo sternale, quello in basso, e dipingere tutto
// il petto uguale e' come dire che si lavora più il capo clavicolare: e'
// falso. Quindi ogni zona ha una sua intensita', e la più debole e' un viola
// chiarissimo.
//
// L'intensita' non e' un numero inventato qui dentro: arriva da
// muscoli-parti.js, che già conta quante volte un esercizio parla di ogni
// pezzo. Noi prendiamo quella classifica e la traduciamo in quattro livelli.
//
// E LA SFUMATURA SI FA CON L'OPACITA' DELLA STESSA IMMAGINE, non con quattro
// immagini diverse: sopra il muscolo spento, il viola al 100% e' pieno, al 20%
// e' appena accennato. Un file in meno da scaricare e la figura resta leggera
// sul telefono.
//
// I RITAGLI sono le sagome qui sotto, in coordinate della foto. Sono volutamente
// un po' larghi: quello che fa il bordo preciso e' il ritaglio dell'immagine,
// non il poligono. Se il poligono e' un filo troppo stretto, il muscolo sparisce
// e sembra un bug.
//
// I PEZZI CHE SI ASSOMIGLIANO SONO UNITI, MA NON UGUALI
// Ste (13/10/2026): "i muscoli formati da più parti muscolari falli uniti,
// come nella foto". Nella foto il pettorale e' un pezzo solo. Però il pettorale
// non e' fatto tutto uguale: ha il capo clavicolare in alto e quello sternale in
// basso, e un dip non li tratta uguale. Quindi la sagoma viene TAGLIATA in fasce
// che si toccano e si ricompongono: da lontano e' un pettorale solo, come
// vuole Ste, e da vicino si vede che la parte bassa lavora di più.
//
// Le fasce non sono scritte a mano: sono tagliate dal codice lungo la sagoma
// originale, quindi non possono sporgere, non possono lasciare buchi e non
// possono sbagliare un pixel. Come il lato destro, che e' calcolato specchiando
// il sinistro invece di essere scritto due volte.
//
// UN TESTO PER L'ANATOMIA, e non uno qualsiasi:
//  - i tricipiti stanno DIETRO: davanti al braccio non si vedono, e metterli
//    davanti direbbe che un dip lavora coi bicipiti;
//  - i bicipiti davanti, gli addomi davanti, i glutei dietro, la schiena dietro.
// Il test Z3 lo controlla su tutti e 18 i pezzi.

// La foto: 809 x 825, con la figura di fronte a sinistra e quella di dietro a destra.
export const FOTO_L = 809;
export const FOTO_A = 825;

// La linea centrale di ogni figura: serve a specchiare il sinistro sul destro.
const CENTRI = { fronte: 162, retro: 577 };

// LE QUATTRO INTENSITA'.
//
// La più debole (0.2) non è spenta: è il viola "appena accennato" che dice
// "qui si passa, ma il lavoro vero è un altro". Ste: "la parte che lavora di
// meno deve essere evidenziata più chiara".
export const LIVELLI = [0.2, 0.42, 0.66, 1];

// DA QUANTO PARLA UN MUSCOLO SECONARIO.
//
// Ste (15/10/2026): "i dips non fanno anche tricipiti?". Sì: i dip schiacciano
// il peso su braccia estese e i tricipiti stanno lì accanto al petto, lavoro
// pari. Quindi sulla figura si accendono anche i muscoli secondari.
//
// Ma solo se l'esercizio ne parla SERIAMENTE (dal 40% in su). Sotto quella soglia
// è rumore delle parole: "Dumbbell Bench Pull" e "Scott Bench Curl" avevano una
// quota di petto solo perché la parola "bench" sta anche nella lista del petto, e
// un curl seduto non è una panca. Quelle non le accendiamo.
//
// LA SOGLIA VALE PER LE PAROLE, NON PER L'ANATOMIA. Un muscolo che sta lì accanto
// perché l'esercizio è di quel tipo (vedi MOVIMENTI in muscoli-parti.js) non ha
// bisogno di arrivare al 40% per essere acceso: sono i tricipiti sui dip, o il
// femorale sulla leg press, e sono scritti una volta sola. Per quelli la soglia
// non serve e vengono accesi anche sotto, con la sfumatura giusta: il tricipite
// sul reverse fly si vede appena, il gluteo sulla panca vede forte.
export const SOGLIA_SECONDARIO = 0.4;

/** La sfumatura giusta per una quota di lavoro (da 0 a 1). */
export function livelloDiQuota(quota) {
  const q = Math.max(0, Math.min(1, Number(quota) || 0));
  if (q >= 0.75) return LIVELLI[3];
  if (q >= 0.45) return LIVELLI[2];
  if (q >= 0.2) return LIVELLI[1];
  return LIVELLI[0];
}

/**
 * Le SAGOME: la forma di ogni gruppo, scritta SOLO a sinistra.
 *
 * `zone` sono i pezzi di muscolo coperti, nell'ordine in cui si incontrano
 * andando dal primo taglio all'ultimo. `tagli` dice dove dividere la sagoma:
 * `asse: 'y'` la divide in fasce in alto e in basso (il petto: parte alta, centro,
 * basso), `asse: 'x'` la divide in due metà (il deltoide: metà laterale e metà
 * anteriore).
 *
 * I pezzi che sono un muscolo solo (`zone` con un nome) non hanno tagli.
 */
const SAGOME = {
  // ---- petto: tutto il pettorale, alto centro e basso insieme ----
  petto: {
    vista: 'fronte',
    nome: 'petto',
    zone: ['petto_alto', 'petto_centrale', 'petto_basso'],
    tagli: { asse: 'y', valori: [302, 332] },
    // il bordo superiore segue la curva della clavicola: se lo ritaglio a
    // dritto il petto sembra una macchia rettangolare invece di un muscolo.
    sagoma: [[108, 288], [124, 278], [140, 276], [160, 284], [169, 306],
      [161, 332], [150, 358], [112, 357], [103, 340], [104, 312]],
  },

  // ---- spalla davanti: il deltoide laterale e quello anteriore ----
  deltoide_fronte: {
    vista: 'fronte',
    nome: 'deltoide davanti',
    // Il deltoide laterale sta sul BORDO della spalla, l'anteriore guarda verso
    // il petto: si taglia in verticale, col laterale fuori e l'anteriore dentro.
    zone: ['spalle_laterali', 'spalle_frontali'],
    tagli: { asse: 'x', valori: [74] },
    // Il DELTOIDE FRONTE finisce a y~338, come dietro (16/10/2026): stava fino a
  // y=352 e si mangiava il bicipite. Vedi la nota sul deltoide posteriore.
  sagoma: [[50, 284], [94, 278], [100, 300], [98, 320], [92, 338], [58, 338], [42, 310]],
  },

  // ---- braccio davanti ----
  bicipite: {
    vista: 'fronte',
    nome: 'bicipite',
    zone: ['braccio_alto', 'braccio_basso'],
    // IL BICIPITE FINISCE AL GOMITO (16/10/2026). Su `muscoli.png`, il braccio di
  // fronte è un blocco unito da y=282 a y=388 e l'avambraccio è un pezzo staccato
  // da y=393 a 450. Quindi il gomito è a y~390. Prima finiva a y=404 e accendeva
  // 14 pixel di avambraccio insieme al bicipite: la stessa cosa che faceva il
  // tricipite dietro.
  tagli: { asse: 'y', valori: [360] },
    sagoma: [[58, 334], [92, 332], [96, 362], [92, 384], [62, 388], [50, 366]],
  },

  // IL BRACHIALE, IL MOTORE DEL HAMMER CURL (15/10/2026).
  //
  // Ste: "Cable Hammer Curl fa il brachiale". Con la presa neutra il bicipite
  // diventa un pronatore e perde forza di flessione, e il motore diventa questo
  // muscolo, che sta sotto al bicipite e copre l'osso.
  //
  // Sta sulla faccia DAVANTI e LATERALE dell'arto superiore, appena sopra il
  // gomito. Quindi prende la fascia bassa del bicipite (y 360-388) e la fascia alta
  // dell'avambraccio, che comincia a 390. Non e' un pezzo a parte sul disegno:
  // e' dentro gli altri due, e per questo la sua sagoma e' una fascia stretta e
  // bassa, non una forma nuova.
  brachiale: {
    vista: 'fronte',
    nome: 'brachiale',
    zone: ['brachiale'],
    sagoma: [[52, 364], [88, 362], [96, 378], [92, 392], [58, 392], [46, 378]],
  },

  // L'AVAMBRACCIO: il pezzo staccato sotto il gomito (y 390-450 su muscoli.png).
  // Prima cominciava a y=402, e quindi saltava la parte alta dell'avambraccio.
  avambraccio: {
    vista: 'fronte',
    nome: 'avambraccio',
    zone: ['avambraccio'],
    sagoma: [[46, 392], [78, 390], [78, 420], [70, 444], [40, 444], [36, 416]],
  },

  // un pezzo solo, al centro: non si specchia
  addome: {
    vista: 'fronte',
    nome: 'addome',
    zone: ['addome'],
    centro: true,
    sagoma: [[112, 358], [214, 358], [214, 472], [112, 472]],
  },

  quadricipite: {
    vista: 'fronte',
    nome: 'quadricipite',
    zone: ['quadricipite'],
    sagoma: [[100, 472], [154, 472], [156, 554], [146, 600], [114, 598], [96, 540]],
  },

  // ---- schiena, tutto dietro ----
  trapezio: {
    vista: 'retro',
    nome: 'trapezio',
    zone: ['dorso_alto'],
    centro: true,
    sagoma: [[526, 244], [628, 244], [626, 302], [528, 302]],
  },

  dorsale: {
    vista: 'retro',
    nome: 'dorsali larghi',
    zone: ['dorso_lati'],
    // I DORSALI NON PASSANO SOPRA IL BRACCIO (16/10/2026).
  //
  // Ste, 15/10: "nei pull ups ci sono segnati anche tricipiti". Tornato il 16/10,
  // e aveva ragione: la sagoma dei dorsali partiva da x=468, cioè 40 pixel dentro
  // il braccio, e ci finiva dentro anche tutto il tricipite (93% del tricipite era
  // dentro i dorsali). Perciò una trazione accendeva il braccio insieme alla
  // schiena, e sembrava che lavorassero anche i tricipiti.
  //
  // IL CONFINE E' NEL DISEGNO, e si vede: su `muscoli.png`, tra il braccio e la
  // schiena c'e' una V scura, con la punta a y~335 e che si allarga scendendo
  // (y=350 la V e' fra x=505 e x=525, y=400 fra x=495 e x=515). Il bordo esterno
  // dei dorsali segue quella V, non la linea del braccio.
  sagoma: [[550, 306], [550, 432], [534, 436], [528, 400], [522, 350], [542, 318]],
  },

  romboidi: {
    vista: 'retro',
    nome: 'dorso centrale',
    zone: ['dorso_centrale'],
    centro: true,
    sagoma: [[552, 300], [602, 300], [602, 424], [552, 424]],
  },

  deltoide_posteriore: {
    vista: 'retro',
    nome: 'deltoide dietro',
    zone: ['spalle_posteriori'],
    // IL DELTOIDE FINISCE A y~338 (16/10/2026).
  //
  // Sul disegno originale il deltoide e il tricipite sono un pezzo unico (vedi la
  // nota del tricipite): il confine è la tacca a y~335. Prima finiva a y=370 e si
  // mangiava il tricipite, così una spinta in alto accendeva anche il braccio.
  sagoma: [[455, 274], [518, 272], [524, 300], [516, 330], [508, 338], [468, 338], [449, 318]],
  },

  tricipite: {
    vista: 'retro',
    nome: 'tricipite',
    // IL TRICIPITE E' DUE CAPI (15/10/2026).
    //
    // Ste: "Overhead Tricep Ext. capo lungo del tricipite", "Single Arm Pushdown il
    // tricipite la parte laterale". Sono due muscoli diversi e l'app li accendeva
    // come se fossero uno.
    //
    // Sulla figura il capo lungo e' la fascia ALTA, quella che arriva dalla spalla,
    // e il capo laterale e' la pancia, in basso verso il gomito.
    //
    // Il capo lungo e' mediale (vicino al corpo) e arriva fino in basso, e il
    // laterale e' la parte esterna: su una figura piccola non si distinguono, quindi
    // la divisione è per altezza. È una semplificazione, detta qui perché il
    // codice non nasconda cosa sta facendo.
    //
// IL GOMITO E' A y=378, E IL TRICIPITE STA SOPRA (16/10/2026).
    //
    // Ste, tre volte sulla stessa cosa, e alla terza mi ha mandato la foto
    // anatomica: "ma non vedi che segna anche l'avambraccio? deve segnare il
    // tricipite". Aveva ragione sempre, e per due volte avevo risposto spostando
    // la sagoma un po' più in su. Non era la strada giusta.
    //
    // LA MISURA VIENE DA `muscoli.png`, IL DISEGNO ORIGINALE (e non da me, e non
    // da quello che avevo scritto prima). Sul braccio di dietro ci sono due pezzi
    // separati da un vuoto:
    //
    //   deltoide + tricipite   y 280-375   (un pezzo solo nel disegno)
    //   VUOTO = IL GOMITO      y 378-384
    //   avambraccio            y 385-450
    //
    // E dentro il pezzo grande c'è la tacca a y~335, che e' il confine fra
    // deltoide e tricipite. Quindi: deltoide sopra la tacca, tricipite sotto la
    // tacca e sopra il gomito.
    //
    // I numeri sbagliati, in fila: y=457 (v177), poi y=440 (v178), poi y=401
    // (v181, "adesso e' sul gomito"). Ora e' y 335-376: dentro il pezzo giusto.
    zone: ['spalla_gomito_alto', 'spalla_gomito_basso'],
    tagli: { asse: 'y', valori: [358] },
    sagoma: [[470, 339], [509, 338], [506, 358], [504, 376], [468, 376], [466, 358]],
  },

  // ---- gambe ----
  glutei: {
    vista: 'retro',
    nome: 'glutei',
    zone: ['glutei'],
    sagoma: [[508, 436], [576, 436], [578, 500], [508, 500]],
  },

  femorale: {
    vista: 'retro',
    nome: 'femorale',
    zone: ['femorale'],
    sagoma: [[504, 502], [568, 502], [568, 594], [558, 626], [520, 624], [502, 558]],
  },

  polpaccio: {
    vista: 'retro',
    nome: 'polpaccio',
    zone: ['polpaccio'],
    sagoma: [[515, 632], [566, 630], [565, 660], [560, 686], [520, 688], [514, 660]],
  },
};

/** Il punto di indices (x o y) secondo l'asse del taglio. */
const coord = (punto, asse) => (asse === 'x' ? punto[0] : punto[1]);

/** Costruisce un punto sul bordo, tra due vertici e la linea di taglio. */
function sulTaglio(a, b, asse, limite) {
  const t = (limite - coord(a, asse)) / (coord(b, asse) - coord(a, asse));
  // Si arrotonda a due decimali. Non è solo per la riga: riflettere due volte
  // un numero con troppe cifre in virgola mobile non torna esattamente (324 -
  // (324 - x)) e il pezzo destro smetteva di essere il simmetrico del sinistro,
  // di un centesimo di pixel. Con due decimali torna, e l'SVG è più leggibile.
  return [
    Math.round((a[0] + t * (b[0] - a[0])) * 100) / 100,
    Math.round((a[1] + t * (b[1] - a[1])) * 100) / 100,
  ];
}

/**
 * Ritaglia un poligono con una linea, e tiene solo il pezzo da una parte
 * (sopra o sotto la linea, a sinistra o a destra).
 *
 * È il taglio di Sutherland-Hodgman: si gira attorno al poligono e si tengono i
 * vertici della parte voluta, aggiungendo i punti in cui il bordo attraversa la
 * linea. Serve perché i pezzi ritagliati a mano finiscono sempre per buchi o
 * sbordelli: qui invece la fascia esce esattamente dalla sagoma.
 */
function taglia(poligono, asse, limite, tieniSopra) {
  const dentro = (p) => (tieniSopra
    ? coord(p, asse) <= limite
    : coord(p, asse) >= limite);
  const fuori = [];
  for (let i = 0; i < poligono.length; i += 1) {
    const a = poligono[i];
    const b = poligono[(i + 1) % poligono.length];
    const aDentro = dentro(a);
    const bDentro = dentro(b);
    if (aDentro) fuori.push(a);
    if (aDentro !== bDentro) {
      const p = sulTaglio(a, b, asse, limite);
      if (asse === 'x') p[0] = limite;
      else p[1] = limite;
      fuori.push(p);
    }
  }
  return fuori;
}

/** Un punto, con due decimali: vedi la nota in `sulTaglio`. */
const arrotonda = (v) => Math.round(v * 100) / 100;

/** Il compagno simmetrico, calcolato: a mano era già finito di 6 pixel fuori. */
function specchia(poligono, vista) {
  const centro = CENTRI[vista];
  return poligono.map(([x, y]) => [arrotonda(2 * centro - x), y]);
}

/**
 * Da SAGOME a RITAGLI: ogni fascia viene tagliata dal codice e specchiata, così
 * le fasce si toccano esattamente come si toccava la sagoma intera.
 */
function costruisci() {
  const fuori = {};
  for (const [nome, def] of Object.entries(SAGOME)) {
    // I confini delle fasce. Il primo e l'ultimo non esistono (la sagoma parte e
    // finisce): non si taglia da quelle parti, altrimenti la fascia più in alto
    // verrebbe ritagliata con "-Infinity" e uscirebbe vuota.
    const confini = def.tagli
      ? [null, ...def.tagli.valori, null]
      : [null, null];
    const bande = {};
    const pezzi = [];
    def.zone.forEach((zona, k) => {
      // I due bordi della fascia si ritagliano SEMPRE sul poligono di partenza,
      // uno dopo l'altro: se si taglia prima con il bordo alto e poi con quello
      // basso, la fascia di mezzo esce vuota (non può più contenere niente).
      let fascia = def.sagoma;
      if (def.tagli) {
        if (confini[k] !== null) {
          fascia = taglia(fascia, def.tagli.asse, confini[k], false);
        }
        if (confini[k + 1] !== null) {
          fascia = taglia(fascia, def.tagli.asse, confini[k + 1], true);
        }
      }
      const lista = [fascia];
      if (!def.centro) lista.push(specchia(fascia, def.vista));
      bande[zona] = lista;
      pezzi.push(...lista);
    });
    fuori[nome] = {
      vista: def.vista,
      nome: def.nome,
      zone: def.zone,
      bande,
      pezzi,
      centro: Boolean(def.centro),
      sagoma: def.sagoma,
    };
  }
  return fuori;
}

/** Il ritaglio di ogni gruppo, in coordinate della foto, già diviso in fasce. */
export const RITAGLI = costruisci();

// I PEZZI CHE L'APP CONOSCE, e il gruppo in cui sono disegnati.
//
// Qui dentro non c'è più nessuna forma, solo il nome e il gruppo: i pezzi che
// sono lo stesso muscolo stanno nello stesso gruppo, come nella foto.
export const GRUPPI = {
  petto_alto: { nome: 'parte alta del petto', gruppo: 'petto' },
  petto_centrale: { nome: 'petto nel mezzo', gruppo: 'petto' },
  petto_basso: { nome: 'parte bassa del petto', gruppo: 'petto' },
  dorso_alto: { nome: 'parte alta del dorso (trapezio)', gruppo: 'trapezio' },
  dorso_centrale: { nome: 'dorso centrale', gruppo: 'romboidi' },
  dorso_lati: { nome: 'dorso ai lati (lati del triangolare)', gruppo: 'dorsale' },
  spalle_frontali: { nome: 'spalle davanti (deltoide anteriore)', gruppo: 'deltoide_fronte' },
  spalle_posteriori: { nome: 'spalle posteriori (deltoide posteriore)', gruppo: 'deltoide_posteriore' },
  // Il deltoide LATERALE non ha un pezzo tutto suo nella foto: sta sul bordo
  // della spalla. Quindi si accende con il deltoide davanti, che è quello che
  // si vede quando fai un alzata laterale. (Prima l'avevo collegato ai dorsali:
  // un'alzata laterale non lavora la schiena.)
  spalle_laterali: { nome: 'spalle laterali (deltoide laterale)', gruppo: 'deltoide_fronte' },
  braccio_alto: { nome: 'bicipite: braccio in alto', gruppo: 'bicipite' },
  braccio_basso: { nome: 'bicipite: braccio in basso', gruppo: 'bicipite' },
  // Il brachiale sta sulla faccia davanti e laterale dell'arto superiore, appena
  // sopra il gomito. Sulla figura di fronte si vede, quindi ha una fascia sua.
  brachiale: { nome: 'brachiale (sotto il bicipite)', gruppo: 'brachiale' },
  avambraccio: { nome: 'avambraccio (polso e avanti braccio)', gruppo: 'avambraccio' },
  // Il tricipite e' due pezzi: il capo lungo arriva dalla spalla e sta in alto, il
// capo laterale e' la pancia verso il gomito. Vedi la nota sulla sagoma.
spalla_gomito_alto: { nome: 'tricipite: capo lungo', gruppo: 'tricipite' },
  spalla_gomito_basso: { nome: 'tricipite: capo laterale', gruppo: 'tricipite' },
  quadricipite: { nome: 'quadricipite (davanti)', gruppo: 'quadricipite' },
  femorale: { nome: 'femorale (dietro)', gruppo: 'femorale' },
  polpaccio: { nome: 'polpaccio (gemelli e soleo)', gruppo: 'polpaccio' },
  glutei: { nome: 'glutei', gruppo: 'glutei' },
  addome: { nome: 'addome', gruppo: 'addome' },
};

const CHIAVI = Object.keys(RITAGLI);

/** Il gruppo che disegna un certo pezzo di muscolo. */
export function gruppoDiParte(parteId) {
  return parteId in GRUPPI ? GRUPPI[parteId].gruppo : null;
}

export function idZonaDaParte(parteId) {
  return parteId in GRUPPI ? parteId : null;
}

/** In che vista si vede un gruppo. */
export function vistaDiGruppo(gruppo) {
  return RITAGLI[gruppo] ? RITAGLI[gruppo].vista : null;
}

const punti = (pezzo) => pezzo.map(([x, y]) => `${x},${y}`).join(' ');

// L'id del ritaglio deve essere UNICO per ogni fascia.
// Nell'app c'è una figura sola per pagina, quindi sembrava funzionare: ma se
// sulla stessa pagina ce n'è due, `url(#taglio-muscolo)` va a cercare l'id nel
// documento e trova sempre la PRIMA, quindi tutte le figure mostravano il
// muscolo della prima. Con il numero diventa univoco e ognuna mostra il suo.
let numeroFigura = 0;

/**
 * Tutte le fasce da accendere, dalla più chiara alla più piena.
 *
 * Il gruppo principale sempre. E poi i muscoli secondari: quelli di cui
 * l'esercizio parla abbastanza (vedi SOGLIA_SECONDARIO), perché un dip non
 * lavora solo il petto, e quelli che l'anatomia mette lì accanto perché
 * l'esercizio è di quel movimento (vedi `anatomia`).
 */
export function righeDaAccendere(acceso = null, livelli = null, anatomia = null) {
  const gruppo = acceso ? gruppoDiParte(acceso) : null;
  if (!gruppo || !RITAGLI[gruppo]) return [];

  // Un muscolo che l'anatomia mette accanto al principale è già la risposta a
  // "i dips non fanno anche i tricipiti?": non ha bisogno di superare la soglia,
  // che serve solo a tenere fuori il rumore delle parole.
  const certificato = (zona) => Boolean(anatomia && anatomia[zona] !== undefined);
  const haQuota = (zona) => Boolean(livelli && zona in livelli);

  const righe = [];
  // `soloQuelloCheLavora` serve per i SECONDARI, e la distinzione è importante.
  //
  // IL GRUPPO PRINCIPALE si disegna tutto: il pettorale è un pezzo solo e le sue
  // fasce si accendono tutte, anche quelle che lavorano meno. È la regola che
  // Ste ha scritto ("il dip qua segna tutto il petto che è giusto ma allena
  // principalmente la parte bassa") e il test Z8b la controlla.
  //
  // I SECONDARI invece si disegnano SOLO dove lavorano davvero, e qui il 15/10/2026
  // c'era un buco: il gruppo del deltoide ha due fasce (laterale e anteriore), e
  // quando il secondario era solo la fascia anteriore, quella laterale veniva
  // comunque disegnata sul viola più chiaro. Sul cable fly si vedeva quindi il
  // deltoide LATERALE acceso, che quel movimento non tocca: esattamente
  // l'app che "evidenzia muscoli che non c'entrano".
  //
  // E non è una sciocchezza visiva: il deltoide laterale è l'esercizio più
  // pesante delle spalle, e accenderlo su una panca o su un fly racconta che
  // l'esercizio è più difficile di quanto sia.
  const metti = (g, forzato, soloQuelloCheLavora) => {
    for (const zona of RITAGLI[g].zone) {
      let quota = 0;
      if (zona === forzato && g === gruppo) quota = 1;
      else if (haQuota(zona)) quota = livelli[zona];
      // una fascia di un secondario che non ha nessuna quota non si accende
      if (soloQuelloCheLavora && quota === 0) continue;
      righe.push({
        gruppo: g,
        zona,
        pezzi: RITAGLI[g].bande[zona],
        opacita: livelloDiQuota(quota),
      });
    }
  };
  metti(gruppo, acceso, false);

  // I secondari: raggruppati per muscolo, e per ognuno il pezzo migliore è
  // quello che l'esercizio nomina di più.
  const altri = new Set();
  for (const zona of Object.keys(livelli || {})) {
    const g = gruppoDiParte(zona);
    if (!g || g === gruppo) continue;
    if (livelli[zona] >= SOGLIA_SECONDARIO || certificato(zona)) altri.add(g);
  }
for (const g of altri) {
    const nominate = RITAGLI[g].zone.filter((z) => (livelli || {})[z] > 0)
      .sort((a, b) => livelli[b] - livelli[a]);
    // i secondari si accendono solo dove lavorano: vedi la nota su `metti`
    metti(g, nominate[0], true);
  }

  // dalla più chiara alla più piena: quella che lavora di più viene per ultima
  return righe.sort((a, b) => a.opacita - b.opacita);
}

/**
 * La figura, come stringa SVG pronta da mettere nella pagina.
 *
 * Sono immagini: il corpo con i muscoli spenti, e sopra i muscoli in viola
 * ritagliati sui pezzi giusti, ciascuno con la sua sfumatura. Se il pezzo non
 * esiste non si mette il ritaglio: è meglio un omino tutto spento che uno con
 * il muscolo sbagliato acceso.
 *
 * `livelli` è la classifica di quanto lavora ogni pezzo (vedi muscoli-parti.js):
 * senza, il pezzo acceso va pieno e gli altri restano sul viola più chiaro.
 *
 * `anatomia` dice quali pezzi sono lì perché l'esercizio è di quel movimento e
 * non perché una parola nel nome lo diceva: sono secondari già verificati, quindi
 * si accendono anche sotto la soglia (vedi SOGLIA_SECONDARIO).
 */
export function figurino(acceso = null, livelli = null, anatomia = null) {
  const dentro = [];
  dentro.push(`<image href="./img/muscoli/corpo.png" x="0" y="0" width="${FOTO_L}" height="${FOTO_A}"/>`);

  for (const riga of righeDaAccendere(acceso, livelli, anatomia)) {
    numeroFigura += 1;
    const idTaglio = 'taglio-muscolo-' + numeroFigura;
    // `clipPathUnits` è un ATTRIBUTO di clipPath, non un elemento. Scritto come
    // elemento (`<clipPathUnits="userSpaceOnUse">`) il browser considera il
    // ritaglio non valido, il clipPath resta vuoto e il muscolo non si accende:
    // la figura sembra scarica, senza dirlo. Il default è già userSpaceOnUse,
    // ma lo scriviamo uguale per non doverci pensare.
    dentro.push(`<clipPath id="${idTaglio}" clipPathUnits="userSpaceOnUse">`);
    for (const pezzo of riga.pezzi) {
      dentro.push(`<polygon points="${punti(pezzo)}"/>`);
    }
    dentro.push('</clipPath>');
    dentro.push(`<image href="./img/muscoli/muscoli.png" x="0" y="0" width="${FOTO_L}"`
      + ` height="${FOTO_A}" clip-path="url(#${idTaglio})"`
      + ` opacity="${riga.opacita}"/>`);
  }
  return dentro.join('');
}

/**
 * Le due etichette, "FRONTE" e "DIETRO".
 *
 * Ste: "si deve capire anche fronte e retro e qua non si capisce". Con la foto
 * la differenza si vede dalla faccia e dai capelli, ma le parole lo dicono
 * subito e costano niente.
 */
export const ETICHETTE = [
  { testo: 'FRONTE', x: CENTRI.fronte, y: 806 },
  { testo: 'DIETRO', x: CENTRI.retro, y: 806 },
];

export { CHIAVI as GRUPPI_DISEGNATI };