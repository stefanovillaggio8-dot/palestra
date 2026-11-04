// Spiegazioni del Rank per chi usa l'app, senza formule o termini matematici.
// Usa soltanto i numeri già calcolati dal motore: non assegna LP o nuovi gradi.
import { DIVISIONI } from './rank-config.js';

function n(v) { const x = Number(v); return Number.isFinite(x) ? x : null; }
function numeroIt(v) {
  const x = n(v);
  return x === null ? '—' : String(Math.round(x*10)/10).replace('.', ',');
}

export function presentaRank(record) {
  if (!record || !record.valido) {
    return {titolo:'Non hai ancora un Rank per questo esercizio',
      frasi:['Per ottenere il Rank, registra una serie valida e termina l’allenamento.',
        'I dati degli allenamenti ancora aperti non entrano nella classifica.']};
  }
  const r = record;
  const nome = String(r.esercizio?.nome || 'Questo esercizio');
  const rank = String(r.rank?.nome || r.rankId || 'Da conquistare').toUpperCase();
  const divisione = r.rankId === 'olympian' ? '' : String(r.divisione?.nome || '');
  const titolo = `${nome} · ${rank}${divisione ? ' ' + divisione : ''}`;
  const frasi = [];
  const peso = n(r.serie?.peso), rip = n(r.serie?.ripetizioni);
  if (r.serie && peso !== null && rip !== null) {
    const unita = String(r.profilo?.unita || 'kg');
    frasi.push(`La prestazione che conta: ${numeroIt(peso)} ${unita} per ${numeroIt(rip)} ripetizioni.`);
  } else if (r.testo) {
    frasi.push(`Il Rank viene dalla tua migliore prestazione valida in questo esercizio.`);
  }
  frasi.push('Non contano solo i kg: vengono considerate anche le ripetizioni, il tipo di esercizio e, quando disponibile, il tuo peso corporeo.');
  // Qui esistono 5 standard empirici di 1RM per peso corporeo (Strength Level).
  // Non si dichiara come percentile misurato una coda che e' solo stimata.
  if (r.metodoMassimale === 'epley' && r.movimento === 'bicipiti_panca') {
    const massimale = n(r.massimale);
    if (massimale !== null)
      frasi.push(`Per confrontarti uso un 1RM stimato di ${numeroIt(massimale)} kg (formula di Epley). Non significa che tu abbia realmente sollevato quel peso.`);
    frasi.push('Nel curl Scott con un manubrio uso i cinque riferimenti statistici per peso corporeo: principiante 5%, novizio 20%, intermedio 50%, avanzato 80%, elite 95% (community maschile Strength Level).');
    frasi.push('Diamond corrisponde alla soglia Elite di questa scala. Titan e Olympian sono stime matematiche oltre il 95%, non percentili verificati.');
    frasi.push('Il confronto presuppone ripetizioni controllate, complete e vicine al limite; l’app non può misurare da sola l’allungamento o l’aiuto ricevuto.');
  }
  if (r.rankId === 'olympian' || r.inTop) {
    frasi.push('Sei già nel grado più alto: Olympian non ha divisioni I, II o III.');
  } else if (!r.rank || r.sottoSoglia) {
    frasi.push('Per entrare in Bronze serve una prestazione più alta in questo esercizio.');
  } else {
    const attuale = DIVISIONI.findIndex(d => d.nome === divisione);
    const lp = n(r.lp);
    if (attuale >= 0 && attuale < DIVISIONI.length - 1 && lp !== null) {
      const prossimo = DIVISIONI[attuale+1];
      const mancanti = Math.max(0, Math.ceil(prossimo.min-lp));
      frasi.push(`Ora hai ${numeroIt(lp)} LP. Te ne mancano ${mancanti} per la divisione ${prossimo.nome} dello stesso Rank.`);
    } else {
      const prossimo = r.prossimoObiettivo?.etichetta || r.prossimoRank?.nome;
      frasi.push(prossimo
        ? `Il prossimo grado è ${String(prossimo).toUpperCase()}. Per arrivarci conta migliorare la prestazione, non soltanto allenarti più volte.`
        : 'Continua a registrare prestazioni migliori per salire.');
    }
  }
  if (r.bonusBloccato) frasi.push('Le serie in più aiutano, ma da sole non bastano a farti salire di grado.');
  if (r.pesoCorporeo !== null && r.pesoCorporeo !== undefined)
    frasi.push(`Per questo risultato è stato considerato un peso corporeo di ${numeroIt(r.pesoCorporeo)} kg.`);
  frasi.push('Sono valutazioni stimate, non misure esatte della forza. Le serie assistite non vanno confuse con ripetizioni eseguite da solo.');
  return {titolo,frasi};
}

export function regoleRankChiare() {
  return [
    'Il Rank di un esercizio usa la tua migliore prestazione valida, non semplicemente l’ultima serie.',
    '37 kg alla chest press e 37 kg alle alzate laterali non valgono lo stesso: ogni esercizio ha un confronto diverso.',
    'Più peso o più ripetizioni possono farti salire, ma non c’è una quantità di kg identica per tutti gli esercizi.',
    'I risultati entrano nel Rank quando termini l’allenamento.',
    'Bronze, Silver, Gold, Platinum, Diamond e Titan hanno divisioni I, II e III. Olympian è unico.',
    'Gli LP mostrano quanto sei avanti all’interno del tuo livello. Un solo esercizio non determina tutta la tua forza.',
  ];
}
