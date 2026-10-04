// muscoli-parti.js -- QUALE pezzo di muscolo stai lavorando.
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
//   2) scrivere il giudizio con parole vere: "questa ti spinge piu' in alto".
//
// Quindi qui NON creo un errore clinico: segno DOVE va il lavoro principale,
// con un avvertimento che la separazione non è mai totale.

/**
 * I pezzi che l'app distingue, per ogni muscolo.
 *
 * "alto"/"basso" non significa "solo lì": ogni esercizio lavora un po' tutto.
 * Significa "dove pesa di più".
 */
export const PARTI = [
  // ---- petto ----
  {
    id: 'petto_alto', muscolo: 'petto', parte: 'parte alta del petto',
    parole: ['incline', 'inclinata', 'inclinato', 'spalle in alto', 'incline bench'],
    nota: 'Il peso va in alto: panca inclinata, spinte con le spalle alzate. Lavora di più il capo clavicolare, quello che parte dalla clavicola.',
  },
  {
    id: 'petto_basso', muscolo: 'petto', parte: 'parte bassa del petto',
    parole: ['declinato', 'declinata', 'flat bench', 'panca piana', 'low cable fly', 'fly basso', 'in basso'],
    nota: 'Il peso va in basso: panca piana o declinata, fly con i cavi bassi. Lavora di più il capo sternale, quello che parte dallo sterno.',
  },
  {
    id: 'petto_centrale', muscolo: 'petto', parte: 'petto nel mezzo',
    parole: ['chest press', 'panca', 'pecorino', 'macchina', 'cable fly', 'fly', 'cross over',
      'crossover', 'crucifix', 'incline single arm pulldown', 'bench pull', 'dumbbell bench pull',
      'bench press', 'bench', 'pressione petto', 'horizontal press'],
    nota: 'Il lavoro è distribuito: il petto lavora in modo abbastanza uniforme. Il fly lavora soprattutto il centro del petto.',
  },
  // ---- dorso ----
  {
    id: 'dorso_alto', muscolo: 'dorso', parte: 'parte alta del dorso (trapezio)',
    parole: ['shrug', 'spalle a y', 'upper trap', 'elevazione scapola', 'tirate alte'],
    nota: 'Alza le spalle: lavora il trapezio, la parte alta della schiena.',
  },
  {
    id: 'dorso_lati', muscolo: 'dorso', parte: 'dorso ai lati (lati del triangolare)',
    parole: ['pullover', 'lat pulldown', 'trazioni', 'pull up', 'pull-up', 'pull ups', 'dip', 'dips',
      'tirate in basso', 'straight arm', 'trazioni assistite', 'auzhang'],
    nota: 'Tira con le braccia: lavora il dorso largo, quello che si vede di lato sotto le ascelle.',
  },
  {
    id: 'dorso_centrale', muscolo: 'dorso', parte: 'dorso centrale',
    parole: ['rematore', 'row', 'tiremento', 'tirate orizzontali', 'prone'],
    nota: 'Tira verso il corpo: lavora la parte centrale della schiena, quella fra le scapole.',
  },

  // ---- spalle ----
  {
    id: 'spalle_laterali', muscolo: 'spalle', parte: 'spalle laterali (deltoide laterale)',
    parole: ['lateral raise', 'alzata laterale', 'alzate laterali', 'side raise', 'deltoide laterale'],
    nota: 'Alza le braccia di lato: è il deltoide laterale, quello che disegna la spalla tonda.',
  },
  {
    id: 'spalle_posteriori', muscolo: 'spalle', parte: 'spalle posteriori (deltoide posteriore)',
    parole: ['rear delt', 'rear deltoid', 'reverse fly', 'delt posteriori', 'tirate a braccia aperte'],
    nota: 'Tira le braccia dietro: lavora il deltoide posteriore, quello dietro la spalla.',
  },
  {
    id: 'spalle_frontali', muscolo: 'spalle', parte: 'spalle davanti (deltoide anteriore)',
    parole: ['front raise', 'shoulder press', 'military', 'overhead press', 'spinte in alto'],
    nota: 'Spinge in alto davanti: lavora il deltoide anteriore e i trapezi.',
  },

  // ---- braccio ----
  {
    id: 'braccio_alto', muscolo: 'braccio', parte: 'bicipite: braccio in alto',
    parole: ['incline curl', 'curl inclinato', 'scott bench', 'preacher'],
    nota: 'Braccio in alto: il bicipite si vede e lavora nella posizione più corta, quindi è più difficile.',
  },
  {
    id: 'braccio_basso', muscolo: 'braccio', parte: 'bicipite: braccio in basso',
    parole: ['curl bilanciere', 'hammer curl', 'curl al cavo', 'bicipiti', 'curl con bilanciere',
      'in piedi', 'standing curl', 'curl a terra', 'curl basso'],
    nota: 'Braccio giù lungo il fianco: è la posizione facile, quella con la serie più lunga.',
  },
  {
    id: 'avambraccio', muscolo: 'avambraccio', parte: 'avambraccio (polso e avanti braccio)',
    parole: ['wrist curl', 'polso', 'curl del polso', 'avambraccio'],
    nota: 'Muovi solo il polso: lavora l’avambraccio, che sta sotto il gomito.',
  },
  {
    id: 'spalla_gomito', muscolo: 'braccio', parte: 'tricipite: sopra il gomito',
    parole: ['french press', 'skull', 'estensioni sopra la testa', 'overhead extension',
      'tricep pushdown', 'pushdown', 'tricipite', 'single arm tricep', 'estensioni'],
    nota: 'Stendi il gomito contro una resistenza: qui lavora il tricipite, dietro il braccio.',
  },

  // ---- gambe ----
  {
    id: 'quadricipite', muscolo: 'gambe', parte: 'quadricipite (davanti)',
    parole: ['leg extension', 'estensioni gambe', 'affondi', 'lunge', 'squat', 'leg press'],
    nota: 'Stendi il ginocchio: lavora il quadricipite, il muscolo davanti della coscia.',
  },
  {
    id: 'femorale', muscolo: 'gambe', parte: 'femorale (dietro)',
    parole: ['leg curl', 'curl gambe', 'prone curl', 'stacco'],
    nota: 'Piega il ginocchio: lavora il femorale, il muscolo dietro la coscia.',
  },
  {
    id: 'polpaccio', muscolo: 'gambe', parte: 'polpaccio (gemelli e soleo)',
    parole: ['calf', 'polso', 'panturrino', 'sled press calf'],
    nota: 'Sui punta: lavora il polpaccio, dietro la gamba.',
  },
  {
    id: 'glutei', muscolo: 'gambe', parte: 'glutei',
    parole: ['hip thrust', 'glute bridge', 'squat', 'stacco', 'affondi'],
    nota: 'Spinta coi fianchi: lavora il gluteo, il muscolo più forte del corpo.',
  },
  {
    id: 'addome', muscolo: 'core', parte: 'addome',
    parole: ['crunch', 'plank', 'addome', 'sit up', 'tCrunch'],
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

/**
 * Quale pezzo di muscolo lavora quest'esercizio?
 *
 * nome e descrizione insieme: spesso la parte è nella descrizione ("panca
 * inclinata") e nel nome c'è solo il nome dell'esercizio.
 */
/**
 * Cache dei pezzi riconosciuti. Vedi la nota in esercizi-classificatore.js:
 * gli stessi nomi vengono guardati decine di volte quando la pagina disegna una
 * lista, e rifare la conta delle parole ogni volta e' sprecato.
 */
const CACHE = new Map();
const CACHE_MAX = 500;

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
  const ancheDescrizione = soloNome + ' ' + normalizza(descrizione) + ' ';
  // Un pezzo è detto da una FRASE ("panca inclinata"), non da una parola
  // sola. Quindi una frase trovata solo nella descrizione conta come nella
  // descrizione: se scrivevo "panca" e la descrizione diceva "inclinata",
  // il pezzo giusto era l'alto, non quello generico.
  const cerca = (p, w) => conta(soloNome, w) > 0
    ? { n: conta(soloNome, w), soloNome: true }
    : { n: conta(ancheDescrizione, w), soloNome: false };

  const trovati = [];
  for (const p of PARTI) {
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
    return {
      trovata: false,
      muscolo: null, parte: null, nome: null, nota: null,
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
  return {
    trovata: true,
    muscolo: v.parte.muscolo,
    parte: v.parte.id,
    nome: v.parte.parte,
    nota: v.parte.nota,
    parole: v.parole,
    frase: `${v.parte.parte}. ${v.parte.nota}`,
    altre: trovati.slice(1, 3).map((x) => x.parte.parte),
  };
}

/**
 * 'Sul petto', 'Sulle spalle': una frase suona bene solo se lo sai. Senza
 * questo l'app scriveva "Sul spalle", che fa capire subito che la cosa e'
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
  "spalla_gomito": 1,
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
    // Un muscolo piccolo e instabile su un movimento di forza: e' piu' duro di
    // quanto sembra. Il lateral raise e' il caso limite: 4 kg li' sono duri.
    //
    // Il muscolo puo' solo ALZARE la difficolta', mai abbassarla: se la
    // macchina ti aiuta, lo sa gia' il classificatore dagli accorgimenti.
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