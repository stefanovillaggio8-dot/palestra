import { readFileSync, writeFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// 1. il bottone largo in fondo
{
  const P = B + 'src/app.js';
  let s = readFileSync(P, 'utf8');
  const V = `    // IL BOTTONE LARGO IN FONDO (22/10/2026): nella foto di Ste c'e' un solo
    // bottone, largo, e dice "Salva come nuova versione": cosi' si capisce
    // che premendolo nasce una versione nuova e quella veccola resta nel numero.
    zona.appendChild(bottone('Salva come nuova versione', {
      onClick: () => salvaBozza(),
      classe: 'principale grande largo-tutto',
    }));`;
  const N = `    // IL BOTTONE LARGO IN FONDO (22/10/2026): nella foto di Ste c'e' un solo
    // bottone, largo, e dice "Salva come nuova versione": cosi' si capisce
    // che premendolo nasce una versione nuova e quella veccola resta nel numero.
    zona.appendChild(bottone('Salva come nuova versione', {
      onClick: () => { giornoInModifica = null; disegna(); },
      classe: 'principale grande largo-tutto',
    }));`;
  if (!s.includes(V)) { console.log('NON TROVATO: il bottone largo'); process.exit(1); }
  s = s.replace(V, N);
  writeFileSync(P, s, 'utf8');
  console.log('ok: il bottone largo');
}

// 2. il css del bottone largo
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  if (!s.includes('.largo-tutto')) {
    const blocco = `
/* IL BOTTONE LARGO (22/10/2026): il "Salva come nuova versione" della scheda. */
.largo-tutto { display: block; width: 100%; margin-top: 12px; }
`;
    const riduci = s.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
    s = s.slice(0, riduci) + blocco + s.slice(riduci);
    writeFileSync(P, s, 'utf8');
    console.log('ok: il css del bottone largo');
  }
}
