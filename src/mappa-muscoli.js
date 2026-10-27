// mappa-muscoli.js — calcola i muscoli coinvolti e li disegna sull'atlante anatomico.
// La logica di classificazione resta in `righeDaAccendere`; la figura colora
// direttamente i tracciati SVG dei muscoli corrispondenti, senza ritagli o overlay.

import { ATLANTE_FRONTE, ATLANTE_RETRO } from './anatomia-vettoriale.js';
import { regioneFascia, lineeFasce, ZONE_PETTO } from './fasce-petto.js';
import { riquadroPath } from './path-misura.js';

export const FOTO_L = 809;
export const FOTO_A = 825;

// La linea centrale di ogni figura: serve a specchiare il sinistro sul destro.
const CENTRI = { fronte: 185, retro: 605 };

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

// Quanto i muscoli accesi vengono staccati fra loro.
//
// IL BUCO E' DIVENTATO ZERO (16/10/2026). Era 1,5 pixel per lato, quindi 3 pixel di
// vuoto grigio fra due muscoli attaccati. Ste: "il brachioradiale è attaccato al
// bicipite no? devi farli bene le fasce muscolari". Aveva ragione: il brachioradiale
// non parte dal gomito, parte dall'omero SOPRA il gomito, quindi è continuo con il
// braccio. Con la fessura grigia l'app mostrava una macchiolina isolata sotto il
// bicipite, e due fasce attaccate sembravano due pezzi sconnessi.
//
// Le fasce ora si toccano. La separazione non la fa il vuoto ma la LINEA che
// `figurino()` disegna sul contorno di ogni fascia accesa: attaccate e distinte,
// che è come sono fatte le tavole anatomiche.
//
// Deve stare PRIMA di costruisci(): costruisci() gira subito all'avvio del modulo,
// e una const dichiarata dopo sarebbe ancora nel 'temporal dead zone' quando serve
// come parametro di default.
const STACCO = 0;

