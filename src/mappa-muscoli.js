// mappa-muscoli.js -- l'omino che dice DOVE lavori.
//
// Ste (13/10/2026), tre volte sulla stessa figura:
//  1. "voglio che spunti questo omino con il muscolo allenato colorato di viola";
//  2. "deve essere l'omino come quello nella foto. si deve capire anche fronte e
//     retro e qua non si capisce e i quadratini grigi non mi piacciono";
//  3. "e' veramente brutto, non puoi copiare la foto da download e incollarla?
//     pero' deve ovviamente avere colorati solo i muscoli allenanti" e poi
//     "lo sfondo deve avere lo stesso colore dell'app".
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
// I RITAGLI sono le sagome qui sotto, in coordinate della foto. Sono volutamente
// un po' larghi: quello che fa il bordo preciso e' il ritaglio dell'immagine,
// non il poligono. Se il poligono e' un filo troppo stretto, il muscolo sparisce
// e sembra un bug.
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
const CENTRO_FRONT = 162;
const CENTRO_RETRO = 577;

// LA REGOLA: ogni gruppo si scrive SOLO a sinistra, e il destro nasce
// specchiandolo sulla linea centrale della figura.
//
// Prima scrivevo i due lati a mano e sono finiti sbagliati: un punto del petto
// destro era di 6 pixel fuori dal suo compagno, e a occhio non si vedeva
// niente. Se il destro è calcolato, non può sbagliarsi: il test Z6 lo controlla.
//
// Un pezzo solo e centrato (addome, trapezio, romboidi) si scrive una volta
// sola e non viene specchiato.

const CENTRI = { fronte: 162, retro: 577 };

/** Costruisce un gruppo scritto a sinistra, aggiungendo il destro specchiato. */
function aSinistra(nome, pezzi, extra) {
  const specchiati = pezzi.map((pol) => pol.map(([x, y]) => [2 * CENTRI[extra.vista] - x, y]));
  return { vista: extra.vista, nome: extra.nome, pezzi: [...pezzi, ...specchiati] };
}

/** Un gruppo che sta al centro: si scrive una volta sola. */
function centrato(nome, pezzo, extra) {
  return { vista: extra.vista, nome: extra.nome, centro: true, pezzi: [pezzo] };
}

/** Il ritaglio di ogni gruppo, in coordinate della foto. */
export const RITAGLI = {
  // ---- petto: tutto il pettorale, alto centro e basso insieme ----
  petto: aSinistra('petto', [
    // il bordo superiore segue la curva della clavicola: se lo ritaglio a
    // dritto il petto sembra una macchia rettangolare invece di un muscolo.
    [[86, 294], [104, 280], [136, 276], [160, 284], [169, 306],
      [161, 332], [150, 358], [112, 357], [93, 338], [83, 312]],
  ], { vista: 'fronte', nome: 'petto' }),

  deltoide_fronte: aSinistra('deltoide_fronte', [
    [[50, 284], [96, 278], [106, 318], [94, 352], [56, 348], [42, 310]],
  ], { vista: 'fronte', nome: 'deltoide davanti' }),

  bicipite: aSinistra('bicipite', [
    [[58, 348], [92, 346], [96, 380], [92, 402], [62, 404], [50, 386]],
  ], { vista: 'fronte', nome: 'bicipite' }),

  avambraccio: aSinistra('avambraccio', [
    [[54, 404], [90, 402], [88, 438], [74, 452], [48, 452], [44, 424]],
  ], { vista: 'fronte', nome: 'avambraccio' }),

  // un pezzo solo, al centro: non si specchia
  addome: centrato('addome', [[112, 358], [214, 358], [214, 472], [112, 472]],
    { vista: 'fronte', nome: 'addome' }),

  quadricipite: aSinistra('quadricipite', [
    [[104, 472], [158, 472], [160, 560], [148, 622], [116, 620], [100, 540]],
  ], { vista: 'fronte', nome: 'quadricipite' }),

  // ---- schiena, tutto dietro ----
  trapezio: centrato('trapezio', [[486, 244], [668, 244], [664, 306], [490, 306]],
    { vista: 'retro', nome: 'trapezio' }),

  dorsale: aSinistra('dorsale', [
    [[474, 298], [540, 294], [550, 380], [532, 432], [486, 426], [468, 348]],
  ], { vista: 'retro', nome: 'dorsali larghi' }),

  romboidi: centrato('romboidi', [[540, 300], [614, 300], [614, 424], [540, 424]],
    { vista: 'retro', nome: 'dorso centrale' }),

  deltoide_posteriore: aSinistra('deltoide_posteriore', [
    [[455, 274], [520, 272], [529, 310], [514, 342], [500, 370], [466, 368], [449, 318]],
  ], { vista: 'retro', nome: 'deltoide dietro' }),

  tricipite: aSinistra('tricipite', [
    [[452, 376], [498, 374], [507, 410], [499, 450], [459, 457], [443, 420], [440, 390]],
  ], { vista: 'retro', nome: 'tricipite' }),

  // ---- gambe ----
  glutei: aSinistra('glutei', [
    [[508, 436], [576, 436], [578, 500], [508, 500]],
  ], { vista: 'retro', nome: 'glutei' }),

  femorale: aSinistra('femorale', [
    [[504, 502], [568, 502], [570, 600], [558, 642], [520, 640], [502, 558]],
  ], { vista: 'retro', nome: 'femorale' }),

  polpaccio: aSinistra('polpaccio', [
    [[510, 646], [568, 646], [570, 700], [558, 732], [524, 730], [506, 670]],
  ], { vista: 'retro', nome: 'polpaccio' }),
};

