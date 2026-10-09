// rank-v2/misura.js -- misurare le soglie su di te, GRADUALMENTE e con limiti.
//
// Ste (07/10/2026), strada 2: "voglio che i valori vengano misurati sulle prestazioni
// reali. Pero' non voglio che bastino 3-4 risposte casuali per cambiare completamente
// le soglie: usa quei dati per affinare gradualmente i valori e mantieni dei limiti
// realistici".
//
// I VINCOLI, che sono la parte seria di questo file:
//  - SERVONO almeno 5 risposte e almeno il 60% di accordo prima di muovere un numero.
//    Quattro risposte buttate li' non spostano niente: e' esattamente quello che
//    Ste non vuole;
//  - ogni spostamento e' PICCOLO: si muove verso la misura di una frazione (15%), e
//    il numero non puo' allontanarsi piu' del 25% da dove l'avevamo dichiarato.
//    Quindi anche dopo mesi di risposte il numero resta nella zona giusta;
//  - i TETTI NON SI NEGOZIANO: se la misura che arriva dai tuoi dati supera il tetto
//    di realta' dell'esercizio (2,2x il corpo, 0,85x se e' isolamento), il tetto
//    vince sempre. Nessuna misura puo' comprare un Rank irrealistico;
//  - le risposte sono RUMORE O SEGNALE: e' la mediana a decidere, quindi una serie
//    facile fatta perche' eri stanco non sposta niente da sola.
//
// DOVE VANO I DATI: una tabella `risposte` (esercizio, data, carico reale, risposta).
// Qui dentro c'e' solo il calcolo, cosi' e' provabile senza database.

import { tettoPerEsercizio } from './valori.js';

/** Le tre domande che ti faccio, con cosa significa ognuna. */
export const RISPOSTE = {
  facile: { id: 'facile', peso: 1.35, frase: 'agevole: avrei potuto spingere molto di piu\'' },
  normale: { id: 'normale', peso: 1.12, frase: 'normale: ci ho messo quello che ci ho messo' },
  massimo: { id: 'massimo', peso: 1.0, frase: 'al massimo: non ho piu\' niente da darci' },
};

/** Quante risposte servono e quanto devono essere d'accordo, per muovere un numero. */
export const MINIMO_RISPOSTE = 5;
export const ACCORDO_MINIMO = 0.6;
/** Quanto ci si muove verso la misura, ogni volta che i vincoli sono soddisfatti. */
export const PASSO = 0.15;
/** Il numero non puo' allontanarsi piu' di questo da dove l'avevamo dichiarato. */
export const SCARTO_MAX = 0.25;

/**
 * Il vertice "implicito" da una risposta: se hai fatto X e l'hai trovata agevole,
 * allora il tuo vertice su quell'esercizio non e' X, e' qualcosa di piu'.
 */
export function verticeDaRisposta(caricoReale, risposta) {
  const c = Number(caricoReale);
  const r = RISPOSTE[String(risposta || '').toLowerCase()];
  if (!Number.isFinite(c) || c <= 0 || !r) return null;
  return Math.round(c * r.peso * 100) / 100;
}

/** La mediana, che sopporta i valori strani meglio della media. */
function mediana(numeri) {
  const v = numeri.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mezzo = Math.floor(v.length / 2);
  return v.length % 2 ? v[mezzo] : (v[mezzo - 1] + v[mezzo]) / 2;
}

/**
 * Affina il vertice di un esercizio con le tue risposte.
 *
 * Restituisce il nuovo vertice e PERCHE' si e' mosso (o perche' no). Restituisce
 * anche i motivi del "no", cosi' la schermata puo' dirti "non ho spostato niente:
 * mi servono 8 risposte e ne ho 4" invece di sembrare rotta.
 */
export function affinaVertice({ verticeDichiarato, risposte = [], livello = 'composto', pesoCorporeo = 70, movimento = null }) {
  const dichiarato = Number(verticeDichiarato);
  if (!Number.isFinite(dichiarato) || dichiarato <= 0) {
    return { vertice: dichiarato, mosso: false, motivo: 'nessun numero dichiarato', quante: 0 };
  }
  const utili = risposte
    .map((r) => verticeDaRisposta(r.caricoReale, r.risposta))
    .filter((n) => n !== null);
  const quante = utili.length;

  if (quante < MINIMO_RISPOSTE) {
    return {
      vertice: dichiarato, mosso: false, quante,
      motivo: `mi servono ${MINIMO_RISPOSTE} risposte per spostare un numero, ne ho ${quante}`,
      servono: MINIMO_RISPOSTE - quante,
    };
  }

  // accordo: quanto sono d'accordo le risposte sul giudizio dominante
  const conteggio = new Map();
  for (const r of risposte) {
    const k = String(r.risposta || '').toLowerCase();
    if (!RISPOSTE[k]) continue;
    conteggio.set(k, (conteggio.get(k) || 0) + 1);
  }
  const [dominante, quanti] = [...conteggio.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];
  const accordo = quante ? quanti / quante : 0;
  if (accordo < ACCORDO_MINIMO) {
    return {
      vertice: dichiarato, mosso: false, quante, accordo,
      motivo: `le tue risposte non sono d'accordo (${Math.round(accordo * 100)}% su "${dominante}"), quindi non sposto niente`,
    };
  }

  const misurato = mediana(utili);

  // i tetti non si negoziano: il numero misurato non puo' superarli
  //
  // Il tetto viene da valori.js perche' dal 08/10/2026 NON e' "isolamento si/no":
  // se lo fosse, il leg extension (isolamento, ma a una gamba sola) verrebbe
  // tagliato a 0,85x il corpo. Qui la regola deve essere LA STESSA che usa la
  // scala, altrimenti la misura potrebbe muovere un numero e poi la scala lo
  // taglierebbe dietro: due regole diverse sullo stesso numero.
  const tetto = tettoPerEsercizio(livello, movimento);
  const limite = Number(pesoCorporeo) * tetto;
  const misuraLimitata = Math.min(misurato, limite);
  const tettoMesso = misurato > limite;

  // lo scarto massimo dal dichiarato
  const minimo = dichiarato * (1 - SCARTO_MAX);
  const massimo = dichiarato * (1 + SCARTO_MAX);
  const obiettivo = Math.max(minimo, Math.min(massimo, misuraLimitata));

  // e il passo: ci si muove di un pezzo alla volta, non si arriva subito
  const nuovo = dichiarato + (obiettivo - dichiarato) * PASSO;

  return {
    vertice: Math.round(nuovo * 100) / 100,
    mosso: true,
    quante,
    accordo,
    tetto: tetto,
    limite: Math.round(limite * 100) / 100,
    misurato: Math.round(misurato * 100) / 100,
    obiettivo: Math.round(obiettivo * 100) / 100,
    dichiarato,
    tettoMesso,
    spostamento: Math.round((nuovo - dichiarato) * 100) / 100,
    motivo: tettoMesso
      ? `la misura (${Math.round(misurato * 100) / 100}) supera il tetto di realta' (${Math.round(limite * 100) / 100}), quindi ho usato il tetto`
      : `spostato del ${Math.round(((nuovo - dichiarato) / dichiarato) * 100)}% verso ${Math.round(misurato * 100) / 100}, che e' quello che le tue risposte dicono`,
  };
}