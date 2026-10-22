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
// LE SOGLIE SONO QUELLE DI STE.
//
// Ste (10/10/2026): streak 3 i bracciali, 7 gli schinieri, 15 la corazza di ferro,
// 30 l'arma, 50+ l'aura. Prima erano 3, 7, 14, 30, 60, 100: numeri spariti senza
// una regola dietro.
//
// `richiede` non c'è più: lo sblocco guarda solo la streak. Il campo resta scritto
// vuoto per non rompere chi legge i premi da qualche parte, ma nessuno lo guarda
// più, e va bene così.
export const PREMI = [
  { id: 'bracciali', giorni: 3, nome: 'Bracciali di cuoio', icona: '🧤', richiede: {} },
  { id: 'ferro', giorni: 7, nome: 'Armatura di ferro', icona: '🦺', richiede: {} },
  { id: 'runica', giorni: 15, nome: 'Spada runica', icona: '⚔️', richiede: {} },
  { id: 'elmo', giorni: 30, nome: 'Elmo del drago', icona: '🐉', richiede: {} },
  { id: 'leggendaria', giorni: 50, nome: 'Armatura leggendaria', icona: '✨', richiede: {} },
  { id: 'divina', giorni: 75, nome: 'Aura divina', icona: '✨', richiede: {} },
];

// IL NOME CHE VEDE VOI DIPENDE DALLA CLASSE.
//
// Ste (10/10/2026), dalle due versioni della scheda delle tre classi.
//
// La seconda versione ha due differenze rispetto alla prima, e non sono cosmetiche:
//
//  1. IL GUERRIERO ha uno scudo grande (col leone) E la spada. Sono due cose diverse:
//     lo scudo lo porta sempre, è quello che sei; la spada è un premio. Nella mia
//     prima versione lo scudo c'era ma la spada non si vedeva mai, perché il pezzo
//     dell'arma era disegnato dietro al corpo.
//
//  2. L'ASSASSINO NON ha l'armatura di ferro. Al suo posto c'è la "cintura da
//     assassino". Quindi i due muscoli sono davvero diversi e la progressione non è
//     la stessa: il guerriero e il berserker si coprono di ferro, l'assassino si
//     copre di tessuto e si stringe una cintura.
//
// Quindi qui sotto ogni classe ha i SUOI quattro pezzi, nell'ordine della scheda.
//
// I `PREMI` sopra restano come sono, perché `id`, `giorni` e `richiede` sono la LOGICA
// dello sblocco e non si toccano: qui cambia solo la parola che si vede. Il default è
// il nome generico, così un pezzo nuovo o un esercizio creato a mano non finiscono con
// un nome sbagliato.

/** Il nome di un premio per la classe che hai scelto. */
const NOMI_PER_CLASSE = {
  guerriero: {
    ferro: 'Armatura di cuoio',
    runica: 'Armatura di ferro',
    elmo: 'Spada',
  },
  berserker: {
    ferro: 'Pelo e pelliccia',
    runica: 'Armatura di ferro',
    elmo: 'Ascia da guerra',
  },
  assassino: {
    ferro: 'Vestiti leggeri',
    runica: 'Cintura da assassino',
    elmo: 'Pugnale',
  },
};

/**
 * Il nome di un premio, detto come lo dice la classe che lo porta.
 *
 * @param id     l'id del premio
 * @param classe la classe scelta
 */
export function nomePremio(id, classe) {
  const perClasse = NOMI_PER_CLASSE[classe];
  if (perClasse && perClasse[id]) return perClasse[id];
  const p = PREMI.find((x) => x.id === id);
  return p ? p.nome : id;
}

