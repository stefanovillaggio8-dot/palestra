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
  assert.match(braci.textContent,/Streak attuale richiesta: 15 giorni/);
  assert.match(braci.textContent,/La tua Streak: 0 giorni · Mancano 15 giorni/);
  // Le immagini e l'avatar NON devono caricarsi prima di aprire Anteprima.
  assert.equal(perClasse(braci,'aura-armor-card').length,0);
  assert.equal(perClasse(app,'aura-shop-card-art').length,0);
  assert.equal(perClasse(app,'aura-shop-character-preview').length,0);
  assert.equal(perClasse(app,'personaggio-ritratto').length,0);
  assert.notEqual(pulsante(braci,'Streak attuale insufficiente').getAttribute('disabled'),null);
  assert.ok(!cards.some(c=>c.textContent.includes('Velo della Notte')));
  // Aura divina è un premio GRATUITO a 75 giorni: anteprima permessa
  // anche a Streak zero; l'anteprima mostra solo Aura Divina (un effetto per volta).
  await pulsante(app,'Anteprima Aura divina').click();
  const divina=perClasse(body,'aura-preview-overlay')[0];
  assert.ok(divina);
  assert.equal(perClasse(divina,'aura-foto-divina').length,0); // Aura v365 is already part of the full photo.
  assert.match(perClasse(divina,'personaggio-ritratto')[0].getAttribute('src'),/aura-divina-v379/);
  assert.equal(perClasse(divina,'aura-foto-ambra').length,0);
  assert.equal(perClasse(divina,'aura-foto-corona').length,0);
  await pulsante(divina,'Chiudi anteprima').click();
  assert.equal(perClasse(body,'aura-preview-overlay').length,0);
  const prima = {profili:await db.tutti('profili'),ricompense:await db.tutti('ricompense')};
  const sfondo=body.className;
  await pulsante(braci,'Anteprima').click();
  const overlay=perClasse(body,'aura-preview-overlay')[0];
  assert.ok(overlay);
  assert.equal(perClasse(overlay,'aura-preview-environment')[0].getAttribute('src'),'./img/scenari/braci.svg');
  assert.match(perClasse(overlay,'personaggio-ritratto')[0].getAttribute('src'),/personaggi\/armature\/guerriero-braci\.webp/);
  assert.equal(perClasse(overlay,'aura-armor-card').length,1);
  await pulsante(overlay,'Chiudi').click();
  assert.equal(perClasse(body,'aura-preview-overlay').length,0);
  assert.equal(body.className,sfondo);
  assert.deepEqual({profili:await db.tutti('profili'),ricompense:await db.tutti('ricompense')},prima);
});

test('equipaggiare, ricaricare e disequipaggiare conserva tutti gli acquisti e il saldo', async () => {
  for (const [id, tipo] of [['titolo-cardio','Titolo'], ['effetto-ombra','Effetto'], ['armatura-guerriero-braci','Armatura'], ['skin-mitica','Effetto']]) {
    await db.salva('ricompense',{id:'fixture-'+id,account_id:'account-1',tipo:'spesa_aura',fonte:'shop:'+id+':legacy',aura:-1,xp:0});
  }
  const spese = await db.tutti('ricompense');
  await avvia();
  window.location.hash='#/aura-shop/inventario';
  await pausa();
  for (const nome of ['Cardio? Denunciami','Fumo d’ombra','Custode delle Braci','Astrale · effetto cosmico']) {
    const riga = perClasse(app,'aura-shop-owned').find(r=>r.textContent.includes(nome));
    assert.ok(riga,nome);
    await pulsante(riga,'Equipaggia').click();
    await pausa();
  }
  await avvia();
  window.location.hash='#/aura-shop/inventario';
  await pausa();
  const profilo=(await db.tutti('profili')).find(p=>p.id==='account-1');
  assert.deepEqual(profilo.equipaggiamento_aura,{Titolo:'titolo-cardio',Effetto:'skin-mitica',Armatura:'armatura-guerriero-braci'});
  // Astrale ha sostituito Fumo d'ombra: un SOLO effetto equipaggiato.
  const fumo=perClasse(app,'aura-shop-owned').find(r=>r.textContent.includes('Fumo d’ombra'));
  assert.ok(fumo&&!fumo.textContent.includes('✓ Equipaggiato'));
  for (let i=0;i<3;i++) {
    const riga=perClasse(app,'aura-shop-owned').find(r=>r.textContent.includes('Disequipaggia'));
    assert.ok(riga);
    await pulsante(riga,'Disequipaggia').click();
    await pausa();
  }
  await avvia();
  assert.deepEqual((await db.tutti('profili')).find(p=>p.id==='account-1').equipaggiamento_aura,{});
  assert.deepEqual(await db.tutti('ricompense'),spese);
});


test('v473: l\'anteprima Astrale non mostra mai solo la foto normale su Safari senza Canvas', async()=>{
  // Il DOM dei test non espone ne getContext ne requestAnimationFrame:
  // simula proprio il caso iPhone in cui il live renderer non e disponibile.
  await avvia();
  const prima={profili:await db.tutti('profili'),ricompense:await db.tutti('ricompense')};
  window.location.hash='#/aura-shop';
  await pausa();
  const carta=perClasse(app,'aura-shop-card').find(c=>c.textContent.includes('Astrale · effetto cosmico'));
  assert.ok(carta,'Astrale presente nello shop');
  const anteprima=pulsante(carta,'Anteprima');
  assert.ok(anteprima,'anteprima accessibile anche senza acquisto');
  await anteprima.click();
  const overlay=perClasse(body,'aura-preview-overlay')[0];
  assert.ok(overlay,'overlay visualizzato');
  for(const classe of ['Guerriero','Assassino','Berserker']){
    const cambia=pulsante(overlay,classe);
    assert.ok(cambia,'pulsante per '+classe);
    await cambia.click();
    const avatar=perClasse(overlay,'personaggio-scena-grafica')[0];
    assert.ok(avatar,'immagine della classe '+classe);
    assert.ok(avatar.classList.contains('shop-skin-mitica'),'Astrale equipaggiato in sola anteprima per '+classe);
    assert.equal(perClasse(avatar,'rpg-astrale-presenza').length,1,'fallback visibile indipendentemente da Canvas su '+classe);
    assert.equal(perClasse(avatar,'rpg-astrale-scintilla').length,3,'scintille visibili per '+classe);
    assert.equal(perClasse(avatar,'personaggio-ritratto').length,1,'foto originale conservata per '+classe);
  }
  await pulsante(overlay,'Chiudi').click();
  assert.equal(perClasse(body,'aura-preview-overlay').length,0);
  assert.deepEqual({profili:await db.tutti('profili'),ricompense:await db.tutti('ricompense')},
    prima,'la preview non cambia classe reale, acquisti o saldi');
});
