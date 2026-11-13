import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../stile-rpg.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/rpg-energia-incarnata.js',import.meta.url),'utf8');

test('v496: i due canvas e il fondale seguono la foto anche nell’anteprima iPhone',()=>{
  const blocks=[
    '.personaggio-scena > .rpg-cosmic-stage > .rpg-foto-fondale',
    '.personaggio-scena > .rpg-cosmic-stage > :is(.rpg-energia-retro,.rpg-energia-fronte)',
  ];
  for(const selector of blocks){
    const start=css.indexOf(selector+' {');
    assert.ok(start>=0,'Regola mancante: '+selector);
    const declarations=css.slice(start,css.indexOf('}',start))
      .replace(/\/\*[\s\S]*?\*\//g,'');
    assert.doesNotMatch(declarations,/inset\s*:\s*auto\s*!important/i,
      'inset !important annulla top/left inline e fa cadere il VFX sotto il ritratto');
    assert.match(declarations,/right\s*:\s*auto\s*!important/i);
    assert.match(declarations,/bottom\s*:\s*auto\s*!important/i);
    assert.doesNotMatch(declarations,/(?:top|left)\s*:[^;]*!important/i);
  }
  assert.match(js,/fondale\.style\.left=\(fr\.left-pr\.left\)/);
  assert.match(js,/fondale\.style\.top=\(fr\.top-pr\.top\)/);
  assert.match(js,/can\.style\.left=\(fr\.left-pr\.left\)/);
  assert.match(js,/can\.style\.top=\(fr\.top-pr\.top\)/);
});
