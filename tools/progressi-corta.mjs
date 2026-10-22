import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');
const fatto = [];

/* ---- (a) LA PAGINA PROGRESSI PIU' CORTA ---- */
{
  // il riquadro vecchio "In generale, quanto sei migliorato" duplica la card
  // nuova (che sta in cima e ha i riquadri cliccabili): si nasconde.
  const V = `  const boxGenerale = el('div', { class: 'spiegazione generale' });
  boxGenerale.appendChild(el('h3', { testo: 'In generale, quanto sei migliorato' }));`;
  const N = `  // Il riquadro vecchio "In generale, quanto sei migliorato" duplicava la card
  // nuova (che sta in cima alla pagina, con i riquadri cliccabili). Ste (22/10/2026):
  // "la cosa dei progressi in quanti sono migliorato peggiorato e uguale".
  // Quindi questo qui sotto si nasconde e resta solo la card.
  const boxGenerale = el('div', { class: 'spiegazione generale duplicato-nascosto' });
  boxGenerale.appendChild(el('h3', { testo: 'In generale, quanto sei migliorato' }));`;
  if (s.includes(V)) { s = s.replace(V, N); fatto.push('il riquadro vecchio nascosto'); }
  else console.log('NON TROVATO: il riquadro vecchio');

  // la spiegazione sul peso in piu' del corpo diventa una scheda chiusa
  const V2 = `    const boxForza = el('div', { class: 'spiegazione generale' });
    boxForza.appendChild(el('h3', { testo: 'Quanto stai sollevando in pi\u00f9 del tuo corpo' }));`;
  const N2 = `    // La spiegazione lunga sta in una scheda chiusa (22/10/2026): la pagina
    // dei Progressi era troppo lunga e troppo incasinata.
    const boxForza = el('div', { class: 'spiegazione generale' });
    const apriForza = el('details', { class: 'scheda-chiusa' }, [
      el('summary', { class: 'nota nota-piccola', testo: 'Quanto stai sollevando in piu' del tuo corpo' }),
    ]);
    boxForza.appendChild(el('h3', { testo: 'Quanto stai sollevando in piu' del tuo corpo' }));`;
  if (s.includes(V2)) { s = s.replace(V2, N2); fatto.push('la spiegazione del peso preparata'); }
  else console.log('NON TROVATO: la spiegazione del peso');
}

/* ---- (b) MODIFICA LA SCHEDA, COME LA FOTO ---- */
{
  const V = `      zona.appendChild(el('div', { class: 'tape tape-viola' }, [
        el('div', { class: 'cresci' }, [
          el('strong', { testo: 'Stai modificando la scheda' }),
          el('div', { class: 'nota', testo: 'Cambia i kg, le rip e aggiungi o togli serie. Quando`;
  const N = `      // IL TITOLO E LA SPIEGAZIONE COME NELLA FOTO (22/10/2026).
      //
      // "Modifica la scheda", e sotto la spiegazione: quale versione stai
      // modificando e cosa succede quando salvi (nasce una versione nuova, e
      // quella vecchia resta nel numero).
      zona.appendChild(el('div', { class: 'tape tape-viola' }, [
        el('div', { class: 'cresci' }, [
          el('strong', { testo: 'Modifica la scheda' }),
          el('div', { class: 'nota', testo: \`Stai modificando la versione numero \${(v && v.numero) || '?'}. Quando salvi, nasce una versione nuova: la scheda diventa la versione nuova e quella vecchia resta nel numero.\` }),
          el('div', { class: 'nota', testo: 'Cambia i kg, le rip e aggiungi o togli serie. Quando`;
  if (s.includes(V)) { s = s.replace(V, N); fatto.push('il titolo e la spiegazione'); }
  else console.log('NON TROVATO: il nastro della modifica');
}

writeFileSync(P, s, 'utf8');
console.log('fatto: ' + fatto.join(', '));