// ===========================================================================
// LE FOTO DEL PERSONAGGIO, UNA PER OGNI ARMATURA
// ===========================================================================
//
// Ste (11/10/2026): "ogni volta che sblocco qualcosa quell'immagine deve
// vedersi meglio", cioe' il personaggio deve cambiare da solo.
//
// Prima c'era UNA foto sola (quella grande di rpg.png) più una fila di pezzi
// sciolti presi dalla scheda. I pezzi non tornavano: venivano ritagliati da una
// scheda diversa e con un'altra posa, quindi sembravano appiccicati addosso.
//
// Adesso c'e' UNA FOTO PER OGNI LIVELLO, e si cambia da sola contando quanti
// premi hai preso. Il numero di premi sbloccati dice il livello: 0 armature =
// nudo, 1 = bracciali, 2 = corazza, e così via.
//
// La cosa importante: si conta il RECORD DI STREAK (quello che hai già
// raggiunto una volta), non la streak di oggi. Se smetti una settimana non ti
// spogli di dosso l'armatura che ti sei guadagnato.
//
// I 6 stati corrispondono ai 6 premi di `PREMI`:
//
//   stato 0 = nessun premio sbloccato -> nudo
//   stato 1 = 1 premio  (bracciali)   -> bracciali
//   stato 2 = 2 premi  (corazza)      -> corazza aperta
//   stato 3 = 3 premi  (armatura)     -> armatura di ferro
//   stato 4 = 4 premi  (arma)         -> armatura + prima arma
//   stato 5 = 5 o 6 premi             -> completo
//
// Il 6o premio (quello a 75 giorni) non ha un'immagine tutta sua: e' l'AURA,
// una luce che si accende sopra il personaggio già completo. Perche' nella
// scheda ci sono 6 righe e 6 armature, e l'ultima riga e' già "tutto addosso".

/** I sei stati visivi del personaggio, dal nudo al completo. */
export const STATI_IMMAGINE = [
  { id: 'nudo', nome: 'Senza armatura', riga: 'niente addosso' },
  { id: 'bracciali', nome: 'Bracciali', riga: 'bracciali di cuoio' },
  { id: 'corazza', nome: 'Corazza', riga: 'corazza aperta' },
  { id: 'armatura', nome: 'Armatura', riga: 'armatura di ferro' },
  { id: 'arma', nome: 'Arma', riga: 'armatura e arma' },
  { id: 'completo', nome: 'Completo', riga: 'tutto addosso' },
];

/**
 * In che stato si vede il personaggio, dato quello che ha già sbloccato.
 *
 * @param premi  la lista di `premi` che arriva da `calcolaAvatar`
 */
export function statoVisivo(premi) {
  const lista = premi || [];
  const sbloccati = lista.filter((p) => p && p.sbloccato).length;
  const ultimo = STATI_IMMAGINE.length - 1;
  const indice = Math.max(0, Math.min(ultimo, sbloccati));
  return {
    indice,
    stato: STATI_IMMAGINE[indice],
    sbloccati,
    totale: lista.length,
    // L'AURA arriva col 6o premio, quello che non ha un'immagine tutta sua.
    aura: sbloccati >= lista.length && lista.length > 0,
    completo: sbloccati >= ultimo,
  };
}

/**
 * Il percorso dell'immagine di quello stato.
 *
 * Sono file `.webp`, non `.png`. Le foto sono state ingrandite di 3 volte
 * (Lanczos + maschera di contrasto) perché la griglia da cui vengono era piccola:
 * senza, sul telefono il browser le allungava e diventavano sfocate. WebP tiene la
 * stessa immagine a meta' dei byte, quindi si possono tenere tutte e 18 in cache
 * senza appesantire l'app.
 *
 * @param classeId  l'id della classe (guerriero, berserker, assassino)
 * @param indice    lo stato, da `statoVisivo`
 */
export function percorsoStato(classeId, indice) {
  const ultimo = STATI_IMMAGINE.length - 1;
  const n = Math.max(0, Math.min(ultimo, Math.round(Number(indice) || 0)));
  return `img/personaggi/stati/${classeId}-${n}.webp${versioneRisorse()}`;
}

/**
 * IL NUMERO DI VERSIONE ANCHE NELL'INDIRIZZO DELLE FOTO.
 *
 * Ste (12/10/2026), la terza volta che la stessa cosa morde: "ma non è cambiato
 * nulla", con la foto nuova già online e verificata byte per byte.
 *
 * Il CSS aveva il numero (`stile.css?v=254`) e quindi si aggiornava. Le foto
 * no: l'indirizzo era sempre `img/personaggi/stati/berserker-5.webp`, identico
 * per sempre, e su GitHub Pages i file statici hanno una scadenza lunghissima.
 * Il browser restituiva la copia di prima, per sempre, e io cambiavo il file
 * guardando i numeri salire senza che la pagina cambiasse.
 *
 * La lezione e' la stessa del CSS, e stavolta la si applica dove mancava: se
 * il contenuto di un file cambia, il SUO INDIRIZZO deve cambiare. Il numero
 * viene letto da `window.PALESTRA_VERSIONE`, che index.html dichiara prima dei
 * moduli, quindi non si può dimenticare di allinearlo a mano.
 */
