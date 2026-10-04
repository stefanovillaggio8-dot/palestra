// streak.js -- la streak della palestra.
//
// La streak si legge dagli allenamenti VERAMENTE completati (sedute chiuse con
// stato "completata"). Non conta aprire l'app, non conta toccare una scheda:
// conta solo un allenamento finito.
//
// Se salti un giorno la streak si interrompe e riparte da 1. Non esiste un
// tetto: puo' arrivare a 100, 1000, 5000.

/** I giorni in cui hai davvero allenato, dal piu' recente al piu' vecchio. */
export function giorniAllenati(sedute) {
  const giorni = new Set();
  for (const s of (sedute || [])) {
    if (!s || s.eliminata) continue;
    if (s.stato !== 'completata') continue;
    const d = String(s.data || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) giorni.add(d);
  }
  return [...giorni].sort((a, b) => b.localeCompare(a));
}

/** Quanti giorni di fila, fino a ieri. Serve al test e alla spiegazione. */
export function contaConsecutivi(giorni, oggiISO) {
  const set = new Set(giorni || []);
  let n = 0;
  let giorno = oggiISO;
  // comincia da ieri: la streak di oggi si aggiunge solo se la giornata c'e' gia' stata
  for (;;) {
    const precedente = giornoPrecedente(giorno);
    if (!set.has(precedente)) break;
    n++;
    giorno = precedente;
    if (n > 100000) break; // difesa: nessun ciclo infinito
  }
  return n;
}

function giornoPrecedente(iso) {
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 1);
  return isoGiorno(d);
}

export function isoGiorno(data) {
  const d = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${g}`;
}

/**
 * La streak di oggi.
 *  attiva: l'ultimo allenamento e' oggi o ieri (quindi la streak e' ancora viva)
 *  interrotta: e' passato piu' di un giorno (la prossima volta riparte da 1)
 */
export function calcolaStreak(sedute, oggi = isoGiorno(new Date())) {
  const giorni = giorniAllenati(sedute);
  if (!giorni.length) {
    return {
      giorni: 0, attiva: false, interrotta: false, giorniAllenati: [],
      ultimoGiorno: null, prossimoObiettivo: null, testo: 'Non hai ancora finito un allenamento: la streak parte dal primo allenamento.',
    };
  }
  const ultimo = giorni[0];
  const ieri = giornoPrecedente(oggi);
  const consecutive = contaConsecutivi(giorni, oggi);
  const fattoOggi = ultimo === oggi;
  const viva = fattoOggi || ultimo === ieri;
  const valore = consecutive + (fattoOggi ? 1 : 0);

  return {
    giorni: viva ? valore : 0,
    attiva: viva,
    interrotta: !viva,
    fattoOggi,
    giorniAllenati: giorni,
    ultimoGiorno: ultimo,
    prossimoObiettivo: prossimoMilestone(valore),
    testo: viva
      ? (fattoOggi
        ? `Streak di ${valore} ${valore === 1 ? 'giorno' : 'giorni'}: oggi hai gia' allenato.`
        : `Streak di ${valore} ${valore === 1 ? 'giorno' : 'giorni'}: ti manca solo oggi per continuare.`)
      : `Streak interrotta: l'ultimo allenamento e' stato il ${ultimo}. Allenandoti oggi riparti da 1.`,
  };
}

// ---------------------------------------------------------------------------
// I traguardi: la logica e' dinamica, non una lista scritta a mano fino a 1000.
// ---------------------------------------------------------------------------

/** I traguardi base, fino a 1000. Piu' avanti si continua a mille. */
export const TRAGUARDI_BASE = [10, 20, 30, 40, 50, 100, 200, 500, 1000];

/** Tutti i traguardi fino a `giorni`, compreso quello appena superato. */
export function traguardiFinoA(giorni) {
  const n = Math.max(0, Number(giorni) || 0);
  const base = TRAGUARDI_BASE.filter((t) => t <= n);
  if (n > 1000) {
    for (let t = 2000; t <= n; t += 1000) base.push(t);
  }
  return base;
}

