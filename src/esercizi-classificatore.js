// esercizi-classificatore.js -- riconoscere un esercizio e capire quanto e' duro.
//
// Ste (04/10/2026): "deve riconoscere si, per questo ti ho detto se puoi
// metterci un ia, e' possibile?"
//
// Si' possibile, e senza un servizio esterno: si guarda il NOME dell'esercizio
// (italiano o inglese, come sono scritti in palestra) e si cerca di capire
// che movimento e'. Non e' magico, e' una lista di parole chiave con un peso,
// pero' copre i nomi veri che si usano davvero.
//
// Due esempi:
//   "Dumbbell Lateral Raise"  -> isolamento, spalle (carico basso, muscolo solo)
//   "Sled Press Calf Raise"   -> grande, gambe (carico altissimo)
//
// NON e' una IA che "capisce" nel senso magico: e' regole esplicite. Il
// vantaggio e' che sono verificabili, e se sbaglia si vede perche' e si
// corregge una parola chiave invece di rifare tutto.

// ---------------------------------------------------------------------------
// Famiglie di movimento. Ogni voce ha le parole che la riconoscono e quanto
// e' dura l'esercizio di base.
// ---------------------------------------------------------------------------

const FAMIGLIE = [
  {
    id: 'gambe_pesanti', livello: 'grande', gruppo: 'gambe',
    parole: ['leg press', 'pressa gambe', 'squat', 'stacco', 'deadlift', 'hip thrust',
      'sled', 'calf raise', 'polso', 'hack squat', 'front squat', 'sumo'],
  },
  {
    id: 'gambe', livello: 'isolamento', gruppo: 'gambe',
    parole: ['leg curl', 'leg extension', 'curl gambe', 'estensioni gambe', 'prone curl',
      'leg raise', 'gambecurl', 'glute', 'hip abduction', 'adduzione'],
  },
  {
    id: 'tirata_verticale', livello: 'composto', gruppo: 'dorso',
    parole: ['pulldown', 'pulldown machine', 'lat pulldown', 'trazioni', 'pull up', 'pull-up',
      'pullover', 'tirata verticale', 'lat machine', 'pulldown lats', 'straight arm pulldown'],
  },
  {
    id: 'tirata_orizzontale', livello: 'composto', gruppo: 'dorso',
    parole: ['row', 'rematore', 'rowing', 'tiremento', 'puledown', 'seated cable row', 'tiro'],
  },
  {
    id: 'spinta_orizzontale', livello: 'composto', gruppo: 'petto',
    parole: ['chest press', 'panca', 'bench press', 'push up', 'push-up', 'pecorino',
      'incline bench', 'smith incline', 'spinta orizzontale', 'chest fly'],
  },
  {
    id: 'spinta_verticale', livello: 'composto', gruppo: 'spalle',
    parole: ['shoulder press', 'spalle', 'military', 'overhead press', 'pressing',
      'spinta verticale', 'lat raise'],
  },
  {
    id: 'bicipiti', livello: 'isolamento', gruppo: 'bicipiti',
    parole: ['curl', 'bicipite', 'bicipiti', 'scott bench', 'hammer', 'preacher', 'bilanciere curl',
      'flexion', 'biceps', 'spalla', 'curls'],
  },
  {
    id: 'tricipiti', livello: 'isolamento', gruppo: 'tricipiti',
    parole: ['tricep', 'tricipite', 'tricipiti', 'pushdown', 'french press', 'skull', 'estensioni',
      'extension', 'tri', 'kickback'],
  },
  {
    id: 'spalle_isolamento', livello: 'isolamento', gruppo: 'spalle',
    parole: ['lateral raise', 'alzata laterale', 'alzate laterali', 'raise laterale', 'side raise',
      'rear delt', 'delt row', 'shrug', 'spalle laterali'],
  },
  {
    id: 'petto_isolamento', livello: 'isolamento', gruppo: 'petto',
    parole: ['fly', 'flyes', 'cross over', 'crossover', 'pec deck', 'crucifix'],
  },
  {
    id: 'core', livello: 'isolamento', gruppo: 'core',
    parole: ['crunch', 'plank', 'addome', 'abs', 'sit up', 'sit-up', 'tCrunch'],
  },
  {
    id: 'corpo_libero', livello: 'assistito', gruppo: 'corpo libero',
    parole: ['trazioni', 'trazioni assistite', 'pull up', 'pull-up', 'pullups', 'pull ups', 'dip', 'dips', 'push up', 'push-up',
      'corpo libero', 'bodyweight', 'auzhang', 'scout', 'handstand'],
  },
];

// Parole che valgono come segnale anche da sole (singole parole, non frasi).
const SINGOLE = ['trazioni', 'squat', 'stacco', 'plank', 'crunch', 'dip', 'row', 'curl', 'fly', 'raise', 'sled'];

/**
 * Gli accorgimenti: rendono l'esercizio piu' o meno difficile dello stesso
 * movimento. Il cavo e la macchina aiutano, i manubri sono instabili, una
 * presa singola e' scomoda, un esercizio assistito e' piu' pesante.
 */