function versioneRisorse() {
  const v = (typeof globalThis !== 'undefined' && globalThis.PALESTRA_VERSIONE) || '';
  return v ? `?v=${v}` : '';
}

/**
 * LA FILA DELLA PROGRESSIONE: una casella per premio, con il NOME GIUSTO.
 *
 * Ste (12/10/2026): "nelle foto piccole spunta senza armatura, bracciali, corazza,
 * armatura, arma, completo. ma giù nelle ricompense, dove c'è anche il lucchetto,
 * spunta bracciali di cuoio, vesti leggeri, cintura da assassino, pugnale,
 * armatura leggendaria, arma divina: che sono cose diverse".
 *
 * Ha ragione, e il difetto era mio. La fila usava i nomi degli STATI ("Corazza",
 * "Armatura", "Arma"), cioè un vocabolario inventato, mentre la lista delle ricompense
 * usa i nomi di `PREMI` rimescolati per classe ("Vesti leggeri", "Cintura da
 * assassino", "Pugnale"). Due elenchi diversi per la stessa cosa: uno dice "Corazza"
 * e l'altro "Vesti leggere" per lo stesso sblocco, e non si capisce quale sia
 * quello giusto.
 *
 * Qui le due liste sono la stessa lista: una casella per ogni premio di `PREMI`, con
 * il nome che dice la classe di chi guarda. C'è in più la casella "senza armatura",
 * che non è una ricompensa ma il punto da cui si parte.
 *
 * Percheé le caselle sono SETTE e le immagini sei: la settima casella è "Aura divina",
 * il sesto premio, che non ha una foto tutta sua (l'ultima riga è già "tutto
 * addosso"). Quindi quella casella mostra l'ultima foto CON l'aura accesa sopra,
 * che è quello che `viso.aura` dice.
 *
 * @param premi        la lista di `premi` da `calcolaAvatar`
 * @param classeId     la classe scelta, per i nomi
 * @param recordStreak il record di giorni di fila: serve per dire quanti ne mancano
 */
export function schedaProgressione(premi, classeId, recordStreak = 0, streakAttuale = null) {
  const lista = premi || [];
  const record = Number(recordStreak) || 0;
  // QUANTI GIORNI MANCANO ALLA RICOMPENSA SUCCESSIVA (Ste, 21/10/2026)
  //
  // "quando qualcuno perde la streak, le cose sbloccate dell'avatar devono restare, ma i
  // giorni di streak per sbloccare la ricompensa successiva devono ritornare come
  // all'inizio, che ricomincia a contarli da capo".
  //
  // Le cose sbloccate restano: si guarda il RECORD (quello che hai già raggiunto una
  // volta). Ma il contatore per la prossima ricompensa si conta con la STREAK DI
  // ADESSO: se hai perso la fila di giorni, la prossima ricompensa riparte da capo.
  const adesso = (streakAttuale === null || streakAttuale === undefined)
    ? record
    : (Number(streakAttuale) || 0);
  const caselle = [{
    chiave: 'niente',
    nome: STATI_IMMAGINE[0].nome,
    riga: STATI_IMMAGINE[0].riga,
    immagine: 0,
    sbloccato: true,
    inCorso: false,
    aura: false,
    giorni: 0,
    mancano: 0,
  }];

  for (let i = 0; i < lista.length; i++) {
    const p = lista[i];
    // LA FOTO DELLA CASELLA. `i` parte da 0 e la casella 0 e' "senza armatura", che
    // e' già la foto nuda: quindi il PRIMO premio (i = 0) deve mostrare la foto con
    // i bracciali, che e' lo stato 1. Il `+ 1` e' quel passaggio, e senza sembrava
    // che ogni ricompensa mostrasse la foto di quella prima.
    // Poi si ferma a 5: il sesto premio non ha una foto tutta sua (l'ultima riga e'
    // già "tutto addosso"), quindi riusa quella e ci mette l'aura sopra.
    const immagine = Math.min(i + 1, STATI_IMMAGINE.length - 1);
    caselle.push({
      chiave: p.id,
      nome: nomePremio(p.id, classeId),
      riga: STATI_IMMAGINE[immagine].riga,
      immagine,
      sbloccato: !!p.sbloccato,
      inCorso: false,
      // L'AURA è l'ultimo premio: non un'immagine nuova, ma una luce sopra l'ultima.
      aura: i === lista.length - 1,
      giorni: p.giorni,
      mancano: Math.max(0, (Number(p.giorni) || 0) - adesso),
    });
  }
  return caselle;
}

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

