import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ancoreEnergiaRpg,disegnaEnergiaIncarnataRpg,disegnaEnergiaFotograficaRpg,ENERGIA_FOTOGRAFICA_RPG_URL} from '../src/rpg-energia-incarnata.js';
const testo=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

function spia(){
  const conti={linee:0,stelle:0,maschere:0,gradienti:0,plasma:0};
  const ctx={
    save(){},restore(){},translate(){},scale(){},clearRect(){},
    beginPath(){},moveTo(){},lineTo(){conti.linee++;},arc(){},
    bezierCurveTo(){conti.plasma++;},closePath(){},
    stroke(){},fill(){conti.stelle++;},
    drawImage(){conti.maschere++;},
    createRadialGradient(){conti.gradienti++;return {addColorStop(){}};},
  };
  return {ctx,conti};
}

test('v493: le tre classi hanno ancore materiali proprie, incluse armi distinte',()=>{
  const armi=[];
  for(const classe of ['assassino','guerriero','berserker']){
    const g=ancoreEnergiaRpg(classe);
    assert.equal(g.armi.length,2,classe);
    assert.equal(g.mani.length,2,classe);
    assert.equal(g.stivali.length,2,classe);
    assert.ok(g.nuclei.length>=3,classe);
    for(const punto of [...g.spalle,...g.mani,...g.giunture,...g.nuclei,...g.stivali,g.cintura,...g.armi.flat()]){
      assert.equal(punto.length,2);
      assert.ok(punto.every(n=>Number.isFinite(n)&&n>=0&&n<=1),classe+': '+punto);
    }
    armi.push(JSON.stringify(g.armi));
  }
  assert.equal(new Set(armi).size,3,'mai spada e pugnali identici su classi diverse');
});

test('v493: ogni coppia classe/rarità produce energia in profondità e sul corpo',()=>{
  for(const classe of ['assassino','guerriero','berserker']){
    for(const effetto of ['astrale','nebulosa']){
      const sotto=spia(),sopra=spia();
      assert.equal(disegnaEnergiaIncarnataRpg(sotto.ctx,340,510,classe,effetto,2.8,{fase:'retro'}),true);
      assert.equal(disegnaEnergiaIncarnataRpg(sopra.ctx,340,510,classe,effetto,2.8,{fase:'fronte'}),true);
      assert.ok(sotto.conti.gradienti>=20,classe+' '+effetto+' senza gas fisico attorno al corpo');
      assert.equal(sotto.conti.linee,0,classe+' '+effetto+' mostra ancora le vecchie strisce di sfondo');
      assert.ok(sopra.conti.linee>70,classe+' '+effetto+' senza emissioni dal corpo');
      assert.ok(sopra.conti.gradienti>=12,classe+' '+effetto+' senza riflessi sul metallo');
      if(effetto==='astrale'){
        assert.ok(sotto.conti.plasma>30,classe+' senza plasma ancorato');
        assert.ok(sopra.conti.plasma>0,classe+' senza fiamme sugli oggetti');
      }else assert.equal(sotto.conti.plasma,0,'Nebulosa e Astrale non sono lo stesso effetto ricolorato');
    }
  }
  assert.equal(disegnaEnergiaIncarnataRpg(null,340,510,'guerriero','astrale'),false);
  assert.equal(disegnaEnergiaIncarnataRpg(spia().ctx,340,510,'mago','astrale'),false);
});

