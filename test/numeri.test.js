import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analizzaDecimale, formattaNumero, arrotonda2, volumeSerie, differenzaPercentuale,
  differenzaAssoluta, convenzioneMisuraCarico, formattaCronometro, formattaDurata,
  mediaRipetizioni, CONVENZIONI, campoCarico, etichettaUnita,
} from '../src/numeri.js';

test('1. "7,5" e "7.5" diventano entrambi 7.5', () => {
  assert.equal(analizzaDecimale('7,5'), 7.5);
  assert.equal(analizzaDecimale('7.5'), 7.5);
  assert.equal(analizzaDecimale(' 7,5 '), 7.5);
  assert.equal(analizzaDecimale('7,50'), 7.5);
  assert.equal(analizzaDecimale('0.5'), 0.5);
  assert.equal(analizzaDecimale('.5'), 0.5);
});

test('1b. le ripetizioni non vengono mai arrotondate', () => {
  assert.equal(analizzaDecimale('7,5'), 7.5);
  assert.notEqual(analizzaDecimale('7,5'), 8);
  assert.notEqual(analizzaDecimale('0,5'), 1);
  assert.notEqual(analizzaDecimale('7,5'), 7);
  assert.equal(analizzaDecimale('12,25'), 12.25);
});

test('1c. i valori non numerici vengono respinti senza perdere il testo', () => {
  for (const cattivo of ['', '  ', 'abc', '7,5kg', '1,2,3', '--5', 'e', 'NaN', '7..5', null, undefined]) {
    assert.equal(analizzaDecimale(cattivo), null, `doveva essere null: ${JSON.stringify(cattivo)}`);
  }
});

test('2. i numeri si mostrano con la virgola', () => {
  assert.equal(formattaNumero(7.5), '7,5');
  assert.equal(formattaNumero(0.5), '0,5');
  assert.equal(formattaNumero(8), '8');
  assert.equal(formattaNumero(7.5 * 3), '22,5');
  assert.equal(formattaNumero(null), '');
});

test('2b. arrotonda2 non produce artefatti in virgola mobile', () => {
  assert.equal(arrotonda2(0.1 + 0.2), 0.3);
  assert.equal(arrotonda2(1.005), 1.01);
  assert.equal(arrotonda2(2.675), 2.68);
  assert.equal(arrotonda2(null), null);
});

test('3/4. volume: peso x ripetizioni, ma solo dove ha senso', () => {
  const s = { convenzione: CONVENZIONI.PER_MANUBRIO, peso: 45, ripetizioni: 7.5 };
  assert.equal(volumeSerie(s), 337.5);
  assert.equal(volumeSerie({ ...s, ripetizioni: 7 }), 315);
  const assistito = { convenzione: CONVENZIONI.ASSISTENZA, peso: null, peso_assistenza: 15, ripetizioni: 8 };
  assert.equal(volumeSerie(assistito), null, 'con assistenza il volume non si calcola');
  const senza = { convenzione: CONVENZIONI.MACCHINA, peso: null, ripetizioni: 8 };
  assert.equal(volumeSerie(senza), null);
  assert.equal(volumeSerie({ convenzione: CONVENZIONI.MACCHINA, peso: 0, ripetizioni: 8 }), 0);
});

test('24. con valore iniziale zero non si produce alcuna percentuale', () => {
  assert.equal(differenzaPercentuale(0, 20), null);
  assert.equal(differenzaPercentuale(0, 0), null);
  assert.equal(differenzaPercentuale(null, 20), null);
  assert.equal(differenzaPercentuale(20, 25), 25);
  assert.equal(differenzaPercentuale(20, 15), -25);
  assert.equal(differenzaAssoluta(20, 15), -5);
  assert.equal(differenzaAssoluta(0, 15), 15);
});

test('convenzioni: assistenza e corpo libero non misurano carico', () => {
  assert.equal(convenzioneMisuraCarico(CONVENZIONI.PER_MANUBRIO), true);
  assert.equal(convenzioneMisuraCarico(CONVENZIONI.MACCHINA), true);
  assert.equal(convenzioneMisuraCarico(CONVENZIONI.ASSISTENZA), false);
  assert.equal(convenzioneMisuraCarico(CONVENZIONI.CORPO_LIBERO), false);
  assert.equal(campoCarico(CONVENZIONI.PER_MANUBRIO), 'peso');
  assert.equal(campoCarico(CONVENZIONI.ASSISTENZA), 'peso_assistenza');
  assert.equal(etichettaUnita(CONVENZIONI.ASSISTENZA), 'ASSISTENZA (kg)');
});

test('il cronometro e la durata si formattano bene', () => {
  assert.equal(formattaCronometro(0), '00:00');
  assert.equal(formattaCronometro(65), '01:05');
  assert.equal(formattaCronometro(3725), '1:02:05');
  assert.equal(formattaDurata(3725), '1h 02m 05s');
  assert.equal(formattaDurata(65), '1m 05s');
  assert.equal(formattaDurata(9), '9s');
  assert.equal(formattaDurata(null), '');
});

test('media ripetizioni: 7,5 e 6 fanno 6,75 (niente arrotondo a intero)', () => {
  assert.equal(mediaRipetizioni([{ ripetizioni: 7.5 }, { ripetizioni: 6 }]), 6.75);
  assert.equal(mediaRipetizioni([{ ripetizioni: 7.5 }, { ripetizioni: 6.5 }]), 7);
  assert.equal(mediaRipetizioni([{ ripetizioni: null }, { ripetizioni: 8 }]), 8);
  assert.equal(mediaRipetizioni([]), null);
});
