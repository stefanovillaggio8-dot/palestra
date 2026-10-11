// avatar-stato.js -- lo stato dell'avatar: la struttura dati e le regole.
//
// Ste (10/10/2026): "ho bisogno che tu generi la struttura dati e la logica di
// backend per gestire l'avatar dell'utente".
//
// TRE REQUISITI CHE SONO ANCHE TRE VINCOLI DURE.
//
//  1. LA CLASSE È PER SEMPRE.
//     "Una volta che l'utente sceglie la classe, questa scelta è permanente e non
//     può essere modificata."
//
//     Nell'app il vincolo NON c'era: il bottone della classe salvava ogni volta che
//     lo premevi, e il testo diceva anche "cambia quando ti pare". Con quello, un
//     Assassino a 60 giorni di streak poteva diventare Berserker e ricominciare da
//     capo con l'equipaggiamento: non solo era)vietato, era anche conveniente.
//
//     Qui la scelta passa da `scegliClasse()` che ha dentro il blocco: se il
//     personaggio esiste già, la funzione RIFIUTA, non avvisa. Un vincolo che
//     "avvisa e poi lascia passare" non è un vincolo.
//
//  2. LA PROGRESSIONE VIENE DALLA STREAK, E SOLO DA LEI.
//     "L'avatar deve cambiare aspetto automaticamente in base alla streak attuale."
//
//     Prima servivano streak E statistiche. Con la regola nuova basta la streak:
//     chi allena tre giorni di fila ha i bracciali, e non importa se in quei tre
//     giorni ha fatto trazioni o panca.
//
//  3. GLI OGGETTI SONO CUMULATIVI.
//     Non si tolgono. Un bracciale sbloccato resta addosso per sempre, e la
//     progressione è visibile perché ogni gradino aggiunge un pezzo.
//
// ---------------------------------------------------------------------------
// LA STRUTTURA DATI
// ---------------------------------------------------------------------------
//
//   {
//     userId:            string   // l'account che possiede l'avatar
//     characterCreated:  boolean  // true = la classe è già stata scelta, ed è definitiva
//     baseModelId:       Classe   // 'guerriero' | 'berserker' | 'assassino'
//     createdAt:         string   // quando è stato creato (ISO), serve a capire da quanto
//     currentStreak:      number   // il record di giorni di fila: è l'unico input
//     equippedVisuals:   {         // slot del corpo -> pezzo attualmente acceso
//       bracciali: string | null,
//       torso:    string | null,
//       protezione:string | null,
//       arma:     string | null,
//       completo: string | null,
//       aura:     string | null,
//     }
//   }
//
// Perché `characterCreated` sta DENTRO il profilo e non si deduce da `baseModelId`:
// perché la differenza tra "non hai scelto" e "hai scelto e non lo vedo" è una che
// conta. Se `baseModelId` fosse vuoto per un errore di lettura, un flag separato
// continua a dire che la scelta c'è stata e l'app non te la fa rifare.
//
// Perché `equippedVisuals` sta nello stato e non si ricalcola ogni volta: perché è
// CUMULATIVO. Ricalcolarlo da `currentStreak` a ogni schermata funzionerebbe solo
// finché la streak non cala mai, e la streak cala: se smetti tre giorni, il
// personaggio si spoglerebbe da dosso. Tenendo lo stato, quello che hai ottenuto
// resta tu.

/** Le tre classi. L'id è anche il nome dell'immagine del personaggio. */
export const CLASSI_AVATAR = ['guerriero', 'berserker', 'assassino'];

/** Gli slot del corpo, nell'ordine in cui si coprono. */
export const SLOT = ['bracciali', 'torso', 'protezione', 'arma', 'completo', 'aura'];

/**
 * LA PROGRESSIONE.
 *
 * Le soglie sono quelle di Ste (10/10/2026). I pezzi sono DIVERSI per classe, presi
 * dalle schede che mi ha mandato:
 *
 *   GUERRIERO   bracciali → armatura di cuoio → armatura di ferro → spada → completo → aura
 *   BERSERKER   bracciali → pelo e pelliccia  → armatura di ferro → ascia → completo → aura
 *   ASSASSINO   bracciali → vesti leggeri      → cintura       → pugnale → completo → aura
 *
 * Nota sul berserker: il "pelo e pelliccia" resta SOTTO l'armatura di ferro. Nella
 * scheda sono due pezzi separati, quindi lo sono anche qui: se la pelliccia
 * sparisce quando arriva il ferro, gli indumenti non sono più due.
 */
