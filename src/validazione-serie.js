// Validazione per i campi numerici e controllo dei valori sospetti.
// Nessuna correzione automatica dei carichi: per un valore insolito si chiede conferma.

/** Testo digitabile in kg, ripetizioni, minuti e ripetizioni assistite.
 * Accetta temporaneamente il segno o la virgola durante la digitazione. */
export function testoNumericoAmmesso(testo) {
  return /^[+-]?(?:[0-9]*(?:[.,][0-9]*)?)$/.test(String(testo ?? ''));
}

/** Un numero completo (non un segno isolato o una virgola isolata). */
export function numeroCompleto(testo) {
  return /^[+-]?(?:[0-9]+(?:[.,][0-9]*)?|[.,][0-9]+)$/.test(String(testo ?? ''));
}

function numero(valore) {
  if (valore === null || valore === undefined || valore === '') return null;
  if (typeof valore === 'string' && !numeroCompleto(valore.trim())) return null;
  const n = Number(String(valore).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function mediana(valori) {
  const numeri = valori.map(numero).filter(n => n !== null && n > 0).sort((a,b) => a-b);
  if (!numeri.length) return null;
  const medio = Math.floor(numeri.length / 2);
  return numeri.length % 2 ? numeri[medio] : (numeri[medio-1]+numeri[medio])/2;
}

/**
 * Trova errori grossolani rispetto a un carico o a un numero di ripetizioni già
 * conosciuto. Non impone massimali né limita i progressi legittimi.
 *
 * Il confronto è sempre per lo stesso esercizio, mai tra esercizi diversi.
 * "cardio" distingue i minuti dalle ripetizioni.
 */
export function valutaNumeroInsolito({ campo, valore, precedente = null, storico = [], cardio = false, ripetizioni = null } = {}) {
  const n = numero(valore);
  // I campi possono essere svuotati, ma una stringa non numerica non deve
  // mai passare nemmeno se un domani un'altra UI salta il filtro della tastiera.
  if (n === null && valore !== null && valore !== undefined && valore !== '')
    return {tipo:'non_valido',campo,valore,messaggio:'Questo campo accetta soltanto numeri. Scrivi le parole nelle note.'};
  if (n === null) return null;
  const assistite = campo === 'rip_assistite';
  const carico = campo === 'peso' || campo === 'peso_assistenza';
  const rip = campo === 'ripetizioni' || assistite;
  if (!carico && !rip) return null;
  const unita = carico ? 'kg' : cardio && !assistite ? 'min' : 'rip';
  if (n < 0) return { tipo:'non_valido', campo, valore:n, messaggio:`Hai inserito ${n} ${unita}. Questo campo non può contenere valori negativi.` };
  const totale = numero(ripetizioni);
  if (assistite && totale !== null && n > totale)
    return { tipo:'non_valido', campo, valore:n, messaggio:`Hai indicato ${n} ripetizioni assistite, ma le ripetizioni totali sono ${totale}. Correggi il numero.` };

  // Preferire il valore già scritto in questa serie, altrimenti lo storico dello
  // stesso esercizio. Non usare peso e ripetizioni di esercizi differenti.
  const prima = numero(precedente);
  const riferimento = prima !== null && prima > 0 ? prima : mediana(storico);
  const forteAumento = riferimento !== null && n > riferimento &&
    (carico
      ? n >= riferimento * 2.5 && n - riferimento >= 30
      : cardio
        ? n >= riferimento * 4 && n - riferimento >= 45
        : n >= riferimento * 4 && n - riferimento >= 12);
  const forteDiminuzione = riferimento !== null && riferimento > 0 && n > 0 &&
    (carico
      ? riferimento >= 30 && n <= riferimento / 5 && riferimento - n >= 25
      : !cardio && riferimento >= 10 && n <= riferimento / 5);
  // Quando non esistono dati di riferimento, chiedere solo per numeri estremi:
  // niente limiti rigidi a un nuovo esercizio o a un vero record personale.
  const senzaRiferimento = riferimento === null &&
    (carico ? n >= 400 : cardio ? n >= 500 : n >= 100);
  if (!forteAumento && !forteDiminuzione && !senzaRiferimento) return null;

  return {
    tipo:'da_confermare', campo, valore:n, precedente:riferimento,
    messaggio:`Hai scritto ${n} ${unita}${riferimento === null ? '' : ` (riferimento: ${riferimento} ${unita})`}. Il numero è molto diverso dal solito: è corretto o hai aggiunto una cifra per sbaglio?`,
  };
}

/** Rileva anche i valori delle serie aggiuntive dropset. */
export function valutaCampiSerieInsoliti(campi = {}, serie = {}, storico = [], { cardio = false, alCompletamento = false } = {}) {
  const controlli = [];
  for (const campo of ['peso','peso_assistenza','ripetizioni','rip_assistite']) {
    if (!Object.prototype.hasOwnProperty.call(campi,campo)) continue;
    const altre = storico.map(s => s && s[campo]).filter(v => v !== null && v !== undefined);
    const trovato = valutaNumeroInsolito({
      campo, valore:campi[campo],
      // Quando la serie viene spuntata, i valori sono già una bozza salvata.
      // Non confrontarli con se stessi: usa le serie precedenti dello stesso esercizio.
      precedente:alCompletamento ? null : serie[campo], storico:altre,
      cardio, ripetizioni:campi.ripetizioni ?? serie.ripetizioni,
    });
    if (trovato) controlli.push(trovato);
  }
  if (Array.isArray(campi.giri_extra)) {
    campi.giri_extra.forEach((g,i)=>{
      if (!g) return;
      const vecchio = Array.isArray(serie.giri_extra) ? serie.giri_extra[i] || {} : {};
      for (const campo of ['peso','ripetizioni']) {
        // Non riesaminare i giri lasciati identici quando si modifica un altro
        // campo: una sola nuova digitazione deve produrre al massimo un avviso.
        if (!alCompletamento && String(g[campo] ?? '') === String(vecchio[campo] ?? '')) continue;
        // Il dropset può avere anche valori vuoti; il peso della serie principale
        // dà un riferimento quando il singolo giro non è mai stato compilato.
        const trovato = valutaNumeroInsolito({
          campo, valore:g[campo],
          precedente:alCompletamento ? null : (vecchio[campo] ?? (campo === 'peso' ? serie.peso : serie.ripetizioni)),
          storico:[],
        });
        if (trovato) controlli.push({...trovato, messaggio:`Dropset, giro ${i+2}. ${trovato.messaggio}`});
      }
    });
  }
  return controlli;
}
