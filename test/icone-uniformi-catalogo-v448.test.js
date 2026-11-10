import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ESERCIZI } from '../src/dati-iniziali.js';
import { miniaturaEsercizio, sorgenteMiniatura, POSIZIONI_ICONE_CORRETTE,
  FOTO_INCLINE_PULLDOWN_CORRETTA } from '../src/exercise-icons.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('v448: catalogo completo: stessa cornice e fonte per ciascuno dei 79 esercizi', () => {
  assert.equal(ESERCIZI.length, 81);
  const univoci=new Set();
  const conteggi={sprite:0,dedicata:0,originale:0};
  for(const e of ESERCIZI) {
    assert.ok(e.id && e.nome && e.foto,e.id);
    const src=sorgenteMiniatura(e);
    assert.ok(src && ['sprite','dedicata','originale'].includes(src.tipo),e.id);
    conteggi[src.tipo]++;
    if(src.tipo==='sprite') {
      assert.ok(POSIZIONI_ICONE_CORRETTE[e.id],e.id);
      const key=(src.atlas || 'img/esercizi/esercizi-uniformi-v455.webp')+':'+src.x.toFixed(5)+':'+src.y.toFixed(5);
      assert.ok(!univoci.has(key),'due icone diverse condividono la stessa cella: '+e.id);
      univoci.add(key);
    } else {
      assert.match(src.src,/^(?:\.\/)?img\/esercizi\//,e.id);
      assert.ok(src.zoom>=1 && src.zoom<=1.28,e.id);
    }
  }
  assert.deepEqual(conteggi,{sprite:68,dedicata:1,originale:12});
  assert.equal(FOTO_INCLINE_PULLDOWN_CORRETTA,'img/esercizi/incline-single-arm-pulldown-v465.webp');
});

test('v448: tutte le immagini locali esistono, nessuna duplicazione imprevista',()=>{
  const gruppi=new Map();
  for(const e of ESERCIZI) {
    const fonte=sorgenteMiniatura(e);
    if(fonte.tipo==='sprite') continue; // celle diverse dello stesso atlas
    const path=fonte.src.replace(/^\.\//,'');
    const bytes=readFileSync(new URL('../'+path, import.meta.url));
    assert.ok(bytes.length>1000,path);
    const sha=createHash('sha256').update(bytes).digest('hex');
    if(!gruppi.has(sha)) gruppi.set(sha,[]);
    gruppi.get(sha).push(e.id);
  }
  const duplicati=[...gruppi.values()].filter(g=>g.length>1).map(g=>g.slice().sort());
  const attesi=[];
  assert.deepEqual(duplicati.sort((a,b)=>a.join().localeCompare(b.join())),
                   attesi.sort((a,b)=>a.join().localeCompare(b.join())));
});

test('v448: stesso nodo accessibile e riquadro su tutti i tipi di icona',()=>{
  const old=globalThis.document;
  globalThis.document={
    createElement(tag) {
      return {tag, attributes:{},children:[], dataset:{},className:'',
        setAttribute(k,v){this.attributes[k]=String(v);},
        appendChild(n){this.children.push(n);},
      };
    },
  };
  try {
    for(const id of ['ex-chest-press','ex-iso-lateral-row','ex-lying-cable-curl']){
      const e=ESERCIZI.find(x=>x.id===id);
      const out=miniaturaEsercizio(e);
      assert.equal(out.tag,'span');
      assert.match(out.className,/foto-esercizio-uniforme/);
      assert.match(out.attributes['aria-label'],/Illustrazione di/);
      assert.equal(out.children.length,1);
      assert.match(out.children[0].className,/foto-esercizio-arte/);
      assert.equal(out.children[0].attributes['aria-hidden'],'true');
    }
    const big=miniaturaEsercizio(ESERCIZI[0],true);
    assert.match(big.className,/grande/);
  } finally {globalThis.document=old;}
});

test('v448: stile viola, cerchio, nitidezza e nessun taglio aggressivo per tutti',()=>{
  const css=read('stile.css');
  const script=read('src/exercise-icons.js');
  const sw=read('sw.js');
  assert.match(css,/\.foto-esercizio-uniforme::before[\s\S]*?border-radius: 50%/);
  assert.match(css,/\.foto-esercizio-arte-originale[\s\S]*?object-fit: contain/);
  assert.match(css,/\.foto-esercizio-sprite[\s\S]*?background-size: 800% 1000%/);
  assert.match(css,/\.foto-esercizio-arte[\s\S]*?pointer-events: none/);
  assert.doesNotMatch(css,/image-rendering:\s*pixelated/);
  const stileIcone=css.slice(css.indexOf('/* v448: un solo sistema visivo'),css.indexOf('@media (max-width: 390px)',css.indexOf('/* v448: un solo sistema visivo')));
  assert.doesNotMatch(stileIcone,/filter:\s*blur\(/);
  assert.match(script,/ZOOM_ICONE_STORICHE/);
  assert.match(sw,/const VERSIONE = 'palestra-v465'/);
  assert.match(sw,/'\.\/img\/esercizi\/esercizi-uniformi-v455\.webp'/);
});
