// Riferimenti specifici documentati: NON si ricalibrano in base ai record di
// un singolo utente (altrimenti il Rank cambierebbe proprio mentre migliora).
// Il riconoscimento e' automatico e offline SOLO per esercizi compatibili.
// Tutti i riferimenti qui sotto sono 1RM maschili, percentili p5/p20/p50/p80/p95
// della community Strength Level, per peso corporeo (kg), snapshot 05/03/2026.
// La tecnica individuale, le macchine e il cedimento non sono verificati.
const RIGHE = {
  dumbbell_bench_press: [[65,14,22,33,45,58],[75,17,26,37,51,65],[85,21,30,42,56,71]],
  incline_dumbbell_bench_press: [[65,16,23,32,42,53],[75,20,27,37,48,59],[85,23,32,42,53,65]],
  seated_dumbbell_shoulder_press: [[65,13,19,27,36,46],[75,16,23,32,41,52],[85,19,27,36,46,57]],
  dumbbell_row: [[65,14,23,35,49,65],[75,17,27,40,56,73],[85,21,32,46,62,80]],
  dumbbell_curl: [[65,6,11,19,28,38],[75,8,13,21,30,41],[85,9,15,23,33,44]],
  hammer_curl: [[65,8,13,20,28,37],[75,10,15,23,31,41],[85,12,18,25,34,44]],
  dumbbell_lateral_raise: [[65,4,8,14,22,31],[75,5,9,16,24,33],[85,6,10,17,26,35]],
  lat_pulldown: [[65,39,54,73,95,118],[75,44,61,81,104,128],[85,50,67,88,112,137]],
  seated_cable_row: [[65,37,53,73,96,122],[75,44,61,83,107,134],[85,50,69,91,117,145]],
  seated_leg_curl: [[65,31,49,72,99,128],[75,36,55,79,108,139],[85,41,61,86,116,148]],
};
const URL = 'https://strengthlevel.com/strength-standards/';
const standard = (slug, attrezzo, ids, altriNomi = [], riserva = '') => ({
  slug, attrezzo, ids, nomi: altriNomi, righe: RIGHE[slug], url: URL + slug.replaceAll('_','-') + '/kg', riserva,
});
// Attrezzo richiesto: non applicare il totale di una macchina allo score
// "per braccio" di una chest press a dischi o a un EZ bar improprio.
const STANDARD_SPECIFICI = [
  standard('dumbbell_bench_press','manubri',['ex-dumbbell-bench-press'],['Dumbbell Bench Press']),
  standard('incline_dumbbell_bench_press','manubri',['ex-incline-dumbbell-bench-press'],['Incline Dumbbell Bench Press']),
  standard('seated_dumbbell_shoulder_press','manubri',['ex-seated-db-shoulder-press'],['Seated Dumbbell Shoulder Press']),
  standard('dumbbell_row','manubri',['ex-dumbbell-row'],['Dumbbell Row']),
  standard('dumbbell_curl','manubri',['ex-dumbbell-curl'],['Dumbbell Curl']),
  standard('hammer_curl','manubri',['ex-hammer-curl-dumbbell'],['Hammer Curl (Dumbbell)','Hammer Curl']),
  standard('dumbbell_lateral_raise','manubri',['ex-db-lateral-raise'],['Dumbbell Lateral Raise']),
  standard('lat_pulldown','stack',['ex-neutral-grip-lat-pulldown','ex-wide-grip-lat-pulldown','ex-lat-pulldown-lats'],
    ['Lat Pulldown'], 'I riferimenti pubblicati non separano questa presa o il modello specifico di lat machine.'),
  standard('seated_cable_row','cavo_stack',['ex-seated-cable-row'],
    ['Seated Cable Row'], 'La resistenza del pulley cambia col rapporto della macchina: lo standard sulla pila e soltanto indicativo.'),
  standard('seated_leg_curl','stack',['ex-seated-leg-curl'],
    ['Seated Leg Curl'], 'Lo stesso peso sulla pila puo dare resistenze diverse secondo camme e leve della macchina.'),
];

export const STANDARD_CALIBRAZIONE_ESTERNI = Object.freeze(STANDARD_SPECIFICI);

export function normalizzaNomeStandard(nome) {
  return String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}

