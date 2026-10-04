// aura.test.js -- Aura, XP, livello e medaglie. Regola d'oro: l'Aura non
// viene mai scritta a mano, si somma solo quello che il sistema ha registrato.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  sogliaLivello, livelloDaXP, statoLivello, totaliDaRicompense, formattaAura,
  ricompensaRecord, ricompensaPromozione, nuovaRicompensa, giaAssegnata, medaglie, MEDAGLIE,
} from '../src/aura.js';
import { ricompenseAllenamento, statoAccount } from '../src/gioco.js';

test('1. il livello cresce con gli XP e la curva non ha un tetto', () => {
  assert.equal(livelloDaXP(0), 1);
  assert.equal(livelloDaXP(99), 1);
  assert.equal(livelloDaXP(100), 2);
  assert.equal(livelloDaXP(300), 3);
  assert.equal(livelloDaXP(1000000) > 100, true, 'il livello non si ferma a 100');
  assert.ok(sogliaLivello(50) > sogliaLivello(10));
});

test('2. allo stato del livello si vede quanto manca', () => {
  const s = statoLivello(150);
  assert.equal(s.livello, 2);
  assert.equal(s.mancano, 150);
  assert.ok(s.progresso > 0 && s.progresso < 1);
  assert.equal(statoLivello(100).progresso, 0);
});

test('3. l\'Aura e\' la somma delle ricompense, e basta', () => {
  const ricompense = [
    { aura: 30, xp: 30, tipo: 'missione' },
    { aura: 20, xp: 25, tipo: 'record' },
    { aura: 0, xp: 50, tipo: 'promozione' },
  ];
  const t = totaliDaRicompense(ricompense);
  assert.equal(t.aura, 50);
  assert.equal(t.xp, 105);
  // senza ricompense non si inventa Aura
  assert.equal(totaliDaRicompense([]).aura, 0);
  assert.equal(totaliDaRicompense(null).aura, 0);
});

test('4. l\'Aura si formatta col punto delle migliaia', () => {
  assert.equal(formattaAura(1250), '1.250');
  assert.equal(formattaAura(999), '999');
  assert.equal(formattaAura(0), '0');
});

test('5. un rank alto dà pi\' ricompensa', () => {
  const bronze = ricompensaRecord('bronze');
  const olympian = ricompensaRecord('olympian');
  assert.ok(olympian.aura > bronze.aura);
  assert.ok(ricompensaPromozione('titan').xp > ricompensaPromozione('bronze').xp);
});

test('6. giaAssegnata evita i premi doppi', () => {
  const ricompense = [{ account_id: 'a1', tipo: 'record', fonte: 'ex-chest-press' }];
  assert.equal(giaAssegnata(ricompense, { account: 'a1', tipo: 'record', fonte: 'ex-chest-press' }), true);
  assert.equal(giaAssegnata(ricompense, { account: 'a1', tipo: 'record', fonte: 'altro' }), false);
  assert.equal(giaAssegnata(ricompense, { account: 'a2', tipo: 'record', fonte: 'ex-chest-press' }), false);
});

test('7. nuovaRicompensa non accetta numeri negativi', () => {
  const r = nuovaRicompensa({ id: 'x', account: 'a1', tipo: 'missione', aura: -50, xp: 10 });
  assert.equal(r.aura, 0);
  assert.equal(r.xp, 10);
});

test('8. le medaglie si guadagnano e mancano finche\' non le hai', () => {
  const zero = medaglie({ sedute: 0, aura: 0, streak: 0, missioni: 0, rank: {} });
  assert.equal(zero.filter((m) => m.ottenuta).length, 0);
  const molti = medaglie({ sedute: 120, aura: 3000, streak: 60, missioni: 110, rank: { gold: 2, diamond: 1 } });
  const perId = new Map(molti.map((m) => [m.id, m]));
  assert.equal(perId.get('cento-sedute').ottenuta, true);
  assert.equal(perId.get('aura-2500').ottenuta, true);
  assert.equal(perId.get('streak-50').ottenuta, true);
  assert.equal(perId.get('missioni-100').ottenuta, true);
  // il diamante sblocca anche le medaglie minori
  assert.equal(perId.get('bronzo').ottenuta, true);
  assert.equal(perId.get('oro').ottenuta, true);
  assert.equal(perId.get('diamante').ottenuta, true);
  assert.equal(perId.get('olimpico').ottenuta, false);
  assert.equal(MEDAGLIE.length, molti.length);
});

