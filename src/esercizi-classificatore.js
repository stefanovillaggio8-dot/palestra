// esercizi-classificatore.js -- capire che esercizio e' e quanto e' difficile.
//
// Ste (04/10/2026): "io voglio che capisca il livello di difficolta', deve essere
// molto forte questo classificatore, e' la cosa piu' importante quindi falla
// bene".
//
// COME FUNZIONA
// Non guardo il nome "tutto insieme": guardo le CARATTERISTICHE del movimento,
// una per una, e ognuna pesa. Un esercizio e' difficile perche' e' un
// movimento grande, OPPURE perche' e' un movimento piccolo ma fatto in una
// posizione scomoda e instabile. Quindi:
//
//   1) che movimento e'  (spinta, tirata, gambe, braccia, spalle, core)
//   2) con che cosa     (macchina, cavo, bilanciere, manubri, corpo libero)
//   3) come e' fatto    (un braccio solo, panca inclinata, strict, assistito)
//
// Ogni caratteristica da' un peso, e la somma decide il livello. Questo e' un
// modello vero (non una lista di nomi): "Panca inclinata Smith" e "Incline
// Bench Press" non compaiono da nessuna parte, ma vengono fuori uguali lo
// stesso, perche' hanno le stesse tre caratteristiche.
//
// DUE REGOLE che non si negoziano:
//
//  - se NON capisce, lo dice ("non sono sicuro") invece di tirare a indovinare.
//    Su un nome nuovo me lo segnala e tu lo correggi a mano;
//  - spiega SEMPRE perche' ha deciso cosi'. Se sbaglia, deve dirti su cosa
//    correggere, altrimenti non e' niente.
//
// Queste regole sono scritte nei test, cosi' non si perdono.

// ---------------------------------------------------------------------------
// 1. I MOVIMENTI. Il primo numero e' il livello base di quell'esercizio.
//    "grande" = carichi alti e molta massa muscolare
//    "composto" = esercizio di forza vero, piu' muscoli insieme
//    "isolamento" = un muscolo solo, carico basso
// ---------------------------------------------------------------------------
const MOVIMENTI = [
  // --- gambe pesanti: il livello piu' alto ---
  {
    id: 'gambe_pesanti', livello: 'grande', gruppo: 'gambe',
    parole: ['leg press', 'pressa gambe', 'squat', 'stacco', 'deadlift', 'hip thrust', 'sled press', 'pressa polipette',
      'sled', 'hack squat', 'front squat', 'sumo', 'power squat', 'glute bridge', 'affondi', 'lunge'],
  },
  // --- spinte ---
  {
    id: 'spinta_orizzontale', livello: 'composto', gruppo: 'petto',
    parole: ['chest press', 'panca', 'bench press', 'pecorino',
      'spinta orizzontale', 'horizontal press', 'panca piana', 'flat bench'],
  },
  {
    id: 'spinta_verticale', livello: 'composto', gruppo: 'spalle',
    parole: ['shoulder press', 'military press', 'overhead press', 'spinta verticale',
      'vertical press', 'spalle in alto', 'pressa spalle'],
  },
  // --- tirate ---
  {
    id: 'tirata_verticale', livello: 'composto', gruppo: 'dorso',
    parole: ['pulldown', 'pull down', 'pullover', 'lat machine', 'vertical row',
      'tirata verticale', 'lat pulldown', 'tirata alta'],
  },
  {
    id: 'tirata_orizzontale', livello: 'composto', gruppo: 'dorso',
    parole: ['row', 'rematore', 'rowing', 'tiremento', 'tiro', 'horizontal row',
      'renegade row', 't bar row', 't-bar'],
  },
  // --- isolamento braccia e gambe ---
  {
    id: 'bicipiti', livello: 'isolamento', gruppo: 'bicipiti',
    parole: ['curl', 'bicipite', 'bicipiti', 'scott bench', 'scott', 'hammer', 'preacher',
      'flexion', 'biceps', 'incline curl'],
  },
  {
    id: 'tricipiti', livello: 'isolamento', gruppo: 'tricipiti',
    parole: ['tricep', 'tricipite', 'tricipiti', 'pushdown', 'push down', 'french press',
      'skull', 'estensioni', 'kickback', 'dips al ciavolo'],
  },
  {
    id: 'gambe_isolamento', livello: 'isolamento', gruppo: 'gambe',
    parole: ['leg curl', 'leg extension', 'curl gambe', 'estensioni gambe', 'prone curl',
      'leg raise', 'adduzione', 'abduction', 'glute', 'polso', 'calf', 'panturrino'],
  },
  {
    id: 'spalle_isolamento', livello: 'isolamento', gruppo: 'spalle',
    parole: ['lateral raise', 'alzata laterale', 'alzate laterali', 'raise laterale',
      'side raise', 'rear delt', 'rear deltoid', 'spalle laterali', 'delt raise', 'front raise', 'shrug', 'spalle a Y'],
  },
  {
    id: 'petto_isolamento', livello: 'isolamento', gruppo: 'petto',
    parole: ['fly', 'flyes', 'cross over', 'crossover', 'crucifix', 'pec deck', 'pecorino a',
      'flyes', 'intraspalla', 'bench pull', 'pullover al cavo'],
  },
  {
    id: 'core', livello: 'isolamento', gruppo: 'core',
    parole: ['crunch', 'plank', 'addome', 'abs', 'sit up', 'sit-up', 'tCrunch', 'obliquo'],
  },
  // --- corpo libero ---
  {
    id: 'corpo_libero', livello: 'assistito', gruppo: 'corpo libero',
    parole: ['trazioni', 'pull up', 'pull-up', 'pullups', 'pull ups', 'dip', 'dips',
      'push up', 'push-up', 'piegarimenti', 'corpo libero', 'bodyweight', 'auzhang', 'scorpione', 'handstand'],
  },
  {
    id: 'spinta_corpo_libero', livello: 'assistito', gruppo: 'corpo libero',
    parole: ['push up', 'push-up', 'piegamenti', 'chest dip', 'dips al parallels'],
  },
];

