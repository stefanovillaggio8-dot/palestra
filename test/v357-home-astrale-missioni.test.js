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

test('v359: Astrale occupa SOLO Effetto, non uno slot extra',()=>{
  const app=src('src/app.js'),eq=src('src/equipaggiamento-rpg.js');
  assert.match(app,/id:'skin-mitica',nome:'Astrale[^\n]*tipo:'Effetto'/);
  assert.match(app,/slotPerOggettoRpg/);
  assert.match(app,/equipaggiamentoRpgUnico/);
  assert.match(eq,/if\(!out\.Effetto/);
  assert.doesNotMatch(app,/slotOggetto = \(o\) => o\.id === 'skin-mitica' \? 'Astrale'/);
});

test('v359: Aura divina visibile e Corona tramite foto WebP non SVG',()=>{
  const app=src('src/app.js'),css=src('stile-rpg.css');
  assert.match(app,/!auraDivinaAttiva && montaFotoCombinataRpg/);
  assert.match(css,/\.aura-foto-divina/);
  assert.match(app,/percorsoFotoCoronaV359/);
  assert.doesNotMatch(app,/src:'\.\/img\/effetti\/corona-infinito-v358\.svg'/);
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
  assert.match(src('index.html'),/palestra-v359/);
  assert.match(src('sw.js'),/palestra-v359/);
  assert.match(src('sw.js'),/src\/foto-corona-v359\.js/);
});
