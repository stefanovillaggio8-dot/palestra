import { readFileSync, writeFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// la card anche nelle Impostazioni
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');
  const V = "function vistaImpostazioni(zona) {\n  zona.appendChild(el('h1', { testo: 'Impostazioni' }));";
  const N = "function vistaImpostazioni(zona) {\n  zona.appendChild(el('h1', { testo: 'Impostazioni' }));\n"
    + "  // LA CARD COMPATTA ANCHE QUI (22/10/2026): la stessa dei Progressi e del Profilo.\n"
    + "  const cardRiepilogo = cardRiepilogoMio();\n"
    + "  if (cardRiepilogo) zona.appendChild(cardRiepilogo);";
  if (!s.includes(V)) { console.log('NON TROVATO: vistaImpostazioni'); process.exit(1); }
  s = s.replace(V, N);
  writeFileSync(P, s, 'utf8');
  console.log('ok: la card anche nelle Impostazioni');
}
