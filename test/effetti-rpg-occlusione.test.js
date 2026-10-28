import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CONTORNI_RPG, bordoSagomaRpg, montaEffettiRpg } from '../src/effetti-rpg-canvas.js';

test('Silhouette distinte proteggono i corpi e le armi RPG', () => {
  assert.deepEqual(Object.keys(CONTORNI_RPG).sort(),['assassino','berserker','guerriero']);
  for (const classe of Object.keys(CONTORNI_RPG)) {
    let ultima=-1;
    for (const [y,l,r] of CONTORNI_RPG[classe]) {
      assert.ok(y>ultima && l>=0 && r<=1 && l<.5 && r>.5,classe+' contorni validi');
      ultima=y;
    }
    for (const y of [.04,.18,.38,.55,.75,.95]) {
      const [l,r]=bordoSagomaRpg(classe,y);
      assert.ok(l<.5 && r>.5,'corpo occultato '+classe+' '+y);
    }
  }
  assert.ok(bordoSagomaRpg('berserker',.45)[0] < bordoSagomaRpg('assassino',.45)[0]);
  assert.ok(bordoSagomaRpg('guerriero',.45)[1] > bordoSagomaRpg('assassino',.45)[1]);
});

test('Effetti: ambienti distinti e cancellazione del corpo dopo il rendering', async () => {
  const file=await readFile(new URL('../src/effetti-rpg-canvas.js',import.meta.url),'utf8');
  for(const fn of ['amber','smoke','arc','nebula','cancellaCorpo','aura']) {
    assert.ok(file.includes('function '+fn+'('),fn);
  }
  assert.match(file,/globalCompositeOperation='destination-out'/);
  const render=file.slice(file.indexOf('function render(t)'));
  assert.ok(render.indexOf('cancellaCorpo();')<render.indexOf('aura(t);'),
    'gli effetti attraversanti vengono cancellati prima della corona');
  assert.match(file,/createRadialGradient/);
  assert.match(file,/shadowBlur/);
  assert.doesNotMatch(file,/acquistaAura|modificaRank/);
});

test('Le anteprime non cambiano i livelli Streak o il saldo', async () => {
  const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const start=app.indexOf('function vistaAuraShop(');
  const shop=app.slice(start,start+15500);
  assert.ok(start>0);
  assert.doesNotMatch(shop,/aura-shop-card-art/);
  assert.doesNotMatch(shop,/aura-shop-character-preview/);
  assert.match(shop,/apriAnteprimaAura\(o, profiloAttivo\(\), statoMio\(\)\)/);
  for (const classe of ['guerriero','assassino','berserker']) {
    assert.equal(typeof montaEffettiRpg({},'effetto-ambra',{classe}),'function');
  }
});
