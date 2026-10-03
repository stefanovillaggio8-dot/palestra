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

/** Le persone che usano l'app. L'ordine non conta, conta l'id nella URL. */
export const PERSONE = [
  { id: 1, nome: 'Stefano', nomeScheda: 'Palestra', schedaId: SCHEDA_ID, predefinita: true },
  { id: 2, nome: 'Altro', nomeScheda: 'Palestra A', schedaId: 'scheda-altro-1', predefinita: false },
];

/** Quale persona si sta usando adesso, letta dalla URL (?p=2). */
export function personaDallaUrl(ricerca) {
  const qs = String(ricerca || '');
  const m = /[?&]p=(\d+)/.exec(qs);
  const richiesta = m ? Number(m[1]) : null;
  if (richiesta !== null) {
    const trovata = PERSONE.find((p) => p.id === richiesta);
    if (trovata) return trovata;
  }
  return PERSONE.find((p) => p.predefinita) || PERSONE[0];
}

// Ogni riga e' una VARIANTA con id proprio: "Chest Press" e "Chest Press - macchina B"
// hanno id diversi e quindi non verranno mai confrontati fra loro.
export const ESERCIZI = [
  { id: 'ex-chest-press', nome: 'Chest Press', gruppo: 'Chest Press', convenzione: C.MACCHINA, foto: 'img/esercizi/chest-press.png', tipo: 'standard', nota_permanente: '' },
  { id: 'ex-cable-hammer-curl', nome: 'Cable Hammer Curl', gruppo: 'Cable Hammer Curl', convenzione: C.CAVO, foto: 'img/esercizi/cable-hammer-curl.png', tipo: 'standard', nota_permanente: 'Cavo basso, alla cavigliera.' },
  { id: 'ex-cable-lateral-raise', nome: 'Cable Lateral Raise', gruppo: 'Cable Lateral Raise', convenzione: C.CAVO, foto: 'img/esercizi/cable-lateral-raise.png', tipo: 'standard', nota_permanente: 'Fatte bene, alla cavigliera.' },
  { id: 'ex-cable-overhead-tricep', nome: 'Cable Overhead Tricep Extension', gruppo: 'Cable Overhead Tricep Extension', convenzione: C.CAVO, foto: 'img/esercizi/cable-overhead-tricep-extension.png', tipo: 'standard', nota_permanente: 'Devo raggiungerlo di nuovo: altezza 4 del cavo.' },
  { id: 'ex-leg-extension', nome: 'Leg Extension', gruppo: 'Leg Extension', convenzione: C.MACCHINA, foto: 'img/esercizi/leg-extension.png', tipo: 'opzionale', nota_permanente: 'Monogamba (esercizio opzionale).' },
  { id: 'ex-neutral-grip-lat-pulldown', nome: 'Lat Pulldown macchina', gruppo: 'Lat Pulldown', convenzione: C.MACCHINA, foto: 'img/esercizi/neutral-grip-lat-pulldown.png', tipo: 'standard', nota_permanente: 'Impugnatura a triangolo, uso gli straps.' },

  { id: 'ex-dumbbell-bench-pull', nome: 'Dumbbell Bench Pull', gruppo: 'Bench Press', convenzione: C.PER_MANUBRIO, foto: 'img/esercizi/dumbbell-bench-pull.png', tipo: 'standard', nota_permanente: '26 gradi.' },
  { id: 'ex-seated-db-shoulder-press', nome: 'Seated Dumbbell Shoulder Press', gruppo: 'Shoulder Press', convenzione: C.PER_MANUBRIO, foto: 'img/esercizi/seated-dumbbell-shoulder-press.png', tipo: 'standard', nota_permanente: '3 gancio.' },
  { id: 'ex-cable-fly', nome: 'Cable Fly', gruppo: 'Cable Fly', convenzione: C.CAVO, foto: 'img/esercizi/cable-fly.png', tipo: 'standard', nota_permanente: '12 gradi cavi, primo gancio panca.' },
  { id: 'ex-scott-bench-curl', nome: 'Scott Bench Curl seduto al contrario', gruppo: 'Curl bilanciere', convenzione: C.PER_MANUBRIO, foto: 'img/esercizi/scott-bench-curl.png', tipo: 'standard', nota_permanente: 'Panca Scott normale, mi siedo al contrario con i gomiti sul cuscino e faccio il curl a due braccia con manubri singoli.' },
  { id: 'ex-single-arm-tricep-pushdown', nome: 'Single Arm Tricep Pushdown', gruppo: 'Pushdown', convenzione: C.CAVO, foto: 'img/esercizi/single-arm-tricep-pushdown.png', tipo: 'standard', nota_permanente: 'Alla cavigliera.' },
  { id: 'ex-seated-leg-curl', nome: 'Seated Leg Curl', gruppo: 'Leg Curl', convenzione: C.MACCHINA, foto: 'img/esercizi/seated-leg-curl.png', tipo: 'opzionale', nota_permanente: 'Opzionale.' },

  { id: 'ex-smith-incline-bench', nome: 'Smith Machine Incline Bench Press', gruppo: 'Bench Press', convenzione: C.DISCHI, foto: 'img/esercizi/smith-machine-incline-bench-press.png', tipo: 'standard', nota_permanente: '30 gradi. Conto solo i dischi, il bilanciere no.' },
  { id: 'ex-seated-cable-row', nome: 'Seated Cable Row', gruppo: 'Row', convenzione: C.CAVO, foto: 'img/esercizi/seated-cable-row.png', tipo: 'standard', nota_permanente: 'Il coso nero e grigio.' },
  { id: 'ex-chest-supported-shrug', nome: 'Chest Supported Dumbbell Shrug', gruppo: 'Shrug', convenzione: C.PER_MANUBRIO, foto: 'img/esercizi/chest-supported-dumbbell-shrug.png', tipo: 'standard', nota_permanente: '54 gradi.' },
  { id: 'ex-sled-press-calf-raise', nome: 'Sled Press Calf Raise', gruppo: 'Calf Raise', convenzione: C.MACCHINA, foto: 'img/esercizi/sled-press-calf-raise.png', tipo: 'standard', nota_permanente: 'Monogamba, pressa orizzontale.' },
  { id: 'ex-single-leg-press', nome: 'Single Leg Press', gruppo: 'Leg Press', convenzione: C.PER_GAMBA, foto: 'img/esercizi/single-leg-press.png', tipo: 'standard', nota_permanente: 'Obliqua, altrimenti lavorano due gambe. 17 kg per gamba (prima facevo la leg press normale con 100 kg per lato).' },
  { id: 'ex-one-arm-preacher-curl', nome: 'One Arm Dumbbell Preacher Curl', gruppo: 'Curl bilanciere', convenzione: C.PER_MANUBRIO, foto: 'img/esercizi/one-arm-dumbbell-preacher-curl.png', tipo: 'standard', nota_permanente: '' },
  { id: 'ex-bodyweight-overhead-tricep', nome: 'Bodyweight Overhead Tricep Extension', gruppo: 'Overhead Tricep Extension', convenzione: C.ASSISTENZA, foto: 'img/esercizi/bodyweight-overhead-tricep-ext.png', tipo: 'assistente', nota_permanente: 'Al cavo, altezza sopra il culo. Il numero e\' il peso di assistenza che aggiungo.' },
  { id: 'ex-one-arm-cable-reverse-fly', nome: 'One Arm Cable Reverse Fly', gruppo: 'Reverse Fly', convenzione: C.CAVO, foto: 'img/esercizi/one-arm-cable-reverse-fly.png', tipo: 'standard', nota_permanente: 'Cavo ad altezza 23 gradi.' },

  { id: 'ex-pull-ups', nome: 'Pull Ups', gruppo: 'Pull Ups', convenzione: C.ASSISTENZA, foto: 'img/esercizi/pull-ups.png', tipo: 'assistente', nota_permanente: 'Zavorra: il numero e\' l\'assistenza che uso.' },
  { id: 'ex-dips', nome: 'Dips', gruppo: 'Dips', convenzione: C.ASSISTENZA, foto: 'img/esercizi/dips.png', tipo: 'assistente', nota_permanente: 'Zavorra: il numero e\' l\'assistenza che uso.' },
  { id: 'ex-wrist-curl', nome: 'Wrist Curl', gruppo: 'Wrist Curl', convenzione: C.BILANCIERE, foto: 'img/esercizi/wrist-curl.png', tipo: 'standard', nota_permanente: 'Dropset: prima serie fino a cedimento, poi si scende. Ci sono 3 giri extra da riempire.' },

  // Esercizi AGGIUNTI, non ancora messi in nessuna scheda: sono disponibili
  // nella lista cosi' ognuno puo' aggiungerli quando gli servono.
  { id: 'ex-iso-lateral-row', nome: 'Iso-Lateral Row', gruppo: 'Row', convenzione: C.MACCHINA, foto: 'img/esercizi/iso-lateral-row.png', tipo: 'standard', nota_permanente: '' },
  { id: 'ex-lat-pulldown-lats', nome: 'Lat Pulldown (lats)', gruppo: 'Lat Pulldown', convenzione: C.MACCHINA, foto: 'img/esercizi/lat-pulldown-lats.png', tipo: 'standard', nota_permanente: '' },
  { id: 'ex-db-lateral-raise', nome: 'Dumbbell Lateral Raise', gruppo: 'Lateral Raise', convenzione: C.BILANCIERE, foto: 'img/esercizi/db-lateral-raise.png', tipo: 'standard', nota_permanente: '' },
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

/** Istantanea completa della scheda: e' questo che finisce in una versione. */
export function costruisciSnapshot() {
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
        serie: e.serie.map((x) => ({
          peso: x.peso === undefined ? null : x.peso,
          peso_assistenza: x.peso_assistenza === undefined ? null : x.peso_assistenza,
          ripetizioni: x.ripetizioni === undefined ? null : x.ripetizioni,
          spotter: !!x.spotter,
          dropset: !!x.dropset,
        })),
      })),
    })),
  };
}
