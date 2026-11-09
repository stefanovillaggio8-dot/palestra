import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ESERCIZI} from '../src/dati-iniziali.js';
import {POSIZIONI_ICONE_CORRETTE, FOTO_VERIFICATE_TECNICAMENTE,
  FOTO_INCLINE_PULLDOWN_CORRETTA, sorgenteMiniatura} from '../src/exercise-icons.js';

const read = p => readFileSync(new URL('../'+p,import.meta.url));
const txt = p => read(p).toString('utf8');
const spriteHash = '554ca73256f46fe6e90ec06fc69933550953965fa6e5a0cba64a53d67205e1f1';

test('v451: catalogo intero senza ID doppi, sorgenti e celle attribuite una sola volta',()=>{
  assert.equal(ESERCIZI.length,79);
  assert.equal(new Set(ESERCIZI.map(x=>x.id)).size,79);
  assert.equal(Object.keys(POSIZIONI_ICONE_CORRETTE).length,78);
  assert.equal(Object.keys(FOTO_VERIFICATE_TECNICAMENTE).length,12);
  const counts={sprite:0,originale:0,dedicata:0};
  const seen=new Set();
  for(const e of ESERCIZI) {
    const f=sorgenteMiniatura(e);
    assert.ok(f,'sorgente assente: '+e.id);
    assert.ok(Object.hasOwn(counts,f.tipo),'tipo sconosciuto: '+e.id);
    counts[f.tipo]++;
    if(f.tipo==='sprite'){
      const key=f.x.toFixed(6)+'/'+f.y.toFixed(6);
      assert.ok(!seen.has(key),'cella riutilizzata: '+e.id);
      seen.add(key);
      assert.ok(Number.isFinite(f.x)&&Number.isFinite(f.y));
    } else {
      assert.match(f.src,/^img\/esercizi\//,'foto specifica non locale: '+e.id);
      assert.ok(read(f.src).length>1500,'foto personale assente: '+e.id);
    }
  }
  assert.deepEqual(counts,{sprite:66,originale:12,dedicata:1});
});

test('v451: non riutilizzare un esercizio sbagliato quando manca la variante',()=>{
  const fallback=['ex-one-arm-overhead-tricep-extension','ex-scott-bench-curl',
    'ex-chest-supported-shrug','ex-lat-pulldown-lats','ex-bench-pull',
    'ex-smith-machine-bent-over-row','ex-smith-machine-shrug'];
  for(const id of fallback){
    const e=ESERCIZI.find(x=>x.id===id),f=sorgenteMiniatura(e);
    assert.equal(f.tipo,'originale',id);
    assert.equal(f.src,FOTO_VERIFICATE_TECNICAMENTE[id]);
  }
  assert.equal(sorgenteMiniatura(ESERCIZI.find(e=>e.id==='ex-lying-cable-curl')).src,FOTO_INCLINE_PULLDOWN_CORRETTA);
  assert.notEqual(sorgenteMiniatura(ESERCIZI.find(e=>e.id==='ex-cable-hammer-curl')).x,
                  sorgenteMiniatura(ESERCIZI.find(e=>e.id==='ex-cable-bicep-curl')).x);
});

test('v451: l atlante HD e quello effettivamente controllato',()=>{
  const bytes=read('img/esercizi/esercizi-verificati-v451.webp');
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.ok(bytes.byteLength>=200000,'qualita eccessivamente compressa');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),spriteHash,
    'atlas diverso dall anteprima revisionata');
  const sw=txt('sw.js'),html=txt('index.html'),css=txt('stile.css');
  assert.match(css,/background-image: url\('\.\/img\/esercizi\/esercizi-uniformi-v455\.webp'\)/);
  assert.match(css,/background-size: 800% 1000%/);
  assert.match(sw,/palestra-v455/);
  assert.match(sw,/esercizi-uniformi-v455\.webp/);
  assert.match(html,/PALESTRA_VERSIONE = 'palestra-v455'/);
  assert.match(html,/stile\.css\?v=455/);
  assert.match(html,/app\.js\?v=455/);
  const doc=txt('docs/verifica-79-icone-v451.md');
  assert.match(doc,/## Registro esercizio per esercizio/);
  assert.equal((doc.match(/^\| \d+ \|/gm)||[]).length,79);
  for(const e of ESERCIZI)assert.ok(doc.includes('| '+e.nome+' |'),'riga di audit mancante: '+e.id);
});

test('v451: core e dati personali restano invariati',()=>{
  // Questo test impedisce che fix visivi attivino import, cancellazioni o
  // riscritture di dati di allenamento: il modulo icone e solo una vista.
  const src=txt('src/exercise-icons.js');
  for(const fn of ['salvaSerie','eliminaSeduta','supabase.from','localStorage.setItem']){
    assert.ok(!src.includes(fn),'scrittura vietata dentro miniatura: '+fn);
  }
});
