import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  raccogliPerEsercizio, serieRegistrata, aPrevista, descriviSerie,
  proposta, fraseCambiamento, MODALITA,
} from '../src/aggiornamento.js';
import { costruisciSnapshot, ESERCIZI } from '../src/dati-iniziali.js';
import { CONVENZIONI } from '../src/numeri.js';

const perId = new Map(ESERCIZI.map((e) => [e.id, e]));
const CP = perId.get('ex-chest-press');
const PULL = perId.get('ex-pull-ups');

const serie = (o, peso, rip, extra = {}) => ({
  seduta_id: 's1', ordine: o, peso, ripetizioni: rip, spotter: false,
  esercizio_id: 'ex-chest-press', ...extra,
});

test('le serie si raggruppano per esercizio e si mettono in ordine', () => {
  const grezze = [
    serie(3, 35, 6), serie(1, 35, 8), serie(2, 35, 7),
    serie(1, 88, 6, { esercizio_id: 'ex-neutral-grip-lat-pulldown' }),
    serie(9, 35, 8, { seduta_id: 'altra' }),
    serie(9, 35, 8, { eliminata: true }),
  ];
  const per = raccogliPerEsercizio(grezze, 's1');
  assert.equal(per.size, 2);
  assert.deepEqual(per.get('ex-chest-press').map((s) => s.ordine), [1, 2, 3]);
  assert.equal(per.get('ex-neutral-grip-lat-pulldown').length, 1);
});

test('una serie conta solo se ha almeno i kg e le ripetizioni', () => {
  assert.equal(serieRegistrata({ peso: 35, ripetizioni: 8 }), true);
  assert.equal(serieRegistrata({ peso: null, peso_assistenza: 15, ripetizioni: 7 }), true);
  assert.equal(serieRegistrata({ peso: 35, ripetizioni: null }), false);
  assert.equal(serieRegistrata({ peso: null, ripetizioni: null }), false);
  assert.equal(serieRegistrata({ peso: null, peso_assistenza: null, ripetizioni: 8 }), false);
});

test('una ripetizione in piu\' aggiorna la scheda', () => {
  const snap = costruisciSnapshot();
  const per = new Map([['ex-chest-press', [
    serie(1, 35, 8), serie(2, 35, 7), serie(3, 35, 7),
  ]]]);
  const res = proposta(snap, 'giorno-1', per, perId);
  assert.equal(res.nessunaNovita, false);
  assert.equal(res.cambiamenti.length, 1);
  const c = res.cambiamenti[0];
  assert.equal(c.nome, 'Chest Press');
  assert.equal(c.prima, '35x8, 35x7, 35x6');
  assert.equal(c.dopo, '35x8, 35x7, 35x7');
  assert.equal(c.ripCambiate, true);
  assert.equal(fraseCambiamento(c), 'Chest Press: 35x8, 35x7, 35x6 → 35x8, 35x7, 35x7');
  const g1 = res.snapshot.giorni.find((g) => g.id === 'giorno-1');
  assert.deepEqual(g1.esercizi[0].serie.map((s) => s.ripetizioni), [8, 7, 7]);
});

test('i kg aumentati aggiornano la scheda', () => {
  const snap = costruisciSnapshot();
  const per = new Map([['ex-chest-press', [serie(1, 37.5, 8), serie(2, 35, 7), serie(3, 35, 6)]]]);
  const res = proposta(snap, 'giorno-1', per, perId);
  const c = res.cambiamenti[0];
  assert.equal(c.prima, '35x8, 35x7, 35x6');
  assert.equal(c.dopo, '37,5x8, 35x7, 35x6');
  assert.equal(c.pesoCambiato, true);
});

test('una serie in piu\' aggiunta durante l\'allenamento finisce nella scheda', () => {
  const snap = costruisciSnapshot();
  const per = new Map([['ex-chest-press', [serie(1, 35, 8), serie(2, 35, 7), serie(3, 35, 6), serie(4, 35, 6)]]]);
  const res = proposta(snap, 'giorno-1', per, perId);
  const g1 = res.snapshot.giorni.find((g) => g.id === 'giorno-1');
  assert.equal(g1.esercizi[0].serie.length, 4);
});

test('i decimali si conservano anche nella scheda aggiornata', () => {
  const snap = costruisciSnapshot();
  const per = new Map([['ex-chest-press', [serie(1, 35, 7.5)]]]);
  const res = proposta(snap, 'giorno-1', per, perId);
  const g1 = res.snapshot.giorni.find((g) => g.id === 'giorno-1');
  assert.equal(g1.esercizi[0].serie.length, 1, 'le serie vuote spariscono dalla scheda');
  assert.equal(g1.esercizi[0].serie[0].ripetizioni, 7.5);
  assert.equal(res.cambiamenti[0].dopo, '35x7,5');
});

