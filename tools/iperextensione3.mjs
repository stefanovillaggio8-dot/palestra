import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/muscoli-parti.js';
let s = readFileSync(P, 'utf8');
const fatto = [];

// 1. i LOMBARI tornano a essere il pezzo principale dell'iperextensione.
{
  const V = "    parole: ['lombare', 'lombari', 'lower back', 'bassa schiena'],";
  const N = "    // I LOMBARI SONO IL PEZZO PRINCIPALE DELL'IPERESTENSIONE (22/10/2026).\n"
    + "    // Ste: \"no il contrario, i lombari principali\". L'iperextensione stesa a 45\n"
    + "    // gradi carica la bassa schiena pieno, e i glutei aiutano ma piu' piano.\n"
    + "    parole: ['hyperextension', 'iperextensione', 'back extension', 'lombare', 'lombari'],";
  if (!s.includes(V)) { console.log('NON TROVATO: le parole dei lombari'); process.exit(1); }
  s = s.replace(V, N);
  fatto.push('i lombari sono il principale');
}

// 2. i GLUTEI: via le parole dell'iperextensione (trovate con una regex, il
//    commento nel mezzo cambia a ogni versione)
{
  const re = /parole: \['hip thrust'[\s\S]*?'back extension'\],/;
  const m = s.match(re);
  if (!m) { console.log('NON TROVATO: le parole dei glutei'); process.exit(1); }
  const N = "parole: ['hip thrust', 'glute bridge', 'squat', 'stacco', 'affondi'],";
  s = s.replace(m[0], N);
  // il commento che spiegava la cosa al contrario
  const re2 = /\n *\/\/ L'IPERESTENSIONE \(22\/10\/2026\)\.[\s\S]*?'back extension'\],\n/;
  s = s.replace(re2, '\n    // L\'IPERESTENSIONE (22/10/2026). Il pezzo principale sono i LOMBARI (Ste:\n'
    + '    // "i lombari principali"), i glutei aiutano e basta: nell\'iperextensione\n'
    + '    // stesa a 45 gradi la spinta la fa la bassa schiena.\n');
  fatto.push('i glutei non sono piu\' il principale');
}

// 3. il movimento: ora il secondario sono i GLUTEI.
{
  const V = "    id: 'iperextensione',\n    parole: ['hyperextension', 'iperextensione', 'back extension'],\n    secondari: { dorso_basso: 0.5 },";
  const N = "    id: 'iperextensione',\n    parole: ['hyperextension', 'iperextensione', 'back extension'],\n    secondari: { glutei: 0.5 },";
  if (!s.includes(V)) { console.log('NON TROVATO: il movimento'); process.exit(1); }
  s = s.replace(V, N);
  fatto.push('i glutei sono il secondario a 0,5');
}

// 4. il commento del movimento.
{
  const re = /    \/\/ Ste: "oltre alla parte gia[\s\S]*?piu' chiara del gluteo\./;
  const m = s.match(re);
  if (m) {
    s = s.replace(m[0],
      '    // Ste: "oltre alla parte gia\' evidenziata evidenzia meno forte i lombari" e poi\n'
      + '    // "no il contrario, i lombari principali".\n'
      + '    //\n'
      + '    // Il pezzo principale sono i LOMBARI (la bassa schiena, l\'erector spinae),\n'
      + '    // e i glutei sono il secondario a 0,5: si accendono insieme, ma piu\' chiari.');
    fatto.push('il commento del movimento');
  }
}

// 5. la nota dei lombari: ora sono il principale.
{
  const re = /    nota: 'La bassa schiena[\s\S]*?non è per te\.',/;
  const m = s.match(re);
  if (m) {
    s = s.replace(m[0],
      "    nota: 'La bassa schiena, cioè i muscoli che stanno lungo la colonna (l’erector spinae). Nell’iperextensione sono il pezzo principale: lavori loro, e i glutei aiutano ma più piano. Se ti fa male la schiena, questo esercizio non è per te.',");
    fatto.push('la nota dei lombari');
  }
}

writeFileSync(P, s, 'utf8');
console.log('fatto: ' + fatto.join(', '));