export function minutiDiCardio(valore, unita = 'legacy') {
  const n = Number(valore) || 0;
  if (n <= 0) return 0;
  // I valori inseriti dalla schermata nuova hanno l'unita' salvata insieme al
  // numero. Cosi' 60 minuti restano 60 minuti; non vengono scambiati per secondi.
  if (unita === 'minuti') return n <= 3600 ? n : 0;
  if (unita === 'secondi') return n <= 216000 ? n / 60 : 0;
  // I dati vecchi non hanno l'unita': per loro resta valida la regola storica.
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
      cardio += minutiDiCardio(r, s.durata_unita || 'legacy');
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
  const xpInizioLivello = 10 * (livello - 1) ** 2;
  const xpProssimoLivello = 10 * livello ** 2;
  const xpPerLivello = xpProssimoLivello - xpInizioLivello;
  const xpNelLivello = Math.max(0, xp - xpInizioLivello);
  const progressoLivello = Math.max(0, Math.min(1, xpNelLivello / xpPerLivello));
  const xpMancanti = Math.max(0, xpProssimoLivello - xp);

  // Le ARMATURE. Sbloccate con la streak PIÙ LUNGA MAI RAGGIUNTA (non quella di
  // adesso): se hai raggiunto 30 giorni una volta, l'elmo resta tuo anche dopo che
  // la streak si è rotta. Altrimenti si perderebbe tutto il lavoro fatto.
  //
  // Il campo `record` viene da streak.js ed è la sequenza più lunga mai fatta. Se
  // non ci fosse, un premio lo prendi e poi salti due settimane: te lo toglie. Non
  // sembra giusto perdere un'armatura per una settimana saltata.
  const recordStreak = Math.max(Number(streak.record) || 0, Number(streak.giorni) || 0);
  // LO SBLOCCO ADESSO GUARDA SOLO LA STREAK.
  //
  // Ste (10/10/2026): "l'avatar deve cambiare aspetto visivo automaticamente in
  // base alla streak attuale di allenamento". Solo la streak.
  //
  // Prima ci voleva anche la statistica (`haStreak && haStat`). È stato tolto, e la
  // ragione è che la statistica non dice se sei costante: dice quanto sei forte in
  // un numero, e chi si allena tre giorni di fila con la panca e chi con i trazioni
  // ha la stessa costanza ma statistiche diverse. Il personaggio premia la
  // costanza, quindi la costanza deve essere l'unica cosa che conta.
  //
  // Il record di streak resta la metrica, non la streak di oggi: se ti fermi una
  // settimana non ti spogli di dosso l'armatura che ti sei guadagnato.
  const premi = PREMI.map((p) => {
    const haStreak = recordStreak >= p.giorni;
    const mancano = Math.max(0, p.giorni - recordStreak);
    return {
      ...p,
      sbloccato: haStreak,
      perche: haStreak
        ? 'sbloccato'
        : `ti mancano ${mancano} ${mancano === 1 ? 'giorno' : 'giorni'} di fila`,
    };
  });

  return {
    st, base, classe: c, streak, recordStreak, livello, xp,
    xpInizioLivello, xpProssimoLivello, xpPerLivello, xpNelLivello, progressoLivello, xpMancanti,
    premi, volForza, volTot, cardio, giorniAllenati: giorniUnici,
  };
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
