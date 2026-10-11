// test/avatar-stato.test.js
//
// Ste (10/10/2026): "immutabilità del personaggio: una volta che l'utente sceglie
// la classe, questa scelta è permanente e non può essere modificata. Deve esserci un
// flag nel database/stato che impedisca la ricreazione del personaggio".
//
// Il flag è `characterCreated`. Questi test verificano che il vincolo regga, e
// soprattutto che non sia un avviso "non puoi" che poi lascia passare: un vincolo
// che avvisa e lascia fare è peggio di non averlo, perché fa credere che il
// vincolo ci sia.
//
// Nell'app, prima di questo modulo, il bottone della classe salvava a ogni
// pressione e il testo diceva "cambia quando ti pare".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  statoIniziale, creaPersonaggio, equipaggiamentoPer, avanza,
  prossimoGradino, conteggio, SLOT, CLASSI_AVATAR, PROGRESSIONE,
} from '../src/avatar-stato.js';

const ORA = '2026-10-10T12:00:00.000Z';
const nuovo = () => statoIniziale('u1', ORA);

test('lo stato nuovo non ha un personaggio', () => {
  const s = nuovo();
  assert.equal(s.characterCreated, false, 'non è ancora stato creato');
  assert.equal(s.baseModelId, null);
  assert.equal(s.currentStreak, 0);
  assert.deepEqual(s.equippedVisuals, Object.fromEntries(SLOT.map((k) => [k, null])),
    'e tutti gli slot sono vuoti');
});

test('la prima scelta crea il personaggio', () => {
  const { stato, creato } = creaPersonaggio(nuovo(), 'berserker', ORA);
  assert.equal(creato, true);
  assert.equal(stato.characterCreated, true);
  assert.equal(stato.baseModelId, 'berserker');
  assert.equal(stato.createdAt, ORA);
});

test('IL VINCOLO: la seconda scelta viene RIFIUTATA, non avvisata', () => {
  const primo = creaPersonaggio(nuovo(), 'berserker', ORA).stato;
  const secondo = creaPersonaggio(primo, 'guerriero', ORA);
  assert.equal(secondo.creato, false, 'non deve creare niente');
  assert.equal(secondo.stato.baseModelId, 'berserker',
    'la classe deve restare berserker: è quella scelta per primo');
  assert.equal(secondo.perche, 'il personaggio è già stato creato',
    'e deve dire perché, non lasciare il dubbio');
});

test('il rifiuto non tocca nemmeno l\'equipaggiamento', () => {
  // Il motivo per cui il vincolo serve: senza, si cambia classe e si riparte da
  // capo. Qui si controlla che il tentativo non abbia cambiato niente.
  let s = creaPersonaggio(nuovo(), 'guerriero', ORA).stato;
  s = avanza(s, 40).stato;
  const prima = JSON.stringify(s.equippedVisuals);
  const rifiutato = creaPersonaggio(s, 'assassino', ORA);
  assert.equal(rifiutato.stato, s, 'lo stato deve essere lo stesso oggetto, non una copia');
  assert.equal(JSON.stringify(rifiutato.stato.equippedVisuals), prima,
    'l\'equipaggiamento deve restare quello di prima');
});

test('una classe che non esiste viene rifiutata', () => {
  for (const cattiva of ['mago', '', null, undefined, 'Guerriero']) {
    const r = creaPersonaggio(nuovo(), cattiva, ORA);
    assert.equal(r.creato, false, `"${cattiva}" non è una classe`);
    assert.equal(r.stato.characterCreated, false,
      'e un tentativo sbagliato non deve creare il personaggio');
  }
  // e le tre vere vanno bene tutte
  for (const buona of CLASSI_AVATAR) {
    assert.equal(creaPersonaggio(nuovo(), buona, ORA).creato, true, buona);
  }
});

test('il flag characterCreated sta SEPARATO da baseModelId', () => {
  // La ragione per cui sono due campi e non uno: se `baseModelId` tornasse vuoto per
  // un errore di lettura, dal solo id sembrerebbe che non hai scelto, e l'app te
  // farebbe rifare la scelta. Con il flag a parte, la scelta risulta fatta.
  const s = { ...nuovo(), baseModelId: null, characterCreated: true };
  const r = creaPersonaggio(s, 'guerriero', ORA);
  assert.equal(r.creato, false, 'il flag dice che la scelta c\'è stata: non si rifà');
});

test('la progressione parte da sola e segue la streak', () => {
  let s = creaPersonaggio(nuovo(), 'guerriero', ORA).stato;
  // le soglie di Ste: 0-2 base, 3 bracciali, 7 corazza, 15 ferro, 30 spada.
  // La progressione è CUMULATIVA: a 7 giorni ci sono già i bracciali, e non solo
  // il torso. È il punto del "i cambiamenti devono essere cumulativi".
  const atteso = {
    0: [], 2: [],
    3: ['bracciali'], 6: ['bracciali'],
    7: ['bracciali', 'torso'], 14: ['bracciali', 'torso'],
    15: ['bracciali', 'torso', 'protezione'],
    30: ['bracciali', 'torso', 'protezione', 'arma'],
  };
  for (const [giorni, slot] of Object.entries(atteso)) {
    const acceso = Object.entries(equipaggiamentoPer(s, Number(giorni)))
      .filter(([, p]) => p).map(([k]) => k);
    assert.deepEqual(acceso, slot, `a ${giorni} giorni devono stare ${JSON.stringify(slot)}`);
  }
});

