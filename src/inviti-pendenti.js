// Gli inviti rifiutati definitivamente non vanno riprovati a ogni focus.
// Un errore di rete o di sessione NON e' una prova che il link sia invalido.
export function erroreInvitoDefinitivo(errore) {
  const testo = String(errore?.message || errore || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return (/(invito|invitation|invite)/.test(testo)
    && /(scadut|expired|non valid|invalid|gia stato utilizzato|already used|revocat)/.test(testo))
    || /(stesso account|gia il tuo profilo)/.test(testo);
}

export function scartaInvitoNonUtilizzabile(token, {
  memoria, posizione, cronologia, chiave = 'palestra-invito-pendente',
} = {}) {
  if (!token) return false;
  let cambiato = false;
  try {
    if (memoria?.getItem(chiave) === token) {
      memoria.removeItem(chiave);
      cambiato = true;
    }
  } catch { /* la memoria locale può essere disabilitata */ }
  try {
    const url = new URL(posizione.href);
    if (url.searchParams.get('inv') === token) {
      url.searchParams.delete('inv');
      // La schermata scelta dall'utente resta la stessa: non forzare Profilo.
      cronologia.replaceState(cronologia.state || {}, '', url.pathname + url.search + url.hash);
      cambiato = true;
    }
  } catch { /* URL non disponibile */ }
  return cambiato;
}
