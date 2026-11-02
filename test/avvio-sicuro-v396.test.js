import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url),'utf8');
const appSource = read('src/app.js');
const html = read('index.html');

function blocco(script, from, to) {
  const a=script.indexOf(from);
  assert.ok(a>=0,'non trovo '+from);
  const b=script.indexOf(to,a);
  assert.ok(b>a,'non trovo la fine di '+from);
  return script.slice(a,b);
}
function fintoBrowser(storico={}) {
  const ascoltatori={};
  const storage=new Map(Object.entries(storico));
  const root = { children:[{className:'caricamento',textContent:'Carico i tuoi dati...'}],
    get firstChild(){return this.children[0]||null;},
    removeChild(n){this.children.splice(this.children.indexOf(n),1);},
    appendChild(n){this.children.push(n);},
    querySelector(q){return q==='.caricamento' ? this.children.find(c=>c.className?.split(' ').includes('caricamento'))||null:null;},
  };
  function createElement(tag){
    return {tagName:tag,className:'',textContent:'',children:[],listeners:{},
      appendChild(n){this.children.push(n);},
      addEventListener(tipo,fn){this.listeners[tipo]=fn;},
    };
  }
  let timeout=null, ricariche=0;
  const win={
    location:{reload(){ricariche++;}},
    addEventListener(tipo,fn){ascoltatori[tipo]=fn;},
  };
  const context={window:win,document:{getElementById(id){return id==='app'?root:null;},createElement},
    setTimeout(fn){timeout=fn;return 1;},
    sessionStorage:{getItem(k){return storage.get(k)||null;},setItem(k,v){storage.set(k,String(v));}},
    console,
  };
  const source = blocco(html,'/* Protezione autonoma:', '</script>');
  vm.runInNewContext(source,context);
  return {win,root,storage,ascoltatori,runTimer:()=>timeout(),get reloads(){return ricariche;}};
}
test('avvio locale disegnato PRIMA della preparazione cloud',()=>{
  const local=appSource.indexOf("// Prima i dati salvati sul dispositivo:");
  const render=appSource.indexOf('    disegna();',local);
  const online=appSource.indexOf("    aggiornaFaseAvvio('preparazione della sincronizzazione online');",local);
  const sync=appSource.indexOf('    sync.avvia();',local);
  assert.ok(local>0&&render>local&&online>render&&sync>online);
  assert.match(appSource.slice(local,online),/caricaLivelliImparati\(\)/);
  assert.match(appSource.slice(local,online),/aggiornaPesoInMemoria\(\)/);
  assert.match(appSource.slice(local,online),/PAL(E|E)STRA_AVVIO\.pronto = true/);
});
test('nessuna opzione avvio può cancellare il database locale',()=>{
  const codiceErrore=blocco(appSource,'function mostraErrore(radice, errore)', 'async function ricaricaTutto(');
  assert.doesNotMatch(codiceErrore,/svuotaTutto|localStorage\.removeItem|indexedDB\.deleteDatabase/);
  assert.match(codiceErrore,/Riprova/);
  assert.match(appSource,/Riprova apertura/);
});
test('se il modulo non parte, prova una sola ricarica automatica',()=>{
  const b=fintoBrowser();
  b.runTimer();
  assert.equal(b.reloads,1);
  assert.equal(b.storage.get('palestra-avvio-automatico-v396'),'1');
  const secondo=fintoBrowser(Object.fromEntries(b.storage));
  secondo.runTimer();
  assert.equal(secondo.reloads,0,'niente loop di ricariche');
  const msg=secondo.root.children[0];
  assert.match(msg.children[0].textContent,/Non riesco/);
  const bottone=msg.children.find(n=>n.tagName==='button');
  assert.ok(bottone?.listeners.click);
  bottone.listeners.click();
  assert.equal(secondo.reloads,1);
});
test('se l avvio locale è lento, mostra la fase e non ricarica automaticamente',()=>{
  const b=fintoBrowser();
  b.win.PALESTRA_AVVIO.fase='lettura di esercizi e allenamenti salvati';
  b.runTimer();
  assert.equal(b.reloads,0);
  assert.match(b.root.children[0].children[1].textContent,/lettura di esercizi/);
  assert.ok(b.root.children[0].children.some(n=>n.tagName==='button'));
});
test('quando la scheda è pronta il watchdog non cambia la pagina',()=>{
  const b=fintoBrowser();
  b.win.PALESTRA_AVVIO.pronto=true;
  b.runTimer();
  assert.equal(b.reloads,0);
  assert.equal(b.root.children.length,1);
});
test('errore di import mostra errore e pulsante, non un caricamento eterno',()=>{
  const b=fintoBrowser();
  b.ascoltatori.error({message:'NetworkError'});
  assert.match(b.root.children[0].children[0].textContent,/Errore durante l’avvio/);
  assert.match(b.root.children[0].children[1].textContent,/NetworkError/);
  assert.ok(b.root.children[0].children.some(n=>n.tagName==='button'));
});
