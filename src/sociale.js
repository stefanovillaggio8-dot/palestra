// sociale.js -- amici, privacy e confronto fra due account.
//
// Due regole:
//  1) la privacy si rispetta davvero: se un account ha nascosto le performance,
//     il confronto non le mostra. Non basta nasconderle a schermo.
//  2) il confronto e' SEMPRE esercizio per esercizio. Non esiste una classifica
//     che somma esercizi diversi: sarebbe sbilanciato (i muscoli non sono tutti
//     uguali e 50 kg di una cosa non valgono 50 kg di un'altra).

import { recordEsercizio } from './rank.js';

/**
 * I quattro interruttori di privacy. Tutti pubblici di default: si puo'
 * chiudere quello che si vuole, e la struttura e' gia' pronta se un domani
 * volessimo aggiungerne un quinto.
 */
export const PRIVACY_PREDEFINITE = {
  profilo: 'chiuso',
  performance: 'chiuso',
  leaderboard: 'pubblico',
  statistiche: 'chiuso',
};

/**
 * Il codice per aprire le schede degli altri.
 *
 * Ste: "non dare il permesso a nessuno di andare nelle schede degli altri se
 * non immettendo un codice: 030226".
 *
 * Quindi i dati personali (profilo, record, statistiche) sono CHIUSI per
 * default e per guardare quelli di un altro serve questo codice. Le
 * classifiche restano pubbliche: sono il punto della sfida e non dicono
 * nulla sulla persona (si vede solo l'esercizio e il punteggio).
 *
 * Il codice si controlla con `codiceAperto` e si ricorda con `ricordaCodice`.
 */
export const CODICE_SCHEDE = '030226';

/**
 * Il codice è sbagliato?
 * Confronto a carattere per carattere: "030226" e "030227" non devono
 * aprire. Uso il confronto diretto e non un numero, per non perdere gli zeri
 * iniziali.
 */
export function codiceCorretto(scritto) {
  return String(scritto == null ? '' : scritto).trim() === CODICE_SCHEDE;
}

/**
 * L'account ha scritto il codice (adesso o in una visita precedente)?
 *
 * `ricordato` e' quello che resta scritto dopo averlo dato una volta: se è
 * vero non si chiede più. `sessione` copre il caso in cui Ste non vuole
 * lasciare il codice salvato.
 */
export function codiceAperto(sessione, ricordato) {
  return sessione === true || ricordato === true;
}

/** Come si chiamano e cosa coprono, per il pannello delle impostazioni. */
export const campiVisibili = [
  { id: 'profilo',      nome: 'Profilo',      descrizione: 'Nome, avatar, livello, Aura e streak.', nota: 'Chiuso: serve il codice per vederlo.' },
  { id: 'performance',  nome: 'Performance',  descrizione: 'I tuoi record e le tue migliori serie.', nota: 'Chiuso: serve il codice per vederli.' },
  { id: 'leaderboard',  nome: 'Classifiche',  descrizione: 'La tua posizione nelle classifiche per esercizio.', nota: 'Pubblico.' },
  { id: 'statistiche',  nome: 'Statistiche',  descrizione: 'Medaglie, achievement e numeri.', nota: 'Chiuso: serve il codice per vederle.' },
];

/** La privacy di un profilo, con i valori mancanti riempiti. */
export function privacyDi(profilo) {
  const salvata = (profilo && profilo.privacy) || {};
  return { ...PRIVACY_PREDEFINITE, ...salvata };
}

/**
 * Un account puo' vedere un pezzo di dato di un altro?
 *
 * se stesso: sempre.
 * altrimenti: i dati sono chiusi per default, e serve il CODICE. Non basta
 * la privacy "pubblica" di quel profilo: senza il codice non si vede nulla,
 * cosi' nessuno puo' spiare la scheda di un altro aprendo un link.
 */
export function puoVedere(mio, altro, campo, codiceRiconosciuto = false) {
  if (!altro) return false;
  if (mio && altro.id && mio.id === altro.id) return true;
  const privacy = privacyDi(altro);
if (campo === 'leaderboard') return privacy.leaderboard === 'pubblico';

  // Gli altri campi hanno tre stati, ed è importante distinguerli:
  //   'chiuso'  = valgono per gli amici ma servono il CODICE (il default)
  //   'privato' = non li vede nessuno, nemmeno con il codice
  //   'pubblico'= aperti a tutti
  // Il codice serve a entrare, non a ignorare una scelta 'privato'.
  const stato = campo === 'profilo' ? privacy.profilo
    : campo === 'statistiche' ? privacy.statistiche
    : campo === 'record' ? privacy.performance
    : null;
  if (stato === null) return false;
  if (stato === 'privato') return false;
  if (stato === 'pubblico') return true;
  return codiceRiconosciuto;
}

/** L'elenco degli amici autorizzati, in ordine di nome. */
export function amiciDi(profilo, catalogo = []) {
  const id = (profilo && profilo.id) || null;
  const ids = (profilo && profilo.amici) || [];
  const out = [];
  for (const a of catalogo) {
    if (!a || !a.id || a.id === id) continue;
    if (ids.indexOf(a.id) === -1) continue;
    out.push(a);
  }
  return out.sort((a, b) => String(a.username || '').localeCompare(String(b.username || '')));
}

