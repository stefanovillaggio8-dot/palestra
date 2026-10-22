import { readFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';

// 1. i trapezi sono tornati nel filtro "schiena"?
const app = readFileSync(B + 'src/app.js', 'utf8');
console.log('--- il filtro generale ---');
const fg = app.match(/const FILTRO_GENERALE = \{[\s\S]*?\n\};/);
console.log(fg ? fg[0] : 'non trovato');
console.log('--- la regola speciale dei trapezi (deve stare vuota) ---');
console.log(app.includes("p.parte === 'dorso_alto' ? 'spalle'") ? 'ANCORA PRESENTE (male)' : 'tolta (bene)');
console.log('--- le etichette per parte ---');
const ep = app.match(/const ETICHETTE_PARTE = \{[\s\S]*?\n\};/);
console.log(ep ? ep[0] : 'non trovato');

// 2. l'iperextensione -> quale parte?
const { parteDiMuscolo } = await import('../src/muscoli-parti.js');
const p = parteDiMuscolo({ nome: 'Hyperextension' });
console.log('--- l\'iperextensione ---');
console.log(JSON.stringify(p, null, 1));

// 3. il gruppo e' disegnato?
const { RITAGLI, GRUPPI } = await import('../src/mappa-muscoli.js');
const gruppo = GRUPPI[p.parte] ? GRUPPI[p.parte].gruppo : null;
console.log('il pezzo', p.parte, '-> gruppo', gruppo, '-> nel disegno:', !!(gruppo && RITAGLI[gruppo]));
