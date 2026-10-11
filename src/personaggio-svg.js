// personaggio-svg.js -- il tuo personaggio, proiettato come l'ologramma della
// dashboard, e con i pezzi giusti per la classe.
//
// Ste (10/10/2026). Prima foto: al posto di "il tuo personaggio" c'era un quadrato
// con una spada e un guanto presi dal testo, e la richiesta era "fai un personaggio
// tipo all'inizio nudo, che mano a mano che sblocchi le cose si riempe di cose.
// l'assassino ha in mano un coltello, il guerriero uno scudo e il berserker l'ascia.
// fai una bella grafica come hai fatto con l'ologramma nella dashboard".
//
// Poi: "fa cacare l'ologramma così", e la terza immagine con le tre schede di classe.
// In quella scheda la progressione NON è la stessa per tutti: il secondo pezzo è
// "armatura di cuoio" per il guerriero, "pelo e pelliccia" per il berserker e "vesti
// leggeri" per l'assassino. Il quarto è armatura di ferro per tutti. E il quinto,
// l'arma, è spada / ascia / coltello.
//
// Quindi i pezzi sono PER CLASSE, e non una lista sola. Qui sotto sono tutti, in
// ordine di sblocco.
//
// LA PARTE SULL'OLOGRAMMA.
//
// L'ologramma della dashboard (sito/pc3d-v103.html, `holoMat`) fa tre cose: la luce
// sta sui bordi, ci sono scanline orizzontali, e una banda luminosa sale dal basso.
// Tutte e tre le fa il CSS, non l'SVG: un filtro per ogni pezzo su un telefono fa
// tremare tutto, qui una sola passata sul disegno intero.
//
// LE EMOJI.
// Erano il problema di partenza. Sono un font: cambiano da telefono a telefono, e su
// Android il coltello è un altro coltello. E non si possono accendere e spegnere,
// che è esattamente quello che serve per riempirlo a mano.

/** I colori, uno per classe. */
const TINTA = {
  guerriero: '#ffb020',
  assassino: '#a97bff',
  berserker: '#37d18b',
};

/** Il corpo: c'è sempre, anche nudo. È lui che c'è. */
const CORPO = `<ellipse cx="60" cy="30" rx="12" ry="14"/>
  <path d="M53 43 q7 4 14 0 l1 6 q-8 4 -16 0 Z"/>
  <path d="M43 52 q17 -7 34 0 q6 22 4 45 q-21 8 -42 0 q-2 -23 4 -45 Z"/>
  <path d="M43 54 q-10 5 -13 24 l-5 29 q8 3 13 0 l6 -35 Z"/>
  <path d="M77 54 q10 5 13 24 l5 29 q-8 3 -13 0 l-6 -35 Z"/>
  <path d="M49 101 q-1 21 -2 42 q8 2 12 0 l1 -42 Z"/>
  <path d="M71 101 q1 21 2 42 q-8 2 -12 0 l-1 -42 Z"/>`;

/**
 * I pezzi per classe.
 *
 * Ogni voce: `id` (il pezzo), `premio` (il premio dell'app che lo sblocca, se non è
 * sempre presente) e `d` (il disegno).
 */
