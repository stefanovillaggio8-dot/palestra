import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {EFFETTI_REFERENCE_V532, ATLANTE_REFERENCE_V536} from '../src/rpg-reference-v532.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('v536: atlante alpha autentico, cinque texture senza personaggi',()=>{
 const b=readFileSync(new URL('../img/effetti/effetti-reference-v536.webp',import.meta.url));
 const sha=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
 assert.equal(sha,'0a2a2ff036f1547f1cab3af4159bc70a7f678e2c');
 assert.equal(b.toString('ascii',0,4),'RIFF');
 assert.equal(b.toString('ascii',8,12),'WEBP');
 assert.ok(b.length>500_000 && b.length<1_600_000);
 assert.match(ATLANTE_REFERENCE_V536,/v536\.webp\?v=536/);
 assert.equal(Object.keys(EFFETTI_REFERENCE_V532).length,5);
});
test('v536: nuova reference in Shop, PWA, Atelier con margini senza crop',()=>{
 const css=read('stile-rpg.css'),a=read('src/rpg-atelier.js'),sw=read('sw.js');
 assert.match(css,/effetti-reference-v539\.webp\?v=539/);
 assert.match(css,/width:164%!important/);
 assert.match(css,/overflow:visible!important/);
 assert.match(css,/mask-image:none!important/);
 assert.match(a,/effetti-reference-v539\.webp\?v=539/);
 assert.match(a,/larghezza=riferimentoV532\?1500:780/);
 assert.match(a,/dx-dw\*\.32,dy-dh\*\.04,dw\*1\.64,dh\*1\.08/);
 assert.match(sw,/effetti-reference-v536\.webp\?v=536/);
 assert.match(sw,/const VERSIONE = 'palestra-v555'/);
 assert.match(read('index.html'),/PALESTRA_VERSIONE = 'palestra-v555'/);
});
