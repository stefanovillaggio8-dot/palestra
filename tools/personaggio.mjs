/**
 * IL PERSONAGGIO, che si aggiosta da solo.
 *
 * Ste (09/10/2026): "fai che quando scelgo guerriero ecc... deve aggiornarsi un
 * personaggio che metti dove gli vengono messe cose tipo l'armatura ecc... che si
 * aggiorna automaticamente".
 *
 * La richiesta ha tre parti e tutte e tre hanno una regola dentro:
 *
 *  - si aggiorna da SOLO: nessun bottone "salva", nessuna pagina da ricaricare. Il
 *    personaggio ricalcola tutto dai dati ogni volta che la schermata si disegna,
 *    quindi non può mai essere sbagliato: è quello che hai fatto ieri, non quello che
 *    avevi quando hai premuto l'ultimo bottone.
 *
 *  - le ARMATURE si mettono da sole quando le sblocchi. Non si sceglie: si
 *    sbloccano. E non si tolgono: la sequenza più lunga che hai fatto resta nel
 *    record, quindi saltare una settimana non ti toglie l'armatura (vedi streak.js).
 *
 *  - l'aspetto cambia con la classe: ogni Guerriero, Assassino e Berserker ha un
 *    aspetto proprio, e le armature che hai addosso si vedono sul personaggio. Così
 *    guardi la schermata e capisci a colpo d'occhio a che punto sei.
 *
 * Il riquadro delle armature resta SOTTO, con la lista di tutte e sei: il personaggio
 * è la foto, la lista è la spiegazione. Il personaggio serve a sentirti come un
 * personaggio, la lista serve a sapere cosa ti manca.
 */
function bloccoPersonaggio(profilo, st) {
  const rpg = calcolaAvatar(profilo.classe_rpg, serieMie(), seduteMie(), esercizioPerId, {
    profilo,
  });

  const box = el('section', { class: 'blocco' });
  box.appendChild(el('h2', { testo: 'Il tuo personaggio' }));

  // IL PERSONAGGIO. Un riquadro che cambia aspetto, non una foto: cambia il colore
  // con la classe, e le armature sbloccate si vedono addosso.
  const scena = el('div', { class: 'personaggio-scena' });
  const classeId = rpg.classe ? rpg.classe.id : 'nessuna';
  const indosano = rpg.premi.filter((p) => p.sbloccato);
  scena.appendChild(el('div', {
    class: 'personaggio personaggio-' + classeId,
    aria: { label: `Personaggio ${rpg.classe ? rpg.classe.nome : 'senza classe'}, livello ${rpg.livello}, ${indosano.length} armature su ${rpg.premi.length}` },
  }, [
    el('div', { class: 'personaggio-arma persona-arma-alta', testo: indosano[indosano.length - 1] ? indosano[indosano.length - 1].icona : '' }),
    el('div', { class: 'personaggio-testa', testo: rpg.classe ? rpg.classe.icona : '❔' }),
    el('div', { class: 'personaggio-arma persona-arma-bassa', testo: indosano[indosano.length - 2] ? indosano[indosano.length - 2].icona : '' }),
  ]));
  scena.appendChild(el('div', { class: 'personaggio-dati' }, [
    el('strong', { testo: (rpg.classe ? rpg.classe.nome : 'Scegli una classe') }),
    el('span', { class: 'nota', testo: `Livello ${rpg.livello} · ${indosano.length} di ${rpg.premi.length} armature` }),
  ]));
  box.appendChild(scena);

  // IL PULSANTE CHE SPIEGA. Ste: "metti pure un pulsante che ti spiega come funziona
  // questo rpg". Non un help che ti manda a un altro schermo: un riquadro che si
  // apre qui, sotto il personaggio, e spiega le quattro cose che servono: cosa sono
  // le statistiche, cosa fa la classe, come si sbloccano le armature, e cosa NON
  // conta (che è la parte che ti evita di giocare al numero invece che allenarti).
  box.appendChild(bottone('Come funziona questo RPG?', {
    onClick: () => {
      const spiegazione = spiegazioneRpg();
      if (spiegazione.parentNode) spiegazione.parentNode.removeChild(spiegazione);
      else box.insertBefore(spiegazione, box.querySelector('.riga-pulsanti') || null);
    },
    classe: 'fantasma',
  }));
  return box;
}

/** Il riquadro di spiegazione dell'RPG. */
function spiegazioneRpg() {
  return el('div', { class: 'spiegazione rpg-spiegazione' }, [
    el('p', { testo: 'Le tre statistiche vengono dagli allenamenti veri, non da un numero che scrivi tu.' }),
    el('ul', {}, [
      el('li', {}, [el('strong', { testo: 'Forza' }), el('span', { testo: ': kg spostati sui movimenti grossi (panche, spinste, tirate, gambe pesanti). Ogni 500 kg sono un punto.' })]),
      el('li', {}, [el('strong', { testo: 'Agilita' }), el('span', { testo: ': minuti di cardio (tapis, corsa, corda). Ogni 5 minuti sono un punto.' })]),
      el('li', {}, [el('strong', { testo: 'Stamina' }), el('span', { testo: ': minuti di cardio e giorni in cui ti alleni. Serve a chi non fa solo forza.' })]),
    ]),
    el('p', { testo: 'La classe che sceggi dà il +20% a UNA statistica sola. Non conta per le armature: quelle si sbloccano coi numeri veri, quindi cambiando classe non ti perdi niente.' }),
    el('p', { testo: 'Le armature si sbloccano con i giorni di fila. Ti restono per sempre: se salti una settimana non le perdi, perche\' si sbloccano con la sequenza piu\' lunga che hai mai fatto, non con quella di adesso.' }),
    el('p', {}, [el('strong', { testo: 'Cosa NON conta: ' }), el('span', { testo: 'il livello non dipende da quanto sei forte, ma da quanti kg hai spostato in tutto. Il Rank (quello con i nomi e gli LP) e\' quello che misura quanto sei forte. L\'RPG e\' un gioco sopra, e serve per divertirti, non per saper quanto stai.' })]),
  ]);
}