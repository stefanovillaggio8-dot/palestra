import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CLASSI_ATELIER,ARMATURE_ATELIER,EFFETTI_ATELIER,
  combinazioniRpg,NUMERO_COMBINAZIONI_ATELIER,nomeFileAtelier}
  from '../src/rpg-atelier.js';
import {configurazioneFotoRpg,chiaveFotoRpg} from '../src/anteprima-combinata-rpg.js';
const leggi=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('Ogni classe possiede sei stati, tre armature e ogni combinazione estetica',()=>{
  const chiavi=new Set(),contatori=Object.fromEntries(CLASSI_ATELIER.map(c=>[c,0]));
  for(const cfg of combinazioniRpg()){
    assert.ok(ARMATURE_ATELIER[cfg.classe].includes(cfg.armatura));
    assert.ok(EFFETTI_ATELIER.includes(cfg.effetto));
    const chiave=nomeFileAtelier(cfg);
    assert.ok(!chiavi.has(chiave),'duplicata '+chiave);
    chiavi.add(chiave);contatori[cfg.classe]++;
    const r=configurazioneFotoRpg({
      classe:cfg.classe,stato:cfg.stadio,armatura:cfg.armatura,
      skin:cfg.skin,effetto:cfg.effetto,divina:cfg.divina,corona:cfg.corona,
    });
    assert.equal(r.classe,cfg.classe);
    assert.equal(r.stato,cfg.stadio);
    assert.equal(r.corona,cfg.corona);
    assert.equal(r.divina,cfg.divina);
    assert.equal(r.effetto,cfg.effetto||null);
    assert.equal(r.skin,cfg.skin||null);
    assert.equal(r.armatura,cfg.armatura||null);
  }
  assert.equal(NUMERO_COMBINAZIONI_ATELIER,15120);
  assert.equal(chiavi.size,15120);
  assert.deepEqual(Object.values(contatori),[5040,5040,5040]);
  assert.notEqual(chiaveFotoRpg({classe:'assassino',stato:2,corona:true}),
    chiaveFotoRpg({classe:'assassino',stato:2,corona:false}));
});
test('Navigazione: Shop sinistro, Inventario destro, ritorno Profilo in alto',async()=>{
 const app=await leggi('src/app.js');
 const start=app.indexOf("if (rotta === '/aura-shop' || rotta === '/aura-shop/inventario')");
 const end=app.indexOf("const resto = el('div', { class: 'basso' }",start);
 assert.ok(start>0&&end>start);
 const nav=app.slice(start,end);
 assert.match(nav,/\[voceShop, voceInventario\]/);
 assert.match(nav,/href: '#\/aura-shop\/inventario'/);
 assert.match(app,/class:'aura-shop-back'/);
 assert.match(app,/href:'#\/profilo'/);
 assert.match(app,/class:'aura-shop-inventory'/);
});
test('Filtri e ordine del catalogo lasciano gli acquisti e i salvataggi intatti',async()=>{
 const app=await leggi('src/app.js');
 const start=app.indexOf('function vistaAuraShop(');
 const end=app.indexOf('function disegnaDentro(',start);
 const shop=app.slice(start,end);
 assert.match(shop,/\['Tutti','Armatura','Effetto','Titolo'\]/);
 assert.match(shop,/ordinaPerRaritaAura\(OGGETTI_AURA\.filter/);
 assert.match(shop,/ordinaPerRaritaAura\(OGGETTI_AURA\.filter\(o=>posseduti\.includes/);
 assert.match(shop,/Dal Comune al Mitico/);
 assert.match(shop,/aria-pressed/);
 assert.ok(shop.indexOf("zona.appendChild(filtri); zona.appendChild(catalogo);") <
   shop.indexOf("zona.appendChild(el('div',{class:'aura-shop-rewards'}"),
 'prima il catalogo e poi le ricompense');
 assert.match(shop,/await sb\.acquistaAura\(account, o\.id\)/);
 assert.match(shop,/await db\.salva\('profili', \{ \.\.\.profiloCorrente, equipaggiamento_aura: prossimo \}\)/);
 assert.match(shop,/const posseduti = \[\.\.\.new Set/);
 assert.doesNotMatch(shop,/localStorage\.clear\(|indexedDB\.deleteDatabase/);
});
test('Tema coerente e inclusivo anche in schermate generali e mobile',async()=>{
 const css=await leggi('stile-rpg.css');
 const core=await leggi('stile.css');
 assert.match(css,/v340 · DESIGN SYSTEM/);
 for(const selector of ['.contenuto > .blocco','.contenuto .scheda-giorno',
   '.contenuto .card-rank','.contenuto .grafico','.menu-basso',
   '.aura-shop-grid','.aura-shop-owned-grid','.aura-shop-rewards',
   '.aura-shop-topline','.menu-aura-shop','.aura-shop-filter.attivo']){
   assert.ok(css.includes(selector),'manca tema '+selector);
 }
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/focus-visible/);
 assert.match(css,/max-width:360px/);
 assert.ok(core.includes('.riga-serie'),'nessun reset delle righe allenamento');
});
