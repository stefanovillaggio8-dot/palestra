import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const B = 'C:/Users/stefa/Documents/Default Project/palestra/';
const m = await import(B + 'src/anatomia-vettoriale.js');
let svg = m.ATLANTE_RETRO;

// coloro di rosso i due pezzi dei lombari, cosi' si vede dove sono
svg = svg.replace(/id=\\"erector_spinae_l\\"/g, 'fill=\\"#E53935\\" id=\\"erector_spinae_l\\"');
svg = svg.replace(/id=\\"erector_spinae_r\\"/g, 'fill=\\"#E53935\\" id=\\"erector_spinae_r\\"');
// e in blu i trapezi bassi (il dorso centrale)
svg = svg.replace(/id=\\"trapezius_lower_l\\"/g, 'fill=\\"#1E88E5\\" id=\\"trapezius_lower_l\\"');
svg = svg.replace(/id=\\"trapezius_lower_r\\"/g, 'fill=\\"#1E88E5\\" id=\\"trapezius_lower_r\\"');

const out = process.env.TEMP + '/opencode/lombari.png';
await sharp(Buffer.from(svg)).resize({ width: 420 }).png().toFile(out);
const st = readFileSync(out);
console.log('scritto: ' + out + ' (' + Math.round(st.length / 1024) + ' KB)');
