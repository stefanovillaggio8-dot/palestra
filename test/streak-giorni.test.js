// streak-giorni.test.js -- la streak deve contare gli allenamenti sui giorni che
// hai scelto, non i giorni di calendario.
//
// Ste (08/10/2026): "questa app devo darla pure a dei miei compagni, non tutti
// fanno i miei stessi giorni, quindi devi mettere nell'app che devo specificare che
// giorni vago in palestra e automaticamente funziona la streak".
//
// IL DIFETTO CHE ESISTEVA, verificato sui numeri veri di Ste: la streak contava i
// giorni di CALENDARIO consecutivi. Lui allena quattro giorni su sette, quindi la
// streak non poteva MAI superare quattro e si rompeva a ogni fine settimana dal
// riposo lungo. Sul suo caso la app diceva "streak di 1 giorno" mentre aveva
// allenato otto volte in due settimane.
//
// La regola nuova e' quella che Ste ha scritto lui: la streak si interrompe SOLO se
// salti un giorno che avevi detto di allenare, e un allenamento inaspettato conta
// comunque. Il riposo fa parte del programma, quindi non azzera niente.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcolaStreak, giorniPrevistiDa, contaAllenamentiConsecutiviConGiorni,
} from '../src/streak.js';

const LUN = 1, MAR = 2, MER = 3, GIO = 4, VEN = 5, SAB = 6;
/** Mar, mer, ven, sab: la scheda vera di Ste. */
const STE = [MAR, MER, VEN, SAB];

function iso(a, m, g) { return `${a}-${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}`; }

/** Le sedute per i giorni indicati, gia' completate. */
function sedute(giorniISO) {
  return giorniISO.map((d, i) => ({ id: 's' + i, data: d, stato: 'completata' }));
}

/**
 * Genera tanti giorni di una settimana, a partire da un lunedi'.
 * Ho scelto il 2026-08-31 perche' e' un lunedi' (verificato dai test sotto).
 */
function settimana(sett, giornoSettimana) {
  const d = new Date(2026, 7, 31 + sett * 7 + (giornoSettimana - 1), 12);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${g}`;
}

test('S1. il 2026-08-31 e\' un lunedi\' (la base dei test)', () => {
  // Se questo non e' vero, tutti gli altri test stanno misurando un'altra cosa e
  // passano per un motivo sbagliato. E\' il tipo di presupposto che va verificato
  // per primo, non all'ultimo.
  assert.equal(new Date('2026-08-31T12:00').getDay(), LUN,
    'il 31 agosto 2026 deve essere un lunedi\', altrimenti i giorni sono spostati');
});

test('S2. quattro giorni su sette: la streak NON si rompe al riposo lungo', () => {
  // IL CASO DI STE. Otto allenamenti in due settimane, saltando solo i tre giorni
  // di riposo. Prima la streak diceva 1.
  const giorni = [];
  for (let sett = 0; sett < 2; sett++) for (const g of STE) giorni.push(settimana(sett, g));
  const profilo = { giorni_allenamento: STE };
  const r = calcolaStreak(sedute(giorni), giorni[giorni.length - 1], profilo);
  assert.equal(r.attiva, true, 'la streak deve essere viva: i giorni di riposo non la rompono');
  assert.equal(r.giorni, 8,
    `devono contare gli 8 allenamenti, non i giorni di calendario (prima diceva 1): ${r.giorni}`);
  assert.match(r.testo, /8 allenamenti/, 'e la frase deve dire "allenamenti", non "giorni"');
});

test('S3. saltare un giorno SCELTO rompe la streak', () => {
  // Salti il mercoledi' (che avevi detto di fare) e la streak riparte da capo.
  //
  // I dati: mar, mer, ven, sab della prima settimana, poi SOLO ven e sab della
  // seconda. Quindi fra i due gruppi manca il mercoledi', che e' proprio un giorno
  // scelto: la rotta e' li', e non altrove.
  //
  // Dopo il salto si contano i 2 allenamenti ven e sab. Il numero e' 2 e non 3 perche'
  // fra loro non c'e' nessun altro giorno previsto: e' la differenza fra "conta gli
  // allenamenti" (che e' quello che vogliamo) e "conta i giorni" (che darebbe 4,
  // cioe' la rotta lunga attraverso il riposo, ed e' proprio quello che non vogliamo).
  const giorni = [];
  for (const g of STE) giorni.push(settimana(0, g));
  for (const g of [VEN, SAB]) giorni.push(settimana(1, g));
  const profilo = { giorni_allenamento: STE };
  const r = calcolaStreak(sedute(giorni), giorni[giorni.length - 1], profilo);
  assert.equal(r.attiva, true, 'la streak riparte: non e\' interrotta per sempre');
  assert.equal(r.giorni, 2,
    `dopo il salto contiamo solo ven e sab: 2, non i giorni di calendario (che darebbero 4): ${r.giorni}`);
});

test('S4. un allenamento inaspettato conta e non azzera niente', () => {
  // Ti alleni anche il lunedi', che non avevi detto. Non deve toglierti nulla.
  const previsti = [MAR, VEN];
  const giorni = [];
  for (let sett = 0; sett < 3; sett++) {
    giorni.push(settimana(sett, MAR));
    giorni.push(settimana(sett, VEN));
    giorni.push(settimana(sett, LUN)); // extra, non previsto
  }
  // "oggi" è l'ULTIMO GIORNO IN ORDINE CRONOLOGICO, non l'ultimo della lista: i
  // giorni sono generati per settimana ma ogni settimana parte dal lunedì, quindi
  // l'ultimo elemento della lista non è il più recente. Passando quello, il filtro
  // delle sedute future scartava proprio gli ultimi due allenamenti.
  const ordinati = [...giorni].sort();
  const r = calcolaStreak(sedute(giorni), ordinati[ordinati.length - 1], { giorni_allenamento: previsti });
  assert.equal(r.giorni, 9,
    `tutti gli allenamenti contano, anche quelli inaspettati: ${r.giorni}`);
  assert.equal(r.attiva, true);
});

test('S5. due compagni con giornate diverse: ognuno ha la sua streak', () => {
  // Il punto per cui Ste voleva la funzione: i compagni NON fanno i suoi stessi
  // giorni, e ognuno deve essere misurato con i suoi.
  //
  // Simone: mar/mer/ven/sab. Luca: lun/mar/mer/ven. Le date sono le stesse, quindi
  // se la funzione usasse i giorni di qualcun altro uno dei due risulterebbe
  // interrotto senza aver saltato niente.
  const giorni = [];
  for (const g of [MAR, MER, VEN, SAB]) giorni.push(settimana(0, g));
  const ultimo = giorni[giorni.length - 1];

  const simone = calcolaStreak(sedute(giorni), ultimo, { giorni_allenamento: [MAR, MER, VEN, SAB] });
  // Luca non ha allenato il sabato: il sabato non e' un giorno suo, quindi non gli
  // rompe niente. Ma non gli si puo' nemmeno contare comeallenamento previsto.
  const luca = calcolaStreak(sedute(giorni.filter((g) => g !== settimana(0, SAB))), ultimo, {
    giorni_allenamento: [LUN, MAR, MER, VEN],
  });
  assert.equal(simone.giorni, 4, `Simone ha fatto mar,mer,ven,sab: deve essere 4, e' ${simone.giorni}`);
  assert.equal(luca.attiva, true, 'Luca non ha saltato nessuno dei SUOI giorni: la streak e\' viva');
  assert.equal(luca.giorni, 3, `Luca ha fatto mar,mer,ven: deve essere 3, e' ${luca.giorni}`);
});

