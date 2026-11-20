import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  percorsoFotoProfilo, urlFotoProfilo, validaFileFotoProfilo, comprimiFotoProfilo,
  DIMENSIONE_FOTO_PROFILO, MASSIMO_FOTO_COMPRESSA,
} from '../src/foto-profilo.js';

const proprietario = 'bd6ce98d-cc08-475d-82f0-900ec0419077';
const immagine = '0b37605e-88c2-400b-ab98-a4d85ff91369';
const idFoto = `foto:${proprietario}/${immagine}.webp`;

test('v525: URL foto solo per ID validi nel bucket dell’app; blocca URL esterni', () => {
  assert.equal(percorsoFotoProfilo(idFoto), `${proprietario}/${immagine}.webp`);
  assert.equal(urlFotoProfilo(idFoto, 'https://esempio.supabase.co'),
    `https://esempio.supabase.co/storage/v1/object/public/palestra-foto-profilo/${proprietario}/${immagine}.webp`);
  for (const finto of ['https://attacker.test/a.jpg', 'javascript:alert(1)', 'foto:../segreti',
    `foto:${proprietario}/../../x.webp`, 'foto:foo/bar.webp', 'rosso']) {
    assert.equal(percorsoFotoProfilo(finto), null);
    assert.equal(urlFotoProfilo(finto, 'https://esempio.supabase.co'), null);
  }
  assert.equal(urlFotoProfilo(idFoto, 'http://esempio.supabase.co'), null);
});

test('v525: controlla il tipo e la dimensione della foto prima di aprirla', () => {
  assert.doesNotThrow(() => validaFileFotoProfilo({ size: 1024, type: 'image/heic' }));
  assert.doesNotThrow(() => validaFileFotoProfilo({ size: 1024, type: '', name: 'selfie.HEIC' }));
  assert.throws(() => validaFileFotoProfilo({ size: 0, type: 'image/png' }), /15 MB/);
  assert.throws(() => validaFileFotoProfilo({ size: 16 * 1024 * 1024, type: 'image/png' }), /15 MB/);
  assert.throws(() => validaFileFotoProfilo({ size: 100, type: 'text/plain', name: 'notepad.txt' }), /foto/);
  assert.throws(() => validaFileFotoProfilo({ size: 100, type: 'image/svg+xml', name: 'x.svg' }), /foto/);
});

test('v525: la foto viene ritagliata al centro a 256 px e compressa in WebP', async () => {
  const imageOrig = globalThis.Image;
  const urlOrig = URL.createObjectURL;
  const revOrig = URL.revokeObjectURL;
  const docOrig = globalThis.document;
  const tagli = [];
  let revocato = false;
  try {
    globalThis.Image = class {
      naturalWidth = 400;
      naturalHeight = 200;
      set src(_) { this.onload(); }
    };
    URL.createObjectURL = () => 'blob:test-foto';
    URL.revokeObjectURL = () => { revocato = true; };
    globalThis.document = { createElement() {
      return { width: 0, height: 0, getContext() {
        return { drawImage(...args) { tagli.push(args); } };
      }, toBlob(cb) { cb(new Blob([new Uint8Array(1024)], { type: 'image/webp' })); } };
    } };
    const file = { size: 1024, type: 'image/jpeg', name: 'selfie.jpg' };
    const risultato = await comprimiFotoProfilo(file);
    assert.equal(risultato.type, 'image/webp');
    assert.ok(risultato.size <= MASSIMO_FOTO_COMPRESSA);
    assert.deepEqual(tagli[0].slice(1), [100, 0, 200, 200, 0, 0,
      DIMENSIONE_FOTO_PROFILO, DIMENSIONE_FOTO_PROFILO]);
    assert.equal(revocato, true);
  } finally {
    globalThis.Image = imageOrig;
    URL.createObjectURL = urlOrig;
    URL.revokeObjectURL = revOrig;
    globalThis.document = docOrig;
  }
});

test('v525: il Profilo propone la foto, conserva gli avatar colorati e non tocca il personaggio RPG', () => {
  const src = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(src, /Scegli una tua foto/);
  assert.match(src, /accept: 'image\/\*'/);
  assert.match(src, /caricaFotoProfilo\(blob, remoto\.user_id\)/);
  assert.match(src, /sb\.leggiUno\('profili', account\)/);
  assert.match(src, /for \(const a of elencoAvatar\(\)\)/);
  assert.match(src, /foto-profilo/);
  assert.match(sw, /'\.\/src\/foto-profilo\.js'/);
});

test('v525: upload soltanto dopo autenticazione e confronto dell’account, mai con un altro profilo', async () => {
  const fetchOrig = globalThis.fetch;
  const localOrig = globalThis.localStorage;
  const chiamate = [];
  try {
    globalThis.localStorage = {
      getItem(k) { return k === 'palestra-sessione' ? JSON.stringify({
        access_token: 'token-test', expires_at: 4102444800, refresh_token: 'refresh',
        user: { id: proprietario },
      }) : null; },
      setItem() {}, removeItem() {},
    };
    globalThis.fetch = async (url, options) => {
      chiamate.push({ url, options });
      return { ok: true, status: 200, text: async () => JSON.stringify(
        url.endsWith('/auth/v1/user') ? { id: proprietario } : { Key: idFoto }) };
    };
    const { caricaFotoProfilo } = await import('../src/supabase.js');
    const blob = new Blob([new Uint8Array(40)], { type: 'image/webp' });
    await assert.rejects(caricaFotoProfilo(blob, '9df107e1-68a0-43a5-8804-7467bc83424d'), /non corrisponde/);
    assert.equal(chiamate.length, 1, 'nessun upload per account sbagliato');
    const caricato = await caricaFotoProfilo(blob, proprietario);
    assert.match(caricato.avatarId, new RegExp(`^foto:${proprietario}/[0-9a-f-]{36}\\.webp$`));
    assert.equal(caricato.userId, proprietario);
    const post = chiamate.find(x => x.options.method === 'POST');
    assert.ok(post.url.includes(`/storage/v1/object/palestra-foto-profilo/${proprietario}/`));
    assert.ok(post.url.endsWith('.webp'));
    assert.equal(post.options.headers.Authorization, 'Bearer token-test');
    assert.equal(post.options.headers['Content-Type'], 'image/webp');
  } finally {
    globalThis.fetch = fetchOrig;
    globalThis.localStorage = localOrig;
  }
});