// Il contorno interno è una lavanda scura: separa i fasci muscolari attivi senza
// confondersi con il colore più acceso del muscolo principale.

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
    // I tre capi del pettorale seguono linee curve: clavicolare in alto,
    // sternocostale al centro e la parte bassa che sale verso il braccio. Le
    // fasce si toccano lungo gli stessi punti, così il muscolo resta unito ma
    // l'evidenziazione non sembra una pila di rettangoli.
    fasce: [
      [[84, 272], [88, 259], [103, 250], [124, 247], [145, 250], [162, 258],
        [162, 282], [146, 277], [128, 273], [110, 270], [96, 271], [87, 279]],
      [[87, 279], [96, 271], [110, 270], [128, 273], [146, 277], [162, 282],
        [162, 319], [145, 312], [127, 303], [109, 294], [95, 288], [85, 292]],
      [[85, 292], [95, 288], [109, 294], [127, 303], [145, 312], [162, 319],
        [162, 356], [143, 357], [123, 358], [105, 355], [91, 344], [85, 326], [82, 307]],
    ],
    sagoma: [[84, 272], [88, 259], [103, 250], [124, 247], [145, 250], [162, 258],
      [162, 356], [143, 357], [123, 358], [105, 355], [91, 344], [85, 326], [82, 307]],
  },

  // ---- spalla davanti: il deltoide laterale e quello anteriore ----
  deltoide_fronte: {
    vista: 'fronte',
    nome: 'deltoide davanti',
    // Il deltoide laterale sta sul BORDO della spalla, l'anteriore guarda verso
    // il petto: si taglia in verticale, col laterale fuori e l'anteriore dentro.
    zone: ['spalle_laterali', 'spalle_frontali'],
    tagli: { asse: 'x', valori: [106] },
    // Il DELTOIDE FRONTE finisce a y~338, come dietro (16/10/2026): stava fino a
  // y=352 e si mangiava il bicipite. Vedi la nota sul deltoide posteriore.
  sagoma: [[76, 258], [80, 241], [92, 230], [107, 225], [122, 230], [138, 242],
    [145, 258], [143, 277], [132, 295], [116, 309], [99, 311], [85, 296], [78, 278]],
  },

  // ---- braccio davanti ----
  bicipite: {
    vista: 'fronte',
    nome: 'bicipite',
    zone: ['braccio_alto'],
    // IL BICIPITE FINISCE AL GOMITO (16/10/2026). Su `muscoli.png`, il braccio di
  // fronte è un blocco unito da y=282 a y=388 e l'avambraccio è un pezzo staccato
  // da y=393 a 450. Quindi il gomito è a y~390. Prima finiva a y=404 e accendeva
  // 14 pixel di avambraccio insieme al bicipite: la stessa cosa che faceva il
  // tricipite dietro.
  // IL BICIPITE FINISCE PRIMA, E IL BRACHIALE STA SOTTO (16/10/2026).
  //
  // Ste: "il bicipite/brachiale e altre cose non sono divise". Aveva ragione, e qui
  // c'era l'eccezione che avevo lasciato apposta: il bicipite e il brachiale si
  // sovrapponevano all'81%, e sull'unico esercizio che li accende insieme (il
  // Cable Hammer Curl) si vedeva un blocco solo. E il brachiale è proprio il
  // motivo per cui quell'esercizio sta nell'app: Ste, 15/10, "Cable Hammer Curl fa
  // il brachiale". Se non si vede, l'informazione che vale di più non c'è.
  //
  // Anatomicamente il brachiale è il muscolo PROFONDO del bicipite: sta sotto, e
  // affiora nella parte BASSA del braccio, verso il gomito. Quindi il bicipite
  // finisce prima e il brachiale prende la fascia sotto.
  //
  // Sul disegno il braccio davanti va da y=282 a y=388 e l'avambraccio comincia a
  // y=393. Ma il deltoide davanti scende fino a y=338, quindi il bicipite non può
  // partire prima: altrimenti i due muscoli si sovrappongono e si vede la spalla
  // accendersi su un curl.
  //
  // Quindi: deltoide 278-338, bicipite 342-368, brachiale 370-392. Tre fasce senza
  // sovrapporsi, e tutte e tre dentro il braccio disegnato.
  // IL BICIPITE E' UNA FASCIA PIENA, NON UN ESAGONO (16/10/2026).
  //
  // Prima la sagoma finiva con un vertice in basso (62,368) e due lati che tornavano
  // su: alla riga y=366 copriva solo x 64-75, mentre il braccio disegnato arriva a
  // x 49-88. Quindi un quarto del bicipite restava spento e non lo accendeva
  // NESSUN muscolo: Ste, "evidenziare tutta la fascia muscolare allenata".
  //
  // Ora segue il bordo del braccio per tutta la larghezza, da y=338 a y=368. È
  // volutamente un filo più larga del necessario: il braccio disegnato a destra
  // sta 4-5 pixel più in fuori che a sinistra (x 60-98 contro x 55-93 alla riga
  // y=342), e una sagoma stretta coprirebbe bene un lato e taglierebbe l'altro.
  // IL BICIPITE E' UNA FASCIA UNICA, NON DUE (16/10/2026).
  //
  // Ste,guardando la scheda del Pull Ups: "qua per esempio dovrebbe prendere tutto
  // il bicipite no? che non un coso dritto corto". Aveva ragione: il bicipite era
  // tagliato a y=352 in due zone, `braccio_alto` e `braccio_basso`, e sulle
  // trazioni il secondario era solo `braccio_basso`. Sull'app si vedeva quindi una
  // BARRETTA CORTA (la metà bassa) e metà bicipite restava grigia.
  //
  // IL MOTIVO DEL TAGLIO ERA SBAGLIATO. `braccio_alto` e `braccio_basso` non sono
  // due pezzi anatomici: sono le due POSIZIONI del curl (braccio corto e braccio
  // lungo, che il Rank valuta con leve diverse). Il bicipite, come forma, e' uno
  // solo: non si vede a pezzi sul disegno, quindi non si deve disegnare a pezzi.
  //
  // Quindi: via il taglio, il bicipite torna una zona sola, e i due nomi che il
  // Rank continua a usare accendono entrambi quella zona (vedi `ALIAS`).
  // E' A MANDORLA, NON UN RETTANGOLO (16/10/2026). Ste: "anche in altri esercizi
  // e' un rettangolo". Il bicipite nella realta' parte stretto sotto il deltoide,
  // si allarga a meta' braccio e si assottiglia verso il gomito, dove finisce in
  // tendine. Con la fascia dritta sembrava un rettangolo appoggiato sul braccio.
  //
  // La base resta LARGA fino a y=369 (16/10/2026): prima si assottigliava subito e
  // sotto al bicipite restava una fetta di braccio scoperta (19 pixel a y=368),
  // proprio dove il brachioradiale dovrebbe essere attaccato al bicipite.
  sagoma: [[79, 286], [92, 276], [106, 277], [117, 289], [122, 307], [120, 329],
    [113, 351], [104, 370], [92, 375], [82, 361], [76, 342], [73, 322], [74, 303]],
  },

  // IL BRACHIALE, IL MOTORE DEL HAMMER CURL (15/10/2026).
  //
  // Ste: "Cable Hammer Curl fa il brachiale". Con la presa neutra il bicipite
  // diventa un pronatore e perde forza di flessione, e il motore diventa questo
  // muscolo, che sta sotto al bicipite e copre l'osso.
  //
  // Sta sulla faccia DAVANTI e LATERALE dell'arto superiore, sotto al bicipite e
  // appena sopra il gomito. Non è un pezzo a parte sul disegno: è dentro gli altri
  // due, e per questo la sua sagoma è una fascia stretta e bassa, non una forma
  // nuova.
  //
  // Dal 16/10 sta PIÙ IN BASSO del bicipite, e non più dentro: vedi la nota sul
  // bicipite. Prima si sovrapponevano all'81% e i due non si vedevano.
  brachiale: {
    vista: 'fronte',
    nome: 'brachiale',
    // IL MARTELLO ACCENDE IL BRACHIORADIALE (Ste, 18/10/2026).
    //
    // "nell'hammer curl deve evidenziare di più quello che ora è evidenziato di meno, e
    // evidenziare di meno quello che è evidenziato di più ora". Aveva ragione, e due
    // motivi: il brachiale (il motore del martello) è PROFONDO e in questa tavola
    // superficiale non è disegnato; e il muscolo che si VEDE nel martello è il
    // brachioradiale, quello dell'avambraccio, che è il vero motore della flessione
    // accanto al brachiale.
    //
    // Quindi il gruppo del brachiale accende la ZONA del brachioradiale: il viola
    // pieno va sull'avambraccio, e il bicipite (la parte alta del braccio) resta
    // chiaro, perché in presa neutra è un pronatore e perde forza. Non è un trucco:
    // è la stessa regola dell'ALIAS, cioè due nomi che sulla figura sono un muscolo
    // solo.
    zone: ['brachioradiale'],
    sagoma: [[78, 355], [91, 349], [105, 350], [116, 358], [115, 375], [106, 391],
      [92, 395], [81, 384], [76, 369]],
  },

  // L'AVAMBRACCIO: il pezzo staccato sotto il gomito (y 390-450 su muscoli.png).
  // Prima cominciava a y=402, e quindi saltava la parte alta dell'avambraccio.
  // IL BRACHIORADIALE, IL MUSCOLO DEL MARTELLO (16/10/2026).
  //
  // Ste: "l'hammer curl non fa anche il brachioradiale?". Sì: in presa neutra il
  // brachiale e il brachioradiale sono i due motori della flessione del gomito, e il
  // bicipite è solo un terzo, perché diventa pronatore e perde forza.
  //
  // Prima qui c'era una nota che diceva il contrario ("il brachioradiale è un muscolo
  // diverso e non è quello disegnato qui"), e non era vero. Il pezzo c'era: sul
  // davanti dell'avambraccio, sotto il gomito e verso l'ESTERNO, c'è una striscia
  // staccata da una linea scura (x 38-57, y 392-418). È lì che sta il brachioradiale.
  //
  // Il disegno non scrive i nomi, quindi il riconoscimento è fatto dalla POSIZIZIONE:
  // subito sotto il gomito e sul lato esterno, che è dove sta in un braccio visto di
  // fronte. Se quel pezzo fosse un altro muscolo, la sagoma va spostata.
  //
  // NOTA: l'avambraccio comincia sotto, a y=420, così i due non si toccano. Vedi la
  // sagoma sotto.
  brachioradiale: {
    vista: 'fronte',
    nome: 'brachioradiale',
    zone: ['brachioradiale'],
    // IL BRACHIORADIALE PARTE DALL'OMERO, NON DAL GOMITO (16/10/2026).
    //
    // Ste: "il brachioradiale è attaccato al bicipite no? devi farli bene le fasce
    // muscolari". Anatomia: il brachioradiale nasce dalla cresta sopracondilare
    // LATERALE dell'omero, quindi un centimetro SOPRA il gomito, e scende lungo
    // l'avambraccio fino al polso. Non è una macchiolina isolata sotto al gomito: è
    // una striscia continua che parte dal basso del brachiale.
    //
    // Prima partiva da y=395 e restavano scoperti 7 pixel di braccio a y=392 e un
    // cuneo grigio fra brachiale e brachioradiale. Ora parte da y=392, dove finisce
    // il brachiale, e le due fasce si toccano: sono attaccate.
    // IL BRACHIORADIALE È LUNGO, NON UNA MACCHIA (16/10/2026).
    //
    // Ste ha mandato la foto anatomica del braccio con brachiale e brachioradiale, e
    // il conto non tornava: il brachioradiale era una macchia di 26 pixel (y 392-418)
    // mentre l'avambraccio è lungo 58 (y 392-450). Nella foto il brachioradiale
    // SCENDE LUNGO L'AVAMBRACCIO fino al polso, e anzi è il muscolo che copre il
    // radio nella parte laterale.
    //
    // Quindi ora è una striscia laterale che parte dal basso del brachiale (y=392,
    // perché il brachiale finisce lì) e arriva a y=432, assottigliandosi: verso il
    // polso il muscolo diventa tendine, quindi la striscia si stringe.
    //
    // Continua anche perché il brachioradiale nasce dall'OMERO, sopra il gomito, e non
    // è un muscolo separato: è attaccato al braccio.
    sagoma: [[43, 378], [57, 380], [68, 388], [73, 402], [70, 421], [63, 440],
      [52, 456], [41, 463], [30, 456], [28, 440], [32, 420], [37, 399]],
  },

  // L'AVAMBRACCIO è il pezzo sotto: i flessori del polso. Comincia a y=420 perché
  // sopra c'è il brachioradiale, e due muscoli diversi non si sovrappongono.
  //
  // LA FORMA È A "L" (16/10/2026). Prima copriva solo la parte bassa e stretta
  // (x 38-70, y 420-446) e lasciava fuori tutta la STRISCIA INTERNA dell'avambraccio
  // (x 58-75, y 390-418), che nella figura è disegnata e che nessun muscolo
  // accendeva mai: Ste, "evidenziare tutta la fascia muscolare allenata".
  avambraccio: {
    vista: 'fronte',
    nome: 'avambraccio',
    zone: ['avambraccio'],
    sagoma: [[72, 380], [84, 385], [90, 400], [87, 422], [79, 444], [68, 463],
      [57, 469], [51, 456], [57, 437], [63, 416], [65, 398]],
  },

  // un pezzo solo, al centro: non si specchia
  addome: {
    vista: 'fronte',
    nome: 'addome',
    zone: ['addome'],
    centro: true,
    sagoma: [[116, 359], [208, 359], [219, 389], [217, 426], [206, 451],
      [184, 463], [162, 469], [139, 463], [118, 451], [107, 426], [105, 389]],
  },

  quadricipite: {
    vista: 'fronte',
    nome: 'quadricipite',
    zone: ['quadricipite'],
    sagoma: [[111, 459], [139, 452], [162, 458], [162, 595], [151, 611],
      [128, 614], [109, 599], [102, 573], [100, 533], [103, 489]],
  },

  // ---- schiena, tutto dietro ----
  trapezio: {
    vista: 'retro',
    nome: 'trapezio',
    zone: ['dorso_alto'],
    centro: true,
    sagoma: [[555, 222], [599, 222], [620, 235], [634, 259], [620, 281],
      [607, 305], [594, 323], [577, 340], [560, 323], [547, 305], [534, 281], [520, 259], [534, 235]],
  },

  // I LOMBARI (la bassa schiena): l'erector spinae, i muscoli che stanno lungo
  // la colonna. Nella figura dell'atlante li ho presi dal kit del disegnatore
  // (la figura dedicata all’erector spinae), perché nelle due figure
  // frontale/posteriore non si vedono (stanno sotto i dorsali).
  dorso_basso: {
    vista: 'retro',
    nome: 'bassa schiena',
    zone: ['dorso_basso'],
    sagoma: [[277,336],[319,336],[319,456],[277,456]],
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
  // schiena c'è una V scura, con la punta a y~335 e che si allarga scendendo
  // (y=350 la V e' fra x=505 e x=525, y=400 fra x=495 e x=515). Il bordo esterno
  // dei dorsali segue quella V, non la linea del braccio.
  //
  // IL DORSALE E' IL MUSCOLO LARGO (16/10/2026). Ste: "la zona evidenziata deve
  // prendere tutta la fascia muscolare che allena, non sono una parte tipo un
  // quadrato/rettangolo". Prima il dorsale arrivava a x=550 e il romboide partiva
  // da x=552: cioè il dorsale aveva 13 pixel e il romboide 23, INVERTITO rispetto
  // all'anatomia (il romboide sta vicino alla spina ed è sottile, il dorsale è
  // largo). Alla riga y=400 la fascia disegnata va da x=535 a 575 e il dorsale ne
  // accendeva il 34%.
  //
  // Ora il dorsale arriva a x=555, che è il 70% della larghezza della schiena, e
  // il suo bordo interno segue la curva del corpo invece di essere una retta.
  sagoma: [[520, 302], [544, 296], [560, 307], [568, 333], [566, 363], [559, 394],
    [548, 421], [535, 432], [519, 423], [508, 402], [502, 377], [501, 348], [507, 322]],
  },

  romboidi: {
    vista: 'retro',
    nome: 'dorso centrale',
    zone: ['dorso_centrale'],
    centro: true,
    // IL ROMBOIDE NON E' UN RETTANGOLO (16/10/2026). Ste: "non sono una parte tipo
    // un quadrato/rettangolo". Era [[552,300],[602,300],[602,424],[552,424]]: un
    // rettangolo largo 50 pixel che si mangiava i due terzi della schiena e lasciava
    // al dorsale (che e' il muscolo largo) una striscia di 13 pixel.
    //
    // Ora e' una fascia sottile lungo la spina, che segue la spina: stretta in
    // alto e in basso, più larga a meta' schiena. Dodici pixel per lato invece di
    // venticinque, così il dorsale torna a essere il muscolo largo che e' nella
    // realtà.
    sagoma: [[560, 274], [577, 266], [594, 274], [598, 292], [592, 315],
      [577, 337], [562, 315], [556, 292]],
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
  sagoma: [[487, 260], [490, 243], [503, 231], [521, 230], [539, 242], [548, 259],
    [545, 278], [532, 294], [516, 306], [500, 299], [489, 283]],
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
    // I DUE CAPI SONO AFFIANCATI, NON UNO SOPRA L'ALTRO (16/10/2026).
    //
    // Ste: "nel tricep pushdown lavora il capo laterale, quindi evidenzia la parte
    // laterale del tricipite, invece nel cable overhead lavora il capo lungo".
    //
    // I numeri erano già giusti: sul pushdown c'era solo `spalla_gomito_basso`, che è
    // il capo laterale, e sul cable overhead solo `spalla_gomito_alto`, che e' il capo
    // lungo. Ma il TAGLIO era in orizzontale, cioe' "la fascia di sopra" e "quella di
    // sotto": l'etichetta prometteva un capo e il disegno mostrava una metà del braccio.
    //
    // Anatomicamente sono due pezzi AFFIANCATI guardando il braccio da dietro:
    //   - il capo LUNGO e' quello verso la spina (verso x=577), e scende per tutta la
    //     lunghezza del braccio
    //   - il capo LATERALE e' la gobba verso l'ESTERNO (verso x minore)
    //
    // Quindi il taglio deve essere in VERTICALE, non in orizzontale.
    //
    // Attenzione all'ordine delle zone: `costruisci()` dà alla prima zona la parte
    // MINORE del limite e alla seconda la parte MAGGIORE. Quindi per avere
    // laterale = esterno (x piccolo) e lungo = interno (x grande), le zone vanno
    // nell'ordine giusto.
    zone: ['spalla_gomito_basso', 'spalla_gomito_alto'],
    tagli: { asse: 'x', valori: [504] },
    sagoma: [[487, 291], [500, 282], [514, 285], [526, 299], [530, 318], [526, 341],
      [518, 363], [507, 379], [494, 377], [486, 363], [481, 344], [481, 323]],
  },

  // ---- gambe ----
  glutei: {
    vista: 'retro',
    nome: 'glutei',
    zone: ['glutei'],
    sagoma: [[508, 448], [526, 439], [546, 445], [562, 458], [574, 478],
      [573, 500], [563, 517], [542, 520], [524, 512], [511, 493], [505, 470]],
  },

  femorale: {
    vista: 'retro',
    nome: 'femorale',
    zone: ['femorale'],
    sagoma: [[510, 510], [526, 503], [545, 505], [559, 518], [568, 540], [569, 566],
      [561, 599], [550, 628], [532, 636], [516, 623], [506, 600], [503, 569], [505, 539]],
  },

  polpaccio: {
    vista: 'retro',
    nome: 'polpaccio',
    zone: ['polpaccio'],
    sagoma: [[521, 614], [536, 602], [551, 609], [562, 627], [565, 652], [561, 681],
      [553, 715], [544, 744], [530, 755], [518, 746], [513, 724], [513, 694], [515, 660]],
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
      let fascia = def.fasce ? def.fasce[k] : def.sagoma;
      if (def.tagli && !def.fasce) {
        if (confini[k] !== null) {
          fascia = taglia(fascia, def.tagli.asse, confini[k], false);
        }
        if (confini[k + 1] !== null) {
          fascia = taglia(fascia, def.tagli.asse, confini[k + 1], true);
        }
      }
// Lo STACCO si applica DOPO i tagli: prima si taglia la fascia, poi si stringe
      // il pezzo risultante. Stringere prima e poi tagliare darebbe un bordo
      // obliquo al posto del taglio, e la fessura fra due fasce non sarebbe più
      // dritta.
      //
      // I lati che stanno SU un taglio interno non si stringono (vedi `stringi`):
      // altrimenti le fasce dello stesso muscolo restano separate e il petto, che
      // è in tre fasce, si vede come tre rettangoli impilati invece che come un
      // pettorale unico. La fessura resta fra muscoli DIVERSI, che è il suo lavoro.
      const interni = [];
      if (def.tagli && !def.fasce) {
        for (const valore of def.tagli.valori) interni.push({ asse: def.tagli.asse, valore });
      }
      fascia = stringi(fascia, STACCO, interni);
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
  dorso_basso: { nome: 'bassa schiena (lombari)', gruppo: 'dorso_basso' },
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
  // Il brachioradiale sta sul davanti dell'avambraccio, subito sotto il gomito e
  // verso l'esterno. È il secondo motore della flessione del gomito insieme al
  // brachiale, ed è per questo che conta sul curl a martello (vedi la sagoma).
  brachioradiale: { nome: 'brachioradiale (sotto il gomito)', gruppo: 'brachioradiale' },
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
  const nome = parteId in ALIAS ? ALIAS[parteId] : parteId;
  return nome in GRUPPI ? nome : null;
}

