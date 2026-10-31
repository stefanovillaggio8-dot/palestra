import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v364: only the Divine Aura image changes, not the original characters',()=>{
  const script=file('tools/render_aura_divina_v364.py');
  assert.match(script,/after=im\.copy\(\);after\.alpha_composite\(effect\)/);
  assert.match(script,/before\.getpixel\(\(w\/\/2,h\/\/3\)\)==after\.getpixel/);
  assert.match(script,/before\.getpixel\(\(w\/\/2,h\/\/2\)\)==after\.getpixel/);
  assert.doesNotMatch(script,/draw\.text\(.*corona|modify.*armor/);
  assert.ok(existsSync(new URL('../docs/aura-divina-v364-confronto.jpg',import.meta.url)));
  for(const c of ['assassino-stadio1','guerriero-stadio3','berserker-stadio5'])
    assert.ok(existsSync(new URL('../docs/aura-v364-'+c+'.webp',import.meta.url)),c);
});
test('v364: the aura is a single shared effect image in app, not a new avatar',()=>{
  const aura=file('src/aura-foto-rpg.js');
  assert.match(aura,/aura-divina-v364\.webp\?v=364/);
  assert.match(aura,/layer\.style\.backgroundImage=id==='divina'/);
  assert.match(aura,/layer\.style\.backgroundSize=id==='divina'\?'100% 100%'/);
  assert.ok(existsSync(new URL('../img/effetti/aura-divina-v364.webp',import.meta.url)));
  assert.ok(readFileSync(new URL('../img/effetti/aura-divina-v364.webp',import.meta.url)).toString('ascii',0,4)==='RIFF');
  assert.match(file('src/anteprima-combinata-rpg.js'),/aura-divina-v364\.webp\?v=364/);
});
test('v364: preview streak progression, accounts and cache unchanged',()=>{
 const app=file('src/app.js');
 assert.match(app,/statoFotoConsentito/);
 assert.match(app,/armaSbloccataRpg/);
 assert.match(app,/divina: auraDivinaAttiva/);
 assert.match(file('sw.js'),/palestra-v365/);
 assert.match(file('sw.js'),/aura-divina-v364\.webp\?v=364/);
 assert.match(file('index.html'),/palestra-v365/);
});
