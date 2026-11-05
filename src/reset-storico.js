// Selezione PURA e testabile dei dati da azzerare per il solo account attivo.
// Non cancella nulla e non ha accesso al database: il chiamante conferma prima.
import { eventoDaNota } from './cronologia.js';

const PREMI_ALLENAMENTO = new Set(['allenamento','record','promozione','traguardo']);

export function preparaAzzeramentoStorico({ account, sedute = [], serie = [], note = [], ricompense = [] } = {}) {
  const vuoto = { sedute: [], serie: [], notePersonali: [], premiAllenamenti: [] };
  if (!account) return vuoto;
  // Il chiamante passa solo sedute della persona attiva. Qui la selezione di
  // serie e note e' vincolata ANCORA agli ID, per sicurezza.
  const mie = (Array.isArray(sedute) ? sedute : []).filter(s => s && !s.eliminata);
  const ids = new Set(mie.map(s => s.id));
  const righe = (Array.isArray(serie) ? serie : []).filter(x =>
    x && !x.eliminata && ids.has(x.seduta_id));
  const notePersonali = (Array.isArray(note) ? note : []).filter(n => n && !n.eliminata && (
    (n.seduta_id && ids.has(n.seduta_id))
    || [...ids].some(id => String(n.id || '').startsWith('nota-' + id + '-'))
    || !!eventoDaNota(n, account)
  ));
  // I premi non dipendenti dagli allenamenti (missioni, shop) sono intatti.
  const premiAllenamenti = (Array.isArray(ricompense) ? ricompense : []).filter(r =>
    r && !r.eliminata && r.account_id === account && PREMI_ALLENAMENTO.has(r.tipo));
  return { sedute: mie, serie: righe, notePersonali, premiAllenamenti };
}
