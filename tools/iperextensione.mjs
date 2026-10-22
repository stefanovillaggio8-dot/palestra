import { readFileSync, writeFileSync } from 'node:fs';

const P = 'C:/Users/stefa/Documents/Default Project/palestra/src/muscoli-parti.js';
let s = readFileSync(P, 'utf8');
const fatto = [];

// 1. i LOMBARI non sono piu' il pezzo principale: sono un secondario.
//    Il principale dell'iperextensione sono i GLUTEI (la spinta coi fianchi).
{
  const V = "    parole: ['hyperextension', 'iperextensione', 'back extension', 'lombare', 'lombari'],";
  const N = "    parole: ['lombare', 'lombari', 'lower back', 'bassa schiena'],";
  if (!s.includes(V)) { console.log('NON TROVATO: le parole dei lombari'); process.exit(1); }
  s = s.replace(V, N);
  fatto.push('le parole dei lombari');
}

// 2. i GLUTEI diventano il pezzo principale dell'iperextensione.
{
  const V = "    parole: ['hip thrust', 'glute bridge', 'squat', 'stacco', 'affondi'],";
  const N = "    parole: ['hip thrust', 'glute bridge', 'squat', 'stacco', 'affondi',\n"
    + "      // L'IPERESTENSIONE (22/10/2026). Ste: \"oltre alla parte gia' evidenziata\n"
    + "      // evidenzia meno forte i lombari\". Il pezzo principale e' il gluteo (la\n"
    + "      // spinta coi fianchi), e i lombari sono un secondario: si vedono, ma piu'\n"
    + "      // chiari. Prima, quando i lombari erano il pezzo principale, la figura\n"
    + "      // accendeva la striscia lungo la colonna a pieno e i glutei restavano\n"
    + "      // spenti: il disegno diceva una cosa, l'esercizio un'altra.\n"
    + "      'hyperextension', 'iperextensione', 'back extension'],";
  if (!s.includes(V)) { console.log('NON TROVATO: le parole dei glutei'); process.exit(1); }
  s = s.replace(V, N);
  fatto.push('le parole dei glutei');
}

// 3. il movimento nuovo: l'iperextensione accende i lombari, ma piano.
{
  const V = "export const MOVIMENTI = [\n";
  const N = "export const MOVIMENTI = [\n"
    + "  {\n"
    + "    // L'IPERESTENSIONE (22/10/2026).\n"
    + "    //\n"
    + "    // Ste: \"oltre alla parte gia' evidenziata evidenzia meno forte i lombari\".\n"
    + "    // Il pezzo principale e' il gluteo (lo prende dalla parola \"hyperextension\"),\n"
    + "    // e i lombari sono un secondario a 0,5: la striscia lungo la colonna si\n"
    + "    // accende, ma piu' chiara del gluteo.\n"
    + "    //\n"
    + "    // La quota 0,5 e' la soglia: da 0,45 in su il muscolo muove davvero insieme\n"
    + "    // al principale (si vede, ma piu' chiaro), sotto 0,45 e' una sfumatura\n"
    + "    // discreta. NESSUN secondario arriva a 1, il pieno e' del principale.\n"
    + "    id: 'iperextensione',\n"
    + "    parole: ['hyperextension', 'iperextensione', 'back extension'],\n"
    + "    secondari: { dorso_basso: 0.5 },\n"
    + "  },\n";
  if (!s.includes(V)) { console.log('NON TROVATO: MOVIMENTI'); process.exit(1); }
  s = s.replace(V, N);
  fatto.push('il movimento dell\'iperextensione');
}

// 4. la nota dei lombari: adesso dice che sono un secondario.
{
  const V = "    nota: 'Lavora la bassa schiena, cioè i muscoli che stanno lungo la colonna (l’erector spinae), e anche i glutei. Se ti fa male la schiena, questo esercizio non è per te.',";
  const N = "    nota: 'La bassa schiena, cioè i muscoli che stanno lungo la colonna (l’erector spinae). Nell’iperextensione lavorano insieme ai glutei, ma più piano: per questo si vedono meno chiavi. Se ti fa male la schiena, questo esercizio non è per te.',";
  if (s.includes(V)) { s = s.replace(V, N); fatto.push('la nota dei lombari'); }
  else console.log('la nota dei lombari: non trovata (va bene, lascio com\'è)');
}

writeFileSync(P, s, 'utf8');
console.log('fatto: ' + fatto.join(', '));