test('S6. senza giorni scelti la regola semplice non sbaglia nessuno', () => {
  // Se non hai ancora scelto i giorni, l'app non azzera niente che non sia
  // sicuramente saltato: vale solo se l'ultimo allenamento e\' oggi o ieri.
  const ieri = settimana(0, VEN);
  const oggi = settimana(0, SAB);
  const r = calcolaStreak(sedute([ieri]), oggi, null);
  assert.equal(r.giorni, 1, 'allenato ieri: la streak vale 1');
  assert.equal(r.attiva, true);

  const vecchio = settimana(0, MER);
  const r2 = calcolaStreak(sedute([vecchio]), oggi, null);
  assert.equal(r2.giorni, 0, 'allenato due giorni fa e senza giorni scelti: non si sa, vale 0');
});

test('S7. i giorni scelti sono puliti: solo numeri 0-6, e senza duplicati', () => {
  // Vengono dal database e da una casella di testo: se arrivano spazzatura non deve
  // rompere niente. E "senza duplicati" perche\' la casella puo\' essere premuta due
  // volte e due martedi\' non sono due giorni diversi.
  assert.deepEqual(giorniPrevistiDa({ giorni_allenamento: [2, 3, 5, 6] }), [2, 3, 5, 6]);
  assert.deepEqual(giorniPrevistiDa({ giorni_allenamento: [3, 3, 2, 2] }), [2, 3],
    'i duplicati spariscono');
  assert.deepEqual(giorniPrevistiDa({ giorni_allenamento: [9, -1, 2] }), [2],
    'i numeri fuori range vengono scartati');
  assert.equal(giorniPrevistiDa({ giorni_allenamento: [] }), null,
    'una lista vuota non e\' "nessun giorno": e\' "non lo so", e si applica la regola semplice');
  assert.equal(giorniPrevistiDa({}), null, 'se non ci sono ancora, regola semplice');
  assert.equal(giorniPrevistiDa(null), null);
});

test('S8. chi allena tutti e 7 i giorni non si rompe mai', () => {
  // Il caso opposto: se scegli tutti i giorni, il riposo non esiste e la streak puo'
  // crescere senza fermarsi. Serve a verificare che la logica non abbia un tetto
  // nascosto.
  const previsti = [0, 1, 2, 3, 4, 5, 6];
  const giorni = [];
  for (let i = 0; i < 40; i++) {
    const d = new Date(2026, 8, 1 + i, 12);
    giorni.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  const r = calcolaStreak(sedute(giorni), giorni[giorni.length - 1], { giorni_allenamento: previsti });
  assert.equal(r.giorni, 40, 'quaranta giorni di fila senza fermarsi: deve arrivare a 40');
});

test('S9. la frase dice QUANDO allenarsi, non solo "ti manca oggi"', () => {
  // Il testo e\' la parte che Ste legge in palestra: se dice "ti manca oggi" ma il
  // suo giorno e\' giovedi\', il messaggio e\' falso e lui lo odia per niente.
  const giorni = [];
  for (const g of STE) giorni.push(settimana(0, g));
  const r = calcolaStreak(sedute(giorni), giorni[0], { giorni_allenamento: STE });
  // l'ultimo e' il sabato, quindi il prossimo giorno previsto e' il martedi'
  const idx = giorni.indexOf(settimana(0, SAB));
  const solo = [settimana(0, MAR), settimana(0, MER), settimana(0, VEN), settimana(0, SAB)];
  const r2 = calcolaStreak(sedute(solo), settimana(0, SAB), { giorni_allenamento: STE });
  assert.match(r2.testo, /marted/i,
    `deve dire martedi' (il prossimo giorno scelto), non "oggi": "${r2.testo}"`);
  assert.ok(idx >= 0);
});