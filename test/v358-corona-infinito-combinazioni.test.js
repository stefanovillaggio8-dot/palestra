import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { combinazioniRpg, opzioniAtelier, nomeFileAtelier,
  NUMERO_COMBINAZIONI_ATELIER } from '../src/rpg-atelier.js';
import { percorsoFotoCoronaV359 } from '../src/foto-corona-v359.js';
import { slotPerOggettoRpg, equipaggiamentoRpgUnico } from '../src/equipaggiamento-rpg.js';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Corona: tutte le 4536 combinazioni realmente consentite senza doppi effetti',()=>{
  const seen=new Set(),perClasse={};
  for(const cfg of combinazioniRpg()){
    if(!cfg.corona)continue;
    assert.equal(cfg.skin,'');
    const key=nomeFileAtelier(cfg);
    assert.ok(!seen.has(key),key);
    seen.add(key);
    perClasse[cfg.classe]=(perClasse[cfg.classe]||0)+1;
    assert.ok(opzioniAtelier(cfg).corona);
  }
  assert.equal(NUMERO_COMBINAZIONI_ATELIER,9072);
  assert.equal(seen.size,4536);
  for(const cls of ['guerriero','assassino','berserker'])
    assert.equal(perClasse[cls],1512);
});

test('La Corona finale è una nuova fotografia integrale, non un adesivo sulla testa',()=>{
  const app=src('src/app.js'),atelier=src('src/rpg-atelier.js');
  assert.match(app,/src: fotoAuraDivinaRpg \|\| fotoCoronaRpg \|\| fotoArmaturaRpg \|\| fotoProgressioneRpg/);
  assert.match(app,/percorsoFotoCoronaV360/);
  assert.doesNotMatch(app,/src:'\.\/img\/effetti\/corona-infinito-v358\.svg'/);
  assert.match(atelier,/percorsoFotoCoronaV360/);
  assert.doesNotMatch(atelier,/ctx\.drawImage\(regalia,dx,dy,dw,dh\)/);
  assert.match(src('tools/render_corona_v359.py'),/assert len\(files\)==144/);
});

test('144 fotografie coprono 3 classi, sei stati e due armature ognuna',()=>{
  const seen=new Set();
  for(const cls of ['guerriero','assassino','berserker']){
    for(const base of [0,1,2,3,4,5,'a','b']){
      const arm={
        assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
        guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
        berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse']
      }[cls];
      for(const fx of [null,'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica']){
        const url=percorsoFotoCoronaV359({classe:cls,
          stato:typeof base==='number'?base:2,
          armatura:typeof base==='number'?null:arm[base==='a'?0:1],effetto:fx});
        assert.ok(url&&url.endsWith('.webp?v=359'));
        seen.add(url);
      }
    }
  }
  assert.equal(seen.size,144);
  assert.notEqual(percorsoFotoCoronaV359({classe:'assassino',stato:2,effetto:'skin-mitica'}),
    percorsoFotoCoronaV359({classe:'assassino',stato:2,effetto:'effetto-ombra'}));
});

test('L Aura divina rimane un premio separato, non scompare con una Corona',()=>{
  const app=src('src/app.js'),css=src('stile-rpg.css');
  assert.match(app,/divina: auraDivinaAttiva/);
  assert.match(app,/!auraDivinaAttiva && montaFotoCombinataRpg/);
  assert.match(css,/\.personaggio-aura-divina:not\(\.rpg-composite-active\)>.aura-foto-divina/);
  assert.equal(slotPerOggettoRpg({id:'skin-mitica',tipo:'Effetto'}),'Effetto');
  assert.deepEqual(equipaggiamentoRpgUnico({Astrale:'skin-mitica',Effetto:'effetto-ombra'}),
    {Effetto:'effetto-ombra'});
  assert.match(src('src/aura-skin.js'),/giorni >= 80/);
  assert.match(src('sw.js'),/palestra-v366/);
  assert.match(src('index.html'),/palestra-v366/);
});