test('l\'equipaggiamento è CUMULATIVO e non si toglie', () => {
  // Il requisito: "i cambiamenti devono essere cumulativi e visibili". E la prova
  // vera è che la streak CALA e i pezzi restano.
  let s = creaPersonaggio(nuovo(), 'guerriero', ORA).stato;
  s = avanza(s, 40).stato;
  const pieno = conteggio(s);
  assert.ok(pieno.addosso >= 4, `a 40 giorni ci sono almeno 4 pezzi, ce ne sono ${pieno.addosso}`);

  // la streak va a zero
  s = avanza(s, 0).stato;
  assert.equal(conteggio(s).addosso, pieno.addosso,
    'se smetti di allenarti NON ti spogli di dosso quello che hai');
  assert.ok(s.equippedVisuals.arma, 'la spada resta tua');
});

test('avanza non mette due volte lo stesso pezzo', () => {
  // Il caso: il `nuovi` restituito serve a fare l'annuncio. Se ogni chiamata
  // annuncerebbe di nuovo i pezzi già addosso, l'app urlerebbe "spada sbloccata"
  // ogni volta che apre la pagina.
  let s = creaPersonaggio(nuovo(), 'guerriero', ORA).stato;
  const primo = avanza(s, 10);
  assert.equal(primo.nuovi.length, 2, 'a 10 giorni si sbloccano bracciali e torso');
  s = primo.stato;
  const secondo = avanza(s, 10);
  assert.equal(secondo.nuovi.length, 0, 'la seconda volta non si annuncia niente');
  const terzo = avanza(s, 40);
  assert.equal(terzo.nuovi.length, 2, 'ma a 40 giorni annuncia solo i due nuovi');
});

test('ogni classe ha i SUOI indumenti', () => {
  // Ste: "la progressione quindi gli indumenti devono essere diversi per ogni
  // personaggio". Dai nomi delle schede che mi ha mandato.
  const nomi = (c, s) => {
    const st = creaPersonaggio(nuovo(), c, ORA).stato;
    return Object.values(equipaggiamentoPer(st, 99)).filter(Boolean);
  };
  const g = nomi('guerriero', 0);
  const b = nomi('berserker', 0);
  const a = nomi('assassino', 0);
  // almeno i tre pezzi del torso, protezione e arma sono diversi fra loro
  const torso = [g[1], b[1], a[1]];
  assert.equal(new Set(torso).size, 3, `i tre torso devono essere diversi: ${torso.join(' / ')}`);

  // LA PROTEZIONE: qui i due muscoli hanno la STESSA cosa, ed è giusto. Nella
  // scheda di Ste sia il guerriero sia il berserker hanno "armatura di ferro";
  // l'assassino no, ha la cintura. Non è un pezzo dimenticato: è la differenza
  // vera fra chi si copre di metallo e chi si copre di tessuto.
  const protezione = [g[2], b[2], a[2]];
  assert.equal(protezione[0], protezione[1],
    'guerriero e berserker indossano entrambi l\'armatura di ferro');
  assert.notEqual(protezione[0], protezione[2],
    `l'assassino no: ha ${protezione[2]}`);

  const arma = [g[3], b[3], a[3]];
  assert.equal(new Set(arma).size, 3, `le tre armi devono essere diverse: ${arma.join(' / ')}`);
  // e il primo pezzo è uguale per tutti, perché nella scheda è uguale
  assert.equal(g[0], b[0], 'i bracciali sono gli stessi per tutti');
  assert.equal(b[0], a[0]);
});

test('le tre progressioni hanno gli stessi slot e le stesse soglie', () => {
  // Se una classe avesse uno slot in più, il personaggio con più pezzi avrebbe
  // uno slot vuoto per sempre. E se le soglie fossero diverse, uno dei tre
  // sbloccherebbe tutto prima degli altri.
  const mappaSlot = CLASSI_AVATAR.map((c) => PROGRESSIONE[c].map((g) => g.slot));
  assert.deepEqual(mappaSlot[0], mappaSlot[1]);
  assert.deepEqual(mappaSlot[1], mappaSlot[2]);
  const soglie = CLASSI_AVATAR.map((c) => PROGRESSIONE[c].map((g) => g.streak));
  assert.deepEqual(soglie[0], soglie[1], 'le soglie non cambiano con la classe');
  assert.deepEqual(soglie[1], soglie[2]);
  // e le soglie crescono sempre
  for (const c of CLASSI_AVATAR) {
    let ultimo = 0;
    for (const g of PROGRESSIONE[c]) {
      assert.ok(g.streak > ultimo, `${c}: ${g.slot} deve venire dopo, non prima`);
      ultimo = g.streak;
    }
  }
});

test('il prossimo gradino dice quanti giorni mancano', () => {
  const s = creaPersonaggio(nuovo(), 'guerriero', ORA).stato;
  let g = prossimoGradino(s);
  assert.equal(g.slot, 'bracciali', 'il primo è sempre il bracciale');
  assert.equal(g.mancano, 3, 'e mancano 3 giorni');
  // dopo averlo sbloccato, il prossimo è il successivo e NON ricomincia
  const dopo = avanza(s, 3).stato;
  g = prossimoGradino(dopo);
  assert.equal(g.slot, 'torso', 'il prossimo è il torso');
  assert.equal(g.mancano, 4, 'mancono 4 giorni per arrivarci');
  // e quando è tutto preso, `null` e non un errore
  const tutto = avanza(dopo, 999).stato;
  assert.equal(prossimoGradino(tutto), null, 'finito tutto: nessun gradino dopo');
});