// Dialogo accessibile e non invasivo per dettare UNA sola serie.
// Non registra audio né salva trascrizioni. La conferma è obbligatoria.
import { analizzaComandoVocale, supportoComandiVocali, normalizzaDettaturaSerie, scegliTrascrizioneVocale } from './comandi-vocali.js';
import { el, bottone } from './ui.js';

let modaleAttiva=null;
export function apriModaleComandoVocale({ numero=1, cardio=false, righe, suConferma }={}) {
 if(typeof document==='undefined'||typeof righe!=='function'||typeof suConferma!=='function')return;
 if(modaleAttiva) modaleAttiva();
 let riconoscitore=null, chiuso=false;
 const supporto=supportoComandiVocali(window);
 const stato=el('p',{class:'voce-comando-stato',aria:{live:'polite'},testo:supporto.disponibile
  ? 'Tocca Ascolta e parla chiaramente.'
  : 'Microfono Web non disponibile: usa la dettatura della tastiera iPhone nel campo qui sotto.'});
 const input=el('input',{type:'text',class:'voce-comando-input',autocomplete:'off',
  autocapitalize:'none',spellcheck:'false',
  placeholder:cardio?'Esempio: 30 minuti':'Esempio: seconda serie 25 chili e mezzo 8 rep',
  aria:{label:'Parole riconosciute o scritte'}});
 const preview=el('div',{class:'voce-comando-anteprima',aria:{live:'polite'}});
 function bersaglio(p) {
  const tutte=righe();
  if(p.numeroSerie===null)return tutte.find(x=>Number(x.ordine)===numero)||tutte[numero-1]||null;
  return tutte.find(x=>Number(x.ordine)===p.numeroSerie)||tutte[p.numeroSerie-1]||null;
 }
 function testoAnteprima(p) {
  if(p.tipo==='recupero_avvia') return 'Avvierò il timer di recupero.';
  if(p.tipo==='recupero_stop') return 'Fermerò il timer di recupero.';
  const s=bersaglio(p);
  if(!s)return 'Serie indicata non trovata.';
  const campi=p.campi||{};
  const dati=[];
  if(campi.peso!==undefined)dati.push(campi.peso+' kg');
  if(campi.ripetizioni!==undefined)dati.push(campi.ripetizioni+(cardio?' minuti':' ripetizioni'));
  if(campi.spotter!==undefined)dati.push(campi.spotter?'con spotter':'senza spotter');
  if(campi.rip_assistite!==undefined)dati.push(campi.rip_assistite+' ripetizioni assistite');
  if(p.tipo==='completa_serie')return 'Segnerò come fatta la serie '+s.ordine+
    (dati.length?' · '+dati.join(' · '):'')+'. Partirà il recupero automatico.';
  return 'Serie '+s.ordine+' · '+dati.join(' · ')+' — da confermare';
 }
 let corrente=null;
 const conferma=bottone('Conferma',{classe:'principale voce-conferma',disabilitato:true,
   onClick:async()=>{
     const p=analizzaComandoVocale(input.value,{cardio,maxSerie:righe().length});
     if(!p.ok){stato.textContent=p.messaggio;return;}
     const target=bersaglio(p);
     if(!['recupero_avvia','recupero_stop'].includes(p.tipo)&&!target){
       stato.textContent='Questa serie non esiste.';return;
     }
     conferma.disabled=true;
     try{
       await suConferma(p,target);
       chiudi();
     }catch(e) {
       if(!chiuso) {
         stato.textContent='Non ho salvato: '+String(e?.message||e);
         conferma.disabled=false;
       }
     }
   }});
 const aggiorna=()=>{
   corrente=analizzaComandoVocale(input.value,{cardio,maxSerie:righe().length});
   const valido=corrente.ok&&(['recupero_avvia','recupero_stop'].includes(corrente.tipo)||!!bersaglio(corrente));
   preview.textContent=corrente.ok?testoAnteprima(corrente):corrente.messaggio;
   conferma.disabled=!valido;
 };
 input.addEventListener('input',aggiorna);
 let ascolto=null;
 function chiudi() {
   if(chiuso)return;
   chiuso=true;
   try{riconoscitore?.abort()}catch{}
   sfondo.remove();
   if(modaleAttiva===chiudi)modaleAttiva=null;
 }
 function ascolta() {
   if(!supporto.disponibile||chiuso)return;
   try{
     riconoscitore?.abort();
     const r=new supporto.costruttore();
     riconoscitore=r;
     r.lang='it-IT';r.continuous=false;r.interimResults=false;r.maxAlternatives=5;
     r.onstart=()=>{if(!chiuso){stato.textContent='🎙 Ti ascolto, parla ora.';ascolto.disabled=true;}};
     r.onresult=(event)=>{
       if(chiuso)return;
       const parole=[];
       for(let i=event.resultIndex||0;i<event.results.length;i++) {
         const x=event.results[i];
         if(!x?.isFinal)continue;
         const alternative=[];
         for(let j=0;j<x.length;j++)if(x[j]?.transcript)alternative.push(x[j].transcript);
         const scelta=scegliTrascrizioneVocale(alternative,{cardio,maxSerie:righe().length});
         if(scelta)parole.push(scelta);
       }
       if(parole.length) {
         const trascrizione=parole.join(' ').trim();
         input.value=normalizzaDettaturaSerie(trascrizione,{cardio});
         aggiorna();
         const euroCorretto=!cardio&&/\b\d+\s+eur(?:o|i|os)\b/i.test(trascrizione)&&
           /\bripetizioni\b/.test(input.value);
         stato.textContent=euroCorretto
           ? 'Il microfono ha scritto «euro»: intendevo ripetizioni. Controlla il numero prima di confermare.'
           : 'Ho capito: «'+input.value+'». Controlla prima di confermare.';
       }
     };
     r.onerror=(ev)=>{
       if(chiuso)return;
       const cause={
         'not-allowed':'Microfono bloccato: controlla i permessi di Safari.',
         'service-not-allowed':'Servizio vocale non disponibile in questa modalità.',
         'network':'Servizio vocale non raggiungibile.',
         'audio-capture':'Microfono non disponibile o occupato.',
         'no-speech':'Non ho sentito parole.',
         'language-not-supported':'Riconoscimento italiano non disponibile.',
       };
       if(ev.error!=='aborted')stato.textContent=(cause[ev.error]||'Ascolto non riuscito.')+
         ' Riprova oppure usa la dettatura della tastiera.';
     };
     r.onend=()=>{if(!chiuso)ascolto.disabled=false;};
     r.start();
   }catch(e) {
     stato.textContent='Impossibile avviare il microfono qui. Usa la tastiera e il suo pulsante dettatura.';
     ascolto.disabled=false;
   }
 }
 ascolto=bottone(supporto.disponibile?'🎙 Ascolta':'Microfono Web non disponibile',{
   classe:'fantasma voce-ascolta',disabilitato:!supporto.disponibile,onClick:ascolta,
 });
 const pannello=el('section',{class:'voce-comando-modale',role:'dialog',
   aria:{modal:'true',label:'Comandi vocali per la serie'}},[
   el('div',{class:'voce-comando-titolo'},[
     el('strong',{testo:'🎙 Serie '+numero}),
     bottone('Chiudi',{classe:'fantasma piccolo-b',onClick:chiudi}),
   ]),
   el('p',{class:'voce-comando-esempi',testo:cardio
     ? 'Di’: «30 minuti» oppure «avvia recupero».'
     : 'Di’: «seconda serie, 25 chili e mezzo, 8 rep», «fatta» o «spotter». Segnando la serie parte il recupero.'}),
   ascolto,
   stato,
   input,
   el('small',{class:'voce-comando-privacy',
     testo:'Controlla prima di confermare. Se non funziona, usa il microfono della tastiera. L’app non registra audio.'}),
   preview,conferma,
 ]);
 const sfondo=el('div',{class:'voce-comando-overlay'});
 sfondo.appendChild(pannello);
 sfondo.addEventListener('click',ev=>{if(ev.target===sfondo)chiudi();});
 document.body.appendChild(sfondo);
 modaleAttiva=chiudi;
 // Il primo ascolto parte direttamente dal click sul tasto della serie.
 if(supporto.disponibile)ascolta();
 else input.focus();
 return chiudi;
}