const PEZZI = {
  guerriero: [
    {
      id: 'arma-guerriero', quando: 'sempre',
      spiegazione: 'lo scudo del guerriero',
      d: `<path d="M84 60 q17 3 20 19 q-3 20 -20 27 q-9 -8 -9 -23 q0 -15 9 -23 Z"/>
          <path d="M84 65 v36" class="tratto"/><path d="M78 78 h12" class="tratto"/>
          <circle cx="84" cy="85" r="4.5" class="punto"/>`,
    },
    {
      id: 'bracciali', premio: 'bracciali', spiegazione: 'i bracciali di cuoio',
      d: `<path d="M28 84 q-5 8 -1 16 l10 -2 q-4 -8 -1 -15 Z" class="pieno"/>
          <path d="M92 84 q5 8 1 16 l-10 -2 q4 -8 1 -15 Z" class="pieno"/>`,
    },
    {
      id: 'torso', premio: 'ferro', spiegazione: "l'armatura di cuoio",
      d: `<path d="M45 54 q15 -6 30 0 l-1 20 q-14 6 -28 0 Z" class="pieno"/>
          <path d="M60 53 v24" class="tratto"/><path d="M47 70 h26" class="tratto"/>`,
    },
    {
      id: 'spada', premio: 'runica', spiegazione: 'la spada',
      d: `<path d="M22 118 l34 -40 l5 4 l-34 41 Z"/>
          <path d="M16 122 l8 -6 l5 4 l-8 6 Z" class="tratto"/>
          <path d="M54 78 l7 6" class="tratto"/>`,
    },
    {
      id: 'elmo', premio: 'elmo', spiegazione: "l'elmo del guerriero",
      d: `<path d="M47 33 q0 -18 13 -18 q13 0 13 18 q0 12 -13 13 q-13 -1 -13 -13 Z" class="pieno"/>
          <path d="M50 24 h20" class="tratto"/>
          <path d="M53 30 h14" class="tratto"/>`,
    },
    {
      id: 'leggendaria', premio: 'leggendaria', spiegazione: "l'armatura leggendaria",
      d: `<path d="M47 60 q-12 3 -15 16 l-3 14 q9 4 16 1 Z" class="pieno"/>
          <path d="M73 60 q12 3 15 16 l3 14 q-9 4 -16 1 Z" class="pieno"/>
          <path d="M46 100 q14 7 28 0 l-1 11 q-13 6 -26 0 Z" class="pieno"/>
          <circle cx="60" cy="86" r="6" class="pieno"/>`,
    },
    {
      id: 'divina', premio: 'divina', spiegazione: "l'arma divina",
      d: `<path d="M60 62 l5 13 l13 2 l-10 9 l4 13 l-12 -7 l-12 7 l4 -13 l-10 -9 l13 -2 Z"
          fill="none" stroke-width="2.4"/>`,
    },
  ],

  berserker: [
    {
      id: 'arma-berserker', quando: 'sempre',
      spiegazione: "l'ascia del berserker",
      d: `<path d="M18 122 l38 -43 l6 5 l-38 44 Z"/>
          <path d="M52 79 q16 -16 27 -5 q-8 18 -24 13 Z"/>
          <path d="M50 77 l8 5" class="tratto"/>`,
    },
    {
      id: 'bracciali', premio: 'bracciali', spiegazione: 'i bracciali di cuoio',
      d: `<path d="M28 84 q-5 8 -1 16 l10 -2 q-4 -8 -1 -15 Z" class="pieno"/>
          <path d="M92 84 q5 8 1 16 l-10 -2 q4 -8 1 -15 Z" class="pieno"/>`,
    },
    {
      id: 'torso', premio: 'ferro', spiegazione: 'il pelo e la pelliccia',
      // la pelliccia sta su una spalla e scende: è quello che distingue il
      // berserker dagli altri due, che si distinguono invece per i vestiti leggeri
      d: `<path d="M77 52 q14 6 15 22 q-4 16 -14 20 q-6 -18 -1 -42 Z" class="pieno"/>
          <path d="M82 58 q8 8 7 20" class="tratto"/>
          <path d="M84 62 q6 6 6 16" class="tratto"/>`,
    },
    {
      id: 'ascia', premio: 'runica', spiegazione: "l'ascia da guerra",
      d: `<path d="M20 126 l44 -50 l7 6 l-44 51 Z"/>
          <path d="M58 76 q22 -22 38 -6 q-11 25 -33 18 Z"/>
          <path d="M56 73 l10 7" class="tratto"/>
          <path d="M60 68 l8 -5" class="tratto"/>`,
    },
    {
      id: 'elmo', premio: 'elmo', spiegazione: "l'elmo corno del berserker",
      d: `<path d="M47 33 q0 -18 13 -18 q13 0 13 18 q0 12 -13 13 q-13 -1 -13 -13 Z" class="pieno"/>
          <path d="M46 24 q-9 -8 -13 -14 q11 2 15 12" class="pieno"/>
          <path d="M74 24 q9 -8 13 -14 q-11 2 -15 12" class="pieno"/>
          <path d="M53 31 h14" class="tratto"/>`,
    },
    {
      id: 'leggendaria', premio: 'leggendaria', spiegazione: "l'armatura leggendaria",
      d: `<path d="M47 60 q-12 3 -15 16 l-3 14 q9 4 16 1 Z" class="pieno"/>
          <path d="M73 60 q12 3 15 16 l3 14 q-9 4 -16 1 Z" class="pieno"/>
          <path d="M77 52 q14 6 15 22 q-4 16 -14 20 q-6 -18 -1 -42 Z" class="pieno"/>
          <circle cx="60" cy="86" r="6" class="pieno"/>`,
    },
    {
      id: 'divina', premio: 'divina', spiegazione: "l'arma divina",
      d: `<path d="M60 62 l5 13 l13 2 l-10 9 l4 13 l-12 -7 l-12 7 l4 -13 l-10 -9 l13 -2 Z"
          fill="none" stroke-width="2.4"/>`,
    },
  ],

  assassino: [
    {
      id: 'arma-assassino', quando: 'sempre',
      spiegazione: "il coltello dell'assassino",
      d: `<path d="M16 98 l32 -32 l6 6 l-32 33 Z"/>
          <path d="M11 103 l8 -8 l6 6 l-8 8 Z" class="tratto"/>
          <path d="M48 66 l5 -5" class="tratto"/><path d="M54 59 l4 4" class="tratto"/>`,
    },
    {
      id: 'bracciali', premio: 'bracciali', spiegazione: 'i bracciali di cuoio',
      d: `<path d="M28 84 q-5 8 -1 16 l10 -2 q-4 -8 -1 -15 Z" class="pieno"/>
          <path d="M92 84 q5 8 1 16 l-10 -2 q4 -8 1 -15 Z" class="pieno"/>`,
    },
    {
      id: 'torso', premio: 'ferro', spiegazione: 'i vesti leggeri',
      // due fasce diagonali e un mantello dietro: è quello che distingue l'assassino,
      // che è leggero e coperto, dal berserker che è peloso
      d: `<path d="M45 54 q15 -6 30 0 l-2 18 q-13 5 -26 0 Z" class="pieno"/>
          <path d="M44 58 l30 16" class="tratto"/>
          <path d="M45 52 q-13 6 -15 24 l-3 16 q10 3 15 0 Z" class="pieno"/>
          <path d="M75 52 q13 6 15 24 l3 16 q-10 3 -15 0 Z" class="pieno"/>`,
    },
    {
      id: 'coltello', premio: 'runica', spiegazione: 'il pugnale',
      d: `<path d="M14 100 l36 -36 l7 7 l-36 37 Z"/>
          <path d="M9 106 l9 -9 l7 7 l-9 9 Z" class="tratto"/>
          <path d="M50 62 l6 -6" class="tratto"/><path d="M57 54 l5 5" class="tratto"/>`,
    },
    {
      id: 'elmo', premio: 'elmo', spiegazione: "il cappuccio dell'assassino",
      // il cappuccio e la maschera: copre la faccia, che è il tratto dell'assassino
      d: `<path d="M46 34 q0 -20 14 -20 q14 0 14 20 q0 13 -14 14 q-14 -1 -14 -14 Z" class="pieno"/>
          <path d="M52 30 h16" class="pieno"/>
          <path d="M50 38 q10 7 20 0 q-2 8 -10 8 q-8 0 -10 -8 Z" class="pieno"/>`,
    },
    {
      id: 'leggendaria', premio: 'leggendaria', spiegazione: "l'armatura leggendaria",
      d: `<path d="M46 62 q-12 3 -15 16 l-3 14 q9 4 16 1 Z" class="pieno"/>
          <path d="M74 62 q12 3 15 16 l3 14 q-9 4 -16 1 Z" class="pieno"/>
          <path d="M46 100 q14 7 28 0 l-1 11 q-13 6 -26 0 Z" class="pieno"/>
          <circle cx="60" cy="86" r="6" class="pieno"/>`,
    },
    {
      id: 'divina', premio: 'divina', spiegazione: "l'arma divina",
      d: `<path d="M60 62 l5 13 l13 2 l-10 9 l4 13 l-12 -7 l-12 7 l4 -13 l-10 -9 l13 -2 Z"
          fill="none" stroke-width="2.4"/>`,
    },
  ],
};

