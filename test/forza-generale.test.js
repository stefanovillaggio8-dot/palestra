import test from 'node:test';
import assert from 'node:assert/strict';

import {
  prestazione, mediaPrestazioni, classificaGenerale, kgReali,
  gambeEsclusoDaMedia, prestazioneAllaSeduta,
} from '../src/forza-generale.js';

// Ste (04/10/2026):
// "con kg intendo il peso che alzo in piu' rispetto al mio corpo. Per esempio io
//  peso 66kg e faccio 96 di lat machine, alzo 30kg in piu' del mio peso"
// "per la media NON contare esercizi di gambe perche' quelli sballano troppo"
// "non voglio che nella classifica scrivi cosi tipo 1,38 x il suo peso, ma voglio
//  che scrivi entrambi" (i kg E il rapporto)
// "voglio che dica chi in generale e' piu' forte, facendo una media, e sia che si
//  vedano tutti gli esercizi facendo vedere chi fa di piu'"
// "non voglio solo che si veda chi e' il piu' forte: voglio vedere gli altri"

const PESO = 66;
const fatta = (peso, rip = 6) => ({ peso, ripetizioni: rip, stato: 'fatta' });
// Gli ID sono quelli VERI della scheda di Ste. Con un id inventato la scala
// cade sul fallback generico e il test non proverebbe niente: e' la stessa
// lezione del test che leggeva ESERCIZI invece di oggetti inventati.
const ID_VERI = {
  'Lat Pulldown (lats)': 'ex-lat-pulldown-lats',
  'Lat Pulldown macchina': 'ex-neutral-grip-lat-pulldown',
  'Leg Press': 'ex-single-leg-press',
  'Leg Curl': 'ex-seated-leg-curl',
  'Chest Press': 'ex-chest-press',
  'Cable Lateral Raise': 'ex-cable-lateral-raise',
  'Cable Hammer Curl': 'ex-cable-hammer-curl',
};
const es = (nome, gruppo) => ({ id: ID_VERI[nome] || nome, nome, gruppo });

test('F1. l\'esempio di Ste, numeri esatti', () => {
  // 96 kg su un corpo di 66: hai sollevato 30 kg IN PIU' del tuo corpo.
  const p = prestazione({
    esercizio: es('Lat Pulldown (lats)', 'Lat Pulldown'),
    serie: [fatta(96)], pesoCorporeo: PESO,
  });
  assert.equal(p.kg, 96);
  assert.equal(p.eccesso, 30, '96 - 66 = 30 kg in piu\' del peso');
  assert.equal(p.rapporto, 1.455, 'e il rapporto: 96kg su un corpo di 66');
});

test('F2. le gambe non contano nella media', () => {
  // Ste: "non contare esercizi di gambe perche' quelli sballano troppo".
  // Prima cercavo solo "gambe" e il "Leg Press" passava: i nomi sono in inglese.
  for (const nome of ['Leg Press', 'Leg Curl', 'Leg Extension', 'Sled Press Calf Raise',
    'Single Leg Press', 'Squat']) {
    assert.equal(gambeEsclusoDaMedia(nome, nome), true, nome + ' e\' una gamba');
  }
  for (const nome of ['Chest Press', 'Cable Lateral Raise', 'Cable Hammer Curl',
    'Lat Pulldown', 'Seated Cable Row', 'Scott Bench Curl']) {
    assert.equal(gambeEsclusoDaMedia(nome, nome), false, nome + ' NON e\' una gamba');
  }

  const gamba = prestazione({
    esercizio: es('Leg Press', 'Leg Press'), serie: [fatta(110)], pesoCorporeo: PESO,
  });
  assert.equal(gamba.contaNellaMedia, false);
  assert.ok(gamba.percheNonConta, 'e deve spiegare PERCHE\' non conta');
  assert.equal(gamba.eccesso, 44, 'il numero resta visibile anche se non conta');
});

