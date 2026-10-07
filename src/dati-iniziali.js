// dati-iniziali.js -- le schede e la lista degli esercizi.
// Non viene mai riscritta a runtime: se modifichi una scheda, nasce una nuova
// versione e lo storico resta quello che era.
//
// Ci sono due persone, ognuna con la sua scheda e i suoi allenamenti. Si
// sceglie dalla URL: ?p=2 (oppure ?p=1, che e' il default). Ogni persona ha un
// id scheda proprio, quindi niente si mescola.

import { CONVENZIONI as C } from './numeri.js';

export const SCHEDA_ID = 'scheda-gym-3';
export const SCHEDA_NOME = 'Palestra';

/**
 * Le persone che usano l'app. L'ordine non conta, conta l'id nella URL.
 *
 * Ogni riga e' un ACCOUNT a se' stante: ha il suo username, il suo avatar, la
 * sua scheda, i suoi allenamenti e i suoi rank. Quello che si vede nelle
 * classifiche e' il record MIGLIORE di ciascuno su ciascun esercizio.
 *
 * Per aggiungere un amico basta mettere una riga qui dentro (o usare
 * l'elenco CONTATTI): nient'altro da cambiare.
 */
export const PERSONE = [
  {
    id: 1, nome: 'Stefano', username: 'Stefano', nomeScheda: 'Palestra', schedaId: SCHEDA_ID,
    predefinita: true, amministratore: true, avatar: 'fiamma', amici: [2], colore: '#ff9f45',
  },
  {
    id: 2, nome: 'Andrea', username: 'Andrea', nomeScheda: 'Palestra A', schedaId: 'scheda-altro-1',
    predefinita: false, amministratore: false, avatar: 'ciano', amici: [1], colore: '#00e5ff',
  },
];

/**
 * La lista degli amici che ancora non hanno un account con una scheda.
 * Serve per la sezione Amici: sono account "da collegare", quindi non hanno
 * record e non compaiono in nessuna classifica (niente dati inventati).
 */
export const CONTATTI = [
  // Ste (04/10/2026): "chiama il profilo 'altro' 'Andrea' e mettilo nella tua
  // lista". Il contatto si chiama Andrea e il gruppo in cui finisce è "altro",
  // quindi non viene trattato come un amico con cui confrontare i rank: è solo
  // una persona da aggiungere, con la sua scheda chiusa dietro il codice.
  { username: 'Andrea', gruppo: 'altro', avatar: 'viola', stato: 'da collegare' },
  { username: 'Marco', gruppo: 'altro', avatar: 'verde', stato: 'da collegare' },
  { username: 'Luca', gruppo: 'altro', avatar: 'oro', stato: 'da collegare' },
];

/** L'id dell'account (stringa) a partire dal numero della persona. */
export function accountId(numero) {
  return 'account-' + numero;
}

/**
 * La persona che si crea quando qualcuno apre il link e scrive il suo nome.
 *
 * Ste (06/10/2026): "quando un amico apre il link vede Stefano. Deve chiedere il
 * nome e diventare se stesso".
 *
 * Tre regole, decise insieme:
 *   1) la scheda e' una COPIA di quella di Ste ma SENZA le sue serie;
 *   2) chi sei si ricorda con dispositivo E url, e l'url vince sempre;
 *   3) nessuno finisce nella lista di Ste se non lo aggiunge lui.
 *
 * La `chiave` non e' un vezzo: senza, due amici con lo stesso nome finirebbero
 * sulla stessa scheda e si scriverebbero addosso. Con la chiave, due link diversi
 * sono due persone diverse anche se si chiamano uguale.
 *
 * `amici` parte vuoto e `amministratore` false: nessuno nasce con i tuoi poteri e
 * nessuno nasce nella tua lista. Nomi e amici sono di Ste, non del codice.
 */
export function personaDaNome(nome, chiave) {
  const n = String(nome || '').trim();
  const k = String(chiave || '').trim();
  if (!n || !k) return null;
  return {
    id: k,
    nome: n,
    username: n,
    nomeScheda: 'Palestra di ' + n,
    schedaId: 'scheda-' + k,
    predefinita: false,
    amministratore: false,
    avatar: 'vuoto',
    amici: [],
    chiave: k,
    creata: true,
  };
}

