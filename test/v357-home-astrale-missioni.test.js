import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POOL, puntiAuraMissione, ricompensaMissione, DIFFICOLTA } from '../src/missioni.js';

const src = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v357: 4 KPI compatti + Rank in Home, XP senza doppio riquadro',()=>{
  const s=src('src/app.js');
  const casa=s.slice(s.indexOf('function vistaCasa('),s.indexOf('// --- ultimo allenamento ---',s.indexOf('function vistaCasa(')));
  for (const nome of ['teschioStreak(st)','teschioAura(st)','teschioLivelloAccount(st)','teschioXP(st)','teschio-rank'])
    assert.ok(casa.includes(nome),nome+' deve comparire in Home');
  assert.doesNotMatch(casa,/zona\.appendChild\(el\('div', \{ class: 'blocco-progresso-livello' \}/,
    'il progresso XP ora è nella propria card');
  assert.match(s,/giorno consecutivo/);
  assert.match(s,/giorni consecutivi/);
});

test('v357: Astrale è Effetto separato dagli altri effetti e mantiene vecchi inventari',()=>{
  const s=src('src/app.js');
  assert.match(s,/id:'skin-mitica',nome:'Astrale[^\n]*tipo:'Effetto'/);
  assert.match(s,/slotOggetto = \(o\) => o\.id === 'skin-mitica' \? 'Astrale'/);
  assert.match(s,/equipaggiamentoRpg\.Astrale \?\? equipaggiamentoRpg\.Skin/);
  assert.match(s,/delete prossimo\.Skin/);
  assert.doesNotMatch(s,/for\(const f of \['Tutti','Armatura','Effetto','Skin','Titolo'\]/);
});

test('v357: Corona e Aura divina hanno asset distinti e vengono esportati',()=>{
  const app=src('src/app.js'),compos=src('src/anteprima-combinata-rpg.js');
  const divina=src('img/effetti/aura-divina-v357.svg'),corona=src('img/effetti/corona-infinito-v345.svg');
  assert.match(app,/rpg-aura-divina-premium/);
  assert.match(app,/rpg-corona-premium/);
  assert.match(compos,/querySelector\('\.rpg-aura-divina-premium'\)/);
  assert.match(compos,/querySelector\('\.rpg-corona-premium'\)/);
  assert.match(divina,/#55e4ff/);assert.match(corona,/#f5bf5f/);
  assert.ok(!divina.includes('#f5bf5f'),'la Divina non replica il colore corona');
});

test('v357: Aura calcolata dalla difficoltà e dall’imbarazzo, senza invertire tier',()=>{
  const range={easy:[20,35],unhinged:[40,65],insane:[75,110],legendary:[150,185]};
  let differenziate=0;
  for(const m of POOL){
    const val=puntiAuraMissione(m);
    assert.equal(m.puntiAura,val,'ricompensa deterministica '+m.id);
    assert.ok(val>=range[m.difficolta][0]&&val<=range[m.difficolta][1],m.id);
    assert.equal(ricompensaMissione(m).aura,val);
    if(val>DIFFICOLTA[m.difficolta].aura)differenziate++;
  }
  assert.ok(differenziate>=15,'ricompense diverse per difficoltà della scenetta');
  const a=POOL.find(m=>m.id==='oscar-della-borraccia');
  assert.ok(a&&a.testo.includes('pausa'));
  assert.ok(ricompensaMissione(a,{segreta:true}).aura>ricompensaMissione(a).aura);
});

test('v357: cache/HTML sincronizzati e nessun asset assente',()=>{
  assert.match(src('index.html'),/palestra-v357/);
  assert.match(src('sw.js'),/palestra-v357/);
  assert.match(src('sw.js'),/img\/effetti\/aura-divina-v357\.svg/);
});
