import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.localStorage = {
  _v:new Map(), getItem(k){return this._v.get(k)??null;},
  setItem(k,v){this._v.set(k,String(v));}, removeItem(k){this._v.delete(k);},
};
delete globalThis.indexedDB;
const { montaDom, perClasse, pulsante } = await import('./dom-minimo.js');
const { app, body } = montaDom();
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const { avvia } = await import('../src/app.js');
const db = await import('../src/db.js');
const pausa = () => new Promise(r=>setTimeout(r,30));

test('Shop bloccato e anteprima non cambiano profilo, saldo o inventario', async () => {
  await avvia();
  const profilo = (await db.tutti('profili')).find(p=>p.id==='account-1');
  assert.ok(profilo);
  await db.salva('profili',{...profilo,classe_rpg:'guerriero',personaggio_creato:true,equipaggiamento_aura:{Effetto:'effetto-ambra'}});
  await avvia();
  window.location.hash='#/aura-shop';
  await pausa();
  const cards=perClasse(app,'aura-shop-card');
  const braci=cards.find(c=>c.textContent.includes('Custode delle Braci'));
  assert.ok(braci,app.textContent);
  assert.match(braci.textContent,/Record richiesto: 15 giorni/);
  assert.match(braci.textContent,/Il tuo record: 0 giorni · Mancano 15 giorni/);
  // Le immagini e l'avatar NON devono caricarsi prima di aprire Anteprima.
  assert.equal(perClasse(braci,'aura-armor-card').length,0);
  assert.equal(perClasse(app,'aura-shop-card-art').length,0);
  assert.equal(perClasse(app,'aura-shop-character-preview').length,0);
  assert.equal(perClasse(app,'personaggio-ritratto').length,0);
  assert.notEqual(pulsante(braci,'Record di Streak insufficiente').getAttribute('disabled'),null);
  assert.ok(!cards.some(c=>c.textContent.includes('Velo della Notte')));
  const prima = {profili:await db.tutti('profili'),ricompense:await db.tutti('ricompense')};
  const sfondo=body.className;
  await pulsante(braci,'Anteprima').click();
  const overlay=perClasse(body,'aura-preview-overlay')[0];
  assert.ok(overlay);
  assert.equal(perClasse(overlay,'aura-preview-environment')[0].getAttribute('src'),'./img/scenari/braci.svg');
  assert.match(perClasse(overlay,'personaggio-ritratto')[0].getAttribute('src'),/personaggi\/stati\/guerriero-/);
  assert.equal(perClasse(overlay,'aura-armor-card').length,1);
  await pulsante(overlay,'Chiudi').click();
  assert.equal(perClasse(body,'aura-preview-overlay').length,0);
  assert.equal(body.className,sfondo);
  assert.deepEqual({profili:await db.tutti('profili'),ricompense:await db.tutti('ricompense')},prima);
});

test('equipaggiare, ricaricare e disequipaggiare conserva tutti gli acquisti e il saldo', async () => {
  for (const [id, tipo] of [['titolo-cardio','Titolo'], ['effetto-ombra','Effetto'], ['armatura-guerriero-braci','Armatura'], ['skin-mitica','Skin']]) {
    await db.salva('ricompense',{id:'fixture-'+id,account_id:'account-1',tipo:'spesa_aura',fonte:'shop:'+id+':legacy',aura:-1,xp:0});
  }
  const spese = await db.tutti('ricompense');
  await avvia();
  window.location.hash='#/aura-shop/inventario';
  await pausa();
  for (const nome of ['Cardio? Denunciami','Fumo d’ombra','Custode delle Braci','Astrale — forma mitica']) {
    const riga = perClasse(app,'aura-shop-owned').find(r=>r.textContent.includes(nome));
    assert.ok(riga,nome);
    await pulsante(riga,'Equipaggia').click();
    await pausa();
  }
  await avvia();
  window.location.hash='#/aura-shop/inventario';
  await pausa();
  const profilo=(await db.tutti('profili')).find(p=>p.id==='account-1');
  assert.deepEqual(profilo.equipaggiamento_aura,{Titolo:'titolo-cardio',Effetto:'effetto-ombra',Armatura:'armatura-guerriero-braci',Skin:'skin-mitica'});
  for (let i=0;i<4;i++) {
    const riga=perClasse(app,'aura-shop-owned').find(r=>r.textContent.includes('Disequipaggia'));
    assert.ok(riga);
    await pulsante(riga,'Disequipaggia').click();
    await pausa();
  }
  await avvia();
  assert.deepEqual((await db.tutti('profili')).find(p=>p.id==='account-1').equipaggiamento_aura,{});
  assert.deepEqual(await db.tutti('ricompense'),spese);
});
