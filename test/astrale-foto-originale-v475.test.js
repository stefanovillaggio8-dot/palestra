import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  percorsoScenaSpecialeRpg,percorsoCombinazioneFotoRpg,
  indiceScenaCinematograficaRpg,montaScenaCinematograficaRpg
} from '../src/foto-cinematica-rpg.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v476 corregge regressione v475: il Mitico NON è una skin nuova',()=>{
 for(const classe of ['assassino','guerriero','berserker']){
   for(const stato of [0,1,3,4,5]){
     const config={classe,stato,skin:'skin-mitica',armaSbloccata:stato>=4};
     assert.equal(percorsoScenaSpecialeRpg(config),null,'foto sostitutiva '+classe);
     assert.equal(percorsoCombinazioneFotoRpg(config),null,'collage sostitutivo '+classe);
     assert.equal(indiceScenaCinematograficaRpg(config),null,'collage 3x3 '+classe);
   }
 }
 assert.equal(montaScenaCinematograficaRpg({}, {}, {classe:'assassino',skin:'skin-mitica'}),false);
});

test('v476 conserva foto, progressione, armi e slot Effetto con Corona o Armatura',()=>{
 const app=read('src/app.js'),atelier=read('src/rpg-atelier.js');
 assert.doesNotMatch(app,/astraleConFotoIntegrale/);
 assert.match(app,/const effettoVivo=!auraDivinaAttiva && usaEffettiViviRpg/);
 assert.match(app,/const combinata = !astraleAttiva/);
 assert.match(app,/if\(scenaRichiesta && !astraleAttiva/);
 assert.match(app,/effetto:astraleAttiva \? null : effettoEquipaggiato\?\.id/);
 assert.match(atelier,/disegnaAstraleExport\(ctx/);
 assert.match(atelier,/c\.effetto==='skin-mitica'\?null/);
 assert.match(read('sw.js'),/palestra-v476/);
 assert.match(read('index.html'),/palestra-v476/);
 assert.doesNotMatch(read('sw.js'),/assassino-astrale-mitico-v475\.avif/);
});