test('v493: i riflessi usano la trasparenza della fotografia, non un ovale',()=>{
  const sopra=spia(),buffer=spia();
  const soggetto={naturalWidth:900,naturalHeight:1350};
  const tela={width:0,height:0,getContext:()=>buffer.ctx};
  assert.equal(disegnaEnergiaIncarnataRpg(sopra.ctx,340,510,'guerriero','astrale',2.8,
    {soggetto,buffer:tela}),true);
  assert.equal(tela.width,340);
  assert.equal(tela.height,510);
  assert.equal(buffer.conti.maschere,1,'alpha del soggetto usato come destination-in');
  assert.equal(sopra.conti.maschere,1,'luce risultante integrata nel render');
  const motore=testo('src/rpg-energia-incarnata.js');
  assert.match(motore,/globalCompositeOperation='destination-in'/);
  assert.doesNotMatch(motore,/for\(let fila=0/,'vietati i tubi luminosi verticali sul fondale');
  assert.doesNotMatch(motore,/(?:foto|soggetto|cutout)\.src\s*=|\.outerHTML\s*=/,
    'la sorgente del vero personaggio non deve essere mai sostituita');
});

test('v494: rendering live e PNG condividono il VFX fotografico, senza toccare i dati',()=>{
  assert.match(testo('src/rpg-scena-cosmica.js'),/montaEnergiaIncarnataRpg\(palco,grafica,foto/);
  assert.match(testo('src/rpg-atelier.js'),/disegnaEnergiaFotograficaRpg/);
  assert.match(testo('src/anteprima-combinata-rpg.js'),/disegnaEnergiaFotograficaRpg/);
  const css=testo('stile-rpg.css');
  assert.match(css,/\.rpg-energia-retro/);
  assert.match(css,/\.rpg-energia-fronte/);
  assert.match(css,/rpg-cosmic-cutout-ready\.rpg-energia-pronta > \.rpg-foto-fondale/);
  assert.match(css,/\.rpg-cosmic-stage\.rpg-energia-pronta/);
  assert.match(testo('src/rpg-energia-incarnata.js'),/fondale\.className='rpg-foto-fondale'/);
  assert.match(testo('src/rpg-atelier.js'),/ctx\.drawImage\(fotoBase,dx,dy,dw,dh\)/);
  assert.match(testo('src/anteprima-combinata-rpg.js'),/ctx\.drawImage\(original,0,0,out\.width,out\.height\)/);
  assert.match(testo('sw.js'),/\.\/src\/rpg-energia-incarnata\.js/);
  assert.match(testo('index.html'),/palestra-v500/);
  assert.match(testo('anteprima-effetti-cosmici.html'),/cutout\/stati/);
  assert.match(testo('anteprima-effetti-cosmici.html'),/img\/personaggi\/stati/);
  assert.doesNotMatch(testo('src/rpg-energia-incarnata.js'),/localStorage|indexedDB|fetch\(|sessionStorage/);
});

test('v494: atlante fotografico alpha disponibile nelle sei coppie e nelle armature Shop',()=>{
  const atlas=readFileSync(new URL(ENERGIA_FOTOGRAFICA_RPG_URL));
  assert.equal(atlas.toString('ascii',0,4),'RIFF');
  assert.equal(atlas.toString('ascii',8,12),'WEBP');
  assert.ok(atlas.length>100000&&atlas.length<1300000,'effetti autentici, precache iPhone contenuta');
  const texture={naturalWidth:1024,naturalHeight:1536};
  for(const classe of ['assassino','guerriero','berserker'])for(const effetto of ['astrale','nebulosa']){
    const retro=spia(),fronte=spia();
    assert.equal(disegnaEnergiaFotograficaRpg(retro.ctx,340,510,classe,effetto,3,
      {fase:'retro',texture}),true);
    assert.ok(retro.conti.maschere>=2,`${classe} ${effetto}: il VFX non appare dietro`);
    assert.equal(disegnaEnergiaFotograficaRpg(fronte.ctx,340,510,classe,effetto,3,
      {fase:'fronte',texture,soggetto:null}),true);
    assert.ok(fronte.conti.maschere>=1,`${classe} ${effetto}: armatura senza alpha resta senza effetto`);
  }
  const live=testo('src/rpg-energia-incarnata.js');
  assert.match(live,/haSoggettoAlpha/);
  assert.match(testo('sw.js'),/energia-fotografica-v497\.webp/);
});

test('v497: sigillo Astrale centrato sotto i piedi in tutte le classi e mai nella Nebulosa',()=>{
  const texture={naturalWidth:1024,naturalHeight:1536};
  for(const classe of ['assassino','guerriero','berserker']){
    for(const effetto of ['astrale','nebulosa']){
      const draw=[];
      const ctx={save(){},restore(){},drawImage(...a){draw.push(a);}};
      disegnaEnergiaFotograficaRpg(ctx,340,510,classe,effetto,0,{fase:'retro',texture});
      const proiezioni=draw.filter(args=>args.length===9&&args[3]===512&&args[4]===108&&args[6]>420);
      if(effetto==='nebulosa')assert.equal(proiezioni.length,0,'la Nebulosa non ha sigillo dorato');
      else{
        assert.equal(proiezioni.length,1,`${classe}: sigillo unico`);
        const [, , , , ,x,y,w,h]=proiezioni[0];
        assert.ok(Math.abs(x+w/2-170)<.1,`${classe}: asse centrale sbagliato`);
        assert.ok(y>440&&y+h<510,`${classe}: il sigillo deve restare sul pavimento`);
      }
    }
  }
});
