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

// 2. i GLUTEI non sono piu' il pezzo principale: diventano un secondario.
{
  const V = `    parole: ['hip thrust', 'glute bridge', 'squat', 'stacco', 'affondi',
      // L'IPERESTENSIONE (22/10/2026). Ste: "oltre alla parte gia' evidenziata
      // evidenzia meno forte i lombari". Il pezzo principale e' il gluteo (la
      // spinta coi fianchi), e i lombari sono un secondario: si vedono, ma piu'
      // chiari. Prima, quando i lombari erano il pezzo principale, la figura
      // accendeva la striscia lungo la colonna a pieno e i glutei restavano
      // spenti: il disegno diceva una cosa, l'esercizio un'altra.
      'hyperextension', 'iperextensione', 'back extension'],`;
  const N = `    // L'IPERESTENSIONE (22/10/2026). Il pezzo principale sono i LOMBARI (Ste:
    // "i lombari principali"), i glutei aiutano e basta: nell'iperextensione
    // stesa a 45 gradi la spinta la fa la bassa schiena.
    parole: ['hip thrust', 'glute bridge', 'squat', 'stacco', 'affondi'],`;
  if (!s.includes(V)) { console.log('NON TROVATO: le parole dei glutei'); process.exit(1); }
  s = s.replace(V, N);
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

// 4. il commento del movimento: dice ancora la cosa sbagliata.
{
  const V = `    // Ste: "oltre alla parte gia' evidenziata evidenzia meno forte i lombari".
    // Il pezzo principale e' il gluteo (lo prende dalla parola "hyperextension"),
    // e i lombari sono un secondario a 0,5: la striscia lungo la colonna si
    // accende, ma piu' chiara del gluteo.`;
  const N = `    // Ste: "oltre alla parte gia' evidenziata evidenzia meno forte i lombari" e poi
    // "no il contrario, i lombari principali".
    //
    // Il pezzo principale sono i LOMBARI (la bassa schiena, l'erector spinae),
    // e i glutei sono il secondario a 0,5: si accendono insieme, ma piu' chiari.`;
  if (s.includes(V)) { s = s.replace(V, N); fatto.push('il commento del movimento'); }
  else console.log('il commento del movimento: non trovato (va bene)');
}

// 5. la nota dei lombari: ora sono il principale.
{
  const V = "    nota: 'La bassa schiena, cioè i muscoli che stanno lungo la colonna (l’erector spinae). Nell’iperextensione lavorano insieme ai glutei, ma più piano: per questo si vedono meno chiari. Se ti fa male la schiena, questo esercizio non è per te.',";
  const N = "    nota: 'La bassa schiena, cioè i muscoli che stanno lungo la colonna (l’erector spinae). Nell’iperextensione sono il pezzo principale: lavori loro, e i glutei aiutano ma più piano. Se ti fa male la schiena, questo esercizio non è per te.',";
  if (s.includes(V)) { s = s.replace(V, N); fatto.push('la nota dei lombari'); }
  else console.log('la nota dei lombari: non trovata (va bene)');
}

writeFileSync(P, s, 'utf8');
console.log('fatto: ' + fatto.join(', '));
