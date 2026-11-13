import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  disegnaEnergiaFotograficaRpg,ENERGIA_ASTRALE_V498_URL,ENERGIA_NEBULOSA_V498_URL,
} from '../src/rpg-energia-incarnata.js';

const leggi=nome=>readFileSync(new URL('../'+nome,import.meta.url),'utf8');

test('v498: foto del personaggio intatta, nessun rettangolo dietro al cutout',()=>{
  const css=leggi('stile-rpg.css');
  const selector='.personaggio-scena > .rpg-cosmic-stage.rpg-cosmic-cutout-ready.rpg-energia-pronta > .rpg-foto-fondale {';
  const inizio=css.indexOf(selector);
  assert.ok(inizio>=0);
  assert.match(css.slice(inizio,css.indexOf('}',inizio)),/display:none!important/);
  assert.match(css,/rpg-cosmic-cutout-ready > \.personaggio-scena-grafica\.con-foto > \.personaggio-ritratto/);
});

test('v498: due texture alpha fotografiche indipendenti a risoluzione piena',()=>{
  for(const url of [ENERGIA_ASTRALE_V498_URL,ENERGIA_NEBULOSA_V498_URL]){
    const bin=readFileSync(new URL(url));
    assert.equal(bin.toString('ascii',0,4),'RIFF');
    assert.equal(bin.toString('ascii',8,12),'WEBP');
    assert.ok(bin.length>100000&&bin.length<1_200_000);
  }
  const immagini={astrale:{naturalWidth:1024,naturalHeight:1536},nebulosa:{naturalWidth:1024,naturalHeight:1536}};
  for(const classe of ['assassino','guerriero','berserker']){
    for(const effetto of ['astrale','nebulosa']){
      const draw=[];
      const ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},arc(){},
        fill(){},stroke(){},moveTo(){},lineTo(){},bezierCurveTo(){},closePath(){},
        createRadialGradient(){return {addColorStop(){}};},
        drawImage(...args){draw.push(args);}};
      for(const fase of ['retro','fronte']){
        assert.equal(disegnaEnergiaFotograficaRpg(ctx,350,525,classe,effetto,2,
          {fase,texture:immagini}),true);
      }
      assert.equal(draw[0][0],immagini[effetto]);
      assert.deepEqual(draw[0].slice(1),[0,0,1024,1536,0,0,350,525]);
      assert.ok(draw.every(d=>d[0]===immagini[effetto]),'non deve trapelare la texture della rarità diversa');
    }
  }
});

test('v498: numero di versione visibile corretto e ResizeObserver non mostra un errore fittizio',()=>{
  const app=leggi('src/app.js');
  assert.match(app,/cosmicoAnteprima\?' · '\+String\(window\.PALESTRA_VERSIONE/);
  assert.doesNotMatch(app,/cosmicoAnteprima\?' · v492'/);
  assert.match(app,/ResizeObserver loop \(\?:limit exceeded\|completed with undelivered notifications\)/);
  const energia=leggi('src/rpg-energia-incarnata.js');
  assert.match(energia,/resize=new ResizeObserver\(\(\)=>\{/);
  assert.match(energia,/resizeFrame=requestAnimationFrame/);
  const scena=leggi('src/rpg-scena-cosmica.js');
  assert.match(scena,/frameMisura=requestAnimationFrame/);
});
