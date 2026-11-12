import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {montaScenaCosmicaRpg} from '../src/rpg-scena-cosmica.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

function elem(className=''){
  const node={className,children:[],parentNode:null,
    appendChild(child){
      if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(x=>x!==child);
      this.children.push(child);child.parentNode=this;return child;
    },
    querySelector(query){const cl=query.replace(':scope > .','');
      return this.children.find(x=>x.className.split(' ').includes(cl))||null;}
  };
  return node;
}
const make=(_,attrs)=>elem(attrs.class);
test('v486 real DOM topology: overlay e foto fratelli, stesso nodo immagine e stessi equipaggiamenti',()=>{
  for(const effetto of ['astrale','nebulosa']){
    for(const classe of ['assassino','guerriero','berserker']){
      const scena=elem(),foto=elem('personaggio-ritratto');
      const corpo=elem('personaggio-scena-grafica con-foto'),equip=elem('armatura-e-arma');
      const fx=elem(effetto==='astrale'?'rpg-astrale-presenza':'rpg-nebulosa-presenza');
      corpo.appendChild(foto);corpo.appendChild(equip);corpo.appendChild(fx);
      assert.equal(montaScenaCosmicaRpg(scena,corpo,{classe,effetto,creaElemento:make}),true);
      const stage=scena.children[0];
      assert.equal(stage.className,'rpg-cosmic-stage rpg-cosmic-'+effetto+' personaggio-'+classe);
      assert.equal(stage.children[0].className,'rpg-cosmic-ambiente');
      assert.equal(stage.children[1],corpo);
      assert.equal(stage.children[2],fx);
      assert.equal(fx.parentNode,stage,'layer fuori dal ritratto');
      assert.deepEqual(corpo.children,[foto,equip],'foto, armature e armi invariate');
    }
  }
});
test('v486 nessun effetto: non cambia DOM e non crea layer',()=>{
 const scena=elem(),corpo=elem('personaggio-scena-grafica');
 assert.equal(montaScenaCosmicaRpg(scena,corpo,{effetto:null,creaElemento:make}),false);
 assert.equal(scena.children[0],corpo);
});
test('v486 in anteprima non taglia la stage, libera overflow e dissolvenza ai margini',()=>{
 const app=read('src/app.js'),css=read('stile-rpg.css'),sw=read('sw.js');
 const styles=css.slice(css.lastIndexOf('/* v486'),css.indexOf('/* v487'));
 assert.match(app,/montaScenaCosmicaRpg\(scena,grafica,/);
 assert.match(styles,/\.rpg-cosmic-stage > \.rpg-cosmic-ambiente/);
 assert.match(styles,/overflow:visible!important/);
 assert.match(styles,/mask-size:100% 100%/);
 assert.match(styles,/-webkit-mask-image:none!important/);
 assert.doesNotMatch(styles,/zoom:|scale\([^)]{2,}\)/);
 for(const classe of ['assassino','guerriero','berserker']) {
   assert.match(styles,new RegExp('astrale-celestial-'+classe+'-v483\\.svg\\?v=487'));
   assert.match(styles,new RegExp('nebulosa-spirale-'+classe+'-v484\\.svg\\?v=487'));
   assert.match(sw,new RegExp('astrale-celestial-'+classe+'-v483\\.svg'));
   assert.match(sw,new RegExp('nebulosa-spirale-'+classe+'-v484\\.svg'));
 }
 assert.match(sw,/src\/rpg-scena-cosmica\.js/);
 assert.match(read('index.html'),/palestra-v488/);
 assert.match(sw,/palestra-v488/);
});
