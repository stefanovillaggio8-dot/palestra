import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EFFETTI_REFERENCE_V532} from '../src/rpg-reference-v532.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=p=>readFileSync(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');

test('v542: asset fotografico sfumato, senza modificare reference ed effetti',()=>{
 const atlas=data('img/effetti/reference-ambienti-v542.webp');
 const old=data('img/effetti/reference-ambiente-v541.webp');
 const magic=data('img/effetti/effetti-reference-v539.webp');
 assert.equal(sha(atlas),'f8257ee3a0ace4c02ebc2d5b917b8d578eee52d9');
 assert.equal(sha(old),'b5f2c1ff7f4c06de1e86feec5dd0c13a5c1291b9');
 assert.equal(sha(magic),'d3e6e78596b391ffbcbfb94659d97234c82cee7e');
 assert.equal(atlas.toString('ascii',0,4),'RIFF');
 assert.equal(atlas.toString('ascii',8,12),'WEBP');
 assert.ok(atlas.length>250000);
 const generator=read('tools/build-reference-environments-v542.py');
 assert.match(generator,/assert al\[:,0\]\.max\(\)<=3/);
 assert.match(generator,/assert al\[int\(\.87\*H\),W\/\/2\]>=140/);
});
test('v542: cinque sfondi distinti hanno la stessa mappatura della magia',()=>{
 const css=read('stile-rpg.css');
 const map={ambra:'0% 0%',ombra:'50% 0%',fulmine:'100% 0%',nebula:'0% 100%',astrale:'50% 100%'};
 assert.equal(Object.keys(EFFETTI_REFERENCE_V532).length,5);
 assert.ok(css.includes("background-image:url('./img/effetti/reference-ambienti-v542.webp?v=542')!important"));
 assert.ok(css.includes('background-size:300% 200%!important'));
 for(const ref of Object.values(EFFETTI_REFERENCE_V532)){
  const className='.rpg-reference-environment-v541.rpg-reference-'+ref.classe;
  const i=css.indexOf(className);
  assert.ok(i>0,ref.classe);
  assert.ok(css.slice(i,i+125).includes('background-position:'+map[ref.classe]+'!important'),ref.classe);
 }
 assert.ok(!css.includes("background-image:url('./img/effetti/reference-ambiente-v541.webp?v=541')!important"));
});
test('v542: foto del personaggio sopra e pavimento sotto, no maschera che taglia',()=>{
 const app=read('src/app.js'),comp=read('src/rpg-reference-compositing-v539.js'),css=read('stile-rpg.css');
 for(const s of ['grafica.appendChild(ambiente)','grafica.appendChild(luce)','grafica.appendChild(soggetto)'])
  assert.ok(comp.includes(s));
 assert.ok(css.includes('> .rpg-reference-environment-v541 {'));
 assert.ok(css.includes('> .rpg-reference-subject-v539 {'));
 assert.ok(css.includes('z-index:0!important')&&css.includes('z-index:3!important'));
 assert.ok(comp.includes("grafica.classList?.add?.('rpg-reference-integrated-v539'"));
 assert.ok(app.includes('montaReferenceScontornataV539(grafica,fotoRpg,classeId,effettoRiferimento'));
});
test('v542: export PNG seleziona la cella corretta per classe e mantiene il suolo',()=>{
 const at=read('src/rpg-atelier.js'),shop=read('src/anteprima-combinata-rpg.js');
 assert.ok(at.includes('reference-ambienti-v542.webp?v=542'));
 assert.ok(at.includes('ambienteV541.naturalWidth/3,envH=ambienteV541.naturalHeight/2'));
 assert.ok(at.includes('riferimentoV532.colonna*envW,riferimentoV532.riga*envH,envW,envH'));
 assert.ok(at.indexOf('ctx.drawImage(ambienteV541,')<at.indexOf('ctx.drawImage(atlanteV539,'));
 assert.match(shop,/rpg-atelier\.js\?v=547/);
});
test('v542: PWA offline ha effetti e fondali nuovi, versione coerente',()=>{
 const sw=read('sw.js'),idx=read('index.html');
 assert.match(sw,/const VERSIONE = 'palestra-v547'/);
 assert.match(idx,/PALESTRA_VERSIONE = 'palestra-v547'/);
 assert.ok(sw.includes("'./img/effetti/reference-ambienti-v542.webp?v=542'"));
 assert.ok(sw.includes("percorso.includes('reference-ambienti-v542.webp')"));
 assert.ok(sw.includes("'./img/effetti/effetti-reference-v539.webp?v=539'"));
});
