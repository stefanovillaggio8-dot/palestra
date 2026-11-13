import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {ARMATURE_ATELIER,CLASSI_ATELIER,NUMERO_COMBINAZIONI_ATELIER,
  combinazioniRpg,opzioniAtelier} from '../src/rpg-atelier.js';
import {percorsoFotoArmaturaArmataV371} from '../src/foto-armatura-armata-v371.js';
import {disegnaEnergiaFotograficaRpg} from '../src/rpg-energia-incarnata.js';

test('v494: 9.072 combinazioni distinguono ogni personaggio, stato, armatura, effetto, titolo, Aura e Corona',()=>{
  const visitati=new Set(),contatore={astrale:0,nebulosa:0};
  for(const opzione of combinazioniRpg()){
    const c=opzioniAtelier(opzione);
    const key=[c.classe,c.stadio,c.armatura,c.effetto,c.divina,c.corona,c.titolo].join('|');
    assert.equal(visitati.has(key),false,'combinazione duplicata: '+key);
    visitati.add(key);
    assert.ok(CLASSI_ATELIER.includes(c.classe));
    assert.ok(ARMATURE_ATELIER[c.classe].includes(c.armatura));
    if(c.effetto==='skin-mitica')contatore.astrale++;
    if(c.effetto==='effetto-nebula')contatore.nebulosa++;
    assert.equal(c.skin,'','Astrale va trattato come effetto, mai come skin sostitutiva');
  }
  assert.equal(visitati.size,NUMERO_COMBINAZIONI_ATELIER);
  assert.equal(visitati.size,9072);
  assert.equal(contatore.astrale,1512);
  assert.equal(contatore.nebulosa,1512);
});

test('v494: texture giusta per ogni classe, nessun ritaglio di avatar o cambio attrezzatura',()=>{
  const texture={naturalWidth:1024,naturalHeight:1536};
  for(const [row,classe] of ['assassino','guerriero','berserker'].entries()){
    for(const [col,effetto] of ['astrale','nebulosa'].entries()){
      const draw=[];
      const ctx={save(){},restore(){},drawImage(...args){draw.push(args);}};
      assert.equal(disegnaEnergiaFotograficaRpg(ctx,400,600,classe,effetto,3,
        {fase:'retro',texture}),true);
      assert.ok(draw.length>=2);
      assert.equal(draw[0][0],texture);
      assert.deepEqual(draw[0].slice(1,5),[col*512,row*512,512,
        effetto==='astrale'?404:512],classe+' '+effetto);
    }
    for(const armatura of ARMATURE_ATELIER[classe]){
      if(!armatura)continue;
      for(const stato of [4,5]){
        const url=percorsoFotoArmaturaArmataV371({classe,stato,armatura,armaSbloccata:true,effetto:null});
        assert.ok(url?.includes('/'+classe+'/'+armatura+'/base.webp'),classe+' '+armatura);
        // In CI checkout completo, in locale può essere attivo sparse-checkout.
        assert.equal(typeof url,'string');
      }
    }
    for(let stato=0;stato<=5;stato++){
      const url=new URL('../img/personaggi/stati/'+classe+'-'+stato+'.webp',import.meta.url);
      const cutout=new URL('../img/personaggi/cutout/stati/'+classe+'-'+stato+'.webp',import.meta.url);
      assert.ok(existsSync(url),url+' mancante');
      assert.ok(existsSync(cutout),cutout+' mancante');
    }
  }
});
