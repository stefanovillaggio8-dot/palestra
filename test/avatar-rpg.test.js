// avatar-rpg.test.js -- l'avatar RPG: classi, statistiche e armature.
//
// Ste (08/10/2026) ha scritto questo sistema e me l'ha dato da mettere nell'app.
// Qui si verifica la sua logica e le TRE correzioni fatte (sono scritte una per una in
// src/avatar-rpg.js, con il perche').
//
// LA CORREZIONE PIU' IMPORTANTE E' LA PRIMA: la streak delle armature usa i giorni
// che la persona ha scelto, non i giorni di calendario. Se no', le armature si
// sbloccherebbero con una regella diversa da quella mostrata a schermo, e quella
// piu' vicina all'avatar e' proprio quella che Ste ha segnalato due volte.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcolaAvatar, classeConsigliata, CLASSI, PREMI,
} from '../src/avatar-rpg.js';

const LUN = 1, MAR = 2, MER = 3, GIO = 4, VEN = 5, SAB = 6;

/** Gli esercizi minimi, con il movimento che il classificatore deve riconoscere. */
const ESERCIZI = {
  chest: { id: 'e-chest', nome: 'Chest Press', convenzione: 'per_braccio', attrezzatura: 'macchina_dischi' },
  lat: { id: 'e-lat', nome: 'Lat Pulldown macchina', convenzione: 'cavo_totali', carrucola: 'carrucola_doppia' },
  curl: { id: 'e-curl', nome: 'Cable Hammer Curl', convenzione: 'cavo_totali', carrucola: 'carrucola_doppia' },
  corsa: { id: 'e-corsa', nome: 'Tapis roulant', convenzione: 'tempo' },
};
const perId = (id) => Object.values(ESERCIZI).find((e) => e.id === id) || null;

function serie(id, esercizio_id, peso, ripetizioni) {
  return { id, esercizio_id, peso, ripetizioni, stato: 'fatta' };
}

function sed(id, data) {
  return { id, data, stato: 'completata' };
}

test('R1. le statistiche vengono dai dati veri, non da numeri scritti', () => {
  const s = [
    serie('s1', 'e-chest', 37, 8),   // 296 kg di volume
    serie('s2', 'e-lat', 88, 6),     // 528 kg di volume
    serie('s3', 'e-curl', 50, 6),    // 300, ma al cavo dimezza: 25 per lato
  ];
  const r = calcolaAvatar('guerriero', s, [sed('g1', '2026-10-08')], perId, { profilo: {} });
  // il volume totale e' tutto, il cardio niente
  assert.equal(r.volTot, 296 + 528 + 300, 'il volume totale somma tutte le serie');
  assert.equal(r.cardio, 0, 'nessun cardio in questa lista');
  // la forza guarda solo i movimenti grossi: chest press e lat sì, il curl no
  assert.equal(r.volForza, 296 + 528, `la forza prende solo i grossi: ${r.volForza}`);
  assert.ok(r.st.forza > 1, 'e con 824 kg di volume forza e\' piu\' di 1');
});

test('R2. il cardio conta il TEMPO e non i kg', () => {
  // Il trucco che Ste aveva usato: sull'app i minuti stanno nel campo delle
  // ripetizioni (vedi CAMPO_MISURA in rank-config.js). Quindi il cardio e' "il
  // numero che c\'era", non "i kg per le ripetizioni".
  const s = [serie('c1', 'e-corsa', 0, 30)]; // 30 minuti sul tapis, peso zero
  const r = calcolaAvatar(null, s, [sed('g1', '2026-10-08')], perId, { profilo: {} });
  assert.equal(r.cardio, 30, '30 minuti sul tapis');
  assert.equal(r.volTot, 0, 'e il volume totale resta zero: il cardio non ha kg');
  assert.ok(r.st.agilita > 1, 'l\'agilita\' sale con il cardio');
});

