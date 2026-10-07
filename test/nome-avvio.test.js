import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  chiSei, personaDaNome, personaDaMemoria, costruisciSnapshot,
  PERSONE, SCHEDA_ID, GIORNI,
} from '../src/dati-iniziali.js';

// ---------------------------------------------------------------------------
// IL NOME ALL'AVVIO: quando un amico apre il link vede "Stefano", e invece
// deve chiedere il nome e diventare se stesso.
// Ste (06/10/2026), tre regole decise insieme:
//   1) la scheda di un amico e' una COPIA della mia ma SENZA le mie serie;
//   2) chi sei si ricorda con DISPOSITIVO + URL;
//   3) nessuno finisce nella mia lista amici se non lo aggiungo io.
// ---------------------------------------------------------------------------

const TUA_SCHEDA = SCHEDA_ID;
const nomeACaso = (n) => 'amico' + n;

test('N1. senza link e senza memoria, su un dispositivo vuoto, si chiede il nome', () => {
  const esito = chiSei({ ricerca: '', memoria: null, schede: [] });
  assert.equal(esito.daChiedere, true, 'su un telefono nuovo non si sa chi sei: si chiede');
  assert.equal(esito.persona, null, 'e non si inventa nessuno');
});

test('N2. il link vince sempre la memoria del dispositivo', () => {
  // Il link e' di chi lo manda: se Marco apre il link di Luca sul suo telefono,
  // deve diventare Luca, non restare Marco.
  const r = chiSei({
    ricerca: '?n=luca&k=aa11',
    memoria: { n: 'marco', k: 'bb22' },
    schede: [],
  });
  assert.equal(r.daChiedere, false);
  assert.equal(r.persona.nome, 'luca');
  assert.equal(r.persona.schedaId, 'scheda-aa11');
  assert.equal(r.memoria.n, 'luca', 'e la memoria si aggiorna: al prossimo giro e\' Luca');
  assert.equal(r.memoria.k, 'aa11', 'con la sua chiave');
});

test('N3. la memoria vale quando il link non dice niente', () => {
  const primo = chiSei({ ricerca: '?n=luca&k=aa11', memoria: null, schede: [] });
  assert.equal(primo.daChiedere, false);
  const secondo = chiSei({ ricerca: '', memoria: primo.memoria, schede: [] });
  assert.equal(secondo.daChiedere, false, 'il nome non si chiede due volte');
  assert.equal(secondo.persona.schedaId, 'scheda-aa11', 'e si ritrova la stessa scheda');
});

test('N4. il telefono di Ste NON viene messo davanti alla domanda', () => {
  // Il pericolo grosso: se chiedessi il nome a chiunque, anche a lui, e digitasse
  // il suo, si troverebbe una scheda vuota e non vedrebbe piu' i suoi allenamenti.
  const te = PERSONE.find((p) => p.predefinita);
  const esito = chiSei({ ricerca: '', memoria: null, schede: [TUA_SCHEDA, 'scheda-altro-1'] });
  assert.equal(esito.daChiedere, false, 'su un dispositivo che ha gia\' le tue schede non si chiede');
  assert.equal(esito.persona.id, te.id, 'e si resta sulla tua');
  assert.equal(esito.persona.schedaId, TUA_SCHEDA);
  assert.equal(esito.memoria.p, te.id, 'e si ricorda, cosi\' la prossima volta e\' un attimo');
});

test('N5. ?p=1 e ?p=2 continuano a funzionare come prima', () => {
  const uno = chiSei({ ricerca: '?p=1', memoria: null, schede: [] });
  const due = chiSei({ ricerca: '?p=2', memoria: null, schede: [] });
  assert.equal(uno.persona.id, PERSONE[0].id);
  assert.equal(due.persona.id, PERSONE[1].id);
  assert.equal(uno.persona.schedaId, SCHEDA_ID, 'Stefano resta con la sua scheda');
  assert.equal(due.daChiedere, false, 'e nessuna delle due chiede il nome');
});

test('N6. un link senza nome o senza chiave non crea niente', () => {
  // mezzo link non e' un link: meglio chiedere che creare una persona a meta'
  for (const ricerca of ['?n=luca', '?k=aa11', '?n=&k=aa11', '?p=99', '?p=abc', '?n=%20&k=%20']) {
    const esito = chiSei({ ricerca, memoria: null, schede: [] });
    assert.ok(esito.persona === null || !esito.persona.creata,
      `la ricerca "${ricerca}" non deve creare una persona a caso`);
  }
  // ?p=99 non esiste: si torna alla regola del dispositivo, non si inventa
  const ignoto = chiSei({ ricerca: '?p=99', memoria: null, schede: [TUA_SCHEDA] });
  assert.equal(ignoto.persona.id, PERSONE.find((p) => p.predefinita).id,
    'una persona inesistente non ti butta fuori dal tuo profilo');
});

