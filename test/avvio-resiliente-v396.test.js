import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p, import.meta.url),'utf8');
const app=read('src/app.js'),html=read('index.html');
const boot=app.slice(app.indexOf('async function avvia() {'),app.indexOf('/**\n * Rete di sicurezza:',app.indexOf('async function avvia() {')));
test('la scheda appare usando il database locale senza attendere il cloud',()=>{
  const visualizza=boot.indexOf('disegna();');
  const rete=boot.indexOf("aggiornaFaseAvvio('preparazione della sincronizzazione online')");
  assert.ok(visualizza>0 && rete>visualizza,'disegna PRIMA del setup online');
  const primaRete=boot.slice(0,rete);
  assert.match(primaRete,/ricaricaTutto\(\{ caricaAmiciOnline: false \}\)/);
  assert.match(primaRete,/clearTimeout\(controlloAvvio\)/);
  assert.match(primaRete,/window\.PALESTRA_AVVIO\.pronto = true/);
  assert.doesNotMatch(primaRete,/await preparaAccountOnline\(\)/);
});
test('ricaricaTutto può evitare la RPC amici durante il primo caricamento',()=>{
 const from=app.indexOf('async function ricaricaTutto(');
 const to=app.indexOf('/**\n * I ZAVORRI',from);
 const match=app.slice(from,to);
 assert.match(match,/caricaAmiciOnline = true/);
 assert.match(match,/if \(caricaAmiciOnline && sb\.collegato\(\)\)/);
});
test('l’avvio espone la fase e offre il tasto Riprova senza cancellare',()=>{
 assert.match(boot,/window\.PALESTRA_AVVIO\.fase = testo/);
 assert.match(boot,/Riprova apertura/);
 assert.match(boot,/window\.location\.reload\(\)/);
 const from=app.indexOf('function mostraErrore(radice, errore)');
 const to=app.indexOf('async function ricaricaTutto(',from);
 const fallback=app.slice(from,to);
 assert.doesNotMatch(fallback,/svuotaTutto|localStorage\.removeItem|indexedDB\.deleteDatabase/);
 assert.match(fallback,/Riprova/);
});
test('un mancato caricamento del modulo JS non lascia uno spinner senza fine',()=>{
 assert.match(html,/PALESTRA_AVVIO = boot/);
 assert.match(html,/boot\.fase === 'caricamento degli script'/);
 assert.match(html,/setTimeout\(function \(\) \{/);
 assert.match(html,/Riprova apertura/);
 assert.match(html,/window\.location\.reload\(\)/);
 assert.match(html,/sessionStorage\.getItem\(chiave\)/);
 assert.doesNotMatch(html,/indexedDB\.deleteDatabase|localStorage\.clear\(|caches\.delete\(/);
});
test('gli errori cloud non distruggono la schermata locale già pronta',()=>{
 assert.match(boot,/if \(window\.PALESTRA_AVVIO && window\.PALESTRA_AVVIO\.pronto\)/);
 assert.match(boot,/Connessione online non riuscita/);
 assert.match(boot,/mostraErrore\(radice, errore\)/);
});
