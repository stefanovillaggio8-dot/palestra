import { readFileSync, writeFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');

const V = `/** Gli esercizi che ho fatto, con tutto il loro storico. */
function vociEserciziMie() {
  const mie = serieDellaPersona() || [];
  const ids = [...new Set(mie.filter((x) => x && !x.eliminata).map((x) => x.esercizio_id))];
  return ids.map((id) => {
    const punti = storicoDi(id);
    const ultima = punti.length ? punti[punti.length - 1] : null;
    return {
      nome: (esercizioPerId(id) || {}).nome || id,
      esercizio: esercizioPerId(id),
      punti,
      prevista: pesoPrevistoPerSessione(id, ultima && ultima.seduta),
    };
  });
}`;

const N = `/** Le sedute in cui ho fatto un esercizio, in ordine di data. */
function puntiDiEsercizioMio(id) {
  const sedute = (seduteMie() || [])
    .filter((s) => s && !s.eliminata && s.stato === 'completata')
    .sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const punti = [];
  for (const s of sedute) {
    const serie = (V.serie || []).filter((x) => x.seduta_id === s.id && x.esercizio_id === id && !x.eliminata);
    if (!serie.length) continue;
    punti.push({ seduta: s, data: s.data, serie });
  }
  return punti;
}

/** Gli esercizi che ho fatto, con tutto il loro storico. */
function vociEserciziMie() {
  const mie = serieDellaPersona() || [];
  const ids = [...new Set(mie.filter((x) => x && !x.eliminata).map((x) => x.esercizio_id))];
  return ids.map((id) => {
    const punti = puntiDiEsercizioMio(id);
    return {
      nome: (esercizioPerId(id) || {}).nome || id,
      esercizio: esercizioPerId(id),
      punti,
      prevista: null,
    };
  });
}`;

if (!s.includes(V)) { console.log('NON TROVATO: vociEserciziMie'); process.exit(1); }
s = s.replace(V, N);
writeFileSync(P, s, 'utf8');
console.log('ok: la card ora calcola da sola lo storico');
