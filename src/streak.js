// streak.js -- la streak della palestra.
//
// La streak si legge dagli allenamenti VERAMENTE completati (sedute chiuse con
// stato "completata"). Non conta aprire l'app, non conta toccare una scheda:
// conta solo un allenamento finito.
//
// ===================================================================
// LA STREAK USA I GIORNI CHE HAI DETTO TU (08/10/2026)
// ===================================================================
// Ste: "questa app devo darla pure a dei miei compagni, non tutti fanno i miei
// stessi giorni, quindi devi mettere nell'app che devo specificare che giorni vado
// in palestra e automaticamente funziona la streak".
//
// LA STREAK DI PRIMA ERA SBAGLIATA, e non per poco. Contava i giorni di CALENDARIO
// consecutivi: se il programma prevedeva quattro giorni e tu riposavi tre, la
// streak non poteva MAI superare quattro, e si rompeva ogni volta dal riposo lungo.
// Verificato sui numeri veri di Ste: allenando 4 giorni su 7 la streak arriva a 4 e
// si azzera.
//
// Adesso la regola e' la sua, ed e' quella giusta:
//
//   - la streak conta gli ALLENAMENTI, non i giorni di calendario;
//   - si interrompe SOLO se salti un giorno che avevi detto di allenare;
//   - un allenamento inaspettato (un giorno di riposo) conta comunque, e non
//     azzera niente.
//
// Perche' "solo se salti un giorno previsto" e non "se passano due giorni": chi
// allena quattro volte su sette ha diritto al riposo, e se la streak si rompesse
// per quello non ci sarebbe piu' motivo di allenarsi con regolarita'. Il riposo e'
// parte del programma, non una colpa.
//
// I giorni sono scelti dalla persona e salvati nel suo profilo: ogni account ha i
// suoi, quindi i compagni di Ste non vengono misurati con i suoi.
//
// SE I GIORNI NON SONO SCELTI, non si rompe mai su niente: si conta solo se
// l'ultimo allenamento e' oggi o ieri (vedi `calcolaStreak`). Meglio una streak
// che non azzera per errore che una che ti toglie traguardi giusti.

/**
 * I giorni della settimana in cui alleni, come 0 = domenica ... 6 = sabato.
 *
 * Se non ci sono, si torna alla regola semplice (l'ultimo allenamento e' oggi o
 * ieri). Non si indovina: indovinare sarebbe sbagliare la streak di qualcuno.
 */
export function giorniPrevistiDa(profilo) {
  const g = profilo && profilo.giorni_allenamento;
  if (!Array.isArray(g)) return null;
  const numeri = g.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return numeri.length ? [...new Set(numeri)].sort((a, b) => a - b) : null;
}

