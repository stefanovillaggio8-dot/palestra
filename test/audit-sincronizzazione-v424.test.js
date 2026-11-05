import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as db from '../src/db.js';
import { applicaRemote, scegliConflittoAggiornato, decidiPush } from '../src/sincronizzazione.js';

const stamp = () => 'audit-v424-' + Math.random().toString(36).slice(2);

/**
 * La cosa piu' pericolosa: un aggiornamento locale spesso fa spread della riga
 * letta, copiando anche sync:'pulito' e updated_at. Non deve sparire dalla coda.
 */
test('v424: salvare un profilo gia sincronizzato produce nuova revisione, data e coda', async () => {
  const id = stamp();
  const vecchiaData = '2026-10-10T10:00:00.000Z';
  const originale = await db.salva('profili', {
    id, equipaggiamento_aura: { corona:false },
    updated_at:vecchiaData, rev:3, base_rev:3, sync:'pulito',
  }, { segna:false });
  assert.equal(originale.sync,'pulito');
  const dopo = await db.salva('profili', {
    ...originale,
    equipaggiamento_aura: { corona:true },
  });
  assert.equal(dopo.sync,'da_salvare');
  assert.equal(dopo.base_rev,3);
  assert.equal(dopo.rev,4);
  assert.notEqual(dopo.updated_at,vecchiaData);
  assert.ok(Date.parse(dopo.updated_at) > Date.parse(vecchiaData));
  assert.ok((await db.codaDiInvio()).some(x => x.tabella==='profili' && x.riga.id===id));
});

test('v424: aggiornamento del peso corporeo non conserva sync pulito per sbaglio', async () => {
  const id = stamp();
  const old = await db.salva('pesi', {
    id, kg:66, data:'2026-10-31', sync:'pulito', rev:2, base_rev:2,
    updated_at:'2026-10-31T18:00:00.000Z',
  }, { segna:false });
  const changed = await db.salva('pesi', {...old,kg:67});
  assert.equal(changed.sync,'da_salvare');
  assert.equal(changed.rev,3);
  assert.equal(changed.base_rev,2);
  assert.ok(Date.parse(changed.updated_at)>Date.parse(old.updated_at));
});

test('v424: download remoto non modifica la riga con conflitto non ancora risolto', () => {
  const locale={
    id:'serie-42',peso:40,ripetizioni:8,
    rev:4,base_rev:1,sync:'conflitto',updated_at:'2026-11-01T12:00:00Z',
  };
  const remoto={
    id:'serie-42',peso:30,ripetizioni:6,
    rev:5,base_rev:5,sync:'pulito',updated_at:'2026-11-05T12:00:00Z',
  };
  const esito=applicaRemote(locale,remoto);
  assert.equal(esito.azione,'ignora');
  assert.equal(esito.riga.peso,40);
  assert.equal(esito.riga.sync,'conflitto');
  assert.equal(locale.peso,40);
});

test('v424: se la riga in conflitto viene modificata, rimane protetta', async () => {
  const id=stamp();
  const locale=await db.salva('serie',{
    id, peso:40,ripetizioni:8,base_rev:1,rev:4,sync:'conflitto',
    updated_at:'2026-10-30T12:00:00Z',
  }, { segna:false });
  const aggiornata=await db.salva('serie',{...locale,peso:42});
  assert.equal(aggiornata.sync,'conflitto');
  assert.equal(aggiornata.peso,42);
  assert.ok(Date.parse(aggiornata.updated_at)>Date.parse(locale.updated_at));
});

test('v424: sincronizzazione avviata piu volte non accumula timer/listener', () => {
  const src=readFileSync(new URL('../src/sync.js',import.meta.url),'utf8');
  assert.match(src,/let avvioRegistrato = false;/);
  assert.match(src,/if \(avvioRegistrato\) return;/);
  assert.match(src,/avvioRegistrato = true;/);
});

test('v424: scegliere la versione locale non cancella correzioni fatte dopo il conflitto', async () => {
  const id = stamp();
  const iniziale = await db.salva('serie', {
    id, peso:40, ripetizioni:8, rev:3, base_rev:1,
    sync:'conflitto', updated_at:'2026-10-30T10:00:00.000Z',
  }, { segna:false });
  const nuovaLocale = await db.salva('serie', {...iniziale,peso:45});
  const remoto = {
    id, peso:35, ripetizioni:6, rev:6, base_rev:6,
    updated_at:'2026-11-04T10:00:00.000Z',
  };
  const conflitto = {
    id:'conf-'+id, tabella:'serie', riga_id:id, stato:'da_scegliere',
    locale:{...iniziale,_etichetta:'Questo dispositivo'},
    remoto:{...remoto,_etichetta:'Altro dispositivo'},
  };
  const scelto = scegliConflittoAggiornato(conflitto, nuovaLocale, 'locale');
  assert.equal(scelto.riga.peso,45);
  assert.equal(scelto.riga.base_rev,6);
  const salvato = await db.salva('serie', scelto.riga);
  assert.equal(salvato.peso,45);
  assert.equal(salvato.base_rev,6);
  assert.ok(salvato.rev > 6, 'la revisione risolta supera quella remota');
  assert.equal(salvato.sync,'da_salvare');
  assert.equal(decidiPush(salvato, remoto),'aggiorna',
    'la scelta non deve generare di nuovo lo stesso conflitto');
});

test('v424: scegliere il server mantiene la base remota aggiornata', async () => {
  const id=stamp();
  const locale=await db.salva('serie', {
    id,peso:30,ripetizioni:8,rev:4,base_rev:1,
    sync:'conflitto',updated_at:'2026-10-30T10:00:00.000Z',
  },{segna:false});
  const remoto={id,peso:42,ripetizioni:6,rev:9,base_rev:9,
    updated_at:'2026-11-04T11:00:00.000Z'};
  const conflitto={
    riga_id:id,locale:{...locale},remoto:{...remoto},stato:'da_scegliere',
  };
  const scelta=scegliConflittoAggiornato(conflitto,locale,'remoto');
  const salvato=await db.salva('serie',scelta.riga);
  assert.equal(salvato.peso,42);
  assert.equal(salvato.base_rev,9);
  assert.ok(salvato.rev>9);
  assert.equal(decidiPush(salvato,remoto),'aggiorna');
});