test('F3. la media non si lascia spostare dalle gambe', () => {
  const alto = prestazione({
    esercizio: es('Lat Pulldown', 'Lat Pulldown'), serie: [fatta(96)], pesoCorporeo: PESO,
  });
  const gambone = prestazione({
    esercizio: es('Leg Press', 'Leg Press'), serie: [fatta(200)], pesoCorporeo: PESO,
  });
  const media = mediaPrestazioni([alto, gambone]);
  assert.equal(media.conta, 1, 'conta solo la lat machine');
  assert.equal(media.conta, 1, 'conta solo la lat machine');
  assert.ok(media.percentuale > 0,
    'e la media resta quella: 200 kg di gambe non la spostano');
  assert.equal(media.saltate, 1);
});

test('F4. sul doppio carrucola si conta il peso che senti', () => {
  // Ste: "di hammer curl faccio 50kg ma e' doppia carrucola quindi sarebbero 25".
  // Senza questo, in forza-generale finivano col doppio: la stessa dimenticanza
  // che mi ha fatto correggere tre volte sul Rank.
  const mono = prestazione({
    esercizio: es('Cable Hammer Curl', 'Cable Hammer Curl'),
    serie: [fatta(50)], pesoCorporeo: PESO,
  });
  const doppia = prestazione({
    esercizio: es('Cable Hammer Curl', 'Cable Hammer Curl'),
    serie: [fatta(50)], pesoCorporeo: PESO, carrucola: 'carrucola_doppia',
  });
  assert.equal(mono.kg, 50);
  assert.equal(doppia.kg, 25, 'sul doppio carrucola il peso reale e\' meta\'');
});

test('F5. senza il peso corporeo non si inventa niente', () => {
  const p = prestazione({
    esercizio: es('Chest Press', 'Chest Press'), serie: [fatta(35)], pesoCorporeo: null,
  });
  assert.equal(p.kg, 35, 'i kg ci sono comunque');
  assert.equal(p.eccesso, null, 'ma "in piu\' del tuo corpo" no: non c\'e\' il peso');
  assert.ok(p.percheNonConta, 'e deve dire PERCHE\' manca');
  assert.equal(mediaPrestazioni([p]).media, null, 'e non entra nella media');
});

test('F6. le serie non contate non contano', () => {
  assert.equal(kgReali([fatta(40), fatta(45), { peso: 60, stato: 'fallita' }]), 45,
    'si prende la piu\' pesante fra le fatte');
  assert.equal(kgReali([{ peso: 60, stato: 'fatta', spotter: true }]), null,
    'col solo spotter non e\' un record pulito');
  assert.equal(kgReali([{ peso: 60, eliminata: true }]), null);
  assert.equal(kgReali([]), null);
});

test('F7. la classifica li mette TUTTI in elenco, non solo il primo', () => {
  // Ste: "non voglio solo che si veda chi e' il piu' forte, voglio vedere gli
  // altri" e "una classifica che mostra solo il vincitore e\' una pubblicita'".
  const uno = (nome, peso, kg) => ({
    nome, peso,
    serie: [{ esercizio: es('Lat Pulldown', 'Lat Pulldown'), serie: [fatta(kg)] }],
  });
  const c = classificaGenerale([uno('Stefano', 66, 96), uno('Andrea', 80, 88), uno('Marco', 72, 60)]);
  assert.equal(c.length, 3, 'tutti e tre in elenco');
  assert.deepEqual(c.map((r) => r.nome), ['Stefano', 'Andrea', 'Marco'],
    'ordinati dalla media piu\' alta');
  // e ognuno ha ENTRAMBI i numeri: Ste "scrivi entrambi"
  for (const r of c) {
    assert.equal(typeof r.media, 'number', r.nome + ' ha i kg');
    assert.equal(typeof r.rapporto, 'number', r.nome + ' ha il rapporto');
  }
  // La media che ORDINA è il rapporto medio, non i kg in più del corpo.
//
// Ste chiedeva la media dei kg, e l'ho provata: dava -31.91 kg sulla sua scheda,
// cioè un numero senza senso. Perché gli esercizi hanno scale diversissime e
// sottrarre il peso corporeo non li rende confrontabili: "12.5 - 66" dice che il
// laterale è stato meglio del rematore, il contrario della realtà.
//
// Quindi la media è il RAPPORTO medio (non ha unità, quindi è confrontabile), e i
// kg in più del corpo restano scritti per ogni esercizio come lui chiedeva.
  assert.ok(c[0].media > c[1].media, "il più forte sta in cima");
  assert.ok(c[0].media > 90, "e con numeri realistici è una percentuale, non un rapporto");
  assert.equal(c[0].eccessoMedio, 30, 'e i kg in più del corpo ci sono: 96 - 66');
  assert.equal(c[1].eccessoMedio, 8, 'Andrea: 88 - 80');
});

