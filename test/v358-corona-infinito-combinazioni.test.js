import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { combinazioniRpg, opzioniAtelier, nomeFileAtelier,
  NUMERO_COMBINAZIONI_ATELIER } from '../src/rpg-atelier.js';
import { configurazioneFotoRpg, chiaveFotoRpg } from '../src/anteprima-combinata-rpg.js';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('80 giorni: TUTTE le 7.560 foto con Corona hanno combinazioni uniche',()=>{
  const withCrown=new Set(),withoutCrown=new Set(),perClasse={};
  for(const combo of combinazioniRpg()) {
    const key=nomeFileAtelier(combo);
    if(combo.corona) {
      assert.ok(!withCrown.has(key), 'duplicato '+key);
      withCrown.add(key);
      perClasse[combo.classe]=(perClasse[combo.classe]||0)+1;
      const other=nomeFileAtelier({...combo,corona:false});
      withoutCrown.add(other);
      assert.notEqual(key,other,'due foto devono differire per premio 80 giorni');
      assert.equal(opzioniAtelier(combo).corona,true);
    }
  }
  assert.equal(NUMERO_COMBINAZIONI_ATELIER,15120);
  assert.equal(withCrown.size,7560);
  assert.equal(withoutCrown.size,7560);
  for(const c of ['assassino','guerriero','berserker'])
    assert.equal(perClasse[c],2520,c+' deve avere tutte le sue foto');
});

test('Il nuovo SVG è una REGALIA fisica, senza anelli sul corpo, e l Aura divina resta quella originale',()=>{
  const svg=src('img/effetti/corona-infinito-v358.svg');
  assert.match(svg,/viewBox="0 0 640 890"/);
  for(const id of ['oro','platino','ametista','diamante','eclisse','gemma'])
    assert.ok(svg.includes('id="'+id+'"'),id);
  assert.ok((svg.match(/<use /g)||[]).length>=12);
  assert.doesNotMatch(svg,/twin helixes|ground seal|aria-label="Aura divina"/i);
  const app=src('src/app.js');
  assert.match(app,/src:'\.\/img\/effetti\/corona-infinito-v358\.svg'/);
  assert.match(app,/divina: auraDivinaAttiva/,'divina usa la texture originale');
  assert.doesNotMatch(app,/src:'\.\/img\/effetti\/aura-divina-v357\.svg'/);
  assert.match(app,/\(!auraDivinaAnteprima \|\| coronaAnteprima\)/);
});

test('Preview e download PNG usano ESATTAMENTE la stessa Corona per ogni configurazione',()=>{
  const app=src('src/app.js'),atelier=src('src/rpg-atelier.js'),
    exported=src('src/anteprima-combinata-rpg.js');
  assert.match(app,/class:'rpg-corona-premium'/);
  assert.match(atelier,/if\(c\.corona\)\s*\{/);
  assert.match(atelier,/attesaImmagine\('\.\/img\/effetti\/corona-infinito-v358\.svg'\)/);
  assert.match(atelier,/ctx\.drawImage\(regalia,dx,dy,dw,dh\)/);
  assert.match(exported,/ctx\.drawImage\(crown,0,0,out.width,out.height\)/);
  assert.match(atelier,/fotoCinematograficaRpg\(\{\.\.\.c,corona:false,divina:false\}\)/);
  assert.doesNotMatch(atelier,/disegnaCoronaEnergetica\(ctx,dw,dh\)/);
  const cfg=configurazioneFotoRpg({classe:'assassino',stato:5,
    armatura:'armatura-assassino-spettro',skin:'skin-mitica',
    effetto:'effetto-nebula',divina:true,corona:true});
  assert.ok(chiaveFotoRpg(cfg).endsWith('|1|1'));
});

test('Il premio resta ottenibile solo dopo 80 giorni di Streak',()=>{
  const skin=src('src/aura-skin.js');
  assert.match(skin,/giorni >= 80/);
  assert.match(skin,/Number\(record\) \|\| 0\) < 80/);
  const sw=src('sw.js'),html=src('index.html');
  assert.match(sw,/palestra-v358/);
  assert.match(html,/palestra-v358/);
  assert.match(sw,/img\/effetti\/corona-infinito-v358\.svg/);
  assert.doesNotMatch(sw,/img\/effetti\/aura-divina-v357\.svg/);
});
