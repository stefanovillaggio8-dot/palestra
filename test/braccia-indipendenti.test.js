import test from 'node:test';
import assert from 'node:assert/strict';

import { classificaEsercizio, PERCHE_BRACCIA_INDEPENDENTI } from '../src/esercizi-classificatore.js';
import { ESERCIZI } from '../src/dati-iniziali.js';

// Ste (04/10/2026): "però quando muovo il braccio destro non muovo anche il
// sinistro".
//
// Sta dicendo una cosa che non si dice scrivendo il nome dell'esercizio: la sua
// chest press ha i due bracci indipendenti, quindi e' una iso-lateral di fatto,
// anche se non si chiama cosi'. Il classificatore trova la parola "iso-lateral"
// nel NOME, e questa macchina si chiama "Chest Press", quindi la parola non c'e'
// e l'informazione può arrivare solo dai dati dell'esercizio.
//
// Da qui i tre rischi che questi test chiudono:
//  1) il dato non viene passato al classificatore -> il +2 sparisce in silenzio
//  2) il dato viene passato E il nome contiene anche la parola -> +4, doppio
//  3) la cache non distingue le due domande -> la seconda eredita la prima

const chest = ESERCIZI.find((e) => e.id === 'ex-chest-press');
const isoLateral = ESERCIZI.find((e) => e.id === 'ex-iso-lateral-row');

test('B1. la chest press di Ste ha i bracci indipendenti, e l\'app lo sa', () => {
  assert.equal(chest.bracciaIndipendenti, true,
    'il suo esercizio deve avere il dato, altrimenti non c\'e\' niente da imparare');
  const r = classificaEsercizio({
    nome: chest.nome,
    convenzione: chest.convenzione,
    attrezzatura: chest.attrezzatura,
    bracciaIndipendenti: true,
  });
  assert.ok(r.motivi.some((m) => m.includes(PERCHE_BRACCIA_INDEPENDENTI)),
    'deve dire che i due braccia sono indipendenti');
});

test('B2. l\'indipendenza vale quanto quella dell\'iso-lateral', () => {
  // la stessa cosa detta in due modi deve valere lo stesso
  const daiDati = classificaEsercizio({
    nome: chest.nome, attrezzatura: 'macchina_dischi', bracciaIndipendenti: true,
  });
  const dalNome = classificaEsercizio({
    nome: 'Iso-Lateral Row', attrezzatura: 'macchina_dischi',
  });
  assert.equal(daiDati.pesoModificatori, dalNome.pesoModificatori,
    'la chest press e l\'iso-lateral row devono avere lo stesso costo');
});

test('B3. nome E dato insieme non si contano due volte', () => {
  // Se un giorno un esercizio si chiamasse "Iso-Lateral Chest Press" e avesse
  // anche il campo, senza il controllo diventerebbe +4 invece di +2.
  const r = classificaEsercizio({
    nome: 'Iso-Lateral Chest Press',
    attrezzatura: 'macchina_dischi',
    bracciaIndipendenti: true,
  });
  const volte = r.motivi.filter((m) => m.includes(PERCHE_BRACCIA_INDEPENDENTI)).length;
  assert.equal(volte, 1, 'l\'indipendenza deve essere contata una volta sola');
  assert.ok(Math.abs(r.pesoModificatori) <= 2,
    'il totale non deve essere il doppio: ' + r.pesoModificatori);
});

test('B4. la cache distingue le due domande', () => {
  // La cache e' quello che rende il classificatore 1000 volte piu' veloce, ma
  // restituisce lo stesso oggetto. Se la chiave ignorasse bracciaIndipendenti,
  // la seconda domanda prenderebbe la risposta della prima e il +2 comparirebbe
  // (o sparirebbe) dipendendo solo dall'ordine delle chiamate. E' il tipo di
  // bug che si vede solo a volte, e quindi va chiuso con un test.
  const con = classificaEsercizio({
    nome: chest.nome, convenzione: chest.convenzione, attrezzatura: chest.attrezzatura,
    bracciaIndipendenti: true,
  });
  const senza = classificaEsercizio({
    nome: chest.nome, convenzione: chest.convenzione, attrezzatura: chest.attrezzatura,
  });
  assert.notEqual(con.pesoModificatori, senza.pesoModificatori,
    'con e senza braccia indipendenti la risposta deve cambiare');
  assert.equal(senza.pesoModificatori, -2, 'senza il dato resta solo la macchina a dischi');
  assert.equal(con.pesoModificatori, 0, 'col dato i due effetti si compensano');
});

test('B5. la chest press e l\'iso-lateral row ora valgono uguale', () => {
  assert.equal(chest.attrezzatura, isoLateral.attrezzatura, 'sono entrambe a dischi');
  const a = classificaEsercizio({
    nome: chest.nome, convenzione: chest.convenzione, attrezzatura: chest.attrezzatura,
    bracciaIndipendenti: true,
  });
  const b = classificaEsercizio({
    nome: isoLateral.nome, convenzione: isoLateral.convenzione,
    attrezzatura: isoLateral.attrezzatura,
  });
  assert.equal(a.pesoModificatori, b.pesoModificatori,
    'braccia indipendenti sul nome e braccia indipendenti nei dati valgono uguale');
});
