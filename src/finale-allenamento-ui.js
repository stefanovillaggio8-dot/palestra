import {el,bottone} from './ui.js';
import {messaggioFinaleAllenamento} from './finale-allenamento.js';
// Overlay a durata libera: chiudibile, accessibile e senza premi artificiali.
export function mostraFinaleCinematico(dati,{foto=null}={}) {
  const aperto=document.querySelector('.finale-cine-overlay');
  if(aperto) aperto.remove();
  const precedente=document.activeElement;
  const overlay=el('div',{class:'finale-cine-overlay',role:'dialog',
    'aria-modal':'true','aria-label':'Allenamento completato'});
  const chiudi=()=>{
    overlay.remove();
    document.removeEventListener('keydown',onTasto);
    if(precedente && precedente.isConnected && precedente.focus) precedente.focus();
  };
  const onTasto=e=>{if(e.key==='Escape')chiudi();};
  document.addEventListener('keydown',onTasto);
  overlay.addEventListener('click',e=>{if(e.target===overlay)chiudi();});
  const stella=el('div',{class:'finale-cine-simbolo','aria-hidden':'true',testo:'✦'});
  const immagine=foto?el('img',{class:'finale-cine-personaggio',src:foto,alt:'Il tuo personaggio RPG'}):stella;
  if(foto)immagine.addEventListener('error',()=>{
    if(immagine.isConnected) immagine.replaceWith(stella);
  });
  const dettagli=el('div',{class:'finale-cine-numeri'},[
    el('div',{},[el('strong',{testo:String(dati.serie)}),el('span',{testo:'Serie completate'})]),
    el('div',{},[el('strong',{testo:String(dati.esercizi)}),el('span',{testo:'Esercizi'})]),
    el('div',{},[el('strong',{testo:dati.minuti+' min'}),el('span',{testo:'Durata'})]),
  ]);
  const avanzamenti=[];
  if(dati.rank)avanzamenti.push(dati.rank+' nuovi rank');
  if(dati.record)avanzamenti.push(dati.record+' record personali');
  if(dati.primi)avanzamenti.push(dati.primi+' primi livelli');
  const inner=el('section',{class:'finale-cine-card'},[
    el('div',{class:'finale-cine-sovratitolo',testo:'MISSIONE COMPIUTA'}),
    immagine,
    el('h2',{testo:'Allenamento completato'}),
    el('p',{class:'finale-cine-giorno',testo:dati.nome}),
    el('p',{class:'finale-cine-messaggio',testo:messaggioFinaleAllenamento(dati)}),
    dettagli,
    avanzamenti.length?el('p',{class:'finale-cine-record',testo:'🏆 '+avanzamenti.join(' · ')}):null,
    el('div',{class:'finale-cine-premi'},[
      el('span',{testo:'✦ +'+dati.aura.toLocaleString('it-IT')+' Aura'}),
      el('span',{testo:'★ +'+dati.xp.toLocaleString('it-IT')+' XP'}),
    ]),
    bottone('Continua nello Storico',{onClick:chiudi,classe:'principale grande'}),
    bottone('Salta',{onClick:chiudi,classe:'fantasma piccolo-b'}),
  ]);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);
  const prima=inner.querySelector('button');
  if(prima?.focus)prima.focus();
  return {chiudi,overlay};
}
