// Giorni della scheda di un nuovo amico: contenitori vuoti, nessun dato
// precompilato dell'account che ha inviato il link.
// Non cambiare GIORNI / costruisciSnapshot: sono lo storico di Stefano e Andrea.

export function creaSchedaVuotaNuovoAmico(schedaId, nome = 'Palestra') {
  if (!schedaId || typeof schedaId !== 'string') throw new Error('Scheda del nuovo amico non valida.');
  return {
    scheda_id: schedaId,
    nome,
    giorni: Array.from({ length: 4 }, (_, i) => ({
      id: 'giorno-' + schedaId + '-' + (i + 1),
      ordine: i + 1,
      nome: 'giorno ' + (i + 1),
      esercizi: [],
    })),
  };
}

// Le modifiche riguardano SOLTANTO la bozza in memoria. La pagina salva poi
// una nuova versione; le sedute passate conservano i propri snapshot originali.
export function aggiungiGiornoVuoto(bozza, id) {
  if (!Array.isArray(bozza?.giorni)) throw new Error('Bozza della scheda non valida.');
  if (!id || bozza.giorni.some((g) => g.id === id)) throw new Error('ID giorno non disponibile.');
  const numeri = bozza.giorni.map((g) => /^giorno\\s+(\\d+)$/i.exec(String(g?.nome || '')))
    .map((m) => m ? Number(m[1]) : 0);
  let numero = Math.max(0, ...numeri) + 1;
  const nomi = new Set(bozza.giorni.map((g) => String(g.nome || '').toLowerCase()));
  while (nomi.has('giorno ' + numero)) numero++;
  const giorno = { id, ordine: bozza.giorni.length + 1, nome: 'giorno ' + numero, esercizi: [] };
  bozza.giorni.push(giorno);
  return giorno;
}

export function rimuoviGiornoBozza(bozza, id) {
  if (!Array.isArray(bozza?.giorni)) return false;
  const indice = bozza.giorni.findIndex((g) => g.id === id);
  if (indice < 0) return false;
  bozza.giorni.splice(indice, 1);
  bozza.giorni.forEach((g, i) => { g.ordine = i + 1; });
  return true;
}
