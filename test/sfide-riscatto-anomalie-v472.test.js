import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {segnaliDatiSospetti} from '../src/controlli-missioni.js';
import {quadroSfideAutomatiche} from '../src/sfide-automatiche.js';

const today='2026-11-11';
const seduta={id:'s',data:today,stato:'completata',ora_inizio:'2026-11-11T14:00:00Z',
  ora_fine:'2026-11-11T15:15:00Z'};
const serie=Array.from({length:4},(_,i)=>({id:'a'+i,seduta_id:'s',esercizio_id:'e',
  stato:'fatta',ripetizioni:8,peso:40+i*2}));
const baseline=()=>({sedute:[{...seduta}],serie:serie.map(x=>({...x})),oggi:today});

test('v472: nessuna anomalia sui dati normali e nessuna mutazione',()=>{
  const v=baseline(),before=structuredClone(v);
  assert.deepEqual(segnaliDatiSospetti(v),[]);
  assert.deepEqual(v,before,'un audit non puo modificare neanche un campo');
});
test('v472: un orario invertito segnala un potenziale errore, senza annullare serie',()=>{
  const v=baseline();
  v.sedute[0].ora_fine='2026-11-11T13:59:00Z';
  const before=structuredClone(v);
  assert.ok(segnaliDatiSospetti(v).some(x=>x.codice==='orari_invertiti'));
  assert.deepEqual(v,before);
});
test('v472: troppe serie in pochi minuti sono sospette ma non una prova di frode',()=>{
  const v=baseline();v.sedute[0].ora_fine='2026-11-11T14:02:00Z';
  v.serie=Array.from({length:14},(_,i)=>({...serie[0],id:'num'+i}));
  assert.ok(segnaliDatiSospetti(v).some(x=>x.codice==='serie_troppo_rapide'));
});
test('v472: un numero impossibile viene segnalato ma non distrugge il Rank',()=>{
  const v=baseline();
  v.serie[0].ripetizioni=-5;
  v.serie[1].peso=10000;
  assert.ok(segnaliDatiSospetti(v).some(x=>x.codice==='ripetizioni_non_valide'));
  assert.ok(segnaliDatiSospetti(v).some(x=>x.codice==='peso_da_controllare'));
});
test('v472: date future e allenamenti nel cestino',()=>{
  const v=baseline();
  v.sedute[0].data='2027-12-01';
  assert.ok(segnaliDatiSospetti(v).some(x=>x.codice==='data_da_controllare'));
  v.sedute[0].eliminata=true;
  assert.deepEqual(segnaliDatiSospetti(v),[]);
});
test('v472: una missione non completata non puo generare un premio',()=>{
  const args={account:'io',oggi:today,sedute:[{...seduta}],serie:serie.slice(0,2),
    profilo:{giorni_allenamento:[2,3,5,6]},esercizi:[],ricompense:[]};
  const q=quadroSfideAutomatiche(args);
  const daily=q.daily.find(x=>x.id==='tre-serie');
  assert.equal(daily.raggiunta,false);
  const code=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
  assert.match(code,/if\(!voce\?\.raggiunta\|\|voce\.premiata\|\|!voce\.chiave\)return false/);
  assert.match(code,/if\(!valida\?\.raggiunta \|\| valida\.premiata\)/);
  assert.match(code,/await aspettaSalvataggi\(\)/);
  assert.match(code,/riscattiSfideInCorso/);
  const reconcile=code.slice(code.indexOf('function aggiornaSfideAutomatiche('),
    code.indexOf('async function riscattaSfidaAutomatica('));
  assert.doesNotMatch(reconcile,/db\.salva\('ricompense'/,'nessun accredito automatico');
});