/** Proposta di amicizia fra due account, se non sono gia' amici. */
export function propostaAmicizia(mio, altro) {
  if (!mio || !altro || mio.id === altro.id) return null;
  const gia = ((mio.amici || []).indexOf(altro.id) !== -1);
  return {
    da: mio.id,
    a: altro.id,
    amici: gia,
    testo: gia
      ? `${altro.username} e' gia' tra i tuoi amici.`
      : `Vuoi aggiungere ${altro.username} tra gli amici?`,
  };
}

/**
 * Il confronto fra due account, esercizio per esercizio.
 *
 * mieiRecord = [{ esercizio, profilo, valido, punteggio, testo, rank, lp }]
 * suoiRecord = idem
 */
export function confronta(mio, suo, mieiRecord = [], suoiRecord = []) {
  const perId = (lista) => {
    const m = new Map();
    for (const r of (lista || [])) {
      if (r && r.esercizio && r.esercizio.id) m.set(r.esercizio.id, r);
    }
    return m;
  };
  const miei = perId(mieiRecord);
  const suoi = perId(suoiRecord);
  const ids = [...new Set([...miei.keys(), ...suoi.keys()])];
  const righe = [];
  for (const id of ids) {
    const a = miei.get(id) || null;
    const b = suoi.get(id) || null;
    const esercizio = (a && a.esercizio) || (b && b.esercizio) || null;
    const riga = {
      esercizio_id: id,
      esercizio,
      nome: esercizio ? esercizio.nome : id,
      mio: a && a.valido ? { punteggio: a.punteggio, testo: a.testo, rank: a.rank, lp: a.lp, peso: a.pesoCorporeo || null } : null,
      suo: b && b.valido ? { punteggio: b.punteggio, testo: b.testo, rank: b.rank, lp: b.lp, peso: b.pesoCorporeo || null } : null,
      esito: 'pareggio',
    };
    if (riga.mio && riga.suo) {
      if (riga.mio.punteggio > riga.suo.punteggio) riga.esito = 'mio';
      else if (riga.mio.punteggio < riga.suo.punteggio) riga.esito = 'suo';
      else riga.esito = 'pareggio';
    } else if (riga.mio) riga.esito = 'mio';
    else if (riga.suo) riga.esito = 'suo';
    else riga.esito = 'nessuno';
    righe.push(riga);
  }
  righe.sort((a, b) => {
    const pa = a.mio ? a.mio.punteggio : -1;
    const pb = b.mio ? b.mio.punteggio : -1;
    if (pa !== pb) return pb - pa;
    return String(a.nome).localeCompare(String(b.nome));
  });
  return {
    righe,
    vinti: righe.filter((r) => r.esito === 'mio').length,
    persi: righe.filter((r) => r.esito === 'suo').length,
    pari: righe.filter((r) => r.esito === 'pareggio').length,
  };
}

/**
 * Le classifiche "uno per esercizio": il migliore di ogni esercizio, senza
 * mescolare muscoli diversi.
 * Voci = [{ account, username, avatar_id, record: [record...] }]
 */
export function classifichePerEsercizio(voci, esercizi) {
  const catalogo = new Map();
  for (const e of (esercizi || [])) if (e && e.id) catalogo.set(e.id, e);
  const perEsercizio = new Map();
  for (const v of (voci || [])) {
    for (const r of (v.record || [])) {
      if (!r || !r.valido || !r.esercizio) continue;
      if (!perEsercizio.has(r.esercizio.id)) perEsercizio.set(r.esercizio.id, []);
      perEsercizio.get(r.esercizio.id).push({
        account: v.account,
        username: v.username,
        avatar_id: v.avatar_id,
        punteggio: r.punteggio,
        testo: r.testo,
        rank: r.rank,
        lp: r.lp,
      });
    }
  }
  const out = [];
  for (const [id, lista] of perEsercizio) {
    const e = catalogo.get(id) || { id, nome: id };
    // l'ordinamento lo fa classificaEsercizio di rank.js: stesse regole ovunque
    const ordinate = lista.slice().sort((a, b) => {
      if (b.punteggio !== a.punteggio) return b.punteggio - a.punteggio;
      return String(a.username).localeCompare(String(b.username));
    });
    out.push({ esercizio: e, esercizio_id: id, voci: ordinate });
  }
  out.sort((a, b) => {
    if (b.voci.length !== a.voci.length) return b.voci.length - a.voci.length;
    return String(a.esercizio.nome).localeCompare(String(b.esercizio.nome));
  });
  return out;
}

/**
 * Il record di un account su un esercizio (una riga sola, comoda da usare).
 *
 * Passa anche il peso corporeo: le classifiche devono usare lo stesso criterio
 * del Rank, altrimenti un ragazzino di 60 kg e uno di 90 kg comparirebbero
 * come se avessero sollevato la stessa identica cosa.
 */
export function recordSu(serie, esercizio, pesoCorporeo = null) {
  return recordEsercizio(serie || [], esercizio, null, pesoCorporeo);
}