/** Ricostruisce la persona da quello che si e' scritto nella memoria del dispositivo. */
export function personaDaMemoria(memoria) {
  if (!memoria || typeof memoria !== 'object') return null;
  if (memoria.p !== undefined && memoria.p !== null) {
    return PERSONE.find((p) => p.id === Number(memoria.p)) || null;
  }
  if (memoria.n && memoria.k) return personaDaNome(memoria.n, memoria.k);
  return null;
}

/** Una stringa dentro un campo dell'URL, per chi si chiama "a b" o "a&b". */
function campoUrl(qs, nome) {
  // si ferma anche al pezzo di scheda (#/seduta/...): nel browser vero quello non
  // sta nella query, ma cosi' la lettura regge anche se qualcuno lo mette li
  const m = new RegExp('[?&]' + nome + '=([^&#]*)').exec(qs);
  if (!m) return null;
  let v = m[1];
  try { v = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { /* era gia' grezzo */ }
  return v.trim() ? v.trim() : null;
}

/**
 * CHI SEI, in un pezzo solo e testabile.
 *
 * L'ordine e' quello che ha deciso Ste, e ogni ordine ha una ragione:
 *   1) il LINK: ?p=1 / ?p=2 sono le due persone scritte a mano, ?n=nome&k=chiave
 *      e' chi ti ha mandato il link. Vince sempre, perche' il link e' di chi lo
 *      manda: se Marco apre il link di Luca sul suo telefono deve diventare Luca.
 *   2) la MEMORIA del dispositivo: cosi' il nome non si chiede due volte, e se
 *      cambio telefono e riapro lo stesso link ritrovo la mia scheda.
 *   3) il caso limite: un dispositivo che ha gia' dentro le schede di Ste NON
 *      viene messo davanti alla domanda, altrimenti anche lui si troverebbe una
 *      scheda vuota e non vedrebbe piu' i suoi allenamenti. E' la cosa peggiore
 *      che potesse succedere, quindi e' scritta qui per prima.
 *   4) nessuna delle tre: si chiede il nome. Su un dispositivo nuovo non si sa
 *      niente, e non si inventa nessuno.
 */
export function chiSei({ ricerca = '', memoria = null, schede = [] } = {}) {
  const qs = String(ricerca || '');

  const numero = campoUrl(qs, 'p');
  if (numero !== null && /^\d+$/.test(numero)) {
    const persona = PERSONE.find((p) => p.id === Number(numero));
    if (persona) return { persona, daChiedere: false, memoria: { p: persona.id } };
    // una persona inesistente NON ti butta fuori dal tuo profilo: si continua
    // sotto, che vuol dire memoria o schede gia' presenti.
  }

  const nome = campoUrl(qs, 'n');
  const chiave = campoUrl(qs, 'k');
  if (nome && chiave) {
    const persona = personaDaNome(nome, chiave);
    if (persona) return { persona, daChiedere: false, memoria: { n: persona.nome, k: persona.chiave } };
  }

  const dallaMemoria = personaDaMemoria(memoria);
  if (dallaMemoria) return { persona: dallaMemoria, daChiedere: false, memoria };

  const tue = PERSONE.find((p) => p.predefinita) || PERSONE[0];
  if (tue && (schede || []).includes(tue.schedaId)) {
    return { persona: tue, daChiedere: false, memoria: { p: tue.id } };
  }

  return { persona: null, daChiedere: true, memoria: null };
}

// Ogni riga e' una VARIANTA con id proprio: "Chest Press" e "Chest Press - macchina B"
// hanno id diversi e quindi non verranno mai confrontati fra loro.
export const ESERCIZI = [
  { id: 'ex-chest-press', nome: 'Chest Press', gruppo: 'Chest Press', convenzione: C.PER_BRACCIO, attrezzatura: C.MACCHINA_DISCHI, bracciaIndipendenti: true, foto: 'img/esercizi/chest-press.png', tipo: 'standard', nota_permanente: 'Macchina a dischi veri sui perni, e i due bracci sono indipendenti: muovo il destro senza muovere il sinistro.' },
  { id: 'ex-cable-hammer-curl', nome: 'Cable Hammer Curl', gruppo: 'Cable Hammer Curl', convenzione: C.CAVO, carrucola: C.CARRUCOLA_DOPPIA, foto: 'img/esercizi/cable-hammer-curl.png', tipo: 'standard', nota_permanente: 'Cavo basso, alla cavigliera.' },
  { id: 'ex-cable-lateral-raise', nome: 'Cable Lateral Raise', gruppo: 'Cable Lateral Raise', convenzione: C.CAVO, carrucola: C.CARRUCOLA_DOPPIA, foto: 'img/esercizi/cable-lateral-raise.png', tipo: 'standard', nota_permanente: 'Fatte bene, alla cavigliera.' },
  { id: 'ex-cable-overhead-tricep', nome: 'Cable Overhead Tricep Extension', gruppo: 'Cable Overhead Tricep Extension', convenzione: C.CAVO, carrucola: C.CARRUCOLA_DOPPIA, foto: 'img/esercizi/cable-overhead-tricep-extension.png', tipo: 'standard', nota_permanente: 'Devo raggiungerlo di nuovo: altezza 4 del cavo.' },
  { id: 'ex-leg-extension', nome: 'Leg Extension', gruppo: 'Leg Extension', attrezzatura: C.MACCHINA_STACK, convenzione: C.MACCHINA, foto: 'img/esercizi/leg-extension.png', tipo: 'opzionale', nota_permanente: 'Monogamba (esercizio opzionale).' },
  { id: 'ex-neutral-grip-lat-pulldown', nome: 'Lat Pulldown macchina', gruppo: 'Lat Pulldown', attrezzatura: C.MACCHINA_STACK, convenzione: C.MACCHINA, foto: 'img/esercizi/neutral-grip-lat-pulldown.png', tipo: 'standard', nota_permanente: 'Impugnatura a triangolo, uso gli straps.' },

  { id: 'ex-dumbbell-bench-pull', nome: 'Dumbbell Bench Pull', gruppo: 'Bench Press', convenzione: C.PER_MANUBRIO, foto: 'img/esercizi/dumbbell-bench-pull.png', tipo: 'standard', nota_permanente: '26 gradi.' },
  { id: 'ex-seated-db-shoulder-press', nome: 'Seated Dumbbell Shoulder Press', gruppo: 'Shoulder Press', convenzione: C.PER_MANUBRIO, foto: 'img/esercizi/seated-dumbbell-shoulder-press.png', tipo: 'standard', nota_permanente: '3 gancio.' },
  { id: 'ex-cable-fly', nome: 'Cable Fly', gruppo: 'Cable Fly', convenzione: C.CAVO, carrucola: C.CARRUCOLA_DOPPIA, foto: 'img/esercizi/cable-fly.png', tipo: 'standard', nota_permanente: '12 gradi cavi, primo gancio panca.' },
  { id: 'ex-scott-bench-curl', nome: 'Scott Bench Curl seduto al contrario', gruppo: 'Curl bilanciere', convenzione: C.PER_MANUBRIO, foto: 'img/esercizi/scott-bench-curl.png', tipo: 'standard', nota_permanente: 'Panca Scott normale, mi siedo al contrario con i gomiti sul cuscino e faccio il curl a due braccia con manubri singoli.' },
  { id: 'ex-single-arm-tricep-pushdown', nome: 'Single Arm Tricep Pushdown', gruppo: 'Pushdown', convenzione: C.CAVO, carrucola: C.CARRUCOLA_DOPPIA, foto: 'img/esercizi/single-arm-tricep-pushdown.png', tipo: 'standard', nota_permanente: 'Alla cavigliera.' },
  { id: 'ex-seated-leg-curl', nome: 'Seated Leg Curl', gruppo: 'Leg Curl', attrezzatura: C.MACCHINA_STACK, convenzione: C.MACCHINA, foto: 'img/esercizi/seated-leg-curl.png', tipo: 'opzionale', nota_permanente: 'Opzionale.' },

  { id: 'ex-smith-incline-bench', nome: 'Smith Machine Incline Bench Press', gruppo: 'Bench Press', convenzione: C.PER_BRACCIO, attrezzatura: 'macchina_dischi', foto: 'img/esercizi/smith-machine-incline-bench-press.png', tipo: 'standard', nota_permanente: '30 gradi. Conto solo i dischi, il bilanciere no.' },
  { id: 'ex-seated-cable-row', nome: 'Seated Cable Row', gruppo: 'Row', convenzione: C.CAVO, carrucola: C.CARRUCOLA_MONO, attrezzatura: C.MACCHINA_DISCHI, foto: 'img/esercizi/seated-cable-row.png', tipo: 'standard', nota_permanente: 'Il coso nero e grigio.' },
  { id: 'ex-chest-supported-shrug', nome: 'Chest Supported Dumbbell Shrug', gruppo: 'Shrug', convenzione: C.PER_MANUBRIO, foto: 'img/esercizi/chest-supported-dumbbell-shrug.png', tipo: 'standard', nota_permanente: '54 gradi.' },
  { id: 'ex-sled-press-calf-raise', nome: 'Sled Press Calf Raise', gruppo: 'Calf Raise', attrezzatura: C.MACCHINA_STACK, convenzione: C.MACCHINA, foto: 'img/esercizi/sled-press-calf-raise.png', tipo: 'standard', nota_permanente: 'Monogamba, pressa orizzontale.' },
  { id: 'ex-single-leg-press', nome: 'Single Leg Press', gruppo: 'Leg Press', convenzione: C.PER_GAMBA, attrezzatura: C.MACCHINA_STACK, foto: 'img/esercizi/single-leg-press.png', tipo: 'standard', nota_permanente: 'Obliqua, altrimenti lavorano due gambe. 17 kg per gamba (prima facevo la leg press normale con 100 kg per lato).' },
  { id: 'ex-one-arm-preacher-curl', nome: 'One Arm Dumbbell Preacher Curl', gruppo: 'Curl bilanciere', convenzione: C.PER_MANUBRIO, foto: 'img/esercizi/one-arm-dumbbell-preacher-curl.png', tipo: 'standard', nota_permanente: '' },
  { id: 'ex-bodyweight-overhead-tricep', nome: 'Bodyweight Overhead Tricep Extension', gruppo: 'Overhead Tricep Extension', convenzione: C.ASSISTENZA, foto: 'img/esercizi/bodyweight-overhead-tricep-ext.png', tipo: 'assistente', nota_permanente: 'Al cavo, altezza sopra il culo. Il numero e\' il peso di assistenza che aggiungo.' },
  { id: 'ex-one-arm-cable-reverse-fly', nome: 'One Arm Cable Reverse Fly', gruppo: 'Reverse Fly', convenzione: C.CAVO, carrucola: C.CARRUCOLA_DOPPIA, foto: 'img/esercizi/one-arm-cable-reverse-fly.png', tipo: 'standard', nota_permanente: 'Cavo ad altezza 23 gradi.' },

  { id: 'ex-pull-ups', nome: 'Pull Ups', gruppo: 'Pull Ups', convenzione: C.ASSISTENZA, foto: 'img/esercizi/pull-ups.png', tipo: 'assistente', nota_permanente: 'Zavorra: il numero e\' l\'assistenza che uso.' },
  { id: 'ex-dips', nome: 'Dips', gruppo: 'Dips', convenzione: C.ASSISTENZA, foto: 'img/esercizi/dips.png', tipo: 'assistente', nota_permanente: 'Zavorra: il numero e\' l\'assistenza che uso.' },
  { id: 'ex-wrist-curl', nome: 'Wrist Curl', gruppo: 'Wrist Curl', convenzione: C.BILANCIERE, carrucola: C.CARRUCOLA_MONO, foto: 'img/esercizi/wrist-curl.png', tipo: 'standard', nota_permanente: 'Dropset: prima serie fino a cedimento, poi si scende. Ci sono 3 giri extra da riempire.' },

  // Esercizi AGGIUNTI, non ancora messi in nessuna scheda: sono disponibili
  // nella lista cosi' ognuno puo' aggiungerli quando gli servono.
  { id: 'ex-iso-lateral-row', nome: 'Iso-Lateral Row', gruppo: 'Row', convenzione: C.PER_BRACCIO, attrezzatura: C.MACCHINA_DISCHI, foto: 'img/esercizi/iso-lateral-row.png', tipo: 'standard', nota_permanente: 'Macchina a dischi, e ogni braccio e\' indipendente: se i due lati non sono uguali lo senti subito.' },
  { id: 'ex-lat-pulldown-lats', nome: 'Lat Pulldown (lats)', gruppo: 'Lat Pulldown', attrezzatura: C.MACCHINA_STACK, convenzione: C.MACCHINA, foto: 'img/esercizi/lat-pulldown-lats.png', tipo: 'standard', nota_permanente: '' },
  { id: 'ex-db-lateral-raise', nome: 'Dumbbell Lateral Raise', gruppo: 'Lateral Raise', convenzione: C.BILANCIERE, foto: 'img/esercizi/db-lateral-raise.png', tipo: 'standard', nota_permanente: '' },
  { id: 'ex-lying-cable-curl', nome: 'Incline Single Arm Pulldown', gruppo: 'Lat Pulldown', convenzione: C.CAVO, carrucola: C.CARRUCOLA_MONO, foto: 'img/esercizi/incline-single-arm-pulldown.png', tipo: 'standard', nota_permanente: 'Braccio singolo: sto sulla panca inclinata col petto appoggiato e tiro il cavo alto verso di me con la presa piccola. Dorso. Quello che diciamo "liac".' },
];

const s = (peso, rip, extra = {}) => ({ peso, ripetizioni: rip, ...extra });
const conAss = (assistenza, rip, extra = {}) => ({ peso: null, peso_assistenza: assistenza, ripetizioni: rip, ...extra });

export const GIORNI = [
  {
    id: 'giorno-1', ordine: 1, nome: 'giorno 1',
    esercizi: [
      { id: 'es-1-1', esercizio_id: 'ex-chest-press', serie: [s(35, 8), s(35, 7), s(35, 6)], opzionale: false, nota: '' },
      { id: 'es-1-2', esercizio_id: 'ex-cable-hammer-curl', serie: [s(50, 6), s(50, 5), s(50, 5)], opzionale: false, nota: '' },
      { id: 'es-1-3', esercizio_id: 'ex-cable-lateral-raise', serie: [s(25, 7), s(25, 7), s(25, 7)], opzionale: false, nota: '' },
      { id: 'es-1-4', esercizio_id: 'ex-cable-overhead-tricep', serie: [s(60, 5), s(60, 5), s(60, 5)], opzionale: false, nota: '' },
      { id: 'es-1-5', esercizio_id: 'ex-leg-extension', serie: [s(65, 9), s(60, 7)], opzionale: true, nota: '' },
      { id: 'es-1-6', esercizio_id: 'ex-neutral-grip-lat-pulldown', serie: [s(88, 6), s(88, 6), s(88, 5)], opzionale: false, nota: '' },
    ],
  },
  {
    id: 'giorno-2', ordine: 2, nome: 'giorno 2',
    esercizi: [
      { id: 'es-2-1', esercizio_id: 'ex-dumbbell-bench-pull', serie: [s(45, 7), s(45, 6), s(45, 5)], opzionale: false, nota: '' },
      { id: 'es-2-2', esercizio_id: 'ex-seated-db-shoulder-press', serie: [s(30, 8), s(30, 7), s(30, 6)], opzionale: false, nota: '' },
      { id: 'es-2-3', esercizio_id: 'ex-cable-fly', serie: [s(37, 5), s(35, 5), s(35, 5)], opzionale: false, nota: '' },
      { id: 'es-2-4', esercizio_id: 'ex-scott-bench-curl', serie: [s(20, 7), s(20, 6), s(20, 5)], opzionale: false, nota: '' },
      { id: 'es-2-5', esercizio_id: 'ex-single-arm-tricep-pushdown', serie: [s(42, 7), s(42, 6), s(40, 6)], opzionale: false, nota: '' },
      { id: 'es-2-6', esercizio_id: 'ex-seated-leg-curl', serie: [s(65, 6), s(65, 6)], opzionale: true, nota: '' },
    ],
  },
  {
    id: 'giorno-3', ordine: 3, nome: 'giorno 3',
    esercizi: [
      { id: 'es-3-1', esercizio_id: 'ex-smith-incline-bench', serie: [s(30, 6), s(30, 4), s(28, 6)], opzionale: false, nota: '' },
      { id: 'es-3-2', esercizio_id: 'ex-seated-cable-row', serie: [s(90, 6), s(90, 5), s(88, 5)], opzionale: false, nota: '' },
      { id: 'es-3-3', esercizio_id: 'ex-chest-supported-shrug', serie: [s(45, 6), s(45, 6)], opzionale: false, nota: '' },
      { id: 'es-3-4', esercizio_id: 'ex-sled-press-calf-raise', serie: [s(110, 6), s(110, 5)], opzionale: false, nota: '' },
      { id: 'es-3-5', esercizio_id: 'ex-single-leg-press', serie: [s(17, 8), s(17, 8)], opzionale: false, nota: '' },
      { id: 'es-3-6', esercizio_id: 'ex-one-arm-preacher-curl', serie: [s(18, 6), s(18, 5), s(18, 5)], opzionale: false, nota: '' },
      { id: 'es-3-7', esercizio_id: 'ex-bodyweight-overhead-tricep', serie: [conAss(28, 6), conAss(28, 6)], opzionale: false, nota: '' },
      { id: 'es-3-8', esercizio_id: 'ex-one-arm-cable-reverse-fly', serie: [s(25, 9), s(25, 9), s(25, 9)], opzionale: false, nota: '' },
    ],
  },
  {
    id: 'giorno-4', ordine: 4, nome: 'giorno 4',
    esercizi: [
      { id: 'es-4-1', esercizio_id: 'ex-pull-ups', serie: [conAss(15, 7), conAss(15, 5), conAss(15, 4)], opzionale: false, nota: '' },
      { id: 'es-4-2', esercizio_id: 'ex-dips', serie: [conAss(35, 5), conAss(35, 5), conAss(30, 5)], opzionale: false, nota: '' },
      { id: 'es-4-3', esercizio_id: 'ex-wrist-curl', serie: [s(25, 6, { dropset: true }), s(25, 6, { dropset: true })], opzionale: false, nota: '' },
    ],
  },
];

/**
 * Istantanea completa della scheda: e' questo che finisce in una versione.
 *
 * `conSerie: false` serve a chi si registra col link: la copia porta i tuoi
 * giorni, i tuoi esercizi, le tue note e le opzionali, ma NON le tue serie.
 * Ste: "fai una copia della mia e loro la modificano... pero' non deve trovarsi
 * dentro 35 kg alla chest press come se fossero suoi".
 *
 * Nota sul perche' non possa rompere niente: gli id delle sedute e delle serie non
 * vengono da qui, nascono nuovi (nuovoId()) quando l'allenamento parte, e ogni
 * seduta porta scheda_id + versione_id. Quindi la copia di uno non puo' scrivere
 * sulle righe di un altro: non e' che lo impediamo, e' che non e' possibile.
 */
export function costruisciSnapshot({ conSerie = true } = {}) {
  return {
    scheda_id: SCHEDA_ID,
    nome: SCHEDA_NOME,
    giorni: GIORNI.map((g) => ({
      id: g.id,
      ordine: g.ordine,
      nome: g.nome,
      esercizi: g.esercizi.map((e, i) => ({
        id: e.id,
        ordine: i + 1,
        esercizio_id: e.esercizio_id,
        opzionale: !!e.opzionale,
        nota: e.nota || '',
        serie: conSerie
          ? e.serie.map((x) => ({
            peso: x.peso === undefined ? null : x.peso,
            peso_assistenza: x.peso_assistenza === undefined ? null : x.peso_assistenza,
            ripetizioni: x.ripetizioni === undefined ? null : x.ripetizioni,
            spotter: !!x.spotter,
            dropset: !!x.dropset,
          }))
          : [],
      })),
    })),
  };
}