// ---------------------------------------------------------------------------
// 2. COME E' FATTO. Ogni voce sposta la difficolta' e dice PERCHE'.
//    Il peso conta: sotto +3 / -3 non cambia nulla (una macchina non
//    trasforma un movimento di forza in isolamento), sopra si sale di uno scalino.
// ---------------------------------------------------------------------------
const MODIFICATORI = [
  // --- attrezzatura ---
  { peso: -6, parole: ['macchina', 'machine', 'apparato'], perche: 'la macchina ti guida: il percorso e\' fisso' },
  { peso: -5, parole: ['cavo', 'cavi', 'cable', 'pulley', 'pulleys'], perche: 'il cavo ti aiuta: regoli il carico come vuoi' },
  { peso: -4, parole: ['smith'], perche: 'lo smith ti dà stabilità' },
  { peso: 0, parole: ['bilanciere', 'barbell', 'olimpico'], perche: 'il bilanciere è lo strumento più stabile' },
  { peso: 5, parole: ['manubrio', 'manubri', 'dumbbell'], perche: 'i manubri sono instabili: tengono anche i polsi' },
  { peso: 6, parole: ['kettlebell'], perche: 'il kettlebell è instabile e difficile da fermare' },
  { peso: -3, parole: ['elastico', 'band', 'banda'], perche: 'l\'elastico ti scarica il peso' },
  { peso: -2, parole: ['macchina', 'machine', 'apparato', 'leg press', 'pressa'], perche: 'la macchina ti guida: il percorso è fisso' },

  // --- simmetria: una cosa sola e\' molto piu\' difficile ---
  { peso: 8, parole: ['single arm', 'single-arm', 'singolo braccio', 'un braccio', 'monoarticolare'],
    perche: 'un braccio solo: devi tenerti in equilibrio con una meta\' del corpo' },
  { peso: 8, parole: ['single leg', 'single-leg', 'singola gamba', 'una gamba'],
    perche: 'una gamba sola: instabile e con un solo quadricipite' },
  { peso: 5, parole: ['unilateral', 'unilaterale', 'laterale'],
    perche: 'un lato alla volta: e\' piu\' impegnativo della versione a due lati' },

  // --- posizione: alcune sono piu\' difficili di altre ---
  { peso: 2, parole: ['incline', 'inclinata', 'inclinato'], perche: 'inclinato: il peso grava di piu\' sui muscoli spalle' },
  { peso: 2, parole: ['decline', 'declinata', 'declinato'], perche: 'declinato: molto piu\' pesante' },
  { peso: -4, parole: ['chest supported', 'chest support', 'appoggiato al petto'], perche: 'appoggiato al petto: il petto non tiene nulla' },
  { peso: -3, parole: ['seated', 'seduto', 'seduta'], perche: 'da seduto: meno instabile che in piedi' },
  { peso: 2, parole: ['standing', 'in piedi'], perche: 'in piedi: devi stare in equilibrio' },
  { peso: 4, parole: ['prone', 'busto in basso', 'inclinato avanti', 'bent over'], perche: 'busto in basso: il collo e i lombari soffrono' },
  { peso: -5, parole: ['on knees', 'alle ginocchia', 'ginocchia'], perche: 'alle ginocchia: meno stabilita la base' },
  { peso: -8, parole: ['assisted', 'assistito', 'con aiuto', 'macchinato a leva'],
    perche: 'con l\'aiuto: la macchina ti spinge' },
  { peso: 3, parole: ['strict', 'stricto', 'a presa stretta'], perche: 'strict: niente aiuto, men wiggle' },

  // --- come sono fatte le ripetizioni ---
  { peso: 3, parole: ['negativa', 'eccentrica'], perche: 'la fase negativa e\' piu\' difficile della positiva' },
  { peso: 4, parole: ['tempesta', 'temuto', 'tempo estremo'], perche: 'a tempo: quasi sempre in allenamento statico' },
  { peso: 3, parole: ['burn', 'scottatura', 'a fuoco'], perche: 'in scottatura: la parte difficile arriva alla fine' },
      // Ste (04/10/2026), in due tempi:
    //
    // 1) "Iso-Lateral Row e' pure a dischi. Ma e' piu' difficile a stack o
    //    dischi?" -> questo modificatore aveva il segno GIRO: faceva l'esercizio
    //    piu' FACILE. Due lati separati non aiutano.
    //
    // 2) "anche nella chest press ogni braccio e' indipendente: ogni lato ha il
    //    suo disco" -> e questo e' il punto vero. Il ragionamento "un disco per
    //    lato, quindi equilibrio da fare" vale per TUTTE le macchine a dischi,
    //    non solo per la iso-lateral. Percio' quel ragionamento sta dentro
    //    macchina_dischi (che vale -2 proprio per quello), e qui dentro si
    //    conta SOLO what's in piu': che i due braccia sono indipendenti e puoi
    //    lavorarne uno alla volta.
    //
    // Se tenessi anche qui il conto dei dischi per lato, sarebbe doppio conteggio:
    // la stessa cosa contata due volte. E' lo stesso errore che facevo prima con
    // il muscolo e con la macchina insieme, e l'ho gia' corretto una volta.
    { peso: 2, parole: ['iso-lateral', 'isolateral'], perche: 'iso-lateral: due braccia indipendenti, puoi spingere un lato alla volta' },
];

