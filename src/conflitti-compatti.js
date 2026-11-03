// Presentazione dei conflitti: solo un riepilogo, mai una decisione automatica.
// Il motore di sincronizzazione rimane invariato e conserva entrambe le versioni.
const TIPI = {
  esercizi:'Esercizio', schede:'Scheda', versioni:'Versione della scheda',
  sedute:'Allenamento', serie:'Serie', note:'Nota',
  profili:'Profilo', missioni:'Missione', ricompense:'Ricompensa',
  pesi:'Peso corporeo',
};
const METADATI = new Set([
 'id','account','account_id','owner_id','scheda_id','versione_id','seduta_id','esercizio_id',
 'rev','base_rev','sync','updated_at','created_at','deleted_at','device_id',
 'ultimo_errore','tentativi','in_flight','eliminata_il','_etichetta','_scartato',
 'token','access_token','refresh_token','password','email','anon_key','chiave',
]);
const NOMI = {
  peso:'Peso (kg)',peso_assistenza:'Assistenza (kg)',ripetizioni:'Ripetizioni',
  rip_assistite:'Ripetizioni assistite',nota:'Nota',note:'Note',nome:'Nome',
  stato:'Stato',ordine:'Numero della serie',spotter:'Spotter',dropset:'Dropset',
  giri_extra:'Giri dropset',data:'Data',ora_inizio:'Inizio',ora_fine:'Fine',
  durata_unita:'Unità di durata',peso_corpo:'Peso corporeo',
  snapshot:'Scheda e giorni',username:'Nome profilo',convenzione:'Tipo di carico',
  versione_corrente:'Versione corrente',privacy:'Privacy',amici:'Amici',
};

export function nomeTipoConflitto(tabella) {
  return TIPI[String(tabella || '')] || 'Elemento';
}
export function campoPresentabile(chiave) {
  const k=String(chiave || '');
  return k && !k.startsWith('_') && !METADATI.has(k)
    && !/(password|token|secret|credential|auth|session|jwt|_id$|^id$|email|chiave)/i.test(k);
}

function stabilizza(v) {
  if (v === undefined) return 'vuoto';
  if (v === null) return 'vuoto';
  if (typeof v === 'object') {
    try{return JSON.stringify(v);}catch{return '[dati complessi]';}
  }
  return String(v);
}

export function differenzeConflitto(conflitto) {
 const a=conflitto?.locale || {},b=conflitto?.remoto || {};
 const keys=new Set([...Object.keys(a),...Object.keys(b)]);
 return [...keys].filter(campoPresentabile)
   .filter(k=>stabilizza(a[k])!==stabilizza(b[k]))
   .sort((a,b)=>a.localeCompare(b,'it'));
}

export function descriviConflitto(conflitto) {
 const nome=nomeTipoConflitto(conflitto?.tabella);
 const campi=differenzeConflitto(conflitto);
 return {
  titolo:nome+' · '+(campi.length===1?'1 differenza':campi.length+' differenze'),
  sintesi:campi.length
    ? 'Cambia: '+campi.slice(0,3).map(k=>NOMI[k]||k.replaceAll('_',' ')).join(', ')
      +(campi.length>3?' e altri':'')
    : 'Le due copie sembrano uguali: puoi controllarle prima di scegliere',
  campi,
 };
}
export function nomeCampoConflitto(k) {return NOMI[k]||String(k).replaceAll('_',' ');}

export function valoreConflitto(v) {
 if(v===undefined||v===null||v==='') return '—';
 if(typeof v==='boolean') return v?'Sì':'No';
 if(typeof v==='number') return Number.isFinite(v)?String(v).replace('.',','):'—';
 if(Array.isArray(v)) return v.length+' elementi';
 if(typeof v==='object') return Object.keys(v).length+' dettagli';
 return String(v).slice(0,140);
}
