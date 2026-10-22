import { readFileSync } from 'node:fs';
const f = process.env.USERPROFILE + '/Downloads/palestra-backup-2026-10-19.json';
const b = JSON.parse(readFileSync(f, 'utf8'));
const T = b.tabelle || b;
console.log('tabelle: ' + Object.keys(T).join(', '));
const profili = T.profili || [];
for (const p of profili) {
  console.log('profilo: giorni_allenamento=' + JSON.stringify(p.giorni_allenamento)
    + ' | livello=' + p.livello + ' | nome=' + (p.nome || '-'));
}
const sedute = (T.sedute || []).filter((s) => !s.eliminata);
const giorni = [...new Set(sedute.map((s) => s.data))].sort();
console.log('\ngiorni allenati (senza eliminate): ' + giorni.join(', '));
const Nomi = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
console.log('\nultimi 12 giorni, con la settimana:');
for (const g of giorni.slice(-12)) {
  const d = new Date(g + 'T00:00:00');
  console.log('  ' + g + '  ' + Nomi[d.getDay()]);
}
