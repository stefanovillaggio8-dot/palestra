// Cronologia dei cambiamenti: gli eventi vivono nella tabella note gia'
// sincronizzata. Non vengono inserite nuove tabelle o colonne server.
export const LIVELLO_CRONOLOGIA = 'cronologia_app';
export function nuovaVoceCronologia({id, account, tipo, titolo, dettaglio='', serieId=null,
  prima=null, dopo=null, sedute=[], serie=[], ricompense=[], quando=new Date().toISOString()}={}) {
  if (!id || !account || !tipo || !titolo) throw new Error('Evento incompleto');
  const evento = {
    versione:1, account, tipo, titolo:String(titolo).slice(0,150),
    dettaglio:String(dettaglio).slice(0,280), quando,
    serieId, prima, dopo, sedute, serie, ricompense, annullato:false,
  };
  return { id:'cronologia-v400:'+encodeURIComponent(String(account))+':'+String(id),
    livello:LIVELLO_CRONOLOGIA, testo:JSON.stringify(evento) };
}
export function eventoDaNota(nota, account) {
  if (!nota || nota.eliminata || nota.livello!==LIVELLO_CRONOLOGIA || !nota.testo) return null;
  try {
    const e=JSON.parse(nota.testo);
    if (!e || e.versione!==1 || e.account!==account || !e.tipo || !e.quando) return null;
    return { ...e, id:nota.id };
  } catch { return null; }
}
export function storicoCronologia(note,account) {
  return (note||[]).map(n=>eventoDaNota(n,account)).filter(Boolean)
    .sort((a,b)=>String(b.quando).localeCompare(String(a.quando))).slice(0,150);
}
export function variazioniSerie(prima,dopo,campi) {
  if (!prima || !dopo || !campi) return null;
  const vecchio={}, nuovo={};
  for (const chiave of Object.keys(campi)) {
    if (!/^(peso|peso_assistenza|ripetizioni|peso_corpo|durata_unita|stato|spotter|rip_assistite|dropset|giri_extra|nota)$/.test(chiave)) continue;
    if (JSON.stringify(prima[chiave]??null)===JSON.stringify(dopo[chiave]??null)) continue;
    vecchio[chiave]=prima[chiave]===undefined?null:prima[chiave];
    nuovo[chiave]=dopo[chiave]===undefined?null:dopo[chiave];
  }
  return Object.keys(nuovo).length ? {prima:vecchio,dopo:nuovo} : null;
}
export function modificheAncoraAttuali(record,evento) {
  if (!record || !evento || evento.tipo!=='serie_modificata' || evento.annullato || record.eliminata) return false;
  if (record.id!==evento.serieId || !evento.prima || !evento.dopo) return false;
  return Object.keys(evento.dopo).length>0 && Object.keys(evento.dopo)
    .every(k=>JSON.stringify(record[k]??null)===JSON.stringify(evento.dopo[k]??null));
}
export function annullaVoce(nota,evento) {
  return {
    ...nota, testo:JSON.stringify({...evento,annullato:true}),
    sync:undefined, updated_at:undefined,
  };
}
