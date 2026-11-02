import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../stile.css',import.meta.url),'utf8');
const vista=app.slice(app.indexOf('function vistaStorico(zona) {'),app.indexOf('const rigaComandi =',app.indexOf('function vistaStorico(zona) {')));
const stile=css.slice(css.indexOf('/* Accesso rapido alla cronologia:'),css.indexOf('.cronologia-filtri {'));

test('Storico presenta un unico accesso compatto alla Cronologia',()=>{
 assert.match(vista,/cronologia-accesso-bottone/);
 assert.match(vista,/Cronologia e Annulla/);
 assert.doesNotMatch(vista,/Ripristina modifiche, serie e allenamenti cancellati/);
});
test('pulsante mantiene un area touch leggibile senza card gigante',()=>{
 assert.match(stile,/min-height:37px/);
 assert.match(stile,/padding:7px 11px/);
 assert.match(stile,/border:0; background:transparent/);
 assert.doesNotMatch(stile,/padding:11px 13px/);
});
test('conteggio sedute rimane breve e non viene inventato',()=>{
 assert.match(vista,/completate\.length/);
 assert.match(vista,/sedute completate/);
 assert.doesNotMatch(vista,/Nessun dato inventato/);
});
test('cronologia continua ad aprirsi tramite la rotta esistente',()=>{
 assert.match(vista,/vai\('\/cronologia'\)/);
 assert.match(app,/function vistaCronologia\(zona\)/);
});
