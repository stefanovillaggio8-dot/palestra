import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { CLASSI_CORONA_V360, EFFETTI_CORONA_V360, percorsoFotoCoronaV360 } from '../src/foto-corona-v360.js';
import { ARMATURE_DIVINE_V366, percorsoFotoAuraDivinaV366 } from '../src/foto-aura-divina-v366.js';
import { PREMI, percorsoStato } from '../src/avatar-rpg.js';
import { equipaggiamentoRpgUnico, aggiornaEquipaggiamentoRpg } from '../src/equipaggiamento-rpg.js';

const root = path => new URL('../' + path.replace(/^\.\//,'').split('?')[0], import.meta.url);
test('audit visuale: tutte le 648 foto Corona sono file esistenti e non vuoti', () => {
 const seen = new Set();
 for (const [classe, armature] of Object.entries(CLASSI_CORONA_V360))
  for (let stato=0;stato<6;stato++)
   for (const armatura of [null,...armature])
    for (const effetto of [null,...Object.keys(EFFETTI_CORONA_V360)])
     for (const divina of [false,true]) {
      const url=percorsoFotoCoronaV360({classe,stato,armatura,effetto,divina});
      assert.ok(url, JSON.stringify({classe,stato,armatura,effetto,divina}));
      assert.ok(!seen.has(url),'Duplicato: '+url);
      seen.add(url);
      assert.ok(existsSync(root(url)), 'Foto mancante: '+url);
      assert.ok(statSync(root(url)).size>1000,'Foto vuota: '+url);
     }
 assert.equal(seen.size,648);
});
test('audit visuale: nove foto Divine mantengono il file fotografico originale senza generare volti', () => {
 let count=0;
 for (const [classe,armature] of Object.entries(ARMATURE_DIVINE_V366))
  for (const armatura of armature) {
   const url=percorsoFotoAuraDivinaV366({
    classe,stato:5,divina:true,armatura:armatura==='base'?null:armatura,armaSbloccata:true
   });
   assert.ok(url.endsWith('.webp?v=371'),url);
   const file=root(url);
   assert.ok(existsSync(file),url);
   const photo=readFileSync(file);
   assert.equal(photo.toString('ascii',0,4),'RIFF');
   assert.equal(photo.toString('ascii',8,12),'WEBP');
   assert.ok(statSync(file).size>40000,url);
   if(classe==='berserker'&&armatura==='armatura-berserker-apocalisse')
    assert.match(readFileSync(root('tools/render_corona_v360.py'),'utf8'),/restore_apocalypse_horns|armatura-berserker-apocalisse/);
   count++;
  }
 assert.equal(count,9);
});
test('audit sblocchi: le foto Streak 4 e 5 esistono per tutte le armi di classe',()=>{
 assert.equal(PREMI.find(p=>p.id==='elmo').giorni,30);
 for(const classe of Object.keys(CLASSI_CORONA_V360))
  for(const stato of [4,5]) {
    const url=percorsoStato(classe,stato);
    assert.ok(existsSync(root(url)),url);
  }
});
test('audit Shop: una sola armatura e un solo effetto alla volta, senza perdere inventario',()=>{
 const first={Armatura:'armatura-assassino-notte',Effetto:'effetto-ambra'};
 const change=aggiornaEquipaggiamentoRpg(first,{id:'armatura-assassino-spettro',tipo:'Armatura'},true);
 assert.equal(change.Armatura,'armatura-assassino-spettro');
 assert.equal(change.Effetto,'effetto-ambra');
 const astral=aggiornaEquipaggiamentoRpg(change,{id:'skin-mitica',tipo:'Effetto'},true);
 assert.equal(astral.Effetto,'skin-mitica');
 assert.equal(astral.Armatura,change.Armatura);
 assert.equal(equipaggiamentoRpgUnico({Astrale:'skin-mitica',Effetto:'effetto-ombra'}).Effetto,'effetto-ombra');
});
test('audit rendering: Atelier non mostra contemporaneamente effetto Shop e Aura Divina',()=>{
 const ui=readFileSync(root('src/rpg-atelier-ui.js'),'utf8');
 assert.match(ui,/key==='divina' && cfg.divina/);
 assert.match(ui,/cfg.effetto='';cfg.stadio=5/);
 assert.match(ui,/key==='effetto' && cfg.effetto/);
 assert.match(ui,/cfg.divina=false/);
});
