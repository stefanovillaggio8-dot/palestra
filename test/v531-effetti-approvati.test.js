import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {disegnaEffettoApprovatoRpg,EFFETTI_APPROVATI_RPG} from '../src/rpg-effetti-approvati-v531.js';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const classi={
  assassino:['armatura-assassino-notte','armatura-assassino-spettro'],
  guerriero:['armatura-guerriero-braci','armatura-guerriero-abisso'],
  berserker:['armatura-berserker-rabbia','armatura-berserker-apocalisse'],
};
function contextSpia() {
  const counters={stroke:0,fill:0,rect:0,drawImage:0,ellipse:0,gradient:0,salva:0,ripristina:0};
  const methods={
    save(){counters.salva++},restore(){counters.ripristina++},
    beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},quadraticCurveTo(){},
    translate(){},scale(){},setLineDash(){},
    ellipse(){counters.ellipse++},arc(){},fill(){counters.fill++},
    stroke(){counters.stroke++},fillRect(){counters.rect++},
    drawImage(){counters.drawImage++},
    createRadialGradient(){counters.gradient++;return {addColorStop(){}};},
  };
  return {ctx:methods,counters};
}
test('v531: ogni FX è un livello esclusivamente trasparente, senza foto, sprite o nuovo fondale',()=>{
  assert.deepEqual(EFFETTI_APPROVATI_RPG,[
    'effetto-ambra','effetto-ombra','effetto-fulmine','effetto-nebula','skin-mitica']);
  for(const classe of Object.keys(classi)) {
    for(const effetto of EFFETTI_APPROVATI_RPG){
      const {ctx,counters}=contextSpia();
      assert.equal(disegnaEffettoApprovatoRpg(ctx,360,540,classe,effetto,2.8),true);
      assert.ok(counters.stroke+counters.fill>20,classe+' '+effetto);
      assert.equal(counters.drawImage,0,'vietato disegnare un nuovo personaggio');
      assert.equal(counters.rect,0,'vietato ridisegnare il panorama');
      assert.equal(counters.salva,counters.ripristina,'Canvas save/restore non bilanciati');
    }
  }
  assert.equal(disegnaEffettoApprovatoRpg(contextSpia().ctx,360,540,'alieno','skin-mitica'),false);
});
test('v531: la rarità mitica possiede un sigillo complesso, la leggendaria stelle e nastri',()=>{
  const l=contextSpia(),m=contextSpia();
  disegnaEffettoApprovatoRpg(l.ctx,360,540,'assassino','effetto-nebula',3);
  disegnaEffettoApprovatoRpg(m.ctx,360,540,'assassino','skin-mitica',3);
  assert.ok(m.counters.ellipse>l.counters.ellipse,'Astrale deve avere anelli e rune mitiche');
  assert.ok(m.counters.stroke>l.counters.stroke,'Astrale deve avere una firma luminosa maggiore');
  assert.ok(l.counters.gradient>12,'Nebulosa richiede gas volumetrico');
});
test('v531: 3 classi x 2 armature x 6 stati x 5 effetti mai nuovi ritratti',()=>{
  for(const [classe,armature] of Object.entries(classi))
    for(const armatura of armature)
      for(let stato=0;stato<6;stato++) {
        const base=percorsoFotoArmaturaArmataV371({
          classe,armatura,stato,effetto:null,armaSbloccata:stato>=4});
        const variants=new Set(EFFETTI_APPROVATI_RPG.map(effetto=>
          percorsoFotoArmaturaArmataV371({classe,armatura,stato,effetto,armaSbloccata:stato>=4})));
        assert.deepEqual([...variants],[base],classe+' '+armatura+' '+stato);
        if(base)assert.match(base,/\/base\.webp\?v=(528|372)$/);
      }
});
test('v531: renderer legacy mantenuto come fallback, il riferimento v532 ha la precedenza',()=>{
  const app=read('src/app.js'),atelier=read('src/rpg-atelier.js'),
    canvas=read('src/effetti-rpg-canvas.js'),
    cosmic=read('src/rpg-energia-incarnata.js'),
    sw=read('sw.js'),css=read('stile-rpg.css');
  for(const file of [atelier,canvas,cosmic])assert.match(file,/disegnaEffettoApprovatoRpg/);
  assert.match(app,/const effettoVivo=!effettoRiferimento && usaEffettiViviRpg/);
  assert.match(app,/effettoVivo \|\| \(!fotoCoronaRpg/);
  assert.match(atelier,/if\(effettoApprovato && !fxSenzaFoto && typeof ctx\.translate==='function'\)/);
  assert.match(atelier,/c\.effetto,2\.8/);
  assert.match(cosmic,/fase==='fronte'\)disegnaEffettoApprovatoRpg/);
  assert.match(sw,/src\/rpg-effetti-approvati-v531\.js/);
  assert.match(css,/rpg-effetti-solo-stage/);
  assert.match(sw,/const VERSIONE = 'palestra-v537'/);
});