/** Il giorno della settimana (0 = domenica) di una data ISO. */
function giornoSettimana(iso) {
  const d = new Date(String(iso) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  return d.getDay();
}

/** Il giorno dopo, in ISO. Serve per camminare giorno per giorno. */
function giornoSuccessivo(iso) {
  const d = new Date(String(iso) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 1);
  return isoGiorno(d);
}

/**
 * Quanti allenamenti di fila, contati sui giorni che hai scelto.
 *
 * Il cammino e' fatto sui GIORNI PREVISTI, non su tutti i giorni: tra un martedi'
 * e un mercoledi' non c'e' nessun giorno previsto in mezzo, quindi sono consecutivi
 * anche se il calendario ha dentro un lunedi' che non ti riguarda.
 *
 * Il giorno corrente, se previsto e non ancora fatto, NON azzera: sono le 8 di sera
 * e non ti e' ancora successo niente.
 *
 * @param giorni       gli allenamenti, in ordine (non serve siano ordinati)
 * @param previsti     i giorni della settimana scelti; null = regola semplice
 * @param oggiISO      il giorno di oggi
 */
export function contaAllenamentiConsecutiviConGiorni(giorni, previsti, oggiISO) {
  const set = new Set(giorni || []);
  if (!set.size) return 0;

  // SENZA GIORNI SCELTI si contano i giorni di CALENDARIO consecutivi che
  // arrivano fino a ieri.
  //
  // Non e' la regola giusta per chi allena quattro volte su sette (per quello ci
  // sono i giorni scelti), ma e' quella che non sbaglia nessuno: finche' la
  // persona non sceglie, si sa solo che gli ultimi due giorni li ha fatti o no.
  // E restituire sempre 1 sarebbe peggio: direbbe che tre allenamenti di fila
  // valgono come uno.
  if (!previsti) {
    if (!set.has(oggiISO) && !set.has(giornoPrecedente(oggiISO))) return 0;
    let n = 0;
    let g = set.has(oggiISO) ? oggiISO : giornoPrecedente(oggiISO);
    for (let i = 0; i < 200000; i++) {
      if (!set.has(g)) break;
      n++;
      const prec = giornoPrecedente(g);
      if (!prec) break;
      g = prec;
    }
    return n;
  }

  const previstiSet = new Set(previsti);
  const ordinati = [...set].sort((a, b) => b.localeCompare(a));
  const ultimo = ordinati[0];
  // Se tra l'ultimo allenamento e oggi c'e' un giorno che avevi scelto e non l'hai
  // fatto, la streak e' rotta. Il cammino e' in AVANTI e guarda solo i giorni
  // scelti: il riposo non conta, quindi non ti azzera niente.
  if (!streckAncoraViva(set, ultimo, oggiISO, previstiSet)) return 0;

  // e adesso il conteggio, camminando INDIETRO dall'ultimo allenamento
  let n = 0;
  let g = ultimo;
  for (let i = 0; i < 20000; i++) {
    if (set.has(g)) { n++; g = giornoPrecedente(g); continue; }
    // giorno non fatto: azzera SOLO se era un giorno previsto
    if (previstiSet.has(giornoSettimana(g))) break;
    // era un giorno di riposo: continua a camminare indietro
    const prec = giornoPrecedente(g);
    if (!prec) break;
    g = prec;
  }
  return n;
}

/**
 * La streak e' ancora viva?
 *
 * La domanda e' una sola, e si fa camminando in AVANTI dall'ultimo allenamento
 * fino a oggi: hai saltato qualche giorno che avevi detto di fare?
 *
 * Se sì', è rotta. Se no', è viva, e il conteggio lo fa l'altra funzione.
 *
 * Il caso che è facile sbagliare, ed è quello di Luca nel test S5: Luca allena
 * lun/mar/mer/ven, l'ultimo allenamento è venerdì e oggi è sabato. Il sabato non è
 * un giorno suo, quindi non ha saltato niente e la streak è viva. Una versione
 * che guarda "quanti giorni sono passati" invece che "quali giorni erano previsti"
 * lo buca per un riposo che non si era mai chiesto di fare.
 */
function streckAncoraViva(set, ultimo, oggiISO, previstiSet) {
  if (ultimo >= oggiISO) return true; // non e' ancora passato nulla
  let g = giornoSuccessivo(ultimo);
  for (let i = 0; i < 400; i++) {
    if (!g || g > oggiISO) return true; // siamo arrivati a oggi senza saltare niente
    if (previstiSet.has(giornoSettimana(g)) && !set.has(g)) return false;
    g = giornoSuccessivo(g);
  }
  return true;
}

/** I giorni in cui hai davvero allenato, dal piu' recente al piu' vecchio. */
export function giorniAllenati(sedute) {
  const giorni = new Set();
  for (const s of (sedute || [])) {
    if (!s || s.eliminata) continue;
    if (s.stato !== 'completata') continue;
    const d = String(s.data || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) giorni.add(d);
  }
  return [...giorni].sort((a, b) => b.localeCompare(a));
}

/** Quanti giorni di fila, fino a ieri. Serve al test e alla spiegazione. */
export function contaConsecutivi(giorni, oggiISO) {
  const set = new Set(giorni || []);
  let n = 0;
  let giorno = oggiISO;
  // comincia da ieri: la streak di oggi si aggiunge solo se la giornata c'e' gia' stata
  for (;;) {
    const precedente = giornoPrecedente(giorno);
    if (!set.has(precedente)) break;
    n++;
    giorno = precedente;
    if (n > 100000) break; // difesa: nessun ciclo infinito
  }
  return n;
}

function giornoPrecedente(iso) {
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 1);
  return isoGiorno(d);
}

