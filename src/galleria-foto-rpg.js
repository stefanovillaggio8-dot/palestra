// Galleria v352: stessi 9 temi e la stessa cornice per le tre classi.
// Sono foto già presenti nel repository. Non attribuire uno sblocco al visitatore.
export const CLASSI_GALLERIA=Object.freeze(['guerriero','assassino','berserker']);
export const NOMI_GALLERIA=Object.freeze({guerriero:'Guerriero',assassino:'Assassino',berserker:'Berserker'});
export const EFFETTI_GALLERIA=Object.freeze([
 {id:'base',nome:'Base',tipo:'Personaggio'},
 {id:'ambra',nome:'Scintille d’ambra',tipo:'Effetto'},
 {id:'fulmine',nome:'Scarica viola',tipo:'Effetto'},
 {id:'ombra',nome:'Fumo d’ombra',tipo:'Effetto'},
 {id:'nebula',nome:'Nebulosa cosmica',tipo:'Effetto'},
 {id:'armatura',nome:'Armatura leggendaria',tipo:'Armatura'},
 {id:'divina',nome:'Aura divina',tipo:'Ricompensa Streak'},
 {id:'astrale',nome:'Astrale · forma mitica',tipo:'Skin'},
 {id:'corona',nome:'Corona dell’Infinito',tipo:'Ricompensa Streak'},
]);
const ARMATURE=Object.freeze({
 assassino:{name:'Spettro Cremisi',file:'assassino-spettro'},
 guerriero:{name:'Re dell’Abisso',file:'guerriero-abisso'},
 berserker:{name:'Ultimo Giorno',file:'berserker-apocalisse'}
});
export function fotoGalleriaRpg(classe,id){
 if(!CLASSI_GALLERIA.includes(classe))return null;
 const scene='img/personaggi/scene/'+classe+'-';
 if(id==='base')return scene+'base.webp';
 if(id==='ambra'||id==='fulmine'||id==='astrale')
   return 'img/personaggi/effetti/'+classe+'-'+id+'.webp';
 if(id==='ombra')return scene+'base-fumo.webp';
 if(id==='nebula')return 'img/personaggi/combinazioni/'+classe+'/stato-0/nebula.webp';
 if(id==='armatura')return 'img/personaggi/armature/'+ARMATURE[classe].file+'.webp';
 if(id==='divina')return classe==='assassino'
   ? scene+'divina.webp' : scene+'epica-divina-corona-fumo.webp';
 if(id==='corona')return scene+'base-corona.webp';
 return null;
}
export function nomeGalleriaRpg(classe,id){
 return id==='armatura'?ARMATURE[classe]?.name:
   EFFETTI_GALLERIA.find(x=>x.id===id)?.nome||null;
}
export function notaGalleriaRpg(classe,id){
 if(id==='divina'&&classe!=='assassino')
   return 'Foto combinata dimostrativa con armatura, Fumo, Corona e Aura divina.';
 if(id==='corona')return 'Ricompensa gratuita al record di 80 giorni; nessuno sblocco in anticipo.';
 if(id==='divina')return 'Ricompensa gratuita al record di 75 giorni; nessuno sblocco in anticipo.';
 return 'Anteprima estetica: nessun oggetto viene equipaggiato o acquistato.';
}
function init(){
 const grid=document.getElementById('foto');
 const tabs=document.getElementById('classi');
 const msg=document.getElementById('avviso-classe');
 const modal=document.getElementById('ingrandisci');
 const big=document.getElementById('grande');
 const title=document.getElementById('nome-foto');
 const info=document.getElementById('nota-foto');
 if(!grid||!tabs||!modal)return;
 const q=new URLSearchParams(location.search);
 let classe=CLASSI_GALLERIA.includes(q.get('classe'))?q.get('classe'):'assassino';
 document.getElementById('chiudi').addEventListener('click',()=>modal.close());
 modal.addEventListener('click',ev=>{if(ev.target===modal)modal.close()});
 for(const id of CLASSI_GALLERIA){
  const button=document.createElement('button');
  button.type='button';button.textContent=NOMI_GALLERIA[id];button.dataset.classe=id;
  button.addEventListener('click',()=>{classe=id;render();history.replaceState(null,'','?classe='+id)});
  tabs.append(button);
 }
 function render(){
  for(const button of tabs.children)button.setAttribute('aria-pressed',String(button.dataset.classe===classe));
  msg.textContent='Le immagini mantengono la stessa proporzione 3:4. Gli effetti hanno lo stesso nome e ordine per tutte le classi.';
  grid.replaceChildren();
  for(const eff of EFFETTI_GALLERIA){
   const button=document.createElement('button');
   button.className='gallery-item';button.type='button';
   button.setAttribute('aria-label','Ingrandisci '+nomeGalleriaRpg(classe,eff.id)+' · '+NOMI_GALLERIA[classe]);
   const wrap=document.createElement('span');wrap.className='gallery-photo';
   const img=document.createElement('img');img.src='./'+fotoGalleriaRpg(classe,eff.id);
   img.alt=NOMI_GALLERIA[classe]+' · '+nomeGalleriaRpg(classe,eff.id);
   img.loading='lazy';img.decoding='async';
   let fallback=false;
   img.addEventListener('error',()=>{
    if(fallback)return;fallback=true;
    img.src='./img/personaggi/stati/'+classe+'-0.webp';
   });
   wrap.append(img);
   const label=document.createElement('span');label.className='gallery-name';label.textContent=nomeGalleriaRpg(classe,eff.id);
   const type=document.createElement('span');type.className='gallery-category';type.textContent=eff.tipo;
   button.append(wrap,label,type);
   button.addEventListener('click',()=>{
    big.src=img.currentSrc||img.src;big.alt=img.alt;
    title.textContent=nomeGalleriaRpg(classe,eff.id);
    info.textContent=notaGalleriaRpg(classe,eff.id);
    modal.showModal();
   });
   grid.append(button);
  }
 }
 render();
}
if(typeof document!=='undefined')init();
