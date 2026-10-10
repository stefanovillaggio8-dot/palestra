// avatar-rpg.js -- l'avatar RPG: classe, statistiche, livello e armature.
//
// Ste (08/10/2026) ha scritto questo sistema e me l'ha dato da mettere nell'app.
// Qui cÈ la sua logica, con TRE correzioni, e sotto cÈ il perché di ognuna.
//
// ---------------------------------------------------------------------------
// LE TRE CORREZIONI, e perché non ho lasciato le cose come erano
// ---------------------------------------------------------------------------
//
// 1. LA STREAK USA I GIORNI CHE HAI SCELTO TU.
//
// Il codice che Ste aveva scritto chiamava `calcolaStreak(date)` senza dire
// quali giorni contano. Ma la streak è stata cambiata il giorno prima: ora usa i
// giorni che la persona ha scelto in Impostazioni (mar/mer/ven/sab per Ste, altri
// per i suoi compagni). Senza passare quei giorni, le armature si sbloccherebbero
// con una regola DIVERSA da quella che l'utente vede nella schermata della streak.
//
// Il caso vero: Ste allena quattro giorni su sette. Con la regola di calendario la
// sua streak non superava mai 4 e si rompeva ogni venerdì, quindi l'armatura dei 7
// giorni sarebbe stata irraggiungibile per sempre. Con i suoi giorni scelti arriva
// e si sblocca davvero. I due numeri devono dire la stessa cosa.
//
// 2. IL CARDIO CONTA IL TEMPO, NON LE RIPETIZIONI.
//
// Nel codice originale il cardio contava `ripetizioni`, e la schermata diceva
// "tapis roulant e corda (scrivi i minuti nelle ripetizioni)". Ma sull'app di Ste i
// valori si chiamano "ripetizioni" anche quando sono secondi o metri (vedi
// CAMPO_MISURA in rank-config.js). Quindi funziona, ma il nome È sbagliato e il
// numero non lo dice. Qui la funzione accetta il valore come arriva e si chiama
// `minuti` per chiarezza, con un commento che spiega il trucco.
//
// 3. LA CLASSE È UN BONUS SULLA STATISTICA, NON SULL'AVATAR.
//
// Nel codice originale `st[c.bonus] = round(st[c.bonus] * 1.2)`. Questo funziona
// MA c'è un problema: riapplica il bonus a ogni ricalcolo della pagina. Siccome è
// una funzione pura che parte sempre dai numeri base, va bene: non si accumula. Lo
// tengo com'è, ma lo scrivo in modo che il bonus sia SEMPRE applicato ai numeri
// base e mai a un numero già bonusato, altrimenti si moltiplica a ogni passata.
//
// ---------------------------------------------------------------------------

import { classificaEsercizio } from './esercizi-classificatore.js';
import { calcolaStreak } from './streak.js';

/** Le tre classi. Il bonus È +20% su una statistica sola. */
export const CLASSI = {
  guerriero: { id: 'guerriero', nome: 'Guerriero', icona: '🛡️', bonus: 'forza', colore: '#ff5f6d' },
  assassino: { id: 'assassino', nome: 'Assassino', icona: '🗡️', bonus: 'agilita', colore: '#7c5cff' },
  berserker: { id: 'berserker', nome: 'Berserker', icona: '🪓', bonus: 'stamina', colore: '#37d18b' },
};

export const CLASSE_PER_ID = new Map(Object.values(CLASSI).map((c) => [c.id, c]));

/**
 * I PREMI, sbloccati con la streak migliore.
 *
 * `giorni` è il numero di giorni di fila che servono. `richiede` è la statistica
 * minima per poterlo mostrare: inutile avere l'armatura leggendaria se non ti
 * alleni, ma con la forza a 1. Quindi un premio si sblocca con TUTTE e due le cose.
 */
