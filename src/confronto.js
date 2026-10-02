// confronto.js -- quando e' lecito confrontare due sedute.
//
// Regola d'oro: se non si puo' confrontare, si dice "Confronto non disponibile".
// Non si inventano numeri e non si accostano varianti diverse.

import {
  CONVENZIONI,
  arrotonda2,
  convenzioneMisuraCarico,
  convenzioneInvertita,
  differenzaAssoluta,
  differenzaPercentuale,
  volumeSerie,
} from './numeri.js';

export const NON_DISPONIBILE = 'Confronto non disponibile';

/**
 * Perche' due esercizi non sono confrontabili.
 * Restituisce null quando il confronto e' lecito.
 */
export function motivoNonConfrontabile(esercizioA, esercizioB) {
  if (!esercizioA || !esercizioB) return 'esercizio sconosciuto';
  if (esercizioA.id !== esercizioB.id) {
    return 'varianti diverse: ' + esercizioA.nome + ' e ' + esercizioB.nome;
  }
  if ((esercizioA.convenzione || null) !== (esercizioB.convenzione || null)) {
    return 'convenzione del carico diversa';
  }
  return null;
}

/**
 * Confronto serie per serie fra due sedute, solo se le varianti coincidono.
 * Restituisce sempre un oggetto con `disponibile` e, quando non e' confrontabile,
 * il motivo: l'interfaccia mostra "Confronto non disponibile".
 */
export function confrontaEsercizio(sedeCorrente, sedePrecedente, esercizioCorrente, esercizioPrecedente) {
  const motivo = motivoNonConfrontabile(esercizioCorrente, esercizioPrecedente);
  if (motivo) {
    return { disponibile: false, motivo, righe: [] };
  }
  const conv = esercizioCorrente.convenzione;
  if (conv === CONVENZIONI.ASSISTENZA || conv === CONVENZIONI.CORPO_LIBERO) {
    // Con gli esercizi assistiti il peso non e' confrontabile come carico:
    // piu' contrappeso significa lavoro piu' facile. Si mostra il confronto
    // dell'assistenza con la parola "meno assistenza = meglio".
    const righe = [];
    const correnti = (sedeCorrente || []).slice().sort((a, b) => a.ordine - b.ordine);
    const precedenti = (sedePrecedente || []).slice().sort((a, b) => a.ordine - b.ordine);
    const n = Math.max(correnti.length, precedenti.length);
    for (let i = 0; i < n; i++) {
      const a = correnti[i] || null;
      const b = precedenti[i] || null;
      const riga = { ordine: i + 1, attuale: a, precedente: b, haConfronto: false, messaggio: NON_DISPONIBILE };
      if (a && b && a.peso_assistenza !== null && b.peso_assistenza !== null
          && a.ripetizioni !== null && b.ripetizioni !== null) {
        riga.differenzaAssistenza = differenzaAssoluta(b.peso_assistenza, a.peso_assistenza);
        riga.menoAssistenza = a.peso_assistenza < b.peso_assistenza;
        riga.haConfronto = true;
        riga.messaggio = null;
      }
      righe.push(riga);
    }
    return { disponibile: true, assistito: true, righe };
  }
  const righe = [];
  const correnti = (sedeCorrente || []).slice().sort((a, b) => a.ordine - b.ordine);
  const precedenti = (sedePrecedente || []).slice().sort((a, b) => a.ordine - b.ordine);

  const n = Math.max(correnti.length, precedenti.length);
  for (let i = 0; i < n; i++) {
    const a = correnti[i] || null;
    const b = precedenti[i] || null;
    const riga = {
      ordine: i + 1,
      attuale: a,
      precedente: b,
      haConfronto: false,
      messaggio: NON_DISPONIBILE,
    };
    if (a && b && a.peso !== null && b.peso !== null && a.ripetizioni !== null && b.ripetizioni !== null
        && convenzioneMisuraCarico(conv)) {
      riga.differenzaPeso = differenzaAssoluta(b.peso, a.peso);
      riga.differenzaPesoPerc = differenzaPercentuale(b.peso, a.peso);
      riga.differenzaRip = differenzaAssoluta(b.ripetizioni, a.ripetizioni);
      riga.differenzaRipPerc = differenzaPercentuale(b.ripetizioni, a.ripetizioni);
      riga.haConfronto = true;
      riga.messaggio = null;
    }
    righe.push(riga);
  }
  return { disponibile: true, righe };
}

