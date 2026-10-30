import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {livelliFotoRpg,montaFotoRpg} from '../src/aura-foto-rpg.js';
import {AURA_FOTO_ATLAS} from '../src/aura-foto-atlas.js';

test('Le sei immagini fotografiche dell\'Aura Shop sono incluse nel pacchetto offline',()=>{
  assert.match(AURA_FOTO_ATLAS,/^data:image\/avif;base64,AAAAIGZ0eXBhdmlm/);
  const bytes = AURA_FOTO_ATLAS.split(',')[1];
  assert.ok(bytes.length>20000 && bytes.length<30000);
  assert.equal(bytes.length % 4,0);
  assert.equal(createHash('sha256').update(Buffer.from(bytes,'base64')).digest('hex'),
    '3710fd8165952996e50ea4bb9f0b73e32ba4d306f4aded3b4829b3752e8ad2a6',
    'foto AVIF identiche al file generato, non corrotte');
  assert.match(bytes,/^[a-zA-Z0-9+/]+=*$/);
});

test('Skin, armatura, Corona ed effetto sono livelli indipendenti',()=>{
  for(const id of ['effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula']){
    assert.deepEqual(livelliFotoRpg(id),[{id,ruolo:'acquistato'}]);
    const combo=livelliFotoRpg(id,{mitica:true,corona:true});
    assert.equal(combo.at(-1).id,'corona');
    assert.equal(combo.filter(l=>l.ruolo==='corona').length,1);
    assert.equal(combo.filter(l=>l.ruolo==='acquistato').length,1);
    assert.equal(combo.some(l=>l.id==='effetto-nebula'),true);
    assert.equal(combo.length,id==='effetto-nebula'?2:3);
  }
  assert.deepEqual(livelliFotoRpg(null,{mitica:true,corona:true}),[
    {id:'effetto-nebula',ruolo:'mitica'}, {id:'corona',ruolo:'corona'}
  ]);
  assert.deepEqual(livelliFotoRpg(null),[]);
  assert.deepEqual(livelliFotoRpg(null,{divina:true}),[{id:'divina',ruolo:'streak'}]);
  assert.deepEqual(livelliFotoRpg('effetto-fulmine',{divina:true,mitica:true,corona:true}),[
    {id:'effetto-nebula',ruolo:'mitica'},
    {id:'divina',ruolo:'streak'},
    {id:'effetto-fulmine',ruolo:'acquistato'},
    {id:'corona',ruolo:'corona'},
  ]);
});

test('Anteprima: appendere effetti non rimuove foto, armatura o altri livelli',t=>{
  const originale=globalThis.document;
  t.after(()=>{if(originale===undefined)delete globalThis.document;else globalThis.document=originale;});
  const create=[];
  globalThis.document={createElement(type){
    assert.equal(type,'div');
    const e={className:'',style:{},setAttribute(){},id:'photo-layer'};
    create.push(e);
    return e;
  }};
  const armored={id:'original-armor'}, portrait={id:'original-avatar'};
  const items=[armored,portrait];
  const host={appendChild(x){items.push(x);},classList:{add(){}}};
  assert.equal(montaFotoRpg(host,'effetto-fulmine',{mitica:true,corona:true}),true);
  assert.deepEqual(items.slice(0,2),[armored,portrait]);
  assert.equal(items.length,5);
  assert.equal(create.length,3);
  assert.ok(create.every(x=>x.style.backgroundImage.includes('data:image/avif;base64,')));
  assert.ok(items[2].className.includes('aura-foto-mitica'));
  assert.ok(items[3].className.includes('aura-foto-acquistato'));
  assert.ok(items[4].className.includes('aura-foto-corona'));
});

test('Il Profilo usa sempre lo stesso avatar della Streak sotto il layer fotografico',async()=>{
  const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const start=app.indexOf("applicaSkinRpg(grafica, fotoRpg, classeId");
  const image=app.indexOf("montaFotoRpg(grafica",start);
  assert.ok(start>=0 && image>start);
  assert.match(app,/rpg-corona-foto-v359/);
  assert.match(app,/mitica: astraleAttiva/);
  assert.match(app,/effettoEquipaggiato\?\.id \|\| null/);
  assert.match(app,/divina: auraDivinaAttiva/);
  assert.match(app,/apriAnteprimaAuraDivinaRpg/);
});