test('R3. la classe dà +20% a UNA statistica sola, e non si moltiplica a ogni ricalcolo', () => {
  const s = [serie('s1', 'e-chest', 37, 8)];
  const sedute = [sed('g1', '2026-10-08')];
  const senza = calcolaAvatar(null, s, sedute, perId, { profilo: {} });
  const con = calcolaAvatar('guerriero', s, sedute, perId, { profilo: {} });

  // SOLO la forza sale, agilita e stamina restano quelle senza classe
  assert.equal(con.st.agilita, senza.st.agilita, 'agilita\' non cambia col Guerriero');
  assert.equal(con.st.stamina, senza.st.stamina, 'stamina non cambia col Guerriero');
  assert.ok(con.st.forza >= senza.st.forza, 'la forza non diminuisce');

  // IL PUNTO SUL QUALE SI PUO' SBAGLIARE: ricalcolare non deve cambiare il numero.
  // Se il bonus fosse applicato a se' stesso, ogni ricalcolo lo ripartirebbe.
  const r1 = calcolaAvatar('guerriero', s, sedute, perId, { profilo: {} });
  const r2 = calcolaAvatar('guerriero', s, sedute, perId, { profilo: {} });
  assert.equal(r1.st.forza, r2.st.forza,
    'due calcoli identici danno lo stesso numero: il bonus non si moltiplica');
  // e il numero col bonus viene sempre dai numeri BASE, mai da un numero gia' bonusato
  assert.equal(r1.base.forza, senza.st.forza, 'la base non ha il bonus');
});

test('R4. ogni classe dà il bonus a una statistica DIVERSA', () => {
  const s = [
    serie('s1', 'e-chest', 37, 8),
    serie('c1', 'e-corsa', 0, 60),
    serie('g1', 'e-lat', 88, 6), serie('g2', 'e-lat', 88, 6), serie('g3', 'e-lat', 88, 6),
    serie('g4', 'e-lat', 88, 6), serie('g5', 'e-lat', 88, 6), serie('g6', 'e-lat', 88, 6),
  ];
  const sedute = [sed('s', '2026-10-08')];
  const base = calcolaAvatar(null, s, sedute, perId, { profilo: {} }).st;
  const visti = new Set();
  for (const c of Object.values(CLASSI)) {
    const r = calcolaAvatar(c.id, s, sedute, perId, { profilo: {} });
    assert.ok(!visti.has(c.bonus), `due classi danno lo stesso bonus (${c.bonus}): sarebbe una scelta`);
    visti.add(c.bonus);
    // la statistica col bonus e' >= la base, e le altre sono uguali
    for (const k of ['forza', 'agilita', 'stamina']) {
      if (k === c.bonus) assert.ok(r.st[k] >= base[k], `${c.nome}: ${k} non diminuisce`);
      else assert.equal(r.st[k], base[k], `${c.nome}: ${k} non deve cambiare`);
    }
  }
  assert.equal(visti.size, 3, 'le tre classi devono coprire le tre statistiche');
});

