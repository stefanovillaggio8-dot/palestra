// V422: moltiplicatore delle RIPETIZIONI REALI, senza generare 1RM
// ipotetici. Si confrontano i carichi misurati a pari esercizio rispetto
// alla serie da 8 ripetizioni (moltiplicatore 1).
//
// Nuzzo et al., Sports Medicine 2024, doi:10.1007/s40279-023-01937-7:
// 269 studi, 7289 soggetti: a circa 80% 1RM, media ~8.8 reps sulla
// bench press e ~13.1 sulla leg press. E' una differenza di endurance,
// NON un coefficiente di Rank validato. La correzione 8.8/13.1 qui e'
// una scelta prudenziale del modello, trasparente e testabile.
// Per i movimenti senza un riferimento 1RM specifico manteniamo
// l'esponente 0.20 approvato in v420.
// Oltre 12 reps l'evidenza e la variabilita' tecnica non giustificano
// una progressione illimitata: la curva cresce con pendenza attenuata.
export const RIP_RIFERIMENTO_RANK = 8;
export const ESPONENTE_BASE_RANK = 0.20;
export const FATTORE_ENDURANCE_PRESSA = 8.8 / 13.1;
export const ESPONENTE_PRESSA = ESPONENTE_BASE_RANK * FATTORE_ENDURANCE_PRESSA;

const ISOLAMENTI = new Set([
  'bicipiti','bicipiti_panca','tricipiti','tricipiti_alta',
  'petto_isolamento','spalle_isolamento','spalle_posteriori',
  'polso','polpacci','gambe_isolamento','gambe_curl',
  'addome','core',
]);

