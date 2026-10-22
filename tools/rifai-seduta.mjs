// RICREA LA SEDUTA DEL GIORNO CHE MANCA.
//
// Ste (22/10/2026): "modifica la mia streak a 9, quindi fai in modo che il
// giorno 20 in realta non sono mancato".
//
// I giorni che allena sono mar, mer, ven, sab (dal profilo: [2,3,5,6]) e i
// giorni allenati sono: 7, 9, 10, 13, 14, 16, 17, 21. IL 20 (martedi') non c'e'.
// Il 20 e' l'unico buco, e per questo la streak era 1 invece di 9.
//
// Con la seduta del 20 la streak diventa: 21, 20, 17, 16, 14, 13, 10, 9, 7 = 9.
//
// La seduta viene copiata dal 21 (stesso programma, quindi stessi esercizi)
// e cambiata solo la data. Le serie copiate sono quelle del programma di quel
// giorno.
//
// USO:  node tools/rifai-seduta.mjs percorso-del-backup.json 2026-10-20

import { readFileSync, writeFileSync } from 'node:fs';

const percorso = process.argv[2];
const giorno = process.argv[3];
if (!percorso || !giorno) { console.log('uso: node tools/rifai-seduta.mjs backup.json 2026-10-20'); process.exit(1); }

const b = JSON.parse(readFileSync(percorso, 'utf8'));
const T = b.tabelle || b;
const sedute = T.sedute || [];
const serie = T.serie || [];

// LE SEDUTE VICINE: la piu' vicina dopo il giorno che mancano (per il programma)
const vicina = sedute
  .filter((s) => !s.eliminata && s.stato === 'completata' && String(s.data) > giorno)
  .sort((a, c) => String(a.data).localeCompare(String(c.data)))[0];
if (!vicina) { console.log('non trovo nessuna seduta dopo il ' + giorno); process.exit(1); }

console.log('copio la seduta del ' + vicina.data + ' (' + (vicina.nome_giorno || '-') + ')');

// l'id nuovo: univocissimo
const nuovoId = 'sed-' + giorno + '-' + Math.random().toString(36).slice(2, 10);

const nuova = {
  ...vicina,
  id: nuovoId,
  data: giorno,
  ora_inizio: giorno + 'T18:30:00.000Z',
  ora_fine: giorno + 'T19:20:00.000Z',
  eliminata: false,
  stato: 'completata',
  nome_giorno: vicina.nome_giorno,
  note: '',
};
sedute.push(nuova);

// LE SERIE: stesse esercizi, stesse righe, ma della seduta nuova
const righe = serie.filter((x) => x.seduta_id === vicina.id);
for (const r of righe) serie.push({ ...r, id: r.id + '-' + nuovoId.slice(-6), seduta_id: nuovoId });
console.log('copiate ' + righe.length + ' serie');

// la streak: quanti giorni previsti, a ritroso, hanno una seduta viva
const profili = T.profili || [];
let previsti = null;
for (const p of profili) {
  if (Array.isArray(p.giorni_allenamento) && p.giorni_allenamento.length) { previsti = p.giorni_allenamento.map(Number); break; }
}
if (previsti) {
  const vivi = new Set(sedute.filter((s) => !s.eliminata && s.stato === 'completata').map((s) => String(s.data).slice(0, 10)));
  let streak = 0;
  const d = new Date(giorno + 'T12:00:00');
  const isoLocale = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  for (let i = 0; i < 60; i++) {
    const x = new Date(d.getTime() - i * 86400000);
    const iso = isoLocale(x);
    if (!previsti.includes(x.getDay())) continue;
    if (vivi.has(iso)) { streak++; continue; }
    break;
  }
  console.log('la streak da qui in avanti sarebbe: ' + streak);
}

const fuori = percorso.replace(/\.json$/, '') + '-corretto.json';
writeFileSync(fuori, JSON.stringify(b, null, 2), 'utf8');
console.log('\nbackup corretto: ' + fuori);
console.log('Importalo dall\'app (Profilo -> Backup -> importa): la streak riparte a 9.');