/**
 * Il personaggio, come stringa SVG.
 *
 * @param classe     'guerriero' | 'assassino' | 'berserker'
 * @param sbloccati  gli id dei premi sbloccati, nell'ordine in cui sono arrivati
 */
export function personaggioSvg({ classe = 'guerriero', sbloccati = [] } = {}) {
  const via = new Set(sbloccati);
  const lista = PEZZI[classe] || PEZZI.guerriero;
  const tinta = TINTA[classe] || TINTA.guerriero;

  const parti = lista.map((p) => {
    let siVede = false;
    if (p.quando === 'sempre') siVede = true;
    else if (p.premio) siVede = via.has(p.premio);
    if (!siVede) return '';

    const classeCss = [
      'persono-pezzo',
      p.quando === 'sempre' ? 'persono-sempre' : 'persono-premio',
      p.premio ? 'persono-premio-aperto' : '',
    ].filter(Boolean).join(' ');

    // `data-pezzo` è il pezzo, `data-premio` è il premio che lo sblocca. Sono due nomi
    // diversi di proposito: lo stesso premio, su una classe diversa, disegna una parte
    // diversa (per il berserker il "ferro" è la pelliccia, non un corpetto d'acciaio).
    const dati = `data-pezzo="${p.id}"` + (p.premio ? ` data-premio="${p.premio}"` : '');

    return `<g class="${classeCss}" ${dati}>`
      + `<title>${p.spiegazione}</title>${p.d}</g>`;
  }).join('');

  // I gradienti stanno in un `defs` DENTRO all'`svg`: se stessero nella pagina,
  // un secondo personaggio non avrebbe gli id e resterebbe senza scanline.
  return `<svg class="persono-svg" viewBox="0 0 120 160" role="img"
      aria-label="Il tuo personaggio, con ${sbloccati.length} premi su 6"
      preserveAspectRatio="xMidYMid meet" focusable="false">
    <defs>
      <pattern id="persono-scanline-grad" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="4" height="2" fill="${tinta}" opacity=".18"/>
      </pattern>
      <linearGradient id="persono-banda-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${tinta}" stop-opacity="0"/>
        <stop offset="55%"  stop-color="${tinta}" stop-opacity=".5"/>
        <stop offset="100%" stop-color="${tinta}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <g class="persono-ombra"></g>
    <g class="persono-disegno">
      <g class="persono-pezzo persono-sempre" data-pezzo="corpo"><title>il corpo</title>${CORPO}</g>
      ${parti}
    </g>
    <g class="persono-proiezione" aria-hidden="true">
      <rect class="persono-scanline" x="0" y="0" width="120" height="160" fill="url(#persono-scanline-grad)"/>
      <rect class="persono-banda" x="0" y="-40" width="120" height="40" fill="url(#persono-banda-grad)"/>
    </g>
  </svg>`;
}

/** Il numero di pezzi che il personaggio ha addosso, per il testo sotto. */
export function pezziIndossati(sbloccati = []) {
  return sbloccati.length;
}