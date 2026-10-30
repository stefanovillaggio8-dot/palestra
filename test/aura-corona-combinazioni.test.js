import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  CORONA_INFINITO_ID,statoCoronaInfinito,cambiaCoronaInfinito,
} from '../src/aura-skin.js';

test('Corona gratuita: record 80, senza anticipare lo sblocco', () => {
  for(const record of [0,13,50,75,79]){
    const s=statoCoronaInfinito({},record);
    assert.equal(s.sbloccata,false);
    assert.equal(s.equipaggiata,false);
    assert.equal(s.visibile,false);
    assert.equal(statoCoronaInfinito({},record,true).visibile,true,'anteprima senza sblocco');
    assert.throws(()=>cambiaCoronaInfinito({},true,record),/80/);
  }
  const s=statoCoronaInfinito({},80);
  assert.equal(s.equipaggiata,true,'account storici: indossata come prima');
  assert.equal(s.sbloccata,true);
});

test('Corona equipaggiabile in slot separato con tutte le combinazioni, anche tra classi', () => {
  for(const classe of ['guerriero','assassino','berserker']) {
    const prima={
      Titolo:'titolo-panca', Skin:'skin-mitica', Effetto:'effetto-fulmine',
      Armatura:'armatura-'+classe+'-braci', Altra:'valore-personalizzato',
    };
    const spento=cambiaCoronaInfinito(prima,false,80);
    assert.equal(spento.Corona,'nessuna');
    assert.equal(statoCoronaInfinito(spento,80).equipaggiata,false);
    assert.deepEqual(Object.fromEntries(Object.entries(spento).filter(([k])=>k!=='Corona')),prima);
    const acceso=cambiaCoronaInfinito(spento,true,80);
    assert.equal(acceso.Corona,CORONA_INFINITO_ID);
    assert.equal(statoCoronaInfinito(acceso,80).visibile,true);
    assert.deepEqual(Object.fromEntries(Object.entries(acceso).filter(([k])=>k!=='Corona')),prima);
    assert.deepEqual(Object.keys(prima).sort(),Object.keys(prima).sort(),'nessuna proprieta persa');
  }
});

test('La Corona non costa Aura e la preview conserva tutti gli slot',async()=>{
  const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const fx=await readFile(new URL('../src/effetti-rpg-canvas.js',import.meta.url),'utf8');
  assert.match(app,/aggiornaEquipaggiamentoRpg\(profilo\.equipaggiamento_aura,oggetto,true\)/);
  assert.match(app,/cambiaCoronaInfinito\(profiloCorrente\.equipaggiamento_aura/);
  assert.match(app,/Corona dell.Infinito/);
  assert.match(app,/mitica: astraleAttiva/);
  assert.match(app,/rpg-corona-premium/);
  assert.match(app,/effettoEquipaggiato\?\.id \|\| null/);
  assert.match(fx,/mitica && tipo!=='effetto-nebula'/);
  assert.match(fx,/if\(divina && corona\)/);
  assert.doesNotMatch(app,/acquistaOggettoAura\(\{[^}]*corona-infinito/s);
});