test('R5. LE ARMATURE USANO I GIORNI CHE HAI SCELTO TU', () => {
  // LA CORREZIONE PIU' IMPORTANTE. Ste allena mar/mer/ven/sab: quattro giorni su
  // sette. Con la regola di calendario la sua streak non superava MAI 4 e si
  // rompeva ogni venerdi', quindi l'armatura dei 7 giorni era IRRAGGIUNGIBILE per
  // sempre. Con i suoi giorni scelti arriva e si sblocca davvero.
  const giorni = [];
  const base = new Date(2026, 7, 31); // lunedi'
  for (let sett = 0; sett < 2; sett++) {
    for (const dow of [MAR, MER, VEN, SAB]) {
      const d = new Date(base);
      d.setDate(d.getDate() + sett * 7 + (dow - 1));
      giorni.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  }
  const sedute = giorni.map((g, i) => sed('s' + i, g));
  const serieBuone = [serie('s1', 'e-chest', 37, 8)];
  const ultimo = giorni[giorni.length - 1];

  const conGiorni = calcolaAvatar('guerriero', serieBuone, sedute, perId, {
    profilo: { giorni_allenamento: [MAR, MER, VEN, SAB] },
    oggi: ultimo,
  });
  const senzaGiorni = calcolaAvatar('guerriero', serieBuone, sedute, perId, {
    profilo: null,
    oggi: ultimo,
  });

  assert.ok(conGiorni.streak.giorni >= 8,
    `con i suoi giorni scelti la streak deve arrivare a 8: ${conGiorni.streak.giorni}`);
  assert.ok(senzaGiorni.streak.giorni < conGiorni.streak.giorni,
    `e senza i giorni scelti deve essere MENO (regola di calendario): `
    + `${senzaGiorni.streak.giorni} contro ${conGiorni.streak.giorni}`);
  // e questo e' il punto: le due NON possono dire la stessa cosa, altrimenti
  // l'armatura si sbloccherebbe con una regella diversa da quella a schermo
  assert.notEqual(conGiorni.streak.giorni, senzaGiorni.streak.giorni,
    'le due regole non possono dare lo stesso numero: e\' il difetto che ho corretto');
});

test('R6. un\'armatura si sblocca solo con la streak E la statistica', () => {
  const base = new Date(2026, 7, 31);
  const giorni = [];
  for (let sett = 0; sett < 20; sett++) {
    for (const dow of [MAR, MER, VEN, SAB]) {
      const d = new Date(base);
      d.setDate(d.getDate() + sett * 7 + (dow - 1));
      giorni.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  }
  const sedute = giorni.map((g, i) => sed('s' + i, g));
  const ultimo = giorni[giorni.length - 1];
  const profilo = { giorni_allenamento: [MAR, MER, VEN, SAB] };

  // tanto volume da far salire la forza, e tante settimane da sbloccare tutto
  const serieForti = [];
  for (let i = 0; i < 40; i++) serieForti.push(serie('v' + i, 'e-chest', 50, 10));

  const r = calcolaAvatar('guerriero', serieForti, sedute, perId, { profilo, oggi: ultimo });
  const sbloccati = r.premi.filter((p) => p.sbloccato);
  assert.ok(sbloccati.length > 0, `con 20 settimane e tanto volume qualche armatura si sblocca: ${r.premi.map((p) => p.nome + '=' + p.sbloccato).join(', ')}`);
  // e ogni premio sbloccato DEVE anche avere la statistica richiesta
  for (const p of sbloccati) {
    for (const [k, min] of Object.entries(p.richiede)) {
      assert.ok(r.st[k] >= min, `${p.nome} sbloccato ma ${k} e' ${r.st[k]}, ne serviva ${min}`);
    }
  }
  // e ogni premio NON sbloccato deve dire PERCHE', non lasciare il blocco muto
  for (const p of r.premi.filter((x) => !x.sbloccato)) {
    assert.ok(p.perche && p.perche.length > 3, `${p.nome}: deve dire perche' manca, non lasciare il lucchetto`);
  }
});

test('R7. la CLASSE CONSIGLIATA guarda la statistica piu\' alta', () => {
  assert.equal(classeConsigliata({ forza: 10, agilita: 2, stamina: 1 }).bonus, 'forza');
  assert.equal(classeConsigliata({ forza: 1, agilita: 9, stamina: 2 }).bonus, 'agilita');
  assert.equal(classeConsigliata({ forza: 1, agilita: 1, stamina: 9 }).bonus, 'stamina');
  // se non hai ancora numeri, non si consiglia niente: sarebbe una classe
  // suggerita a caso
  assert.equal(classeConsigliata({ forza: 1, agilita: 1, stamina: 1 }), null);
  assert.equal(classeConsigliata({}), null);
});

test('R8. senza dati l\'RPG non si rompe e restituisce 1 ovunque', () => {
  const r = calcolaAvatar('guerriero', [], [], perId, { profilo: null });
  assert.equal(r.st.forza, 1, 'forza parte da 1');
  assert.equal(r.st.agilita, 1);
  assert.equal(r.st.stamina, 1);
  assert.equal(r.livello, 1, 'e il livello parte da 1');
  assert.equal(r.premi.length, PREMI.length, 'gli premi ci sono tutti, ma nessuno sbloccato');
  for (const p of r.premi) assert.equal(p.sbloccato, false);
});

test('R9. i PREMI crescono: ogni sbloccato richiede piu\' giorni del precedente', () => {
  // Se un giorno fossero scritti in ordine sparso, l'app mostrerebbe un\'armatura da
  // 100 giorni prima di una da 3 e non si capirebbe piu\' nulla.
  let ultimo = 0;
  for (const p of PREMI) {
    assert.ok(p.giorni > ultimo, `${p.nome}: i giorni devono crescere (${p.giorni} dopo ${ultimo})`);
    ultimo = p.giorni;
  }
  // e ogni premio ha un'icona e un testo, altrimenti sulla schermata c\'e\' un
  // rettangolo vuoto con un nome e nient'altro
  for (const p of PREMI) {
    assert.ok(p.icona && p.icona.length > 0, `${p.nome}: manca l'icona`);
    assert.ok(p.nome && p.nome.length > 1, `${p.nome}: manca il nome`);
    assert.ok(p.richiede && Object.keys(p.richiede).length > 0, `${p.nome}: deve dire cosa serve`);
  }
});