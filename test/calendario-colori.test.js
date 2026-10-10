// calendario-colori.test.js -- i TRE COLORI del calendario, verificati sul serio.
//
// I test precedenti guardavano il CODICE (che il calendario scriva "verde", "rosso",
// "viola"). Qui invece si costruisce davvero lo stato e si chiama la funzione vera
// `bloccoCalendario`, poi si contano le classi che escono. Quindi se la logica e'
// sbagliata questi test diventano rossi.
//
// Perche' serve: la prima prova col DOM finto non ha potuto mostrare il verde
// perche' l'app tiene i dati in memoria (`V`) e ridisegna senza rileggere il db.
// Questo test chiama `bloccoCalendario` con uno `st` preparato a mano, quindi la
// scelta dei colori e' provata davvero, non dedotta dal testo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaStreak } from '../src/streak.js';
import { bloccoCalendario } from '../tools/app-strumenti.mjs';
import { perClasse, montaDom } from './dom-minimo.js';

montaDom();

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const oggi = new Date();
const giorni = (n) => { const d = new Date(oggi); d.setDate(d.getDate() + n); return d; };

/** Costruisce lo stato come lo fa l'app e conta le celle per classe. */
function colori(sedute, previsti) {
  const profilo = { giorni_allenamento: previsti };
  const st = { streak: calcolaStreak(sedute, iso(oggi), profilo) };
  const box = bloccoCalendario(profilo, st);
  const conta = { verde: 0, rosso: 0, viola: 0, atteso: 0, oggi: 0 };
  for (const c of perClasse(box, 'cella-calendario')) {
    const k = String(c.className || '');
    if (k.includes('fatto')) conta.verde++;
    if (k.includes('saltato')) conta.rosso++;
    if (k.includes('recupero')) conta.viola++;
    if (k.includes('atteso')) conta.atteso++;
    if (k.includes('oggi')) conta.oggi++;
  }
  return conta;
}

test('COLORI-1. un giorno completato diventa VERDE', () => {
  // La regola di Ste: "segna in verde i giorni in cui ci sono andato".
  // ieri = una seduta completata: quel giorno DEVE essere verde.
  const sedute = [{ data: iso(giorni(-1)), stato: 'completata' }];
  const c = colori(sedute, [0, 1, 2, 3, 4, 5, 6]); // tutti i giorni previsti, cosi' ieri non e' recupero
  assert.ok(c.verde >= 1, `ieri che ti sei allenato deve essere verde, trovati ${c.verde} verdi`);
});

test('COLORI-2. un giorno previsto e passato senza seduta diventa ROSSO', () => {
  // La regola di Ste: "segna in rosso i giorni che ho saltato".
  // Ogni giorno e' previsto e non c'e' nessuna seduta: i giorni passati sono tutti
  // saltati, quindi devono essere tanti quanti i giorni passati nel mese.
  const c = colori([], [0, 1, 2, 3, 4, 5, 6]);
  assert.ok(c.rosso >= 1, 'i giorni previsti e passati senza seduta devono essere rossi');
  // E NON devono essere verdi: uno non puo' essereallenato e saltato lo stesso giorno.
  assert.equal(c.verde, 0, 'nessun giorno puo\' essere verde senza esserci andato');
});

test('COLORI-3. un giorno che NON hai scelto e\' VIOLA (recupero), MAI rosso', () => {
  // La regola di Ste: "segna in viola quelli di recupero".
  //
  // Il punto qui e' sottile e merita una spiegazione, perche' il contrario sembra
  // giusto: "solo il lunedi' e' previsto, quindi gli altri sei non sono saltati".
  // Il trucco e' guardare i GIORNI DI RECUPERO, cioe' i sei giorni che non hai
  // scelto: questi devono essere TUTTI viola e NESSUNO rosso. Il rosso puo' stare
  // solo sul lunedi', che e' l'unico che ti toccava e hai saltato.
  //
  // Perche' conta: il recupero non e' una punizione. Se un martedi' di recupero
  // diventasse rosso, sembrerebbe che ti avessi perso un allenamento, e invece non
  // ti toccava niente: e' il motivo per cui puoi allenarti quattro volte su sette.
  const profilo = { giorni_allenamento: [1] }; // solo lunedi'
  const st = { streak: calcolaStreak([], iso(oggi), profilo) };
  const box = bloccoCalendario(profilo, st);
  for (const c of perClasse(box, 'cella-calendario')) {
    const k = String(c.className || '');
    if (k.includes('fuori') || k.includes('futuro')) continue;
    const recupero = k.includes('recupero');
    const saltato = k.includes('saltato');
    assert.ok(!(saltato && recupero),
      `una cella non puo' essere insieme saltata e di recupero: "${k}"`);
  }
  const c = colori([], [1]);
  assert.ok(c.viola >= 1, 'i giorni di recupero devono essere viola');
  // E i rossi possono essere SOLO i lunedi' gia' passati, non anche gli altri
  // giorni. Con sei giorni di recupero al mese, se i rossi fossero sei o piu' il
  // rosso non piu' significherebbe "giorno saltato".
  const lunediPassati = contaGiorniPassati(1);
  assert.equal(c.rosso, lunediPassati,
    `devono essere rossi SOLO i lunedi' passati (${lunediPassati}), `
    + `trovati ${c.rosso}: se sono di piu', il rosso si e' infiltrato sui giorni di recupero`);
});

/** Quanti giorni di quel tipo sono passati nel mese corrente (che è il primo mese
 *  mostrato quando non ci sono sedute). */
function contaGiorniPassati(dow) {
  const primoDelMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
  let n = 0;
  for (let d = new Date(primoDelMese); d <= oggi; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === dow) n++;
  }
  return n;
}

test('COLORI-4. il verde e il rosso non si contraddicono mai', () => {
  // Ogni giorno ha UN solo stato fra fatto/saltato: impossible che sia insieme verde
  // e rosso. Per ogni classe conto: se una cella fosse insieme 'fatto' e 'saltato'
  // significherebbe che la logica e' contraddittoria.
  const sedute = [
    { data: iso(giorni(-1)), stato: 'completata' },
    { data: iso(giorni(-2)), stato: 'in_corso' },
  ];
  const profilo = { giorni_allenamento: [0, 1, 2, 3, 4, 5, 6] };
  const st = { streak: calcolaStreak(sedute, iso(oggi), profilo) };
  const box = bloccoCalendario(profilo, st);
  for (const c of perClasse(box, 'cella-calendario')) {
    const k = String(c.className || '');
    assert.ok(!(k.includes('fatto') && k.includes('saltato')),
      `una cella non puo' essere insieme fatta e saltata: "${k}"`);
    assert.ok(!(k.includes('fatto') && k.includes('recupero')),
      `una cella fatta non puo' essere anche recupero: "${k}"`);
  }
});
