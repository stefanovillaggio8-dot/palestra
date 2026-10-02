import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decidiPush, dopoInvioRiuscito, segnaDaSalvare, applicaRemote, risolviConflitto,
  costruisciConflitto, attesaRiprovo, contaDaSincronizzare, statoSalvataggio,
  nuovoId, rigaPerInvio,
} from '../src/sincronizzazione.js';

const riga = (over = {}) => ({
  id: 'r1', tabella: 'serie', peso: 45, ripetizioni: 7.5,
  rev: 1, base_rev: 1, updated_at: '2026-10-02T10:00:00.000Z',
  device_id: 'telefono', sync: 'pulito', ...over,
});

test('17. la sincronizzazione e\' idempotente: due righe con lo stesso id non si duplicano', () => {
  const a = riga({ sync: 'da_salvare', rev: 2 });
  const b = riga({ sync: 'da_salvare', rev: 2 });
  const id1 = nuovoId(); const id2 = nuovoId();
  assert.notEqual(id1, id2, 'ogni riga ha un id proprio');
  assert.equal(rigaPerInvio(a).id, 'r1');
  // inviare due volte la stessa riga produce sempre la stessa chiave primaria
  assert.equal(rigaPerInvio(a).id, rigaPerInvio(b).id);
});

test('15. un id generato e\' un UUID valido', () => {
  const id = nuovoId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('campi locali non vengono mai inviati al server', () => {
  const out = rigaPerInvio(riga({ sync: 'da_salvare', ultimo_errore: 'timeout', tentativi: 3 }));
  assert.equal(out.sync, undefined);
  assert.equal(out.ultimo_errore, undefined);
  assert.equal(out.tentativi, undefined);
  assert.equal(out.peso, 45);
});

test('15b. le regole di invio: crea, aggiorna, identico, conflitto', () => {
  assert.equal(decidiPush(riga(), null), 'crea');
  assert.equal(decidiPush(riga({ rev: 2 }), riga({ rev: 1 })), 'aggiorna');
  assert.equal(decidiPush(riga(), riga()), 'identico');
  assert.equal(decidiPush(riga({ rev: 3, base_rev: 1 }), riga({ rev: 2, base_rev: 2 })), 'conflitto');
  assert.equal(decidiPush(null, riga()), 'ignora');
});

test('dopo un invio riuscito la base avanza e la riga e\' pulita', () => {
  const out = dopoInvioRiuscito(riga({ sync: 'da_salvare', rev: 2 }), 2);
  assert.equal(out.sync, 'pulito');
  assert.equal(out.base_rev, 2);
  assert.equal(out.rev, 2);
  assert.equal(out.ultimo_errore, null);
});

test('segnaDaSalvare incrementa la revisione e rimette in coda', () => {
  const out = segnaDaSalvare(riga({ rev: 4, sync: 'pulito' }));
  assert.equal(out.rev, 5);
  assert.equal(out.sync, 'da_salvare');
  assert.notEqual(out.updated_at, riga().updated_at);
});

test('14. una riga remota che arriva mentre la locale e\' in coda e\' un conflitto', () => {
  const locale = riga({ sync: 'da_salvare', rev: 3, base_rev: 1 });
  const remoto = riga({ rev: 2, base_rev: 2, peso: 40, device_id: 'pc' });
  const esito = applicaRemote(locale, remoto);
  assert.equal(esito.azione, 'conflitto');
  assert.equal(esito.riga.peso, 40);
});

test('14b. se la locale non e\' in coda, la remota applica e la riga resta pulita', () => {
  const esito = applicaRemote(riga({ sync: 'pulito', rev: 1 }), riga({ rev: 2, peso: 42, device_id: 'pc' }));
  assert.equal(esito.azione, 'applica');
  assert.equal(esito.riga.peso, 42);
  assert.equal(esito.riga.sync, 'pulito');
  assert.equal(esito.riga.base_rev, 2);
});

test('14c. se la remota e\' piu\' vecchia viene ignorata (nessuna sovrascrittura)', () => {
  const esito = applicaRemote(riga({ sync: 'pulito', rev: 5 }), riga({ rev: 2 }));
  assert.equal(esito.azione, 'ignora');
  assert.equal(esito.riga.peso, 45);
});

test('16. il conflitto conserva entrambe le versioni e la scelta rimette in coda', () => {
  const locale = riga({ rev: 3, base_rev: 1, peso: 45, sync: 'da_salvare' });
  const remoto = riga({ rev: 2, peso: 40, device_id: 'pc' });
  const c = costruisciConflitto('c1', 'serie', locale, remoto);
  assert.equal(c.stato, 'da_scegliere');
  assert.equal(c.locale.peso, 45);
  assert.equal(c.remoto.peso, 40);
  assert.equal(c.locale._etichetta, 'Questo dispositivo');

  const sceltoLocale = risolviConflitto(c, 'locale');
  assert.equal(sceltoLocale.riga.peso, 45);
  assert.equal(sceltoLocale.riga.sync, 'da_salvare');
  assert.equal(sceltoLocale.perso.peso, 40, 'la versione scelta resta conservata nell\'altro record');

  const sceltoRemoto = risolviConflitto(c, 'remoto');
  assert.equal(sceltoRemoto.riga.peso, 40);
  assert.equal(sceltoRemoto.perso.peso, 45);
});

test('15c. ritentativi con attese crescenti', () => {
  assert.equal(attesaRiprovo(1), 5000);
  assert.equal(attesaRiprovo(2), 30000);
  assert.equal(attesaRiprovo(3), 120000);
  assert.equal(attesaRiprovo(9), 600000);
});

test('contaDaSincronizzare conta solo quello che manca davvero', () => {
  const c = [
    { sync: 'da_salvare' }, { sync: 'errore' }, { sync: 'pulito' },
    { sync: 'da_salvare' }, { sync: 'conflitto' }, { sync: 'in_corso' },
  ];
  assert.equal(contaDaSincronizzare(c), 3);
});

test('30. gli stati mostrati in alto sono corretti', () => {
  const configurato = true;
  assert.match(statoSalvataggio({ online: true, configurato, coda: 0, errori: 0, inCorso: false }).testo, /Salvato online/);
  assert.match(statoSalvataggio({ online: false, configurato, coda: 4, errori: 0, inCorso: false }).testo, /Offline \/ da sincronizzare \(4\)/);
  assert.match(statoSalvataggio({ online: true, configurato, coda: 2, errori: 0, inCorso: true }).testo, /^Salvataggio\.\.\.$/);
  assert.match(statoSalvataggio({ online: true, configurato, coda: 0, errori: 2, inCorso: false }).testo, /^Errore \(2\)$/);
  const solo = statoSalvataggio({ online: true, configurato: false, coda: 0, errori: 0, inCorso: false });
  assert.match(solo.testo, /Solo su questo dispositivo/);
});

test('"Salvato online" compare solo quando non c\'e\' una coda', () => {
  const s1 = statoSalvataggio({ online: true, configurato: true, coda: 1, errori: 0, inCorso: false });
  assert.doesNotMatch(s1.testo, /Salvato online/);
  assert.doesNotMatch(statoSalvataggio({ online: false, configurato: true, coda: 0, errori: 0, inCorso: false }).testo, /Salvato online/);
  assert.doesNotMatch(statoSalvataggio({ online: true, configurato: true, coda: 0, errori: 1, inCorso: false }).testo, /Salvato online/);
});