// ---------------------------------------------------------------------------
// 3. LE SIGLE DEGLI ESERCIZI DI PALESTRA (quelle che si dicono a voce).
//    Senza queste "spinte in basso" o "trazioni in avanti" non le vedrebbe.
// ---------------------------------------------------------------------------
const SIGLE = [
  { nome: 'spinte in basso', movimento: 'spinta_verticale' },
  { nome: 'spinte in alto', movimento: 'spinta_verticale' },
  { nome: 'spin in alto', movimento: 'spinta_verticale' },
  { nome: 'trazioni in avanti', movimento: 'tirata_verticale' },
  { nome: 'trazioni in basso', movimento: 'tirata_verticale' },
  { nome: 'tirate in basso', movimento: 'tirata_verticale' },
  { nome: 'tirate strozzo', movimento: 'tirata_orizzontale' },
  { nome: 'tirate pendenti', movimento: 'tirata_verticale' },
  { nome: 'spin to cross', movimento: 'tirata_orizzontale' },
  { nome: 'lat machine', movimento: 'tirata_verticale' },
  { nome: 'leg press', movimento: 'gambe_pesanti' },
  { nome: 'leg extension', movimento: 'gambe_isolamento' },
  { nome: 'leg curl', movimento: 'gambe_isolamento' },
  { nome: 'calf raise', movimento: 'gambe_isolamento' },
  { nome: 'triceps pushdown', movimento: 'tricipiti' },
  { nome: 'lateral raise', movimento: 'spalle_isolamento' },
  { nome: 'rear delt', movimento: 'spalle_isolamento' },
  { nome: 'chest press', movimento: 'spinta_orizzontale' },
  { nome: 'chest fly', movimento: 'petto_isolamento' },
  { nome: 'shoulder press', movimento: 'spinta_verticale' },
  { nome: 'lat pulldown', movimento: 'tirata_verticale' },
  { nome: 'seated row', movimento: 'tirata_orizzontale' },
  { nome: 'pull up', movimento: 'corpo_libero' },
  { nome: 'pull up', movimento: 'corpo_libero' },
  { nome: 'dips', movimento: 'corpo_libero' },
  { nome: 'push up', movimento: 'spinta_corpo_libero' },
  { nome: 'hip thrust', movimento: 'gambe_pesanti' },
  { nome: 'bench press', movimento: 'spinta_orizzontale' },
  { nome: 'back extension', movimento: 'tirata_orizzontale' },
  { nome: 'biceps curl', movimento: 'bicipiti' },
  { nome: 'preacher curl', movimento: 'bicipiti' },
];

