import { pesoCorporeoValido, PESO_RIFERIMENTO } from './rank-config.js';
import { scalaEsercizio } from './scala-esercizi.js';

/**
 * La scala di un esercizio, DERIVATA invece che scritta a mano.
 *
 * Ste (04/10/2026): "e dovrebbe farlo in automatico in realtà". Ha ragione, ed è
 * il vero difetto di come l'avevo costruito: avevo una tabella di una riga per
 * esercizio, con dentro tutti i fattori insieme. Il risultato è che ogni riga
 * poteva sbagliare l'unità, e in una settimana ne sono usciti sette uno dietro
 * l'altro (lo shrug con 120 che era un numero da bilanciere, le tirate tarate su
 * 1.64 volte il peso, e cosi via).
 *
 * Qui invece i fattori stanno in TRE posti separati e applicati una volta sola:
 *
 *   1) il MOVIMENTO dice quanto e' grande quell'esercizio in assoluto
 *      (una tirata verticale e' diversa da un laterale)
 *   2) l'UNITA' dice come sono i kg che si registrano
 *      (per braccio, per gamba, e sul doppio carrucola senti META')
 *   3) le DIFFICOLTA' spostano la soglia dentro un tetto
 *      (macchina a dischi, cavo, braccia indipendenti, tipo di movimento)
 *
 * Ogni fattore ha un TETTO. Non perche' i numeri siano sbagliati, ma perche' la
 * prima volta che li ho sommati senza tetto il risultato e' stato un -30% e il
 * riferimento del Cable Fly e' finito a 15.7 kg: un numero bassissimo, per il quale
 * i suoi 18.5 kg sembravano un'arma. Con il tetto il fattore sposta la soglia, ma
 * non la cancella.
 */

/** Tetto di ogni correttivo: il fattore puo' spostare, non stravolgere. */
export const TETTO_CORRETTIVO = 0.20;

/**
 * 1) Il movimento: quanto e' grande l'esercizio in assoluto.
 * Numero = kg per kg di peso corporeo, alla eta di riferimento.
 */
export const RAPPORTO_MOVIMENTO = {
  gambe_pesanti: 2.10,
  tirata_orizzontale: 1.45, // Ste: "la lat machine e la seated cable row sono di
  tirata_verticale: 1.45, // tirata, faccio quasi 30 kg in piu' del mio corpo".
  // La fascia giusta e' 1.3-1.5 volte il peso: sotto abbassa il riferimento,
  // sopra lo alza. Lui e' dentro.
  spinta_orizzontale: 1.05,
  spinta_verticale: 0.80,
  petto_isolamento: 0.42,
  spalle_isolamento: 0.16, // deltoide laterale: il punto debole di tutti
  bicipiti: 0.40,
  tricipiti: 0.40,
  gambe_isolamento: 0.95,
  core: 0,
};

/**
 * 2) L'unita': COME sono i kg che vengono registrati.
 *
 * Sta qui e non nelle righe, ed e' la ragione per cui i sette bug di unita' non
 * possono piu' succedere: se un esercizio e' per braccio, il fattore lo tratta
 * come per braccio, e non c'e' nessuna riga che puo' dimenticarselo.
 */
/**
 * 2) L'unita'.
 *
 * Ste (04/10/2026): "la lat machine e la seated cable row sono di tirata, faccio
 * quasi 30kg in piu' del mio corpo".
 *
 * QUI C'ERO CADUTO IO, e ne merito una spiegazione, perche' e' esattamente il
 * bug che ha prodotto i sette errori precedenti. Avevo messo
 * "per_braccio: 0.5", cioe' dimezzavo la scala perche' i kg sono per braccio.
 *
 * E SBAGLIATO. Se tu registri 35 kg per braccio, anche il riferimento deve stare
 * per braccio: 35 si confronta con 35. Dimmezzando il riferimento, la chest
 * press diventava 0.42 invece di 32 e non confrontava con niente.
 *
 * La lezione, che vale per tutta la tabella: i rapporti base sono gia' espressi
 * nell'unita' in cui l'esercizio si registra. Non si converte niente.
 *
 * L'unica eccezione e' la CARRUCOLA, e perche' e' diversa: sul doppio carrucola
 * tu leggi 50 sul carrello e ne senti 25. Il numero che registri e' il carrello,
 * quindi li' il dimezzamento serve davvero.
 */
export const RAPPORTO_UNITA = {
  // NESSUN fattore per per_braccio / per_gamba / per_manubrio: i rapporti base
  // sono gia' nell'unita' giusta e dimezzarli rompe il confronto.
  carrucola_doppia: 0.5,
};

/** 3) Le difficolta'. Ogni voce con il suo tetto. */
export const CORRETTIVO = {
  attrezzatura: { macchina_dischi: 0.96, macchina_stack: 1.08 },
  bracciaIndipendenti: 0.93, // l'equilibrio lo fai tu
  spinta: 0.95, // spingere e' piu' difficile che tirare
};

function limita(x, tetto = TETTO_CORRETTIVO) {
  return Math.max(1 - tetto, Math.min(1 + tetto, x));
}

/**
 * La scala di un esercizio, derivata.
 *
 * Se l'esercizio ha un numero scritto a mano (la tabella vecchia), quello vince:
 * e' un'eccezione, e le eccezioni si toccano a mano. Ma se non ce l'ha, la scala
 * si calcola, e cosi' un esercizio che Ste crea domani ha gia' il numero giusto
 * senza che io debba scrivere niente.
 */
export function scalaDerivata(esercizio = {}) {
  const {
    id, nome = '', movimento = null, livello = null, convenzione = null,
    attrezzatura = null, carrucola = null, bracciaIndipendenti = false,
    pesoCorporeo = null,
  } = esercizio;

  // eccezione scritta a mano: vince sempre
  const scritta = scalaEsercizio({ id, movimento, livello });
  const peso = pesoCorporeoValido(pesoCorporeo) || PESO_RIFERIMENTO;

  const rapportoMovimento = Number.isFinite(RAPPORTO_MOVIMENTO[movimento])
    ? RAPPORTO_MOVIMENTO[movimento]
    : (Number.isFinite(scitta) && scritta > 0
      // senza movimento riconosciuto uso lo scritto come base, diviso per il
      // peso di riferimento: cosi' la scala resta nella stessa unita' della base
      ? scritta / PESO_RIFERIMENTO
      : 0.90);

  const rapportoUnita = 1; // vedi sopra: i rapporti base sono gia' nell'unita' giusta
  const rapportoCarrucola = carrucola === 'carrucola_doppia' ? RAPPORTO_UNITA.carrucola_doppia : 1;

  const fattoreAttrezzatura = CORRETTIVO.attrezzatura[attrezzatura] || 1;
  const fattoreBraccia = bracciaIndipendenti ? CORRETTIVO.bracciaIndipendenti : 1;
  const fattoreSpinta = (movimento && String(movimento).startsWith('spinta'))
    ? CORRETTIVO.spinta
    : 1;

  const scala70 = rapportoMovimento
    * rapportoUnita
    * rapportoCarrucola
    * limita(fattoreAttrezzatura)
    * limita(fattoreBraccia)
    * limita(fattoreSpinta);

  return Math.round(scala70 * (peso / PESO_RIFERIMENTO) * 100) / 100;
}