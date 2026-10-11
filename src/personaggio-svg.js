// personaggio-svg.js -- il tuo personaggio, disegnato e non scritto con le emoji.
//
// Ste (10/10/2026), dalla foto: al posto di "il tuo personaggio" c'era un quadrato
// con una spada e un guanto dentro, presi dal testo. E chiedeva una cosa precisa:
// "fai un personaggio tipo all'inizio nudo, che mano a mano che sblocchi le cose si
// riempe di cose. l'assassino ha in mano un coltello, il guerriero uno scudo e il
// berserker l'ascia. fai una bella grafica".
//
// PERCHE' UN FIGLIO E NON LE EMOJI.
//
// Le emoji sono un font: cambiano da telefono a telefono, su Android il coltello è un
// altro coltello, e non si possono animare pezzo per pezzo. Qui invece ogni parte del
// personaggio è un `<g>` con un nome, quindi si può accendere e spegnere, e si può
// animare il pettorale quando sale un livello.
//
// LA REGOLA CHE VALE PER TUTTE LE PARTI.
//
// Un personaggio all'inizio è nudo: solo il corpo. Ogni premio sbloccato è un pezzo in
// più, e i pezzi si accendono NELL'ORDINE in cui sono stati sbloccati. Un pezzo mai
// sbloccato non si disegna: si vede appena lo guadagni, e con un mezzo secondo di
// dissolvenza, così si capisce che è appena comparso invece di essere sempre stato lì.
//
// L'arma cambia con la classe e sta in mano dall'inizio, anche se è "grezza":
// l'assassino ha il coltello, il guerriero lo scudo, il berserker l'ascia. Non è un
// premio: è quello che sei. Il resto te lo metti addosso allenandoti.

/**
 * Un pezzo del personaggio.
 *
 * @param id       il nome del pezzo, che è anche la chiave con cui si accende
 * @param quando   quando si vede: 'sempre' (dal primo momento) o 'premio'
 * @param d        il disegno, stringa SVG
 * @param spiegazione  la frase per l'alt-text, per chi usa uno screen reader
 */
