// confronto-mensile.js -- "un mese fa su questo esercizio come stavo?"
//
// Ste (04/10/2026): "ogni mese fai il confronto appena finisci l'esercizio di
// tutte le serie con gli stessi esercizi di un mese prima, fai questa cosa per
// giorno 1 giorno 2 giorno 3 e giorno 4".
//
// Quindi: quando finisci il Giorno 1, l'app guarda cosa avevi fatto sullo
// STESSO esercizio un mese fa e te lo mette fianco a fianco. Vale per tutti i
// quattro giorni della scheda, ognuno con i suoi esercizi.
//
// Il confronto È esercizio per esercizio: non si sommano kg di muscoli
// diversi, perchÈ 50 kg di chest press e 50 kg di curl non sono la stessa
// cosa.

import { recordEsercizio } from './rank.js';


/** Un mese in giorni: il mese di Ste ha 30 giorni di riferimento. */
export const GIORNI_UN_MESE = 30;

/** Quanti mesi si tiene il confronto. */
export const MESI_CONFRONTATI = 3;

/**
 * Le sedute finite, dalla più recente.
 */
function seduteFinite(sedute) {
  return (sedute || [])
    .filter((s) => s && !s.eliminata && s.stato === 'completata')
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
}

/** Oggi, in formato YYYY-MM-DD (ora locale, non UTC: così non rolls a mezzanotte). */
export function isoGiorno(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Quanti giorni sono passati da una data ISO a oggi (positivo = passato). */
function giorniDi(scadenza, oggi) {
  const a = Date.parse(String(scadenza) + 'T12:00:00');
  const b = Date.parse(String(oggi) + 'T12:00:00');
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

/**
 * Il confronto mensile di UN giorno della scheda.
 *
 * seduta = la seduta che hai appena finito su quel giorno.
 * Restituisce una riga per ogni esercizio in comune con il mese scorso.
 */
export function confrontoGiorno({
  seduta,
  serie = [],
  esercizi = [],
  sedute = [],
  oggi = null,
  peso = null,
  giorni = GIORNI_UN_MESE,
} = {}) {
  if (!seduta || !seduta.data) return null;
  // Non cÈ nessun filtro sull'eta' di questa seduta: È la seduta che hai
  // appena finito, quella da confrontare. Quello che deve essere vecchio di un
  // mese È l'ALTRA, quella di riferimento (cercata qui sotto).
  // Prima mettevo un controllo sull'eta' di questa e non partiva mai, perchÈ
  // il giorno che confronti È per definizione fresco.
  void (oggi || isoGiorno());

  // la seduta di un mese fa sullo stesso giorno
  const vecchia = seduteFinite(sedute).find((s) => {
    const g = giorniDi(s.data, seduta.data);
    return g !== null && g >= giorni && g < giorni + 12;
  });
  if (!vecchia) return null;

  const perEsercizio = (idSeduta) => {
    const fuori = new Map();
    for (const x of (serie || [])) {
      if (!x || x.eliminata || x.seduta_id !== idSeduta) continue;
      const attuale = fuori.get(x.esercizio_id) || [];
      attuale.push(x);
      fuori.set(x.esercizio_id, attuale);
    }
    return fuori;
  };

  const ora = perEsercizio(seduta.id);
  const prima = perEsercizio(vecchia.id);
  const nomi = new Map((esercizi || []).map((e) => [e.id, e.nome]));

  const righe = [];
  for (const [idEx, mie] of ora) {
    const loro = prima.get(idEx);
    if (!loro || !loro.length) continue;
    const esercizio = (esercizi || []).find((e) => e.id === idEx) || { id: idEx, nome: nomi.get(idEx) || idEx };
    const a = recordEsercizio(mie, esercizio, null, peso);
    const b = recordEsercizio(loro, esercizio, null, peso);
    if (!a.valido || !b.valido) continue;

    const differenza = (a.punteggio || 0) - (b.punteggio || 0);
    righe.push({
      esercizio_id: idEx,
      nome: esercizio.nome,
      ora: { testo: a.testo, punteggio: a.punteggio, rank: a.rank, rankId: a.rankId, divisione: a.divisione },
      prima: { testo: b.testo, punteggio: b.punteggio, rank: b.rank, rankId: b.rankId, divisione: b.divisione },
      differenza: Math.round(differenza * 100) / 100,
      meglio: differenza > 0.01,
      peggio: differenza < -0.01,
      stessa: Math.abs(differenza) <= 0.01,
      sale: (a.rank ? a.rank.indice : -1) > (b.rank ? b.rank.indice : -1),
    });
  }
  if (!righe.length) return null;

  const quanteMeglio = righe.filter((r) => r.meglio).length;
  const quantePeggiori = righe.filter((r) => r.peggio).length;

  // quanti giorni di distanza ha la seduta di riferimento: serve per scrivere
  // "un mese fa" e non un numero sbagliato
  const eta = giorniDi(vecchia.data, seduta.data);

  const n = righe.length;
  const molti = n === 1 ? 'esercizio' : 'esercizi';
  const frase = quantePeggiori === 0 && quanteMeglio === n
    ? `Un mese fa su ${n === 1 ? 'quest\'esercizio' : 'questi ' + n + ' esercizi'} stavi peggio: ora stai meglio su ${n === 1 ? 'tutto' : 'tutti'}.`
    : (quantePeggiori === 0
      ? `Un mese fa su ${n === 1 ? 'quest\'esercizio' : 'questi ' + n + ' esercizi'} stavi uguale o peggio.`
      : (quanteMeglio === 0
        ? `Un mese fa su ${n === 1 ? 'quest\'esercizio' : 'questi ' + n + ' esercizi'} stavi meglio.`
        : `Un mese fa: meglio su ${quanteMeglio} ${molti === 'esercizio' ? 'esercizio' : 'esercizi'} su ${n}.`));

  // il "+12,67" È poco leggibile: arrotondo a un numero semplice, e se È
  // una cifra tonda cambio unita' invece di mettere ",00"
  const differenzaLegibile = (d) => {
    const t = Math.round(d * 10) / 10;
    return Number.isInteger(t) ? String(t) : String(t);
  };
  for (const r of righe) r.differenzaLegibile = differenzaLegibile(r.differenza);

  return {
    giorni: eta,
    dataRiferimento: vecchia.data,
    righe,
    quanteMeglio,
    quantePeggiori,
    quanteStesse: righe.length - quanteMeglio - quantePeggiori,
    frase,
  };
}


/**
 * Il confronto mensile di TUTTI i giorni della scheda.
 * Restituisce solo i giorni che hanno un mese fa da confrontare.
 */
export function confrontiMensili({
  sedute = [],
  serie = [],
  esercizi = [],
  oggi = null,
  peso = null,
  giorni = GIORNI_UN_MESE,
} = {}) {
  const out = [];
  for (const s of seduteFinite(sedute)) {
    const c = confrontoGiorno({ seduta: s, serie, esercizi, sedute, oggi, peso, giorni });
    if (c) out.push({ seduta_id: s.id, data: s.data, nome_giorno: s.nome_giorno || 'Allenamento', ...c });
  }
  return out.sort((a, b) => String(b.data).localeCompare(String(a.data)));
}
