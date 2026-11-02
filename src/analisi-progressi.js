// Analisi descrittiva e conservativa delle ultime due sedute comparabili.
// Non cambia carichi, non assegna rank e non tocca il database.
export function segnaliProgressione(sedute = [], serie = [], esercizi = [], massimo = 4) {
  const sessioni = new Map((sedute || [])
    .filter(s => s && !s.eliminata && s.stato === 'completata' && /^\d{4}-\d{2}-\d{2}/.test(String(s.data || '')))
    .map(s => [s.id, s]));
  const nomi = new Map((esercizi || []).filter(e => e && e.id).map(e => [e.id, String(e.nome || 'Esercizio')]));
  const perEsercizio = new Map();
  for (const set of (serie || [])) {
    if (!set || set.eliminata || set.stato !== 'fatta' || set.spotter || set.assistito) continue;
    const sessione = sessioni.get(set.seduta_id);
    const peso = Number(set.peso), ripetizioni = Number(set.ripetizioni);
    if (!sessione || !set.esercizio_id || !Number.isFinite(peso) || peso <= 0 ||
        !Number.isFinite(ripetizioni) || ripetizioni <= 0) continue;
    if (!perEsercizio.has(set.esercizio_id)) perEsercizio.set(set.esercizio_id, new Map());
    const perSeduta = perEsercizio.get(set.esercizio_id);
    const migliore = perSeduta.get(sessione.id);
    // Rappresentiamo ogni seduta con il set a peso maggiore e, a parita, piu ripetizioni.
    if (!migliore || peso > migliore.peso || (peso === migliore.peso && ripetizioni > migliore.ripetizioni)) {
      perSeduta.set(sessione.id, { peso, ripetizioni, data: String(sessione.data).slice(0,10), id: String(sessione.id) });
    }
  }
  const segnali = [];
  for (const [id, sessioniEsercizio] of perEsercizio) {
    const ultime = [...sessioniEsercizio.values()].sort((a,b) =>
      b.data.localeCompare(a.data) || b.id.localeCompare(a.id)).slice(0, 2);
    if (ultime.length < 2) continue;
    const [ultima, precedente] = ultime;
    // Un carico maggiore con meno ripetizioni non e un miglioramento certo.
    const progresso = ultima.peso >= precedente.peso && ultima.ripetizioni >= precedente.ripetizioni &&
      (ultima.peso > precedente.peso || ultima.ripetizioni > precedente.ripetizioni);
    const calo = ultima.peso <= precedente.peso && ultima.ripetizioni <= precedente.ripetizioni &&
      (ultima.peso < precedente.peso || ultima.ripetizioni < precedente.ripetizioni);
    const esito = progresso ? 'miglioramento' : calo ? 'da_rivedere' :
      (ultima.peso === precedente.peso && ultima.ripetizioni === precedente.ripetizioni) ? 'stabile' : 'non_confrontabile';
    segnali.push({ esercizio_id:id, nome:nomi.get(id)||'Esercizio', esito, ultima, precedente });
  }
  const limit = Number.isInteger(massimo) ? Math.max(0, Math.min(massimo, 20)) : 4;
  return segnali.sort((a,b) => b.ultima.data.localeCompare(a.ultima.data) ||
    a.nome.localeCompare(b.nome,'it')).slice(0,limit);
}
