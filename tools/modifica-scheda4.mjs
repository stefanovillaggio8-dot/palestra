import { readFileSync, writeFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');

// IL BOTTONE LARGO "SALVA COME NUOVA VERSIONE" (22/10/2026).
//
// Ste ha mandato la foto di come deve essere "modifica scheda": in fondo un
// bottone largo, e non due bottoni. Il bottone dice cosa sta per succedere
// ("nasce una versione nuova"), cosi' Ste lo legge prima di premere.
const i = s.indexOf("'Butta le modifiche'");
if (i < 0) { console.log('NON TROVATO: il bottone Butta le modifiche'); process.exit(1); }
const fine = s.indexOf(']));', i);
if (fine < 0) { console.log('NON TROVATO: la fine del blocco'); process.exit(1); }
const dopo = fine + 4;

const aggiunta = `
    // IL BOTTONE LARGO IN FONDO (22/10/2026): nella foto di Ste c'e' un solo
    // bottone, largo, e dice "Salva come nuova versione": cosi' si capisce
    // che premendolo nasce una versione nuova e quella vecchia resta nel numero.
    zona.appendChild(bottone('Salva come nuova versione', {
      onClick: () => { giornoInModifica = null; disegna(); },
      classe: 'principale grande largo-tutto',
    }));`;

s = s.slice(0, dopo) + aggiunta + s.slice(dopo);
writeFileSync(P, s, 'utf8');
console.log('ok: il bottone largo "Salva come nuova versione"');

// il css
{
  const C = B + 'stile.css';
  let c = readFileSync(C, 'utf8');
  if (!c.includes('.largo-tutto')) {
    const blocco = `
/* IL BOTTONE LARGO (22/10/2026): il "Salva come nuova versione" della scheda. */
.largo-tutto { display: block; width: 100%; margin-top: 12px; }
`;
    const riduci = c.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
    c = c.slice(0, riduci) + blocco + c.slice(riduci);
    writeFileSync(C, c, 'utf8');
    console.log('ok: il css del bottone largo');
  }
}