const ACCORGIMENTI = [
  { parola: 'cavo', effetto: -2, perche: 'il cavo aiuta: puoi regolare il carico' },
  { parola: 'machine', effetto: -2, perche: 'la macchina ti guida: e\' piu\' facile' },
  { parola: 'macchina', effetto: -2, perche: 'la macchina ti guida: e\' piu\' facile' },
  { parola: 'smith', effetto: -1, perche: 'lo smith ti dà stabilita' },
  { parola: 'manubrio', effetto: 1, perche: 'i manubri sono instabili' },
  { parola: 'dumbbell', effetto: 1, perche: 'i manubri sono instabili' },
  { parola: 'bilanciere', effetto: 0, perche: 'il bilanciere e\' il piu\' stabile' },
  { parola: 'single arm', effetto: 2, perche: 'un braccio alla volta e\' piu\' impegnativo' },
  { parola: 'single-arm', effetto: 2, perche: 'un braccio alla volta e\' piu\' impegnativo' },
  { parola: 'singolo', effetto: 2, perche: 'un lato alla volta e\' piu\' impegnativo' },
  { parola: 'unilateral', effetto: 2, perche: 'un lato alla volta e\' piu\' impegnativo' },
  { parola: 'incline', effetto: 1, perche: 'la panca inclinata e\' piu\' difficile' },
  { parola: 'declinate', effetto: 1, perche: 'la panca declinata e\' piu\' difficile' },
  { parola: 'strict', effetto: 1, perche: 'senza aiuto e\' piu\' difficile' },
  { parola: 'piedi', effetto: 1, perche: 'i piedi liberi rendono instabile' },
  { parola: 'negativa', effetto: 1, perche: 'la fase negativa e\' piu\' dura' },
];

// Quanti "punti" servono per ogni livello di difficolta'.
// Quanto un accorgimento sposta la difficolta'. Solo se la somma supera
// questa soglia il livello SALE o SCENDE di uno scalino; sotto, il movimento
// resta quello che e'.
//
// Prima gli accorgimenti potevano far calare una Lat Pulldown (composta) fino
// a "isolamento" solo perche' diceva "macchina". Sbagliato: un movimento di
// forza resta un movimento di forza, la macchina lo rende solo piu' facile.
const SOGLIA_CAMBIAMENTO = 3;
const SOGLIA_GRANDE = 7;
const SOGLIA_COMPOSTO = 3;