test('gli esercizi assistiti aggiornano il peso di assistenza, non il carico', () => {
  const snap = costruisciSnapshot();
  const per = new Map([['ex-pull-ups', [serie(1, null, 7, { peso_assistenza: 10 })] ]]);
  const res = proposta(snap, 'giorno-4', per, perId);
  const g4 = res.snapshot.giorni.find((g) => g.id === 'giorno-4');
  const es = g4.esercizi.find((e) => e.esercizio_id === 'ex-pull-ups');
  assert.equal(es.serie.length, 1);
  assert.equal(es.serie[0].peso, null, 'il carico resta vuoto');
  assert.equal(es.serie[0].peso_assistenza, 10);
});

test('si aggiorna SOLO il giorno allenato, gli altri non si muovono', () => {
  const snap = costruisciSnapshot();
  const prima = JSON.stringify(snap.giorni.filter((g) => g.id !== 'giorno-1'));
  const per = new Map([['ex-chest-press', [serie(1, 99, 12)]]]);
  const res = proposta(snap, 'giorno-1', per, perId);
  assert.equal(JSON.stringify(res.snapshot.giorni.filter((g) => g.id !== 'giorno-1')), prima,
    'gli altri 3 giorni sono identici');
});

test('l\'ordine degli esercizi e le note non cambiano', () => {
  const snap = costruisciSnapshot();
  const ordinePrima = snap.giorni[0].esercizi.map((e) => e.esercizio_id);
  const per = new Map([['ex-chest-press', [serie(1, 40, 8)]]]);
  const res = proposta(snap, 'giorno-1', per, perId);
  assert.deepEqual(res.snapshot.giorni[0].esercizi.map((e) => e.esercizio_id), ordinePrima);
});

test('gli esercizi non fatti restano come erano', () => {
  const snap = costruisciSnapshot();
  const legPrima = JSON.stringify(snap.giorni[0].esercizi[4]);
  const per = new Map([['ex-chest-press', [serie(1, 40, 8)]]]);
  const res = proposta(snap, 'giorno-1', per, perId);
  assert.equal(JSON.stringify(res.snapshot.giorni[0].esercizi[4]), legPrima,
    'Leg Extension non e\' stato allenato: la scheda lo lascia stare');
});

test('se non hai cambiato niente non viene proposta nessuna modifica', () => {
  const snap = costruisciSnapshot();
  const per = new Map([['ex-chest-press', [serie(1, 35, 8), serie(2, 35, 7), serie(3, 35, 6)]]]);
  const res = proposta(snap, 'giorno-1', per, perId);
  assert.equal(res.nessunaNovita, true);
  assert.equal(res.cambiamenti.length, 0);
});

test('lo spotter e le ripetizioni assistite NON finiscono nella scheda', () => {
  const snap = costruisciSnapshot();
  const per = new Map([['ex-chest-press', [
    serie(1, 35, 8, { spotter: true, rip_assistite: 2 }),
  ]]]);
  const res = proposta(snap, 'giorno-1', per, perId);
  const g1 = res.snapshot.giorni.find((g) => g.id === 'giorno-1');
  const chiavi = Object.keys(g1.esercizi[0].serie[0]).sort();
  assert.deepEqual(chiavi, ['dropset', 'peso', 'peso_assistenza', 'ripetizioni']);
});

test('il dropset resta un dropset nella scheda aggiornata', () => {
  const snap = costruisciSnapshot();
  const per = new Map([['ex-wrist-curl', [serie(1, 25, 6, { dropset: true })]]]);
  const res = proposta(snap, 'giorno-4', per, perId);
  const g4 = res.snapshot.giorni.find((g) => g.id === 'giorno-4');
  const es = g4.esercizi.find((e) => e.esercizio_id === 'ex-wrist-curl');
  assert.equal(es.serie[0].dropset, true);
  assert.equal(res.cambiamenti[0].dopo, 'D25x6');
});

test('descriviSerie e aPrevista usano la convenzione giusta', () => {
  assert.equal(descriviSerie([{ peso: 45, ripetizioni: 7 }], CP), '45x7');
  assert.equal(descriviSerie([{ peso: null, peso_assistenza: 15, ripetizioni: 7 }], PULL), '15x7');
  const p = aPrevista({ peso: 45, ripetizioni: 7, dropset: false }, CP);
  assert.deepEqual(p, { peso: 45, peso_assistenza: null, ripetizioni: 7, dropset: false });
});

test('la proposta non tocca lo snapshot di partenza', () => {
  const snap = costruisciSnapshot();
  const copia = JSON.stringify(snap);
  const per = new Map([['ex-chest-press', [serie(1, 99, 12)]]]);
  proposta(snap, 'giorno-1', per, perId);
  assert.equal(JSON.stringify(snap), copia, 'la scheda originale e\' rimasta intatta');
});

test('le tre modalita\' sono quelle giuste', () => {
  assert.deepEqual(Object.values(MODALITA).sort(), ['chiedi', 'mai', 'sempre']);
});