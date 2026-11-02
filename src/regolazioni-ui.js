import * as db from './db.js';
import {el,bottone,avviso} from './ui.js';
import {CAMPI_REGOLAZIONI,idRegolazioni,leggiRegolazioni,recordRegolazioni} from './regolazioni-macchina.js';
export async function apriRegolazioniMacchina({account,esercizio,onSalvato=()=>{}}={}) {
  if(!account||!esercizio?.id)return;
  const id=idRegolazioni(account,esercizio.id);
  let precedente=null;
  try{precedente=await db.prendi('note',id);}catch(e){
    avviso('Non riesco a leggere le regolazioni: '+e.message,{tipo:'errore'});return;
  }
  const valori=leggiRegolazioni(precedente);
  const prima=document.activeElement;
  const overlay=el('div',{class:'regolazioni-overlay',role:'dialog','aria-modal':'true','aria-label':'Regolazioni macchina'});
  const close=()=>{
    overlay.remove();document.removeEventListener('keydown',escape);
    if(prima?.isConnected&&prima.focus)prima.focus();
  };
  const escape=e=>{if(e.key==='Escape')close();};
  document.addEventListener('keydown',escape);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  const box=el('div',{class:'regolazioni-modal'});
  box.appendChild(el('h2',{testo:'Regolazioni personali'}));
  box.appendChild(el('p',{class:'nota',testo:esercizio.nome+' · Salva come regoli la macchina. I kg e il Rank non cambiano.'}));
  const inputs={};
  for(const f of CAMPI_REGOLAZIONI) {
    const idCampo='reg-'+f.id;
    const campo=el(f.id==='altro'?'textarea':'input',{
      id:idCampo,class:'regolazioni-input',
      ...(f.id==='altro'?{rows:2}:{type:'text'}),
      maxlength:'280',placeholder:f.esempio,'aria-label':f.nome,
    });
    campo.value=valori[f.id];
    inputs[f.id]=campo;
    box.appendChild(el('label',{class:'regolazioni-campo',for:idCampo},[
      el('span',{testo:f.nome}),campo,
    ]));
  }
  const salva=bottone('Salva regolazioni',{classe:'principale'});
  salva.addEventListener('click',async()=>{
    if(salva.disabled)return;
    salva.disabled=true;
    try {
      const dati=Object.fromEntries(CAMPI_REGOLAZIONI.map(f=>[f.id,inputs[f.id].value]));
      const r=await db.salva('note',{...(precedente||{}),...recordRegolazioni(account,esercizio.id,dati)});
      close();
      onSalvato(r);
      avviso('Regolazioni salvate per '+esercizio.nome+'.',{tipo:'ok'});
    }catch(e){salva.disabled=false;avviso('Non ho potuto salvare le regolazioni: '+e.message,{tipo:'errore'});}
  });
  box.appendChild(el('div',{class:'regolazioni-azioni'},[
    bottone('Annulla',{onClick:close,classe:'fantasma'}),salva,
  ]));
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  inputs.macchina?.focus();
  return overlay;
}
