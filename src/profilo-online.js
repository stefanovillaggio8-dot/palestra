/**
 * Recupero prudente da Supabase: tra i profili dello stesso utente autenticato
 * non scegliere mai un profilo senza scheda soltanto per l'ID/nome.
 * Nessuna scrittura, cancellazione o fusione di schede.
 */
export function profiloRipristinabile(p) {
  if (!p || typeof p.id !== 'string' || typeof p.scheda_id !== 'string'
      || !p.scheda_id.trim()) return false;
  if (p.id === 'account-1' || p.id === 'account-2') return true;
  const chiave = p.id.startsWith('account-') ? p.id.slice(8) : '';
  return !!chiave && p.scheda_id === 'scheda-' + chiave;
}

/** Consente il recupero automatico solo quando UNA scheda e' identificabile. */
export function profiloUnicoConScheda(profili = []) {
  const validi = (Array.isArray(profili) ? profili : []).filter(profiloRipristinabile);
  return validi.length === 1 ? validi[0] : null;
}

/** In caso di ambiguita', non sceglie arbitrariamente due profili personali. */
export function scegliProfiloOnline(profili = []) {
  const validi = (Array.isArray(profili) ? profili : []).filter(profiloRipristinabile);
  return validi.find(p => p.id === 'account-1')
    || validi.find(p => p.id === 'account-2')
    || (validi.length === 1 ? validi[0] : null);
}
