import test from 'node:test';
import assert from 'node:assert/strict';
import { ordinaRecordRank, confrontaRecordRank, RANK_IN_ORDINE } from '../src/rank-ordina.js';
import { readFileSync } from 'node:fs';
const rec=(rankId,divisione,lp,nome,valido=true)=>({rankId,divisione:divisione?{id:divisione,nome:['','I','II','III'][divisione]}:null,lp,esercizio:{nome,id:nome},valido});
test('MY RANKS ordered top to bottom with all ranks',()=>{
 const arr=[
 rec('bronze',1,10,'Bronze'),rec('diamond',2,40,'Diamond'),
 rec('olympian',null,4,'Olympian'),rec('platinum',3,89,'Platinum'),
 rec('titan',1,8,'Titan'),rec('gold',3,70,'Gold'),
 rec('silver',3,90,'Silver')
 ];
 assert.deepEqual(ordinaRecordRank(arr).map(x=>x.rankId),RANK_IN_ORDINE);
 assert.equal(arr[0].rankId,'bronze','must not mutate original data');
});
test('III > II > I and within division higher LP first',()=>{
 const records=[rec('gold',1,33,'A'),rec('gold',3,80,'B'),
 rec('gold',2,55,'C'),rec('gold',3,94,'D'),rec('gold',1,10,'E')];
 assert.deepEqual(ordinaRecordRank(records).map(x=>x.esercizio.nome),['D','B','C','A','E']);
});
test('Olympian has no divisions: sort only by LP',()=>{
 const arr=[rec('olympian',3,14,'A'),rec('olympian',1,230,'B'),rec('titan',3,90,'C')];
 assert.deepEqual(ordinaRecordRank(arr).map(x=>x.esercizio.nome),['B','A','C']);
});
test('missing ranks are at the bottom with stable exercise name tie-break',()=>{
 const x=[rec(null,null,0,'Z',false),rec('bronze',1,0,'A'),
 rec(null,null,0,'A',false),rec('titan',3,72,'T')];
 assert.deepEqual(ordinaRecordRank(x).map(i=>i.esercizio.nome),['T','A','A','Z']);
 assert.equal(confrontaRecordRank(rec('bronze',2,40,'X'),rec('silver',1,1,'Y'))>0,true);
});
test('live page uses the comparator and new offline module is cached',()=>{
 const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const app=file('src/app.js'),sw=file('sw.js'),html=file('index.html');
 assert.match(app,/for \(const r of ordinaRecordRank\(stato\.record\)\)/);
 assert.match(app,/from '\.\/rank-ordina\.js'/);
 assert.match(sw,/'\.\/src\/rank-ordina\.js'/);
 assert.match(html,/palestra-v385/);
 assert.match(sw,/palestra-v385/);
});
