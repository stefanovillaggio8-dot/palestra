import { parteDiMuscolo } from '../src/muscoli-parti.js';

const nomi = [
  'Barbell Curl', 'Curls', 'Dumbbell Curl', 'EZ Bar Curl', 'Cable Curl',
  'Curl con manubri', 'Curl manubri seduto', 'Curl al cavo', 'Panca Scott',
  'Lat Machine', 'Lat Pull Down', 'Face Pull', 'Trazioni assistite',
  'Push Up', 'Push-up', 'Squat', 'Leg Press', 'Alzate laterali', 'Shoulder Press',
  'Spinte in alto', 'Calf Raise', 'Rematore manubri', 'Trazioni presa larga',
  'Crunch', 'Plank', 'Russian Twist', 'Mountain Climber', 'Cardio', 'Corda',
  'Panca', 'Banch Press', 'Military press', 'Front Raise', 'Rope Climb',
  'Burpee', 'Bici', 'Nuoto', 'Sciare', 'Camminare', 'Box Jump', 'Sled Push',
  'Landmine press', 'Pullover manubri', 'Straight arm pulldown', 'Hanging leg raise',
];

let nonRiconosciuti = 0;
for (const nome of nomi) {
  const p = parteDiMuscolo({ nome });
  if (!p.trovata) { nonRiconosciuti++; console.log('?? ' + nome.padEnd(28) + ' -> NON RICONOSCIUTO'); }
  else console.log('   ' + nome.padEnd(28) + ' -> ' + p.nome);
}
console.log('');
console.log('NON RICONOSCIUTI: ' + nonRiconosciuti + ' su ' + nomi.length);