export function tipoAttrezzaturaRank(esercizio = {}) {
  const e = esercizio || {};
  const cv = String(e.convenzione || '');
  const idNome = (String(e.id || '') + ' ' + String(e.nome || '')).toLowerCase();
  if (cv === 'zavorri') return 'zavorra';
  if (cv === 'corpo_libero') return 'corpo_libero';
  if (e.carrucola === 'carrucola_doppia') return 'cavo_2a1_dichiarato';
  if (e.carrucola === 'carrucola_mono') return e.attrezzatura === 'macchina_stack'
    ? 'cavo_stack_1a1_dichiarato' : 'cavo_1a1_dichiarato';
  if (cv === 'cavo') return 'cavo_rapporto_ignoto';
  if (/smith|multipower/.test(idNome)) return 'smith_dischi_senza_barra';
  // La monogamba NON e' uno stack bilaterale: riconoscerla prima dello stack
  // impedisce di applicare automaticamente standard a due gambe.
  if (cv === 'per_gamba') return e.attrezzatura === 'macchina_stack'
    ? 'macchina_stack_monogamba' : 'per_gamba';
  if (e.attrezzatura === 'macchina_dischi') return cv === 'per_braccio' ? 'macchina_dischi_per_braccio' : 'macchina_dischi';
  if (e.attrezzatura === 'macchina_stack') return 'macchina_stack';
  if (cv === 'per_manubrio') return /(?:^|\b)(?:ez bar|bilanciere ez)(?:\b|$)/.test(idNome)
    ? 'convenzione_da_verificare' : 'manubri';
  if (cv === 'per_braccio') return 'per_braccio_attrezzo_non_noto';
  if (cv === 'bilanciere') return 'bilanciere';
  return e.attrezzatura || 'non_identificato';
}

const compatibile = (tipo, attrezzo) => {
  if (attrezzo === 'manubri') return tipo === 'manubri';
  if (attrezzo === 'stack') return tipo === 'macchina_stack';
  if (attrezzo === 'cavo_stack') return tipo === 'cavo_stack_1a1_dichiarato';
  return false;
};

/**
 * Match esatto per ID oppure per nome dell'esercizio, MA SOLO con la stessa
 * convenzione fisica: l'utente puo aggiungere nuovi esercizi e il sistema
 * riconosce automaticamente quelli di cui esistono dati compatibili.
 * Non consulta internet durante l'allenamento e non altera i riferimenti.
 */
export function standardAutomaticoPerEsercizio(esercizio = {}) {
  const e = esercizio || {};
  const tipo = tipoAttrezzaturaRank(e);
  const nome = normalizzaNomeStandard(e.nome);
  const profilo = STANDARD_SPECIFICI.find(s =>
    compatibile(tipo, s.attrezzo)
    && (s.ids.includes(e.id) || s.nomi.some(n => normalizzaNomeStandard(n) === nome)));
  if (!profilo) return null;
  // Le prese diverse, le camme e le pile a peso nominale non consentono di
  // fingere una precisione uguale ai manubri liberi.
  const riserva = profilo.riserva;
  return {
    soglie1RMPerPeso: profilo.righe,
    fonte: 'strengthlevel_esercizio',
    affidabilitaBase: riserva ? 'indicativa' : 'media',
    fonteUrl: profilo.url,
    riferimentoNome: profilo.slug.replaceAll('_',' '),
    limite: 'Standard di una community maschile, non misurazione controllata della tecnica.',
    nota: riserva || 'Stesso movimento e stessa unita di carico dello standard pubblicato.',
    tipoAttrezzatura: tipo,
    dataFonte: '2026-03-05',
  };
}

export function descriviAttrezzaturaRank(esercizio) {
  const t = tipoAttrezzaturaRank(esercizio);
  const msg = {
    manubri: 'Chilogrammi di un manubrio, non sommare i due lati.',
    bilanciere: 'Chilogrammi registrati sul bilanciere; verifica se includono o escludono la barra.',
    macchina_stack: 'Chilogrammi indicati sulla pila; camme e leve possono cambiare la resistenza.',
    macchina_dischi: 'Chilogrammi di dischi caricati; non equiparare al carico di una pila.',
    macchina_dischi_per_braccio: 'Dischi per braccio, senza sommare due volte i lati.',
    cavo_2a1_dichiarato: 'Rapporto 2:1 configurato: il motore conta meta della pila su una maniglia. Verifica la marcatura della macchina.',
    cavo_1a1_dichiarato: 'Rapporto 1:1 configurato: i kg dichiarati restano invariati.',
    cavo_stack_1a1_dichiarato: 'Cavo a pila 1:1 dichiarato; confronta solo macchine col medesimo sistema.',
    cavo_rapporto_ignoto: 'Rapporto del cavo non verificato: nessun dimezzamento automatico.',
    smith_dischi_senza_barra: 'Smith/MultiPower: solo dischi registrati, barra esclusa come da impostazione.',
    macchina_stack_monogamba: 'Pila utilizzata su una gamba: non confondere con standard bilaterali.',
    convenzione_da_verificare: 'Attenzione: un esercizio con EZ bar e contrassegnato come per manubrio.',
  };
  return msg[t] || 'Tipo di attrezzo non pienamente identificato: standard soltanto indicativo.';
}
