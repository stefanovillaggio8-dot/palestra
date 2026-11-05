// Ricerca unica degli esercizi: usata sia per la modifica della scheda
// sia per "Prova un esercizio" nei Rank. Niente ricerca solo per prefisso.
export function testoRicercaEsercizi(valore) {
  return String(valore ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Tutte le parole digitate devono comparire, ma possono essere in qualunque
 * punto e in qualunque ordine del nome o del muscolo.
 * Es.: "preacher" trova "One Arm Dumbbell Preacher Curl";
 * "curl preacher" funziona anche se il nome dice "Preacher Curl".
 */
export function corrispondeRicercaEsercizi(voce, ricerca = '') {
  const parole = testoRicercaEsercizi(ricerca).split(' ').filter(Boolean);
  if (!parole.length) return true;
  const e = voce && (voce.e || voce.esercizio || voce);
  if (!e) return false;
  const campi = [
    e.nome,
    voce.gruppo, voce.generale, voce.nomeMuscolo, voce.parte,
    // La descrizione del catalogo resta utile per eventuali sinonimi.
    e.descrizione,
  ];
  const completo = testoRicercaEsercizi(campi.filter(Boolean).join(' '));
  return parole.every((parola) => completo.includes(parola));
}

export function filtraEserciziPerRicerca(voci, ricerca = '') {
  return (Array.isArray(voci) ? voci : [])
    .filter((voce) => corrispondeRicercaEsercizi(voce, ricerca));
}
