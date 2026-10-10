// aura.js -- Aura, XP e livello.
//
// Regola di sicurezza: l'Aura NON È un numero che si scrive a mano da
// qualche parte. Nasce dalla tabella "ricompense", che il frontend non può
// arricchire da solo: ogni riga È stata creata dal sistema quando hai fatto
// qualcosa (una missione, un record, un traguardo di streak). Per cambiare
// l'Aura bisogna passare dal database, non dall'interfaccia.

/** XP necessari per arrivare al livello n. Curva quadratica: senza limiti. */
export function sogliaLivello(livello) {
  const n = Math.max(1, Math.floor(Number(livello) || 1));
  return 50 * n * (n - 1);
}

/** Il livello che corrisponde a tot XP. */
export function livelloDaXP(xp) {
  const x = Math.max(0, Number(xp) || 0);
  let n = 1;
  while (sogliaLivello(n + 1) <= x && n < 100000) n++;
  return n;
}

/** Livello, XP e quanto manca al prossimo. */
export function statoLivello(xp) {
  const livello = livelloDaXP(xp);
  const base = sogliaLivello(livello);
  const prossimo = sogliaLivello(livello + 1);
  const dentro = Math.max(0, Number(xp || 0) - base);
  const serve = Math.max(1, prossimo - base);
  return {
    livello,
    xp: Math.max(0, Number(xp || 0)),
    xpDaLivello: base,
    xpAlProssimoLivello: prossimo,
    mancano: Math.max(0, prossimo - Math.max(0, Number(xp || 0))),
    progresso: Math.max(0, Math.min(1, dentro / serve)),
  };
}

/** I punti che danno le ricompense, per tipo. Tutto qui dentro: si può cambiare. */
export const RICOMPENSE = {
  allenamento:   { aura: 5,   xp: 10,  nome: 'Allenamento completato' },
  record:        { aura: 10,  xp: 25,  nome: 'Nuovo record' },
  promozione:    { aura: 25,  xp: 50,  nome: 'Nuovo rank' },
  missione:      { aura: 0,   xp: 0,   nome: 'Missione completata' },
  traguardo:     { aura: 0,   xp: 0,   nome: 'Traguardo di streak' },
};

/** Bonus per un record, in base a quanto È alto il rank raggiunto. */
export function ricompensaRecord(rankId) {
  const ordine = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'titan', 'olympian'];
  const i = ordine.indexOf(rankId);
  if (i < 0) return { aura: RICOMPENSE.record.aura, xp: RICOMPENSE.record.xp };
  return {
    aura: RICOMPENSE.record.aura + i * 5,
    xp: RICOMPENSE.record.xp + i * 10,
  };
}

/** Bonus per una promozione di rank. */
export function ricompensaPromozione(rankId) {
  const ordine = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'titan', 'olympian'];
  const i = ordine.indexOf(rankId);
  if (i < 0) return { aura: RICOMPENSE.promozione.aura, xp: RICOMPENSE.promozione.xp };
  return {
    aura: RICOMPENSE.promozione.aura + i * 10,
    xp: RICOMPENSE.promozione.xp + i * 20,
  };
}

/** Aura e XP totali, sommati dalle sole ricompense registrate. */
export function totaliDaRicompense(ricompense) {
  let aura = 0;
  let xp = 0;
  for (const r of (ricompense || [])) {
    if (!r) continue;
    aura += Number(r.aura || 0);
    xp += Number(r.xp || 0);
  }
  return { aura, xp, numero: (ricompense || []).length };
}

/** 1250 -> "1.250" (punto come mille, come nell'esempio). */
export function formattaAura(n) {
  const v = Math.round(Number(n) || 0);
  const segno = v < 0 ? '-' : '';
  const cifre = String(Math.abs(v));
  const conPunti = cifre.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return segno + conPunti;
}

/**
 * Crea la riga di ricompensa da salvare. Non la salva: la decisione resta
 * fuori, così chi chiama decide e il motore resta testabile.
 */
