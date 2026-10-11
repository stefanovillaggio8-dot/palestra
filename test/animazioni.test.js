// test/animazioni.test.js
//
// Ste (10/10/2026): "comunque io le animazioni non le vedo".
//
// IL MOTIVO ERA WINDOWS, NON IL CSS.
//
// Il CSS ha la regola di accessibilità standard che azzera le animazioni quando il
// browser dice `prefers-reduced-motion: reduce`. Su Windows quel segnale viene
// dall'interruttore "Effetti di animazione" in Impostazioni > Accessibilità >
// Effetti visivi, e sul PC di Ste era spento. Quindi tutte e 13 le animazioni
// erano azzerate da un pezzo, e sembrava che l'app non le avesse.
//
// Il default continua a ubbidire a Windows, che è la cosa giusta per chi le animazioni
// non le regge. Ma adesso c'è anche la scelta "sempre accese": se le vuoi e Windows
// le ha spente per un motivo che non c'entra, la tua scelta vale più del sistema.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../stile.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('il blocco che azzera le animazioni c\'è ancora', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/,
    'la regola di accessibilità non si tocca: chi non vuole le animazioni non le deve vedere');
});

test('ma non quando l\'utente ha scelto "sempre accese"', () => {
  // Il punto di tutta la modifica. Senza questo, l'app non poteva superare una
  // scelta di Windows, e per Ste l'app restava senza animazioni per sempre.
  const i = css.indexOf('@media (prefers-reduced-motion');
  const blocco = css.slice(i, i + 700);
  assert.match(blocco, /animation-duration/, 'azzera le animazioni');
  assert.match(blocco, /transition-duration/, 'e le transizioni');
  assert.match(blocco, /html:not\(.animazioni-sempre\)/,
    'ma il selettore deve escludere chi ha scelto "sempre accese"');
});

test('le animazioni esistono davvero nel CSS', () => {
  // Se non ci fossero, l'interruttore non servirebbe a niente: ci sarebbe solo un
  // pulsante che accende il vuoto.
  const chiavi = css.match(/@keyframes\s+([\w-]+)/g) || [];
  assert.ok(chiavi.length >= 10,
    `dovrebbero esserci almeno 10 animazioni, ci sono ${chiavi.length}`);
  for (const nome of ['dialogo-entra', 'avviso-entra', 'serie-accesa', 'tocco']) {
    assert.ok(css.includes('@keyframes ' + nome), 'manca ' + nome);
  }
});

test('il modulo delle animazioni esiste ed espone le tre scelte', () => {
  const mod = readFileSync(new URL('../src/animazioni.js', import.meta.url), 'utf8');
  for (const id of ['auto', 'sempre', 'mai']) {
    assert.ok(mod.includes("id: '" + id + "'"), 'manca la scelta ' + id);
  }
  assert.ok(mod.includes('animazioni-sempre'), 'la classe che il CSS ascolta');
  assert.ok(mod.includes('animazioni-mai'), 'e quella per chi le spegne del tutto');
});

test('l\'app applica la scelta prima di disegnare', () => {
  // Se stasse dentro una pagina, la prima schermata aprirebbe con la scelta vecchia.
  assert.ok(app.includes('avviaAnimazioni()'), 'l\'app deve chiamare avviaAnimazioni');
  const pos = app.indexOf('avviaAnimazioni();');
  const disegna = app.indexOf('function disegna');
  assert.ok(pos < disegna || disegna < 0, 'la scelta va applicata presto');
});

test('le Impostazioni hanno il blocco delle animazioni', () => {
  assert.ok(app.includes('bloccoAnimazioni'), 'il blocco esiste');
  assert.ok(app.includes('bloccoAnimazioni()'), 'e viene chiamato');
  // e dice cosa sta succedendo adesso, così se le animazioni non si vedono lo sa
  assert.ok(app.includes('Windows chiede poco movimento'),
    'il blocco deve spiegare quando Windows le ha spente');
});

test('il modulo delle animazioni è nella cache del service worker', () => {
  // Se non sta in cache, l'app non parte senza rete e resta senza la classe sul
  // <html>: tornano le animazioni di Windows, e sembra che l'interruttore non
  // funzioni. Sarebbe un bug che si vede solo offline.
  assert.ok(sw.includes('./src/animazioni.js'), 'manca dalla cache');
});

test('la scelta "auto" resta quella di default', () => {
  // Se il default cambiasse in "sempre", chi soffre di mal di testa si troverebbe
  // le animazioni accese senza averlo chiesto. Il default deve continuare a
  // ubbidire al sistema.
  const mod = readFileSync(new URL('../src/animazioni.js', import.meta.url), 'utf8');
  assert.ok(mod.includes("return 'auto'"), 'senza memoria la scelta è auto');
  assert.ok(mod.includes("v) ? v : 'auto'"), 'una scelta ignota torna ad auto, non a sempre');
});