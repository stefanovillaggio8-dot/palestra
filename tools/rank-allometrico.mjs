import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const ESP = 0.67;   // l'esponente allometrico (forza ~ massa^0,67)

/* ---- 1. LA LEVA: scalaSulCorpo passa da lineare a allometrica ---- */
{
  const P = B + 'src/scala-esercizi.js';
  let s = readFileSync(P, 'utf8');

  if (!s.includes('ESPONENTE_ALLOMETRICO')) {
    // la costante, vicino a PESO_RIFERIMENTO_SCALA
    const V = "export const PESO_RIFERIMENTO_SCALA";
    const N = "/**\n"
      + " * L'ESPONENTE ALLOMETRICO (22/10/2026).\n"
      + " *\n"
      + " * Ste, con il parere di Gemini: \"attualmente il sistema usa un rapporto lineare\n"
      + " * tra peso corporeo e peso sollevato, ma questo approccio e' errato perche' la forza\n"
      + " * cresce in modo non lineare rispetto al peso corporeo\".\n"
      + " *\n"
      + " * Il peso del corpo cresce con il cubo della taglia, la sezione del muscolo\n"
      + " * (che e' quello che genera forza) con il quadrato: quindi la forza cresce con\n"
      + " * l'esponente 2/3 = 0,67 della massa. E' la normalizzazione allometrica\n"
      + " * usata in ambito sportivo, e dice una cosa giusta: chi pesa di piu' sposta di piu'\n"
      + " * in assoluto, ma NON in proporzione al suo peso.\n"
      + " *\n"
      + " * In pratica: il riferimento (i kg da spostare per il PLATINUM) non cresce\n"
      + " * come il peso, ma come il peso elevato a 0,67. Un metroottanta sposta piu' di\n"
      + " * un settanta, ma non il doppio.\n"
      + " */\n"
      + "export const ESPONENTE_ALLOMETRICO = " + ESP + ";\n\n"
      + "export const PESO_RIFERIMENTO_SCALA";
    if (!s.includes(V)) { console.log('NON TROVATO: PESO_RIFERIMENTO_SCALA'); process.exit(1); }
    s = s.replace(V, N);
  }

  const V2 = "  /** La scala riportata sul peso vero della persona. */\n"
    + "  export function scalaSulCorpo(scala, pesoCorporeo) {\n"
    + "    if (!Number.isFinite(scala)) return null;\n"
    + "    const peso = Number(pesoCorporeo);\n"
    + "    if (!Number.isFinite(peso) || peso <= 0) return scala;\n"
    + "    return Math.round(scala * (peso / PESO_RIFERIMENTO_SCALA) * 100) / 100;\n"
    + "  }";
  const N2 = "  /**\n"
    + "   * La scala riportata sul peso vero della persona.\n"
    + "   *\n"
    + "   * PRIMA era lineare: scala * (peso / 70). ORA e' allometrica:\n"
    + "   * scala * (peso / 70)^0,67.\n"
    + "   *\n"
    + "   * Il perche': il punteggio di forza e' 1RM / pesoCorporeo^0,67, quindi il peso da\n"
    + "   * spostare per ottenere lo stesso punteggio cresce con il peso elevato a 0,67 e\n"
    + "   * NON con il peso se stesso. Con la formula lineare, chi pesa 80 kg si trovava\n"
    + "   * con gli stessi chili di chi pesa 70 (rapporto 1 a 1): e' sbagliato, perche'\n"
    + "   * la forza non cresce linearmente con la massa.\n"
    + "   *\n"
    + "   * Con la formula allometrica, 70 kg che sollevano 70 kg valgono circa il 4,5%\n"
    + "   * in piu' di 80 kg che sollevano 80 kg (i due hanno lo stesso rapporto grezzo,\n"
    + "   * ma quello di chi pesa di piu' conta un po' meno).\n"
    + "   */\n"
    + "  export function scalaSulCorpo(scala, pesoCorporeo) {\n"
    + "    if (!Number.isFinite(scala)) return null;\n"
    + "    const peso = Number(pesoCorporeo);\n"
    + "    if (!Number.isFinite(peso) || peso <= 0) return scala;\n"
    + "    const fattore = Math.pow(peso / PESO_RIFERIMENTO_SCALA, ESPONENTE_ALLOMETRICO);\n"
    + "    return Math.round(scala * fattore * 100) / 100;\n"
    + "  }";
  if (!s.includes(V2)) { console.log('NON TROVATO: scalaSulCorpo'); process.exit(1); }
  s = s.replace(V2, N2);
  writeFileSync(P, s, 'utf8');
  console.log('ok: scalaSulCorpo ora e\' allometrica');
}

/* ---- 2. LE SOGLIE FISSE: stessa correzione ---- */
{
  const P = B + 'src/rank-config.js';
  let s = readFileSync(P, 'utf8');
  const V = "      soglie = p.soglie.map((s) => Math.round(s * (peso / PESO_RIFERIMENTO) * 100) / 100);";
  const N = "      // ALLOMETRICO, non lineare (22/10/2026): le soglie crescono con il peso\n"
    + "      // elevato a 0,67, non con il peso. Vedi la spiegazione in `scalaSulCorpo`.\n"
    + "      const fattoreSoglia = Math.pow(peso / PESO_RIFERIMENTO, ESPONENTE_ALLOMETRICO);\n"
    + "      soglie = p.soglie.map((s) => Math.round(s * fattoreSoglia * 100) / 100);";
  if (s.includes(V)) {
    s = s.replace(V, N);
    // l'import della costante
    s = s.replace("import { scalaSulCorpo } from './scala-esercizi.js';",
      "import { scalaSulCorpo, ESPONENTE_ALLOMETRICO } from './scala-esercizi.js';");
    writeFileSync(P, s, 'utf8');
    console.log('ok: anche le soglie fisse sono allometriche');
  } else {
    console.log('NON TROVATO: le soglie fisse (la riga puo\' essere diversa)');
  }
}
