import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { avvia } from '../src/sync.js';

test('v425: doppio avvio registra un solo gruppo di eventi e un solo timer di sync', async () => {
  const original = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    setInterval: globalThis.setInterval,
  };
  const eventiWindow = [];
  const eventiDocument = [];
  let timers = 0;
  try {
    Object.defineProperty(globalThis,'navigator',{
      configurable:true, value:{onLine:false},
    });
    globalThis.window = { addEventListener(name, fn) { eventiWindow.push(name); } };
    globalThis.document = { addEventListener(name, fn) { eventiDocument.push(name); } };
    globalThis.setInterval = () => { timers++; return 1; };
    avvia();
    avvia();
    avvia();
    assert.deepEqual(eventiWindow,['online','focus','offline']);
    assert.deepEqual(eventiDocument,['visibilitychange']);
    assert.equal(timers,1,'nessun timer nuovo al secondo avvio');
  } finally {
    globalThis.window = original.window;
    globalThis.document = original.document;
    Object.defineProperty(globalThis,'navigator',{
      configurable:true, value:original.navigator,
    });
    globalThis.setInterval = original.setInterval;
  }
});

test('v425: il bootstrap UI sostituisce il vecchio listener e non duplica focus', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url),'utf8');
  assert.match(app,/let disiscriviSyncAvvio = null;/);
  assert.match(app,/if \(disiscriviSyncAvvio\) disiscriviSyncAvvio\(\);/);
  assert.match(app,/disiscriviSyncAvvio = sync\.iscriviti\(/);
  assert.match(app,/if \(timerCreditoStreakAvvio !== null\) clearTimeout\(timerCreditoStreakAvvio\);/);
  assert.match(app,/if \(!gestoreFocusSyncRegistrato\)/);
  assert.match(app,/gestoreFocusSyncRegistrato = true;/);
});
