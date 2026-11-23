import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EFFETTI_REFERENCE_V532 } from '../src/rpg-reference-v532.js';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const css = read('stile-rpg.css');
const positions = {
  ambra:'0% 0%', ombra:'50% 0%', fulmine:'100% 0%',
  nebula:'0% 100%', astrale:'50% 100%',
};
function cssBlock(selector) {
  const start=css.indexOf(selector);
  assert.ok(start>=0,'Manca selettore '+selector);
  const open=css.indexOf('{',start),close=css.indexOf('}',open);
  assert.ok(open>start&&close>open,'Blocco CSS malformato: '+selector);
  return css.slice(open+1,close);
}
test('v544: il fondale comune non prevale sulle posizioni dei cinque effetti',()=>{
  const env=cssBlock('.personaggio-scena-grafica.rpg-reference-v532.rpg-reference-integrated-v539\n  > .rpg-reference-environment-v541 {');
  assert.doesNotMatch(env,/background-position\s*:[^;]*!important/i);
  const stage=cssBlock('.personaggio-scena-grafica.rpg-reference-v532.rpg-reference-integrated-v539.rpg-reference-stage-v543\n  > .rpg-reference-environment-v541 {');
  assert.doesNotMatch(stage,/background-position\s*:/i);
  assert.match(stage,/reference-scene-v543\.webp\?v=543/);
});
test('v544: ogni effetto seleziona la sua cella e il suo pavimento',()=>{
  const refs=Object.values(EFFETTI_REFERENCE_V532);
  assert.equal(refs.length,5);
  for(const ref of refs) {
    const expected=positions[ref.classe];
    assert.ok(expected,ref.classe);
    const selector='.rpg-reference-integrated-v539 > .rpg-reference-environment-v541.rpg-reference-'+ref.classe+'{';
    const block=cssBlock(selector);
    assert.ok(block.includes('background-position:'+expected+'!important'),
      ref.classe+' mostra una cella errata');
    const col=expected.startsWith('0%')?0:expected.startsWith('50%')?1:2;
    const row=expected.endsWith('100%')?1:0;
    assert.deepEqual([ref.colonna,ref.riga],[col,row],ref.classe);
  }
});
test('v544: il PNG usa la stessa cella della preview senza duplicare l’effetto',()=>{
  const exportJs=read('src/rpg-atelier.js');
  const comp=read('src/rpg-reference-compositing-v539.js');
  assert.match(exportJs,/riferimentoV532\.colonna\*cellW,riferimentoV532\.riga\*cellH/);
  assert.match(comp,/reference-scene-v543\.webp\?v=543/);
  const stageFx=cssBlock('.personaggio-scena-grafica.rpg-reference-v532.rpg-reference-integrated-v539.rpg-reference-stage-v543\n  > .rpg-reference-complete-v539 {');
  assert.match(stageFx,/display:none!important/);
});
test('v544: nuova cache PWA, immagini approvate v543 invariate',()=>{
  const idx=read('index.html'),sw=read('sw.js');
  assert.ok(idx.includes("PALESTRA_VERSIONE = 'palestra-v559'"));
  assert.ok(sw.includes("const VERSIONE = 'palestra-v559'"));
  for(const sheet of ['stile.css','stile-rpg.css','stile-premium.css']){
    assert.ok(idx.includes('./'+sheet+'?v=559'),sheet);
    assert.ok(sw.includes("'./"+sheet+"?v=559'"),sheet);
  }
  assert.ok(sw.includes("'./img/effetti/reference-scene-v543.webp?v=543'"));
});
