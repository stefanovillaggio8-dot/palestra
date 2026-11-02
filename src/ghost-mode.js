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
    if (!['minuti','secondi'].includes(s.durata_unita)) return 'durata da verificare';
    const m = s.durata_unita === 'secondi' ? Number(s.ripetizioni)/60 : Number(s.ripetizioni);
    return numero(m) + ' min';
  }
  const peso = assistito ? s.peso_assistenza : s.peso;
  if (!valido(peso) || !valido(s.ripetizioni)) return 'dati incompleti';
  return numero(peso) + ' kg × ' + numero(s.ripetizioni);
}
function testoCompattoSerie(s,config) {
  if (!s || s.stato!=='fatta') return '—';
  const esteso=testoSerie(s,config);
  return esteso.replace(' kg × ','×').replace(' min','′');
}
function sfidaSerie(attuale, passata, {assistito=false,cardio=false,zavorri=false}={}) {
  if (!attuale || !passata || attuale.stato!=='fatta' || passata.stato!=='fatta') return 'non_confrontabile';
  if (cardio) {
    if (!['minuti','secondi'].includes(attuale.durata_unita) ||
        !['minuti','secondi'].includes(passata.durata_unita)) return 'non_confrontabile';
    if (!valido(attuale.ripetizioni) || !valido(passata.ripetizioni)) return 'non_confrontabile';
    const m = s => s.durata_unita === 'secondi' ? Number(s.ripetizioni)/60 : Number(s.ripetizioni);
    return m(attuale) > m(passata) ? 'vinta' : m(attuale) < m(passata) ? 'persa' : 'pari';
  }
  if (!valido(attuale.ripetizioni) || !valido(passata.ripetizioni)) return 'non_confrontabile';
  const kgA = assistito ? attuale.peso_assistenza : attuale.peso;
  const kgB = assistito ? passata.peso_assistenza : passata.peso;
  if (!valido(kgA) || !valido(kgB)) return 'non_confrontabile';
  if (!!attuale.spotter !== !!passata.spotter || !!attuale.dropset !== !!passata.dropset) return 'non_confrontabile';
  if (attuale.spotter && (
    !valido(attuale.rip_assistite) || !valido(passata.rip_assistite) ||
    Number(attuale.rip_assistite)!==Number(passata.rip_assistite)
  )) return 'non_confrontabile';
  // Solo le macchine di ASSISTENZA sono inverse: meno kg = meglio.
  // Le ZAVORRE per trazioni e dips usano lo stesso campo peso_assistenza
  // per compatibilita' storica, ma piu' kg aggiunti = PIU' lavoro.
  const forza = assistito && !zavorri
    ? Number(kgB)-Number(kgA) : Number(kgA)-Number(kgB);
  const rip = Number(attuale.ripetizioni)-Number(passata.ripetizioni);
  if (forza === 0 && rip === 0) return 'pari';
  if (forza >= 0 && rip >= 0) return 'vinta';
  if (forza <= 0 && rip <= 0) return 'persa';
  return 'mista';
}
export function confrontoGhost({sedute=[],serie=[],sedutaAttivaId,esercizioId,assistito=false,cardio=false,zavorri=false,bozzaIds=[],serieFocusId=null}={}) {
  const attuale=serie.filter(s=>s && !s.eliminata && s.seduta_id===sedutaAttivaId
    && s.esercizio_id===esercizioId).sort((a,b)=>(Number(a.ordine)||0)-(Number(b.ordine)||0));
  const candidati=sedute.filter(s=>s && !s.eliminata && s.stato==='completata' && s.id!==sedutaAttivaId)
    .sort((a,b)=>String(b.ora_fine||b.ora_inizio||b.data||'').localeCompare(String(a.ora_fine||a.ora_inizio||a.data||'')));
  const ultimo=candidati.find(s=>serie.some(r=>r && !r.eliminata && r.stato==='fatta'
    && r.seduta_id===s.id && r.esercizio_id===esercizioId));
  if (!ultimo) return {disponibile:false, motivo:'Nessuna seduta precedente completata'};
  // Mantieni anche le serie saltate per non spostare il confronto
  // (serie 3 di oggi NON deve essere confrontata con serie 4 del Ghost).
  const passate=serie.filter(r=>r && !r.eliminata && r.seduta_id===ultimo.id &&
    r.esercizio_id===esercizioId).sort((a,b)=>(Number(a.ordine)||0)-(Number(b.ordine)||0));
  const risultati={vinta:0,persa:0,pari:0,mista:0,non_confrontabile:0};
  const complete=fatte(attuale);
  for (let i=0;i<complete.length;i++) {
    const originalIndex=attuale.findIndex(s=>s.id===complete[i].id);
    const passata=passate[originalIndex]||null;
    risultati[sfidaSerie(complete[i],passata,{assistito,cardio,zavorri})]++;
  }
  const prossima=attuale.findIndex(s=>s.stato!=='fatta');
  const inFocus=serieFocusId ? attuale.findIndex(s=>s.id===serieFocusId) : -1;
  // Quando segni la serie 1, mostra la 1 completata anziche' spostare
  // subito OGGI sulla serie 2 ancora vuota (come nel bug dello screenshot).
  // Se stai scrivendo in un'altra serie, mostra quella bozza per prima.
  const ultimaFatta=attuale.findLastIndex(s=>s.stato==='fatta');
  const ultimaBozza=attuale.findLastIndex(s=>s.stato!=='fatta' && bozzaIds.includes(s.id));
  const indice=inFocus>=0 ? inFocus : ultimaBozza>=0 ? ultimaBozza
    : ultimaFatta>=0 ? ultimaFatta : prossima>=0 ? prossima
    : Math.max(0,attuale.length-1);
  const riferimento=passate[indice]?.stato==='fatta' ? passate[indice] : null;
  const tuaSerie=attuale[indice]||null;
  // I valori copiati dalla scheda precedente NON rappresentano una serie fatta.
  // Una bozza che l'utente ha cambiato si puo' mostrare come anteprima,
  // ma non incrementa vittorie, record o premi finche' non viene spuntata.
  const bozza=!!tuaSerie && tuaSerie.stato!=='fatta' && bozzaIds.includes(tuaSerie.id);
  const anteprima=bozza && riferimento
    ? sfidaSerie({...tuaSerie,stato:'fatta'},riferimento,{assistito,cardio,zavorri})
    : null;
  const serieStoriche=passate.map((r,i)=>{
    const oggi=attuale[i] || null;
    const risultato=oggi?.stato==='fatta'
      ? sfidaSerie(oggi,r,{assistito,cardio,zavorri}) : null;
    return {
      numero:i+1,
      testo:testoCompattoSerie(r,{assistito,cardio}),
      dettaglio:testoSerie(r,{assistito,cardio}),
      fatta:oggi?.stato==='fatta',
      prossima:i===prossima && oggi?.stato!=='fatta',
      attiva:i===indice,
      risultato,
    };
  });
  const comparate=risultati.vinta+risultati.persa+risultati.pari;
  const stato=comparate===0 ? 'inizia' : risultati.vinta>risultati.persa ? 'vinci'
    : risultati.vinta<risultati.persa ? 'insegui' : 'pari';
  return {
    disponibile:true, data:ultimo.data, sedutaId:ultimo.id, risultati, serieStoriche,
    comparate, completate:complete.length, totale:attuale.length,
    stato,
    statoVisuale:bozza?'bozza':stato,
    bozza, anteprima,
    oggi: tuaSerie && (tuaSerie.stato==='fatta' || bozza)
      ? testoSerie(tuaSerie,{assistito,cardio}) : '— Da segnare',
    ghost:testoSerie(riferimento,{assistito,cardio}),
    indice:indice+1,
    prossimaSerie:prossima>=0 && prossima!==indice ? prossima+1 : null,
    etichetta:bozza ? (
      anteprima==='vinta'?'Bozza migliore · da completare':
      anteprima==='persa'?'Bozza sotto al Ghost · da completare':
      anteprima==='pari'?'Bozza pari · da completare':
      'Bozza da completare'
    ) : stato==='vinci'?'Sei avanti sul Ghost':stato==='insegui'?'Il Ghost è avanti':
      stato==='pari'?'Sfida in parità':'Il tuo avversario è pronto',
    messaggioBozza: !bozza ? '' :
      anteprima==='vinta'?'Bozza: se completi così, superi il Ghost':
      anteprima==='persa'?'Bozza: il Ghost farebbe meglio':
      anteprima==='pari'?'Bozza: stesso risultato del Ghost':
      anteprima==='mista'?'Bozza: più kg ma meno rip, o viceversa':
      'Bozza: confronto non disponibile',
  };
}
