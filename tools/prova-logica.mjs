// prova-logica.mjs -- la logica verde/rosso del calendario, SENZA l'app.
// Chiamo direttamente le funzioni vere di streak.js e ricreo la stessa scelta di
// classi che fa bloccoCalendario, per vedere se il verde esce.
import { giorniAllenati, calcolaStreak } from '../src/streak.js';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const ieri = new Date(); ieri.setDate(ieri.getDate() - 1);
const treGiorniFa = new Date(); treGiorniFa.setDate(treGiorniFa.getDate() - 3);

const sedute = [
  { data: iso(ieri), stato: 'completata' },
  { data: iso(treGiorniFa), stato: 'in_corso' },
];
const st = calcolaStreak(sedute, iso(new Date()), { giorni_allenamento: [2, 3, 5, 6] });
console.log('giorniAllenati:', st.giorniAllenati);
console.log('record:', st.record, ' Streak:', st.streak);
console.log('');
console.log('Il giorno di ieri deve essere in giorniAllenati:', st.giorniAllenati.includes(iso(ieri)));
console.log('Il giorno di tre giorni fa NON deve esserci (era in_corso):', !st.giorniAllenati.includes(iso(treGiorniFa)));
console.log('');
console.log('Quindi ieri nel calendario = VERDE, tre giorni fa = ROSSO se era mart/mer/ven/sab');
const g = new Set(st.giorniAllenati);
console.log('  ieri e\' verde:', g.has(iso(ieri)));
void giorniAllenati;