/**
 * Sintetizza i risultati di un esercizio in una seduta.
 * massimo carico, media ripetizioni, volume, uso dello spotter.
 */
export function riassuntoEsercizio(serie, esercizio) {
  const conv = esercizio ? esercizio.convenzione : null;
  const s = (serie || []).filter((x) => x && !x.eliminata);
  const pesi = [];
  const rip = [];
  for (const x of s) {
    if (x.peso !== null && x.peso !== undefined) pesi.push(Number(x.peso));
    if (x.ripetizioni !== null && x.ripetizioni !== undefined) rip.push(Number(x.ripetizioni));
  }
  const assistenze = s.filter((x) => x.spotter === true).length;
  let volume = 0;
  let volumeCalcolabile = true;
  let volumeHaDecimali = false;
  for (const x of s) {
    const v = volumeSerie({ ...x, convenzione: conv });
    if (v === null) { volumeCalcolabile = false; continue; }
    volume += v;
    if (x.ripetizioni !== null && x.ripetizioni !== undefined && Number(x.ripetizioni) % 1 !== 0) {
      volumeHaDecimali = true;
    }
  }
  return {
    serie: s.length,
    pesoMassimo: pesi.length ? arrotonda2(Math.max(...pesi)) : null,
    pesoAssistenzaMassimo: s.some((x) => x.peso_assistenza !== null && x.peso_assistenza !== undefined)
      ? arrotonda2(Math.max(...s.filter((x) => x.peso_assistenza !== null && x.peso_assistenza !== undefined).map((x) => Number(x.peso_assistenza))))
      : null,
    ripetizioniMedie: rip.length ? arrotonda2(rip.reduce((a, b) => a + b, 0) / rip.length) : null,
    ripetizioniTotali: rip.length ? arrotonda2(rip.reduce((a, b) => a + b, 0)) : null,
    volume: volumeCalcolabile ? arrotonda2(volume) : null,
    volumeHaDecimali,
    serieConSpotter: assistenze,
    ripetizioniAssistite: s.some((x) => x.rip_assistite !== null && x.rip_assistite !== undefined),
    assistenzaNonSpecificata: s.some((x) => x.spotter === true && (x.rip_assistite === null || x.rip_assistite === undefined)),
  };
}

/**
 * Un record conta solo se la serie non ha avuto assistenza.
 * Le serie con spotter sono evidenziate ma non usate come record "puliti".
 */
export function recordSenzaAssistenza(serie, esercizio) {
  if (!esercizio || !convenzioneMisuraCarico(esercizio.convenzione)) {
    return { valore: null, valido: false, motivo: 'esercizio assistito: il carico non e\' un record' };
  }
  const s = (serie || []).filter((x) => x && !x.eliminata && x.spotter !== true
    && x.peso !== null && x.peso !== undefined);
  if (!s.length) return { valore: null, valido: false, motivo: 'nessuna serie registrata' };
  return {
    valore: arrotonda2(Math.max(...s.map((x) => Number(x.peso)))),
    valido: true,
    motivo: null,
  };
}

/**
 * Il risultato "migliore" di un esercizio assistito non e' il peso piu' alto:
 * con la macchina o il corpo libero conta quanto hai SOLLEVATO, quindi meno
 * assistenza significa lavoro piu' grande.
 */
export function miglioreAssistito(serie) {
  const s = (serie || []).filter((x) => x && !x.eliminata
    && x.peso_assistenza !== null && x.peso_assistenza !== undefined);
  if (!s.length) return { valore: null, valido: false, motivo: 'nessuna serie assistita registrata' };
  return { valore: arrotonda2(Math.min(...s.map((x) => Number(x.peso_assistenza)))), valido: true, motivo: null };
}

export { convenzioneInvertita };
