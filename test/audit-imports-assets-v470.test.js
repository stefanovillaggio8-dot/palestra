// Controlli statici generali: impediscono di pubblicare moduli JS o risorse
// offline mancanti senza richiedere browser, dati privati o un account reale.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, existsSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=rel=>readFileSync(join(root,rel),'utf8');
function scripts(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap(x=>{
    const p=join(dir,x.name);
    return x.isDirectory()?scripts(p):x.isFile()&&x.name.endsWith('.js')?[p]:[];
  });
}

test('audit generale: nessun import/export relativo verso moduli mancanti',()=>{
  let verificati=0;
  for(const file of scripts(join(root,'src'))){
    const testo=readFileSync(file,'utf8');
    const imports=/(?:^|\n)\s*(?:import|export)\s+(?:[^'"\n]*?from\s*)?['"](\.[^'"\n]+)['"]/g;
    for(const m of testo.matchAll(imports)){
      // I parametri ?v= servono al cache busting, non sono nel nome del file.
      const destinazione=resolve(dirname(file),m[1].split(/[?#]/)[0]);
      assert.ok(existsSync(destinazione),'Modulo mancante in '+file+': '+m[1]);
      verificati++;
    }
  }
  assert.ok(verificati>=70,'Il controllo deve coprire import reali, non una lista vuota');
});

test('audit generale: le immagini statiche della PWA e il catalogo esistono',()=>{
  const risorse=new Set();
  for(const file of ['sw.js','src/dati-iniziali.js','src/exercise-icons.js','verifica-icone.html']){
    const t=read(file);
    for(const m of t.matchAll(/['"](?:\.\/)?(img\/[A-Za-z0-9_./-]+\.(?:webp|svg|png|jpe?g))(?:\?[^'"]*)?['"]/g)){
      risorse.add(m[1]);
    }
  }
  const classi=['guerriero','berserker','assassino'];
  for(const classe of classi){
    for(let i=0;i<6;i++){
      risorse.add('img/personaggi/stati/'+classe+'-'+i+'.webp');
      risorse.add('img/personaggi/corona-v360/'+classe+'/stato-'+i+'/standard/base-divina.webp');
    }
    for(const livello of [0,3,5]) risorse.add('img/personaggi/aura-divina-v365/'+classe+'/stato-'+livello+'.webp');
    for(const effetto of ['ambra','fulmine','astrale']) risorse.add('img/personaggi/effetti/'+classe+'-'+effetto+'.webp');
  }
  for(const [classe,nomi] of Object.entries({
    assassino:['base','armatura-assassino-notte','armatura-assassino-spettro'],
    guerriero:['base','armatura-guerriero-braci','armatura-guerriero-abisso'],
    berserker:['base','armatura-berserker-rabbia','armatura-berserker-apocalisse']
  })) for(const nome of nomi) risorse.add('img/personaggi/aura-divina-v379/'+classe+'/'+nome+'.webp');
  for(const nome of ['braci','abisso','notte','cremisi','rabbia','apocalisse','astrale']) risorse.add('img/scenari/'+nome+'.svg');
  assert.ok(risorse.size>=150,'Il controllo deve coprire il catalogo e le risorse reali');
  for(const path of risorse) assert.ok(existsSync(join(root,path)),'Risorsa mancante: '+path);
});
