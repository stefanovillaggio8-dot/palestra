// tools/confronta-curve.mjs -- quanto contano le ripetizioni.
//
// Ste (08/10/2026): "non devono contare troppissimo le ripetizioni eh".
//
// ATTENZIONE ALLA DIREZIONE, che e\' il punto in cui mi sono confuso io.
//
//   DECADIMENTO PIU\' BASSO = le ripetizioni contano DI PIU\'.
//   Con 0,075 (quello che avevo) la 10a ripetizione vale ancora 0,60 della prima,
//   quindi il volume e\' molto schiacciato. Con 0,02 la 10a vale 0,85 della
//   prima: il volume conta quasi tutto, e va PEGGIO.
//
// Quindi se le ripetizioni contano TROPPO il decadimento va ABBASSATO, non
// alzato. Qui sotto provo piu' valori in entrambe le direzioni e guardo:
//   - quanto crescono le ripetizioni pesate da 5 a 12 (quanto vale il volume)
//   - a quante ripetizioni arriva la soglia d'ingresso, che e\' la cosa che
//     puniva Ste: con 8 ripetizioni di riferimento e soglia bassa, chi ne faceva
//     6 finiva sotto il primo livello.

function piene(n, decadimento) {
  const limite = Math.min(Math.max(1, n), 40);
  let totale = 0;
  for (let i = 1; i <= limite; i++) totale += 1 / (1 + decadimento * (i - 1));
  return totale;
}

const RIP = [1, 3, 5, 6, 8, 10, 12, 15, 20];

console.log('RIPETIZIONI PESATE: piu\' il decadimento e\' BASSO, piu\' contano.');
console.log('');
console.log('decadimento'.padEnd(14) + RIP.map((n) => String(n).padStart(6)).join('') + '   crescita 5->12');
console.log('-'.repeat(95));

for (const d of [0.02, 0.04, 0.075, 0.12]) {
  const segno = d === 0.075 ? ' <- attuale' : '';
  const a5 = piene(5, d);
  const a12 = piene(12, d);
  console.log(
    String(d).padEnd(14)
    + RIP.map((n) => piene(n, d).toFixed(2).padStart(6)).join('')
    + '   ' + Math.round(((a12 / a5) - 1) * 100) + '%' + segno,
  );
}

console.log('');
console.log('LA DOMANDA CONCRETA: a che carico sblocchi il primo livello?');
console.log('');
console.log('Se l\'ingresso e\' dichiarato per 8 ripetizioni, il carico che sblocca');
console.log('cambia parecchio a seconda della curva. Con la chest press di Ste');
console.log('(ingresso 29,7 kg per braccio):');
console.log('');
console.log('decadimento | rip che servono a 29,7 kg | kg che servono con 5 rip');
console.log('-'.repeat(70));
for (const d of [0.02, 0.04, 0.075, 0.12]) {
  // quante ripetizioni servono a totalizzare 29,7 kg-equivalenti
  let n = 0;
  let acc = 0;
  while (acc < 29.7 && n < 60) {
    n += 1;
    acc = piene(n, d);
  }
  // oppure: che carico serve con 5 ripetizioni
  const kg5 = 29.7 / piene(5, d);
  console.log(
    String(d).padEnd(12) + '| ' + String(n).padStart(23) + ' | ' + kg5.toFixed(1).padStart(18),
  );
}

console.log('');
consoleIlCommento();

function consoleIlCommento() {
  console.log('LEGGERE QUESTO:');
  console.log('');
  console.log('Con 0,075 (attuale) bastano 5-6 ripetizioni da 29,7 kg a sbloccare.');
  console.log('Con 0,02 servono molte piu\' ripetizioni, o molto piu\' carico.');
  console.log('');
  console.log('Quindi il decadimento ALTO tiene il Rank vicino ai pesi veri e penalizza');
  console.log('il volume: e\' quello che Ste chiede ("non devono contare troppissimo").');
  console.log('Il decadimento BASSO fa vincere chi fa 15 ripetizioni leggere.');
}