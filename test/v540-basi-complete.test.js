import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v540: cinque piattaforme complete, anche al centro ai piedi',()=>{
 const m=JSON.parse(read('img/effetti/reference-v540-base-manifest.json'));
 assert.deepEqual(m.size,[1380,884]);
 assert.deepEqual(Object.keys(m.base_alpha),['ambra','ombra','fulmine','nebula','astrale']);
 for(const [name,values] of Object.entries(m.base_alpha)){
  assert.equal(values.center_alpha.length,4,name);
  assert.ok(values.center_alpha.every(a=>a>=45),name+' pavimento completamente visibile: '+values.center_alpha);
 }
 const atlas=readFileSync(new URL('../img/effetti/effetti-reference-v540.webp',import.meta.url));
 assert.equal(atlas.toString('ascii',0,4),'RIFF');
 assert.equal(atlas.toString('ascii',8,12),'WEBP');
 assert.ok(atlas.length>350000&&atlas.length<1500000);
});
test('v540: nessun cambiamento a viso, armature, foto o vecchio atlante',()=>{
 const css=read('stile-rpg.css'),app=read('src/app.js'),script=read('tools/restore-reference-floor-v540.py');
 assert.match(css,/rpg-reference-integrated-v539/);
 assert.match(css,/rpg-reference-subject-v539/);
 assert.match(css,/effetti-reference-v539\.webp\?v=539/);
 assert.match(app,/montaReferenceScontornataV539/);
 assert.match(script,/Image\.alpha_composite\(base,src\)/);
 assert.match(script,/range\(int\(\.763\*H\),H\)/);
 const old=readFileSync(new URL('../img/effetti/effetti-reference-v539.webp',import.meta.url));
 assert.ok(old.length>300000);
});
test('v540: stesso pavimento in Shop, Atelier, PNG e cache PWA',()=>{
 const css=read('stile-rpg.css'),at=read('src/rpg-atelier.js');
 const out=read('src/anteprima-combinata-rpg.js'),sw=read('sw.js'),idx=read('index.html');
 for(const file of [css,at,sw])assert.match(file,/effetti-reference-v539\.webp\?v=539/);
 assert.match(out,/rpg-atelier\.js\?v=545/);
 assert.match(sw,/const VERSIONE = 'palestra-v545'/);
 assert.match(idx,/PALESTRA_VERSIONE = 'palestra-v545'/);
 assert.match(sw,/percorso\.includes\('effetti-reference-v540\.webp'\)/);
});
