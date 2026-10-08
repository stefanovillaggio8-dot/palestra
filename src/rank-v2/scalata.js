// rank-v2/scalata.js -- le soglie di un esercizio e il Rank che nasce da quelle.
//
// Ste (07/10/2026): "le soglie devono essere costruite sulla difficolta' reale della
// prestazione e non su numeri arbitrari. Non voglio Rank regalati. Se una persona
// e' ancora principiante in un esercizio deve rimanere nei Rank bassi anche se il
// numero in kg puo' sembrare alto".
//
// LA DIFFERENZA CON IL SISTEMA VECCHIO, in una riga:
// prima le 7 soglie erano 7 multipli IDENTICI (0.50, 0.72, 0.88, 1.00, 1.10, 1.22,
// 1.35) del riferimento, quindi BRONZO era sempre il 50% e OLYMPIAN sempre il 135%,
// su QUALSIASI esercizio. Adesso ogni esercizio ha tre numeri veri (ingresso, medio,
// vertice) e le 7 soglie nascono da quelli.
//
// La curva sotto e' SEVERA di proposito: dopo il PLATINUM le soglie si fanno piu'
// radi, cosi' che DIAMOND, TITAN e OLYMPIAN costino il giusto. Chi e' principiante
// non ci arriva con il volume, e ci arriva con il lavoro vero.

import { RANK } from '../rank-config.js';
import { moltiplicatoreSerie } from './curve.js';

/**
 * Le 7 posizioni sulla scala, da ingresso a vertice.
 *
 * 0 = BRONZE (ingresso), 6 = OLYMPIAN (vertice).
 *
 * Nota la parte destra: dopo il PLATINUM (0.42) ci vuole il 18% del restante per
 * ogni gradino, mentre fra bronzo e platino bastava il 10-18%. E' qui che i Rank
 * alti diventano difficili: non sono una riga in piu', sono il pezzo finale.
 */
export const CURVA_SOGLIE = [0, 0.10, 0.24, 0.42, 0.60, 0.78, 1];

/**
 * Le 7 soglie dai tre valori dell'esercizio.
 *
 * @param ingresso il carico da cui l'esercizio e' "affrontato"
 * @param vertice  il carico oltre il quale, per quell'esercizio, sei al massimo
 */
export function soglieDaValori({ ingresso, vertice }) {
  const ing = Number(ingresso);
  const ver = Number(vertice);
  if (!Number.isFinite(ing) || !Number.isFinite(ver) || ing <= 0 || ver <= ing) return null;
  return CURVA_SOGLIE.map((f) => Math.round((ing + (ver - ing) * f) * 100) / 100);
}

/**
 * Dal punteggio al Rank, con gli LP dentro.
 *
 * Regole che ho fissato e che diventano test:
 *  - il volume (le serie) spinge gli LP dentro il Rank che hai;
 *  - per far salire di RANK col solo volume, la tua serie migliore deve essere
 *    gia' vicina alla soglia: sotto il 92% il volume non basta e viene fermato,
 *    e te lo dico, perche' un Rank deve dire quanto sei forte;
 *  - nessun Rank si compra con una serie sola e niente di piu': il volume massimo
 *    e' il 20% e resta dentro quel vincolo.
 */
export const SOGLIA_PER_CROSSARE = 0.92;

export function rankDaScore(score, soglie, { serieFatte = 1 } = {}) {
  const sog = Array.isArray(soglie) ? soglie : [];
  if (!sog.length) return { rank: null, indice: -1, lp: 0, motivo: 'nessuna soglia' };
  const valore = Number(score);
  if (!Number.isFinite(valore)) return { rank: null, indice: -1, lp: 0, motivo: 'nessun punteggio' };

  // la serie migliore da sola: e' questa che decide il Rank onesto
  const conSerie = valore * moltiplicatoreSerie(serieFatte);
  const onesto = bandaDaValore(conSerie, sog);
  const daSola = bandaDaValore(valore, sog);
  const haVolume = serieFatte > 1 && onesto.indice > daSola.indice;

  if (haVolume && valore < sog[daSola.indice + 1] * SOGLIA_PER_CROSSARE) {
    // Il volume voleva farti salire ma la tua serie migliore non e' ancora vicina
    // alla soglia.
    //
    // QUI C'ERA UN BUG MIO, e me lo ha fatto vedere il test V6: restituivo la
    // fascia calcolata sul numero CON il volume, quindi il Rank era gia' salito
    // ("bloccato" ma salito). Il blocco deve valere per il RANK, non per gli LP:
    // quindi qui si tiene la fascia della serie migliore e si prende solo il
    // merito delle serie, cioe' gli LP, fermati dentro quella fascia.
    const fermato = { ...daSola };
    fermato.lp = lpDentro(conSerie, sog, daSola.indice);
    fermato.progresso = progressoDentro(conSerie, sog, daSola.indice);
    fermato.volumeBloccato = true;
    fermato.lpConVolume = onesto.lp;
    fermato.rankCheAvrestiAvuto = onesto.rank;
    fermato.massimoRichiesto = Math.round(sog[daSola.indice + 1] * SOGLIA_PER_CROSSARE * 100) / 100;
    return fermato;
  }
  return { ...onesto, volumeBloccato: false };
}

/** Gli LP che il volume ti porta a prendere, fermati dentro la fascia data. */
function lpDentro(valore, soglie, indice) {
  if (indice < 0) return 0;
  if (indice >= soglie.length - 1) {
    const base = soglie[indice] || 1;
    return Math.max(0, Math.round(((valore - base) / base) * 100));
  }
  const sotto = soglie[indice];
  const spessore = soglie[indice + 1] - sotto || 1;
  return Math.max(0, Math.min(99, Math.floor(((valore - sotto) / spessore) * 100)));
}

/** La percentuale di riempimento della fascia, fermata dentro la fascia data. */
function progressoDentro(valore, soglie, indice) {
  if (indice < 0) return 0;
  if (indice >= soglie.length - 1) return 1;
  const sotto = soglie[indice];
  const spessore = soglie[indice + 1] - sotto || 1;
  return Math.max(0, Math.min(1, (valore - sotto) / spessore));
}

/** In quale fascia cade questo punteggio, e a quanti LP sei dentro. */
function bandaDaValore(valore, soglie) {
  if (valore <= soglie[0]) {
    return {
      indice: -1, rank: null, lp: 0, progresso: 0, sottoSoglia: true,
      mancaAllaPrima: Math.round((soglie[0] - valore) * 100) / 100,
    };
  }
  let indice = 0;
  for (let i = 0; i < soglie.length; i++) if (valore >= soglie[i]) indice = i;
  const inCima = indice === soglie.length - 1;
  let lp = 0;
  let progresso = 1;
  if (inCima) {
    const base = soglie[indice] || 1;
    lp = Math.max(0, Math.round(((valore - base) / base) * 100));
  } else {
    const sotto = soglie[indice];
    const sopra = soglie[indice + 1];
    const spessore = sopra - sotto || 1;
    lp = Math.max(0, Math.min(99, Math.floor(((valore - sotto) / spessore) * 100)));
    progresso = Math.max(0, Math.min(1, (valore - sotto) / spessore));
  }
  return {
    indice, rank: RANK[indice] || null, lp, progresso, sottoSoglia: false,
    prossimaSoglia: inCima ? null : soglie[indice + 1],
    prossimoRank: inCima ? null : (RANK[indice + 1] || null),
  };
}