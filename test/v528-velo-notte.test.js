import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
import {ARMATURA_VELO_NOTTE_V528,usaRitrattoVeloNotteV528,
  CORONA_VELO_NOTTE_V528} from '../src/velo-notte-v528.js';
import {combinazioniRpg,NUMERO_COMBINAZIONI_ATELIER} from '../src/rpg-atelier.js';

const root=new URL('../',import.meta.url);
const file=path=>fileURLToPath(new URL(path.replace(/^\.\//,''),root));
const testo=path=>readFileSync(file(path),'utf8');

function dimensioniWebp(path) {
  const b=readFileSync(file(path));
  assert.equal(b.toString('ascii',0,4),'RIFF',path);
  assert.equal(b.toString('ascii',8,12),'WEBP',path);
  const chunk=b.toString('ascii',12,16);
  if(chunk==='VP8 ') {
    assert.equal(b.toString('hex',23,26),'9d012a',path);
    return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
  }
  if(chunk==='VP8X')return [b.readUIntLE(24,3)+1,b.readUIntLE(27,3)+1];
  assert.fail(`Formato WebP non previsto per ${path}: ${chunk}`);
}

test('v528: Velo della Notte resta epico dell’Assassino, prezzo e premi invariati',()=>{
  const app=testo('src/app.js');
  assert.match(app,/id:'armatura-assassino-notte'[^\n]*rarita:'Epico',prezzo:5100,classe:'assassino'/);
  assert.match(app,/assassino-notte\.webp\?v=528/);
  assert.match(app,/assassino-notte-mini\.webp\?v=528/);
  assert.equal(usaRitrattoVeloNotteV528('assassino',ARMATURA_VELO_NOTTE_V528),true);
  for(const cls of ['guerriero','berserker'])
    assert.equal(usaRitrattoVeloNotteV528(cls,ARMATURA_VELO_NOTTE_V528),false);
});

test('v528: stesso zoom 2:3 e piedi visibili in tutte le 8 fotografie nuove',()=>{
  const base='img/personaggi/armature/assassino-notte';
  assert.deepEqual(dimensioniWebp(base+'.webp'),[900,1350]);
  assert.deepEqual(dimensioniWebp(base+'-mini.webp'),[300,450]);
  const variants='img/personaggi/armatura-con-arma-v371/assassino/armatura-assassino-notte/';
  for(const fx of ['base','ambra','ombra','fulmine','nebula','astrale']) {
    assert.deepEqual(dimensioniWebp(variants+fx+'.webp'),[720,1080],fx);
    assert.ok(statSync(file(variants+fx+'.webp')).size<180_000,fx);
  }
  assert.ok(statSync(file(base+'.webp')).size<180_000);
  assert.ok(statSync(file(base+'-mini.webp')).size<35_000);
});

test('v528: 9072 combinazioni Atelier includono 3 personaggi, 6 effetti, Aura e Corona',()=>{
  const combinazioni=[...combinazioniRpg()];
  assert.equal(combinazioni.length,NUMERO_COMBINAZIONI_ATELIER);
  let velo=0;
  for(const combo of combinazioni){
    const identita=usaRitrattoVeloNotteV528(combo.classe,combo.armatura);
    if(combo.armatura===ARMATURA_VELO_NOTTE_V528) {
      assert.equal(combo.classe,'assassino');
      assert.ok(identita);
      velo++;
    } else assert.equal(identita,false);
    const foto=percorsoFotoArmaturaArmataV371({
      classe:combo.classe,stato:combo.stadio,armatura:combo.armatura||null,
      effetto:combo.effetto||null,armaSbloccata:combo.stadio>=4,
    });
    if(identita && combo.stadio>=4) {
      assert.match(foto,/armatura-assassino-notte\/base\.webp\?v=528$/,'ogni effetto conserva la stessa fotografia');
    }
    if(combo.stadio<4)assert.equal(foto,null);
  }
  assert.equal(velo,6*6*2*2*7);
});

test('v528: app e PNG esportato non sovrascrivono Velo con atlanti v360/v379',()=>{
  const app=testo('src/app.js');
  const atelier=testo('src/rpg-atelier.js');
  assert.match(app,/coronaAttiva && !veloNotteV528 \? percorsoFotoCoronaV360/);
  assert.match(app,/divina:auraDivinaAttiva && !veloNotteV528/);
  assert.match(app,/!coronaAttiva && !veloNotteV528\) montaScenaCinematograficaRpg/);
  assert.match(app,/coronaAttiva && veloNotteV528/);
  assert.match(atelier,/c\.corona && !veloNotteV528 \? percorsoFotoCoronaV360/);
  assert.match(atelier,/!veloNotteV528&&!c\.corona&&c\.divina/);
  assert.match(atelier,/veloNotteV528 && c\.corona/);
  assert.ok(testo(CORONA_VELO_NOTTE_V528).includes('viewBox="0 0 900 1350"'));
});

test('v529: versione PWA, asset online e offline allineati',()=>{
  assert.match(testo('sw.js'),/const VERSIONE = 'palestra-v549'/);
  assert.match(testo('index.html'),/PALESTRA_VERSIONE = 'palestra-v549'/);
  for(const path of ['src/velo-notte-v528.js','img/effetti/corona-velo-notte-v528.svg',
    'img/personaggi/armature/assassino-notte.webp?v=536',
    'img/personaggi/armature/assassino-notte-mini.webp?v=536'])
    assert.ok(testo('sw.js').includes(path),path);
});

// Gli effetti fotografici del Velo devono essere gli stessi del resto dello Shop,
// senza convertire Ambra/Ombra/Fulmine in nuove armature o in altri personaggi.
test('v529: stesso ritratto e livelli effetto indipendenti anche con i pugnali',()=>{
  const app=testo('src/app.js');
  const atelier=testo('src/rpg-atelier.js');
  const effetti=['effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica'];
  const percorsi=new Set(effetti.map(effetto=>percorsoFotoArmaturaArmataV371({
    classe:'assassino',stato:5,armatura:ARMATURA_VELO_NOTTE_V528,
    effetto,armaSbloccata:true,
  })));
  assert.deepEqual([...percorsi],[
    './img/personaggi/armatura-con-arma-v371/assassino/armatura-assassino-notte/base.webp?v=528'
  ]);
  assert.match(app,/const effettoVivo=!effettoRiferimento && usaEffettiViviRpg/);
  assert.match(app,/effettoVeloInLivello/);
  assert.match(atelier,/EFFETTI_APPROVATI_RPG\.includes\(c\.effetto\)/);
  assert.match(atelier,/\|\| veloNotteV528\)\&\&livelli\.length/);
  assert.doesNotMatch(testo('src/foto-armatura-armata-v371.js'),/\+fx\+'\.webp/);
});
