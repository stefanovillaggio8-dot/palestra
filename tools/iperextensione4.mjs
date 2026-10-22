import { readFileSync, writeFileSync } from 'node:fs';
const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/muscoli-parti.js';
let s = readFileSync(P, 'utf8');
const fatto = [];

// 1. i LOMBARI: il pezzo principale
s = s.replace(
  "    parole: ['lombare', 'lombari', 'lower back', 'bassa schiena'],",
  "    // I LOMBARI SONO IL PEZZO PRINCIPALE DELL'IPERESTENSIONE (22/10/2026).\n"
  + "    // Ste: \"no il contrario, i lombari principali\". Stesa a 45 gradi, l'iperextensione\n"
  + "    // carica la bassa schiena pieno, e i glutei aiutano ma piu' piano.\n"
  + "    parole: ['hyperextension', 'iperextensione', 'back extension', 'lombare', 'lombari'],");
fatto.push('i lombari sono il principale');

// 2. i GLUTEI: via le parole dell'iperextensione
s = s.replace(/parole: \['hip thrust'[\s\S]*?'back extension'\],/,
  "parole: ['hip thrust', 'glute bridge', 'squat', 'stacco', 'affondi'],");
s = s.replace(/\n *\/\/ L'IPERESTENSIONE \(22\/10\/2026\)\.[\s\S]*?'back extension'\],\n/,
  "\n    // L'IPERESTENSIONE (22/10/2026). Il pezzo principale sono i LOMBARI (Ste:\n"
  + "    // \"i lombari principali\"), i glutei aiutano e basta: nell'iperextensione\n"
  + "    // stesa a 45 gradi la spinta la fa la bassa schiena.\n");
fatto.push('i glutei non sono piu\' il principale');

// 3. il movimento: il secondario ora sono i glutei
s = s.replace(/secondari: \{ dorso_basso: 0\.5 \}/, 'secondari: { glutei: 0.5 }');
fatto.push('il secondario sono i glutei a 0,5');

// 4. il commento del movimento
s = s.replace(/    \/\/ Ste: "oltre la parte gia[\s\S]*?piu' chiara del gluteo\./,
  "    // Ste: \"oltre alla parte gia' evidenziata evidenzia meno forte i lombari\" e poi\n"
  + "    // \"no il contrario, i lombari principali\".\n"
  + "    //\n"
  + "    // Il pezzo principale sono i LOMBARI (la bassa schiena, l'erector spinae),\n"
  + "    // e i glutei sono il secondario a 0,5: si accendono insieme, ma piu' chiari.");

// 5. la nota dei lombari
s = s.replace(/    nota: 'La bassa schiena[\s\S]*?non è per te\.',/,
  "    nota: 'La bassa schiena, cioè i muscoli che stanno lungo la colonna (l’erector spinae). Nell’iperextensione sono il pezzo principale: lavori loro, e i glutei aiutano ma più piano. Se ti fa male la schiena, questo esercizio non è per te.',");

writeFileSync(P, s, 'utf8');
console.log('fatto: ' + fatto.join(', '));
