import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { comprimiFotoProfilo, percorsoFotoProfilo, urlFotoProfilo } from '../src/foto-profilo.js';

const utente = 'bd6ce98d-cc08-475d-82f0-900ec0419077';
const nome = '0b37605e-88c2-400b-ab98-a4d85ff91369';

test('v527: ID foto JPEG valido per Safari, nessuna URL arbitraria', () => {
  const id = `foto:${utente}/${nome}.jpg`;
  assert.equal(percorsoFotoProfilo(id), `${utente}/${nome}.jpg`);
  assert.equal(urlFotoProfilo(id, 'https://esempio.supabase.co'),
    `https://esempio.supabase.co/storage/v1/object/public/palestra-foto-profilo/${utente}/${nome}.jpg`);
  assert.equal(percorsoFotoProfilo(`foto:${utente}/${nome}.png`), null);
  assert.equal(percorsoFotoProfilo(`foto:${utente}/../${nome}.jpg`), null);
});

test('v527: Safari che restituisce PNG alla richiesta WebP ottiene JPEG prima dell’upload', async () => {
  const vecchi = { Image: globalThis.Image, document: globalThis.document,
    crea: URL.createObjectURL, revoca: URL.revokeObjectURL };
  const conversioni = [];
  try {
    globalThis.Image = class { naturalWidth = 400; naturalHeight = 300;
      set src(_) { this.onload(); } };
    URL.createObjectURL = () => 'blob:foto-test';
    URL.revokeObjectURL = () => {};
    globalThis.document = { createElement() {
      return { width: 0, height: 0, getContext() { return { drawImage() {} }; },
        toBlob(cb, tipo) {
          conversioni.push(tipo);
          cb(new Blob([new Uint8Array(1024)], { type: tipo === 'image/webp' ? 'image/png' : tipo }));
        } };
    } };
    const jpeg = await comprimiFotoProfilo({ size: 1800, type: 'image/heic', name: 'iphone.HEIC' });
    assert.equal(jpeg.type, 'image/jpeg');
    assert.deepEqual(conversioni, ['image/webp', 'image/jpeg']);
  } finally {
    globalThis.Image = vecchi.Image;
    globalThis.document = vecchi.document;
    URL.createObjectURL = vecchi.crea;
    URL.revokeObjectURL = vecchi.revoca;
  }
});

test('v527: upload JPEG autenticato conserva estensione e MIME corretti', async () => {
  const vecchi = { fetch: globalThis.fetch, storage: globalThis.localStorage };
  const richieste = [];
  try {
    globalThis.localStorage = {
      getItem(k) { return k === 'palestra-sessione' ? JSON.stringify({
        access_token: 'token-test', expires_at: 4102444800, refresh_token: 'refresh',
        user: { id: utente },
      }) : null; },
      setItem() {}, removeItem() {},
    };
    globalThis.fetch = async (url, options) => {
      richieste.push({ url, options });
      return { ok: true, status: 200, text: async () => JSON.stringify(
        url.endsWith('/auth/v1/user') ? { id: utente } : { Key: 'caricata' }) };
    };
    const { caricaFotoProfilo } = await import('../src/supabase.js');
    const risultato = await caricaFotoProfilo(new Blob(['jpeg-finto'], { type: 'image/jpeg' }), utente);
    assert.match(risultato.avatarId, new RegExp(`^foto:${utente}/[0-9a-f-]{36}\\.jpg$`));
    const caricamento = richieste.find(r => r.options.method === 'POST');
    assert.ok(caricamento.url.endsWith('.jpg'));
    assert.equal(caricamento.options.headers['Content-Type'], 'image/jpeg');
    assert.equal(caricamento.options.headers.Authorization, 'Bearer token-test');
  } finally {
    globalThis.fetch = vecchi.fetch;
    globalThis.localStorage = vecchi.storage;
  }
});

test('v527: bucket e policy consentono i JPEG preservando l’isolamento per account', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20261120014500_foto_profilo_safari_jpeg_v527.sql', import.meta.url), 'utf8');
  assert.match(migration, /allowed_mime_types\s*=\s*array\['image\/webp', 'image\/jpeg'\]/);
  assert.match(migration, /storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)\)::text/);
  assert.match(migration, /storage\.extension\(name\) in \('webp', 'jpg'\)/);
  // Il flusso foto Safari v527 rimane supportato anche dopo il cambio di skin v528.
  assert.match(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /palestra-v540/);
});
