import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {percorsoFotoAuraDivinaV365} from '../src/foto-aura-divina-v365.js';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v365: nine unique photos preserve 3 classes x the actual 3 progression stages',()=>{
 const paths=new Set();
 for(const classe of ['assassino','guerriero','berserker'])
  for(const stato of [0,3,5]){
   const path=percorsoFotoAuraDivinaV365({classe,stato,divina:true,armaSbloccata:stato>=4});
   assert.ok(path?.includes('/aura-divina-v365/'),String(path));
   assert.ok(existsSync(new URL('.'+path.slice(1).split('?')[0],new URL('../',import.meta.url))),path);
   paths.add(path);
  }
 assert.equal(paths.size,9);
 assert.ok(existsSync(new URL('../docs/aura-divina-v365-nove-foto.jpg',import.meta.url)));
});
test('v365: no invented weapons, no simultaneous Shop effects, no swapped paid armors',()=>{
 const base={classe:'assassino',stato:5,divina:true};
 assert.equal(percorsoFotoAuraDivinaV365({...base,armaSbloccata:false}),null);
 assert.equal(percorsoFotoAuraDivinaV365({...base,armaSbloccata:true,effetto:'effetto-fulmine'}),null);
 assert.equal(percorsoFotoAuraDivinaV365({...base,armaSbloccata:true,armatura:'armatura-assassino-notte'}),null);
 assert.equal(percorsoFotoAuraDivinaV365({...base,armaSbloccata:true,corona:true}),null);
 assert.equal(percorsoFotoAuraDivinaV365({...base,armaSbloccata:true,effetto:'effetto-fulmine',anteprima:true})?.includes('/stato-5.webp'),true);
 assert.equal(percorsoFotoAuraDivinaV365({...base,stato:4,armaSbloccata:true}),null);
 assert.equal(percorsoFotoAuraDivinaV365({...base,divina:false,armaSbloccata:true}),null);
});
test('v365: app uses the original stage photograph, no second aura overlay and one effect only',()=>{
 const app=file('src/app.js');
 assert.match(app,/import \{ percorsoFotoAuraDivinaV365 \}/);
 assert.match(app,/const fotoAuraDivinaRpg=percorsoFotoAuraDivinaV365/);
 assert.match(app,/src: fotoAuraDivinaRpg \|\| fotoCoronaRpg/);
 assert.match(app,/divina: auraDivinaAttiva && !fotoAuraDivinaRpg/);
 assert.match(app,/const auraDivinaAttiva=auraDivinaAnteprima \|\| \(Boolean\(viso\.aura\) && !effettoEquipaggiato\)/);
 assert.match(app,/armaSbloccataRpg\(rpg.premi\)/);
 assert.match(file('src/anteprima-combinata-rpg.js'),/aura-divina-v365/);
 assert.doesNotMatch(app,/db\.salva\([^)]*auraDivinaRpg/);
});
test('v365: 9 full-frame WebP files and versioned iPhone offline gallery',()=>{
 const sw=file('sw.js'),html=file('index.html');
 assert.match(sw,/palestra-v365/);
 assert.match(html,/palestra-v365/);
 assert.match(sw,/foto-aura-divina-v365\.js/);
 assert.match(sw,/aura-divina-v365\/'/);
 assert.match(sw,/aura-divina-v365-anteprima\.html/);
 const preview=file('aura-divina-v365-anteprima.html');
 assert.equal((preview.match(/<figure>/g)||[]).length,9);
});
