import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {valutaCampiSerieInsoliti} from '../src/validazione-serie.js';
import {presentaRank,regoleRankChiare} from '../src/rank-spiegato.js';
import {categoriaErrore,registraProblema,elencoProblemi,svuotaProblemi,
  paginaGenerica,generaReport} from '../src/diagnostica-rapida.js';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('v415: nessun popup durante la digitazione, controllo soltanto al completamento',()=>{
 assert.match(app,/async function aggiornaSerie\(serie, campi\)[\s\S]*?if \(campi\.stato === 'fatta'\) \{/);
 assert.match(app,/Object\.assign\(campi, valoriDigitatiDellaSerie\(riga, serie, chiave, serieCardio\)\)/);
 assert.match(app,/const salvata = await aggiornaSerie\(serie, campi\);\s*if \(!salvata\) \{/);
 assert.match(app,/segnaAspettoFatto\(riga, spunta, eraFatta, etichettaFatta\)/);
 assert.match(app,/impostaRecuperoSerie\(serie\.seduta_id, fatta\)/);
 assert.match(app,/const controlli = valutaCampiSerieInsoliti\(completi, serieAttuale, comparabili, \{/);
 assert.match(app,/alCompletamento: true/);
});

test('v415: 3 poi 37 kg, confronto SOLO sul valore finito, 37 normale',()=>{
 const storico=[{peso:35,ripetizioni:7,stato:'fatta'},{peso:37,ripetizioni:6,stato:'fatta'}];
 // Il "3" intermedio è già entrato nella bozza: non deve influenzare la guardia.
 const bozza={peso:3,ripetizioni:7,giri_extra:[]};
 assert.deepEqual(valutaCampiSerieInsoliti({...bozza,peso:37},bozza,storico,{alCompletamento:true}),[]);
 assert.equal(valutaCampiSerieInsoliti({...bozza,peso:800},bozza,storico,{alCompletamento:true})[0].tipo,'da_confermare');
});
test('v415: con zero storico i numeri estremi vengono chiesti solo alla spunta',()=>{
 const bozza={peso:800,ripetizioni:8,giri_extra:[]};
 assert.equal(valutaCampiSerieInsoliti(bozza,bozza,[],{alCompletamento:true})[0].tipo,'da_confermare');
 assert.deepEqual(valutaCampiSerieInsoliti({peso:37,ripetizioni:7},bozza,[],{alCompletamento:true}),[]);
});
test('v415: 2 rip assistite su 8 sono valide, 12 su 8 no',()=>{
 const bozza={peso:37,ripetizioni:8,spotter:true,rip_assistite:2};
 assert.deepEqual(valutaCampiSerieInsoliti(bozza,bozza,[],{alCompletamento:true}),[]);
 assert.equal(valutaCampiSerieInsoliti({...bozza,rip_assistite:12},bozza,[],{alCompletamento:true})[0].tipo,'non_valido');
});
test('v415: il dropset viene verificato anche quando gia salvato come bozza',()=>{
 const bozza={peso:80,ripetizioni:8,giri_extra:[{peso:800,ripetizioni:7}]};
 assert.equal(valutaCampiSerieInsoliti(bozza,bozza,[],{alCompletamento:true})[0].tipo,'da_confermare');
});
test('v415: testo Rank comprensibile, risultato reale, LP e divisione',()=>{
 const r={valido:true,esercizio:{nome:'Chest Press'},rank:{nome:'DIAMOND'},
  rankId:'diamond',divisione:{nome:'I'},lp:30,serie:{peso:37,ripetizioni:8},
  profilo:{unita:'kg'},pesoCorporeo:66};
 const info=presentaRank(r);
 assert.match(info.titolo,/Chest Press.*DIAMOND I/);
 assert.match(info.frasi.join(' '),/37 kg per 8 ripetizioni/);
 assert.match(info.frasi.join(' '),/4 per la divisione II/);
 assert.doesNotMatch(info.frasi.join(' ').toLowerCase(),/epley|coefficiente|esponente|allometr/);
 assert.ok(regoleRankChiare().length>=5);
});
test('v415: Olympian non ha divisioni; niente false soglie numeriche',()=>{
 const info=presentaRank({valido:true,esercizio:{nome:'Dip'},rankId:'olympian',
  rank:{nome:'OLYMPIAN'},divisione:{nome:'III'},inTop:true,lp:95,
  serie:{peso:40,ripetizioni:5},profilo:{unita:'kg'}});
 assert.ok(!info.titolo.includes('III'));
 assert.match(info.frasi.join(' '),/non ha divisioni/);
 assert.doesNotMatch(info.frasi.join(' '),/mancano \d+ LP/);
});
test('v415: diagnostica classifica errori senza salvarne il testo',()=>{
 svuotaProblemi();
 const segreto='example.person@example.org / ?token=secret123 invalid JWT';
 registraProblema(segreto,'browser');
 registraProblema('Failed to fetch','sincronizzazione');
 const e=elencoProblemi();
 assert.equal(e.length,2);
 assert.equal(e[0].tipo,'accesso online');
 assert.equal(e[1].tipo,'connessione');
 assert.doesNotMatch(JSON.stringify(e),/secret123|example.person|jwt/i);
 assert.equal(categoriaErrore('IndexedDB quota exceeded'),'memoria del dispositivo');
});
test('v415: report non include account, url, token, errori grezzi o ID di seduta',()=>{
 const rapporto=generaReport({versione:'v415;token=abc',dispositivo:'iPhone/iPad',
  online:true,installata:true,serviceWorker:true,cloud:'collegato',
  sincronizzazione:'ok',inAttesa:3,erroriSync:1,conflitti:2,
  schermata:paginaGenerica('#/seduta/private-uuid-1234'),
  errori:[{tipo:'errore dell’app',origine:'browser',message:'token=not-to-expose'}]});
 assert.match(rapporto,/DIAGNOSTICA PALESTRA/);
 assert.match(rapporto,/Schermata: Allenamento/);
 assert.match(rapporto,/Modifiche in attesa: 3/);
 for(const prohibited of ['token=abc','private-uuid-1234','not-to-expose','example.person@example.org'])
  assert.ok(!rapporto.includes(prohibited),prohibited);
 assert.equal(paginaGenerica('#/amico/user-secret'),'Amici');
});
test('v415: Rank e diagnostica accessibili da UI e presenti nella cache offline',()=>{
 assert.match(app,/\['spiega', 'SPIEGAMI IL RANK'\]/);
 assert.match(app,/sezioneSpiegaRank\(st\)/);
 assert.match(app,/el\('details',\{class:'blocco guida-rank-dettaglio'\}/);
 assert.match(app,/Diagnostica · trova i problemi/);
 assert.match(app,/bottone\('Prepara report'/);
 assert.match(app,/bottone\('Copia report'/);
 assert.match(sw,/\.\/src\/rank-spiegato\.js/);
 assert.match(sw,/\.\/src\/diagnostica-rapida\.js/);
 assert.match(sw,/palestra-v415/);
});
