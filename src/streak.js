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
// Adesso la regola È la sua, ed È quella giusta:
//
//   - la streak conta gli ALLENAMENTI, non i giorni di calendario;
//   - si interrompe SOLO se salti un giorno che avevi detto di allenare;
//   - un allenamento inaspettato (un giorno di riposo) conta comunque, e non
//     azzera niente.
//
// Perche' "solo se salti un giorno previsto" e non "se passano due giorni": chi
// allena quattro volte su sette ha diritto al riposo, e se la streak si rompesse
// per quello non ci sarebbe più motivo di allenarsi con regolarita'. Il riposo È
// parte del programma, non una colpa.
//
// I giorni sono scelti dalla persona e salvati nel suo profilo: ogni account ha i
// suoi, quindi i compagni di Ste non vengono misurati con i suoi.
//
// SE I GIORNI NON SONO SCELTI, non si rompe mai su niente: si conta solo se
// l'ultimo allenamento È oggi o ieri (vedi `calcolaStreak`). Meglio una streak
// che non azzera per errore che una che ti toglie traguardi giusti.

/**
 * I giorni della settimana in cui alleni, come 0 = domenica ... 6 = sabato.
 *
 * Se non ci sono, si torna alla regola semplice (l'ultimo allenamento È oggi o
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
 * Il cammino È fatto sui GIORNI PREVISTI, non su tutti i giorni: tra un martedi'
 * e un mercoledi' non cÈ nessun giorno previsto in mezzo, quindi sono consecutivi
 * anche se il calendario ha dentro un lunedi' che non ti riguarda.
 *
 * Il giorno corrente, se previsto e non ancora fatto, NON azzera: sono le 8 di sera
 * e non ti È ancora successo niente.
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
  // Non È la regola giusta per chi allena quattro volte su sette (per quello ci
  // sono i giorni scelti), ma È quella che non sbaglia nessuno: finche' la
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
  // Se tra l'ultimo allenamento e oggi cÈ un giorno che avevi scelto e non l'hai
  // fatto, la streak È rotta. Il cammino È in AVANTI e guarda solo i giorni
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
 * La streak È ancora viva?
 *
 * La domanda È una sola, e si fa camminando in AVANTI dall'ultimo allenamento
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
  if (ultimo >= oggiISO) return true; // non È ancora passato nulla
  let g = giornoSuccessivo(ultimo);
  for (let i = 0; i < 400; i++) {
    if (!g || g > oggiISO) return true; // siamo arrivati a oggi senza saltare niente
    if (previstiSet.has(giornoSettimana(g)) && !set.has(g)) return false;
    g = giornoSuccessivo(g);
  }
  return true;
}

/** I giorni in cui hai davvero allenato, dal più recente al più vecchio. */
export function giorniAllenati(sedute, oggi = isoGiorno(new Date())) {
  const giorni = new Set();
  for (const s of (sedute || [])) {
    if (!s || s.eliminata) continue;
    if (s.stato !== 'completata') continue;
    const d = String(s.data || '').slice(0, 10);
    // LE SEDUTE DI DOMANI NON SONO GIORNI ALLENATI.
    //
    // Una seduta con data futura viene da un backup fatto su un altro dispositivo
    // (i fusi orari spostano la data) o da un orologio sbagliato. Prima entrava
    // nella lista come qualunque altra, e il risultato era assurdo: con una sola
    // seduta datata 2026-10-12 e oggi che è il 10, l'app scriveva "l'ultimo
    // allenamento è stato il 2026-10-12", cioè ti diceva che avevi smesso ad
    // allenarti da quando non ti eri mai allenato. E con i tuoi giorni scelti la
    // sessione futura "scavalcava" quella vera: streak 1 invece di 2.
    //
    // Non è un caso raro: il fuso orario sposta la data di qualche ora e una
    // seduta delle 23:30 registrata a Tokyo, per esempio, è di domani a Roma.
    if (d > oggi) continue;
    // IL CONTROLLO DELLA DATA VERA, non solo della forma.
    //
    // Prima bastava che la data assomigliasse a una data: `\d{4}-\d{2}-\d{2}` accetta
    // anche "2026-13-45", che non esiste. Verificato: finiva a schermo ("Streak
    // interrotta: l'ultimo allenamento è stato il 2026-13-45") e spostava la testa
    // della lista dei giorni, quindi il conteggio era sbagliato.
    //
    // Il perchÈ conta più di quanto sembri: `backup.js` non valida le date delle
    // sedute, quindi un backup fatto a mano o corrotto te le infila dentro. Un numero
    // che sembra una data ma non lo È È un numero che nessuno controlla, e questi
    // finiscono sempre a schermo.
    if (dataPossibile(d)) giorni.add(d);
  }
  return [...giorni].sort((a, b) => b.localeCompare(a));
}

