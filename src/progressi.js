// progressi.js -- trasforma i numeri in frasi comprensibili.
//
// Ste ha detto: "non capisco moltissimo dai grafici", quindi qui si scrive
// cosa e' successo in italiano chiaro, senza gonfiare i risultati.

import {
  arrotonda2,
  convenzioneMisuraCarico,
  convenzioneInvertita,
  differenzaAssoluta,
  differenzaPercentuale,
  formattaNumero,
  ETICHETTE_CONVENZIONE,
  CONVENZIONI,
} from './numeri.js';
import { riassuntoEsercizio, recordSenzaAssistenza, NON_DISPONIBILE } from './confronto.js';

function frasePeso(n) {
  if (n === null || n === undefined) return null;
  const segno = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${segno}${formattaNumero(Math.abs(n))} kg`;
}

function frasePercentuale(p) {
  if (p === null || p === undefined) return null;
  const segno = p > 0 ? '+' : p < 0 ? '−' : '';
  return `${segno}${formattaNumero(Math.abs(p))}%`;
}

/**
 * Costruisce il testo di progresso per un esercizio.
 * storico = [{ data, serie: [...] }] in ordine cronologico (dal piu' vecchio).
 */
export function testoProgresso(nomeEsercizio, esercizio, storico, periodoDescrizione = '') {
  const punti = (storico || []).filter((p) => p && (p.serie || []).length);
  const linee = [];
  const esercizioConv = esercizio || { convenzione: null };
  const assistito = !convenzioneMisuraCarico(esercizioConv.convenzione);

  if (!punti.length) {
    return {
      titolo: nomeEsercizio,
      linee: ['Nessuna seduta registrata per questo esercizio, quindi niente da confrontare.'],
      dati: [],
    };
  }

  const primo = punti[0];
  const ultimo = punti[punti.length - 1];
  const rPrimo = riassuntoEsercizio(primo.serie, esercizioConv);
  const rUltimo = riassuntoEsercizio(ultimo.serie, esercizioConv);

  const prefisso = periodoDescrizione ? `Negli ultimi ${periodoDescrizione}: ` : '';

  if (punti.length === 1) {
    linee.push(`${prefisso}una sola seduta registrata, non c'e' ancora un confronto possibile.`);
  } else {
    linee.push(`${prefisso}${punti.length} sedute registrate, dal ${primo.data} al ${ultimo.data}.`);
  }

  if (assistito) {
    // esercizi con corpo libero o assistenza: il peso NON e' un carico
    const aP = rPrimo.pesoAssistenzaMassimo;
    const aU = rUltimo.pesoAssistenzaMassimo;
    if (aP !== null && aU !== null) {
      const d = differenzaAssoluta(aP, aU);
      if (d === 0) {
        linee.push(`L'assistenza e' rimasta uguale (${formattaNumero(aU)} kg): lavoro equivalente.`);
      } else if (d < 0) {
        linee.push(`Hai usato ${formattaNumero(Math.abs(d))} kg di assistenza in meno (da ${formattaNumero(aP)} a ${formattaNumero(aU)} kg): in un esercizio assistito meno aiuto significa piu' lavoro da parte tua.`);
      } else {
        linee.push(`L'assistenza e' salita di ${formattaNumero(d)} kg (da ${formattaNumero(aP)} a ${formattaNumero(aU)} kg): in un esercizio assistito piu' aiuto significa lavoro piu' leggero, quindi non e' un passo avanti.`);
      }
    }
    if (rUltimo.ripetizioniMedie !== null) {
      const dRip = differenzaAssoluta(rPrimo.ripetizioniMedie, rUltimo.ripetizioniMedie);
      if (dRip !== null && dRip !== 0) {
        linee.push(`Ripetizioni medie: ${dRip > 0 ? '+' : '−'}${formattaNumero(Math.abs(dRip))} (da ${formattaNumero(rPrimo.ripetizioniMedie)} a ${formattaNumero(rUltimo.ripetizioniMedie)}).`);
      }
    }
    linee.push('Nota: con il corpo libero il peso non e\' un record e il volume non viene calcolato, perche\' i numeri risulterebbero fuorvianti.');
  } else {
    const pP = rPrimo.pesoMassimo;
    const pU = rUltimo.pesoMassimo;
    if (pP !== null && pU !== null) {
      const d = differenzaAssoluta(pP, pU);
      const perc = differenzaPercentuale(pP, pU);
      if (pP === 0) {
        linee.push(`Il carico massimo e' passato da 0 kg a ${formattaNumero(pU)} kg. Non calcolo la percentuale perche\' partire da zero la rende inutile.`);
      } else if (d === 0) {
        linee.push(`Il carico massimo e' rimasto a ${formattaNumero(pU)} kg.`);
      } else {
        linee.push(`Carico massimo: da ${formattaNumero(pP)} kg a ${formattaNumero(pU)} kg, cioe' ${frasePeso(d)} (${frasePercentuale(perc)}).`);
      }
      if (d < 0) {
        linee.push('Attenzione: il carico e\' sceso. A volte e\' una scelta (tecnica, stanchezza), ma se non e\' voluta vale la pena rivederlo.');
      }
      if (pU > pP) {
        const rip = differenzaAssoluta(rPrimo.ripetizioniMedie, rUltimo.ripetizioniMedie);
        if (rip !== null && rip < 0) {
          linee.push(`Con piu' carico hai fatto ${formattaNumero(Math.abs(rip))} ripetizioni medie in meno: un peso piu' alto non e\' automaticamente meglio, conta anche quanto hai spinto.`);
        }
      }
    }

    if (rUltimo.ripetizioniMedie !== null) {
      linee.push(`Ripetizioni medie nell'ultima seduta: ${formattaNumero(rUltimo.ripetizioniMedie)} (${formattaNumero(rUltimo.ripetizioniTotali)} in tutto).`);
    }

    if (rUltimo.volume !== null) {
      let riga = `Volume dell'ultima seduta: ${formattaNumero(rUltimo.volume)} kg`;
      if (rUltimo.volumeHaDecimali) {
        riga += ' (indicatore convenzionale: ci sono ripetizioni con i decimali, quindi il prodotto peso x ripetizioni non e\' una misura precisa del lavoro fatto)';
      }
      riga += '.';
      linee.push(riga);
    }

    const rec = recordSenzaAssistenza(ultimo.serie, esercizioConv);
    if (rec.valido) {
      linee.push(`Record senza assistenza in questa seduta: ${formattaNumero(rec.valore)} kg.`);
    }
  }

  if (rUltimo.serieConSpotter > 0) {
    linee.push(`Attenzione: ${rUltimo.serieConSpotter} ${rUltimo.serieConSpotter === 1 ? 'serie ha' : 'serie hanno'} avuto lo spotter, e le serie con spotter non contano come record.`);
    if (rUltimo.assistenzaNonSpecificata) {
      linee.push('In almeno una serie con spotter non hai indicato quante ripetizioni erano assistite: resta salvato come "non specificato".');
    }
  }

  // piccoli avvisi sui decimali
  const conDecimali = (ultimo.serie || []).some((s) => s && s.ripetizioni !== null
    && s.ripetizioni !== undefined && Number(s.ripetizioni) % 1 !== 0);
  if (conDecimali) {
    linee.push('Ci sono ripetizioni parziali (con i decimali): sono salvate esattamente cosi\' come le hai scritte.');
  }

  if (punti.length >= 2) {
    const conStesso = punti.filter((p) => {
      const r = riassuntoEsercizio(p.serie, esercizioConv);
      return r.pesoMassimo !== null;
    });
    if (conStesso.length < 2) {
      linee.push('Non c\'e\' un peso confrontabile in almeno una delle sedute, quindi i grafici di carico restano incompleti.');
    }
  }

  return {
    titolo: nomeEsercizio,
    linee,
    convenzione: ETICHETTE_CONVENZIONE[esercizioConv.convenzione] || 'convenzione non specificata',
    dati: punti.map((p) => ({
      data: p.data,
      pesoMassimo: riassuntoEsercizio(p.serie, esercizioConv).pesoMassimo,
      assistenza: riassuntoEsercizio(p.serie, esercizioConv).pesoAssistenzaMassimo,
      ripetizioniMedie: riassuntoEsercizio(p.serie, esercizioConv).ripetizioniMedie,
      volume: riassuntoEsercizio(p.serie, esercizioConv).volume,
      spotter: riassuntoEsercizio(p.serie, esercizioConv).serieConSpotter,
      serie: p.serie,
    })),
  };
}

/** Dati per il grafico "ripetizioni a parita' di peso". */
export function serieARipetizioniCostanti(punti, esercizio) {
  const r = [];
  let pesoRif = null;
  for (const p of punti) {
    const rr = riassuntoEsercizio(p.serie, esercizio);
    if (rr.pesoMassimo === null) continue;
    if (pesoRif === null) pesoRif = rr.pesoMassimo;
    if (rr.pesoMassimo === pesoRif && rr.ripetizioniMedie !== null) {
      r.push({ data: p.data, peso: pesoRif, ripetizioniMedie: rr.ripetizioniMedie });
    }
  }
  return { peso: pesoRif, punti: r };
}

export { NON_DISPONIBILE };
