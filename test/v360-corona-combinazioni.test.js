import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSI_CORONA_V360,EFFETTI_CORONA_V360,percorsoFotoCoronaV360} from '../src/foto-corona-v360.js';
test('Corona 80: tutte le 648 combinazioni fotografiche uniche',()=>{
 const urls=new Set();
 for(const [classe,armature] of Object.entries(CLASSI_CORONA_V360))
   for(let stato=0;stato<6;stato++)
     for(const armatura of [null,...armature])
       for(const effetto of [null,...Object.keys(EFFETTI_CORONA_V360)])
         for(const divina of [false,true]) {
           const url=percorsoFotoCoronaV360({classe,stato,armatura,effetto,divina});
           assert.ok(url && url.includes('/corona-v360/'),url);
           assert.ok(!urls.has(url),'duplicate photo '+url);
           urls.add(url);
         }
 assert.equal(urls.size,648);
});
test('Nessuna corona anticipa la progressione o accetta armature di altre classi',()=>{
 assert.equal(percorsoFotoCoronaV360({classe:'assassino',stato:1,armaSbloccata:true}),null);
 assert.equal(percorsoFotoCoronaV360({classe:'guerriero',stato:5,armatura:'armatura-assassino-notte'}),null);
 assert.equal(percorsoFotoCoronaV360({classe:'berserker',stato:6}),null);
 assert.equal(percorsoFotoCoronaV360({classe:'berserker',stato:5,effetto:'effetto-x'}),null);
 assert.ok(percorsoFotoCoronaV360({classe:'guerriero',stato:4,armaSbloccata:true,divina:true}).includes('stato-4/standard/base-divina.webp'));
});
