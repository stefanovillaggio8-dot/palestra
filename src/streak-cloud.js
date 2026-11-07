import { calcolaStreak } from './streak.js';

// Snapshot AUTENTICO del cloud: tutte le sedute che la RLS consente di leggere
// vengono filtrate per la sola scheda dell'account selezionato. Nessuna scrittura,
// nessun "merge" che possa resuscitare tombstone eliminate, nessun dato di amici.
export function calcolaStreakCloud({
  account, profiloCloud, seduteCloud = [], schedaId, versioni = [], oggi,
} = {}) {
  if (!account || !profiloCloud || profiloCloud.id !== account
      || !schedaId || profiloCloud.scheda_id !== schedaId) return null;
  const valideVersioni = new Set((versioni || [])
    .filter(v => v && v.scheda_id === schedaId).map(v => v.id));
  const sedute = (seduteCloud || []).filter(s => s &&
    (s.scheda_id === schedaId ||
      (!s.scheda_id && valideVersioni.has(s.versione_id))));
  const streak = calcolaStreak(sedute, oggi, profiloCloud);
  return { account, schedaId, oggi, streak, nSedute:sedute.length, fonte:'cloud_verificato' };
}

// Una verifica cloud vale per lo stesso account, stessa scheda e stesso giorno:
// il cambio account o la mezzanotte non devono mostrare lo snapshot precedente.
export function streakCloudUtilizzabile(snap, {account, schedaId, oggi, localePendenti = false} = {}) {
  return !!snap && !localePendenti && snap.account === account
    && snap.schedaId === schedaId && snap.oggi === oggi
    && snap.fonte === 'cloud_verificato'
    && Number.isInteger(snap.streak?.giorni);
}
