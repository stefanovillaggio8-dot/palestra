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

/**
 * Frase con la differenza di UN esercizio: da dove a dove e di quanto.
 * E' quella che appare quando Ste preme su "migliorati", "fermi" o "indietro".
 */
export function fraseVariazione(v) {
  if (!v) return '';
  const numero = formattaNumero(Math.abs(v.delta));
  const perc = differenzaPercentuale(v.da, v.a);
  const eta = (perc === null ? '' : ` (${frasePercentuale(perc)})`);
  const numeroSedute = v.punti === 1 ? 'una seduta' : `${v.punti} sedute`;
  // da dove viene il confronto: dalla prima volta o dalla scheda scritta
  const puntoPartenza = v.contro === 'scheda'
    ? `la scheda diceva ${formattaNumero(v.da)} kg`
    : (v.assistito ? `${formattaNumero(v.da)} kg di assistenza` : `${formattaNumero(v.da)} kg`);

  if (v.migliore === 0) {
    const stessa = v.assistito
      ? `sempre ${formattaNumero(v.a)} kg di assistenza`
      : `sempre ${formattaNumero(v.a)} kg`;
    return `${v.nome}: ${stessa}, come prima (${puntoPartenza}).`;
  }
  if (v.contro === 'scheda') {
    const su = v.assistito ? '−' : '+';
    return `${v.nome}: da ${puntoPartenza} a ${formattaNumero(v.a)} kg, ${su}${numero} kg${eta}.`;
  }

  // Le date contano: Ste non capiva perche' gli usciva fuori un numero che
  // non era il suo. Mostrando WHICHI due sedute vengono confrontate, si vede
  // subito se il confronto e\' quello giusto.
  const quando = (v.dataDa && v.dataA) ? `seduta del ${v.dataDa} → seduta del ${v.dataA}: ` : '';
  if (v.migliore === 0) {
    const stessa = v.assistito
      ? `sempre ${formattaNumero(v.a)} kg di assistenza`
      : `sempre ${formattaNumero(v.a)} kg`;
    return `${v.nome}: ${quando}${stessa}, come prima.`;
  }
  if (v.assistito) {
    const segno = v.migliore > 0 ? '−' : '+';
    const per = v.migliore > 0 ? 'meno' : 'piu\'';
    const spiegazione = v.migliore > 0
      ? 'quindi hai fatto piu\' lavoro da solo'
      : 'quindi il lavoro e\' stato piu\' leggero';
    return `${v.nome}: ${quando}assistenza da ${formattaNumero(v.da)} a ${formattaNumero(v.a)} kg, ${segno}${numero} kg in ${per}${eta}, ${spiegazione}.`;
  }
  const segno = v.migliore > 0 ? '+' : '−';
  return `${v.nome}: ${quando}da ${formattaNumero(v.da)} a ${formattaNumero(v.a)} kg, ${segno}${numero} kg${eta}, in ${numeroSedute}.`;
}

/** Elenco dei due gruppi estremi, dal cambiamento piu' grande al piu' piccolo. */
function ordinaPerImportanza(lista) {
  return lista.slice().sort((x, y) => Math.abs(y.migliore) - Math.abs(x.migliore));
}

/**
 * Riepilogo GENERALE: quanto sei migliorato in tutto, scritto a parole.
 *
 * Ste ha detto: "non solo con i grafici, ma anche scritto, perche' coi grafici
 * non capisco molto". Questo guarda TUTTI gli esercizi insieme e conta quanti
 * sono migliorati, quanti fermi e quanti indietro, e dice anche le cose scomode
 * (per esempio gli esercizi che sono peggiorati).
 *
 * esercizi = [{ nome, esercizio, punti }], dove punti = [{ data, serie }]
 *            come li usa testoProgresso.
 */