const PEZZI = [
  // --- il corpo: c'è sempre, è lui che c'è ---
  {
    id: 'corpo',
    quando: 'sempre',
    spiegazione: 'il corpo',
    d: `<ellipse cx="60" cy="34" rx="13" ry="15"/>
        <path d="M40 56 q20 -9 40 0 l7 52 q-27 9 -54 0 Z"/>
        <path d="M40 56 q-9 4 -13 20 l-4 26 q7 3 12 1 l5 -30 Z"/>
        <path d="M80 56 q9 4 13 20 l4 26 q-7 3 -12 1 l-5 -30 Z"/>
        <path d="M47 108 l-3 34 q7 3 13 1 l1 -35 Z"/>
        <path d="M73 108 l3 34 q-7 3 -13 1 l-1 -35 Z"/>`,
  },
  // --- la classe: l'arma, sempre presente ---
  {
    id: 'arma-guerriero',
    quando: 'sempre',
    classe: 'guerriero',
    spiegazione: 'lo scudo del guerriero',
    d: `<path d="M84 60 q17 2 20 18 q-3 20 -20 26 q-9 -8 -9 -22 q0 -14 9 -22 Z"/>
        <path d="M84 64 v34" class="tratto"/>
        <circle cx="84" cy="81" r="4.5" class="punto"/>`,
  },
  {
    id: 'arma-assassino',
    quando: 'sempre',
    classe: 'assassino',
    spiegazione: 'il coltello dell\'assassino',
    d: `<path d="M18 92 l30 -26 l5 5 l-30 27 Z"/>
        <path d="M14 96 l7 -6 l5 5 l-7 6 Z" class="tratto"/>
        <path d="M48 66 l4 -4" class="tratto"/>`
      + `<path d="M52 60 l3 3" class="tratto"/>`,
  },
  {
    id: 'arma-berserker',
    quando: 'sempre',
    classe: 'berserker',
    spiegazione: "l'ascia del berserker",
    d: `<path d="M20 118 l36 -40 l5 4 l-36 41 Z"/>
        <path d="M52 78 q14 -14 24 -4 q-6 16 -21 12 Z"/>
        <path d="M50 76 l7 4" class="tratto"/>`,
  },

  // --- i premi: si accendono quando sono sbloccati ---
  {
    id: 'bracciali',
    premio: 'bracciali',
    spiegazione: 'i bracciali di cuoio',
    d: `<path d="M37 66 q-4 7 -1 14 l8 -1 q-3 -7 0 -13 Z" class="pieno"/>
        <path d="M83 66 q4 7 1 14 l-8 -1 q3 -7 0 -13 Z" class="pieno"/>`,
  },
  {
    id: 'ferro',
    premio: 'ferro',
    spiegazione: "l'armatura di ferro",
    d: `<path d="M42 58 q18 -8 36 0 l-2 20 q-16 7 -32 0 Z" class="pieno"/>
        <path d="M60 56 v26" class="tratto"/>
        <path d="M44 74 h32" class="tratto"/>`,
  },
  {
    id: 'runica',
    premio: 'runica',
    spiegazione: 'la spada runica',
    d: `<path d="M42 100 q18 8 36 0 l-1 12 q-17 7 -34 0 Z" class="pieno"/>
        <path d="M44 106 h32" class="tratto"/>`,
  },
  {
    id: 'elmo',
    premio: 'elmo',
    spiegazione: "l'elmo del drago",
    d: `<path d="M47 36 q0 -18 13 -18 q13 0 13 18 q0 12 -13 13 q-13 -1 -13 -13 Z" class="pieno"/>
        <path d="M50 28 h20" class="tratto"/>
        <path d="M53 34 l4 4 l4 -4 l4 4 l4 -4" class="tratto"/>`,
  },
  {
    id: 'leggendaria',
    premio: 'leggendaria',
    spiegazione: "l'armatura leggendaria",
    d: `<path d="M46 62 q-12 3 -15 16 l-2 14 q9 4 15 1 Z" class="pieno"/>
        <path d="M74 62 q12 3 15 16 l2 14 q-9 4 -15 1 Z" class="pieno"/>
        <circle cx="60" cy="86" r="6" class="pieno"/>`,
  },
  {
    id: 'divina',
    premio: 'divina',
    spiegazione: "l'arma divina",
    d: `<path d="M60 66 l4 12 l12 2 l-9 8 l3 12 l-10 -6 l-10 6 l3 -12 l-9 -8 l12 -2 Z"
        fill="none" stroke-width="2.5"/>`,
  },
];

/**
 * Il personaggio, come stringa SVG.
 *
 * @param classe   'guerriero' | 'assassino' | 'berserker'
 * @param sbloccati  gli id dei premi sbloccati, nell'ordine in cui sono arrivati
 * @param id        l'id univoco, se la pagina ne disegna più di uno
 */
export function personaggioSvg({ classe = 'guerriero', sbloccati = [], id = 'personaggio' } = {}) {
  const via = new Set(sbloccati);
  const parti = PEZZI.map((p) => {
    let siVede = false;
    if (p.quando === 'sempre') siVede = !p.classe || p.classe === classe;
    else if (p.premio) siVede = via.has(p.premio);
    if (!siVede) return '';

    // `premio-acceso` serve solo al CSS per accendere il pezzo con una breve
    // dissolvenza quando arriva. Il pezzo è già nel disegno: qui si decide solo se
    // si vede.
    const classeCss = [
      'persono-pezzo',
      p.quando === 'sempre' ? 'persono-sempre' : 'persono-premio',
      p.premio ? 'persono-premio-aperto' : '',
    ].filter(Boolean).join(' ');

    return `<g class="${classeCss}" data-pezzo="${p.id}">`
      + `<title>${p.spiegazione}</title>${p.d}</g>`;
  }).join('');

  return `<svg class="persono-svg" viewBox="0 0 120 160" role="img"
      aria-label="Il tuo personaggio, con ${sbloccati.length} premi su 6"
      preserveAspectRatio="xMidYMid meet" focusable="false">
    <g class="persono-ombra"></g>
    ${parti}
  </svg>`;
}

/** Il numero di pezzi che il personaggio ha addosso, per il testo sotto. */
export function pezziIndossati(sbloccati = []) {
  return sbloccati.length;
}