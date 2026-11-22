import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const raw=(p)=>readFileSync(new URL('../'+p,import.meta.url));
const gitsha=(b)=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');

test('v541: il fondale ed il pavimento sono estratti dalla FOTO APPROVATA',()=>{
 const original=raw('img/effetti/reference-approvata-v537.png');
 const floor=raw('img/effetti/reference-ambiente-v541.webp');
 assert.equal(gitsha(original),'258a2fd9f0c2e4d61246cd48a76ae8205f6226bb');
 assert.equal(gitsha(floor),'b5f2c1ff7f4c06de1e86feec5dd0c13a5c1291b9');
 assert.equal(floor.toString('ascii',0,4),'RIFF');
 assert.equal(floor.toString('ascii',8,12),'WEBP');
 assert.ok(floor.length>100000,'fondale fotografico presente');
 const generator=read('tools/v541-restore-original-environment.py');
 assert.match(generator,/reference-approvata-v537\.png/);
 assert.match(generator,/panel=ref\.crop\(\(10,10,471,450\)\)/);
 assert.match(generator,/reference-ambiente-v541\.webp/);
});
test('v541: piano fotografico, poi effetto e SOLO infine il vero personaggio',()=>{
 const js=read('src/rpg-reference-compositing-v539.js');
 const css=read('stile-rpg.css');
 const positions=['grafica.appendChild(ambiente)','grafica.appendChild(luce)','grafica.appendChild(soggetto)'].map(s=>js.indexOf(s));
 assert.ok(positions.every(i=>i>0) && positions[0]<positions[1] && positions[1]<positions[2]);
 assert.match(css,/> \.rpg-reference-environment-v541\s*\{[\s\S]*?z-index:0!important/);
 assert.match(css,/background-image:url\('\.\/img\/effetti\/reference-ambienti-v542\.webp\?v=542'\)!important/);
 assert.match(css,/> \.rpg-reference-complete-v539\s*\{[\s\S]*?z-index:2!important/);
 assert.match(css,/> \.rpg-reference-subject-v539\s*\{[\s\S]*?z-index:3!important/);
});
test('v541: il PNG Shop/Atelier conserva esattamente il fondale sotto agli effetti',()=>{
 const at=read('src/rpg-atelier.js');
 const shop=read('src/anteprima-combinata-rpg.js');
 const loading=at.indexOf('reference-ambienti-v542.webp?v=542');
 const laying=at.indexOf('ctx.drawImage(ambienteV541,');
 const effect=at.indexOf('ctx.drawImage(atlanteV539,');
 assert.ok(loading>0 && laying>loading && effect>laying);
 assert.match(shop,/rpg-atelier\.js\?v=546/);
});
test('v541: foto approvata e cinque VFX originali restano immutati in cache',()=>{
 const sw=read('sw.js');
 const css=read('stile-rpg.css');
 const idx=read('index.html');
 const fx=raw('img/effetti/effetti-reference-v540.webp');
 assert.ok(fx.length>500000);
 assert.match(css,/effetti-reference-v539\.webp\?v=539/);
 assert.match(sw,/reference-ambiente-v541\.webp\?v=541/);
 assert.match(sw,/percorso\.includes\('reference-ambiente-v541\.webp'\)/);
 assert.match(sw,/const VERSIONE = 'palestra-v546'/);
 assert.match(idx,/PALESTRA_VERSIONE = 'palestra-v546'/);
});