export function nuovaRicompensa({ id, account, tipo, fonte, aura = 0, xp = 0, dettaglio = '' }) {
  return {
    id,
    account_id: account,
    tipo,
    fonte: fonte || null,
    aura: Math.max(0, Math.round(Number(aura) || 0)),
    xp: Math.max(0, Math.round(Number(xp) || 0)),
    dettaglio: dettaglio || '',
  };
}

/** Quante volte È già stata data una ricompensa con quella stessa fonte. */
export function giaAssegnata(ricompense, { account, tipo, fonte }) {
  return (ricompense || []).some((r) => r && r.account_id === account && r.tipo === tipo && r.fonte === fonte);
}

/**
 * Le medaglie: si guadagnano, non si scrivono. Ogni medaglia guarda una cosa
 * vera (quante sedute, che rank, quanta aura, che streak).
 */
export const MEDAGLIE = [
  { id: 'prima-seduta',   nome: 'Prima serie',   descrizione: 'Hai finito il tuo primo allenamento.',         campo: 'sedute',  obiettivo: 1 },
  { id: 'dieci-sedute',   nome: 'Dieci',         descrizione: 'Dieci allenamenti finiti.',                    campo: 'sedute',  obiettivo: 10 },
  { id: 'cento-sedute',   nome: 'Cento',         descrizione: 'Cento allenamenti finiti.',                    campo: 'sedute',  obiettivo: 100 },
  { id: 'bronzo',         nome: 'Bronzo',        descrizione: 'Un esercizio almeno BRONZE.',                  campo: 'rank_bronze',   obiettivo: 1 },
  { id: 'oro',            nome: 'Oro',           descrizione: 'Un esercizio almeno GOLD.',                    campo: 'rank_gold',     obiettivo: 1 },
  { id: 'diamante',       nome: 'Diamante',      descrizione: 'Un esercizio almeno DIAMOND.',                campo: 'rank_diamond',  obiettivo: 1 },
  { id: 'olimpico',       nome: 'Olimpico',      descrizione: 'Un esercizio almeno OLYMPIAN.',                campo: 'rank_olympian', obiettivo: 1 },
  { id: 'aura-500',       nome: 'Aura 500',      descrizione: 'Hai raccolto 500 di Aura.',                    campo: 'aura',    obiettivo: 500 },
  { id: 'aura-2500',      nome: 'Aura 2.500',    descrizione: 'Hai raccolto 2.500 di Aura.',                  campo: 'aura',    obiettivo: 2500 },
  { id: 'streak-10',      nome: 'Dieci di fila', descrizione: 'Dieci giorni consecutivi di allenamento.',     campo: 'streak',  obiettivo: 10 },
  { id: 'streak-50',      nome: 'Cinquanta',     descrizione: 'Cinquanta giorni consecutivi di allenamento.', campo: 'streak',  obiettivo: 50 },
  { id: 'missioni-25',    nome: 'Venticinque',   descrizione: 'Hai completato 25 missioni.',                  campo: 'missioni', obiettivo: 25 },
  { id: 'missioni-100',   nome: 'Cento missioni', descrizione: 'Hai completato 100 missioni.',                 campo: 'missioni', obiettivo: 100 },
];

/**
 * Quali medaglie sono state ottenute.
 * valori = { sedute, aura, streak, missioni, rank: {bronze: 1, ...} }
 */
export function medaglie(valori) {
  const v = valori || {};
  const conta = (campo) => {
    if (campo.startsWith('rank_')) {
      const r = v.rank || {};
      const id = campo.slice(5);
      const trovato = Object.keys(r).find((k) => {
        const ordine = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'titan', 'olympian'];
        return ordine.indexOf(k) >= 0 && ordine.indexOf(k) >= ordine.indexOf(id);
      });
      return trovato ? 1 : 0;
    }
    return Number(v[campo] || 0);
  };
  return MEDAGLIE.map((m) => {
    const avuto = conta(m.campo);
    return { ...m, ottenuta: avuto >= m.obiettivo, valore: avuto, mancano: Math.max(0, m.obiettivo - avuto) };
  });
}