export function isoGiorno(data) {
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${g}`;
}

/**
 * La streak di oggi.
 *
 * @param sedute   le sedute chiuse
 * @param oggi     il giorno di oggi in ISO
 * @param profilo  il profilo della persona: da lì arrivano i giorni in cui allena.
 *                 Se non ci sono, si applica la regola semplice.
 *
 * La regola semplice (quando i giorni non sono scelti): l'ultimo allenamento deve
 * essere oggi o ieri. Non e' la regola giusta per chi allena quattro volte su
 * sette, ma e' quella che non sbaglia nessuno: non azzera niente che non sia
 * sicuramente saltato.
 */
export function calcolaStreak(sedute, oggi = isoGiorno(new Date()), profilo = null) {
  const giorni = giorniAllenati(sedute);
  const previsti = giorniPrevistiDa(profilo);
  if (!giorni.length) {
    return {
      giorni: 0, attiva: false, interrotta: false, giorniAllenati: [],
      ultimoGiorno: null, prossimoObiettivo: null, giorniPrevisti: previsti,
      testo: 'Non hai ancora finito un allenamento: la streak parte dal primo allenamento.',
    };
  }
  const ultimo = giorni[0];
  const consecutive = contaAllenamentiConsecutiviConGiorni(giorni, previsti, oggi);
  const fattoOggi = ultimo === oggi;
  // la streak e' viva se l'ultimo allenamento non e' "passato": cioe' oggi non e'
  // ancora un giorno previsto saltato. Il calcolo dei consecutivi dice gia' tutto.
  const viva = consecutive > 0 || (fattoOggi && consecutive >= 0);
  const valore = consecutive;

  // IL RECORD DELLA STREAK, e serve all'avatar RPG (08/10/2026).
  //
  // Senza questo le armature si sbloccherebbero solo con la streak di ADESSO: se
  // la streak si rompe e ricomincia, perdi l'armatura che avevi sbloccato. Ma un
  // premio che hai gia' ottenuto non si tocca: si sblocca con la streak PIU' LUNGA
  // che hai mai fatto.
  //
  // Il record si calcola ricalcolando tutte le serie, quindi costa una passata sui
  // giorni. Non e' gratis, ma la schermata della streak lo mostra gia' e i dati sono
  // in memoria.
  const record = Math.max(valore, recordStreak(giorni, previsti, oggi));

  // il prossimo giorno previsto non ancora fatto: serve a dire "ti manca giovedi"
  const prossimoGiorno = previsti ? prossimoGiornoPrevisto(previsti, ultimo, oggi) : null;

  return {
    giorni: viva ? valore : 0,
    attiva: viva,
    interrotta: !viva,
    fattoOggi,
    giorniAllenati: giorni,
    ultimoGiorno: ultimo,
    giorniPrevisti: previsti,
    prossimoGiorno,
    record,
    prossimoObiettivo: prossimoMilestone(record),
    testo: testoStreak({ viva, valore, fattoOggi, ultimo, previsti, prossimoGiorno }),
  };
}

/**
 * La sequenza PIU' LUNGA mai fatta, in giorni di fila.
 *
 * Serve all'avatar RPG: un premio che hai sbloccato resta tuo anche se la streak si
 * e' rotta e ricomincia. Senza questo, saltare una settimana ti toglieva
 * l'armatura che ti eri guadagnato.
 *
 * IL PERCHÉ DI QUESTA FUNZIONE È SEPARATA: `contaAllenamentiConsecutiviConGiorni`
 * risponde "la mia streak di ADESSO è viva?", quindi restituisce 0 se non lo è. Per
 * il record serve un'altra domanda: "qual è stata la sequenza più lunga in tutta la
 * mia storia?". Quindi qui si conta diversamente: si prende il primo giorno
 * allenato, si conta quanto dura la sequenza, e poi si salta oltre la fine e si
 * ricomincia dal primo allenamento successivo.
 */
function recordStreak(giorni, previsti, oggiISO) {
  const ordinati = [...giorni].sort();
  if (!ordinati.length) return 0;

  let massimo = 0;
  let inizio = 0;
  while (inizio < ordinati.length) {
    const { n, fine } = lunghezzaSequenzaDa(ordinati, inizio, previsti);
    if (n > massimo) massimo = n;
    inizio = Math.max(inizio + 1, fine);
  }
  return massimo;
}

/**
 * Quanto dura la sequenza che parte da `daIndice`, e quanti elementi consuma.
 *
 * Restituisce sia la lunghezza in giorni di fila sia l'indice del primo allenamento
 * dopo la fine della sequenza: il chiamante usa l'indice per non contare due volte
 * gli stessi giorni.
 */
function lunghezzaSequenzaDa(ordinati, daIndice, previsti) {
  const previstiSet = previsti ? new Set(previsti) : null;
  let n = 0;
  let i = daIndice;
  // i giorni sono in ordine: si avanza e si conta finche' la catena regge
  while (i < ordinati.length) {
    if (n === 0) { n = 1; i++; continue; }
    const precedente = ordinati[i - 1];
    const corrente = ordinati[i];
    // quanti giorni di calendario sono tra i due
    const giorniDi = giorniDiCalendario(precedente, corrente);
    // se tra i due c'era un giorno previsto, e non l'hai fatto, la catena si rompe
    if (precedentiSetHa(previstiSet, precedente, corrente)) { break; }
    // il salto di giorni di calendario non conta per la streak: quello che conta e'
    // se hai saltato un giorno PREVISTO
    if (giorniDi === 0) break;
    n++;
    i++;
  }
  return { n, fine: i };
}

/** Quanti giorni di calendario da `a` a `b` (esclusi). */
function giorniDiCalendario(a, b) {
  const da = new Date(String(a) + 'T12:00:00');
  const al = new Date(String(b) + 'T12:00:00');
  if (Number.isNaN(da.getTime()) || Number.isNaN(al.getTime())) return 0;
  return Math.round((al - da) / 86400000);
}

/** Tra due giorni c'era un giorno previsto che NON hai allenato? */
function precedentiSetHa(previstiSet, da, a) {
  if (!previstiSet) return false;
  // se i due giorni sono consecutivi non c'e' niente in mezzo
  if (giorniDiCalendario(da, a) <= 1) return false;
  let g = giornoSuccessivo(da);
  while (g && g < a) {
    if (previstiSet.has(giornoSettimana(g))) return true;
    g = giornoSuccessivo(g);
  }
  return false;
}

/** Il prossimo giorno previsto che non hai ancora fatto dopo l'ultimo allenamento. */
function prossimoGiornoPrevisto(previsti, ultimo, oggi) {
  let g = ultimo;
  for (let i = 0; i < 60; i++) {
    const succ = giornoSuccessivo(g);
    if (!succ || succ > oggi) return null;
    if (previsti.includes(giornoSettimana(succ))) return succ;
    g = succ;
  }
  return null;
}

/**
 * La frase, scritta sul tuo caso.
 *
 * Prima diceva una cosa falsa a chi allena quattro volte su sette: il conto dei
 * giorni di calendario si fermava al riposo lungo e la streak moriva ogni venerdi'.
 */
function testoStreak({ viva, valore, fattoOggi, ultimo, previsti, prossimoGiorno }) {
  if (!previsti) {
    if (!viva) return `Streak interrotta: l'ultimo allenamento e' stato il ${ultimo}. Allenandoti oggi riparti da 1.`;
    return fattoOggi
      ? `Streak di ${valore} ${valore === 1 ? 'giorno' : 'giorni'}: oggi hai gia' allenato.`
      : `Streak di ${valore} ${valore === 1 ? 'giorno' : 'giorni'}: ti manca solo oggi per continuare.`;
  }
  if (!viva) {
    return `Streak interrotta: l'ultimo allenamento e' stato il ${ultimo}. Allenandoti al prossimo giorno che hai scelto riparti da 1.`;
  }
  const giorni = `${valore} ${valore === 1 ? 'allenamento' : 'allenamenti'} di fila`;
  if (prossimoGiorno) {
    const quando = dataLeggibileBreve(prossimoGiorno);
    return `Streak di ${giorni}: ti manca solo ${quando} per continuare.`;
  }
  // IL CASO CHE DAVA UNA FRASE FALSA. Oggi e' un giorno di riposo, non hai allenato
  // oggi (fattoOggi = false), ma la frase diceva "oggi hai gia' allenato".
  //
  // Non e' uno schermo rotto perche' questo testo oggi non viene disegnato da
  // nessuna parte (solo dai test), quindi nessuno lo leggeva. Pero' un testo che
  // mente e' un testo da correggere prima che qualcuno lo mostri, e il giorno in cui
  // lo si mostra la frase falsa diventa subito leggibile.
  if (fattoOggi) return `Streak di ${giorni}: oggi hai gia' allenato. Ti torna ${prossimoGiornoPrevistoTesto(previsti)}.`;
  return `Streak di ${giorni}: oggi e' giorno di riposo, non ti toglie niente. Ti torna ${prossimoGiornoPrevistoTesto(previsti)}.`;
}

