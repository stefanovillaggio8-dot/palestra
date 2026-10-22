import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');
const fatto = [];

// 1. la spiegazione del peso: dentro una scheda chiusa (la pagina era troppo lunga)
{
  const V = `    const boxForza = el('div', { class: 'spiegazione generale' });
    // La spiegazione lunga sta in una scheda chiusa (22/10/2026): la pagina
    // dei Progressi era troppo lunga e troppo incasinata.
    const apriForza = el('details', { class: 'scheda-chiusa' }, [
      el('summary', { class: 'nota nota-piccola', testo: 'Quanto stai sollevando in piu' del tuo corpo' }),
    ]);
    boxForza.appendChild(el('h3', { testo: 'Quanto stai sollevando in piu' del tuo corpo' }));`;
  const N = `    // La spiegazione lunga sta in una SCHEDA CHIUSA (22/10/2026): la pagina dei
    // Progressi era troppo lunga e troppo incasinata. Il titolo si vede, il
    // resto si apre con un tocco.
    const boxForza = el('div', { class: 'spiegazione generale' });
    const dentroForza = el('div', { class: 'dentro-scheda' });
    boxForza.appendChild(el('details', { class: 'scheda-chiusa' }, [
      el('summary', { class: 'scheda-titolo', testo: 'Quanto stai sollevando in piu' del tuo corpo' }),
      dentroForza,
    ]));`;
  if (s.includes(V)) {
    s = s.replace(V, N);
    // i paragrafi che seguono vanno dentro la scheda
    const inizio = s.indexOf('const dentroForza = el(');
    const fine = s.indexOf('zona.appendChild(boxForza);', inizio);
    const mezzo = s.slice(inizio, fine).replace(/boxForza\.appendChild\(/g, 'dentroForza.appendChild(');
    s = s.slice(0, inizio) + mezzo + s.slice(fine);
    fatto.push('la spiegazione del peso in una scheda chiusa');
  } else {
    console.log('NON TROVATO: il blocco del peso');
  }
}

// 2. il nastro della modifica: il titolo e la spiegazione come nella foto
{
  const re = /el\('strong', \{ testo: 'Stai modificando la scheda' \}\),/;
  if (re.test(s)) {
    s = s.replace(re, "el('strong', { testo: 'Modifica la scheda' }),\n"
      + "          // La spiegazione come nella foto (22/10/2026): quale versione stai\n"
      + "          // modificando e cosa succede quando salvi.\n"
      + "          el('div', { class: 'nota', testo: `Stai modificando la versione numero ${(v && v.numero) || '?'}. Quando salvi, nasce una versione nuova: la scheda diventa la versione nuova e quella vecchia resta nel numero.` }),");
    fatto.push('il titolo e la spiegazione della modifica');
  } else {
    console.log('NON TROVATO: il nastro');
  }
}

writeFileSync(P, s, 'utf8');
console.log('fatto: ' + fatto.join(', '));