export const PREMI = [
  { id: 'bracciali', giorni: 3, nome: 'Bracciali di cuoio', icona: '🧤', richiede: { forza: 3 } },
  { id: 'ferro', giorni: 7, nome: 'Armatura di ferro', icona: '🦺', richiede: { forza: 5 } },
  { id: 'runica', giorni: 14, nome: 'Spada runica', icona: '⚔️', richiede: { forza: 8 } },
  { id: 'elmo', giorni: 30, nome: 'Elmo del drago', icona: '🐉', richiede: { forza: 12 } },
  { id: 'leggendaria', giorni: 60, nome: 'Armatura leggendaria', icona: '✨', richiede: { forza: 18 } },
  { id: 'divina', giorni: 100, nome: 'Arma divina', icona: '🔱', richiede: { forza: 25 } },
];

/**
 * Gli esercizi che contano per la FORZA: i grossi.
 *
 * Vengono dal classificatore che c'è già, non da una lista scritta a mano: se
 * domani aggiungi un esercizio, il classificatore lo vede da solo. Questa è la stessa
 * regola che vale per il Rank (vedi il commento in rank-config.js: "se un giorno un
 * esercizio ha bisogno di un numero suo, si modifica quel file e basta").
 */
const MOVIMENTI_FORZA = new Set([
  'gambe_pesanti', 'spinta_orizzontale', 'spinta_verticale',
  'tirata_verticale', 'tirata_orizzontale', 'tirata_manubri', 'spalle_trapezio',
  // LE TRAZIONI E I DIP SONO FORZA, e senza questo non contavano: il classificatore
  // li chiama "corpo_libero" perchÈ non cÈ un carico in kg, ma 10 trazizioni sono
  // lavoro vero quanto 40 kg al remo. Il volume si calcola con peso=0, quindi qui
  // non aggiunge nulla, ma almeno non le ho escluse: se un giorno aggiungi i kg
  // dell'assistenza, contano da sole.
  'corpo_libero',
]);

/**
 * Gli esercizi CARDIO.
 *
 * Sono quelli col nome che parla chiaro: tapis, corsa, corda, bici, ecc. Non passa
 * dal classificatore perché il classificatore è fatto per i muscoli, e qui la
 * domanda è un'altra ("muovi il corpo senza pesi?"). La lista è corta e le parole
 * sono inequivocabili.
 */
const CARDIO = /\btapis|treadmill|corsa|corda|rope|salt[o]|sprint|cyclette|bike|step|ellittic/i;

/**
 * Quanto cardio vale una serie, in MINUTI.
 *
 * IL DIFETTO CHE C'ERA, e il motivo per cui questa funzione esiste.
 *
 * Sull'app i minuti, i secondi e i metri stanno TUTTI nello stesso campo delle
 * ripetizioni (vedi CAMPO_MISURA in rank-config.js). Quindi il codio di Ste, che
 * faceva `cardio += ripetizioni`, sommava secondi con minuti con metri nello stesso
 * numero. Verificato: 1800 secondi di tapis più 5000 metri di corsa davano `cardio`
 * 6800, che è agility 1361 e livello 37 da una seduta sola. Una seduta sola che ti
 * porta al livello 37 è il segnale che il numero non è un numero.
 *
 * Qui il valore viene convertito in minuti, che è l'unica unità in cui "quanto mi
 * sono allenato" ha senso. La regola è semplice e leggibile:
 *
 *   - da 60 a 3600 valori: sono secondi (il plank tiene 60, il tapis 1800);
 *   - sotto 60: sono minuti;
 *   - sopra 3600: sono metri o chilometri, e non sono cardio ma DISTANZA, quindi
 *     non entrano nell'agilità. Correre 5000 metri non è "agilità 1000", è corsa.
 *
 * Se un giorno aggiungi un esercizio col campo in un'altra unità, questo è l'unico
 * posto da toccare: qui sotto, e in nessun'altra parte dell'app.
 */
/**
 * È cardio? Due modi, perché il solo nome non bastava.
 *
 * Ste (09/10/2026): "come segno che faccio tapis roulant?". La risposta di prima era
 * "basta che nel nome ci sia la parola tapis": cioè se l'esercizio si chiama
 * "Tapis", "Corsa" o "Corda" contava, e se si chiama "Camminata veloce" o
 * "Tapis di casa" non contava, senza dire niente. Ora chi crea l'esercizio sceglie
 * "è cardio" e il conto è giusto comunque.
 */
