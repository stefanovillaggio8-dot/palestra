import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/app.js');
const css=read('stile-premium.css');
const vista=app.slice(app.indexOf('function vistaHome(zona)'),app.indexOf('function ultimaSedutaDelGiorno('));
test('Allenamento: Recap occupa da solo la barra, senza Music Box',()=>{
  assert.match(vista,/class: 'workout-hub-actions'/);
  assert.match(vista,/class: 'recap-casa-link workout-hub-action workout-hub-recap'/);
  assert.doesNotMatch(vista,/collegamentoMusicBox|musicbox-palestra/);
  assert.equal((vista.match(/href: '#\/recap'/g)||[]).length,1);
  assert.ok(vista.indexOf("class: 'riga-titoli workout-titolo'")<vista.indexOf("class: 'workout-hub-actions'"));
  assert.ok(vista.indexOf("class: 'workout-hub-actions'")<vista.indexOf('for (const g of giorniVisualizzati)'));
});
test('Modifica scheda compatta conserva la destinazione e lo storico intatto',()=>{
  assert.match(vista,/bottone\('✎ Modifica', \{ onClick: \(\) => vai\('\/scheda'\), classe: 'fantasma workout-edit-btn'/);
  assert.match(vista,/Le sedute già completate non cambiano/);
});
test('Il link Music Box è assente e gli stili dedicati sono rimossi',()=>{
  assert.doesNotMatch(app,/collegamentoMusicBox|musicbox-palestra|https:\/\/stefanovillaggio8-dot\.github\.io\/music-box/);
  assert.doesNotMatch(css,/workout-hub-music/);
});
test('CSS mobile: unica azione Recap, alta abbastanza per il tocco',()=>{
  const section=css.slice(css.indexOf('/* v395 — Allenamento'));
  assert.match(section,/grid-template-columns:minmax\(0,1fr\)/);
  assert.match(section,/\.workout-hub-action\{[\s\S]*?min-height:45px/);
  assert.match(section,/@media\(max-width:420px\)/);
  assert.match(section,/workout-edit-btn/);
});
test('La barra top mostra gli stessi valori, con stile distinto e niente ulteriore altezza',()=>{
  const h=app.slice(app.indexOf('function disegnaBarraGioco('));
  for(const id of ['chip-gioco-streak','chip-gioco-aura','chip-gioco-livello'])assert.match(h,new RegExp(id));
  assert.match(h,/st\.fuoco\.acceso/);
  assert.match(h,/formattaAura\(st\.aura\)/);
  assert.match(h,/st\.livello\.livello/);
  const section=css.slice(css.indexOf('/* v395 — Allenamento'));
  assert.match(section,/\.chip-gioco-streak\{/);
  assert.match(section,/\.chip-gioco-aura\{/);
  assert.match(section,/\.chip-gioco-livello\{/);
  assert.match(section,/flex-wrap:nowrap/);
});
