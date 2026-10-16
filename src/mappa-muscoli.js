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
    sagoma: [[86, 294], [104, 280], [136, 276], [160, 284], [169, 306],
      [161, 332], [150, 358], [112, 357], [93, 338], [83, 312]],
  },

  // ---- spalla davanti: il deltoide laterale e quello anteriore ----
  deltoide_fronte: {
    vista: 'fronte',
    nome: 'deltoide davanti',
    // Il deltoide laterale sta sul BORDO della spalla, l'anteriore guarda verso
    // il petto: si taglia in verticale, col laterale fuori e l'anteriore dentro.
    zone: ['spalle_laterali', 'spalle_frontali'],
    tagli: { asse: 'x', valori: [74] },
    sagoma: [[50, 284], [96, 278], [106, 318], [94, 352], [56, 348], [42, 310]],
  },

  // ---- braccio davanti ----
  bicipite: {
    vista: 'fronte',
    nome: 'bicipite',
    zone: ['braccio_alto', 'braccio_basso'],
    tagli: { asse: 'y', valori: [375] },
    sagoma: [[58, 348], [92, 346], [96, 380], [92, 402], [62, 404], [50, 386]],
  },

  avambraccio: {
    vista: 'fronte',
    nome: 'avambraccio',
    zone: ['avambraccio'],
    sagoma: [[54, 404], [90, 402], [88, 438], [74, 452], [48, 452], [44, 424]],
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
    sagoma: [[104, 472], [158, 472], [160, 560], [148, 622], [116, 620], [100, 540]],
  },

  // ---- schiena, tutto dietro ----
  trapezio: {
    vista: 'retro',
    nome: 'trapezio',
    zone: ['dorso_alto'],
    centro: true,
    sagoma: [[486, 244], [668, 244], [664, 306], [490, 306]],
  },

  dorsale: {
    vista: 'retro',
    nome: 'dorsali larghi',
    zone: ['dorso_lati'],
    sagoma: [[474, 298], [540, 294], [550, 380], [532, 432], [486, 426], [468, 348]],
  },

  romboidi: {
    vista: 'retro',
    nome: 'dorso centrale',
    zone: ['dorso_centrale'],
    centro: true,
    sagoma: [[540, 300], [614, 300], [614, 424], [540, 424]],
  },

  deltoide_posteriore: {
    vista: 'retro',
    nome: 'deltoide dietro',
    zone: ['spalle_posteriori'],
    sagoma: [[455, 274], [520, 272], [529, 310], [514, 342], [500, 370], [466, 368], [449, 318]],
  },

  tricipite: {
    vista: 'retro',
    nome: 'tricipite',
    zone: ['spalla_gomito'],
    sagoma: [[452, 376], [498, 374], [507, 410], [499, 450], [459, 457], [443, 420], [440, 390]],
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
    sagoma: [[504, 502], [568, 502], [570, 600], [558, 642], [520, 640], [502, 558]],
  },

  polpaccio: {
    vista: 'retro',
    nome: 'polpaccio',
    zone: ['polpaccio'],
    sagoma: [[510, 646], [568, 646], [570, 700], [558, 732], [524, 730], [506, 670]],
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
/**
 * LE SAGOME NUOVE, MISURATE SULL'ANATOMIA (15/10/2026).
 *
 * Prima le sagome erano disegnate a mano, sei o otto punti per muscolo, e bastavano
 * perché il corpo era una figura piatta e semplice. Adesso il corpo e' una
 * tavola anatomica vera, con i muscoli separati uno per uno: una sagoma a otto
 * punti accenderebbe mezzo bicipite o un pezzo di polpaccio.
 *
 * Queste coordinate NON sono prese a occhio. Vengono dalla tavola che Ste ha
 * generato appositamente (img di lavoro: un disegno per muscolo, ognuno di un
 * colore diverso), ritagliando ogni colore nella sua sagoma reale. La copertura
 * misurata, cioe' quanta parte della sagoma cade davvero sopra il muscolo, e'
 * dell'89%: prima, con le sagome a otto punti, era del 50%.
 *
 * PERCHÉ NON VENGONO RISPECCHIATE. Il codice vecchio teneva meta' sagoma e la
 * rispecchiava da solo, perché il corpo era simmetrico. Queste sono già intere:
 * ogni muscolo ci mette dentro il pezzo sinistro e quello destro (si vede dai
 * polpacci, che sono due sagome e non una). Quindi passano così come sono, e il
 * `costruisci()` salta il rispecchiamento per queste zone.
 */
export const BANDE_RILAVATE = {
  petto_alto: [
     [[124.9,246.8],[119.7,248.9],[117.5,251],[115.2,253.6],[112.9,256.3],[110.6,259.4],[108.3,263.1],[105.5,266.8],[103.2,270],[101.5,273.7],[98.6,275.8],[96.3,279],[94,282.1],[141.4,284.8],[149.4,286.9],[154.6,289],[158,291.1],[163.7,291.1],[167.1,289],[171.7,286.9],[178.6,284.8],[229.4,282.7],[227.7,279.5],[225.4,276.9],[223.1,274.7],[220.8,272.1],[219.7,268.9],[217.4,265.8],[215.1,262.6],[212.8,259.4],[210.5,256.3],[208.3,253.6],[206,251],[203.7,248.9]],
  ],
  petto_centrale: [
     [[91.2,284.8],[90,285.8],[88.3,287.4],[90,290.1],[91.8,292.2],[92.9,294.3],[93.5,296.9],[94.6,299.6],[95.8,302.2],[96.9,304.3],[98,305.9],[100.3,308],[102.6,309.6],[106.6,312.2],[110,314.4],[112.9,315.4],[119.7,317],[199.1,318],[206,316.5],[211.1,314.9],[214,313.8],[218,311.7],[220.3,310.1],[222,308.5],[224.2,307],[225.4,305.4],[227.1,302.2],[228.8,299.6],[230,296.4],[231.1,293.8],[231.7,292.2],[233.4,290.1],[235.1,288.5],[234,286.4]],
  ],
  petto_basso: [
     [[96.3,307],[96.3,310.1],[95.8,313.8],[95.8,318],[95.2,320.7],[94.6,324.9],[95.8,329.1],[96.9,332.8],[98,335.5],[100.3,339.2],[102.6,342.9],[104.9,345.5],[106.6,348.1],[110.6,350.8],[111.7,354.5],[113.5,357.7],[115.2,360.3],[205.4,361.9],[208.3,359.8],[210,356.6],[211.7,353.4],[212.8,349.7],[218,347.1],[219.7,344.5],[221.4,341.8],[223.7,338.1],[226,333.9],[227.1,331.8],[228.2,328.6],[228.8,324.9],[228.2,321.2],[228.2,318],[227.7,314.4],[227.1,310.1]],
     [[112.9,393],[112.9,394.1],[113.5,396.2],[113.5,397.3],[114,398.8],[114.6,401],[114.6,402],[115.2,403.6],[116.3,405.2],[116.9,406.2],[117.5,408.3],[118.6,409.4],[119.2,410.5],[120.3,411.5],[121.5,413.1],[122,413.6],[123.2,414.7],[124.3,416.3],[124.9,416.8],[125.4,416.3],[124.9,415.2],[123.7,413.6],[122.6,411.5],[122,410.5],[120.9,408.3],[119.7,406.8],[119.2,405.7],[118,403.6],[116.9,401.5],[116.3,400.4],[115.2,398.3],[114.6,396.7],[114,395.7],[113.5,394.1]],
  ],
  addome: [
     [[160.3,327.6],[145.4,332.8],[134.6,338.1],[127.7,343.9],[123.2,354],[119.2,362.4],[111.7,371.4],[111.7,381.9],[114,391.5],[118.6,399.9],[123.7,409.4],[128.9,418.9],[134,427.4],[139.2,437.4],[144.9,445.8],[150.6,453.8],[156.3,459.6],[166.6,460.1],[172.3,453.8],[178,446.4],[183.7,437.9],[189.4,429.5],[195.1,420.5],[200.3,412],[204.8,403.6],[208.8,395.1],[211.1,385.6],[211.7,375.6],[209.4,366.6],[201.4,360.3],[197.4,352.4],[193.4,343.4],[186,337.6],[174.6,332.3]],
  ],
  spalle_frontali: [
     [[99.2,242],[84.9,244.6],[78.6,246.8],[74.1,249.4],[71.8,251.5],[68.9,254.7],[67.8,258.9],[67.2,263.7],[67.2,267.9],[67.8,272.1],[68.9,276.9],[70.1,280.6],[69.5,285.3],[69.5,289.5],[69.5,294.8],[70.1,298.5],[73.5,295.9],[76.3,293.8],[79.2,291.6],[82.6,289],[85.5,286.9],[88.9,284.3],[91.2,281.6],[94,278.4],[96.3,275.8],[99.2,272.1],[101.5,268.9],[103.7,265.8],[106.6,261.5],[108.9,258.4],[111.7,254.2],[113.5,250.5],[107.7,247.3],[104.9,244.1]],
     [[226.5,244.1],[217.4,246.8],[211.7,248.9],[210.5,252.6],[212.8,255.7],[215.7,260],[218,263.1],[220.8,266.8],[223.1,270],[225.4,273.2],[228.2,276.9],[230.5,280],[233.4,282.7],[235.7,284.8],[238.5,287.4],[241.4,289.5],[245.4,292.2],[247.7,294.3],[250.5,296.4],[253.4,299],[253.9,298],[253.9,292.7],[253.9,288.5],[253.9,283.2],[253.9,279],[255.7,274.2],[255.7,270],[255.7,266.8],[255.7,261.5],[255.1,257.3],[253.4,253.1],[251.1,251],[247.7,248.3],[243.1,246.2]],
  ],
  spalle_laterali: [
     [[66.1,257.8],[64.3,260],[62.6,262.6],[60.9,265.8],[59.8,268.9],[58.6,271.6],[57.5,274.2],[56.9,276.9],[56.3,280],[56.3,283.2],[56.3,286.4],[56.3,289.5],[57.5,292.7],[58.1,295.3],[58.6,298.5],[59.8,300.6],[61.5,303.8],[63.2,306.4],[64.9,305.4],[66.1,302.7],[67.2,300.1],[67.2,296.9],[67.8,293.8],[67.2,290.6],[67.2,287.4],[67.2,284.3],[66.6,281.6],[66.6,278.4],[66.1,275.8],[65.5,272.6],[65.5,269.5],[65.5,266.3],[65.5,263.1],[66.1,260]],
     [[257.4,258.4],[257.4,261.5],[257.9,264.2],[257.9,267.4],[257.9,270.5],[257.4,273.7],[257.4,276.9],[256.8,280],[256.2,282.7],[256.2,285.8],[256.2,289],[255.7,291.6],[255.7,294.8],[256.2,298],[256.8,300.6],[257.4,303.8],[259.1,306.4],[260.8,305.4],[262.5,302.7],[263.7,300.1],[264.8,297.5],[265.9,294.8],[266.5,292.2],[266.5,289],[267.1,286.4],[267.1,283.2],[266.5,280],[265.9,276.9],[265.4,274.2],[264.8,271.6],[263.7,269.5],[262.5,266.3],[260.8,263.1],[259.1,260.5]],
  ],
  braccio_alto: [
     [[85.5,289.5],[83.8,291.1],[80.3,293.2],[78,295.3],[75.2,297.5],[72.3,299.6],[57.5,302.2],[55.8,305.4],[54.6,309.1],[53.5,312.8],[52.3,316.5],[52.3,320.7],[52.3,324.9],[53.5,328.1],[55.2,330.7],[61.5,333.9],[63.8,337.6],[66.6,339.7],[72.3,341.8],[80.9,340.2],[84.9,338.1],[87.2,335.5],[89.5,332.3],[90.6,329.1],[91.2,325.4],[91.8,321.7],[92.3,318],[92.9,313.8],[92.9,310.7],[93.5,306.4],[92.9,302.2],[91.8,298],[90.6,294.8],[88.3,291.1]],
     [[236.2,290.1],[234.5,291.6],[232.8,295.9],[231.1,299],[230.5,303.3],[230,306.4],[230,310.7],[230.5,314.9],[231.1,319.1],[231.7,322.3],[232.2,326],[233.4,329.7],[234.5,333.4],[236.2,336],[239.1,338.1],[242.5,340.2],[255.1,340.8],[258.5,338.6],[260.2,337.1],[261.9,333.9],[268.2,330.7],[270.5,327],[271.1,324.4],[271.1,320.2],[270.5,315.9],[269.9,311.7],[268.8,309.6],[267.7,305.9],[265.9,302.7],[251.7,300.1],[249.4,298.5],[246.5,295.9],[243.7,293.8],[240.8,291.6]],
  ],
  braccio_basso: [
     [[53.5,330.2],[53.5,333.4],[53.5,336.5],[52.9,340.2],[52.9,343.4],[52.9,347.6],[52.9,350.8],[51.2,355],[50.6,358.2],[51.2,361.4],[52.9,364.5],[54.6,366.6],[56.9,369.3],[58.6,370.9],[60.9,373.5],[62.6,375.6],[65.5,379.8],[66.1,380.9],[67.8,378.8],[72.3,376.1],[74.1,374.6],[76.9,372.4],[78.6,369.8],[79.2,366.1],[79.2,362.9],[79.2,358.7],[79.8,356.1],[80.9,352.9],[82,349.7],[83.2,346.6],[84.9,342.9],[86,339.7],[59.2,336],[59.2,332.8]],
     [[268.8,332.3],[264.2,334.9],[261.4,337.6],[237.4,339.7],[238.5,342.3],[239.7,346],[240.8,348.7],[242,351.3],[243.7,355],[244.2,358.2],[244.2,362.4],[244.8,365],[244.8,368.2],[246.5,371.9],[248.2,374],[251.1,376.1],[253.4,377.7],[256.8,379.8],[257.9,380.9],[257.9,377.7],[261.4,374.6],[263.1,372.4],[265.4,369.8],[267.7,367.7],[269.4,365.6],[271.1,362.4],[272.8,359.2],[272.2,355],[270.5,352.4],[270.5,349.2],[270.5,345],[270.5,341.8],[270.5,337.6],[269.9,334.9]],
  ],
  avambraccio: [
     [[48.4,359.8],[45.5,364.5],[43.8,369.3],[41.5,374.6],[40.4,378.8],[39.8,384.1],[39.8,390.4],[40.4,395.7],[40.4,401],[40.9,407.3],[40.9,412.6],[41.5,417.3],[41.5,423.7],[41.5,428.9],[41.5,434.2],[40.9,440.6],[42.1,443.2],[59.2,439],[60.3,434.2],[61.5,429.5],[63.2,424.2],[64.3,420],[66.6,415.7],[70.1,410.5],[72.3,405.7],[74.6,401.5],[76.3,396.2],[77.5,391.5],[78,386.2],[78.6,379.8],[78,375.1],[56.9,371.4],[53.5,367.7],[50.6,364]],
     [[274.5,359.8],[272.8,364],[269.9,367.7],[267.1,371.4],[245.4,376.1],[245.4,381.4],[245.4,386.7],[246.5,392.5],[247.7,397.8],[249.4,402],[251.1,406.8],[254.5,412],[257.4,416.8],[259.7,421.6],[261.4,426.8],[262.5,431.6],[263.7,436.3],[280.2,442.7],[281.9,441.1],[281.4,436.3],[281.4,431.1],[281.4,424.7],[281.9,420],[281.9,414.7],[282.5,408.9],[282.5,403.6],[283.1,398.8],[283.6,393.6],[283.6,387.2],[283.1,382.5],[282.5,377.7],[280.8,372.4],[279.1,368.2],[277.4,363.5]],
  ],
  quadricipite: [
     [[111.2,398.8],[104.3,413.1],[99.8,427.4],[98,443.7],[95.2,458.5],[91.2,473.8],[88.9,490.2],[89.5,506],[91.8,522.9],[96.3,537.2],[102,550.4],[101.5,567.3],[101.5,583.1],[95.8,595.8],[99.8,610.6],[104.3,624.9],[108.3,639.6],[112.3,635.9],[115.2,620.1],[122,606.4],[131.2,594.8],[139.7,579.4],[143.2,565.2],[146.6,550.4],[148.3,534.6],[149.4,519.2],[153.4,505],[156.3,489.7],[156.9,474.4],[154.6,460.6],[145.4,450.1],[136.9,437.4],[127.7,423.7],[116.3,412]],
     [[212.8,399.4],[207.1,412.6],[196.3,423.1],[186.6,436.9],[178,449.5],[168.3,461.2],[166.6,475.9],[167.1,491.3],[170.6,507.1],[174.6,522.9],[175.1,538.3],[179.1,554.6],[180.8,570.5],[185.4,583.7],[194.6,597.9],[203.7,610.1],[208.3,624.3],[211.1,639.1],[215.1,637.5],[219.7,623.8],[224.2,609],[226.5,594.8],[220.3,581],[221.4,565.2],[220.8,548.3],[227.7,534],[231.7,518.7],[233.4,502.3],[233.4,486.5],[231.7,470.7],[227.7,456.4],[225.4,442.1],[223.7,426.8],[219.1,412.6]],
  ],
  dorso_alto: [
     [[568.1,206.3],[560.7,210.6],[555.5,219.1],[550.4,226.1],[543.5,230.9],[536.1,235.1],[522.9,239.9],[516.6,245.3],[526.9,250.1],[532.6,258.1],[531.5,266.6],[526.9,274.6],[521.2,279.4],[513.2,284.7],[520,289.5],[528.1,293.8],[537.8,298.6],[548.1,302.8],[616.2,298],[626.5,293.2],[634,289],[641.4,283.7],[632.2,278.9],[625.9,273],[620.8,265],[622.5,257],[627.1,250.1],[636.8,245.3],[631.7,239.9],[618.5,235.1],[611.1,230.9],[604.2,226.1],[599,219.1],[593.9,211.1]],
  ],
  dorso_centrale: [
     [[576.7,223.4],[575,235.7],[575,249.5],[575,262.9],[568.7,275.7],[561.8,285.3],[553.2,293.8],[551.5,305],[557.8,315.6],[563,327.4],[568.7,337],[569.8,350.3],[571.6,363.6],[573.3,377],[571,390.3],[565.3,400.4],[572.1,409.5],[577.3,420.2],[582.4,407.9],[589.9,398.8],[581.9,389.2],[580.7,375.9],[581.9,363.1],[583,350.3],[584.7,337],[591,324.7],[596.2,313.5],[603,302.3],[597.9,292.2],[591,284.2],[583.6,273.5],[579,261.8],[579.6,248.5],[579.6,235.1]],
  ],
  dorso_lati: [
     [[507.5,285.3],[504,291.1],[504.6,299.1],[506.3,306.6],[507.5,315.6],[509.7,322.6],[509.7,331.1],[511.5,338.6],[515.5,346.6],[519.5,353],[523.5,357.8],[524.1,366.3],[523.5,375.9],[524.1,384.4],[525.8,392.4],[525.2,400.4],[525.2,405.2],[529.8,398.8],[568.1,392.4],[571.6,384.4],[571,376.4],[569.8,369],[569.3,360.4],[568.1,351.4],[567.6,342.8],[565.8,335.4],[562.4,329.5],[557.8,321.5],[555,314.6],[551.5,308.2],[544.1,303.4],[532.1,298],[523.5,293.8],[516,289.5]],
     [[644.3,285.3],[638,289.5],[628.2,294.3],[619.6,298.6],[608.8,303.4],[602.5,308.2],[598.5,314],[595.6,321.5],[591.6,329.5],[587,337],[585.9,344.4],[584.7,352.4],[584.7,361],[583.6,369],[583,377.5],[583,385.5],[585.9,391.9],[591,398.3],[628.8,404.7],[629.9,401],[628.8,393],[630.5,386],[631.1,377.5],[630.5,369],[630.5,361],[633.4,354],[638,346.6],[641.4,339.1],[643.1,331.1],[643.7,322.6],[644.8,315.1],[646.5,307.6],[648.3,300.2],[649.4,292.2]],
  ],
  spalle_posteriori: [
     [[497.1,247.4],[491.4,249.5],[487.4,252.2],[485.1,254.3],[482.3,257.5],[480.5,261.3],[478.3,265],[477.1,268.7],[475.4,273],[474.8,276.7],[473.7,282.1],[473.7,286.3],[474.3,291.1],[474.8,294.8],[476,299.1],[477.7,301.8],[482.3,298.6],[485.1,296.4],[489.1,293.8],[492.6,291.6],[497.1,289],[500.6,286.9],[506.3,284.2],[510.9,282.1],[517.2,279.4],[520.6,277.3],[524.1,274.6],[526.3,271.9],[528.6,267.7],[530.3,263.9],[530.3,258.6],[528.6,254.9],[525.8,251.7],[520.6,249.5]],
     [[644.3,247.4],[631.1,250.1],[627.7,252.2],[624.8,256.5],[623.7,260.2],[624.2,263.9],[625.4,268.7],[627.7,271.9],[630.5,275.1],[632.8,277.3],[636.8,279.4],[643.1,282.1],[648.8,284.7],[652.8,286.9],[657.4,289.5],[661.4,291.6],[666,294.3],[668.9,296.4],[671.7,298.6],[675.7,301.8],[678,298.6],[679.2,293.8],[679.7,290.1],[680.3,286.3],[680.3,281],[679.7,277.3],[679.2,273.5],[677.5,269.3],[676.3,265.5],[674,261.3],[671.7,257.5],[669.4,254.9],[666.6,251.7],[663.1,249.5]],
  ],
  spalla_gomito: [
     [[501.7,288.5],[495.4,291.6],[490.3,294.8],[484.6,298.6],[480.5,301.8],[472.5,306.6],[470.2,311.9],[468.5,318.3],[468,324.7],[468.5,332.2],[469.7,338],[469.7,345.5],[469.1,351.4],[467.4,358.3],[465.7,363.1],[466.8,369.5],[470.8,374.3],[472,381.2],[477.1,382.8],[485.1,379.6],[489.7,375.4],[492,369.5],[496,364.2],[498.9,358.3],[501.2,351.4],[502.9,345.5],[504.6,338],[506.9,333.2],[506.9,325.8],[506.3,319.9],[504.6,313.5],[503.4,307.1],[502.3,300.7],[501.2,294.8]],
     [[651.1,288.5],[651.7,294.3],[650.6,300.2],[649.4,306],[648.3,313.5],[646.5,318.8],[646,325.2],[646.5,332.7],[648.8,338.6],[650.6,344.4],[652.8,351.4],[654.6,357.2],[658,363.6],[661.4,369.5],[664.9,375.4],[669.4,379.6],[678.6,383.4],[683.2,379.6],[683.8,373.8],[688.3,368.4],[688.3,362.6],[686,356.7],[684.3,349.8],[683.2,343.4],[683.2,337],[684.9,330.6],[684.9,324.2],[684.9,317.8],[683.2,311.4],[680.9,306],[672.9,301.8],[668.3,298],[663.1,294.8],[658,291.6]],
  ],
  femorale: [
     [[512.6,457.5],[511.5,465.5],[509.7,474],[508,482.6],[506.9,490.6],[506.3,499.6],[506.9,509.2],[507.5,518.3],[508.6,525.8],[510.9,534.3],[515.5,542.3],[517.2,550.8],[519.5,557.8],[520.6,566.8],[520,575.9],[518.9,585],[549.8,593],[553.8,598.8],[605.3,590.8],[635.7,582.8],[634.5,574.3],[632.8,566.3],[634,556.7],[636.8,550.3],[640.3,542.3],[642.5,533.8],[644.3,525.8],[645.4,517.8],[646.5,509.2],[646.5,499.6],[646,490],[645.4,482],[643.7,473],[642,463.9]],
  ],
  polpaccio: [
     [[620.2,578],[612.2,584.4],[605.9,593.5],[601.9,602],[599,611.6],[596.2,622.3],[594.5,632.4],[595.6,644.7],[600.2,654.8],[603,664.9],[604.2,675.6],[605.9,685.7],[607.6,696.4],[609.9,706.5],[612.2,718.3],[615.6,728.9],[616.2,740.1],[619.1,749.7],[621.9,741.7],[623.7,731.6],[625.4,721.5],[628.2,710.3],[631.7,700.1],[635.1,691.1],[638,679.9],[640.3,669.2],[642,658.5],[643.7,647.3],[646,636.1],[645.4,624.9],[643.1,613.8],[640.3,604.7],[635.7,594],[629.4,584.4]],
     [[532.6,579.1],[525.2,586],[518.9,595.1],[514.3,605.2],[510.9,614.3],[508.6,624.4],[507.5,635.6],[509.2,646.3],[511.5,655.9],[513.2,667.1],[514.9,678.3],[517.8,688.9],[521.2,698.5],[524.6,709.2],[527.5,719.3],[529.8,730],[531.5,741.2],[534.4,751.3],[537.2,741.7],[538.4,730.5],[541.8,719.3],[544.1,709.2],[546.4,698.5],[548.1,688.4],[549.2,676.7],[551,665.5],[553.8,655.3],[558.4,644.7],[560.1,634],[558.4,623.9],[556.1,613.2],[552.7,603.6],[547.5,592.4],[541.2,584.4]],
  ],
  glutei: [
     [[541.2,391.4],[536.6,394],[533.2,397.8],[530.3,402.6],[526.9,406.8],[523.5,412.2],[521.2,418],[518.9,423.4],[517.2,428.7],[516,434.6],[514.9,441],[514.3,447.4],[513.7,453.2],[516,459.1],[521.8,463.4],[525.2,467.6],[530.9,470.8],[613.9,473.5],[621.9,470.8],[627.7,467.6],[631.7,463.4],[637.4,459.6],[640.3,453.2],[639.7,447.4],[639.1,441],[638.5,434.6],[636.8,428.2],[635.1,422.8],[633.4,417.5],[631.1,412.7],[628.2,407.9],[624.8,402.6],[621.4,397.8],[617.9,394]],
  ],
};

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
      // Una zona con le sagome nuove non viene ritagliata ne rispecchiata: arriva
      // già intera e giusta (vedi la nota su BANDE_RILAVATE).
      const rilavata = BANDE_RILAVATE[zona];
      if (rilavata) {
        bande[zona] = rilavata;
        pezzi.push(...rilavata);
        return;
      }
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
  avambraccio: { nome: 'avambraccio (polso e avanti braccio)', gruppo: 'avambraccio' },
  spalla_gomito: { nome: 'tricipite: sopra il gomito', gruppo: 'tricipite' },
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