/** Il nome del prossimo giorno previsto, per la frase. */
function prossimoGiornoPrevistoTesto(previsti) {
  const oggi = new Date();
  for (let i = 1; i <= 8; i++) {
    const d = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + i, 12);
    if (previsti.includes(d.getDay())) return NOME_GIORNO[d.getDay()];
  }
  return 'il prossimo giorno';
}

const NOME_GIORNO = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];

function dataLeggibileBreve(iso) {
  const d = new Date(String(iso) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  const oggi = isoGiorno(new Date());
  if (iso === oggi) return 'oggi';
  const domani = giornoSuccessivo(oggi);
  if (iso === domani) return 'domani';
  return `${NOME_GIORNO[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

// ---------------------------------------------------------------------------
// I traguardi: la logica e' dinamica, non una lista scritta a mano fino a 1000.
// ---------------------------------------------------------------------------

/** I traguardi base, fino a 1000. Piu' avanti si continua a mille. */
export const TRAGUARDI_BASE = [10, 20, 30, 40, 50, 100, 200, 500, 1000];

/** Tutti i traguardi fino a `giorni`, compreso quello appena superato. */
export function traguardiFinoA(giorni) {
  const n = Math.max(0, Number(giorni) || 0);
  const base = TRAGUARDI_BASE.filter((t) => t <= n);
  if (n > 1000) {
    for (let t = 2000; t <= n; t += 1000) base.push(t);
  }
  return base;
}

/**
 * Il prossimo traguardo da raggiungere.
 *
 * IL DIFETTO CHE C'ERA (08/10/2026): con n = 2000 la funzione restituiva 2000, cioe'
 * un traguardo GIA' superato. Lo stesso a 3000, 4000, e cosi' via. Serviva una
 * streak di cinque anni e mezzo per accorgersene, quindi il bug era nascosto, ma
 * la schermata avrebbe detto "prossimo obiettivo: 2000 giorni" a chi ne aveva
 * gia' fatti 2000. Ora il traguardo restituito e' SEMPRE maggiore di quello fatto.
 */
export function prossimoMilestone(giorni) {
  const n = Math.max(0, Number(giorni) || 0);
  for (const t of TRAGUARDI_BASE) if (t > n) return t;
  // sopra i traguardi base si prosegue di mille in mille, MA sempre sul primo
  // paletto che non hai ancora raggiunto: e' la differenza fra "prossimo" e "già fatto"
  return Math.floor(n / 1000) * 1000 + 1000;
}

/** I traguardi appena superati: servono all'animazione e all'Aura. */
export function traguardiNuovi(giorni, giaAssegnati = []) {
  const fatti = new Set((giaAssegnati || []).map((x) => Number(x)));
  return traguardiFinoA(giorni).filter((t) => !fatti.has(t));
}

/** Quanta Aura dà un traguardo di streak. */
export function auraTraguardo(giorni) {
  const n = Math.max(0, Number(giorni) || 0);
  if (n >= 1000) return 500;
  if (n >= 500) return 300;
  if (n >= 200) return 200;
  if (n >= 100) return 150;
  if (n >= 50) return 100;
  if (n >= 10) return 50;
  return 0;
}

export function ricompensaTraguardo(giorni) {
  return { aura: auraTraguardo(giorni), xp: Math.max(10, Math.round(giorni / 2)) };
}

// ---------------------------------------------------------------------------
// Il colore del fuoco: cambia da solo ai traguardi, senza codice scritto a mano
// per ogni numero. Oltre 1000 si sale di nuovo verso il ciano.
// ---------------------------------------------------------------------------

export const LIVELLI_FUOCO = [
  { chiave: 'spenta',   nome: 'Spenta',        colore: '#4a4a55', quando: (n) => n <= 0 },
  { chiave: 'normale',  nome: 'Normale',       colore: '#ff9f45', quando: (n) => n >= 1 && n < 10 },
  { chiave: 'giallo',   nome: 'Giallo',        colore: '#ffd166', quando: (n) => n >= 10 && n < 20 },
  { chiave: 'arancio',  nome: 'Arancio vivo',  colore: '#ffa62b', quando: (n) => n >= 20 && n < 30 },
  { chiave: 'mandarino',nome: 'Mandarino',     colore: '#ff7a45', quando: (n) => n >= 30 && n < 40 },
  { chiave: 'rosso',    nome: 'Rosso',         colore: '#ff5f6d', quando: (n) => n >= 40 && n < 50 },
  { chiave: 'rosa',     nome: 'Rosa',          colore: '#ff3d7f', quando: (n) => n >= 50 && n < 100 },
  { chiave: 'viola',    nome: 'Viola',         colore: '#c04cff', quando: (n) => n >= 100 && n < 200 },
  { chiave: 'indaco',   nome: 'Indaco',        colore: '#7c5cff', quando: (n) => n >= 200 && n < 500 },
  { chiave: 'blu',      nome: 'Blu',           colore: '#4a7dff', quando: (n) => n >= 500 && n < 1000 },
  { chiave: 'ciano',    nome: 'Ciano',         colore: '#00e5ff', quando: (n) => n >= 1000 },
];

/** Il livello di fuoco per un numero di giorni. */
export function livelloFuoco(giorni) {
  const n = Math.max(0, Number(giorni) || 0);
  for (const l of LIVELLI_FUOCO) if (l.quando(n)) return l;
  return LIVELLI_FUOCO[0];
}

/**
 * Come si disegna il simbolo della streak: acceso, spento, e con che colore.
 * Restituisce anche il testo da mostrare vicino ("12 giorni").
 */
export function aspettoStreak(streak) {
  const giorni = (streak && streak.giorni) || 0;
  const acceso = !!(streak && streak.attiva);
  const livello = livelloFuoco(giorni);
  return {
    acceso,
    livello: livello.chiave,
    nome: livello.nome,
    colore: acceso ? livello.colore : LIVELLI_FUOCO[0].colore,
    simbolo: 'fuoco',
    giorni,
    etichetta: acceso ? `${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}` : 'spenta',
  };
}