import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {ARMATURE_ATELIER,CLASSI_ATELIER,EFFETTI_ATELIER,opzioniAtelier} from '../src/rpg-atelier.js';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
import {percorsoFotoCoronaV360} from '../src/foto-corona-v360.js';
import {percorsoFotoAuraDivinaV366} from '../src/foto-aura-divina-v366.js';
import {applicaMascheraCosmicaRpg,mascheraBordiFotografiaRpg,disegnaFotografiaFusaRpg} from '../src/rpg-scena-cosmica.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v506: tutte le 54 coppie classe/skin/effetto sono selezionabili, senza armature di un altro eroe',()=>{
  const coppie=new Set();
  for(const classe of CLASSI_ATELIER){
    for(const armatura of ARMATURE_ATELIER[classe]){
      for(const effetto of EFFETTI_ATELIER){
        const c=opzioniAtelier({classe,armatura,effetto,stadio:5});
        assert.equal(c.classe,classe);
        assert.equal(c.armatura,armatura);
        assert.equal(c.effetto,effetto);
        assert.equal(c.skin,'','Astrale non deve sostituire la skin acquistata');
        coppie.add([classe,armatura,effetto].join(':'));
        if(!armatura)continue;
        // Quando sbloccati, pugnali/spada/ascia sono già nella FOTO originale
        // della stessa armatura, mai disegnati sopra con un altro personaggio.
        const img=percorsoFotoArmaturaArmataV371({classe,stato:5,armatura,
          effetto:effetto==='skin-mitica'||effetto==='effetto-nebula'?null:(effetto||null),
          armaSbloccata:true});
        assert.ok(img?.includes('/'+classe+'/'+armatura+'/base.webp') ||
          (img?.includes('/'+classe+'/'+armatura+'/')&&img?.endsWith('.webp?v=372')));
        assert.ok(existsSync(new URL('../'+img.replace(/^\.\//,'').split('?')[0],import.meta.url)),img);
        const corona=percorsoFotoCoronaV360({classe,stato:5,armatura,
          effetto:null,armaSbloccata:true});
        assert.ok(existsSync(new URL('../'+corona.replace(/^\.\//,'').split('?')[0],import.meta.url)),corona);
        const divina=percorsoFotoAuraDivinaV366({classe,stato:5,armatura,
          divina:true,armaSbloccata:true});
        assert.ok(existsSync(new URL('../'+divina.replace(/^\.\//,'').split('?')[0],import.meta.url)),divina);
      }
    }
  }
  assert.equal(coppie.size,54);
});

test('v506: le foto Shop senza alpha si dissolvono ai bordi, senza tagliare armi o visi',()=>{
  const gradients=[];
  const ctx={fillRect(){},createLinearGradient(){
    const offsets=[];gradients.push(offsets);
    return {addColorStop:(n,col)=>offsets.push([n,col])};
  },drawImage(...args){this.drawn=args}};
  const masks=[];
  const f={style:{setProperty:(k,v,priority)=>masks.push([k,v,priority])},classList:{add(){}}};
  assert.equal(applicaMascheraCosmicaRpg(f,'assassino'),true);
  assert.ok(masks.some(([k,,p])=>k==='mask-image'&&p==='important'));
  assert.ok(masks.some(([k,,p])=>k==='-webkit-mask-image'&&p==='important'));
  const mock={createElement:()=>({width:0,height:0,getContext:()=>ctx,
    toDataURL:()=> 'data:image/png;base64,feather'})};
  assert.match(mascheraBordiFotografiaRpg(mock),/^url\("data:image\/png/);
  const output={drawImage(...args){this.lastDraw=args}};
  assert.equal(disegnaFotografiaFusaRpg(output,{naturalWidth:900},0,0,680,980,mock),true);
  assert.equal(output.lastDraw[3],680);
  assert.equal(output.lastDraw[4],980);
  assert.ok(gradients.some(g=>g.some(([o])=>o===.095)),'feather laterale');
  assert.ok(gradients.some(g=>g.some(([o])=>o===.075)),'feather verticale');
});

test('v506: ogni effetto può scegliere le armature Shop e salvare la stessa foto visibile',()=>{
  const app=read('src/app.js'),ui=read('src/rpg-atelier-ui.js');
  const atelier=read('src/rpg-atelier.js'),exporter=read('src/anteprima-combinata-rpg.js');
  const css=read('stile-rpg.css');
  assert.match(app,/if \(oggetto\.tipo === 'Effetto'\) \{/);
  assert.match(app,/sceltaArmatura\.addEventListener\('change'/);
  assert.match(app,/equipAnteprima\.Armatura=armaturaAnteprima\|\|null/);
  assert.match(app,/armaturaAnteprima='';\s*aggiornaArmatureAnteprima\(\)/);
  assert.match(css,/\.aura-preview-armor-select/);
  assert.match(css,/\.rpg-cosmic-stage:not\(\.rpg-cosmic-cutout-ready\)/);
  assert.match(ui,/renderPersonaggio\(profile,st\)/);
  assert.match(atelier,/const immagine=fxSenzaFoto \? \(ritaglioReale\|\|fotoBase\)/);
  assert.match(atelier,/disegnaFotografiaFusaRpg\(ctx,immagine,dx,dy,dw,dh\)/);
  assert.match(exporter,/disegnaFotografiaFusaRpg\(ctx,original,0,0,out.width,out.height\)/);
  assert.doesNotMatch(app,/if\(oggetto\.tipo==='Effetto'\)\s*db\./);
});
