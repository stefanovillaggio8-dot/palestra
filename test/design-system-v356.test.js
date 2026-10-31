import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const leggi=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Tutte le viste principali condividono la nuova identita visiva',async()=>{
 const app=await leggi('src/app.js');
 const css=await leggi('stile-premium.css');
 const menu=app.slice(app.indexOf('function disegnaDentro('),app.indexOf('function cornice('));
 for(const [path,name] of [
  ['/casa','casa'],['/rank','rank'],['/storico','storico'],
  ['/progressi','progressi'],['/profilo','profilo'],
  ['/aura-shop','shop'],['/aura-shop/inventario','inventario']
 ]) {
   assert.ok(menu.includes("'"+path+"':['"+name+"'"),path);
 }
 for(const selector of [
 '.app-page-kicker','.app-vista-allenamento','.app-vista-casa',
 '.app-vista-rank','.app-vista-storico','.app-vista-seduta',
 '.app-vista-profilo','.menu-basso','.riga-serie','.grafico'
 ])assert.ok(css.includes(selector),selector);
 assert.match(menu,/contenuto\.classList\.add\('app-vista-'/);
});

test('Home mostra il prossimo allenamento prima degli altri senza mutare la scheda',async()=>{
 const app=await leggi('src/app.js');
 const body=app.slice(app.indexOf('function vistaHome('),app.indexOf('function ultimaSedutaDelGiorno('));
 assert.match(body,/const prossimoGiornoId = indiceProssimaGiornata >= 0/);
 assert.match(body,/giorni\.slice\(indiceProssimaGiornata\),\.\.\.giorni\.slice\(0,indiceProssimaGiornata\)/);
 assert.match(body,/for \(const g of giorniVisualizzati\)/);
 assert.match(body,/scheda-prossima/);
 assert.match(body,/iniziaAllenamento\(g\)/);
 assert.doesNotMatch(body,/\.sort\(|\.splice\(|\.reverse\(/);
});
test('Casa ha scorciatoie vere e Profilo mostra il personaggio prima dello Shop',async()=>{
 const app=await leggi('src/app.js');
 const casa=app.slice(app.indexOf('function vistaCasa('),app.indexOf('function rigaCronologiaMissione('));
 assert.match(casa,/class:'app-quick-actions'/);
 for(const href of ["'#/'","'#/progressi'","'#/aura-shop'"])
   assert.ok(casa.includes('href:'+href),href);
 const profilo=app.slice(app.indexOf('async function vistaProfilo('),app.indexOf('function disegnaBarraGioco('));
 assert.ok(profilo.indexOf('zona.appendChild(testa)') < profilo.indexOf("class:'aura-shop-open'"));
 assert.ok(profilo.indexOf("class:'aura-shop-open'") < profilo.indexOf('bloccoCalendario(profilo, st)'));
});

test('Animazioni partono solo navigando, mai ridisegnando una serie',async()=>{
 const app=await leggi('src/app.js');
 const css=await leggi('stile-premium.css');
 const disegna=app.slice(app.indexOf('function disegna()'),app.indexOf('function disegnaDentro('));
 assert.match(disegna,/zona\.dataset\.cambioVista = stessaRotta \? 'no' : 'si'/);
 assert.match(css,/#app\[data-cambio-vista="si"\]/);
 assert.match(css,/@keyframes ui356-arrive/);
 assert.match(css,/@keyframes ui356-title/);
 assert.match(css,/html\.animazioni-mai/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/html:not\(\.animazioni-sempre\)/);
});
test('App, precache e CSS hanno tutti la stessa nuova versione',async()=>{
 const sw=await leggi('sw.js');
 const html=await leggi('index.html');
 const css=await leggi('stile-premium.css');
 assert.match(sw,/palestra-v\d+/);
 assert.match(html,/palestra-v\d+/);
 assert.match(html,/stile-premium\.css\?v=366/);
 assert.match(sw,/stile-premium\.css\?v=366/);
 assert.ok(html.indexOf('stile-rpg.css?v=366')<html.indexOf('stile-premium.css?v=366'));
 assert.match(css,/--ui-panel/);
 assert.match(css,/max-width:620px/);
 assert.match(css,/--ui-ease/);
 assert.doesNotMatch(css,/localStorage|indexedDB|supabase/i);
});
test('L aura shop e le ricompense restano raggiungibili senza cambiare logica',async()=>{
 const app=await leggi('src/app.js');
 assert.match(app,/await sb\.acquistaAura\(account, o\.id\)/);
 assert.match(app,/streakShop/);
 assert.match(app,/ordinaPerRaritaAura/);
 assert.match(app,/rpg-atelier-open/);
});