/**
 * I DUE NOMI CHE SONO UN SOLO MUSCOLO SULLA FIGURA (16/10/2026).
 *
 * `braccio_alto` e `braccio_basso` sono le due posizioni del curl, non due pezzi
 * di bicipite: il Rank le tratta diverse (le leve), ma sulla figura il bicipite è
 * una fascia sola. Senza questo, sulle trazioni il secondario `braccio_basso`
 * accendeva mezza fascia e si vedeva una barretta dritta e corta.
 *
 * Nota: NON vale per i due capi del tricipite (`spalla_gomito_alto` e
 * `spalla_gomito_basso`), che sono due muscoli davvero diversi, né per le due
 * fasce del deltoide.
 */
const ALIAS = { braccio_basso: 'braccio_alto', brachiale: 'brachioradiale' };

/**
 * Porta le chiavi di `livelli` sulle zone che esistono davvero, e tiene la quota
 * più alta quando due nomi finiscono sulla stessa zona.
 *
 * Restituisce SEMPRE un oggetto, anche quando non c'è niente da normalizzare:
 * `righeDaAccendere` lo interroga con `Object.keys`, e `Object.keys(null`-explode.
 */
function normalizzaZone(livelli) {
  const fuori = {};
  for (const [zona, q] of Object.entries(livelli || {})) {
    const nome = zona in ALIAS ? ALIAS[zona] : zona;
    if (nome in GRUPPI) fuori[nome] = Math.max(fuori[nome] || 0, q);
  }
  return fuori;
}