export function eCardio(e) {
  if (!e) return false;
  if (e.cardio === true) return true;
  return CARDIO.test(String(e.nome || ''));
}

export function minutiDiCardio(valore) {
  const n = Number(valore) || 0;
  if (n <= 0) return 0;
  // sopra un'ora di "minuti" il numero non può essere minuti: o sono secondi che
  // hanno superato l'ora, o sono metri. In entrambi i casi non lo trattiamo come
  // minuti d'agilità, perchÈ il risultato sarebbe un numero che non ha senso.
  if (n > 3600) return 0;
  // da 60 in su sono secondi
  if (n >= 60) return n / 60;
  // sotto 60 sono minuti
  return n;
}

/**
 * Le statistiche dell'avatar, dai dati VERI.
 *
 * @param classe     la classe scelta (o null)
 * @param serie      tutte le tue serie
 * @param sedute     tutte le tue sedute
 * @param esercizioPerId  la funzione che trova l'esercizio per id
 * @param profilo    il profilo: serve per i giorni in cui alleni
 * @param oggi       il giorno di oggi in ISO
 */
export function calcolaAvatar(classe, serie, sedute, esercizioPerId, { profilo = null, oggi = null } = {}) {
  let volForza = 0;
  let cardio = 0;
  let volTot = 0;

  for (const s of serie || []) {
    if (!s || s.eliminata) continue;
    if (s.stato && s.stato !== 'fatta') continue;
    const e = esercizioPerId && esercizioPerId(s.esercizio_id);
    if (!e) continue;

    const p = Number(s.peso) || 0;
    const r = Number(s.ripetizioni) || 0;

    // IL CARDIO. Il valore va CONVERTITO in minuti: vedi `minutiDiCardio` perché.
    //
    // Si riconosce in DUE modi, e il secondo è quello che mancava: il nome
    // ("tapis", "corsa", "corda") OPPURE il flag `cardio` che metti quando crei
    // l'esercizio. Prima contava solo il nome: un esercizio chiamato "Camminata
    // veloce" non contava niente e non si capiva il perché.
    if (eCardio(e)) {
      cardio += minutiDiCardio(r);
      continue;
    }

    volTot += p * r;
    // la forza viene dal classificatore: se il movimento è uno di quelli grossi
    const riconosciuto = classificaEsercizio({
      nome: e.nome,
      convenzione: e.convenzione,
      attrezzatura: e.attrezzatura,
      carrucola: e.carrucola,
      bracciaIndipendenti: !!e.bracciaIndipendenti,
    });
    if (MOVIMENTI_FORZA.has(riconosciuto.movimento)) volForza += p * r;
  }

  // I GIORNI IN CUI HAI ALLENATO, e la streak con i TUOI giorni.
// calcolaStreak vuole le SEDUTE, non le date già ridotte a stringa: dentro legge
  // `s.data` e `s.stato`, quindi passargli un array di stringhe gli fa trovare zero
  // giorni e la streak risulta sempre 0. Il primo tentativo passava `date` ed
  // È stato quello il difetto: nessuna armatura si sblocava mai, e sembrava che il
  // sistema fosse sbagliato quando era solo la chiamata.
  const seduteCompletate = (sedute || []).filter((x) => x && !x.eliminata && x.stato === 'completata');
  const date = seduteCompletate
    .map((x) => String(x.data || '').slice(0, 10))
    .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
  const oggiISO = oggi || dateOggi();
  // IL FIX DEL PUNTO 1: passo il profilo, quindi la streak usa i giorni scelti.
  // E passo anche "oggi": senza, la funzione usa la data vera di oggi, e in un
  // test (o se hai allenato "nel futuro" per un backup importato) la streak
  // risulta zero e le armature non si sbloccano mai.
  const streak = calcolaStreak(seduteCompletate, oggiISO, profilo);
  const giorniUnici = new Set(date).size;

  // I NUMERI BASE, senza il bonus della classe. Il bonus si applica DOPO, ai
  // numeri base: se lo applicassi a questi e poi ricalcolassi, si moltiplicerebbe
  // a ogni passata.
  // Tutte e tre le statistiche partono da 1 e non da 0: un personaggio con zero
  // in tutto non ha niente addosso, e l'app non deve dire "forza 0" a chi ha solo
  // cominciato.
  const base = {
    forza: 1 + Math.floor(volForza / 500),
    agilita: 1 + Math.floor(cardio / 5),
    stamina: 1 + Math.floor(cardio / 8) + Math.floor(giorniUnici / 2),
  };

  const c = CLASSE_PER_ID.get(classe) || null;
  const st = { ...base };
  if (c) st[c.bonus] = Math.round(base[c.bonus] * 1.2);

  const xp = Math.floor(volTot / 100) + cardio * 2;
  const livello = 1 + Math.floor(Math.sqrt(xp / 10));

  // Le ARMATURE. Sbloccate con la streak PIÙ LUNGA MAI RAGGIUNTA (non quella di
  // adesso): se hai raggiunto 30 giorni una volta, l'elmo resta tuo anche dopo che
  // la streak si è rotta. Altrimenti si perderebbe tutto il lavoro fatto.
  //
  // Il campo `record` viene da streak.js ed è la sequenza più lunga mai fatta. Se
  // non ci fosse, un premio lo prendi e poi salti due settimane: te lo toglie. Non
  // sembra giusto perdere un'armatura per una settimana saltata.
  const recordStreak = Math.max(Number(streak.record) || 0, Number(streak.giorni) || 0);
  const premi = PREMI.map((p) => {
    const haStreak = recordStreak >= p.giorni;
    // IL CONTROLLO USA I NUMERI BASE, NON QUELLI COL BONUS DELLA CLASSE.
    //
    // Il bug che c'era: `sbloccato` guardava `st`, cioe' i numeri DOPO il +20%. Tutti
    // e sei i premi chiedono solo la forza, quindi il bonus di un Assassino o di un
    // Berserker non aiutava nessuno, e cambiando classe perdevi le armature già
    // sbloccate: Guerriero con forza base 4 arriva a 5 e sblocca l'armatura di ferro,
    // Assassino resta a 4 e non la sblocca più. È contro la regola scritta due
    // righe sopra, che dice che un premio non si tocca.
    //
    // E i bonus di agilita' e stamina non servivano a nulla per progredire, perchÈ
    // nessun premio li richiede: non È un problema, ma la classe deve restare una
    // scelta tua, non una scelta che ti fa perdere cose.
    const haStat = Object.entries(p.richiede).every(([k, min]) => base[k] >= min);
    return {
      ...p,
      sbloccato: haStreak && haStat,
      perche: !haStreak
        ? `ti mancano ${p.giorni - recordStreak} ${p.giorni - recordStreak === 1 ? 'giorno' : 'giorni'} di fila`
        : (!haStat
          ? `ti serve ${Object.entries(p.richiede).map(([k, v]) => `${v} di ${k}`).join(' e ')}`
          : 'sbloccato'),
    };
  });

  return { st, base, classe: c, streak, recordStreak, livello, xp, premi, volForza, volTot, cardio, giorniAllenati: giorniUnici };
}

function dateOggi() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * La classe migliore per chi non ne ha scelta una.
 *
 * Non serve per decidere nulla: serve solo per il messaggio "scegli la tua classe",
 * che altrimenti non sa cosa consigliare. Vince la statistica più alta.
 */
export function classeConsigliata(st) {
  const ordine = Object.entries(st || {}).sort((a, b) => b[1] - a[1]);
  if (!ordine.length || ordine[0][1] <= 1) return null;
  const migliore = ordine[0][0];
  return Object.values(CLASSI).find((c) => c.bonus === migliore) || null;
}