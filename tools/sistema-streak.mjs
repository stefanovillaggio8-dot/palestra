// SISTEMA LA STREAK: il giorno che manca.
//
// Ste (22/10/2026): "modifica la mia streak a 9, quindi fai in modo che il
// giorno 20 in realta non sono mancato".
//
// COME FUNZIONA LA STREAK (src/streak.js): conta i GIORNI PREVISTI (quelli che
// Ste ha scelto nel profilo) in cui c’è una seduta. Se un giorno previsto
// non ha sedute, la streak si rompe.
//
// I dati stanno in tre posti: il telefono (IndexedDB), la copia che fa il
// backup e il cloud (Supabase, se il collegamento e' attivo). Questo script
// lavora sul file di backup, che e' l'unico posto dove posso leggere e
// scrivere da qui.
//
// USO:  node tools/sistema-streak.mjs "C:/Users/stefa/Downloads/palestra-backup-2026-10-22.json"
//
// COSA FA:
//   1. legge le sedute e i giorni previsti;
//   2. dice quali giorni previsti NON hanno una sedute (sono quelli che
//      spezzano la streak);
//   3. se un giorno mancante ha una seduta marcata come "eliminata", la
//      riporta viva (eliminata = false): cosi' il giorno conta;
//   4. scrive il backup corretto con un nome nuovo e ti dice cosa ha fatto.

import { readFileSync, writeFileSync } from 'node:fs';

const percorso = process.argv[2];
if (!percorso) { console.log('uso: node tools/sistema-streak.mjs percorso-del-backup.json'); process.exit(1); }

const b = JSON.parse(readFileSync(percorso, 'utf8'));
const T = b.tabelle || b;
const sedute = T.sedute || [];
const profili = T.profili || [];

// I GIORNI PREVISTI: dal profilo. Se non c’è nessun profilo con i giorni,
// non si puo’ sapere quali sono, e allora non si tocca niente.
let previsti = null;
for (const p of profili) {
  const g = p.giorni_allenamento;
  if (Array.isArray(g) && g.length) { previsti = g.map(Number); break; }
}
console.log('giorni previsti dal profilo: ' + (previsti ? JSON.stringify(previsti) : 'NON LI TROVO'));
if (!previsti) {
  console.log('\nSenza i giorni previsti non si puo’ dire quali giorni contano.');
  console.log('Mandami il backup e li guardo: se il profilo li ha, si vede.');
  process.exit(0);
}

const NOME = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const dataDi = (d) => {
  const x = new Date(d + 'T00:00:00');
  return NOME[x.getDay()];
};

const vive = sedute.filter((s) => !s.eliminata && s.stato === 'completata');
const perGiorno = new Map();
for (const s of vive) {
  if (!perGiorno.has(s.data)) perGiorno.set(s.data, []);
  perGiorno.get(s.data).push(s);
}
const conEliminata = new Map();
for (const s of sedute) {
  if (s.eliminata) {
    if (!conEliminata.has(s.data)) conEliminata.set(s.data, []);
    conEliminata.get(s.data).push(s);
  }
}

// GLI ULTIMI 40 GIORNI, e per ognuno: e' previsto? c’è una seduta viva?
const giorni = [];
const oggi = new Date();
for (let i = 40; i >= 0; i--) {
  const d = new Date(oggi.getTime() - i * 86400000);
  const iso = d.toISOString().slice(0, 10);
  const prev = previsti.includes(d.getDay());
  giorni.push({ iso, prev, vive: perGiorno.get(iso) || [], morte: conEliminata.get(iso) || [] });
}

console.log('\ngiorno   prev?  sedute  note');
for (const g of giorni.slice(-16)) {
  if (!g.prev && !g.vive.length && !g.morte.length) continue;
  const note = g.morte.length ? '(ha ' + g.morte.length + ' sedute eliminate)' : '';
  console.log(g.iso + ' ' + dataDi(g.iso) + '  ' + (g.prev ? 'si ' : 'no ') + '   '
    + g.vive.length + '      ' + note);
}

// LA STREAK: i giorni previsti, a ritroso, fino a trovarne uno vuoto.
let streak = 0;
for (let i = giorni.length - 1; i >= 0; i--) {
  const g = giorni[i];
  if (!g.prev) continue;
  if (g.vive.length) { streak++; continue; }
  break;
}
console.log('\nla streak adesso (dal backup): ' + streak);

// I GIORNI PREVISTI VUOTI: sono quelli che la spengono. Se hanno una seduta
// eliminata, la si puo’ riportare viva.
const vuoti = giorni.filter((g) => g.prev && !g.vive.length && g.morte.length);
if (!vuoti.length) {
  console.log('\nnessun giorno previsto vuoto con sedute eliminate: non c\'e\' niente da riaccendere.');
  console.log('Se un giorno manca proprio (nessuna seduta, ne\' viva ne\' eliminata),');
  console.log('la seduta va aggiunta dall\'app: non si può inventare cosa hai fatto.');
} else {
  let cambiate = 0;
  for (const g of vuoti) {
    for (const s of g.morte) { s.eliminata = false; cambiate++; }
    console.log('riaccesa la seduta del ' + g.iso + ' (' + dataDi(g.iso) + ')');
  }
  const fuori = percorso.replace(/\.json$/, '') + '-corretto.json';
  writeFileSync(fuori, JSON.stringify(b, null, 2), 'utf8');
  console.log('\nriaccese ' + cambiate + ' sedute. Il backup corretto e\' qui:');
  console.log(fuori);
  console.log('Importalo dall\'app (Profilo -> Backup -> importa) e la streak riparte.');
}