/** In che vista si vede un gruppo. */
export function vistaDiGruppo(gruppo) {
  return RITAGLI[gruppo] ? RITAGLI[gruppo].vista : null;
}

// I MUSCOLI ACCESI VENGONO STACCATI (16/10/2026).
//
// Ste: "non puoi fare che sono staccati?". Aveva ragione: nella nostra figura i
// muscoli non sono staccati (vedi la nota sui 13 pezzi), quindi due muscoli accesi
// vicini sembrano un blocco unico e non si capisce dove finisce l'uno.
//
// Il primo tentativo è stato un filo grigio lungo il bordo di ogni muscolo, ma
// le sagome sono VOLUTAMENTE larghe e una parte esce dal corpo: il filo tracciava
// anche quella parte e si vedevano contorni che galleggiavano sullo sfondo. Brutto.
//
// Quindi si fa il contrario: si stringe ogni sagoma verso l'interno di un pixel e
// mezzo, e fra due muscoli accesi resta una fessura di grigio del corpo, larga
// tre pixel. Non si disegna niente, ed è la linea del corpo che si vede in mezzo:
// sembra che i muscoli siano davvero separati.
//
// Ogni lato si sposta verso l'interno e poi si fa l'intersezione fra lati
// consecutivi: se due lati sono paralleli, il risultato è semplicemente il punto
// spostato. Le sagome hanno pochi vertici e sono semplici (quasi tutte convesse),
// quindi l'intersezione è stabile.

