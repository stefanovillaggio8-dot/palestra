import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v554: five photo effects get a SINGLE unframed artwork stage only in previews',()=>{
  const css=read('stile-rpg.css'),app=read('src/app.js');
  assert.ok(app.includes("if(referenceAnteprima)scena.classList.add('aura-preview-reference-scene')"));
  assert.ok(css.includes('.aura-preview-panel .aura-preview-reference-scene .aura-preview-character'));
  assert.ok(css.includes('.aura-preview-panel .aura-preview-reference-scene .personaggio-scena'));
  assert.ok(css.includes('.rpg-atelier-stage:has(.rpg-reference-v532) .rpg-atelier-avatar'));
  assert.ok(css.includes('border:0!important'));
  assert.ok(css.includes('background:transparent!important'));
  assert.ok(css.includes('width:min(67.5%,275px)!important'));
  assert.ok(!css.includes('margin-block-end:clamp(54px,17%,76px)!important'));
  assert.ok(css.includes('margin:0 auto clamp(28px,10.5%,48px)!important'));
  assert.ok(css.includes('.personaggio-scena > .personaggio-dati'));
});

test('v554: no clipping or overlap for all five original effect scenes at phone widths',()=>{
  const css=read('stile-rpg.css'),compositor=read('src/rpg-reference-compositing-v539.js');
  for(const width of [245,275,350,420]){
    const subjectWidth=Math.min(width*.675,275);
    const imageHeight=subjectWidth*1.5;
    const sceneryHeight=subjectWidth*1.48*(710/626);
    const sceneryBottom=-imageHeight*.03+sceneryHeight;
    const bottomMargin=Math.min(48,Math.max(28,width*.105));
    assert.ok(sceneryBottom<=imageHeight+bottomMargin,
      'Floor overlaps caption at container width '+width);
    assert.ok(subjectWidth*1.48<=width*1.001,
      'Stage exceeds width at container width '+width);
  }
  assert.ok(css.includes('overflow:visible!important'));
  assert.ok(css.includes('width:148%!important'));
  assert.ok(css.includes("approved-environments-v548.webp?v=548"));
  assert.ok(compositor.includes('soggetto.src=alpha||url'));
  assert.ok(!compositor.includes('approved-showcase-v550.webp'));
});

test('v554: PWA and CSS versions are updated without changing original atlas',()=>{
  const index=read('index.html'),sw=read('sw.js'),app=read('src/app.js');
  assert.ok(index.includes("PALESTRA_VERSIONE = 'palestra-v559'"));
  assert.ok(sw.includes("const VERSIONE = 'palestra-v559'"));
  assert.ok(index.includes('./stile-rpg.css?v=559'));
  assert.ok(app.includes("./rpg-reference-compositing-v539.js?v=559"));
  assert.ok(sw.includes("'./img/effetti/approved-environments-v548.webp?v=548'"));
});
