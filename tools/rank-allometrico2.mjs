import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const ESP = 0.67;

function leggiRighe(p) { return readFileSync(p, 'utf8').split(/\r?\n/); }
function scriviRighe(p, righe) { writeFileSync(p, righe.join('\n'), 'utf8'); }

/* ---- 1. scala-esercizi.js: la costante + la scala sul corpo ---- */
{
  const P = B + 'src/scala-esercizi.js';
  const righe = leggiRighe(P);
  let fatto = 0;

  const out = [];
  for (const r of righe) {
    if (r.includes('export const PESO_RIFERIMENTO_SCALA') && !r.includes('ESPONENTE_ALLOMETRICO')) {
      out.push("/**");
      out.push(" * L'ESPONENTE ALLOMETRICO (22/10/2026).");
      out.push(" *");
      out.push(" * Ste, con il parere di Gemini: \"attualmente il sistema usa un rapporto lineare");
      out.push(" * tra peso corporeo e peso sollevato, ma questo approccio e' errato perche' la");
      out.push(" * forza cresce in modo non lineare rispetto al peso corporeo (segue una curva a");
      out.push(" * rendimenti decrescenti ed esponenziali)\".");
      out.push(" *");
      out.push(" * Il peso del corpo cresce con il cubo della taglia, la sezione del muscolo");
      out.push(" * (che e' quello che genera forza) con il quadrato: quindi la forza cresce con");
      out.push(" * l'esponente 2/3 = 0,67 della massa. E' la normalizzazione allometrica");
      out.push(" * usata in ambito sportivo.");
      out.push(" *");
      out.push(" * In pratica: il peso da spostare per lo stesso punteggio cresce con il peso");
      out.push(" * elevato a 0,67, e NON con il peso se stesso.");
      out.push(" */");
      out.push("export const ESPONENTE_ALLOMETRICO = " + ESP + ";");
      out.push("");
      fatto++;
    }
    if (r.includes('return Math.round(scala * (peso / PESO_RIFERIMENTO_SCALA) * 100) / 100;')) {
      out.push("    // ALLOMETRICO, non lineare (22/10/2026): il peso da spostare per lo stesso");
      out.push("    // punteggio cresce con il peso elevato a 0,67 (forza ~ massa^0,67), non con il");
      out.push("    // peso se stesso. 70 kg che sollevano 70 kg valgono cosi' circa il 4,5% in piu'");
      out.push("    // di 80 kg che sollevano 80 kg.");
      out.push("    const fattore = Math.pow(peso / PESO_RIFERIMENTO_SCALA, ESPONENTE_ALLOMETRICO);");
      out.push("    return Math.round(scala * fattore * 100) / 100;");
      fatto++;
    }
    out.push(r);
  }
  scriviRighe(P, out);
  console.log('scala-esercizi.js: ' + fatto + ' modifiche');
}

/* ---- 2. rank-config.js: le soglie fisse + i zavorri ---- */
{
  const P = B + 'src/rank-config.js';
  const righe = leggiRighe(P);
  const out = [];
  let fatto = 0;

  for (const r of righe) {
    // l'import della costante
    if (r.includes("import { scalaSulCorpo } from './scala-esercizi.js';")) {
      out.push("import { scalaSulCorpo, ESPONENTE_ALLOMETRICO } from './scala-esercizi.js';");
      fatto++;
      continue;
    }
    // le soglie scritte a mano
    if (r.includes('p.soglie.map((s) => Math.round(s * (peso / PESO_RIFERIMENTO) * 100) / 100)')) {
      out.push("      // ALLOMETRICO, non lineare (22/10/2026): vedi la spiegazione in");
      out.push("      // `scalaSulCorpo`. Le soglie crescono con il peso elevato a 0,67.");
      out.push("      const fattoreSoglia = Math.pow(peso / PESO_RIFERIMENTO, ESPONENTE_ALLOMETRICO);");
      out.push("      soglie = p.soglie.map((s) => Math.round(s * fattoreSoglia * 100) / 100);");
      fatto++;
      continue;
    }
    out.push(r);
  }
  scriviRighe(P, out);
  console.log('rank-config.js: ' + fatto + ' modifiche');
}