/** Il prossimo traguardo da raggiungere (null se gia' oltre 1000 senza paletti). */
export function prossimoMilestone(giorni) {
  const n = Math.max(0, Number(giorni) || 0);
  for (const t of TRAGUARDI_BASE) if (t > n) return t;
  if (n < 2000) return 2000;
  return Math.ceil(n / 1000) * 1000;
}

/** I traguardi appena superati: servono all'animazione e all'Aura. */
export function traguardiNuovi(giorni, giaAssegnati = []) {
  const fatti = new Set((giaAssegnati || []).map((x) => Number(x)));
  return traguardiFinoA(giorni).filter((t) => !fatti.has(t));
}

/** Quanta Aura dà un traguardo di streak. */
export function auraTraguardo(giorni) {
  const n = Math.max(0, Number(giorni) || 0);
  if (n >= 1000) return 500;
  if (n >= 500) return 300;
  if (n >= 200) return 200;
  if (n >= 100) return 150;
  if (n >= 50) return 100;
  if (n >= 10) return 50;
  return 0;
}

export function ricompensaTraguardo(giorni) {
  return { aura: auraTraguardo(giorni), xp: Math.max(10, Math.round(giorni / 2)) };
}

// ---------------------------------------------------------------------------
// Il colore del fuoco: cambia da solo ai traguardi, senza codice scritto a mano
// per ogni numero. Oltre 1000 si sale di nuovo verso il ciano.
// ---------------------------------------------------------------------------

export const LIVELLI_FUOCO = [
  { chiave: 'spenta',   nome: 'Spenta',        colore: '#4a4a55', quando: (n) => n <= 0 },
  { chiave: 'normale',  nome: 'Normale',       colore: '#ff9f45', quando: (n) => n >= 1 && n < 10 },
  { chiave: 'giallo',   nome: 'Giallo',        colore: '#ffd166', quando: (n) => n >= 10 && n < 20 },
  { chiave: 'arancio',  nome: 'Arancio vivo',  colore: '#ffa62b', quando: (n) => n >= 20 && n < 30 },
  { chiave: 'mandarino',nome: 'Mandarino',     colore: '#ff7a45', quando: (n) => n >= 30 && n < 40 },
  { chiave: 'rosso',    nome: 'Rosso',         colore: '#ff5f6d', quando: (n) => n >= 40 && n < 50 },
  { chiave: 'rosa',     nome: 'Rosa',          colore: '#ff3d7f', quando: (n) => n >= 50 && n < 100 },
  { chiave: 'viola',    nome: 'Viola',         colore: '#c04cff', quando: (n) => n >= 100 && n < 200 },
  { chiave: 'indaco',   nome: 'Indaco',        colore: '#7c5cff', quando: (n) => n >= 200 && n < 500 },
  { chiave: 'blu',      nome: 'Blu',           colore: '#4a7dff', quando: (n) => n >= 500 && n < 1000 },
  { chiave: 'ciano',    nome: 'Ciano',         colore: '#00e5ff', quando: (n) => n >= 1000 },
];

/** Il livello di fuoco per un numero di giorni. */
export function livelloFuoco(giorni) {
  const n = Math.max(0, Number(giorni) || 0);
  for (const l of LIVELLI_FUOCO) if (l.quando(n)) return l;
  return LIVELLI_FUOCO[0];
}

/**
 * Come si disegna il simbolo della streak: acceso, spento, e con che colore.
 * Restituisce anche il testo da mostrare vicino ("12 giorni").
 */
export function aspettoStreak(streak) {
  const giorni = (streak && streak.giorni) || 0;
  const acceso = !!(streak && streak.attiva);
  const livello = livelloFuoco(giorni);
  return {
    acceso,
    livello: livello.chiave,
    nome: livello.nome,
    colore: acceso ? livello.colore : LIVELLI_FUOCO[0].colore,
    simbolo: 'fuoco',
    giorni,
    etichetta: acceso ? `${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}` : 'spenta',
  };
}