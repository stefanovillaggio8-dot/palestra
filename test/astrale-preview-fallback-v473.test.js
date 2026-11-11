import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {equipaggiamentoRpgUnico,aggiornaEquipaggiamentoRpg,slotPerOggettoRpg} from '../src/equipaggiamento-rpg.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v473: il fallback Astrale sopravvive alle scene fotografiche che nascondono il Canvas',()=>{
  const css=read('stile-rpg.css');
  assert.match(css,/shop-skin-mitica > \.rpg-astrale-presenza \{/);
  assert.match(css,/display:block!important;[\s\S]{0,180}z-index:18;/);
  assert.match(css,/rpg-astrale-orbita-sx/);
  assert.match(css,/rpg-astrale-orbita-dx/);
  assert.match(css,/rpg-astrale-scintilla/);
  const cinema=css.slice(css.indexOf('.personaggio-scena-grafica.rpg-scena-cinematografica\n'),
    css.indexOf('/* v345',css.indexOf('.personaggio-scena-grafica.rpg-scena-cinematografica\n')));
  assert.doesNotMatch(cinema,/rpg-astrale-presenza/,
    'le scene fotografiche non devono nascondere la presenza Astrale');
  assert.match(css,/prefers-reduced-motion:reduce/);
  const app=read('src/app.js');
  assert.match(app,/if \(astraleAttiva\) \{[\s\S]{0,950}rpg-astrale-presenza/);
  assert.match(app,/const auraDivinaAttiva=auraDivinaAnteprima \|\| \(Boolean\(viso\.aura\) && !effettoEquipaggiato && !astraleAttiva\)/);
});
test('v473: lo slot Effetto Astrale prevale in preview senza cambiare gli altri slot',()=>{
  const base={Effetto:'effetto-nebula',Armatura:'armatura-assassino-notte',Titolo:'titolo-cardio'};
  const oggetto={id:'skin-mitica',tipo:'Effetto'};
  assert.equal(slotPerOggettoRpg(oggetto),'Effetto');
  const updated=aggiornaEquipaggiamentoRpg(base,oggetto,true);
  assert.equal(updated.Effetto,'skin-mitica');
  assert.equal(updated.Armatura,base.Armatura);
  assert.equal(updated.Titolo,base.Titolo);
  assert.deepEqual(base,{Effetto:'effetto-nebula',Armatura:'armatura-assassino-notte',Titolo:'titolo-cardio'});
  assert.equal(equipaggiamentoRpgUnico(updated).Effetto,'skin-mitica');
});
