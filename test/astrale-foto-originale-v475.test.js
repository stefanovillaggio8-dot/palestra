import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {percorsoScenaSpecialeRpg,FOTO_EFFETTI_PREMIUM_RPG} from '../src/foto-cinematica-rpg.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));

test('v475: il ritratto mitico Assassino e una nuova fotografia autonoma',()=>{
 const path='img/personaggi/effetti/assassino-astrale-mitico-v475.avif';
 const bytes=read(path);
 assert.ok(bytes.length>5000);
 assert.equal(bytes.toString('ascii',4,8),'ftyp');
 assert.match(bytes.toString('ascii',8,40),/avif/);
 assert.equal(percorsoScenaSpecialeRpg({classe:'assassino',stato:1,skin:'skin-mitica'}),path+'?v=475');
 assert.equal(percorsoScenaSpecialeRpg({classe:'assassino',stato:5,skin:'skin-mitica',armaSbloccata:true}),path+'?v=475');
 assert.match(percorsoScenaSpecialeRpg({classe:'assassino',stato:5,skin:'skin-mitica',armatura:'armatura-assassino-notte',armaSbloccata:true}),/armatura-assassino-notte\/astrale\.webp/);
 for(const classe of ['guerriero','berserker'])assert.match(FOTO_EFFETTI_PREMIUM_RPG[classe]['skin-mitica'],new RegExp(classe+'-astrale'));
});
test('v475: ritratto mitico prioritario rispetto ai layer incollati',()=>{
 const app=read('src/app.js').toString();
 const cinema=read('src/foto-cinematica-rpg.js').toString();
 const sw=read('sw.js').toString();
 assert.match(app,/astraleConFotoIntegrale/);
 assert.match(app,/!astraleConFotoIntegrale && !auraDivinaAttiva && usaEffettiViviRpg/);
 assert.match(app,/const combinata = !astraleConFotoIntegrale/);
 assert.match(app,/if \(!astraleConFotoIntegrale && \(\(astraleAttiva && effettoVivo\)/);
 assert.match(cinema,/if\(opzioni.skin==='skin-mitica'\)/);
 assert.match(cinema,/rpg-astrale-presenza/);
 assert.match(sw,/assassino-astrale-mitico-v475.avif\?v=475/);
 assert.match(sw,/palestra-v475/);
 assert.match(read('index.html').toString(),/palestra-v475/);
});
