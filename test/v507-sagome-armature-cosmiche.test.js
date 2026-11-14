import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {CONTORNI_ARMATURE_COSMICHE_RPG,INCAVI_GAMBE_ARMATURE_RPG,STIVALI_SPETTRO_COSMICI_RPG,idContornoArmaturaCosmicaRpg,
  mascheraArmaturaCosmicaRpg,applicaMascheraCosmicaRpg,disegnaFotografiaFusaRpg}
  from '../src/rpg-scena-cosmica.js';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const armature=[['assassino','notte'],['assassino','spettro'],
  ['guerriero','braci'],['guerriero','abisso'],
  ['berserker','rabbia'],['berserker','apocalisse']];

test('v507: tutte le armature comprabili hanno una sagoma specifica e non un rettangolo',()=>{
  assert.equal(Object.keys(CONTORNI_ARMATURE_COSMICHE_RPG).length,6);
  for(const [classe,nome] of armature){
    const id=classe+'-'+nome,righe=CONTORNI_ARMATURE_COSMICHE_RPG[id];
    assert.ok(righe.length>=20,id+' troppo impreciso');
    assert.ok(righe[0][0]>.005 && righe.at(-1)[0]<.995);
    for(let i=0;i<righe.length;i++){
      const [y,l,r]=righe[i];
      assert.ok(y>0&&y<1&&l>=0&&r<=1&&l<=r,id+' fascia '+i);
      if(i)assert.ok(y>righe[i-1][0],id+' y non ordinata');
    }
    assert.ok(righe.some(([,l])=>l<.3),id+' mantello/scudo tagliato a sinistra');
    assert.ok(righe.some(([, ,r])=>r>.7),id+' mantello/scudo tagliato a destra');
    for(const url of [
      './img/personaggi/armature/'+id+'.webp',
      './img/personaggi/armatura-con-arma-v371/'+classe+'/armatura-'+id+'/base.webp',
      './img/personaggi/corona-v360/'+classe+'/stato-5/armatura-'+id+'/base.webp',
    ]){
      assert.ok(existsSync(new URL('../'+url.slice(2),import.meta.url)),url);
      assert.equal(idContornoArmaturaCosmicaRpg(url+'?v=507'),id,url);
    }
    if(id==='berserker-apocalisse')assert.equal(
      idContornoArmaturaCosmicaRpg('./img/personaggi/armature/berserker-apocalisse-corna.svg?v=368'),id);
    assert.equal(idContornoArmaturaCosmicaRpg('./img/personaggi/stati/'+id+'.webp'),null);
  }
});

test('v509: Spettro Cremisi lascia fuori fumo e ruderi ai lati delle gambe',()=>{
  const spettro=CONTORNI_ARMATURE_COSMICHE_RPG['assassino-spettro'];
  // v507 lasciava visibile fino all'87% del fotogramma tra le gambe e il
  // mantello. Sono i pixel di rovine/fiamme, non quelli del personaggio.
  const sezioni=spettro.filter(([y])=>y>=.62&&y<=.875);
  assert.ok(sezioni.length>=6);
  for(const [y,sinistra,destra] of sezioni){
    assert.ok(destra-sinistra<.43,`fondo fotografico a quota ${y}`);
    if(y>=.69)assert.ok(sinistra>=.35 && destra<=.68,
      `fumo e fiamme fuori dalla silhouette delle gambe a quota ${y}`);
  }
  assert.ok(spettro.at(-1)[0]<=.95,'non mostrare il terreno sotto gli stivali');
  assert.ok(spettro.some(([y,l,r])=>y>=.25&&y<=.4&&l<.31&&r>.7),
    'mani e spallacci del personaggio devono restare visibili');
});

test('v512: la sagoma nuova non resta nella cache di Atelier, anteprima e app',()=>{
  const scena='./rpg-scena-cosmica.js?v=512';
  assert.ok(read('src/app.js').includes("from '"+scena+"'"));
  assert.ok(read('src/rpg-atelier.js').includes("from '"+scena+"'"));
  assert.ok(read('src/anteprima-combinata-rpg.js').includes("from '"+scena+"'"));
  assert.ok(read('anteprima-armature-cosmiche.html').includes("./src/rpg-scena-cosmica.js?v=512"));
  assert.ok(read('src/rpg-atelier-ui.js').includes("./rpg-atelier.js?v=512"));
});

