import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Profilo: tutte le statistiche RPG hanno una frase breve e dettaglio apribile',()=>{
  const app=read('src/app.js');
  const a=app.indexOf('const SPIEGAZIONE_STAT = {');
  const b=app.indexOf('function bloccoAvatarRpg(',a);
  const stat=app.slice(a,b);
  for(const k of ['forza','agilita','stamina']) assert.match(stat,new RegExp(k+': \\{\\s*nome:'));
  assert.equal((stat.match(/breve:/g)||[]).length,3);
  assert.equal((stat.match(/cosa:/g)||[]).length,3);
  const code=app.slice(b,app.indexOf('/* ---------- schermate ---------- */',b));
  assert.match(code,/class: 'stat-intestazione'/);
  assert.match(code,/class: 'stat-riassunto'/);
  assert.match(code,/class: 'stat-dettagli'/);
  assert.match(code,/testo: 'Come si calcola'/);
  assert.match(code,/class: 'valore-stat', testo: String\(valore\)/);
  assert.match(code,/class: 'valore-stat', testo: String\(rpg\.livello\)/);
});
test('Profilo: 3 colonne grandi, 2 tablet e 1 sui telefoni',()=>{
  const css=read('stile-premium.css');
  const section=css.slice(css.indexOf('/* v394 — statistiche RPG'));
  assert.ok(section.length>2000);
  assert.match(section,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(section,/@media\(max-width:900px\)[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(section,/@media\(max-width:630px\)[\s\S]*?\.app-vista-profilo \.righe-stat\{\s*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(section,/\.app-vista-profilo \.riga-classi\{\s*display:grid/);
});
test('Testo: le card evitano parole tagliate e i valori non si spezzano',()=>{
  const css=read('stile-premium.css');
  const section=css.slice(css.indexOf('/* v394 — statistiche RPG'));
  assert.match(section,/\.stat-intestazione \.valore-stat \{[\s\S]*?white-space:nowrap;/);
  assert.match(section,/overflow-wrap:normal;/);
  assert.match(section,/word-break:normal;/);
  assert.match(section,/hyphens:auto;/);
  assert.match(read('index.html'),/<html lang="it">/);
});
