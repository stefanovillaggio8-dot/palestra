import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ancoreEnergiaRpg,disegnaEnergiaIncarnataRpg} from '../src/rpg-energia-incarnata.js';
const testo=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

function spia(){
  const conti={linee:0,stelle:0,maschere:0,gradienti:0};
  const ctx={
    save(){},restore(){},translate(){},scale(){},clearRect(){},
    beginPath(){},moveTo(){conti.linee++;},lineTo(){conti.linee++;},arc(){},
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
    assert.ok(g.nuclei.length>=3,classe);
    for(const punto of [...g.spalle,...g.mani,...g.giunture,...g.nuclei,...g.armi.flat()]){
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
      assert.ok(sotto.conti.linee>70,classe+' '+effetto+' senza flussi dietro');
      assert.ok(sopra.conti.linee>90,classe+' '+effetto+' senza emissioni dal corpo');
      assert.ok(sopra.conti.gradienti>=12,classe+' '+effetto+' senza riflessi sul metallo');
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
  assert.doesNotMatch(motore,/\.src\s*=|\.outerHTML\s*=/,'nessuna nuova foto o corpo');
});

test('v493: rendering live e PNG condividono il motore, senza toccare i dati',()=>{
  assert.match(testo('src/rpg-scena-cosmica.js'),/montaEnergiaIncarnataRpg\(palco,grafica,foto/);
  assert.match(testo('src/rpg-atelier.js'),/disegnaEnergiaIncarnataRpg/);
  assert.match(testo('src/anteprima-combinata-rpg.js'),/disegnaEnergiaIncarnataRpg/);
  const css=testo('stile-rpg.css');
  assert.match(css,/\.rpg-energia-retro/);
  assert.match(css,/\.rpg-energia-fronte/);
  assert.match(css,/\.rpg-cosmic-stage\.rpg-energia-pronta/);
  assert.match(testo('sw.js'),/\.\/src\/rpg-energia-incarnata\.js/);
  assert.match(testo('index.html'),/palestra-v493/);
  assert.match(testo('anteprima-effetti-cosmici.html'),/cutout\/stati/);
  assert.doesNotMatch(testo('src/rpg-energia-incarnata.js'),/localStorage|indexedDB|fetch\(|sessionStorage/);
});