test('v512: due sagome indipendenti conservano le scarpe senza il pavimento infuocato',()=>{
  // Le scarpe vere terminano a ~91% del fotogramma, il terreno rosso e'
  // subito sotto. Un vecchio incavo centrale lasciava due colonne di terreno.
  const corpo=CONTORNI_ARMATURE_COSMICHE_RPG['assassino-spettro'];
  assert.ok(corpo.at(-1)[0]<=.82,'il mantello non deve inglobare il suolo');
  assert.equal(INCAVI_GAMBE_ARMATURE_RPG['assassino-spettro'],undefined,
    'l incavo di un poligono unico non separa lo sfondo dalle scarpe');
  const sinistro=STIVALI_SPETTRO_COSMICI_RPG.sinistro;
  const destro=STIVALI_SPETTRO_COSMICI_RPG.destro;
  assert.ok(sinistro[0][0]<.73&&destro[0][0]<.73,'le gambe raggiungono il mantello');
  assert.ok(sinistro.at(-1)[0]<=.92&&destro.at(-1)[0]<=.92,
    'nessun terreno sotto le suole');
  for(const y of [.78,.835,.86,.90]){
    const get=righe=>righe.find((r,i)=>r[0]>=y&&i>0);
    const s=get(sinistro),d=get(destro);
    assert.ok(s&&d&&s[2]<.43&&d[1]>.61,
      'il centro tra le scarpe resta trasparente a y='+y);
  }
  const scene=read('src/rpg-scena-cosmica.js');
  assert.match(scene,/disegnaIsola\(STIVALI_SPETTRO_COSMICI_RPG\.sinistro\)/);
  assert.match(scene,/disegnaIsola\(STIVALI_SPETTRO_COSMICI_RPG\.destro\)/);
});

test('v507: maschera su foto e PNG preserva i pixel RGB originali',()=>{
  const call=[];
  const ctx={filter:'none',save(){},restore(){},fill(){call.push('fill')},beginPath(){},closePath(){},
    moveTo(){},lineTo(){},quadraticCurveTo(){call.push('curve')},
    ellipse(){call.push('crown')},drawImage(){call.push('draw')},
    createLinearGradient(){return {addColorStop(){}};},fillRect(){call.push('rect')},
  };
  const documento={createElement:()=>({width:0,height:0,getContext:()=>ctx,
    toDataURL:()=> 'data:image/png;base64,real-matte'})};
  assert.match(mascheraArmaturaCosmicaRpg('assassino-spettro',documento),/^url\("data:image\/png/);
  assert.match(mascheraArmaturaCosmicaRpg('berserker-rabbia',documento,true,true),/^url\("data:image\/png/);
  assert.ok(call.includes('crown'),'la Corona staccata resta visibile');
  assert.ok(call.includes('curve'),'testa e asta dell’ascia restano visibili');
  assert.equal(mascheraArmaturaCosmicaRpg('assassino-falsa',documento),null);
  const set=[];
  const image={currentSrc:'./img/personaggi/armature/assassino-spettro.webp',
    style:{setProperty:(k,v,p)=>set.push([k,v,p])},classList:{add:x=>set.push(['class',x])}};
  assert.equal(applicaMascheraCosmicaRpg(image,'assassino'),true);
  assert.ok(set.some(([k,v,p])=>k==='mask-image'&&v.includes('data:image/png')&&p==='important'));
  assert.ok(set.some(([k,v])=>k==='class'&&v==='rpg-cosmic-armor-subject'));
  const fakeOut={drawImage(){call.push('export')}};
  assert.equal(disegnaFotografiaFusaRpg(fakeOut,image,0,0,300,450,documento),true);
  assert.ok(call.includes('fill'),'la sagoma entra in destination-in');
  assert.ok(call.includes('export'),'fotografia RGB passata senza ritocchi');
});

test('v507: Atelier e foto condivisa tolgono il paesaggio delle armature e il personaggio non pulsa',()=>{
  const scene=read('src/rpg-scena-cosmica.js'),style=read('stile-rpg.css');
  const atelier=read('src/rpg-atelier.js'),exporter=read('src/anteprima-combinata-rpg.js');
  assert.match(scene,/rpg-cosmic-armor-contoured/);
  assert.match(scene,/!contornoArmatura && foto\?\.addEventListener/);
  assert.match(style,/\.rpg-cosmic-stage\.rpg-cosmic-armor-contoured[\s\S]*\.rpg-foto-fondale\s*\{\s*display:none!important/);
  assert.match(style,/\.rpg-cosmic-armor-contoured\.rpg-energia-pronta\s*>\s*\.personaggio-scena-grafica\.personaggio\s*\{\s*animation:none!important/);
  assert.match(atelier,/disegnaFotografiaFusaRpg\(ctx,immagine,dx,dy,dw,dh\)/);
  assert.match(exporter,/disegnaFotografiaFusaRpg\(ctx,original,0,0,out.width,out.height\)/);
  assert.ok(existsSync(new URL('../anteprima-armature-cosmiche.html',import.meta.url)));
});
