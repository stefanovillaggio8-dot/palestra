// Schermata celebrativa DOPO il salvataggio: legge dati confermati, non dà premi.
export function riassuntoFinaleAllenamento({seduta, serie=[], premi=[], prima=new Map(), dopo=new Map()}={}) {
  const fatte=(serie||[]).filter(x=>x && !x.eliminata && x.stato==='fatta' && x.seduta_id===seduta?.id);
  const ids=new Set(fatte.map(x=>x.esercizio_id).filter(Boolean));
  let record=0,rank=0,primi=0;
  for (const id of ids) {
    const p=prima.get(id),d=dopo.get(id);
    if (!d) continue;
    if (!p) primi++;
    else if (d.indice>p.indice) rank++;
    else if (Number.isFinite(d.punteggio)&&Number.isFinite(p.punteggio)&&d.punteggio>p.punteggio+0.01) record++;
  }
  return {
    nome:String(seduta?.nome_giorno||'Allenamento'),
    serie:fatte.length,esercizi:ids.size,
    minuti:Math.max(0,Math.round((Number(seduta?.durata_secondi)||0)/60)),
    record,rank,primi,
    aura:(premi||[]).reduce((n,p)=>n+(Number(p?.aura)||0),0),
    xp:(premi||[]).reduce((n,p)=>n+(Number(p?.xp)||0),0),
  };
}
export function messaggioFinaleAllenamento(d) {
  if (d.rank>0) return 'Nuovo rank conquistato!';
  if (d.record>0) return 'Hai battuto un tuo record!';
  if (d.primi>0) return 'Hai registrato un nuovo esercizio!';
  return 'Allenamento completato. Ottimo lavoro!';
}
