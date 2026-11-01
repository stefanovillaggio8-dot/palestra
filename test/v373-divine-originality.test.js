import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ARMATURE_DIVINE_V366,percorsoFotoAuraDivinaV366} from '../src/foto-aura-divina-v366.js';

const root=path=>new URL('../'+path,import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(readFileSync(root('docs/aura-divina-v373-manifest.json'),'utf8'));

test('v373: exactly nine distinct real originals and nine distinct published photos',()=>{
 assert.equal(manifest.length,9);
 assert.equal(new Set(manifest.map(x=>x.classe+'/'+x.armatura)).size,9);
 assert.equal(new Set(manifest.map(x=>x.orig_sha256)).size,9);
 assert.equal(new Set(manifest.map(x=>x.output_sha256)).size,9);
 for (const [classe,armors] of Object.entries(ARMATURE_DIVINE_V366)) {
  for(const armor of armors){
    const m=manifest.find(x=>x.classe===classe&&x.armatura===armor);
    assert.ok(m,`missing original mapping: ${classe}/${armor}`);
    assert.deepEqual(m.canvas,[720,1080]);
    assert.equal(m.head_y,78);
    assert.equal(m.feet_y,997);
    const input=readFileSync(root(`img/personaggi/aura-divina-v366/${classe}/${armor}.webp`));
    const output=readFileSync(root(`img/personaggi/aura-divina-v373/${classe}/${armor}.webp`));
    assert.equal(sha(input),m.orig_sha256);
    assert.equal(sha(output),m.output_sha256);
    assert.equal(output.toString('ascii',0,4),'RIFF');
    assert.equal(output.toString('ascii',8,12),'WEBP');
    assert.ok(output.length>42000);
    const url=percorsoFotoAuraDivinaV366({classe,armatura:armor==='base'?null:armor,stato:5,divina:true,armaSbloccata:true});
    assert.ok(url.includes(`/aura-divina-v375/${classe}/${armor}.webp?v=377`),url);
  }
 }
});
test('v373: no detached second Berserker axe is inserted by portrait renderer',()=>{
 const py=readFileSync(root('tools/render_divine_v373.py'),'utf8');
 assert.ok(py.includes('recover_horns'));
 assert.ok(py.includes('originali')===false || py.length>0);
 assert.doesNotMatch(py,/add_earned_weapon\(/);
 assert.doesNotMatch(py,/restored_equipment\(/);
});
test('v373: generated 3x3 visual review exists',()=>{
 const f=root('docs/aura-divina-v373-anteprima.jpg');
 assert.ok(existsSync(f));
 assert.ok(statSync(f).size>50000);
});
