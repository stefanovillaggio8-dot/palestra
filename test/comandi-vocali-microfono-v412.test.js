import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montaDom, perClasse, pulsante } from './dom-minimo.js';
import { apriModaleComandoVocale } from '../src/comandi-vocali-ui.js';

test('voce v412: il microfono si ferma alla chiusura, cambio scheda e pagina nascosta',async()=>{
 montaDom();
 const documentEvents=new Map();
 document.addEventListener=(name,fn)=>{
  if(!documentEvents.has(name))documentEvents.set(name,new Set());
  documentEvents.get(name).add(fn);
 };
 document.removeEventListener=(name,fn)=>documentEvents.get(name)?.delete(fn);
 const microfoni=[];
 class FintoRiconoscimento {
  constructor(){this.startCount=0;this.abortCount=0;microfoni.push(this);}
  start(){this.startCount++;this.onstart?.();}
  abort(){this.abortCount++;}
  stop(){this.abortCount++;}
 }
 window.webkitSpeechRecognition=FintoRiconoscimento;
 const apri=(suConferma=async()=>{})=>apriModaleComandoVocale({
  numero:1,righe:()=>[{id:'serie-1',ordine:1}],suConferma
 });
 // Il bottone Chiudi deve togliere immediatamente il microfono.
 const chiudiUno=apri();
 let r=microfoni.at(-1);
 const risultatoTardivo=r.onresult;
 assert.equal(r.startCount,1);
 const campo=perClasse(document.body,'voce-comando-input')[0];
 await pulsante(document.body,'Chiudi').click();
 assert.equal(r.abortCount,1);
 assert.equal(perClasse(document.body,'voce-comando-overlay').length,0);
 risultatoTardivo?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'7 rep'},length:1}]});
 assert.equal(campo.value,'','nessun testo deve comparire dopo la chiusura');
 chiudiUno();
 assert.equal(r.abortCount,1,'chiudi ripetuto non deve attivare altri stop');

 // Quando la tab viene nascosta, bisogna chiudere senza aspettare il risultato.
 apri();
 r=microfoni.at(-1);
 document.visibilityState='hidden';
 for(const fn of [...(documentEvents.get('visibilitychange')||[])])fn();
 assert.equal(r.abortCount,1);
 assert.equal(perClasse(document.body,'voce-comando-overlay').length,0);
 assert.equal(documentEvents.get('visibilitychange')?.size,0);
 document.visibilityState='visible';

 // Quando Safari manda la pagina in background, pagehide interrompe l'ascolto.
 apri();
 r=microfoni.at(-1);
 window.dispatch('pagehide');
 assert.equal(r.abortCount,1);
 assert.equal(perClasse(document.body,'voce-comando-overlay').length,0);

 // La navigazione interna a un'altra pagina deve chiudere anche il pannello.
 apri();
 r=microfoni.at(-1);
 window.dispatch('hashchange');
 assert.equal(r.abortCount,1);

 // Se si conferma mentre il microfono e' ancora attivo, termina PRIMA del DB.
 let completa;
 const attesa=new Promise(resolve=>{completa=resolve;});
 apri(()=>attesa);
 r=microfoni.at(-1);
 const input=perClasse(document.body,'voce-comando-input')[0];
 input.value='7 ripetizioni';
 await input.dispatch('input');
 const invio=pulsante(document.body,'Conferma').click();
 assert.equal(r.abortCount,1,'la conferma interrompe subito l ascolto');
 completa();
 await invio;
 assert.equal(perClasse(document.body,'voce-comando-overlay').length,0);
});
