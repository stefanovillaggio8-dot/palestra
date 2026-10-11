// personaggio-svg.js -- il tuo personaggio, proiettato come l'ologramma della
// dashboard.
//
// Ste (10/10/2026), dalla foto: al posto di "il tuo personaggio" c'era un quadrato
// con una spada e un guanto presi dal testo. E chiedeva una cosa precisa:
// "fai un personaggio tipo all'inizio nudo, che mano a mano che sblocchi le cose si
// riempe di cose. l'assassino ha in mano un coltello, il guerriero uno scudo e il
// berserker l'ascia. fai una bella grafica come hai fatto con l'ologramma nella
// dashboard".
//
// LA PARTE IMPORTANTE: "COME L'OLOGRAMMA".
//
// L'ologramma della dashboard (sito/pc3d-v103.html, `holoMat`) non è una figura
// colorata: è un guscio di luce. Il suo materiale fa tre cose, e qui si copiano tutte
// e tre, perché son quelle che fanno "ologramma" e non "figurina colorata":
//
//  1. LA LUCE STA SUI BORDI. Il riflesso in quel materiale è
//     `pow(1 - abs(dot(normale, sguardo)), 2)`: la superficie guarda la luce dal più
//     di lato solo sul contorno, il centro resta scuro. È il motivo per cui sembra
//     vuoto: il centro del corpo non si vede, i bordi sì.
//
//  2. LE SCANLINE. `sin(vP.y * 38 - t * 2.5)`: righe orizzontali che scorrono piano
//     verso l'alto. Non sono un effetto decorativo: sono quello che fa capire che
//     l'immagine è proiettata e non dipinta.
//
//  3. LA BANDA CHE SALE. Il termine `b` del materiale è una luce che parte dal basso
//     e risale: è la scansione del proiettore, e passa due o tre volte.
//
// Tutte e tre le fa il CSS, non l'SVG: in SVG costerebbero un filtro per ogni pezzo,
// e su un telefono un filtro per sei pezzi fa tremare tutto. Il CSS fa una sola
// passata sul disegno intero.
//
// LE EMOJI.
// Erano il problema di partenza. Sono un font: cambiano da telefono a telefono, e su
// Android il coltello è un altro coltello. E non si possono accendere e spegnere,
// che è esattamente quello che serve per riempirlo a mano.

/** I pezzi del personaggio. */
const PEZZI = [
  // --- il corpo: c'è sempre, è lui che c'è, anche nudo ---
  {
    id: 'corpo',
    quando: 'sempre',
    spiegazione: 'il corpo',
    d: `<ellipse cx="60" cy="31" rx="12.5" ry="14.5"/>
        <path d="M53 45 q7 4 14 0 l1 6 q-8 4 -16 0 Z"/>
        <path d="M42 54 q18 -8 36 0 q6 22 4 46 q-22 8 -44 0 q-2 -24 4 -46 Z"/>
        <path d="M42 56 q-10 5 -14 24 l-5 30 q8 3 14 0 l6 -36 Z"/>
        <path d="M78 56 q10 5 14 24 l5 30 q-8 3 -14 0 l-6 -36 Z"/>
        <path d="M48 104 q-1 20 -2 40 q8 2 13 0 l1 -40 Z"/>
        <path d="M72 104 q1 20 2 40 q-8 2 -13 0 l-1 -40 Z"/>`,
  },

  // --- la classe: l'arma, sempre presente. Non è un premio: è quello che sei ---
  {
    id: 'arma-guerriero',
    quando: 'sempre',
    classe: 'guerriero',
    spiegazione: 'lo scudo del guerriero',
    d: `<path d="M83 58 q18 3 21 20 q-3 21 -21 28 q-10 -8 -10 -24 q0 -16 10 -24 Z"/>
        <path d="M83 63 v38" class="tratto"/>
        <path d="M76 76 h14" class="tratto"/>
        <circle cx="83" cy="83" r="5" class="punto"/>`,
  },
  {
    id: 'arma-assassino',
    quando: 'sempre',
    classe: 'assassino',
    spiegazione: "il coltello dell'assassino",
    d: `<path d="M16 96 l31 -30 l6 6 l-31 31 Z"/>
        <path d="M11 101 l8 -7 l6 6 l-8 7 Z" class="tratto"/>
        <path d="M47 66 l5 -5" class="tratto"/>
        <path d="M53 59 l4 4" class="tratto"/>`,
  },
  {
    id: 'arma-berserker',
    quando: 'sempre',
    classe: 'berserker',
    spiegazione: "l'ascia del berserker",
    d: `<path d="M18 124 l38 -43 l6 5 l-38 44 Z"/>
        <path d="M52 81 q15 -16 26 -5 q-7 18 -23 13 Z"/>
        <path d="M50 79 l8 5" class="tratto"/>`,
  },

  // --- i premi: si accendono quando sono sbloccati, e nell'ordine che sono arrivati ---
  {
    id: 'bracciali',
    premio: 'bracciali',
    spiegazione: 'i bracciali di cuoio',
    d: `<path d="M27 84 q-5 8 -1 16 l10 -2 q-4 -8 -1 -15 Z" class="pieno"/>
        <path d="M93 84 q5 8 1 16 l-10 -2 q4 -8 1 -15 Z" class="pieno"/>`,
  },
  {
    id: 'ferro',
    premio: 'ferro',
    spiegazione: "l'armatura di ferro",
    d: `<path d="M44 57 q16 -7 32 0 l-2 22 q-14 6 -28 0 Z" class="pieno"/>
        <path d="M60 55 v28" class="tratto"/>
        <path d="M46 73 h28" class="tratto"/>`,
  },
  {
    id: 'runica',
    premio: 'runica',
    spiegazione: 'la spada runica',
    d: `<path d="M45 102 q15 7 30 0 l-1 11 q-14 6 -28 0 Z" class="pieno"/>
        <path d="M46 107 h28" class="tratto"/>`,
  },
  {
    id: 'elmo',
    premio: 'elmo',
    spiegazione: "l'elmo del drago",
    d: `<path d="M46 34 q0 -19 14 -19 q14 0 14 19 q0 13 -14 14 q-14 -1 -14 -14 Z" class="pieno"/>
        <path d="M49 25 h22" class="tratto"/>
        <path d="M52 32 l4 4 l4 -4 l4 4 l4 -4" class="tratto"/>`,
  },
  {
    id: 'leggendaria',
    premio: 'leggendaria',
    spiegazione: "l'armatura leggendaria",
    d: `<path d="M46 62 q-13 3 -16 17 l-3 15 q10 4 17 1 Z" class="pieno"/>
        <path d="M74 62 q13 3 16 17 l3 15 q-10 4 -17 1 Z" class="pieno"/>
        <circle cx="60" cy="88" r="6.5" class="pieno"/>`,
  },
  {
    id: 'divina',
    premio: 'divina',
    spiegazione: "l'arma divina",
    d: `<path d="M60 64 l5 13 l13 2 l-10 9 l4 13 l-12 -7 l-12 7 l4 -13 l-10 -9 l13 -2 Z"
        fill="none" stroke-width="2.4"/>`,
  },
];

