// gioco.js -- il collante: mette insieme rank, streak, Aura, missioni e
// statistiche per un account, e dice che cosa guadagni quando finisci un
// allenamento.
//
// Anche questo file e' logica pura: nessun DOM, nessuna scrittura. Chi lo usa
// (l'interfaccia) salva quello che questo file restituisce. Cosi' le regole
// del gioco si possono provare tutte con i test.

import { recordAccount, rankPrincipale, distribuzioneRank, recordEsercizio, calcolaRank } from './rank.js';
import { profiloEsercizio } from './rank-config.js';
import { calcolaStreak, aspettoStreak, traguardiNuovi, ricompensaTraguardo, giorniAllenati, isoGiorno } from './streak.js';
import { idSettimana, quadroMissioni, contaCompletate, storicoMissioni } from './missioni.js';
import { totaliDaRicompense, statoLivello, medaglie, ricompensaRecord, ricompensaPromozione, RICOMPENSE } from './aura.js';

/** Le serie di ogni esercizio, raggruppate come le vuole recordAccount. */
export function gruppiDaSerie(sedute, serie, esercizi) {
  const perEsercizio = new Map();
  for (const e of (esercizi || [])) {
    if (!e || !e.id) continue;
    perEsercizio.set(e.id, []);
  }
  const seduteBuone = (sedute || []).filter((s) => s && !s.eliminata && s.stato === 'completata');
  const idSeduta = new Set(seduteBuone.map((s) => s.id));
  for (const x of (serie || [])) {
    if (!x || x.eliminata) continue;
    if (!idSeduta.has(x.seduta_id)) continue;
    if (!perEsercizio.has(x.esercizio_id)) perEsercizio.set(x.esercizio_id, []);
    perEsercizio.get(x.esercizio_id).push(x);
  }
  return [...perEsercizio.entries()].map(([esercizio_id, serieDiEsercizio]) => ({
    esercizio_id,
    serie: serieDiEsercizio,
  }));
}

/**
 * TUTTO lo stato di gioco di un account in un colpo.
 * Nessuna scrittura: e' una fotografia, si puo' ricalcolare quanto si vuole.
 */
export function statoAccount({
  account,
  sedute = [],
  serie = [],
  esercizi = [],
  completamenti = [],
  ricompense = [],
  oggi = null,
  datiMissioni = null,
} = {}) {
  const giorno = oggi || isoGiorno(new Date());
  const settimana = idSettimana(giorno);
  const mieiSedute = (sedute || []).filter((s) => s && !s.eliminata);
  const completate = mieiSedute.filter((s) => s.stato === 'completata');

  const record = recordAccount(
    esercizi,
    gruppiDaSerie(completate, serie, esercizi),
    { soloConDati: true },
  );
  const principale = rankPrincipale(record);
  const distribuzione = distribuzioneRank(record);

  const streak = calcolaStreak(completate, giorno);
  const fuoco = aspettoStreak(streak);

  const totali = totaliDaRicompense(ricompense);
  const livello = statoLivello(totali.xp);

  const quadro = quadroMissioni({
    accountId: account,
    dataISO: giorno,
    settimana,
    completamenti,
  });

  const numMissioni = contaCompletate(completamenti);
  const medaglieVinte = medaglie({
    sedute: completate.length,
    aura: totali.aura,
    streak: Math.max(streak.giorni, 1),
    missioni: numMissioni,
    rank: Object.fromEntries(distribuzione.map((d) => [d.rank.id, d.numero])),
  });

  return {
    account,
    giorno,
    settimana,
    streak,
    fuoco,
    aura: totali.aura,
    xp: totali.xp,
    livello,
    record,
    recordValidi: record.filter((r) => r.valido),
    rankPrincipale: principale,
    distribuzione,
    missioni: quadro,
    missioniCompletate: numMissioni,
    storicoMissioni: storicoMissioni(completamenti),
    medaglie: medaglieVinte,
    medaglieOttenute: medaglieVinte.filter((m) => m.ottenuta),
    statistiche: {
      seduteCompletate: completate.length,
      giorniAllenati: giorniAllenati(completate).length,
      serieRegistrate: (serie || []).filter((x) => x && !x.eliminata).length,
      eserciziConRecord: record.filter((r) => r.valido).length,
      recordMigliori: record.filter((r) => r.valido && r.rankId === 'olympian').length,
    },
    datiMissioni,
  };
}

/**
 * Cosa guadagni quando finisci un allenamento.
 * Restituisce la lista delle ricompense NUOVE da salvare: e' il frontend a
 * scriverle, ma non puo' inventarne una qualsiasi, perche' qui c'e' gia' tutto
 * deciso e il salvataggio passa dal database.
 *
 * ricompenze = quelle gia' salvate (serve per non ripetere i premi)
 */
export function ricompenseAllenamento({
  account,
  sedute = [],
  serie = [],
  esercizi = [],
  ricompense = [],
  oggi = null,
} = {}) {
  const giorno = oggi || isoGiorno(new Date());
  const completate = (sedute || []).filter((s) => s && !s.eliminata && s.stato === 'completata');
  const nuove = [];
  const gia = new Set(ricompense.map((r) => `${r.tipo}:${r.fonte || ''}`));
  const aggiungi = (tipo, fonte, aura, xp, dettaglio) => {
    const chiave = `${tipo}:${fonte || ''}`;
    if (gia.has(chiave)) return;
    gia.add(chiave);
    nuove.push({
      id: `${account}:${tipo}:${fonte || giorno}`,
      account_id: account,
      tipo,
      fonte: fonte || null,
      aura,
      xp,
      dettaglio: dettaglio || '',
      quando: giorno,
    });
  };

  // 1) l'allenamento in se'
  aggiungi('allenamento', null, RICOMPENSE.allenamento.aura, RICOMPENSE.allenamento.xp,
    `Allenamento del ${giorno}`);

  // 2) i record nuovi e le promozioni di rank
  const record = recordAccount(
    esercizi,
    gruppiDaSerie(completate, serie, esercizi),
    { soloConDati: true },
  );
  for (const r of record) {
    if (!r.valido || !r.esercizio) continue;
    const ric = ricompensaRecord(r.rankId);
    aggiungi('record', r.esercizio.id, ric.aura, ric.xp, `${r.esercizio.nome}: ${r.testo}`);
    const promozione = ricompensaPromozione(r.rankId);
    aggiungi('promozione', `${r.esercizio.id}:${r.rankId}`, promozione.aura, promozione.xp,
      `${r.esercizio.nome}: ${r.rank.nome}`);
  }

  // 3) i traguardi di streak
  const streak = calcolaStreak(completate, giorno);
  const giaStreak = ricompense.filter((r) => r.tipo === 'traguardo').map((r) => Number(String(r.fonte).split(':')[1]));
  for (const t of traguardiNuovi(streak.giorni, giaStreak)) {
    const ric = ricompensaTraguardo(t);
    aggiungi('traguardo', `${giorno}:${t}`, ric.aura, ric.xp, `${t} giorni di fila`);
  }

  return nuove;
}

/** Il rank di un esercizio visto da un account: comodo per le card. */
export function cardRank(serie, esercizio) {
  const profilo = profiloEsercizio(esercizio);
  const r = recordEsercizio(serie, esercizio, profilo);
  return { ...r, profilo, calcolato: calcolaRank(r.punteggio, profilo) };
}