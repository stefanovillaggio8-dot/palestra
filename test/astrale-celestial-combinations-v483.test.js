import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {percorsoScenaSpecialeRpg,percorsoCombinazioneFotoRpg,
  indiceScenaCinematograficaRpg,montaScenaCinematograficaRpg
} from '../src/foto-cinematica-rpg.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v483 Astrale Celestiale è un effetto, mai una skin completa o crop',()=>{
 const css=read('stile-rpg.css');
 const styles=css.slice(css.lastIndexOf('/* v483'),css.indexOf('/* v484'));
 const sw=read('sw.js'),app=read('src/app.js');
 assert.match(app,/equipaggiamentoRpg\.Effetto === 'skin-mitica'/);
 assert.match(app,/scena\.classList\.add\('rpg-scena-astrale'\)/);
 assert.match(styles,/position:absolute!important/);
 assert.match(styles,/inset:0!important/);
 assert.match(styles,/100% 100% no-repeat!important/);
 assert.match(styles,/pointer-events:none!important/);
 assert.doesNotMatch(styles,/\.personaggio-ritratto.*transform/);
 assert.doesNotMatch(styles,/\.personaggio-ritratto.*zoom/);
 assert.doesNotMatch(styles,/object-fit/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
 for(const classe of ['assassino','guerriero','berserker']){
  const svg=read('img/effetti/astrale-celestial-'+classe+'-v483.svg');
  assert.match(svg,/viewBox="0 0 680 980"/);
  assert.match(svg,/id="body"/);
  assert.match(svg,/id="amber"/);
  assert.match(svg,/id="portal"/);
  assert.match(svg,/id="crystal"/);
  assert.ok((svg.match(/<path /g)||[]).length>80,'rune, stelle e plasma '+classe);
  assert.ok((svg.match(/<circle /g)||[]).length>170,'polvere stellare '+classe);
  assert.match(sw,new RegExp('astrale-celestial-'+classe+'-v483\\.svg'));
  assert.match(styles,new RegExp('astrale-celestial-'+classe+'-v483\\.svg'));
 }
 assert.match(sw,/palestra-v\d+/);
 assert.match(read('index.html'),/palestra-v\d+/);
});

test('v483 combinazioni 3 classi x 6 livelli x armature x armi x corona x aura: mai foto fissa',()=>{
 const armature={
  assassino:[null,'armatura-assassino-notte','armatura-assassino-abisso'],
  guerriero:[null,'armatura-guerriero-braci','armatura-guerriero-cremisi'],
  berserker:[null,'armatura-berserker-rabbia','armatura-berserker-apocalisse']
 };
 let combos=0;
 for(const [classe,lista] of Object.entries(armature)){
  for(let stato=0;stato<=5;stato++)for(const armatura of lista)
    for(const armaSbloccata of [false,true])
    for(const corona of [false,true])
    for(const divina of [false,true]){
      const c={classe,stato,armatura,armaSbloccata,corona,divina,skin:'skin-mitica'};
      assert.equal(percorsoScenaSpecialeRpg(c),null);
      assert.equal(percorsoCombinazioneFotoRpg(c),null);
      assert.equal(indiceScenaCinematograficaRpg(c),null);
      combos++;
    }
 }
 assert.equal(combos,432);
 assert.equal(montaScenaCinematograficaRpg({}, {}, {classe:'guerriero',skin:'skin-mitica'}),false);
 const code=read('src/app.js'),atelier=read('src/rpg-atelier.js');
 assert.match(code,/const effettoCosmicoAttivo = astraleAttiva \|\| nebulosaAttiva/);
 assert.match(code,/if \(\(effettoCosmicoAttivo && effettoVivo\)/);
 assert.match(code,/if\(scenaRichiesta && !effettoCosmicoAttivo/);
 assert.match(atelier,/fxSenzaFoto = c.effetto==='skin-mitica' \|\| c.effetto==='effetto-nebula'/);
 assert.match(atelier,/disegnaAstraleExport\(ctx/);
});
