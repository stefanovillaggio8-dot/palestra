// Ricerca unica degli esercizi: usata sia per la modifica della scheda
// sia per "Prova un esercizio" nei Rank. Niente ricerca solo per prefisso.
export function testoRicercaEsercizi(valore) {
  return String(valore ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}


// Dizionario di parole equivalenti per il catalogo. I nomi originali NON
// vengono tradotti o riscritti: sono soltanto chiavi di ricerca aggiuntive.
// Sono compresi nomi colloquiali usati in palestra in italiano.
const FAMIGLIE_TERMINI = [
  ['dumbbell', 'dumbbells', 'db', 'manubrio', 'manubri'],
  ['barbell', 'bar', 'bilanciere', 'bilancieri'],
  ['cable', 'cables', 'cavo', 'cavi', 'carrucola'],
  ['machine', 'macchina', 'macchine'],
  ['smith', 'multipower', 'guidato', 'guidata'],
  ['bench', 'panca', 'panche'],
  ['incline', 'inclinata', 'inclinato', 'inclinazione'],
  ['decline', 'declinata', 'declinato', 'declinazione'],
  ['flat', 'piana', 'piano'],
  ['press', 'distensione', 'distensioni', 'spinta', 'spinte'],
  ['raise', 'raises', 'alzata', 'alzate', 'elevazione', 'elevazioni'],
  ['lateral', 'laterale', 'laterali'],
  ['reverse', 'inversa', 'inverso', 'inverse', 'inversi'],
  ['fly', 'flies', 'croce', 'croci', 'apertura', 'aperture'],
  ['row', 'rows', 'rematore', 'rematori', 'remata', 'remate'],
  ['pulldown', 'tirata', 'tirate', 'latmachine'],
  ['pull', 'tirare', 'tirata', 'tirate'],
  ['pullup', 'pullups', 'trazione', 'trazioni', 'sbarra'],
  ['pushdown', 'spinta', 'spinte', 'basso'],
  ['deadlift', 'stacco', 'stacchi'],
  ['romanian', 'rumeno', 'rumena'],
  ['curl', 'curl'], // "flessioni" non e' sinonimo di tutti i curl
  ['hammer', 'martello'],
  ['preacher', 'scott'],
  ['spider', 'spider'],
  ['concentration', 'concentrato', 'concentrata', 'concentrazione'],
  ['bicep', 'biceps', 'bicipite', 'bicipiti'],
  ['tricep', 'triceps', 'tricipite', 'tricipiti'],
  ['shoulder', 'shoulders', 'spalla', 'spalle'],
  ['chest', 'petto', 'pettorali', 'pettorale'],
  ['back', 'schiena', 'dorso', 'dorsali'],
  ['lat', 'dorsale', 'dorsali'],
  ['delt', 'deltoide', 'deltoidi'],
  ['rear', 'dietro', 'posteriore', 'posteriori'],
  ['front', 'avanti', 'anteriore', 'anteriori'],
  ['leg', 'legs', 'gamba', 'gambe'],
  ['calf', 'calves', 'polpaccio', 'polpacci'],
  ['hamstring', 'hamstrings', 'femorale', 'femorali'],
  ['quad', 'quads', 'quadricipite', 'quadricipiti'],
  ['glute', 'glutes', 'gluteo', 'glutei'],
  ['hip', 'anca', 'anche', 'bacino'],
  ['wrist', 'polso', 'polsi'],
  ['crunch', 'addominale', 'addominali'],
  ['extension', 'extensions', 'estensione', 'estensioni'],
  ['overhead', 'sopratesta', 'sopra', 'testa'],
  ['seated', 'seduto', 'seduta'],
  ['standing', 'piedi'],
  ['lying', 'sdraiato', 'sdraiata', 'disteso', 'distesa'],
  ['single', 'one', 'singolo', 'singola', 'uno', 'una'],
  ['double', 'two', 'doppio', 'doppia', 'due'],
  ['arm', 'arms', 'braccio', 'braccia'],
  ['wide', 'larga', 'largo', 'ampie', 'ampia', 'ampio'],
  ['close', 'stretta', 'stretto'],
  ['neutral', 'neutra', 'neutro'],
  ['grip', 'presa', 'impugnatura'],
  ['high', 'alta', 'alto'],
  ['low', 'bassa', 'basso'],
  ['shrug', 'shrugs', 'scrollata', 'scrollate'],
  ['hyperextension', 'hyperextensions', 'iperestensione', 'iperestensioni', 'lombari'],
  ['pullover', 'pullover'],
  ['squat', 'accosciata'],
  ['lunge', 'lunges', 'affondo', 'affondi'],
  ['sled', 'slitta'],
];

// I termini generici sono utili ma non bastano per espressioni come
// "panca piana" o "lat machine". Le frasi si aggiungono solo al movimento
// realmente indicato, evitando di associare "piana" alla panca inclinata.
const FRASI_ESERCIZI = [
  [/\blat pulldown\b/, 'lat machine latmachine'],
  [/\bpreacher curl\b/, 'panca scott'],
  [/\bcad curl\b/, 'panca scott al contrario scott inversa inverso'],
  [/\bleg curl\b/, 'flessione flessioni gambe femorali'],
  [/\bleg press\b/, 'pressa gambe'],
  [/\bcalf raise\b/, 'sollevamenti polpacci punte piedi'],
  [/\bface pull\b/, 'tirate viso faccia'],
  [/\b(?:one|single) arm\b/, 'monobraccio monolaterale unilaterale'],
  [/\b(?:pull up|pull ups|pullup|pullups)\b/, 'trazioni sbarra'],
  [/\bdips?\b/, 'parallele'],
  [/\bpush ?ups?\b/, 'piegamenti flessioni braccia'],
  [/\b(?:bench press)\b/, 'panca distensioni'],
  [/\b(?:cable fly)\b/, 'croci ai cavi'],
  [/\b(?:chest supported)\b/, 'petto appoggiato panca'],
  [/\b(?:bent over)\b/, 'busto flesso busto piegato'],
  [/\b(?:deadlift)\b/, 'stacco terra'],
  [/\b(?:overhead)\b/, 'sopra la testa'],
  [/\b(?:tricep pushdown)\b/, 'spinte tricipiti verso basso'],
];

const ALIAS_PER_PAROLA = new Map();
for (const famiglia of FAMIGLIE_TERMINI) {
  const parole = [...new Set(famiglia.map(testoRicercaEsercizi).filter(Boolean))];
  for (const parola of parole) {
    if (!ALIAS_PER_PAROLA.has(parola)) ALIAS_PER_PAROLA.set(parola, new Set());
    for (const alias of parole) ALIAS_PER_PAROLA.get(parola).add(alias);
  }
}

const PAROLE_CONNETTIVE = new Set([
  'a', 'ad', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'con', 'da',
  'dal', 'dalla', 'dei', 'del', 'dello', 'della', 'delle', 'di',
  'e', 'ed', 'i', 'il', 'in', 'la', 'le', 'lo', 'per', 'su', 'sul',
  'sulla', 'un', 'una', 'uno', 'the', 'and', 'with', 'of',
]);

/**
 * Indicizza il nome inglese anche con le possibili parole italiane.
 * Espande SOLO il testo dell'esercizio, non la ricerca dell'utente:
 * "rematore manubri" trova "Dumbbell Row", ma "manubri" non fa
 * comparire un esercizio solo con il bilanciere.
 */
function testoIndicizzatoEsercizio(testo, nomeOriginale) {
  const normalizzato = testoRicercaEsercizi(testo);
  const nomeNormalizzato = testoRicercaEsercizi(nomeOriginale);
  const parole = new Set(normalizzato.split(' ').filter(Boolean));
  for (const parola of [...parole]) {
    for (const sinonimo of ALIAS_PER_PAROLA.get(parola) || []) parole.add(sinonimo);
  }
  for (const [pattern, sinonimi] of FRASI_ESERCIZI) {
    if (pattern.test(nomeNormalizzato)) {
      for (const parola of sinonimi.split(' ')) parole.add(parola);
    }
  }
  // "Panca piana" solo per il bench press NON inclinato/declinato.
  if (/\bbench press\b/.test(nomeNormalizzato)
      && !/\b(incline|decline|inclinata|declinata)\b/.test(nomeNormalizzato)) {
    parole.add('piana');
    // Senza manubri, cavi o Smith, "Bench Press" indica il bilanciere.
    if (!/\b(dumbbell|cable|smith)\b/.test(nomeNormalizzato)) parole.add('bilanciere');
  }
  return [...parole].join(' ');
}

/**
 * Tutte le parole digitate devono comparire, ma possono essere in qualunque
 * punto e in qualunque ordine del nome o del muscolo.
 * Es.: "preacher" trova "One Arm Dumbbell Preacher Curl";
 * "curl preacher" funziona anche se il nome dice "Preacher Curl".
 */
export function corrispondeRicercaEsercizi(voce, ricerca = '') {
  const parole = testoRicercaEsercizi(ricerca).split(' ')
    .filter(parola => parola && !PAROLE_CONNETTIVE.has(parola));
  if (!parole.length) return true;
  const e = voce && (voce.e || voce.esercizio || voce);
  if (!e) return false;
  const campi = [
    e.nome, e.gruppo,
    voce.gruppo, voce.generale, voce.nomeMuscolo, voce.parte,
    // La descrizione del catalogo resta utile per eventuali sinonimi.
    e.descrizione,
  ];
  const completo = testoIndicizzatoEsercizio(campi.filter(Boolean).join(' '), e.nome);
  return parole.every((parola) => completo.includes(parola));
}

export function filtraEserciziPerRicerca(voci, ricerca = '') {
  return (Array.isArray(voci) ? voci : [])
    .filter((voce) => corrispondeRicercaEsercizi(voce, ricerca));
}