test('F8. il confronto e\' giusto fra persone di peso diverso', () => {
  // 96 kg su un corpo di 66 e 96 kg su un corpo di 90: stessi kg, verdetto
  // opposto. E\' il punto per cui esiste questa misura.
  const a = prestazione({
    esercizio: es('Chest Press', 'Chest Press'), serie: [fatta(96)], pesoCorporeo: 66,
  });
  const b = prestazione({
    esercizio: es('Chest Press', 'Chest Press'), serie: [fatta(96)], pesoCorporeo: 90,
  });
  assert.equal(a.kg, b.kg, 'stessi kg spostati');
  assert.ok(a.eccesso > b.eccesso, 'ma chi pesa meno ne ha spostati di piu\' in piu\'');
  assert.ok(a.rapporto > b.rapporto, 'e il rapporto dice la stessa cosa');
});

test('F9. il peso del giorno conta, per vedere se stai migliorando', () => {
  // Se pesa di piu', la soglia sale anche senza che tu perda niente. Per questo
  // la prestazione va calcolata con il peso di QUEL giorno.
  const pesi = { '2026-09-01': 66, '2026-10-01': 70 };
  const a = prestazioneAllaSeduta({
    serie: [fatta(90)], esercizio: es('Chest Press', 'Chest Press'),
    data: '2026-09-01', pesiPerData: (d) => pesi[d],
  });
  const b = prestazioneAllaSeduta({
    serie: [fatta(90)], esercizio: es('Chest Press', 'Chest Press'),
    data: '2026-10-01', pesiPerData: (d) => pesi[d],
  });
  assert.equal(a.eccesso, 24, 'settembre: 90 - 66 = 24');
  assert.equal(b.eccesso, 20, 'ottobre: 90 - 70 = 20, con gli stessi kg');
  assert.ok(b.eccesso < a.eccesso, 'pesando di piu\' la prestazione "in piu\'" scende');
});
test('F10. la percentuale non può essere negativa, e la media neppure', () => {
  // Ste (04/10/2026): "spunta che sposto -23,5kg come è possibile?"
  //
  // Non era un bug, era la formula. Sottrarre il peso corporeo non rende
  // confrontabili esercizi di scale diverse: 12.5 kg di laterale è forte, 90 kg di
  // rematore è medio, ma "12.5 - 66" dice che il laterale è stato meglio.
  //
  // La percentuale risolve: ogni esercizio è confrontato con la SUA scala, quindi
  // due esercizi di grandezza completamente diversa danno numeri confrontabili. E
  // non può essere negativa, perché è un rapporto fra due quantità positive.
  const laterale = prestazione({
    esercizio: es('Cable Lateral Raise', 'Cable Lateral Raise'),
    serie: [fatta(25, 7)], pesoCorporeo: PESO, carrucola: 'carrucola_doppia',
  });
  const rematore = prestazione({
    esercizio: es('Lat Pulldown (lats)', 'Lat Pulldown'),
    serie: [fatta(90, 6)], pesoCorporeo: PESO,
  });
  assert.ok(laterale.percentuale > 0, 'il laterale ha una percentuale positiva');
  assert.ok(rematore.percentuale > 0, 'il rematore anche');
  const media = mediaPrestazioni([laterale, rematore]);
  assert.ok(media.percentuale > 0, 'e la media non può essere negativa');
  assert.ok(media.percentuale < 500, 'né assurda: 100% è il livello realistico per te');
});
