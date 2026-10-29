// v335 - atelier di combinazioni non distruttivo.
// Immagini: sempre il ritratto originale dello stato Streak selezionato.
// Il dialogo non salva sul profilo, non compra nulla e non modifica la Streak.
import { CLASSI_ATELIER, ARMATURE_ATELIER, EFFETTI_ATELIER,
  STADI_ATELIER, NUMERO_COMBINAZIONI_ATELIER, opzioniAtelier, salvaFotoAtelier } from './rpg-atelier.js';
const CLASSI={guerriero:'Guerriero',assassino:'Assassino',berserker:'Berserker'};
const STATI=['Senza armatura','Bracciali','Corazza','Armatura','Arma','Completo'];
export function apriAtelierRpg({profilo,st,oggetto=null,stadioAttuale=0,renderPersonaggio,oggetti=[]}) {
  if(typeof document==='undefined'||typeof renderPersonaggio!=='function')return null;
  const iniziale=CLASSI_ATELIER.includes(profilo?.classe_rpg)?profilo.classe_rpg:'guerriero';
  const baseEq=profilo?.equipaggiamento_aura||{};
  const titoloCorrente=oggetto?.tipo==='Titolo'?oggetto.id:baseEq.Titolo||'';
  let cfg=opzioniAtelier({
    classe:oggetto?.classe||iniziale,stadio:stadioAttuale,
    armatura:oggetto?.tipo==='Armatura'?oggetto.id:baseEq.Armatura,
    skin:oggetto?.tipo==='Skin'?oggetto.id:baseEq.Skin,
    effetto:oggetto?.tipo==='Effetto'?oggetto.id:baseEq.Effetto,
    divina:false,corona:false,
  });
  let titolo=titoloCorrente;
  const overlay=document.createElement('div');overlay.className='aura-preview-overlay rpg-atelier-overlay';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','Atelier fotografico RPG');
  const panel=document.createElement('section');panel.className='aura-preview-panel rpg-atelier-panel';
  const precedente=document.activeElement;
  const make=(tag,cls,text)=>{
    const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;
    return e;
  };
  const close=()=>{overlay.remove();document.removeEventListener('keydown',keys);precedente?.focus?.();};
  const keys=e=>{
    if(e.key==='Escape')close();
    if(e.key==='Tab'){
      const focusable=[...overlay.querySelectorAll('button:not(:disabled), select:not(:disabled)')];
      if(focusable.length){
        if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus();}
        if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus();}
      }
    }
  };
  const head=make('div','aura-preview-heading');
  const title=make('div');
  title.append(make('span','aura-shop-kicker','ATELIER · '+NUMERO_COMBINAZIONI_ATELIER.toLocaleString('it-IT')+' FOTO'),
    make('h2','', 'Combina ogni oggetto'));
  const x=make('button','fantasma aura-preview-close','✕');x.type='button';
  x.setAttribute('aria-label','Chiudi Atelier');x.addEventListener('click',close);
  head.append(title,x);
  const intro=make('p','nota rpg-atelier-nota',
    'Anteprime di fantasia: le foto originali, il volto e la corporatura restano identici. Gli oggetti bloccati sono solo simulati; nessun acquisto o premio viene sbloccato.');
  const layout=make('div','rpg-atelier-layout');
  const tools=make('div','rpg-atelier-tools');
  const stage=make('div','rpg-atelier-stage');
  const feedback=make('p','nota rpg-atelier-feedback','Scegli la combinazione e salva la foto PNG.');
  const actions=make('div','rpg-atelier-actions');
  let avatar=null;
  const optionsFor=key=>{
    switch(key){
      case 'classe':return CLASSI_ATELIER.map(id=>[id,CLASSI[id]]);
      case 'stadio':return Array.from({length:STADI_ATELIER},(_,i)=>[String(i),STATI[i]]);
      case 'armatura':return ARMATURE_ATELIER[cfg.classe].map(id=>[id,oggetti.find(o=>o.id===id)?.nome||'Senza armatura shop']);
      case 'skin':return [['','Nessuna skin'],['skin-mitica','Astrale · forma mitica']];
      case 'effetto':return EFFETTI_ATELIER.map(id=>[id,oggetti.find(o=>o.id===id)?.nome||'Nessun effetto']);
      case 'divina':return [['false','Senza Aura divina'],['true','Aura divina (75 giorni)']];
      case 'corona':return [['false','Senza Corona'],['true','Corona dell’Infinito (80 giorni)']];
      case 'titolo':return [['','Senza titolo'],...oggetti.filter(o=>o.tipo==='Titolo').map(o=>[o.id,o.nome])];
      default:return [];
    }
  };
  function render() {
    cfg=opzioniAtelier(cfg);
    tools.replaceChildren();
    for(const [key,label] of [['classe','Classe'],['stadio','Foto progressione Streak'],
      ['armatura','Armatura shop'],['skin','Skin'],['effetto','Effetto acquistabile'],
      ['divina','Aura divina'],['corona','Corona'],['titolo','Titolo']]) {
      const wrapper=make('label','rpg-atelier-field');
      const caption=make('span','rpg-atelier-field-label',label);
      const select=make('select','rpg-atelier-select');
      const value=key==='titolo'?titolo:key==='stadio'?String(cfg.stadio):
        (key==='divina'||key==='corona')?String(cfg[key]):cfg[key];
      for(const [id,nome] of optionsFor(key)){
        const opt=make('option','',nome);opt.value=id;select.append(opt);
      }
      select.value=value;
      select.addEventListener('change',()=>{
        if(key==='titolo')titolo=select.value;
        else if(key==='stadio')cfg.stadio=Number(select.value);
        else if(key==='divina'||key==='corona')cfg[key]=select.value==='true';
        else cfg[key]=select.value;
        if(key==='classe')cfg.armatura='';
        render();
      });
      wrapper.append(caption,select);tools.append(wrapper);
    }
    const profile={
      ...profilo,classe_rpg:cfg.classe,
      __anteprimaStato:cfg.stadio,
      __anteprimaDivina:cfg.divina,
      __anteprimaCorona:cfg.corona,
      equipaggiamento_aura:{
        ...baseEq,Armatura:cfg.armatura||null,Skin:cfg.skin||null,
        Effetto:cfg.effetto||null,Titolo:titolo||null,
        Corona:cfg.corona?'corona-infinito':'nessuna',
      },
    };
    const card=renderPersonaggio(profile,st);
    card.classList.add('aura-preview-character','rpg-atelier-avatar');
    for(const child of card.querySelectorAll('.riga-pezzi, .personaggio-equipaggiamento, button'))child.remove();
    stage.replaceChildren(card);
    avatar=card.querySelector('.personaggio-scena-grafica');
    feedback.textContent='Anteprima '+CLASSI[cfg.classe]+' · foto '+(cfg.stadio+1)+'/6 · '+
      (cfg.effetto?oggetti.find(o=>o.id===cfg.effetto)?.nome:'senza effetto')+
      '. Le ricompense non sono state equipaggiate.';
  }
  const download=make('button','principale rpg-atelier-download','Salva questa foto PNG');
  download.type='button';download.addEventListener('click',async()=>{
    download.disabled=true;
    try{
      const nome=await salvaFotoAtelier(avatar,{...cfg,titolo});
      feedback.textContent='Foto generata: '+nome+'. Il tuo profilo è rimasto invariato.';
    }catch(err){feedback.textContent='Non sono riuscito a salvare la foto. Attendi il caricamento del personaggio e riprova.';}
    finally{download.disabled=false;}
  });
  const closeBottom=make('button','fantasma','Chiudi');closeBottom.type='button';
  closeBottom.addEventListener('click',close);
  actions.append(download,closeBottom);
  layout.append(tools,stage);
  panel.append(head,intro,layout,feedback,actions);overlay.append(panel);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  document.addEventListener('keydown',keys);document.body.append(overlay);
  render();x.focus();return overlay;
}
