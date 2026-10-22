import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
const righe = readFileSync(P, 'utf8').split('\n');
const fuori = [];
let dentro = false;   // siamo dentro il blocco del peso?
let n = 0;

for (let i = 0; i < righe.length; i++) {
  const r = righe[i];
  if (r.includes("const boxForza = el('div', { class: 'spiegazione generale' });")) {
    dentro = true;
    fuori.push(r);
    fuori.push("      // La spiegazione lunga sta in una SCHEDA CHIUSA (22/10/2026): la pagina dei");
    fuori.push("      // Progressi era troppo lunga e troppo incasinata. Il titolo si vede, il");
    fuori.push("      // resto si apre con un tocco.");
    fuori.push("      const dentroForza = el('div', { class: 'dentro-scheda' });");
    fuori.push("      boxForza.appendChild(el('details', { class: 'scheda-chiusa' }, [");
    fuori.push("        el('summary', { class: 'scheda-titolo', testo: 'Quanto stai sollevando in piu' del tuo corpo' }),");
    fuori.push("        dentroForza,");
    fuori.push("      ]));");
    n++;
    continue;
  }
  if (dentro) {
    // salta il blocco apriForza (la riga, il summary e la chiusura)
    if (r.includes("const apriForza = el('details'")) {
      while (i < righe.length && !/\]\);/.test(righe[i])) i++;
      continue;
    }
    // salta l'h3 (ora c'e' il summary)
    if (r.includes("boxForza.appendChild(el('h3'")) continue;
    // i paragrafi vanno dentro la scheda
    if (r.includes("boxForza.appendChild(el('p'")) { fuori.push(r.replace('boxForza.appendChild(', 'dentroForza.appendChild(')); continue; }
    if (r.includes("zona.appendChild(boxForza);")) { dentro = false; fuori.push(r); continue; }
  }
  fuori.push(r);
}

writeFileSync(P, fuori.join('\n'), 'utf8');
console.log('ok: la spiegazione del peso e\' in una scheda chiusa (' + n + ')');
