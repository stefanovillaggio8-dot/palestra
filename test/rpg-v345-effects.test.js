import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=async path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Profilo: Aura divina una volta, Corona tra le ricompense con ritratto e Anteprima',async()=>{
  const app=await read('src/app.js');
  const start=app.indexOf('const caselle = schedaProgressione');
  const end=app.indexOf('rigaStati.appendChild(striscia)',start);
  assert.ok(start>0&&end>start);
  const corpo=app.slice(start,end);
  // Prima esisteva un secondo appendChild di pezzo-aura-divina, oltre a c.aura.
  assert.equal((corpo.match(/class:'pezzo pezzo-aura-divina'/g)||[]).length,0);
  assert.equal((corpo.match(/class:'pezzo-nome',testo:'Aura divina'/g)||[]).length,0);
  assert.match(corpo,/c\.aura \? ' pezzo-aura-divina'/);
  assert.match(corpo,/if\(c\.aura\) tessera\.appendChild\(bottone\('Anteprima'/);
  assert.match(corpo,/class:'pezzo-corona-ritratto'/);
  assert.match(corpo,/src:percorsoStato\(classeId,5\)/);
  assert.match(corpo,/class:'fantasma corona-streak-preview premio-preview-btn'/);
  assert.match(corpo,/rigaStati\.appendChild\(striscia\)/);
});

test('Corona 80 giorni: una sola fonte grafica premium, su tutte le classi',async()=>{
  const app=await read('src/app.js');
  const photo=await read('src/anteprima-combinata-rpg.js');
  const css=await read('stile-rpg.css');
  const asset=await read('img/effetti/corona-infinito-v345.svg');
  assert.match(app,/if\(coronaAttiva\) \{/);
  assert.match(app,/class:'rpg-corona-premium'/);
  assert.match(app,/src:'\.\/img\/effetti\/corona-infinito-v345\.svg'/);
  assert.match(photo,/const crown=grafica\.querySelector\('\.rpg-corona-premium'\)/);
  assert.doesNotMatch(photo,/disegnaSprite\(ctx,atlas,'corona'/);
  assert.match(css,/rpg-scena-cinematografica \.rpg-corona-premium\s*\{/);
  assert.ok((asset.match(/<use /g)||[]).length>=12);
  assert.match(asset,/id="gold"/);
});

test('Fumo, Nebulosa e Aura: dissolvenza fotografica senza sagoma rigida',async()=>{
  for(const file of ['src/anteprima-combinata-rpg.js','src/effetti-rpg-canvas.js']){
    const s=await read(file);
    const a=s.indexOf('function '+(file.includes('anteprima')?'ritagliaPersona':'cancellaCorpo')+'(');
    assert.ok(a>0,file);
    const b=s.indexOf(file.includes('anteprima')?'// Corona magica integrata':'  function render(t){',a);
    assert.ok(b>a,file+' fine maschera');
    const mask=s.slice(a,b);
    assert.match(mask,/createRadialGradient/);
    assert.match(mask,/addColorStop\(\.90/);
    assert.match(mask,/fillRect\(-1\.2,-1\.2,2\.4,2\.4\)/);
    assert.doesNotMatch(mask,/lineTo\(/);
  }
});