export function riepilogoGenerale(esercizi) {
  const voci = [];
  const saltati = [];
  for (const voce of (esercizi || [])) {
    const punti = ((voce && voce.punti) || []).filter((p) => p && (p.serie || []).length);
    const nome = (voce && voce.nome) || 'esercizio';
    if (!punti.length) { saltati.push({ nome, motivo: 'nessuna seduta registrata' }); continue; }
    const e = voce.esercizio || { convenzione: null };
    const assistito = !convenzioneMisuraCarico(e.convenzione);
    const chiave = assistito ? 'pesoAssistenzaMassimo' : 'pesoMassimo';

    // Ste ha detto: "ho messo che ho aumentato di 3 kg ma non spunta negli
    // esercizi migliorati". Con una sola seduta non c'era niente da confrontare,
    // quindi l'esercizio veniva saltato. Ora, se le sedute non bastano, confronto
    // l'ultima seduta con quello che c'era scritto nella scheda: e' comunque un
    // confronto utile, e gli dico da dove a dove.
    let contro; let da; let a; let dataDa; let dataA;
    if (punti.length >= 2) {
      contro = 'sessioni';
      da = riassuntoEsercizio(punti[0].serie, e)[chiave];
      a = riassuntoEsercizio(punti[punti.length - 1].serie, e)[chiave];
      dataDa = punti[0].data;
      dataA = punti[punti.length - 1].data;
    } else {
      const prevista = voce.prevista === undefined ? null : voce.prevista;
      if (prevista === null || prevista === undefined || !Number.isFinite(Number(prevista))) {
        saltati.push({ nome, motivo: 'una sola seduta e nessun peso nella scheda da confrontare' });
        continue;
      }
      contro = 'scheda';
      da = Number(prevista);
      a = riassuntoEsercizio(punti[0].serie, e)[chiave];
    }
    if (da === null || da === undefined || !Number.isFinite(Number(da))) {
      saltati.push({ nome, motivo: 'il peso non e\' confrontabile (manca il numero)' });
      continue;
    }
    if (a === null || a === undefined || !Number.isFinite(Number(a))) {
      saltati.push({ nome, motivo: 'non c\'e\' un peso registrato nella seduta' });
      continue;
    }
    const d = differenzaAssoluta(da, a);
    if (d === null) {
      saltati.push({ nome, motivo: 'numeri non confrontabili' });
      continue;
    }

    // nell'assistenza "meno assistenza" vuol dire meglio: quindi il segno va girato
    const migliore = assistito ? -d : d;
    voci.push({
      nome, esercizio: e, assistito, chiave, contro, dataDa, dataA,
      da, a, delta: d, migliore, punti: punti.length,
      serie: punti.length,
    });
  }

  const migliorati = ordinaPerImportanza(voci.filter((v) => v.migliore > 0));
  const fermi = voci.filter((v) => v.migliore === 0);
  const indietro = ordinaPerImportanza(voci.filter((v) => v.migliore < 0));

  const gruppi = {
    migliorati: migliorati.map((v) => ({ ...v, frase: fraseVariazione(v) })),
    fermi: fermi.map((v) => ({ ...v, frase: fraseVariazione(v) })),
    indietro: indietro.map((v) => ({ ...v, frase: fraseVariazione(v) })),
  };

  const linee = [];
  const numeri = [];
  if (!voci.length) {
    return {
      linee: ['Per un riepilogo generale servono almeno due sedute sugli stessi esercizi: finche\' c\'e\' una seduta sola non c\'e\' niente da confrontare.'],
      numeri: [], gruppi, saltati, migliorati: 0, fermi: 0, indietro: 0, analizzati: 0,
    };
  }

  // il verdetto, prima di tutto, in una frase
  const totale = voci.length;
  const confrontiConScheda = voci.filter((v) => v.contro === 'scheda').length;
  if (migliorati.length > indietro.length) {
    linee.push(`Guardando tutti gli esercizi insieme, sei migliorato: ${migliorati.length} su ${totale} sono andati avanti.`);
  } else if (indietro.length > migliorati.length) {
    linee.push(`Guardando tutti gli esercizi insieme, il quadro e\' misto: ${indietro.length} esercizi su ${totale} ti dicono che sei andato un po\' indietro.`);
  } else {
    linee.push(`Guardando tutti gli esercizi insieme, sei sostanzialmente fermo: ${migliorati.length} migliorati e ${indietro.length} indietro su ${totale}.`);
  }
  if (confrontiConScheda) {
    linee.push(`${confrontiConScheda} ${confrontiConScheda === 1 ? 'esercizio e\' confrontato con quello scritto nella scheda' : 'esercizi sono confrontati con quello scritto nella scheda'}, perche\' di quelli hai una sola seduta: due sedute non ci sono ancora da confrontare.`);
  }

  numeri.push({ etichetta: 'migliorati', valore: migliorati.length });
  numeri.push({ etichetta: 'fermi', valore: fermi.length });
  numeri.push({ etichetta: 'indietro', valore: indietro.length });

  if (migliorati.length) {
    // i tre migliori, cosi' vede subito dove sta andando bene
    const top = migliorati.slice().sort((x, y) => y.migliore - x.migliore).slice(0, 3);
    const frasi = top.map((v) => {
      const perc = differenzaPercentuale(v.da, v.a);
      const numero = formattaNumero(Math.abs(v.delta));
      if (v.assistito) return `${v.nome} −${numero} kg di assistenza in meno${perc === null ? '' : ` (${frasePercentuale(perc)})`}`;
      return `${v.nome} +${numero} kg${perc === null ? '' : ` (${frasePercentuale(perc)})`}`;
    });
    linee.push(`I progressi piu\' chiari: ${frasi.join(', ')}.`);
  }

  if (indietro.length) {
    const peggiori = indietro.slice().sort((x, y) => x.migliore - y.migliore).slice(0, 3);
    const frasi = peggiori.map((v) => {
      const numero = formattaNumero(Math.abs(v.delta));
      if (v.assistito) return `${v.nome} +${numero} kg di assistenza in piu\'`;
      return `${v.nome} −${numero} kg`;
    });
    linee.push(`Attenzione, questi vanno indietro rispetto alla prima volta: ${frasi.join(', ')}.`);
  }

  if (fermi.length && fermi.length <= 5) {
    linee.push(`Restano fermi (stesso numero di prima): ${fermi.map((v) => v.nome).join(', ')}.`);
  } else if (fermi.length) {
    linee.push(`Poi ${fermi.length} esercizi sono fermi sullo stesso numero di prima.`);
  }

  // Ste non capiva perche' il suo esercizio non compariva tra i migliorati.
  // Meglio dirglielo esplicitamente invece di lasciare un buco silenzioso.
  if (saltati.length) {
    const quante = saltati.length;
    linee.push(`Restano fuori ${quante} ${quante === 1 ? 'esercizio non e\' ancora confrontabile' : 'esercizi non sono ancora confrontabili'}: ${saltati.map((s) => `${s.nome} (${s.motivo})`).join(', ')}.`);
  }

  linee.push('Ricorda che un peso piu\' alto non vuol dire automaticamente meglio: contano anche le ripetizioni e quanto hai spinto.');

  return {
    linee, numeri, gruppi, saltati,
    migliorati: migliorati.length,
    fermi: fermi.length,
    indietro: indietro.length,
    analizzati: totale,
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
