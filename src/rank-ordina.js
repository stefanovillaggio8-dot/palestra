import { divisioneStemma } from './rank-stemmi.js';

// L'ordine gerarchico è indipendente dall'ordine delle schede o dalla data
// dell'ultima seduta. I rank non vengono ricalcolati né modificati.
export const RANK_IN_ORDINE = Object.freeze([
  'olympian', 'titan', 'diamond', 'platinum', 'gold', 'silver', 'bronze',
]);
const POSIZIONE = new Map(RANK_IN_ORDINE.map((id, i) => [id, i]));
const numero = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
function valoreRank(r) {
  if (!r || !r.valido || !POSIZIONE.has(r.rankId)) return Number.POSITIVE_INFINITY;
  return POSIZIONE.get(r.rankId);
}
export function confrontaRecordRank(a, b) {
  const rankA=valoreRank(a), rankB=valoreRank(b);
  if (rankA !== rankB) return rankA - rankB;
  if (!Number.isFinite(rankA)) {
    return String(a?.esercizio?.nome || '').localeCompare(String(b?.esercizio?.nome || ''), 'it');
  }
  // Nessuna divisione per Olympian. Per tutti gli altri III > II > I.
  if (a.rankId !== 'olympian') {
    const dA=divisioneStemma(a.rankId, a.lp, a.divisione) || 0;
    const dB=divisioneStemma(b.rankId, b.lp, b.divisione) || 0;
    if (dA !== dB) return dB - dA;
  }
  if (numero(a.lp) !== numero(b.lp)) return numero(b.lp) - numero(a.lp);
  const nomeA=String(a?.esercizio?.nome || '');
  const nomeB=String(b?.esercizio?.nome || '');
  const byName=nomeA.localeCompare(nomeB,'it',{sensitivity:'base'});
  if (byName) return byName;
  return String(a?.esercizio?.id || '').localeCompare(String(b?.esercizio?.id || ''));
}
export function ordinaRecordRank(records) {
  return [...(Array.isArray(records) ? records : [])].sort(confrontaRecordRank);
}