test('N7. la copia della scheda ha i tuoi giorni ma ZERO serie', () => {
  // Ste: "fai una copia della mia e loro la modificano... pero\' non deve
  // trovarsi dentro 35 kg alla chest press come se fossero suoi".
  const copia = costruisciSnapshot({ conSerie: false });
  const tuo = costruisciSnapshot();

  assert.equal(copia.giorni.length, tuo.giorni.length, 'i giorni sono gli stessi');
  for (let i = 0; i < copia.giorni.length; i++) {
    assert.equal(copia.giorni[i].esercizi.length, tuo.giorni[i].esercizi.length,
      'gli esercizi di ogni giorno sono gli stessi');
  }
  const eserciziCopia = copia.giorni.flatMap((g) => g.esercizi);
  const eserciziTuoi = tuo.giorni.flatMap((g) => g.esercizi);
  assert.ok(eserciziTuoi.some((e) => e.serie.length > 0), 'i tuoi hanno le serie');
  for (const e of eserciziCopia) {
    assert.deepEqual(e.serie, [], 'la copia NON si porta dietro nessuna serie: ' + e.esercizio_id);
    assert.equal(e.opzionale, e.opzionale, 'le opzionali restano');
  }
  // e nessuna serie del tuo scheda e' comparsa dentro la copia, nemmeno per
  // sbaglio di riferimento
  const pesiTuoi = new Set(eserciziTuoi.flatMap((e) => e.serie.map((s) => s.peso)));
  for (const e of eserciziCopia) {
    for (const s of e.serie) assert.ok(!pesiTuoi.has(s.peso), 'nessun peso tuo nella copia');
  }
});

test('N8. la scheda di un amico NON e\' la tua e non finisce fra i tuoi amici', () => {
  const a = personaDaNome('luca', 'aa11');
  const b = personaDaNome('luca', 'bb22'); // stesso nome, un\'altra persona
  const te = PERSONE.find((p) => p.predefinita);

  assert.notEqual(a.schedaId, te.schedaId, 'la scheda di un amico non e\' la tua');
  assert.notEqual(a.schedaId, b.schedaId,
    'due omonimi con chiavi diverse NON finiscono sulla stessa scheda');
  assert.deepEqual(a.amici, [], 'l\'amico non parte con amici');
  assert.equal(a.amministratore, false, 'e non parte amministratore');
  assert.equal(te.amici.includes(a.id), false,
    'e nessuno finisce fra i tuoi amici se non lo aggiungi tu');
  // il suo username e' il nome che ha scelto, non il tuo
  assert.equal(a.username, 'luca');
  assert.notEqual(a.username, te.username);
});

test('N9. quello che crea il profilo non finisce nella lista dei contatti da collegare', () => {
  // Ste: "Nessuno finisce nella mia lista amici se non lo aggiungo io. Chi apre il
  // link e\' visibile solo a se stesso". I CONTATTI sono la lista che vedi tu: e\'
  // scritta a mano, quindi una persona creata al volo non ci appare, e questo
  // test lo blocca.
  const a = personaDaNome('luca', 'aa11');
  const inContatti = PERSONE.some((p) => p.id === a.id);
  assert.equal(inContatti, false, 'una persona creata non e\' fra le persone scritte a mano');
});

test('N10. chi si registra non vede niente di te per caso', () => {
  // Il controllo che tiene insieme tutto: due persone diverse hanno schede
  // diverse, quindi i tuoi allenamenti non possono finire fra i suoi.
  const a = personaDaNome('luca', 'aa11');
  const versioniTue = new Set(PERSONE.filter((p) => p.schedaId === SCHEDA_ID).map((p) => p.schedaId));
  assert.equal(versioniTue.has(a.schedaId), false);
  assert.notEqual(a.schedaId, SCHEDA_ID);
  // e la copia non contiene nessun id di scheduta: gli id delle sedute nascono
  // nuovi, quindi la copia non puo' scrivere sulle tue righe
  const copia = costruisciSnapshot({ conSerie: false });
  assert.equal(copia.scheda_id, SCHEDA_ID, 'la copia parte dalla tua struttura');
  assert.equal(GIORNI.length, copia.giorni.length);
});