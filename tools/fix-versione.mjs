import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const V = '249';

// 1. index.html: la versione che la pagina dichiara + i numeri dei fogli di stile
{
  const P = B + 'index.html';
  let s = readFileSync(P, 'utf8');
  const prima = s;
  s = s.replace(/window\.PALESTRA_VERSIONE\s*=\s*'\d+'/, "window.PALESTRA_VERSIONE = '" + V + "'");
  s = s.replace(/\?v=24\d/g, '?v=' + V);
  writeFileSync(P, s, 'utf8');
  console.log('index.html: ' + (s !== prima ? 'versione portata a ' + V : 'NON CAMBIATO'));
}

// 2. sw.js: il nome della cache + i numeri dei fogli di stile
{
  const P = B + 'sw.js';
  let s = readFileSync(P, 'utf8');
  const prima = s;
  s = s.replace(/palestra-v\d+/g, 'palestra-v' + V);
  s = s.replace(/\?v=24\d/g, '?v=' + V);
  writeFileSync(P, s, 'utf8');
  console.log('sw.js: ' + (s !== prima ? 'versione portata a ' + V : 'NON CAMBIATO'));
}

// 3. il BLOCCO ANTI-LOOP: se ho gia' provato a prendere questa versione e la
//    pagina e' ancora quella vecchia, non insisto (altrimenti si ricarica all'infinito)
{
  const P = B + 'src/update-via-sw.js';
  let s = readFileSync(P, 'utf8');
  const VECCHIO = `  const remota = versioneOnline(testo);
  const locale = Number(versioneLocale());
  if (!remota || remota <= locale) return null;
  return { remota, locale };`;
  const NUOVO = `  const remota = versioneOnline(testo);
  const locale = Number(versioneLocale());
  if (!remota || remota <= locale) return null;

  // IL BLOCCO ANTI-LOOP (22/10/2026).
  //
  // Ste: "appena apro l'app in basso spunta c'e' la versione 248, ti aggiorno e
  // mi si aggiorna all'infinito".
  //
  // Il motivo: la pagina dichiarava una versione vecchia (247) mentre il sw.js
  // online diceva gia' 248. Ogni volta che la pagina partiva vedeva "c'e' una
  // versione nuova", ricaricava, e al ricaricamento rivedeva la stessa cosa:
  // un ciclo che non finiva piu'.
  //
  // Qui si segna in sessionStorage la versione che si e' gia' provata a prendere.
  // Se e' la stessa e la pagina e' ANCORA quella vecchia, non si insiste: la
  // pagina non si ricarica in giro. Con una versione nuova vera, invece, la
  // pagina si aggiorna come prima e il segno si cancella da solo (la pagina
  // nuova dichiara la versione nuova, quindi il confronto non arriva piu' qui).
  try {
    const giaProvata = Number(sessionStorage.getItem('palestra:versione-provata') || 0);
    if (giaProvata === remota) return null;
    sessionStorage.setItem('palestra:versione-provata', String(remota));
  } catch { /* pazienza: se sessionStorage non c'e' si prosegue come prima */ }

  return { remota, locale };`;
  if (s.includes(VECCHIO)) {
    s = s.replace(VECCHIO, NUOVO);
    writeFileSync(P, s, 'utf8');
    console.log('update-via-sw.js: il blocco anti-loop c\'e\'');
  } else {
    console.log('update-via-sw.js: NON TROVATO il punto da cambiare');
  }
}
