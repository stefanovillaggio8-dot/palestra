// Ghost Mode: confronto non invasivo mentre la seduta e' in corso.
// Non assegna XP, non cambia carichi e usa solo serie realmente completate.
const valido = x => x !== '' && x !== null && x !== undefined && Number.isFinite(Number(x));
const numero = x => Number(x).toLocaleString('it-IT', {maximumFractionDigits:2});
const fatte = xs => xs.filter(s => s && !s.eliminata && s.stato === 'fatta')
  .sort((a,b) => (Number(a.ordine)||0)-(Number(b.ordine)||0));
function testoSerie(s, {assistito=false,cardio=false}={}) {
  if (!s) return '—';
  if (cardio) {
    if (!valido(s.ripetizioni)) return '—';
    const m = s.durata_unita === 'secondi' ? Number(s.ripetizioni)/60 : Number(s.ripetizioni);
    return numero(m) + ' min';
  }
  const peso = assistito ? s.peso_assistenza : s.peso;
  if (!valido(peso) || !valido(s.ripetizioni)) return 'dati incompleti';
  return numero(peso) + ' kg × ' + numero(s.ripetizioni);
}
function sfidaSerie(attuale, passata, {assistito=false,cardio=false}={}) {
  if (!attuale || !passata) return 'non_confrontabile';
  if (cardio) {
    if (!valido(attuale.ripetizioni) || !valido(passata.ripetizioni)) return 'non_confrontabile';
    const m = s => s.durata_unita === 'secondi' ? Number(s.ripetizioni)/60 : Number(s.ripetizioni);
    return m(attuale) > m(passata) ? 'vinta' : m(attuale) < m(passata) ? 'persa' : 'pari';
  }
  if (!valido(attuale.ripetizioni) || !valido(passata.ripetizioni)) return 'non_confrontabile';
  const kgA = assistito ? attuale.peso_assistenza : attuale.peso;
  const kgB = assistito ? passata.peso_assistenza : passata.peso;
  if (!valido(kgA) || !valido(kgB)) return 'non_confrontabile';
  if (!!attuale.spotter !== !!passata.spotter || !!attuale.dropset !== !!passata.dropset) return 'non_confrontabile';
  const forza = assistito ? Number(kgB)-Number(kgA) : Number(kgA)-Number(kgB);
  const rip = Number(attuale.ripetizioni)-Number(passata.ripetizioni);
  if (forza === 0 && rip === 0) return 'pari';
  if (forza >= 0 && rip >= 0) return 'vinta';
  if (forza <= 0 && rip <= 0) return 'persa';
  return 'mista';
}
export function confrontoGhost({sedute=[],serie=[],sedutaAttivaId,esercizioId,assistito=false,cardio=false}={}) {
  const attuale=serie.filter(s=>s && !s.eliminata && s.seduta_id===sedutaAttivaId
    && s.esercizio_id===esercizioId).sort((a,b)=>(Number(a.ordine)||0)-(Number(b.ordine)||0));
  const candidati=sedute.filter(s=>s && !s.eliminata && s.stato==='completata' && s.id!==sedutaAttivaId)
    .sort((a,b)=>String(b.ora_fine||b.ora_inizio||b.data||'').localeCompare(String(a.ora_fine||a.ora_inizio||a.data||'')));
  const ultimo=candidati.find(s=>serie.some(r=>r && !r.eliminata && r.stato==='fatta'
    && r.seduta_id===s.id && r.esercizio_id===esercizioId));
  if (!ultimo) return {disponibile:false, motivo:'Nessuna seduta precedente completata'};
  const passate=fatte(serie.filter(r=>r.seduta_id===ultimo.id && r.esercizio_id===esercizioId));
  const risultati={vinta:0,persa:0,pari:0,mista:0,non_confrontabile:0};
  const complete=fatte(attuale);
  for (let i=0;i<complete.length;i++) {
    const originalIndex=attuale.findIndex(s=>s.id===complete[i].id);
    const passata=passate[originalIndex]||null;
    risultati[sfidaSerie(complete[i],passata,{assistito,cardio})]++;
  }
  const prossima=attuale.findIndex(s=>s.stato!=='fatta');
  const indice=prossima<0 ? Math.max(0,attuale.length-1) : prossima;
  const riferimento=passate[indice]||passate[passate.length-1]||null;
  const tuaSerie=attuale[indice]||null;
  const comparate=risultati.vinta+risultati.persa+risultati.pari;
  const stato=comparate===0 ? 'inizia' : risultati.vinta>risultati.persa ? 'vinci'
    : risultati.vinta<risultati.persa ? 'insegui' : 'pari';
  return {
    disponibile:true, data:ultimo.data, sedutaId:ultimo.id, risultati,
    comparate, completate:complete.length, totale:attuale.length,
    stato, oggi:testoSerie(tuaSerie,{assistito,cardio}),
    ghost:testoSerie(riferimento,{assistito,cardio}),
    indice:indice+1,
    etichetta:stato==='vinci'?'Sei avanti sul Ghost':stato==='insegui'?'Il Ghost è avanti':
      stato==='pari'?'Sfida in parità':'Il tuo avversario è pronto',
  };
}
