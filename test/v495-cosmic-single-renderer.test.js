import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const codice=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const nuovaScena=readFileSync(new URL('../src/rpg-scena-cosmica.js',import.meta.url),'utf8');

test('v495: una sola animazione per Astrale e Nebulosa, senza canvas legacy nascosto',()=>{
  // Il vecchio renderer resta per Ambra e Fulmine, ma non e' montato per i
  // due effetti cosmici. La scena v494 ha già un loop condiviso per i 2 piani.
  const posCanvas=codice.indexOf('montaEffettiRpg(grafica, effettoVivo');
  const inizioGuardia=codice.lastIndexOf('if (!effettoCosmicoAttivo',posCanvas);
  assert.ok(posCanvas>0 && inizioGuardia>0,'guardia canvas vecchio assente');
  const guardia=codice.slice(inizioGuardia,posCanvas);
  assert.match(guardia,/!fotoCoronaRpg && !fotoArmaturaArmataRpg/);
  assert.match(guardia,/\(effettoVivo \|\| \(!scenaFotografica && !combinata\)\)/);
  assert.match(codice,/montaScenaCosmicaRpg\(scena,grafica,/);
  assert.match(nuovaScena,/montaEnergiaIncarnataRpg\(palco,grafica,foto,/);
  assert.equal((nuovaScena.match(/montaEnergiaIncarnataRpg\(palco,grafica,foto,/g)||[]).length,1);
});