// I PEZZI CHE L'APP CONOSCE, e il gruppo in cui sono disegnati.
//
// Qui dentro non c'e' più nessuna forma, solo il nome e il gruppo: i pezzi che
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
  // della spalla. Quindi si accende con il deltoide davanti, che e' quello che
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

// L'id del ritaglio deve essere UNICO per ogni figura.
// Nell'app c'e' una figura sola per pagina, quindi sembrava funzionare: ma se
// sulla stessa pagina ce n'e' due, `url(#taglio-muscolo)` va a cercare l'id nel
// documento e trova sempre la PRIMA, quindi tutte le figure mostravano il
// muscolo della prima. Con il numero diventa univoco e ognuna mostra il suoo.
let numeroFigura = 0;

/**
 * La figura, come stringa SVG pronta da mettere nella pagina.
 *
 * Sono due immagini: il corpo con i muscoli spenti, e sopra i muscoli in viola
 * ritagliati sul pezzo giusto. Se il pezzo non esiste non si mette il ritaglio:
 * e' meglio un omino tutto spento che uno con il muscolo sbagliato acceso.
 */
export function figurino(acceso = null) {
  const gruppo = acceso ? gruppoDiParte(acceso) : null;
  const dentro = [];
  dentro.push(`<image href="./img/muscoli/corpo.png" x="0" y="0" width="${FOTO_L}" height="${FOTO_A}"/>`);

  if (gruppo && RITAGLI[gruppo]) {
    numeroFigura += 1;
    const idTaglio = 'taglio-muscolo-' + numeroFigura;
    // `clipPathUnits` e' un ATTRIBUTO di clipPath, non un elemento. Scritto come
    // elemento (`<clipPathUnits="userSpaceOnUse">`) il browser considera il
    // ritaglio non valido, il clipPath resta vuoto e il muscolo non si accende:
    // la figura sembra scarica, senza dirlo. Il default è già userSpaceOnUse,
    // ma lo scriviamo uguale per non doverci pensare.
    dentro.push(`<clipPath id="${idTaglio}" clipPathUnits="userSpaceOnUse">`);
    for (const pezzo of RITAGLI[gruppo].pezzi) {
      dentro.push(`<polygon points="${punti(pezzo)}"/>`);
    }
    dentro.push('</clipPath>');
    dentro.push(`<image href="./img/muscoli/muscoli.png" x="0" y="0" width="${FOTO_L}"`
      + ` height="${FOTO_A}" clip-path="url(#${idTaglio})"/>`);
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
  { testo: 'FRONTE', x: CENTRO_FRONT, y: 806 },
  { testo: 'DIETRO', x: CENTRO_RETRO, y: 806 },
];

export { CHIAVI as GRUPPI_DISEGNATI };