function normalizza(testo) {
  return String(testo || '')
    .toLowerCase()
    .replace(/[àáâ]/g, 'a').replace(/[èéê]/g, 'e').replace(/[ìíî]/g, 'i')
    .replace(/[òóô]/g, 'o').replace(/[ùúû]/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Quante volte una parola chiave compare nel nome (con i bordi di parola). */
function conta(testo, parola) {
  if (!parola) return 0;
  const t = ' ' + testo + ' ';
  const p = normalizza(parola);
  let n = 0;
  let i = t.indexOf(p);
  while (i !== -1) {
    // bordo di parola: evita che "raise" conti dentro "traise"
    const prima = i === 0 || t[i - 1] === ' ';
    const dopo = i + p.length >= t.length || t[i + p.length] === ' ';
    if (prima && dopo) n++;
    i = t.indexOf(p, i + 1);
  }
  return n;
}

/**
 * Che cos'e' questo esercizio?
 *
 * nome       = il nome che ha scritto (obbligatorio)
 * descrizione = la descrizione, aiuta a capire
 * convenzione = macchina / cavo / manubrio / dischi / corpo libero / assistenza
 *
 * Restituisce il livello di difficolta', il gruppo muscolare, e PERCHE' ha
 * deciso cosi': quest'ultimo e' importante, cosi' si puo' capire e correggere.
 */
export function classificaEsercizio({ nome = '', descrizione = '', convenzione = null } = {}) {
  // Metto una barra spaziosa fra le parole cosi' ogni parola isolata del nome
  // diventa un "token": e' il modo piu' semplice per far capire a parole
  // singole che sono pezzi di un movimento ("chest" + "press").
  const testo = ' ' + normalizza(nome + ' ' + (descrizione || '')) + ' ';

  // corpo libero: conta come parole intere
  const corpo = conta(testo, 'corpo libero') + conta(testo, 'bodyweight')
    + (convenzione === 'corpo_libero' || convenzione === 'assistenza' ? 1 : 0);
  const trazioni = conta(testo, 'trazioni') + conta(testo, 'pull up') + conta(testo, 'pull-up')
    + conta(testo, 'pullups') + conta(testo, 'pull ups') + conta(testo, 'auzhang');
  const dip = conta(testo, 'dip') + conta(testo, 'dips');

  let migliore = null;
  const punteggi = [];
  for (const f of FAMIGLIE) {
    let punti = 0;
    const trovate = [];
    for (const p of f.parole) {
      const n = conta(testo, p);
      if (n === 0) continue;
      // una frase vale piu' di una parola singola: "leg curl" batte "curl",
      // altrimenti il bicipiti vinceva sulle gambe e Seated Leg Curl finiva
      // classificato come bicipiti
      punti += n * (normalizza(p).includes(' ') ? 2 : 1);
      trovate.push(p);
    }
    if (punti > 0) punteggi.push({ famiglia: f, punti, trovate });
  }
  punteggi.sort((a, b) => b.punti - a.punti);
  migliore = punteggi[0] || null;

  // 3) se e' bodyweight, il livello e' assistito a prescindere
  const eCorpo = corpo + trazioni + dip > 0;
  if (eCorpo && (!migliore || (migliore.famiglia.livello !== 'assistito'))) {
    const perche = trazioni || dip
      ? 'e\' un esercizio col peso del corpo: si contano le ripetizioni'
      : 'e\' un esercizio col peso del corpo: si contano le ripetizioni';
    return {
      livello: 'assistito',
      gruppo: (migliore && migliore.famiglia.gruppo) || 'corpo libero',
      movimento: 'assistito',
      confidenza: corpo + trazioni + dip >= 2 ? 'alta' : 'media',
      motivi: [perche],
      paroleRiconosciute: migliore ? migliore.trovate : [],
      riconosciutoDa: 'corpo libero',
    };
  }

  if (!migliore) {
    return {
      livello: 'composto',
      gruppo: 'altro',
      movimento: 'sconosciuto',
      confidenza: 'bassa',
      motivi: ['dal nome non capisco che movimento e\': l\'ho messo come esercizio di forza. Se sbaglia, cambia il livello a mano.'],
      paroleRiconosciute: [],
      riconosciutoDa: 'nessuna parola nota',
    };
  }

  // 4) gli accorgimenti spostano la difficolta'
  let punti = 0;
  const motivi = [];
  // la convenzione scelta nel form vale come segno: non la conto anche se la
  // parola e' nel nome, altrimenti "Lat Pulldown macchina" prendeva -2 due
  // volte (-4) e finiva per scendere a isolamento
  const giaContaConvenzione = convenzione ? convenzione.replace(/_/g, ' ') : null;
  for (const a of ACCORGIMENTI) {
    const n = conta(testo, a.parola);
    if (n === 0 || a.effetto === 0) continue;
    if (giaContaConvenzione && normalizza(giaContaConvenzione) === normalizza(a.parola)) {
      motivi.push(a.perche);
      continue; // gia' conta sotto, con la convenzione
    }
    punti += a.effetto * n;
    motivi.push(a.perche);
  }
  const convenzioneAiuta = { cavo_totali: -2, macchina: -2, per_manubrio: 1, dischi: -1, bilanciere: 0, assistenza: 2, corpo_libero: 2 };
  if (convenzione && convenzioneAiuta[convenzione]) {
    punti += convenzioneAiuta[convenzione];
    motivi.push('convenzione del carico: ' + convenzione.replace('_', ' '));
  }

  // La base viene dalla FAMIGLIA riconosciuta. Gli accorgimenti possono solo
  // farla salire o scendere di UNO scalino, e solo se la somma e' forte:
  // un movimento di forza resta composto anche se e' col cavo.
  //
  // "assistito" sta fuori da questa scala: e' un'altra cosa (si contano le
  // ripetizioni), quindi se la famiglia e' quella ritorno subito e non lo
  // faccio passare per "composto".
  if (migliore.famiglia.livello === 'assistito') {
    return {
      livello: 'assistito',
      gruppo: migliore.famiglia.gruppo,
      movimento: migliore.famiglia.id,
      confidenza: migliore.punti >= 2 ? 'alta' : 'media',
      motivi: ['e\' un esercizio col peso del corpo: si contano le ripetizioni'],
      paroleRiconosciute: migliore.trovate,
      riconosciutoDa: migliore.famiglia.id,
    };
  }

  const ordine = ['isolamento', 'composto', 'grande'];
  let i = ordine.indexOf(migliore.famiglia.livello);
  if (i < 0) i = 1;

  // Se la famiglia e' gia' un isolamento, un accorgimento come "un braccio alla
  // volta" non lo deve fare salire a "composto": resta un isolamento, solo
  // piu' impegnativo. Solo un movimento di forza puo' salire di livello.
  const puoSalire = i >= 1;
  if (punti >= SOGLIA_CAMBIAMENTO && puoSalire) i = Math.min(ordine.length - 1, i + 1);
  else if (punti <= -SOGLIA_CAMBIAMENTO) i = Math.max(0, i - 1);

  const livello = ordine[i];

  const confidenza = migliore.punti >= 2 ? 'alta' : (migliore.punti === 1 ? 'media' : 'bassa');

  return {
    livello,
    gruppo: migliore.famiglia.gruppo,
    movimento: migliore.famiglia.id,
    confidenza,
    motivi: [`riconosciuto come ${migliore.famiglia.id.replace(/_/g, ' ')}`].concat(motivi),
    paroleRiconosciute: migliore.trovate,
    riconosciutoDa: migliore.famiglia.id,
  };
}

export const FAMIGLIE_CONOSCIUTE = FAMIGLIE.map((f) => ({ id: f.id, livello: f.livello, gruppo: f.gruppo }));