/**
 * Il personaggio, come stringa SVG.
 *
 * @param classe     'guerriero' | 'assassino' | 'berserker'
 * @param sbloccati  gli id dei premi sbloccati, nell'ordine in cui sono arrivati
 */
export function personaggioSvg({ classe = 'guerriero', sbloccati = [] } = {}) {
  const via = new Set(sbloccati);
  const parti = PEZZI.map((p) => {
    let siVede = false;
    if (p.quando === 'sempre') siVede = !p.classe || p.classe === classe;
    else if (p.premio) siVede = via.has(p.premio);
    if (!siVede) return '';

    const classeCss = [
      'persono-pezzo',
      p.quando === 'sempre' ? 'persono-sempre' : 'persono-premio',
      p.premio ? 'persono-premio-aperto' : '',
    ].filter(Boolean).join(' ');

    return `<g class="${classeCss}" data-pezzo="${p.id}">`
      + `<title>${p.spiegazione}</title>${p.d}</g>`;
  }).join('');

  // Le SCANLINE e la BANDA CHE SALE sono qui dentro, non solo nel CSS, perché i
  // loro gradienti hanno bisogno di un `defs`: non si può scrivere una
  // `repeating-linear-gradient` dentro un attributo `fill`. Il CSS fa il movimento,
  // l'SVG fa il disegno della luce.
  //
  // Il `defs` sta DENTRO all'`: se lo mettessi una volta sola nella pagina, un
  // secondo personaggio non avrebbe gli id e resterebbe senza scanline.
  // Il colore non si lascia a `currentColor`: dentro l'SVG `currentColor` vale il
  // colore del TESTO, che è il bianco dei caratteri, non la tinta della classe. Le
  // scanline e la banda userebbero il bianco su tutte e tre le classi, che è
  // esattamente la cosa da non fare: il colore della classe è metà dell'ologramma.
  const tinta = { guerriero: '#ffb020', assassino: '#a97bff', berserker: '#37d18b' }[classe] || '#00e5ff';

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
    <g class="persono-disegno">${parti}</g>
    <g class="persono-proiezione" aria-hidden="true">
      <rect class="persono-scanline" x="0" y="0" width="120" height="160" fill="url(#persono-scanline-grad)"/>
      <rect class="persono-banda" x="0" y="-40" width="120" height="40" fill="url(#persono-banda-grad)"/>
    </g>
  </svg>`;
}