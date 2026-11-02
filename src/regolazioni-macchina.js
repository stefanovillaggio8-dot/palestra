// Regolazioni personali di macchine/panche/cavi, separate dalla nota tecnica.
// Salvataggio nella tabella note già sincronizzata: nessuna migrazione database.
export const CAMPI_REGOLAZIONI = Object.freeze([
  { id:'macchina', nome:'Macchina / modello', esempio:'Panatta, macchina vicino allo specchio...' },
  { id:'sedile', nome:'Sedile / schienale', esempio:'Sedile 4 · schienale 2' },
  { id:'presa', nome:'Impugnatura / posizione', esempio:'Presa neutra, terzo foro' },
  { id:'cavo', nome:'Carrucola / altezza', esempio:'Altezza 12 · gancio 1' },
  { id:'altro', nome:'Altre regolazioni', esempio:'Fermo gambe 3, pedana 2...' },
]);
export function idRegolazioni(accountId, esercizioId) {
  if (!accountId || !esercizioId) throw new Error('Account ed esercizio necessari');
  return 'nota-regolazioni-v397-' + encodeURIComponent(String(accountId)) + '-' + encodeURIComponent(String(esercizioId));
}
export function pulisciRegolazioni(obj) {
  const dati = {};
  for (const c of CAMPI_REGOLAZIONI) {
    dati[c.id] = String(obj?.[c.id] ?? '').trim().slice(0,280);
  }
  return dati;
}
export function leggiRegolazioni(note) {
  if (!note?.testo) return pulisciRegolazioni({});
  try {
    const dati = JSON.parse(note.testo);
    return pulisciRegolazioni(dati && typeof dati === 'object' ? dati : {});
  } catch { return pulisciRegolazioni({}); }
}
export function riepilogoRegolazioni(dati) {
  const d = pulisciRegolazioni(dati);
  return CAMPI_REGOLAZIONI.filter(x=>d[x.id])
    .map(x=>x.nome + ': ' + d[x.id]).join(' · ');
}
export function recordRegolazioni(accountId, esercizioId, valori) {
  return {
    id: idRegolazioni(accountId,esercizioId),
    livello:'regolazioni_macchina',
    esercizio_id:esercizioId,
    testo:JSON.stringify(pulisciRegolazioni(valori)),
  };
}