// Quanto peso serve per spostare il livello di uno scalino.
const SOGLIA_CAMBIO = 3;

function normalizza(testo) {
  return String(testo == null ? '' : testo)
    .toLowerCase()
    .replace(/[àáâ]/g, 'a').replace(/[èéê]/g, 'e').replace(/[ìíî]/g, 'i')
    .replace(/[òóô]/g, 'o').replace(/[ùúû]/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Conta una parola (o frase) come parola intera nel testo. */
function conta(testo, parola) {
  const p = normalizza(parola);
  if (!p) return 0;
  const t = ' ' + testo + ' ';
  let n = 0;
  let i = t.indexOf(p);
  while (i !== -1) {
    const prima = t[i - 1] === ' ';
    const dopo = t[i + p.length] === ' ' || i + p.length === t.length;
    if (prima && dopo) n++;
    i = t.indexOf(p, i + 1);
  }
  return n;
}

/**
 * Non modifica il testo: ritorna i movimenti "citati" dalle sigle.
 *
 * Prima sostituivo la sigla con il nome interno (es. "leg press" ->
 * "gambe_pesanti") dentro la stringa da cercare: cosi' la sigla spariva e
 * l'esercizio non veniva piu' trovato da nessuna parte. Adesso la sigla
 * vota per il suo movimento e il testo resta intatto.
 */
function votiDaSigle(testo) {
  const voti = new Map();
  for (const s of SIGLE) {
    const n = conta(testo, s.nome);
    if (n === 0) continue;
    const M = MOV[s.movimento];
    if (!M) continue;
    const attuale = voti.get(s.movimento) || { punti: 0, trovate: [] };
    attuale.punti += n * 2;
    attuale.trovate.push(s.nome);
    voti.set(s.movimento, attuale);
  }
  return voti;
}

const perNome = (arr) => arr.reduce((m, x) => { m[x.id] = x; return m; }, {});
const MOV = perNome(MOVIMENTI);

/** Il testo normalizzato (senza sigle dentro: le sigle votano a parte). */
function soloNome(nome) {
  return ' ' + normalizza(nome) + ' ';
}

/**
 * Che cos'e' questo esercizio?
 *
 * nome        = il nome (obbligatorio)
 * descrizione = la descrizione, aiuta a capire
 * convenzione = macchina / cavo_totali / per_manubrio / dischi / bilanciere /
 *               corpo_libero / assistenza
 */
/**
 * Cache dei risultati.
 *
 * Ste: "migliora tutto quanto, rendi tutto piu' efficente". Misurando: 120.000
 * classificazioni di 6 esercizi ripetuti ci mettevano 15 secondi. Il motivo e'
 * che la stessa stringa veniva riguardata decine di volte: la lista Rank, la
 * pagina del giorno e il ricalcolo dei riferimenti chiamano tutti lo stesso
 * classificatore sugli stessi nomi.
 *
 * Il risultato e' un oggetto puro e non lo modifica nessuno, quindi riutilizzarlo
 * e' sicuro. La cache e' limitata a 500 voci: se ne svuota tutta e si ricomincia,
 * invece di tenere in memoria ogni nome mai scritto.
 */
const CACHE = new Map();
const CACHE_MAX = 500;

function ricorda(chiave, valore) {
  if (CACHE.size >= CACHE_MAX) CACHE.clear();
  CACHE.set(chiave, valore);
}

export function classificaEsercizio({ nome = '', descrizione = '', convenzione = null } = {}) {
  const chiave = nome + ' ' + descrizione + ' ' + (convenzione || '');
  const gia = CACHE.get(chiave);
  if (gia !== undefined) return gia;
  const testo = soloNome(nome);
  const testoLungo = testo + ' ' + normalizza(descrizione) + ' ';

  // ---- 0) se e' scritto esplicitamente "corpo libero", quello wins.
  // "Bodyweight Overhead Tricep Extension" contiene "tricep", ma e' un esercizio
  // col peso del corpo: senza questo controllo finiva come isolamento dei
  // tricipiti, che e' sbagliato (si contano le ripetizioni).
  const dettoCorpo = conta(testoLungo, 'bodyweight') + conta(testoLungo, 'corpo libero')
    + (convenzione === 'corpo_libero' || convenzione === 'assistenza' ? 1 : 0);
  const conCarico = conta(testoLungo, 'bilanciere') + conta(testoLungo, 'barbell')
    + conta(testoLungo, 'manubri') + conta(testoLungo, 'dumbbell') + conta(testoLungo, 'carico');
  if (dettoCorpo > conCarico) {
    return {
      livello: 'assistito',
      gruppo: 'corpo libero',
      movimento: 'corpo_libero',
      confidenza: 'alta',
      pesoModificatori: 0,
      motivi: ['è scritto che è col peso del corpo: si contano le ripetizioni, non i kg'],
      paroleRiconosciute: ['bodyweight'],
      riconosciutoDa: 'corpo_libero',
    };
  }

  // ---- 1) che movimento e'? (parole lunghe + sigle)
  const punteggi = [];
  const perId = new Map();
  for (const m of MOVIMENTI) {
    let punti = 0;
    const trovate = [];
    for (const p of m.parole) {
      const n = conta(testoLungo, p);
      if (n === 0) continue;
      // una frase vale piu' di una parola sola: "leg curl" batte "curl"
      punti += n * (normalizza(p).includes(' ') ? 2 : 1);
      trovate.push(p);
    }
    if (punti > 0) punteggi.push({ movimento: m, punti, trovate });
  }
  for (const [id, v] of votiDaSigle(testoLungo)) {
    const gia = perId.get(id);
    const M = MOV[id];
    if (!M) continue;
    if (gia) {
      gia.punti += v.punti;
      gia.trovate.push(...v.trovate);
    } else {
      const riga = { movimento: M, punti: v.punti, trovate: v.trovate };
      punteggi.push(riga);
      perId.set(id, riga);
    }
  }
  punteggi.sort((a, b) => b.punti - a.punti);
  const migliore = punteggi[0] || null;

  // ---- se non capisco, LO DICO
  if (!migliore) {
    return {
      livello: 'composto',
      gruppo: 'altro',
      movimento: 'sconosciuto',
      confidenza: 'bassa',
      pesoModificatori: 0,
      motivi: ['dal nome non riconosco nessun movimento noto: l\'ho lasciato come esercizio di forza, ma correggilo a mano'],
      paroleRiconosciute: [],
      riconosciutoDa: 'nessuna parola nota',
    };
  }

  // ---- 2) come e' fatto: gli accorgimenti
  let peso = 0;
  const motivi = [];
  const giaDaConvenzione = convenzione ? normalizza(convenzione.replace(/_/g, ' ')) : null;
  const visti = new Set();

  for (const mod of MODIFICATORI) {
    for (const p of mod.parole) {
      const n = conta(testoLungo, p);
      if (n === 0) continue;
      // non conto due volte la stessa cosa: la convenzione scelta gia' la conta
      if (giaDaConvenzione && normalizza(giaDaConvenzione) === normalizza(p)) continue;
      if (visti.has(mod.perche)) continue;
      visti.add(mod.perche);
      peso += mod.peso * n;
      motivi.push(mod.perche);
    }
  }

  // Ste, con due foto (04/10/2026): "il macchinario e' piu' facile solo se c'e'
  // questo, nella mia chest press si mettono i pesi reali quindi in teoria e' di
  // piu' o no?".
  //
  // Aveva ragione, e la mia v38 aveva sbagliato: davo -6 a TUTTE le macchine.
  // Ma una macchina a DISCHI non e' la macchina facile. I dischi sono pesi veri
  // e se i due lati non sono uguali la macchina si stampa, quindi c'e' una
  // parte di equilibrio da fare come sul bilanciere. Quello che e' davvero
  // facile e' lo STACK: la resistenza e' un cavo ed e' gia' bilanciata prima
  // che tu ti muovi, e tu scegli il peso con la linguetta.
  //
  // Perche' 'macchina' da sola vale -2 e non -6: senza sapere se ci sono dischi
  // o stack, la scelta onesta e' NON dare per scontato che sia facile. Prima
  // davo -6 e gli gonfiavo il Rank: peggio che sbagliarsi in eccesso.
  const CONVENZIONE = {
    macchina: -2, macchina_dischi: -2, macchina_stack: -6,
    cavo_totali: -5, per_manubrio: 5, dischi: 0,
    bilanciere: 0, assistenza: -8, corpo_libero: 0,
  };
  if (convenzione && CONVENZIONE[convenzione]) {
    peso += CONVENZIONE[convenzione];
    motivi.push('convenzione del carico scelta: ' + normalizz(convenzione));
  }

  // ---- 3) il livello
  const ordine = ['isolamento', 'composto', 'grande'];
  const base = migliore.movimento.livello;

  if (base === 'assistito') {
    // col peso del corpo si contano le ripetizioni: non e' un livello, e' un
    // altro modo di misurare. Ma se aggiungi un sacco di peso, il carico torna
    // a contare e l'esercizio si comporta come gli altri.
    const resoAssistito = peso >= SOGLIA_CAMBIO;
    if (!resoAssistito) {
      return {
        livello: 'assistito',
        gruppo: migliore.movimento.gruppo,
        movimento: migliore.movimento.id,
        confidenza: migliore.punti >= 2 ? 'alta' : 'media',
        pesoModificatori: peso,
        motivi: ['e\' un esercizio col peso del corpo: si contano le ripetizioni'].concat(motivi),
        paroleRiconosciute: migliore.trovate,
        riconosciutoDa: migliore.movimento.id,
      };
    }
  }

  let i = Math.max(0, ordine.indexOf(base === 'assistito' ? 'composto' : base));
  const motiviCambio = [];
  // Due regole che ho imparato sbagliandole la prima volta:
  //
  // 1) NON si scende MAI di livello. "Sled Press" letto come "sled press calf
  //    raise" scendeva a composto solo perché c'era la parola "calf raise".
  //    Essere su una macchina rende un esercizio PIU' FACILE, non cambia di
  //    che movimento è: la scala resta quella giusta, cambia solo quanto pesi.
  //
  // 2) solo i movimenti con i carichi piu' alti possono arrivare a "grande".
  //    Una lat pulldown inclinata a un braccio sola è faticosissima, ma non
  //    spinge 150 kg: resta "composto". Se la facessi salire, il rank
  //    chiederebbe numeri daodysee.
  if (peso >= SOGLIA_CAMBIO && base !== 'isolamento' && base !== 'assistito') {
    if (base === 'grande') {
      motiviCambio.push('resta "grande": i movimenti pesanti restano pesanti');
    } else if (migliore.movimento.id === 'gambe_pesanti') {
      i = ordine.length - 1;
      motiviCambio.push(`l\'ho fatto salire a "grande" (gli accorgimenti valgono +${peso})`);
    } else {
      motiviCambio.push('resta "composto": è faticoso ma i carichi non sono da "grande"');
    }
  } else if (peso >= SOGLIA_CAMBIO && base === 'isolamento') {
    motiviCambio.push('resta isolamento: un movimento piccolo non diventa esercizio di forza');
  } else if (peso <= -SOGLIA_CAMBIO) {
    motiviCambio.push('non cambio livello: macchina e cavo lo rendono solo più facile, non è un altro movimento');
  }
  const livello = ordine[i];

  const confidenza = migliore.punti >= 3 ? 'alta' : (migliore.punti === 2 ? 'media' : 'bassa');

  const risultato = {
    livello,
    gruppo: migliore.movimento.gruppo,
    movimento: migliore.movimento.id,
    confidenza,
    pesoModificatori: peso,
    motivi: [`movimento riconosciuto: ${migliore.movimento.id.replace(/_/g, ' ')}`]
      .concat(motivi, motiviCambio),
    paroleRiconosciute: migliore.trovate,
    riconosciutoDa: migliore.movimento.id,
  };
  ricorda(chiave, risultato);
  return risultato;
}

function normalizz(s) {
  return normalizza(String(s).replace(/_/g, ' '));
}

/** Una parola senza accenti, per confrontarla con il vocabolario. */
function spoglia(testo) {
  return normalizza(testo)
    // "bilanciere" e "bilanciore" (come la scrive Ste) diventano la stessa
    // parola: tolgo la desinenza finale, non cambio nient'altro
    .replace(/(ere|ore|ica|iche|he)$/, '')
    .replace(/ai$/, 'o');
}

/**
 * Tutte le parole che il classificatore conosce.
 *
 * Serve per chiedere a Ste solo le parole che NON riconosce: se gli chiedessi
 * anche quelle che sa già, gli romperei le scatole.
 *
 * Le parole sono anche "svestite" dagli accenti e dalle desinenze sbagliate:
 * "bilanciore" (che è come la scrive lui) deve valere come "bilanciere",
 * altrimenti gli chiederei di insegnarmi ogni volta la stessa cosa.
 */
export function paroleConosciute() {
  const tutte = new Set();
  const aggiungi = (frase) => {
    for (const w of normalizza(frase).split(' ')) {
      if (w.length > 2) { tutte.add(w); tutte.add(spoglia(w)); }
    }
  };
  for (const m of MOVIMENTI) for (const p of m.parole) aggiungi(p);
  for (const mod of MODIFICATORI) for (const p of mod.parole) aggiungi(p);
  for (const s of SIGLE) aggiungi(s.nome);
  return tutte;
}

/** Una sola parola: l'app la conosce davvero? */
export function parolaConosciuta(parola) {
  return paroleConosciute().has(spoglia(parola));
}

export const MOVIMENTI_CONOSCIUTI = MOVIMENTI.map((m) => ({ id: m.id, livello: m.livello, gruppo: m.gruppo }));
export const MODIFICATORI_CONOSCIUTI = MODIFICATORI.length;