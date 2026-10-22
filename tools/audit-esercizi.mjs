// tools/audit-esercizi.mjs -- controlla che tutti gli esercizi siano etichettati bene.
//
// Non lo metto nei test perché non deve fallire: serve a me per vedere il quadro.
// Uso:  node tools/audit-esercizi.mjs

import { ESERCIZI } from '../src/dati-iniziali.js';
import { CONVENZIONI } from '../src/numeri.js';
import { classificaEsercizio } from '../src/esercizi-classificatore.js';
import { valoriPerEsercizio, tettoPerEsercizio } from '../src/rank-v2/valori.js';

const problemi = [];
const segnala = (id, nome, testo) => problemi.push({ id, nome, testo });

const VALIDI = new Set(Object.values(CONVENZIONI));

for (const e of ESERCIZI) {
  // 1. la convenzione esiste
  if (!e.convenzione) segnala(e.id, e.nome, 'non ha convenzione');
  else if (!VALIDI.has(e.convenzione)) segnala(e.id, e.nome, `convenzione sconosciuta: ${e.convenzione}`);

  // 2. i manubri non possono stare su un bilanciere
  if (e.nome.toLowerCase().includes('dumbbell') && e.convenzione === CONVENZIONI.BILANCIERE) {
    segnala(e.id, e.nome, 'manubri ma convenzione bilanciere: dovrebbe essere per_manubrio');
  }

  // 3. la carrucola solo ai cavi
  if (e.carrucola && e.convenzione !== CONVENZIONI.CAVO) {
    segnala(e.id, e.nome, `carrucola su un esercizio che non è a cavo (${e.convenzione})`);
  }

  // 4. ogni cavo deve dire se è mono o doppia
  if (e.convenzione === CONVENZIONI.CAVO && !e.carrucola) {
    segnala(e.id, e.nome, 'è a cavo ma non dice mono o doppia carrucola');
  }

  // 5. ogni macchina deve dire dischi o stack
  const macchina = [CONVENZIONI.MACCHINA, CONVENZIONI.MACCHINA_DISCHI, CONVENZIONI.MACCHINA_STACK];
  if (macchina.includes(e.convenzione) && !e.attrezzatura) {
    segnala(e.id, e.nome, 'è una macchina ma non dice dischi o stack');
  }

  // 6. il classificatore deve riconoscerlo
  const r = classificaEsercizio(e);
  if (!r.movimento) segnala(e.id, e.nome, 'il classificatore non riconosce il movimento');
  if (!r.livello) segnala(e.id, e.nome, 'il classificatore non dice il livello');

  // 7. la scala deve esistere per gli esercizi in kg.
  //
  // trazioni, dip e assistenza non si contano in kg ma in ripetizioni: per quelli
  // non esiste una scala, ed è giusto così. Vanno fuori dal controllo.
  const contaInRipetizioni = e.convenzione === CONVENZIONI.CORPO_LIBERO
    || e.convenzione === CONVENZIONI.ZAVORRI
    || e.convenzione === CONVENZIONI.ASSISTENZA;
  if (!contaInRipetizioni && r.movimento) {
    const v = valoriPerEsercizio(r.movimento, e);
    if (!v) segnala(e.id, e.nome, `nessuna scala per il movimento "${r.movimento}"`);
    else {
      if (!(v.ingressoMultiplo > 0)) segnala(e.id, e.nome, `ingressoMultiplo non valido: ${v.ingressoMultiplo}`);
      const tetto = tettoPerEsercizio(r.livello, r.movimento, e);
      if (!(tetto > 0)) segnala(e.id, e.nome, `tetto non valido: ${tetto}`);
      // l'ingresso non può stare sopra il tetto: sarebbe una scala al contrario
      if (v.ingressoMultiplo > tetto) {
        segnala(e.id, e.nome, `l'ingresso (${v.ingressoMultiplo}) è sopra il tetto (${tetto})`);
      }
    }
  }
}

console.log('ESERCIZI CONTROLLATI: ' + ESERCIZI.length);
console.log('PROBLEMI: ' + problemi.length);
console.log('');
if (problemi.length) {
  for (const p of problemi) {
    console.log('  ' + p.nome);
    console.log('    ' + p.testo);
  }
} else {
  console.log('  tutto coerente');
}