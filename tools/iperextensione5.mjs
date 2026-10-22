import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DIR = 'C:/Users/stefa/Documents/Default Project/palestra/';
execSync('git checkout -- src/muscoli-parti.js', { cwd: DIR });
console.log('ripristinato muscoli-parti.js (v250)');

const P = DIR + 'src/muscoli-parti.js';
let s = readFileSync(P, 'utf8');

// 1. i LOMBARI: il pezzo principale dell'iperextensione
const V1 = "    parole: ['lombare', 'lombari', 'lower back', 'bassa schiena'],";
const N1 = "    // I LOMBARI SONO IL PEZZO PRINCIPALE DELL'IPERESTENSIONE (22/10/2026).\n"
  + "    // Ste: \"no il contrario, i lombari principali\". Stesa a 45 gradi, l'iperextensione\n"
  + "    // carica la bassa schiena pieno, e i glutei aiutano ma piu' piano.\n"
  + "    parole: ['hyperextension', 'iperextensione', 'back extension', 'lombare', 'lombari'],";
if (!s.includes(V1)) { console.log('NON TROVATO 1'); process.exit(1); }
s = s.replace(V1, N1);

// 2. i GLUTEI: via le parole dell'iperextensione (match sicuro: fino alla ])
const re2 = /parole: \['hip thrust'[^\]]*\],/;
const m2 = s.match(re2);
if (!m2) { console.log('NON TROVATO 2'); process.exit(1); }
s = s.replace(m2[0], "parole: ['hip thrust', 'glute bridge', 'squat', 'stacco', 'affondi'],");

// 3. il movimento: il secondario ora sono i glutei
if (!s.includes('secondari: { dorso_basso: 0.5 }')) { console.log('NON TROVATO 3'); process.exit(1); }
s = s.replace('secondari: { dorso_basso: 0.5 }', 'secondari: { glutei: 0.5 }');

writeFileSync(P, s, 'utf8');
console.log('ok: i lombari sono il principale, i glutei il secondario a 0,5');
