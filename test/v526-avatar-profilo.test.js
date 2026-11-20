import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bottone } from '../src/ui.js';

test('v526: i pulsanti degli avatar ricevono davvero il cerchio colorato come figlio', () => {
  const sorgente = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const sezione = sorgente.slice(sorgente.indexOf('const grigliaAvatar ='), sorgente.indexOf('boxAvatar.appendChild(grigliaAvatar)'));
  assert.match(sezione, /figli:\s*\[avatarNodo\(/);
  assert.match(sezione, /titolo:\s*`Avatar\s+\$\{a\.nome\}`/);
  assert.doesNotMatch(sezione, /\}\s*,\s*\[avatarNodo\(/, 'un terzo argomento di bottone viene ignorato');
});

test('v526: un bottone senza testo mostra i figli e conserva il nome accessibile', () => {
  const prima = globalThis.document;
  const creaNodo = (tag) => ({
    tagName: tag,
    children: [],
    attributes: {},
    appendChild(figlio) { this.children.push(figlio); },
    setAttribute(chiave, valore) { this.attributes[chiave] = String(valore); },
    addEventListener() {},
  });
  globalThis.document = { createElement: creaNodo, createTextNode: testo => ({ text: testo }) };
  try {
    const cerchio = creaNodo('span');
    const pulsante = bottone('', { classe: 'avatar-scelta', titolo: 'Avatar Viola', figli: [cerchio] });
    assert.deepEqual(pulsante.children, [cerchio]);
    assert.equal(pulsante.attributes['aria-label'], 'Avatar Viola');
  } finally {
    globalThis.document = prima;
  }
});
