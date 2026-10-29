import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CLASSI_FOTO_RPG, EFFETTI_FOTO_RPG, STATI_FOTO_RPG,
  configurazioneFotoRpg, chiaveFotoRpg, contaCombinazioniFotoRpg,
  immagineOriginalePreservata, fasciaSagoma, montaFotoCombinataRpg,
} from '../src/anteprima-combinata-rpg.js';

test('Tutte le 2160 combinazioni distinte sono gestibili senza foto duplicate', () => {
  const keys=new Set();
  for(const classe of CLASSI_FOTO_RPG)
    for(let stato=0;stato<STATI_FOTO_RPG;stato++)
      for(const armatura of [null,'armatura-A','armatura-B'])
        for(const skin of [null,'skin-mitica'])
          for(const effetto of EFFETTI_FOTO_RPG)
            for(const divina of [false,true])
              for(const corona of [false,true]){
                const combo={classe,stato,armatura,skin,effetto,divina,corona};
                const key=chiaveFotoRpg(combo);
                assert.ok(!keys.has(key),'duplicato '+key);
                keys.add(key);
                assert.deepEqual(immagineOriginalePreservata(combo),{classe,stato},
                  'nessuna combinazione deve alterare il volto o la Streak');
              }
  assert.equal(keys.size,2160);
  assert.equal(contaCombinazioniFotoRpg({armaturePerClasse:3,skin:2,effetti:5}),2160);
});

test('Ogni classe usa un contorno di protezione proprio, senza coprire i volti', () => {
  for(const classe of CLASSI_FOTO_RPG){
    for(const y of [.05,.11,.18,.28,.38,.48,.65,.82,.94]){
      const [left,right]=fasciaSagoma(classe,y);
      assert.ok(left>=0&&left<.5&&right>.5&&right<=1);
    }
    assert.deepEqual(configurazioneFotoRpg({classe,stato:2,corona:true}).classe,classe);
  }
});

test('Il renderer fotografico non cambia foto, profilo o dati degli utenti',async()=>{
  const source=await readFile(new URL('../src/anteprima-combinata-rpg.js',import.meta.url),'utf8');
  const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(source,/globalCompositeOperation='destination-out'/);
  assert.match(source,/canvas\.className='rpg-foto-combinata'/);
  assert.match(source,/const contour=SAGOME\[classe\]/);
  assert.match(source,/chiaveFotoRpg\(c\)/);
  assert.match(app,/percorsoStato\(classeId, viso\.indice\)/);
  assert.match(app,/applicaSkinRpg\(grafica, fotoRpg, classeId/);
  assert.match(app,/montaFotoCombinataRpg\(grafica, fotoRpg/);
  assert.match(app,/scaricaFotoCombinataRpg\(/);
  assert.doesNotMatch(source,/db\.salva|supabase|acquistaOggettoAura|rimuoviOggetto/);
  assert.equal(montaFotoCombinataRpg(null,null,{}),null);
});

test('Effetti e Corona sono combinazioni indipendenti, senza cancellare gli oggetti',()=>{
  const base={classe:'berserker',stato:4,armatura:'armatura-berserker-rabbia',
    skin:'skin-mitica',effetto:'effetto-fulmine',divina:true,corona:true};
  const finale=configurazioneFotoRpg(base);
  assert.deepEqual(finale,base);
  const spenta=configurazioneFotoRpg({...base,corona:false});
  assert.equal(spenta.armatura,base.armatura);
  assert.equal(spenta.skin,base.skin);
  assert.equal(spenta.effetto,base.effetto);
  assert.equal(spenta.divina,true);
  assert.notEqual(chiaveFotoRpg(finale),chiaveFotoRpg(spenta));
});

test('Fallback iPhone: i vecchi effetti restano finche il nuovo AVIF non viene disegnato',async()=>{
  const module=await readFile(new URL('../src/anteprima-combinata-rpg.js',import.meta.url),'utf8');
  const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(module,/image\.onload=\(\)=>resolve/);
  assert.match(module,/image\.onerror=\(\)=>resolve\(null\)/);
  assert.match(module,/if\(!atlas\) \{ canvas\.remove\(\);return; \}/);
  assert.match(module,/ctx\.drawImage\(layer,0,0,\.\.\.dims\)/);
  assert.match(module,/grafica\.classList\.add\('rpg-composite-active'\)/);
  assert.doesNotMatch(app,/if \(combinata\) grafica\.classList\.add\('rpg-composite-active'\)/);
});
