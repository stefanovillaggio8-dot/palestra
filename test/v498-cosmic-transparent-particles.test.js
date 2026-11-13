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

test('v500: cornice delle particelle su sfondo identico alle anteprime comuni',()=>{
  const css=leggi('stile-rpg.css');
  const selettore='.aura-preview-panel.aura-preview-cosmic-panel .aura-preview-scene.aura-preview-cosmic-scene.cosmic-nebulosa {';
  const start=css.lastIndexOf(selettore);
  assert.ok(start>0);
  const regola=css.slice(start,css.indexOf('}',start)).replace(/\/\*[\s\S]*?\*\//g,'');
  const fondoComune=css.match(/\.aura-preview-scene\s*\{[^}]*background:\s*([^;]+);/);
  const fondoCosmico=regola.match(/background:\s*([^;]+)!important/);
  assert.ok(fondoComune&&fondoCosmico);
  assert.equal(fondoComune[1].replace(/\s+/g,''),fondoCosmico[1].replace(/\s+/g,''),
    'l’anteprima cosmica deve usare esattamente lo sfondo base');
  assert.match(css.slice(start),/\.aura-preview-cosmic-scene \.personaggio-scena\.rpg-scena-nebulosa\s*\{[^}]*background:transparent!important/);
  assert.match(css.slice(start),/\.personaggio-scena\.rpg-scena-nebulosa::after\s*\{[^}]*content:none!important/);
  assert.doesNotMatch(css.slice(start),/:has\(\.rpg-energia-pronta\)/,
    'il fondale non deve riapparire al cambio classe o prima del primo frame');
  // La texture V498 non deve essere spenta: togliamo il fondale, non il VFX.
  assert.match(css,/\.rpg-cosmic-stage > \.rpg-energia-retro\s*\{[^}]*mix-blend-mode:screen/);
  assert.match(css,/\.rpg-cosmic-stage > \.rpg-energia-fronte\s*\{[^}]*mix-blend-mode:screen/);
  assert.match(leggi('src/rpg-energia-incarnata.js'),/astrale-particelle-v498\.webp/);
  assert.match(leggi('src/rpg-energia-incarnata.js'),/nebulosa-particelle-v498\.webp/);
});

test('v501: spegne la presenza cosmica precedente anche con classe personaggio specifica',()=>{
  const css=leggi('stile-rpg.css');
  const finale=css.slice(css.indexOf('/* v501 · Ultimi globi'));
  for(const effetto of ['astrale','nebulosa']){
    assert.match(finale,new RegExp('rpg-cosmic-'+effetto+'\\.rpg-energia-pronta:is\\('));
    assert.match(finale,new RegExp('> \\.rpg-'+(effetto==='astrale'?'astrale':'nebulosa')+'-presenza'));
  }
  assert.match(finale,/personaggio-assassino,\.personaggio-guerriero,\.personaggio-berserker/);
  assert.match(finale,/display:none!important/);
  // Le particelle alpha rimangono su due Canvas distinti, con lo zoom della foto.
  assert.match(css,/\.rpg-cosmic-stage > \.rpg-energia-retro\s*\{[^}]*mix-blend-mode:screen/);
  assert.match(css,/\.rpg-cosmic-stage > \.rpg-energia-fronte\s*\{[^}]*mix-blend-mode:screen/);
});

test('v502: sfondo fotografico originale visibile e sfumato, non poster né colore piatto',()=>{
  const css=leggi('stile-rpg.css');
  const selector='.personaggio-scena > .rpg-cosmic-stage.rpg-cosmic-cutout-ready.rpg-energia-pronta > .rpg-foto-fondale {';
  const inizio=css.indexOf(selector,css.indexOf('/* v502 · Come gli altri'));
  assert.ok(inizio>css.indexOf(selector),'la regola di ripristino deve prevalere sul precedente display:none');
  const regola=css.slice(inizio,css.indexOf('}',inizio));
  assert.match(regola,/display:block!important/);
  assert.match(regola,/opacity:\.98!important/);
  assert.match(regola,/-webkit-mask-image:radial-gradient\(/);
  assert.match(regola,/(?<!-)mask-image:radial-gradient\(/);
  assert.match(regola,/transparent 100%/,'i bordi della foto devono sfumare fino a zero');
  const energia=leggi('src/rpg-energia-incarnata.js');
  assert.match(energia,/const fondale=documento\.createElement\('img'\)/);
  assert.match(energia,/const sorgente=foto\.currentSrc\|\|foto\.getAttribute\?\.\('src'\)\|\|foto\.src/);
  assert.match(energia,/allinea\(fondale,'left',\(fr\.left-pr\.left\)\+'px'\)/);
  assert.match(energia,/allinea\(fondale,'width',fr\.width\+'px'\)/);
  assert.match(css,/\.rpg-cosmic-stage > \.rpg-energia-retro\s*\{[^}]*mix-blend-mode:screen/);
  assert.match(css,/\.rpg-cosmic-stage > \.rpg-energia-fronte\s*\{[^}]*mix-blend-mode:screen/);
});

test('v503: due scene fotografiche vere riempiono il palco senza incollare una seconda foto del personaggio',()=>{
  const css=leggi('stile-rpg.css');
  const inizio=css.indexOf('/* v503 · Ambiente FOTOGRAFICO');
  assert.ok(inizio>0);
  const ultime=css.slice(inizio);
  for(const effetto of ['astrale','nebulosa']){
    const path='img/effetti/'+effetto+'-ambiente-v503.webp';
    const bin=readFileSync(new URL('../'+path,import.meta.url));
    assert.equal(bin.toString('ascii',0,4),'RIFF');
    assert.equal(bin.toString('ascii',8,12),'WEBP');
    assert.ok(bin.length>200_000,'deve essere una vera scena fotografica definita');
    assert.ok(ultime.includes("url('./"+path+"')"));
    assert.match(ultime,new RegExp('rpg-cosmic-'+effetto+'\\.rpg-energia-pronta'));
  }
  assert.match(ultime,/background-size:cover!important/);
  assert.match(ultime,/rpg-foto-fondale\s*\{\s*display:none!important/);
  assert.match(ultime,/\.personaggio-dati\s*\{\s*text-align:center!important/);
  assert.match(leggi('sw.js'),/astrale-ambiente-v503\.webp/);
  assert.match(leggi('sw.js'),/nebulosa-ambiente-v503\.webp/);
  assert.match(leggi('anteprima-effetti-cosmici.html'),/ritratto cosmic-/);
});

test('v504: niente pulsazione globale, ma le particelle restano animate',()=>{
  const css=leggi('stile-rpg.css');
  const regola=css.slice(css.indexOf('/* v504 · Il "respiro" globale'));
  assert.match(regola,/\.rpg-cosmic-stage\.rpg-energia-pronta > \.personaggio-scena-grafica\.personaggio\s*\{\s*animation:none!important/);
  assert.match(leggi('stile.css'),/\.personaggio\s*\{\s*animation:\s*personaggio-respira/,
    'le altre skin non devono perdere l’animazione');

  const energia=leggi('src/rpg-energia-incarnata.js');
  assert.match(energia,/const pulso=1;/);
  assert.doesNotMatch(energia,/\.86\+\.14\*Math\.sin\(t\*1\.52\)/);
  assert.doesNotMatch(energia,/const dx=Math\.sin\(t\*\.57/);
  assert.match(energia,/ciclo=\(rand\(i\*17\+3\)\+t\*/, 'le particelle continuano a spostarsi');

  const texture={astrale:{naturalWidth:1024,naturalHeight:1536}};
  const disegni=[];
  const ctx={save(){},restore(){},drawImage(...args){disegni.push(args);}};
  assert.equal(disegnaEnergiaFotograficaRpg(ctx,350,525,'assassino','astrale',10,
    {fase:'retro',texture}),true);
  assert.equal(disegni.length,1,'la texture retro deve essere ferma e disegnata una volta sola');
});
