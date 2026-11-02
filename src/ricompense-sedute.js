// Legame tra i premi e l'allenamento che li ha fatti ottenere.
// Usa "dettaglio" (già sincronizzato), senza aggiungere colonne a Supabase.
// Le ricompense di missione e gli acquisti nello shop non dipendono dalla seduta.
const TIPI_SEDUTA = new Set(['allenamento', 'record', 'promozione', 'traguardo']);
const CODA = /\n\[palestra-seduta:([^\]\r\n]+)\]$/;

export function collegaPremioASeduta(premio, sedutaId) {
  if (!premio || !TIPI_SEDUTA.has(premio.tipo) || !sedutaId) return premio;
  const testo = String(premio.dettaglio || '').replace(CODA, '');
  return { ...premio, dettaglio: testo + '\n[palestra-seduta:' + encodeURIComponent(String(sedutaId)) + ']' };
}

export function sedutaDelPremio(premio) {
  if (!premio || !TIPI_SEDUTA.has(premio.tipo)) return null;
  if (premio.tipo === 'allenamento') return String(premio.fonte || '') || null;
  const m = CODA.exec(String(premio.dettaglio || ''));
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return null; }
}

function stessoGiorno(a, b) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(a || '').slice(0, 10))
    && String(a).slice(0, 10) === String(b || '').slice(0, 10);
}

function esercizioDelPremio(premio, esercizioId) {
  const fonte = String(premio.fonte || '');
  if (premio.tipo === 'record') return fonte === esercizioId;
  if (premio.tipo === 'promozione') return fonte.startsWith(esercizioId + ':');
  return true;
}

/**
 * Premi da mettere nel cestino insieme alle sedute.
 * Per i premi vecchi, non collegati a un ID, usa la data SOLO se l'attribuzione
 * e' univoca. Una missione, uno shop o il premio di un'altra seduta non si tocca.
 * Gli ID passati devono essere di sedute appartenenti all'account.
 */
export function premiDaAnnullare({ account, ids = [], sedute = [], serie = [], ricompense = [] } = {}) {
  if (!account) return [];
  const voluti = new Set(ids);
  const valide = sedute.filter(s => s && !s.eliminata && s.stato === 'completata');
  const daEliminare = new Set(valide.filter(s => voluti.has(s.id)).map(s => s.id));
  if (!daEliminare.size) return [];
  const perSeduta = new Map();
  for (const x of serie) {
    if (!x || x.eliminata) continue;
    if (!perSeduta.has(x.seduta_id)) perSeduta.set(x.seduta_id, new Set());
    perSeduta.get(x.seduta_id).add(x.esercizio_id);
  }
  return ricompense.filter(r => {
    if (!r || r.eliminata || r.account_id !== account || !TIPI_SEDUTA.has(r.tipo)) return false;
    const origine = sedutaDelPremio(r);
    if (origine !== null) return daEliminare.has(origine);

    // Dati storici precedenti al collegamento esplicito: non supporre quale
    // allenamento abbia generato un premio se nello stesso giorno sono presenti
    // più candidati che non vengono tutti eliminati.
    if (!['record', 'promozione', 'traguardo'].includes(r.tipo)) return false;
    const candidati = valide.filter(s => stessoGiorno(s.data, r.quando)
      && (r.tipo === 'traguardo'
        || [...(perSeduta.get(s.id) || [])].some(id => esercizioDelPremio(r, id))));
    return candidati.length > 0 && candidati.every(s => daEliminare.has(s.id));
  });
}