/**
 * Sposta ogni lato di `passo` verso l'interno e ricostruisce i vertici.
 *
 * `tagli` (facoltativo) sono le linee di taglio INTERNE del muscolo: i lati che
 * stanno su quelle linee NON si stringono.
 *
 * IL PERCHE' (16/10/2026). Ste: "la zona evidenziata deve prendere tutta la fascia
 * muscolare che allena, non sono una parte tipo un quadrato/rettangolo". Stringendo
 * anche i lati di taglio, due fasce dello STESSO muscolo restavano separate da una
 * fessura di 3 pixel (1,5 per lato) e il petto, che è diviso in tre fasce
 * (alta, centrale, bassa), si vedeva come tre rettangoli impilati invece che come
 * un pettorale.
 *
 * La fessura serve a separare muscoli DIVERSI, e per quello resta: qui si continua
 * a stringere tutto il resto del contorno, cioè il bordo vero del muscolo.
 */
export function stringi(poligono, passo = STACCO, tagli = null) {
  const n = poligono.length;
  if (n < 3) return poligono;

  // orientamento: il segno dell'area dice da che parte e' l'interno
  let area = 0;
  for (let i = 0; i < n; i += 1) {
    const [ax, ay] = poligono[i];
    const [bx, by] = poligono[(i + 1) % n];
    area += ax * by - bx * ay;
  }
  const verso = area > 0 ? 1 : -1;

  // un lato è "su un taglio" se tutti e due i suoi vertici stanno sulla linea
  const suTaglio = (ax, ay, bx, by) => Boolean(tagli && tagli.some((t) => (
    t.asse === 'y' ? Math.abs(ay - t.valore) < 0.51 && Math.abs(by - t.valore) < 0.51
      : Math.abs(ax - t.valore) < 0.51 && Math.abs(bx - t.valore) < 0.51)));

  // il lato i (dal vertice i al vertice i+1) spostato di `passo` verso l'interno
  const lati = [];
  for (let i = 0; i < n; i += 1) {
    const [ax, ay] = poligono[i];
    const [bx, by] = poligono[(i + 1) % n];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const sposta = suTaglio(ax, ay, bx, by) ? 0 : passo;
    const nx = -(dy / len) * verso;
    const ny = (dx / len) * verso;
    lati.push({ px: ax + nx * sposta, py: ay + ny * sposta, dx, dy });
  }

  // incrocio fra il lato precedente e questo: lì sta il vertice spostato
  const fuori = [];
  for (let i = 0; i < n; i++) {
    const a = lati[(i - 1 + n) % n];
    const b = lati[i];
    const det = a.dx * -b.dy - a.dy * -b.dx;
    let x = b.px;
    let y = b.py;
    if (Math.abs(det) > 1e-9) {
      const t = ((b.px - a.px) * -b.dy - (b.py - a.py) * -b.dx) / det;
      x = a.px + t * a.dx;
      y = a.py + t * a.dy;
    }
    fuori.push([Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
  }
  return fuori;
}

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

  // le due posizioni del curl diventano la fascia unica del bicipite: vedi `ALIAS`
  const quote = normalizzaZone(livelli);
  const anche = anatomia ? normalizzaZone(anatomia) : anatomia;

  // Un muscolo che l'anatomia mette accanto al principale è già la risposta a
  // "i dips non fanno anche i tricipiti?": non ha bisogno di superare la soglia,
  // che serve solo a tenere fuori il rumore delle parole.
  const certificato = (zona) => Boolean(anche && anche[zona] !== undefined);
  const haQuota = (zona) => Boolean(quote && zona in quote);

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
      else if (g === gruppo) {
        // IL GRUPPO PRINCIPALE SI ACCENDE TUTTO, MA SI VEDE CHI LAVORA (18/10/2026).
        //
        // Ste: "non si vedono bene e non si capisce quale sta lavorando".
        //
        // Prima le zone che non sono quella allenata prendevano la loro quota
        // dall'anatomia, e due di loro finivano con lo STESSO colore: sul pettorale non si
        // capiva quale capo stesse lavorando. E anche quando avevano colori diversi, la
        // gamma era così stretta che non si vedeva.
        //
        // Adesso la regola e' una sola e rende i tre capi distinguibili: la zona che
        // lavora e' piena, quella a due passi di distanza e' chiara, e quella a tre
        // passi e' la più chiara. Le quote dell'anatomia dicono sempre QUALE zona
        // lavora, e quella resta quella.
        //
        // LE ZONE DEL GRUPPO DIVERSE DA QUELLA ALLENATA: la più vicina è chiara, le
        // altre sono la più chiara in assoluto. L'ORDINE CONTA: due zone equidistanti
        // (una sopra e una sotto, come sul petto quando lavora il centro) prendevano
        // lo stesso colore, e allora non si capiva quale capo stesse lavorando.
        const altre = RITAGLI[g].zone
          .filter((z) => z !== forzato)
          .sort((a, b) => (
            Math.abs(RITAGLI[g].zone.indexOf(a) - RITAGLI[g].zone.indexOf(forzato))
            - Math.abs(RITAGLI[g].zone.indexOf(b) - RITAGLI[g].zone.indexOf(forzato))
            || RITAGLI[g].zone.indexOf(a) - RITAGLI[g].zone.indexOf(b)
          ));
        // 0,1 e non 0,2: `livelloDiQuota` scarta il livello 0,2 (usa '>' e non '>='), e
        // quindi 0,2 diventava 0,42.
        quota = altre[0] === zona ? 0.42 : 0.1;
      }
      else if (haQuota(zona)) quota = quote[zona];
      // IL GRUPPO PRINCIPALE SI ACCENDE TUTTO, E SI VEDE (16/10/2026).
      //
      // Ste: "evidenziare tutta la fascia muscolare allenata". Prima, una fascia del
      // PRINCIPALE che non aveva una quota esatta finiva a `livelloDiQuota(0)`,
      // cioe' 0.2: accesa in teoria e invisibile in pratica.
      //
      // Il caso peggiore era il bicipite, che e' diviso in due zone (`braccio_alto`
      // e `braccio_basso`, per la posizione del curl e non per lo spazio): il curl
      // accendeva `braccio_alto` a pieno e `braccio_basso` a 0.2, quindi si vedeva
      // meta' bicipite. Il passo e` solo per i secondari, che continuano a valere
      // `soloQuelloCheLavora`.
      else if (!soloQuelloCheLavora) {
        // IL GRUPPO PRINCIPALE SI ACCENDE TUTTO, MA SI VEDE CHI LAVORA (18/10/2026).
        //
        // Prima tutte le zone che non sono quella allenata prendevano 0.66, e con la
        // gamma stretta erano indistinguibili da quella piena: sul pettorale non si capiva
        // quale capo stesse lavorando. Ora la zona più vicina a quella allenata e' più
        // chiara, e le altre ancora di più.
        const distanza = Math.abs(RITAGLI[g].zone.indexOf(zona) - RITAGLI[g].zone.indexOf(forzato));
        quota = distanza === 1 ? 0.42 : 0.1;
      }
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
  // IL PEZZO ALLENATO SI CERCA CON L'ALIAS (18/10/2026).
  //
  // Il brachiale e il bicipite sono due nomi che sulla figura sono un muscolo solo:
  // quindi la zona da accendere pieno e' quella del bicipite, non quella del brachiale.
  const forzato = idZonaDaParte(acceso) || acceso;
  metti(gruppo, forzato, false);

  // I secondari: raggruppati per muscolo, e per ognuno il pezzo migliore è
  // quello che l'esercizio nomina di più.
  const altri = new Set();
  for (const zona of Object.keys(quote)) {
    const g = gruppoDiParte(zona);
    if (!g || g === gruppo) continue;
    // la zona del principale non e' un secondario: con l'alias (brachiale e
    // bicipite) altrimenti la stessa zona compariva due volte
    if (zona === forzato) continue;
    if (quote[zona] >= SOGLIA_SECONDARIO || certificato(zona)) altri.add(g);
  }
  for (const g of altri) {
    const nominate = RITAGLI[g].zone.filter((z) => quote[z] > 0)
      .sort((a, b) => quote[b] - quote[a]);
    // i secondari si accendono solo dove lavorano: vedi la nota su `metti`
    metti(g, nominate[0], true);
  }

  // dalla più chiara alla più piena: quella che lavora di più viene per ultima
  return righe.sort((a, b) => a.opacita - b.opacita);
}

// L'ATLANTE VETTORIALE sostituisce i poligoni approssimativi con i contorni dei
// muscoli veri: il colore viene scritto direttamente nel riempimento del singolo
// percorso, mentre le linee anatomiche originali restano sopra e separano i fasci.
const MUSCOLO_BASE = '#d5d1dc';
const COLORE_PRINCIPALE = '#9b72f4';
const COLORE_SECONDARIO = '#a98add';

export function zoneAtlante(id) {
  // Dove il disegno ha un percorso separato, usa proprio quella fascia: per
  // esempio deltoide anteriore e laterale non si accendono più insieme solo
  // perché appartengono alla stessa area della spalla.
  if (/^pectoralis_major_/.test(id)) return ['petto_alto', 'petto_centrale', 'petto_basso'];
  if (/^anterior_deltoid_/.test(id)) return ['spalle_frontali'];
  if (/^lateral_deltoid_/.test(id)) return ['spalle_laterali'];
  if (/^posterior_deltoid_/.test(id)) return ['spalle_posteriori'];
  if (/^biceps_brachii_/.test(id)) return ['braccio_alto'];
  if (/^brachioradialis_/.test(id)) return ['brachioradiale'];
  if (/^triceps_brachii_caput_longum_/.test(id)) return ['spalla_gomito_alto'];
  if (/^triceps_brachii_(caput_laterale|caput_mediale)_/.test(id)) return ['spalla_gomito_basso'];
  if (/^anconeus_/.test(id)) return ['spalla_gomito_basso'];
  if (/^(flexor_|extensor_|pronator_|palmaris_)/.test(id)) return ['avambraccio'];
  if (/^(rectus_abdominis_|external_oblique_)/.test(id)) return ['addome'];
  if (/^(vastus_lateralis_|vastus_medialis_|rectus_femoris_)/.test(id)) return ['quadricipite'];
  // IL CENTRO SCHIENA (Ste, 18/10/2026).
  //
  // "l'esercizio fa il centro schiena quindi dovresti evidenziare più forte la linea
  // centrale della schiena". Il centro schiena sono i romboidi e gli erettori della
  // colonna: sono profondi, e in questa tavola superficiale non hanno un contorno
  // proprio. Prima, sul rematore con bilanciere la figura accendeva i DORSALI LARGHI
  // (le "ali"), che sono un supporto: la figura contraddiceva il testo.
  //
  // Il TRAPEZIO INFERIORE è la striscia che sta lungo la spina dorsale, quindi è la
  // cosa più vicina al centro schiena che questa tavola riusciva a disegnare. Si
  // accende con il livello del centro schiena, e i dorsali larghi restano chiari.
  // i LOMBARI: l'erector spinae, il path dedicato del kit
  if (/^erector_spinae/.test(id)) return ['dorso_basso'];
  // Il centro schiena comprende la fascia del trapezio medio e inferiore,
  // tra le scapole e lungo la colonna. Solo il trapezio superiore resta nella
  // zona alta vicino al collo: prima il trapezio medio veniva erroneamente
  // classificato come alto e la tirata prona sembrava accendere le spalle.
  if (/^trapezius_(middle|lower)_/.test(id)) return ['dorso_centrale'];
  if (/^trapezius_/.test(id)) return ['dorso_alto'];
  if (/^latissimus_dorsi_/.test(id)) return ['dorso_lati'];
  if (/^gluteus_/.test(id)) return ['glutei'];
  if (/^(semitendinosus_|semimembranosus_|biceps_femoris_)/.test(id)) return ['femorale'];
  if (/^(gastrocnemius_|soleus_)/.test(id)) return ['polpaccio'];
  // Brachiale e romboidi sono profondi e non hanno un contorno proprio in questa
  // tavola superficiale: meglio lasciarli spenti che tingere un muscolo vicino.
  return [];
}

const ar = (v) => Math.round(v * 100) / 100;

function mischiaHex(base, accento, forza) {
  const a = base.match(/[\da-f]{2}/gi).map((x) => parseInt(x, 16));
  const b = accento.match(/[\da-f]{2}/gi).map((x) => parseInt(x, 16));
  return '#' + a.map((n, i) => Math.round(n + (b[i] - n) * forza)
    .toString(16).padStart(2, '0')).join('');
}

function coloreRiempimento(livello, principale) {
  const quota = Math.max(0, Math.min(1, Number(livello) || 0));
  // LA GAMMA DEVE SEPARARE I LIVELLI (Ste, 18/10/2026).
  //
  // "non si vedono bene e non si capisce quale sta lavorando". Aveva ragione, e il motivo
  // non era il taglio delle fasce: era la gamma. I quattro livelli stavano in una
  // FESSIA: il più chiaro era #a888ee e il pieno #9d75f3, cioe' undici di differenza sul
  // rosso. Sulla figura due muscoli con livelli diversi sembravano identici, e del
  // pettorale non si capiva quale capo stesse lavorando.
  //
  // Adesso i passi sono VERI: dal grigio chiaro al viola pieno si vede la differenza
  // anche su uno schermo piccolo.
  const GAMMA = [
    { q: 0.20, principale: 0.30, secondario: 0.18 },
    { q: 0.42, principale: 0.55, secondario: 0.34 },
    { q: 0.66, principale: 0.78, secondario: 0.50 },
    { q: 1.00, principale: 1.00, secondario: 0.70 },
  ];
  const passo = GAMMA.reduce((a, b) => (
    Math.abs(b.q - quota) < Math.abs(a.q - quota) ? b : a
  ));
  const forza = principale ? passo.principale : passo.secondario;
  return mischiaHex(MUSCOLO_BASE, principale ? COLORE_PRINCIPALE : COLORE_SECONDARIO, forza);
}

function dipingiAtlante(sorgente, righe, gruppoPrincipale, posizione) {
  const intensita = new Map();
  for (const riga of righe) {
    const principale = riga.gruppo === gruppoPrincipale;
    const presente = intensita.get(riga.zona);
    if (!presente || riga.opacita > presente.livello || principale) {
      intensita.set(riga.zona, { livello: riga.opacita, principale });
    }
  }

  // IL PETTORALE IN TRE FASI (Ste, 18/10/2026).
  //
  // Ste: "il petto era diviso in 3, che segnava quando era petto alto, petto basso o petto
  // in mezzo" e "voglio che si veda la parte muscolare tra le 3 del petto che lavora".
  //
  // Nella tavola vettoriale il pettorale e' UN tracciato per lato, senza parti dentro:
  // quindi non si può accendere "la zona giusta", perché il path e' uno solo. Qui il path
  // viene DISEGNATO TRE VOLTE, ognuna ritagliata nella sua fascia, e ognuna prende il
  // viola della sua zona.
  //
  // IL CONTORNO RESTA QUELLO DELL'ARTISTA: e' sempre il suo path, ritagliato con
  // clipPath, quindi la forma non e' inventata. I TAGLI seguono le fibre: partono dallo
  // sterno e scendono verso l'ascella, che e' la direzione del fascio clavicolare. Le
  // fasce sono state VISTE prima di entrare nell'app, perché il primo tentativo aveva
  // misurato i numeri senza mai guardare la figura, ed era venuto fuori sbagliato.
  const gradPetto = [];
  const tinta = sorgente.replace(/<path\b[^>]*>/g, (tag) => {
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    // IL PETTORALE: tre fasce, ognuna con la sua zona
    if (id && /^pectoralis_major_/.test(id)) {
      const d = tag.match(/\bd="([^"]+)"/)?.[1] || '';
      const riquadro = riquadroPath(d);
      if (!riquadro) return tag;
      // lo sterno del lato sinistro della figura e' a destra: il taglio e' specchiato
      const specchio = !/_r$/.test(id);
      const suffisso = /_l$/.test(id) ? 'l' : 'r';
      // LA SFUMATURA DEL PETTORALE (Ste, 18/10/2026).
      //
      // "i fasci sono storti e fatti male": ritagliare il path in tre pezzi dava delle
      // STRISCE, cioe' bordi netti dentro una forma tondeggiante, e sembravano delle righe
      // a pennare. Inveza il path si disegna UNA volta sola, con un riempimento a
      // sfumatura: la sfumatura va dal chiaro al pieno lungo la direzione delle fibre, e
      // il punto pieno cade sulla parte che lavora. Sembra un muscolo, e la parte che
      // lavora si vede perché e' la più scura.
      //
      // La direzione delle fibre del pettorale va dallo sterno verso l'ascella, e i tre
      // capi sono separati PERPENDICOLARMENTE a quelle: quindi la sfumatura deve
      // scendere lungo quella direzione, cioe' dal davanti-alto allo dietro-basso.
      // LE TRE FASCE DEL PETTORALE (Ste, 18/10/2026).
      //
      // "il petto viene evidenziato poco e non evidenzia le fasce muscolari
      // corrispondenti". Prima la sfumatura aveva il viola PIENO in un punto solo,
      // di mezzo in mezzo: su una figura piccola quello si "media" e il petto sembrava
      // slavato, e i tre capi non si distinguevano.
      //
      // Adesso ogni capo è una fascia PIENA, con i bordi sfumati: il petto si vede
      // tutto, e si vede anche QUALE capo sta lavorando, perché quello è pieno e gli
      // altri due sono chiari.
      //
      // Le fasce sono in basso verso l'alto: il capo clavicolare in alto, quello
      // sternale in mezzo, quello addominale in basso. I confini sono quelli del
      // disegno (vedi CONFINI in fasce-petto.js), presi nel loro punto medio.
      const CONFINI_PETTO = [0.30, 0.74];
      const MORBIDO = 0.04;
      const colori = ZONE_PETTO.map((zona) => {
        const attivo = intensita.get(zona);
        // una fascia che NON lavora resta SPENTA, col colore del corpo: se restasse
        // su un viola chiaro, il pettorale resterebbe colorato anche quando l'esercizio
        // non e' di petto
        return attivo ? coloreRiempimento(attivo.livello, true) : MUSCOLO_BASE;
      });
      const idGrad = 'sfumatura-petto-' + suffisso;
      const fermo = [];
      const ferma = (v, colore) => fermo.push('<stop offset="' + Math.round(100 * v)
        + '%" stop-color="' + colore + '"/>');
      ferma(0, colori[0]);
      ferma(CONFINI_PETTO[0] - MORBIDO, colori[0]);
      ferma(CONFINI_PETTO[0] + MORBIDO, colori[1]);
      ferma(CONFINI_PETTO[1] - MORBIDO, colori[1]);
      ferma(CONFINI_PETTO[1] + MORBIDO, colori[2]);
      ferma(1, colori[2]);
      // la sfumatura scende dall'alto verso il basso: i tre capi sono impilati
      gradPetto.push('<linearGradient id="' + idGrad + '" gradientUnits="userSpaceOnUse" x1="'
        + ar((riquadro.x1 + riquadro.x2) / 2) + '" y1="' + ar(riquadro.y1) + '" x2="'
        + ar((riquadro.x1 + riquadro.x2) / 2) + '" y2="' + ar(riquadro.y2) + '">'
        + fermo.join('') + '</linearGradient>');
      const tagUnico = tag.replace(/\bid="([^"]+)"/, 'id="$1-sfumato"');
      return '<g>' + tagUnico.replace(/\bfill="[^"]*"/, 'fill="url(#' + idGrad + ')"')
        .replace(/stroke="black"/g, 'stroke="#514a5c"') + '</g>';
      // LE LINEE DI SEPARAZIONE fra le fasce: sottili, del colore del corpo, come le
      // linee anatomiche del disegno. Senza queste i tagli sembrano delle righe a pennare
      // (Ste: "rendi più realistici i fasci muscolari").
      for (let k = 0; k < lineeFasce(riquadro, specchio).length; k++) {
        const linea = lineeFasce(riquadro, specchio)[k];
        parti.push('<path id="separazione-petto-' + suffisso + '-' + k + '" d="' + linea.d
          + '" fill="none" stroke="' + MUSCOLO_BASE
          + '" stroke-width="1.1" stroke-linecap="round"/>');
      }
      return parti.join('');
    }
    const attivi = id ? zoneAtlante(id).map((zona) => intensita.get(zona)).filter(Boolean) : [];
    const attivo = attivi.find((zona) => zona.principale)
      || attivi.sort((a, b) => b.livello - a.livello)[0];
    let colore;
    if (id === 'underlayer') colore = '#efedf2';
    else if (attivo) colore = coloreRiempimento(attivo.livello, attivo.principale);
    else {
      const riempimento = tag.match(/\bfill="([^"]*)"/)?.[1]?.trim().toUpperCase();
      colore = riempimento === '#E0E0E0' ? '#d8d4de' : MUSCOLO_BASE;
    }
    return tag.replace(/\bfill="[^"]*"/, `fill="${colore}"`)
      .replace(/stroke="black"/g, 'stroke="#514a5c"');
  }).replace(/stroke="black"/g, 'stroke="#514a5c"');

  const inizio = tinta.indexOf('>') + 1;
  const fine = tinta.lastIndexOf('</svg>');
  const contenuto = tinta.slice(inizio, fine);
  // La radice originale ha `fill="none"`: alcune linee decorative non hanno
  // un fill proprio e devono restare contorni, non diventare macchie nere.
  return `<svg fill="none" x="${posizione.x}" y="${posizione.y}" width="${posizione.larghezza}"`
    + ` height="${posizione.altezza}" viewBox="${posizione.viewBox}"`
    + ' preserveAspectRatio="none" aria-hidden="true">'
    + (gradPetto.length ? '<defs>' + gradPetto.join('') + '</defs>' : '')
    + contenuto + '</svg>';
}

export function figurino(acceso = null, livelli = null, anatomia = null) {
  const righe = righeDaAccendere(acceso, livelli, anatomia);
  const gruppoPrincipale = gruppoDiParte(acceso);
  const inchiostro = [];
  inchiostro.push(dipingiAtlante(ATLANTE_FRONTE, righe, gruppoPrincipale, {
    x: 0, y: 48, larghezza: 370, altezza: 717, viewBox: '0 0 587 1137',
  }));
  inchiostro.push(dipingiAtlante(ATLANTE_RETRO, righe, gruppoPrincipale, {
    x: 420, y: 54, larghezza: 370, altezza: 703, viewBox: '0 0 596 1133',
  }));
  return inchiostro.join('');
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