/** La stringa È una data che esiste davvero? (niente 2026-13-45, niente 30/02) */
export function dataPossibile(iso) {
  const s = String(iso || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  // il confronto serve per i giorni che JavaScript "corregge" da solo: new Date
  // ('2026-02-30') diventa il 2 di marzo, quindi il confronto torna e lo scarta
  return isoGiorno(d) === s;
}

/** Quanti giorni di fila, fino a ieri. Serve al test e alla spiegazione. */
export function contaConsecutivi(giorni, oggiISO) {
  const set = new Set(giorni || []);
  let n = 0;
  let giorno = oggiISO;
  // comincia da ieri: la streak di oggi si aggiunge solo se la giornata cÈ già stata
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
 * essere oggi o ieri. Non È la regola giusta per chi allena quattro volte su
 * sette, ma È quella che non sbaglia nessuno: non azzera niente che non sia
 * sicuramente saltato.
 */
export function calcolaStreak(sedute, oggi = isoGiorno(new Date()), profilo = null) {
  // Si passa `oggi` a `giorniAllenati`: senza, il filtro sulle sedute future usa la
  // data vera del computer e non quella che il chiamante sta usando. In un test, o
  // con un backup importato, il conto cambia e la streak dice una cosa diversa da
  // quella che l'app mostra.
  const giorni = giorniAllenati(sedute, oggi);
  const previsti = giorniPrevistiDa(profilo);
  // IL CASO SENZA SEDUTE HA TUTTI I CAMPI, COME QUELLO CON LE SEDUTE.
  //
  // Prima qui l'oggetto aveva otto chiavi invece di tredici: mancavano record,
  // fattoOggi e prossimoGiorno, e `prossimoObiettivo` era null invece di un numero.
  // Non rompeva niente perchÈ ogni consumatore faceva `Number(record) || 0`, ma È
  // la forma peggiore di difetto: due oggetti con lo stesso nome e forme diverse.
  // Il prossimo che scrive `record + 1` senza controllare riceve NaN, e il prossimo
  // che mostra `prossimoObiettivo` a schermo stampa "null".
  if (!giorni.length) {
    return {
      giorni: 0, attiva: false, interrotta: false, fattoOggi: false,
      giorniAllenati: [], ultimoGiorno: null, giorniPrevisti: previsti,
      prossimoGiorno: null, record: 0,
      prossimoObiettivo: prossimoMilestone(0),
      testo: 'Non hai ancora finito un allenamento: la streak parte dal primo allenamento.',
    };
  }
  const ultimo = giorni[0];
  const consecutive = contaAllenamentiConsecutiviConGiorni(giorni, previsti, oggi);
  const fattoOggi = ultimo === oggi;
  // la streak È viva se l'ultimo allenamento non È "passato": cioe' oggi non È
  // ancora un giorno previsto saltato. Il calcolo dei consecutivi dice già tutto.
  // LA STREAK È VIVA SE CONTA ALMENO UN GIORNO.
  //
  // Qui c'era `consecutive > 0 || (fattoOggi && consecutive >= 0)`. La seconda
  // parte è inutile: `consecutive >= 0` è sempre vero (un numero non può essere
  // minore di zero), quindi la condizione diventava solo `|| fattoOggi`, e la
  // streak risultava "viva" anche con il conteggio a zero.
  //
  // Ste (10/10/2026): "la streak è accesa ma è a 0". Eccola: la card diceva
  // "accesa" con il numero 0 dentro, e il colore veniva dal livello zero, che è il
  // grigio della spenta. Tre informazioni contraddittorie nella stessa riga.
  //
  // Se hai allenato oggi, il conteggio ti conta anche oggi: sopra non serve
  // nessuna scorciatoia.
  const viva = consecutive > 0;
  const valore = consecutive;

  // IL RECORD DELLA STREAK, e serve all'avatar RPG (08/10/2026).
  //
  // Senza questo le armature si sbloccherebbero solo con la streak di ADESSO: se
  // la streak si rompe e ricomincia, perdi l'armatura che avevi sbloccato. Ma un
  // premio che hai già ottenuto non si tocca: si sblocca con la streak PIù LUNGA
  // che hai mai fatto.
  //
  // Il record si calcola ricalcolando tutte le serie, quindi costa una passata sui
  // giorni. Non È gratis, ma la schermata della streak lo mostra già e i dati sono
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
    testo: testoStreak({ viva, valore, fattoOggi, ultimo, previsti, prossimoGiorno, oggiISO: oggi }),
  };
}

/**
 * La sequenza PIù LUNGA mai fatta, in giorni di fila.
 *
 * Serve all'avatar RPG: un premio che hai sbloccato resta tuo anche se la streak si
 * È rotta e ricomincia. Senza questo, saltare una settimana ti toglieva
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
    // IL SALTO SENZA GIORNI SCELTI È UN BUCO.
    //
    // `precedentiSetHa` con `previstiSet` a `null` restituisce sempre `false`, perché
    // senza i tuoi giorni scelti non c'è niente da controllare. Ma allora la riga
    // sotto diceva solo `if (giorniDi === 0) break`, cioè la catena si rompeva solo
    // tra due giorni CONSECUTIVI... no: non si rompeva mai.
    //
    // Verificato: sedute del 5, 6, 8 e 9 ottobre, senza `giorni_allenamento`, danno
    // streak attuale 2 e record 4. Il record contava come una catena unica i giorni
    // del 5, 6, 8 e 9 anche se il 7 è saltato, e la regola con cui giochi non ti
    // farà mai arrivare a 4 di fila.
    //
    // E il record non è un numero decorativo: `avatar-rpg.js` e `gioco.js` lo usano
    // per sbloccare armature e medaglie PER SEMPRE. Quindi si poteva sbloccare un
    // premio da 4 giorni che la regola con cui giochi non ti darà mai.
    //
    // Senza giorni scelti vale la regola semplice: i giorni devono essere uno dietro
    // l'altro. Con i giorni scelti vale quella scelta da te, e i buchi non previsti
    // non contano.
    if (!previstiSet && giorniDi > 1) break;
    // il salto di giorni di calendario non conta per la streak: quello che conta È
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
  // se i due giorni sono consecutivi non cÈ niente in mezzo
  if (giorniDiCalendario(da, a) <= 1) return false;
  let g = giornoSuccessivo(da);
  while (g && g < a) {
    if (previstiSet.has(giornoSettimana(g))) return true;
    g = giornoSuccessivo(g);
  }
  return false;
}

/**
 * Il prossimo giorno previsto che NON hai ancora fatto dopo l'ultimo allenamento.
 *
 * IL PERCHÉ ESISTE, e perché va capito prima di toccarla: questo numero serve alla
 * frase "ti manca solo giovedì". Restituisce un giorno solo se, fra l'ultimo
 * allenamento e oggi, c'è un giorno che avevi scelto e che non hai fatto.
 *
 * MA se quel giorno c'è, allora la streak è già rotta: perché `streckAncoraViva`
 * controlla esattamente quello e restituisce false. Quindi nelle schermate normali
 * questo numero è SEMPRE null, e il ramo della frase che lo usa non parte mai.
 *
 * Non è un errore che non si vede, è un numero pronto per quando serve davvero: se
 * un giorno la streak non si rompesse più su un salto (per esempio perché decidi tu
 * che un giorno saltato non conta), la frase avrebbe subito il numero giusto senza
 * dover essere riscritta. Per questo il test S9 verifica la frase attraverso
 * `prossimoGiornoPrevistoTesto`, che invece guarda i giorni scelti e funziona sempre.
 */
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

/** Il prossimo giorno previsto DOPO un giorno, per la frase. */
function prossimoGiornoDopo(previsti, iso) {
  const NOME = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
  let g = iso;
  for (let i = 0; i < 9; i++) {
    g = giornoSuccessivo(g);
    if (!g) return null;
    if (previsti.includes(giornoSettimana(g))) return g;
  }
  return null;
}

/**
 * La frase, scritta sul tuo caso.
 *
 * Prima diceva una cosa falsa a chi allena quattro volte su sette: il conto dei
 * giorni di calendario si fermava al riposo lungo e la streak moriva ogni venerdi'.
 */
function testoStreak({ viva, valore, fattoOggi, ultimo, previsti, prossimoGiorno, oggiISO }) {
  if (!previsti) {
    if (!viva) return `Streak interrotta: l'ultimo allenamento È stato il ${ultimo}. Allenandoti oggi riparti da 1.`;
    return fattoOggi
      ? `Streak di ${valore} ${valore === 1 ? 'giorno' : 'giorni'}: oggi hai già allenato.`
      : `Streak di ${valore} ${valore === 1 ? 'giorno' : 'giorni'}: ti manca solo oggi per continuare.`;
  }
  if (!viva) {
    return `Streak interrotta: l'ultimo allenamento È stato il ${ultimo}. Allenandoti al prossimo giorno che hai scelto riparti da 1.`;
  }
  const giorni = `${valore} ${valore === 1 ? 'allenamento' : 'allenamenti'} di fila`;
  if (prossimoGiorno) {
    const quando = dataLeggibileBreve(prossimoGiorno, oggiISO);
    return `Streak di ${giorni}: ti manca solo ${quando} per continuare.`;
  }
  // IL CASO CHE DAVA UNA FRASE FALSA. Oggi È un giorno di riposo, non hai allenato
  // oggi (fattoOggi = false), ma la frase diceva "oggi hai già allenato".
  //
  // Non È uno schermo rotto perchÈ questo testo oggi non viene disegnato da
  // nessuna parte (solo dai test), quindi nessuno lo leggeva. Pero' un testo che
  // mente È un testo da correggere prima che qualcuno lo mostri, e il giorno in cui
  // lo si mostra la frase falsa diventa subito leggibile.
  if (fattoOggi) return `Streak di ${giorni}: oggi hai già allenato. Ti torna ${prossimoGiornoPrevistoTesto(previsti, oggiISO)}.`;
  return `Streak di ${giorni}: oggi È giorno di riposo, non ti toglie niente. Ti torna ${prossimoGiornoPrevistoTesto(previsti, oggiISO)}.`;
}

/**
 * Il prossimo giorno previsto, in parole, per la frase.
 *
 * USA LA DATA CHE GLI È PASSATA, non `new Date()`.
 *
 * Il difetto che c'era: qui dentro si costruiva un `new Date()` e si contava da lì.
 * Ma `calcolaStreak` riceve "oggi" come parametro, e se quel parametro dice un'altra
 * giorno la frase guardava il giorno sbagliato. Verificato: con oggi = giovedì 04/06 e
 * giorni scelti lun/ven, diceva "ti torna lunedì" quando il giorno giusto era venerdì.
 *
 * Nell'app oggi non si vedeva, perché le schermate passano sempre la data vera.
 * Ma è una riga che aspetta solo di essere sbagliata: un test, o un backup
 * importato da un'altra data, e la frase diceva il giorno falso. E il test S9 passava
 * per caso, non perché la frase fosse giusta.
 */
function prossimoGiornoPrevistoTesto(previsti, oggiISO) {
  const prossimo = prossimoGiornoDopo(previsti, oggiISO || isoGiorno(new Date()));
  if (!prossimo) return 'il prossimo giorno';
  const d = new Date(prossimo + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return 'il prossimo giorno';
  return NOME_GIORNO[d.getDay()];
}

const NOME_GIORNO = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];

function dataLeggibileBreve(iso, oggiISO) {
  const d = new Date(String(iso) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  const oggi = oggiISO || isoGiorno(new Date());
  if (iso === oggi) return 'oggi';
  const domani = giornoSuccessivo(oggi);
  if (iso === domani) return 'domani';
  return `${NOME_GIORNO[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

// ---------------------------------------------------------------------------
// I traguardi: la logica È dinamica, non una lista scritta a mano fino a 1000.
// ---------------------------------------------------------------------------

/** I traguardi base, fino a 1000. Più avanti si continua a mille. */
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
 * un traguardo GIA' superato. Lo stesso a 3000, 4000, e così via. Serviva una
 * streak di cinque anni e mezzo per accorgersene, quindi il bug era nascosto, ma
 * la schermata avrebbe detto "prossimo obiettivo: 2000 giorni" a chi ne aveva
 * già fatti 2000. Ora il traguardo restituito È SEMPRE maggiore di quello fatto.
 */
export function prossimoMilestone(giorni) {
  const n = Math.max(0, Number(giorni) || 0);
  for (const t of TRAGUARDI_BASE) if (t > n) return t;
  // sopra i traguardi base si prosegue di mille in mille, MA sempre sul primo
  // paletto che non hai ancora raggiunto: È la differenza fra "prossimo" e "già fatto"
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
  // IL TERZO STATO: "oggi ti tocca e non l'hai ancora fatto".
  //
  // Ste (10/10/2026): "la streak deve spuntare spenta nel giorno in cui dovrei
  // allenarmi dove non mi sono ancora allenato ma deve spuntare che devo andarci per
  // farla aumentare e farla accendere, non che spunta grigia come se l'avessi
  // persa".
  //
  // Aveva ragione, e il difetto era sottile: senza giorni scelti la streak è viva
  // solo se hai allenato oggi o ieri, quindi il lunedì mattina, non avendo ancora
  // allenato, la card era grigia con "??" dentro. Ma NON avevi perso niente: era
  // lunedì mattina e la giornata non era ancora finita. La card diceva una cosa
  // falsa.
  //
  // Ora ci sono tre stati e non due:
  //   - ACCESA: hai allenato oggi, o ieri se oggi è giorno di riposo. Tutto bene.
  //   - DA ACCENDERE: oggi è uno dei tuoi giorni e non l'hai ancora fatto. Non è
  //     spenta: è in attesa, e va fatta OGGI per non perderla.
  //   - SPENTA: hai saltato un giorno che ti toccava. Quella l'hai persa davvero.
  const toccaOggi = !fattoOggi(streak) && previstoOggi(streak);
  const daAccendere = !acceso && toccaOggi;
  const livello = livelloFuoco(giorni);
  return {
    acceso,
    // `stato` è la parola che il disegno usa: 'acceso', 'da accendere', 'spenta'
    stato: acceso ? 'acceso' : (daAccendere ? 'da accendere' : 'spenta'),
    daAccendere,
    livello: livello.chiave,
    nome: livello.nome,
    // I TRE COLORI.
    //
    // Ste (10/10/2026): "la streak è accesa ma è a 0. quando è accesa lasciala
    // gialla" e, del caso in cui deve ancora allenare: "non che spunta grigia come
    // se l'avessi persa".
    //
    // Prima il colore veniva sempre dal livello (`livelloFuoco(giorni)`), e a livello
    // zero quel colore è il GRIGIO della spenta: quindi una streak accesa con zero
    // giorni usciva grigia, e una card in attesa usciva arancione come un avviso.
    //
    // Adesso il colore viene dallo STATO e non dal livello:
    //   - tutto quello che è acceso è GIALLO: sei in fila, o ti manca solo oggi;
    //   - il grigio è SOLO la streak persa davvero.
    //
    // La regola che Ste ha detto senza dirla a parole: il grigio deve voler dire una
    // cosa sola, e quella cosa è "l'hai persa".
    colore: acceso ? GIALLO_STREAK : (daAccendere ? GIALLO_ATTESA : LIVELLI_FUOCO[0].colore),
    simbolo: 'fuoco',
    giorni,
    etichetta: acceso
      ? `${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`
      : (daAccendere ? 'da accendere oggi' : 'spenta'),
  };
}

// I due colori che non vengono dai livelli, perché non sono un livello: sono uno
// stato. Sono qui e non dentro `LIVELLI_FUOCO` perché quel elenco descrive quanto
// sei stato in fila, e "quanto stai aspettando oggi" non è un livello.
//
// Il giallo acceso è pieno; quello dell'attesa è lo stesso giallo un po' più
// spento, così si vede che è la stessa cosa e non un'altra. Ste: "quando è accesa
// lasciala gialla".
const GIALLO_STREAK = '#ffd23f';
const GIALLO_ATTESA = '#f5b301';

/** Il numero di giorni già allenati oggi. */
function fattoOggi(streak) {
  return (streak && streak.fattoOggi) === true;
}

/**
 * Oggi è uno dei giorni che hai scelto?
 *
 * Non usa `prossimoGiorno`, che guarda il giorno DOPO l'ultimo allenamento: serve
 * per "quando mi tocca", non per "oggi mi tocca". Qui la domanda è se la giornata
 * di oggi è prevista, e la risposta la dà la lista dei tuoi giorni con il numero del
 * giorno della settimana di oggi.
 */
function previstoOggi(streak) {
  const previsti = streak && streak.giorniPrevisti;
  if (!Array.isArray(previsti) || !previsti.length) return false;
  const oggi = isoGiorno(new Date());
  const dow = new Date(oggi + 'T12:00:00').getDay();
  return previsti.indexOf(dow) >= 0;
}