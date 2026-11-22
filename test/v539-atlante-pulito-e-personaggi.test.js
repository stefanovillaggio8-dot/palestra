import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const gitSha=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');

test('v539: effettivamente installato atlante pulito diverso dal collage residuo',()=>{
 const old=readFileSync(new URL('../img/effetti/effetti-reference-v537.webp',import.meta.url));
 const cleaned=readFileSync(new URL('../img/effetti/effetti-reference-v539.webp',import.meta.url));
 assert.equal(gitSha(old),'287de8fefd706c42aff149e98cf0c6c5a6a4e384');
 assert.equal(gitSha(cleaned),'d3e6e78596b391ffbcbfb94659d97234c82cee7e');
 assert.notDeepEqual(cleaned,old);
 assert.equal(cleaned.toString('ascii',0,4),'RIFF');
 assert.equal(cleaned.toString('ascii',8,12),'WEBP');
 assert.ok(cleaned.length>200000 && cleaned.length<1300000);
 // L'immagine approvata originale non viene mai alterata.
 const png=readFileSync(new URL('../img/effetti/reference-approvata-v537.png',import.meta.url));
 assert.equal(gitSha(png),'258a2fd9f0c2e4d61246cd48a76ae8205f6226bb');
});
test('v539: cinque FX separati dal personaggio; nessuna foto rettangolare sovrapposta',()=>{
 const css=read('stile-rpg.css'),app=read('src/app.js');
 const compositor=read('src/rpg-reference-compositing-v539.js');
 assert.match(css,/\.rpg-reference-integrated-v539[\s\S]*?> \.personaggio-ritratto\s*\{[\s\S]*?opacity:0!important/);
 assert.match(css,/\.rpg-reference-complete-v539\s*\{[\s\S]*?z-index:2!important/);
 assert.match(css,/\.rpg-reference-subject-v539\s*\{[\s\S]*?z-index:3!important/);
 assert.match(css,/effetti-reference-v539\.webp\?v=539/);
 assert.match(app,/montaReferenceScontornataV539\(grafica,fotoRpg,classeId,effettoRiferimento/);
 assert.match(compositor,/percorsoRitaglioCosmicoRpg\(url\)/);
 assert.match(compositor,/verificaIntegritaRitaglioRpg\(soggetto,documento\)/);
 assert.match(compositor,/mascheraArmaturaCosmicaRpg\(idArmatura,documento,corona,arma\)/);
});
test('v539: tutti i 18 ritagli classici hanno alpha validato dal manifesto',()=>{
 const manifest=JSON.parse(read('img/personaggi/cutout/stati/manifest-v491.json'));
 assert.equal(manifest.expected,18);
 assert.equal(manifest.validated,18);
 for(const classe of ['assassino','guerriero','berserker'])
  for(let i=0;i<6;i++){
    const key=classe+'-'+i;
    assert.equal(manifest.results[key]?.valid,true,key);
    assert.ok(readFileSync(new URL('../img/personaggi/cutout/stati/'+key+'.webp',import.meta.url)).length>20000);
  }
});
test('v539: anteprima, foto PNG, Shop, cache PWA stessa source RGB',()=>{
 const sw=read('sw.js'),index=read('index.html'),atelier=read('src/rpg-atelier.js');
 const shopExport=read('src/anteprima-combinata-rpg.js');
 assert.match(sw,/const VERSIONE = 'palestra-v551'/);
 assert.match(index,/PALESTRA_VERSIONE = 'palestra-v551'/);
 assert.match(sw,/img\/effetti\/effetti-reference-v539\.webp\?v=539/);
 assert.match(sw,/src\/rpg-reference-compositing-v539\.js\?v=551/);
 assert.match(atelier,/effetti-reference-v539\.webp\?v=539/);
 assert.ok(atelier.includes('const riferimentoCompleto=Boolean(ritaglioEsportabile&&'));
 assert.ok(atelier.includes('(palcoDinamicoV548||palcoFotoV547||palcoFotoV546||palcoFotoV545||palcoCompleto||atlanteV539)'));
 assert.match(atelier,/ctx\.drawImage\(atlanteV539,/);
 assert.match(shopExport,/rpg-atelier\.js\?v=551/);
});
