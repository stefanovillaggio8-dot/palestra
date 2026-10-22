import { readFileSync, writeFileSync } from 'node:fs';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const P = B + 'src/app.js';
let s = readFileSync(P, 'utf8');

// LA FOTO DEL PERSONAGGIO NEL PROFILO -> IL DISEGNO (22/10/2026).
//
// La foto e' un WebP con lo sfondo nero dentro: la testa restava nera. Il
// disegno e' vettoriale, quindi la testa e' trasparente come tutto il resto,
// e cambia da solo con i premi sbloccati (come faceva la foto).
const re = /grafica\.appendChild\(el\('img', \{[\s\S]*?\}\)\);/;
const m = s.match(re);
if (!m) { console.log('NON TROVATO: la foto del personaggio'); process.exit(1); }

const nuovo = `grafica.appendChild(el('div', {
        class: 'personaggio-ritratto personaggio-svg-profilo',
        html: personaggioSvg({ classe: classeId, sbloccati: idsIndossati }),
      }));`;
s = s.replace(m[0], nuovo);
s = s.replace("    grafica.classList.add('con-foto');", "    // (niente 'con-foto': ora il personaggio e' il disegno, non la foto)");
writeFileSync(P, s, 'utf8');
console.log('ok: il profilo mostra il disegno (la testa non e\' piu\' nera)');
