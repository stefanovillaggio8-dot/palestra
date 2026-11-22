import {test} from 'node:test';
import {readFileSync} from 'node:fs';
test('audit reference v537: ultimi intervalli mancanti',()=>{
 const b=readFileSync(new URL('../img/effetti/effetti-reference-v537.webp',import.meta.url)).toString('base64');
 for(const [start,end] of [[879177,880000],[977295,978000],[1042589,1044000],[1057627,1060000],[1123067,1128000],[1188537,1194000]]){
  console.log('AUDIT_GAP:'+start+':'+b.slice(start,end));
 }
});
