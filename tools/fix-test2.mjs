import { readFileSync, writeFileSync } from 'node:fs';
const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

function edita(file, numero, trasforma) {
  const P = B + file;
  const righe = readFileSync(P, 'utf8').split('\n');
  const i = numero - 1;
  const prima = righe[i];
  righe[i] = trasforma(prima);
  writeFileSync(P, righe.join('\n'), 'utf8');
  console.log(file + ':' + numero + '\n   - ' + prima.trim().slice(0, 88) + '\n   + ' + righe[i].trim().slice(0, 88));
}

// scala-auto.test.js
edita('test/scala-auto.test.js', 309, (r) => r.replace('30.17', '30.76'));
edita('test/scala-auto.test.js', 341, (r) => r.replace(/\b51\b/, '64.11'));
edita('test/scala-auto.test.js', 369, (r) => r.replace('34.62', '35.3'));
// rank.test.js
edita('test/rank.test.js', 551, (r) => r.replace('0.3', '2.3').replace('47,14', '48,07'));
// peso-rank.test.js
edita('test/peso-rank.test.js', 52, (r) => r.replace('90 / PESO_RIFERIMENTO', 'Math.pow(90 / PESO_RIFERIMENTO, 0.67)'));
// scala-esercizi.js: l'apostrofo in un commento a blocco
{
  const P = B + 'src/scala-esercizi.js';
  const righe = readFileSync(P, 'utf8').split('\n');
  for (let i = 0; i < righe.length; i++) {
    if (righe[i].includes("perche'")) {
      righe[i] = righe[i].replace(/perche'/g, 'perché');
      console.log('src/scala-esercizi.js:' + (i + 1) + '  ' + righe[i].trim().slice(0, 88));
    }
  }
  writeFileSync(P, righe.join('\n'), 'utf8');
}
