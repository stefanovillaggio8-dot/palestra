import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/test/personaggio-svg.test.js';
let s = readFileSync(P, 'utf8');
const V = `    // e il codice mette la classe
    assert.match(app, /classList\\.add\\('con-foto'\\)/,
    'il codice deve dire che qui dentro c\\'e una foto');`;
const N = `    // e il codice dice che qui dentro c'e' il DISEGNO (22/10/2026).
    //
    // Prima era la FOTO della classe: e' una foto, quindi aveva lo sfondo nero
    // dentro l'immagine e la testa del personaggio restava uno staccone nero.
    // Ora e' il disegno vettoriale, che e' trasparente come tutto il resto.
    assert.match(app, /personaggio-svg-profilo/,
    'il codice deve dire che qui dentro c\\'e il disegno');`;
if (!s.includes(V)) { console.log('NON TROVATO: il controllo sulla foto'); process.exit(1); }
s = s.replace(V, N);
writeFileSync(P, s, 'utf8');
console.log('ok: il test aggiornato (ora il profilo mostra il disegno)');
