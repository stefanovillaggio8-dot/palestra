import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import { GRADI_RANK, divisioneStemma, nomeStemma, percorsoStemma, tutteLeGraficheRank } from '../src/rank-stemmi.js';
const f=p=>new URL('../'+p,import.meta.url);
test('19 distinct rank crests, matching every progression division',()=>{
 const all=tutteLeGraficheRank();
 assert.equal(all.length,19);
 assert.equal(new Set(all.map(r=>r.nome)).size,19);
 assert.equal(new Set(all.map(r=>r.src)).size,19);
 assert.equal(GRADI_RANK.length,7);
 for(const r of all){
  const p=r.src.replace(/^\.\//,'').replace(/\?v=383$/,'');
  assert.ok(existsSync(f(p)),p);
  const source=readFileSync(f(p),'utf8');
  assert.match(source,/<svg/);
  assert.match(source,/<\/svg>/);
  assert.match(source,/<text/);
  assert.match(source,/<linearGradient/);
 }
});
test('Bronze through Titan have I II III, Olympian is exactly one rank',()=>{
 for(const id of ['bronze','silver','gold','platinum','diamond','titan']){
  assert.equal(divisioneStemma(id,0),1);
  assert.equal(divisioneStemma(id,34),2);
  assert.equal(divisioneStemma(id,67),3);
  for(const d of [1,2,3]){
    assert.ok(nomeStemma(id,d).endsWith(['','I','II','III'][d]));
    assert.ok(percorsoStemma(id,d).endsWith('-'+d+'.svg?v=383'));
  }
 }
 assert.equal(divisioneStemma('olympian',99,{id:3,nome:'III'}),null);
 assert.equal(nomeStemma('olympian',{id:2,nome:'II'},15),'OLYMPIAN');
 assert.equal(percorsoStemma('olympian',{id:1,nome:'I'}),'./img/rank-stemmi-v383/olympian.svg?v=383');
 assert.equal(tutteLeGraficheRank().filter(r=>r.id==='olympian').length,1);
});
test('all rank surfaces use crest artwork and the offline precache includes it',()=>{
 const app=readFileSync(f('src/app.js'),'utf8');
 const sw=readFileSync(f('sw.js'),'utf8');
 const html=readFileSync(f('index.html'),'utf8');
 assert.match(app,/function badgeRank\(rankId, lp, divisione\)/);
 assert.match(app,/class: 'rank-stemma-icona'/);
 assert.match(app,/tutteLeGraficheRank\(\)/);
 assert.match(app,/\['stemmi', 'STEMMI'\]/);
 assert.match(sw,/'\.\/src\/rank-stemmi\.js'/);
 assert.match(sw,/rank-stemmi-v383/);
 assert.match(html,/palestra-v383/);
 assert.match(sw,/palestra-v383/);
});
