import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {montaFotoRpg,livelliFotoRpg} from '../src/aura-foto-rpg.js';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v363: asset originale presente e non cambia le immagini Streak',()=>{
 const path=new URL('../img/effetti/aura-divina-v364.webp',import.meta.url);
 assert.ok(existsSync(path));
 const bytes=readFileSync(path);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.ok(statSync(path).size>30000,'Missing magic detail');
 assert.ok(existsSync(new URL('../docs/aura-divina-v364-confronto.jpg',import.meta.url)));
});
test('v363: nuovo effetto standalone senza vecchia texture Divina',t=>{
 const old=globalThis.document;
 t.after(()=>{if(old===undefined)delete globalThis.document;else globalThis.document=old;});
 const children=[];
 globalThis.document={createElement(type){
    assert.equal(type,'div');return {className:'',style:{},setAttribute(){}};}};
 const parent={appendChild(el){children.push(el)},classList:{add(){}}};
 assert.equal(montaFotoRpg(parent,null,{divina:true}),true);
 assert.equal(children.length,1);
 assert.match(children[0].className,/aura-foto-divina/);
 assert.match(children[0].style.backgroundImage,/aura-divina-v364\.webp\?v=364/);
 assert.equal(children[0].style.backgroundSize,'100% 100%');
 assert.deepEqual(livelliFotoRpg(null,{divina:true}),[{id:'divina',ruolo:'streak'}]);
});
test('v363: effetto anche con la corona, senza overlay vecchio bruciato nella foto',()=>{
 const app=source('src/app.js');
 assert.match(app,/divina:false, \/\/ Aura v363/);
 assert.match(app,/divina: auraDivinaAttiva, \/\/ Nuovo effetto v363/);
 assert.doesNotMatch(app,/divina: auraDivinaAttiva && !fotoCoronaRpg/);
 assert.match(app,/statoFotoConsentito/);
 assert.match(app,/armaSbloccataRpg/);
});
test('v363: volto intatto, salvataggio con lo stesso effetto e cache offline',()=>{
 const css=source('stile-rpg.css');
 const patch=css.slice(css.lastIndexOf('/* v363: Aura Divina'));
 assert.match(patch,/mask-image:none!important/);
 assert.match(patch,/mix-blend-mode:normal!important/);
 const photos=source('src/anteprima-combinata-rpg.js');
 assert.match(photos,/img\/effetti\/aura-divina-v364\.webp\?v=364/);
 assert.match(photos,/ctx\.drawImage\(magica,0,0,out\.width,out\.height\)/);
 const sw=source('sw.js'),html=source('index.html');
 assert.match(sw,/aura-divina-v364\.webp\?v=364/);
 assert.match(sw,/palestra-v365/);
 assert.match(html,/palestra-v365/);
});