export function modelloRipetizioniRank(movimento, esercizio = {}, standard = null) {
  const e = esercizio || {};
  // Strict Curl ha soglie di riferimento espresse in 1RM: una singola
  // ripetizione da 70 kg NON e' equivalente a soli 46 kg x 8 (vecchia
  // curva (1/8)^0.20). Per le serie 1-8 rip allineiamo il confronto al
  // medesimo ponte 1RM -> 8 rip utilizzato dalle soglie, senza stimare
  // un nuovo 1RM dell'atleta e senza toccare i Rank degli altri esercizi.
  // E' una modellazione del rapporto tra ripetizioni, non una prova
  // scientifica specifica alla presa interna EZ o un record federale.
  if (e.id === 'ex-strict-curl-ez-wall' &&
      Array.isArray(standard?.soglie1RMPerPeso)) return {
    tipo:'strict_curl_basse_rip', esponente:ESPONENTE_BASE_RANK,
    massimo:15, oltre12:0.35, fonte:'ponte_statistico_1rm_8rip',
    avviso:'Tra 1 e 8 ripetizioni le prestazioni sono confrontate usando lo stesso ponte delle soglie da 1RM. Stima tecnica, non certificazione federale; una singola ripetizione e meno affidabile.',
  };
  const oneArmPreacher = Array.isArray(standard?.soglie1RMPerPeso)
    && /preacher|scott/i.test(String(e.nome || '') + ' ' + String(e.id || ''))
    && (e.id === 'ex-one-arm-preacher-curl' || /one.arm|single.arm/i.test(e.nome || ''));
  if (oneArmPreacher) return {
    tipo:'isolamento_preacher', esponente: ESPONENTE_BASE_RANK,
    massimo:12, oltre12:0, fonte:'brzycki_normalizzato_8rip',
    avviso: 'Per 1-7 ripetizioni: confronto Brzycki normalizzato a 8 rip, coerente con le soglie 1RM della fonte. Oltre 12 ripetizioni non vengono dati altri punti. Non si inventa il massimale dell’atleta.',
  };
  // I cinque standard Strength Level rappresentano 1RM. Anche i proxy CAD
  // e lat sono espressi nelle stesse unita' 1RM del riferimento originario:
  // devono quindi usare la STESSA curva, per non creare sconti artificiali
  // soltanto per avere cambiato la variante nel catalogo.
  // Per 1-7 rip Strength Level usa
  // Brzycki: a parita' di peso, un triplo non deve essere quasi ignorato
  // dalla curva generica (3/8)^0.20. Il rapporto Brzycki(r)/Brzycki(8)
  // confronta serie REALI con le soglie riportate a otto ripetizioni.
  // Non produciamo ne' memorizziamo il massimale ipotetico dell'utente.
  // Restano intatti gli esercizi senza fonte specifica e lo Strict Curl,
  // che ha gia' la sua calibrazione dedicata approvata.
  if (['strengthlevel_esercizio','proxy_cad_non_validato','proxy_lat_presa_non_validato'].includes(standard?.fonte)
      && Array.isArray(standard.soglie1RMPerPeso)) {
    const isolamento = ISOLAMENTI.has(movimento);
    return {
      tipo:'standard_specifico_basse_rip', esponente: ESPONENTE_BASE_RANK,
      massimo: isolamento ? 15 : 20, oltre12:0.35,
      fonte:'brzycki_normalizzato_8rip',
      avviso:'Le serie da 1 a 7 ripetizioni valgono secondo il rapporto Brzycki rispetto a 8 rip: il carico eseguito e reale, il confronto con le soglie 1RM resta una stima dipendente dalla tecnica.',
    };
  }
  const pressaBilateral = movimento === 'gambe_pressa' && e.convenzione !== 'per_gamba';
  if (pressaBilateral) return {
    tipo:'pressa_bilaterale', esponente:ESPONENTE_PRESSA,
    massimo:20, oltre12:0.35, fonte:'meta_regressione_adattata',
    avviso: 'La leg press consente mediamente piu ripetizioni della panca a parita di carico relativo; coefficiente approssimato, non empiricamente validato per la tua macchina.',
  };
  const isolamento = ISOLAMENTI.has(movimento);
  return {
    tipo: isolamento ? 'isolamento_generale' : 'movimento_generale',
    esponente: ESPONENTE_BASE_RANK,
    massimo: isolamento ? 15 : 20,
    oltre12: 0.35,
    fonte:'modello_conservativo',
    avviso:'Dopo 12 ripetizioni il guadagno di punteggio rallenta: il confronto fra serie molto lunghe e molto pesanti e poco preciso.',
  };
}

export function ripetizioniPieneRank(reps, modello = null) {
  const m = modello || modelloRipetizioniRank(null);
  const r = Math.floor(Number(reps));
  if (!Number.isFinite(r) || r < 1) return 0;
  const limite = Number.isFinite(m.massimo) ? Math.min(Math.max(1,m.massimo),40) : 20;
  const rValido = Math.min(r, limite);
  const ex = Number.isFinite(m.esponente) ? m.esponente : ESPONENTE_BASE_RANK;
  if ((m.tipo === 'standard_specifico_basse_rip' || m.tipo === 'isolamento_preacher')
      && rValido <= RIP_RIFERIMENTO_RANK) {
    // Brzycki: 1RM stimato = kg * 36/(37-r). Il rapporto con 8 rip elimina
    // tanto il kg quanto il 36: (37-8)/(37-r). E' soltanto un moltiplicatore
    // per comparare serie osservate, NON un 1RM attribuito alla persona.
    return (37 - RIP_RIFERIMENTO_RANK) / (37 - rValido);
  }
  if (m.tipo === 'strict_curl_basse_rip' && rValido <= RIP_RIFERIMENTO_RANK) {
    return (1 + rValido / 30) / (1 + RIP_RIFERIMENTO_RANK / 30);
  }
  if (rValido <= 12) return Math.pow(rValido / RIP_RIFERIMENTO_RANK, ex);
  const base = Math.pow(12 / RIP_RIFERIMENTO_RANK, ex);
  return base * Math.pow(rValido / 12, ex * (m.oltre12 ?? .35));
}