export const PROGRESSIONE = {
  guerriero: [
    { slot: 'bracciali',  streak: 3,  pezzo: 'bracciali-cuoio',    nome: 'Bracciali di cuoio' },
    { slot: 'torso',     streak: 7,  pezzo: 'armatura-cuoio',     nome: 'Armatura di cuoio' },
    { slot: 'protezione', streak: 15, pezzo: 'armatura-ferro',     nome: 'Armatura di ferro' },
    { slot: 'arma',      streak: 30, pezzo: 'spada',              nome: 'Spada' },
    { slot: 'completo',  streak: 50, pezzo: 'armatura-leggendaria', nome: 'Armatura leggendaria' },
    { slot: 'aura',      streak: 75, pezzo: 'aura-divina',        nome: 'Aura divina' },
  ],
  berserker: [
    { slot: 'bracciali',  streak: 3,  pezzo: 'bracciali-cuoio',    nome: 'Bracciali di cuoio' },
    { slot: 'torso',     streak: 7,  pezzo: 'pelo-pelliccia',     nome: 'Pelo e pelliccia' },
    { slot: 'protezione', streak: 15, pezzo: 'armatura-ferro',     nome: 'Armatura di ferro' },
    { slot: 'arma',      streak: 30, pezzo: 'ascia-guerra',       nome: 'Ascia da guerra' },
    { slot: 'completo',  streak: 50, pezzo: 'armatura-leggendaria', nome: 'Armatura leggendaria' },
    { slot: 'aura',      streak: 75, pezzo: 'aura-divina',        nome: 'Aura divina' },
  ],
  assassino: [
    { slot: 'bracciali',  streak: 3,  pezzo: 'bracciali-cuoio',    nome: 'Bracciali di cuoio' },
    { slot: 'torso',     streak: 7,  pezzo: 'vesti-leggeri',      nome: 'Vesti leggeri' },
    { slot: 'protezione', streak: 15, pezzo: 'cintura-assassino', nome: 'Cintura da assassino' },
    { slot: 'arma',      streak: 30, pezzo: 'pugnale',            nome: 'Pugnale' },
    { slot: 'completo',  streak: 50, pezzo: 'manto-sombrio',      nome: 'Manto di ombra' },
    { slot: 'aura',      streak: 75, pezzo: 'aura-divina',        nome: 'Aura divina' },
  ],
};

/**
 * Uno stato nuovo, vuoto.
 *
 * `characterCreated` parte `false`: il personaggio non esiste finché non scegli.
 */
export function statoIniziale(userId, oraIso) {
  return {
    userId,
    characterCreated: false,
    baseModelId: null,
    createdAt: null,
    currentStreak: 0,
    equippedVisuals: vuoto(),
  };
}

function vuoto() {
  const o = {};
  for (const s of SLOT) o[s] = null;
  return o;
}

/**
 * Crea il personaggio. UNA VOLTA sola.
 *
 * @returns lo stato nuovo, oppure lo stato di prima SE non si può cambiare.
 *          Per sapere quale dei due è successo guarda `creato`.
 */
export function creaPersonaggio(stato, classe, oraIso) {
  if (stato.characterCreated) {
    // IL VINCOLO. Non un avviso: un rifiuto. Se qui si lasciasse passare, il
    // personaggio si ricreerebbe e perderei tutto l'equipaggiamento.
    return { stato, creato: false, perche: 'il personaggio è già stato creato' };
  }
  if (!CLASSI_AVATAR.includes(classe)) {
    return { stato, creato: false, perche: `classe "${classe}" non esiste` };
  }
  const nuovo = {
    ...stato,
    characterCreated: true,
    baseModelId: classe,
    createdAt: oraIso || null,
  };
  return { stato: nuovo, creato: true, perche: null };
}

/**
 * Il personaggio al dato livello di streak. NON tocca lo stato: dice soltanto cosa
 * si indosserebbe.
 *
 * È separata da `avanza` apposta: così si può provare "e se domani avessi 40
 * giorni?" senza scrivere niente nel database.
 */
export function equipaggiamentoPer(stato, currentStreak) {
  const out = vuoto();
  if (!stato.characterCreated || !stato.baseModelId) return out;
  const scala = PROGRESSIONE[stato.baseModelId] || [];
  for (const gradino of scala) {
    if (currentStreak >= gradino.streak) out[gradino.slot] = gradino.pezzo;
  }
  return out;
}

/**
 * Avanza l'avatar. Cumulativo: un pezzo non si sblocca MAI e non si toglie.
 *
 * La streak può anche calare, e va bene. Quello che hai ottenuto resta.
 */
export function avanza(stato, currentStreak) {
  const ottenuto = equipaggiamentoPer(stato, currentStreak);
  const dopo = { ...stato, currentStreak, equippedVisuals: { ...stato.equippedVisuals } };
  const nuovi = [];
  for (const slot of SLOT) {
    const pezzo = ottenuto[slot];
    if (pezzo && !dopo.equippedVisuals[slot]) {
      dopo.equippedVisuals[slot] = pezzo;
      const gradino = (PROGRESSIONE[dopo.baseModelId] || []).find((g) => g.slot === slot);
      nuovi.push({ slot, pezzo, nome: gradino ? gradino.nome : pezzo });
    }
  }
  return { stato: dopo, nuovi };
}

/** Il prossimo gradino, e quanti giorni mancano. Serve per "ti mancano N giorni". */
export function prossimoGradino(stato) {
  if (!stato.characterCreated || !stato.baseModelId) return null;
  const scala = PROGRESSIONE[stato.baseModelId] || [];
  const g = scala.find((x) => !stato.equippedVisuals[x.slot]);
  if (!g) return null;
  return { ...g, mancano: Math.max(0, g.streak - (stato.currentStreak || 0)) };
}

/** Quanti pezzi sono addosso, su quanti. */
export function conteggio(stato) {
  const addosso = SLOT.filter((s) => !!stato.equippedVisuals[s]).length;
  return { addosso, totale: SLOT.length };
}