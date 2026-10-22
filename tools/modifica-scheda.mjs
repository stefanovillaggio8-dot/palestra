import { readFileSync, writeFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');

// IL PULSANTE "SALVA COME NUOVA VERSIONE" (22/10/2026).
//
// Ste ha mandato la foto di come deve essere "modifica scheda": in fondo un
// bottone largo, e non due bottoni. Il bottone largo dice cosa sta per
// succedere ("nasce una versione nuova"), che e' una cosa che Ste deve
// leggere prima di premere.
const V = `    zona.appendChild(el('div', { class: 'riga-pulsanti fisso' }, [
      bottone('Butta le modifiche', {
        onClick: () => { giornoInModifica = null; scartaBozza(); disegna(); },
        classe: 'fantasma',
      }),
    ]));`;
const N = `    zona.appendChild(el('div', { class: 'riga-pulsanti fisso' }, [
      bottone('Butta le modifiche', {
        onClick: () => { giornoInModifica = null; scartaBozza(); disegna(); },
        classe: 'fantasma',
      }),
    ]));
    // IL BOTTONE LARGO IN FONDO (22/10/2026): nella foto di Ste c'e' un solo
    // bottone, largo, e dice "Salva come nuova versione": cosi' si capisce
    // che premendolo nasce una versione nuova e quella veccola resta nel numero.
    zona.appendChild(bottone('Salva come nuova versione', {
      onClick: () => salvaBozza(),
      classe: 'principale grande largo-tutto',
    }));`;

if (!s.includes(V)) { console.log('NON TROVATO: i pulsanti di modifica'); process.exit(1); }
s = s.replace(V, N);
writeFileSync(P, s, 'utf8');
console.log('ok: il bottone "Salva come nuova versione"');
