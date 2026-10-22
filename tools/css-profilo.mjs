import { readFileSync, writeFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
{
  const P = B + 'stile.css';
  let s = readFileSync(P, 'utf8');
  if (!s.includes('.personaggio-svg-profilo')) {
    const blocco = `
/* IL PERSONAGGIO DEL PROFILO (22/10/2026): il disegno, non la foto. */
.personaggio-svg-profilo { display: block; width: 100%; background: transparent; }
.personaggio-svg-profilo svg { width: 100%; height: auto; display: block; }
`;
    const riduci = s.search(/\n@?media[^\n]*prefers-reduced-motion|\n\/\*[^\n]*riduci animazioni/);
    s = s.slice(0, riduci) + blocco + s.slice(riduci);
    writeFileSync(P, s, 'utf8');
    console.log('ok: il css del personaggio del profilo');
  }
}
