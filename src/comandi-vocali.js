// Comandi vocali italiani per una singola serie della Palestra.
// Il riconoscimento si avvia SOLO con un gesto e il testo riconosciuto non
// viene mai salvato da questo modulo. L'utente deve confermare il risultato.
const UNIT_PESO = '(?:kg|kili|chili|chilo|chilogrammi|chilogrammo|kilo|kilos|peso|zavorra|zavorre|assistenza)';
const UNIT_RIP = '(?:ripetizioni|ripetizione|rip|reps|rep|ripetute)';
const UNIT_MIN = '(?:minuti|minuto|min)';
const parole = [
 'zero','uno','due','tre','quattro','cinque','sei','sette','otto','nove',
 'dieci','undici','dodici','tredici','quattordici','quindici','sedici','diciassette',
 'diciotto','diciannove'
];
const decine = ['','','venti','trenta','quaranta','cinquanta','sessanta','settanta','ottanta','novanta'];
const NUMERI = new Map(parole.map((v,i)=>[v,i]));
NUMERI.set('una',1);
NUMERI.set('un',1);
for(let d=2;d<=9;d++) for(let u=0;u<=9;u++) {
 const base=decine[d];
 const stem=u===1||u===8?base.slice(0,-1):base;
 const nome=stem+(u===0?'':parole[u]);
 NUMERI.set(nome,d*10+u);
 if(u===0) NUMERI.set(base,d*10);
}
NUMERI.set('cento',100);
NUMERI.set('centouno',101);
NUMERI.set('centotto',108);
NUMERI.set('centodieci',110);
NUMERI.set('centoventi',120);
NUMERI.set('centocinquanta',150);
NUMERI.set('duecento',200);
NUMERI.set('trecento',300);
NUMERI.set('quattrocento',400);
NUMERI.set('cinquecento',500);

function convertiNumeri(testo) {
 const t=String(testo||'').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[×]/g,' per ').replace(/(\d)\s*,\s*(\d)/g,'$1.$2')
  .replace(/[;,!?]/g,' ').replace(/\s+/g,' ').trim();
 const parts=t.replace(/\b(\d+)\s*,\s*(\d+)\b/g,'$1.$2').split(' ').map(w=>{
   const p=w.replace(/[.:]$/,'');
   return NUMERI.has(p)?String(NUMERI.get(p)):w;
 });
 let normalizzato=parts.join(' ');
 // "venti due" e "trenta cinque" dettati come due parole.
 normalizzato=normalizzato.replace(/\b(20|30|40|50|60|70|80|90)\s+([1-9])\b/g,
  (_m,d,u)=>String(Number(d)+Number(u)));
 return normalizzato
  .replace(/\b(\d+)\s+(?:virgola|punto)\s+(\d+)\b/g,(_m,a,b)=>a+'.'+b)
  .replace(/\b(\d+)\s+e\s+mezzo\b/g,(_m,a)=>String(Number(a)+0.5))
  .replace(/\s+/g,' ').trim();
}
function trovaUnita(testo,unita) {
 const n='(\\d+(?:\\.\\d+)?)';
 const prima=new RegExp('\\b'+n+'\\s*'+unita+'\\b','g');
 const dopo=new RegExp('\\b'+unita+'\\s*(?:di\\s*)?'+n+'\\b','g');
 // In "22 chili 7 ripetizioni", "chili 7" NON significa 7 chili.
 // Un'unita' seguita da un numero vale come "peso 22" soltanto quando
 // non segue gia' un numero della misura precedente.
 const qualunqueUnita=/(?:kg|kili|chili|chilo|chilogrammi|chilogrammo|kilo|kilos|peso|zavorra|zavorre|assistenza|ripetizioni|ripetizione|rip|reps|rep|ripetute|minuti|minuto|min)$/;
 const primaValidi=[...testo.matchAll(prima)].filter(m=>{
   const prefisso=testo.slice(0,m.index).trim();
   const unitaPrecedente=prefisso.match(qualunqueUnita);
   if(!unitaPrecedente)return true;
   return /\d(?:\.\d+)?\s*$/.test(prefisso.slice(0,unitaPrecedente.index));
 });
 const dopoValidi=[...testo.matchAll(dopo)].filter(m=>{
   const prefisso=testo.slice(0,m.index).trim();
   const ultimoNumero=prefisso.match(/\d+(?:\.\d+)?$/);
   if(!ultimoNumero)return true;
   return qualunqueUnita.test(prefisso.slice(0,ultimoNumero.index).trim());
 });
 const trovato=[...primaValidi,...dopoValidi].map(m=>Number(m[1]));
 const diversi=[...new Set(trovato)];
 if(diversi.length>1) return {errore:'Hai indicato valori diversi per lo stesso campo.'};
 return {valore:diversi.length===1?diversi[0]:null};
}

export function analizzaComandoVocale(testo,{cardio=false,maxSerie=0}={}) {
 const normalizzato=convertiNumeri(testo);
 if(!normalizzato) return {ok:false,messaggio:'Non ho sentito parole. Riprova.'};
 const serie=normalizzato.match(/\b(?:serie|set)\s*(\d+)\b/);
 const numeroSerie=serie?Number(serie[1]):null;
 if(numeroSerie!==null && (!Number.isInteger(numeroSerie)||numeroSerie<1||
      (maxSerie>0&&numeroSerie>maxSerie))) {
   return {ok:false,messaggio:'Questa serie non è presente nella seduta.'};
 }
 const base={ok:true,testo:normalizzato,numeroSerie};
 if(/\b(?:ferma|fermare|stop|interrompi|azzera)\b.*\brecupero\b/.test(normalizzato))
  return {...base,tipo:'recupero_stop'};
 if(/\b(?:avvia|inizia|parti|fai partire)\b.*\brecupero\b/.test(normalizzato))
  return {...base,tipo:'recupero_avvia'};
 if(/\b(?:segna|completa|spunta|conferma)\b.*\b(?:serie|fatta|fatto)\b/.test(normalizzato))
  return {...base,tipo:'completa_serie'};
 const peso=trovaUnita(normalizzato,UNIT_PESO);
 const rip=trovaUnita(normalizzato,cardio?UNIT_MIN:UNIT_RIP);
 if(peso.errore||rip.errore)return {ok:false,messaggio:peso.errore||rip.errore};
 if(cardio&&peso.valore!==null) return {ok:false,messaggio:'Nel cardio indica soltanto i minuti.'};
 if(peso.valore===null&&rip.valore===null) return {ok:false,messaggio:cardio
    ? 'Prova: «30 minuti» oppure «avvia recupero».'
    : 'Prova: «22 chili 7 ripetizioni» oppure «avvia recupero».'};
 if(peso.valore!==null && (!Number.isFinite(peso.valore)||peso.valore<0||peso.valore>600))
  return {ok:false,messaggio:'Controlla il carico riconosciuto.'};
 if(rip.valore!==null && (!Number.isFinite(rip.valore)||rip.valore<0||
    rip.valore>(cardio?600:200)))return {ok:false,messaggio:'Controlla il numero riconosciuto.'};
 return {...base,tipo:'dati',
   campi:{...(peso.valore!==null?{peso:peso.valore}:{}),
          ...(rip.valore!==null?{ripetizioni:rip.valore}:{})}};
}

export function supportoComandiVocali(ambiente=typeof window!=='undefined'?window:{}) {
 const ctor=ambiente?.SpeechRecognition||ambiente?.webkitSpeechRecognition;
 return {disponibile:typeof ctor==='function', costruttore:typeof ctor==='function'?ctor:null};
}