test('9. dopo un allenamento si guadagna una volta sola', () => {
  const sedute = [{ id: 's1', data: '2026-10-05', stato: 'completata', ora_inizio: '2026-10-05T18:00:00Z' }];
  const serie = [{ id: 'x1', seduta_id: 's1', esercizio_id: 'ex-chest-press', peso: 40, ripetizioni: 8, stato: 'fatta' }];
  const esercizi = [{ id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'macchina' }];
  const prime = ricompenseAllenamento({ account: 'a1', sedute, serie, esercizi, ricompense: [], oggi: '2026-10-05' });
  const tipi = prime.map((r) => r.tipo);
  assert.ok(tipi.includes('allenamento'));
  assert.ok(tipi.includes('record'));
  // la seconda volta non si raddoppia niente
  const seconde = ricompenseAllenamento({ account: 'a1', sedute, serie, esercizi, ricompense: prime, oggi: '2026-10-05' });
  assert.equal(seconde.length, 0);
});

test('10. il record di oggi non cancella quello di ieri', () => {
  const ieri = [{ id: 's1', data: '2026-10-04', stato: 'completata', ora_inizio: '2026-10-04T18:00:00Z' }];
  const oggi = [{ id: 's2', data: '2026-10-05', stato: 'completata', ora_inizio: '2026-10-05T18:00:00Z' }];
  const serie = [
    { id: 'a', seduta_id: 's1', esercizio_id: 'ex-chest-press', peso: 50, ripetizioni: 8, stato: 'fatta' },
    { id: 'b', seduta_id: 's2', esercizio_id: 'ex-chest-press', peso: 30, ripetizioni: 8, stato: 'fatta' },
  ];
  const esercizi = [{ id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'macchina' }];
  const st = statoAccount({ account: 'a1', sedute: [...ieri, ...oggi], serie, esercizi, oggi: '2026-10-05' });
  assert.equal(st.record.length, 1);
  assert.equal(st.record[0].serie.peso, 50, 'il record resta il 50, non 30');
});

test('11. lo stato dell\'account mette tutto insieme', () => {
  const sedute = [{ id: 's1', data: '2026-10-05', stato: 'completata', ora_inizio: '2026-10-05T18:00:00Z' }];
  const serie = [{ id: 'x1', seduta_id: 's1', esercizio_id: 'ex-chest-press', peso: 45, ripetizioni: 8, stato: 'fatta' }];
  const esercizi = [{ id: 'ex-chest-press', nome: 'Chest Press', convenzione: 'macchina' }];
  const ricompense = [{ id: 'r1', account_id: 'a1', tipo: 'allenamento', aura: 5, xp: 10 }];
  const st = statoAccount({ account: 'a1', sedute, serie, esercizi, ricompense, oggi: '2026-10-05' });
  assert.equal(st.statistiche.seduteCompletate, 1);
  assert.equal(st.aura, 5);
  assert.ok(st.rankPrincipale);
  assert.ok(st.missioni.daily);
  assert.equal(st.missioniCompletate, 0);
  assert.ok(st.medaglie.some((m) => m.id === 'prima-seduta' && m.ottenuta));
  assert.equal(st.streak.giorni, 1);
});

test('12. le missioni completate contano nelle statistiche', () => {
  const st = statoAccount({
    account: 'a1', sedute: [], serie: [], esercizi: [],
    completamenti: [
      { id: 'a1:il-campione:2026-10-05', categoria: 'daily', data: '2026-10-05', settimana: '2026-W41', completata_il: '2026-10-05T18:00:00Z' },
    ],
    oggi: '2026-10-05',
  });
  assert.equal(st.missioniCompletate, 1);
  assert.equal(st.storicoMissioni.length, 1);
});