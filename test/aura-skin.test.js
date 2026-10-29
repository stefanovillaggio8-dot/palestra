import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accessoSkin, requisitoSkin, scenarioSkin } from '../src/aura-skin.js';
import { calcolaStreak } from '../src/streak.js';
import { calcolaAvatar } from '../src/avatar-rpg.js';

const casi = [
  ['armatura-guerriero-braci',15,9200,'guerriero'],
  ['armatura-guerriero-abisso',50,13500,'guerriero'],
  ['armatura-assassino-notte',15,9400,'assassino'],
  ['armatura-assassino-spettro',50,13800,'assassino'],
  ['armatura-berserker-rabbia',15,9800,'berserker'],
  ['armatura-berserker-apocalisse',50,14500,'berserker'],
  ['skin-mitica',80,22000,undefined],
];
for (const [id,soglia,prezzo,classe] of casi) {
  test(id + ': soglia esatta, saldo, compatibilità e acquisto preesistente', () => {
    const o = {id,prezzo,classe};
    const st = { aura: prezzo, streak: {record:999, giorni:soglia-1} };
    const copia = structuredClone(st);
    assert.equal(requisitoSkin(id), soglia);
    assert.equal(accessoSkin(o,st,classe).acquistabile,false);
    assert.equal(accessoSkin(o,st,classe).mancanti,1);
    assert.equal(accessoSkin(o,st,classe,true).equipaggiabile,true);
    assert.deepEqual(st,copia);
    assert.equal(accessoSkin(o,{aura:prezzo,streak:{record:soglia,giorni:soglia}},classe).acquistabile,true);
    assert.equal(accessoSkin(o,{aura:prezzo-1,streak:{record:soglia,giorni:soglia}},classe).acquistabile,false);
    if(classe) assert.equal(accessoSkin(o,{aura:prezzo,streak:{record:soglia,giorni:soglia}},'altra').acquistabile,false);
    const svg = readFileSync(new URL('../'+scenarioSkin(id).slice(2),import.meta.url),'utf8');
    assert.ok(svg.includes('<svg'));
    assert.doesNotMatch(svg,/<image|personaggi\//);
  });
}

test('Streak persa: blocca i nuovi acquisti ma conserva gli oggetti acquistati e le ricompense gratuite', () => {
  const sedute = Array.from({length:80},(_,i)=>({id:String(i),stato:'completata',data:new Date(Date.UTC(2025,0,i+1)).toISOString().slice(0,10)}));
  const prima = calcolaAvatar('guerriero',[],sedute,()=>null,{oggi:'2025-03-21'});
  const dopo = calcolaAvatar('guerriero',[],sedute,()=>null,{oggi:'2025-06-01'});
  const streak = calcolaStreak(sedute,'2025-06-01');
  assert.equal(streak.giorni,0);
  assert.equal(streak.record,80);
  const oggetto={id:'skin-mitica',prezzo:22000};
  const accesso=accessoSkin(oggetto,{aura:22000,streak},'guerriero');
  assert.equal(accesso.acquistabile,false);
  assert.equal(accesso.streakAttuale,0);
  assert.equal(accesso.mancanti,80);
  assert.equal(accessoSkin(oggetto,{aura:22000,streak},'guerriero',true).equipaggiabile,true);
  assert.deepEqual(dopo.premi,prima.premi);
  assert.ok(dopo.premi.some(p=>p.sbloccato));
});
