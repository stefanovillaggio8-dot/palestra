// Interfaccia Recap: mese e anno, facile da leggere anche su iPhone.
// Non salva nulla e non assegna premi: usa i dati già disponibili nel profilo.
import { el, svuota } from './ui.js';
import { calcolaRecapPalestra, NOMI_MESI_RECAP } from './recap-palestra.js';
import { formattaNumero } from './numeri.js';

const due = v => String(v).padStart(2,'0');
const testoRecord = r => {
  if (r.unita === 'ripetizioni') return r.nome + ' · ' + formattaNumero(r.ripetizioni) + ' ripetizioni';
  const k = (r.unita === 'zavorra' ? '+' : '') + formattaNumero(r.peso) + ' kg';
  return r.nome + ' · ' + k + ' × ' + formattaNumero(r.ripetizioni);
};
function indicatore(nome, valore) {
  return el('div',{class:'recap-indicatore'},[
    el('strong',{testo:String(valore)}),
    el('span',{testo:nome}),
  ]);
}
function testoPeriodico(dati) {
  if (!dati.allenamenti) return 'Qui compariranno gli allenamenti completati in questo periodo.';
  if (dati.record) return 'Hai continuato ad allenarti e hai superato alcuni tuoi risultati precedenti.';
  return 'Hai portato avanti i tuoi allenamenti. La costanza conta anche senza un nuovo record.';
}
export function vistaRecapPalestra({sedute=[],serie=[],esercizi=[],oggi=null}={}) {
  const oggiLocale=oggi || (()=>{const d=new Date();return d.getFullYear()+'-'+due(d.getMonth()+1)+'-'+due(d.getDate());})();
  const [annoCorrente,meseCorrente] = oggiLocale.slice(0,7).split('-').map(Number);
  const meseIniziale = meseCorrente === 1 ? 12 : meseCorrente - 1;
  const annoIniziale = meseCorrente === 1 ? annoCorrente - 1 : annoCorrente;
  const anni = [...new Set([annoCorrente,annoIniziale,...(sedute||[])
    .filter(s=>s && s.stato==='completata' && !s.eliminata && /^\d{4}-\d{2}-\d{2}/.test(String(s.data||'')))
    .map(s=>Number(String(s.data).slice(0,4)))
    .filter(a=>a>=2000 && a<=annoCorrente)])].sort((a,b)=>b-a);
  let vista='mese', anno=annoIniziale, mese=meseIniziale;
  const root=el('section',{class:'recap-pagina'});
  root.appendChild(el('div',{class:'recap-intestazione'},[
    el('span',{class:'recap-eyebrow',testo:'IL TUO ANNO IN PALESTRA'}),
    el('h1',{testo:'Il tuo Recap'}),
    el('p',{class:'nota',testo:'I tuoi allenamenti, raccontati senza una valanga di numeri.'}),
  ]));
  const tabs=el('div',{class:'recap-schede',role:'group','aria-label':'Tipo di riepilogo'});
  const filtri=el('div',{class:'recap-filtri'});
  const risultato=el('div',{class:'recap-contenuto','aria-live':'polite'});
  root.appendChild(tabs);
  root.appendChild(filtri);
  root.appendChild(risultato);

  function mostra() {
    svuota(tabs);
    for (const [id,nome] of [['mese','Mensile'],['anno','Annuale']]) {
      const b=el('button',{type:'button',class:'recap-tab'+(id===vista?' attivo':''),
        'aria-pressed':id===vista?'true':'false',testo:nome,
        onClick:()=>{vista=id; if(vista==='anno' && meseCorrente===1 && anno===annoCorrente) anno=annoCorrente-1; mostra();}});
      tabs.appendChild(b);
    }
    svuota(filtri);
    const filtroAnno=el('label',{class:'recap-etichetta'},[
      el('span',{testo:'Anno'}),
      el('select',{class:'selettore recap-select','aria-label':'Anno del recap'},
        anni.map(y=>el('option',{value:y,testo:String(y),selected:y===anno}))),
    ]);
    filtroAnno.querySelector('select').addEventListener('change',e=>{
      anno=Number(e.target.value);mostra();
    });
    filtri.appendChild(filtroAnno);
    if (vista==='mese') {
      const filtroMese=el('label',{class:'recap-etichetta'},[
        el('span',{testo:'Mese'}),
        el('select',{class:'selettore recap-select','aria-label':'Mese del recap'},
          NOMI_MESI_RECAP.map((name,i)=>el('option',{value:i+1,testo:name,selected:i+1===mese}))),
      ]);
      filtroMese.querySelector('select').addEventListener('change',e=>{mese=Number(e.target.value);mostra();});
      filtri.appendChild(filtroMese);
    }
    svuota(risultato);
    const base={sedute,serie,esercizi,anno,oggi:oggiLocale};
    if(vista==='mese') renderMese(calcolaRecapPalestra({...base,mese}),risultato);
    else renderAnno(calcolaRecapPalestra(base),risultato);
  }
  function kpi(dati,annuale=false) {
    return el('div',{class:'recap-kpi'},[
      indicatore('Allenamenti',dati.allenamenti),
      indicatore('Giorni allenati',dati.giorni),
      indicatore('Record battuti',dati.record),
    ]);
  }
  function renderMese(d,host) {
    const card=el('section',{class:'recap-hero'});
    card.appendChild(el('div',{class:'recap-periodo',testo:d.nome+' '+d.anno}));
    card.appendChild(el('h2',{testo:d.allenamenti?
      'Un mese di impegno.' : 'Nessun allenamento registrato.'}));
    card.appendChild(el('p',{class:'recap-messaggio',testo:testoPeriodico(d)}));
    card.appendChild(kpi(d));
    host.appendChild(card);
    if(!d.allenamenti) return;
    if(d.esercizioPiuAllenato){
      host.appendChild(el('section',{class:'recap-sottocard'},[
        el('span',{class:'recap-label',testo:'ESERCIZIO PIÙ ALLENATO'}),
        el('h3',{testo:d.esercizioPiuAllenato.nome}),
        el('p',{class:'nota',testo:'È comparso in '+d.esercizioPiuAllenato.sedute+
          (d.esercizioPiuAllenato.sedute===1?' allenamento.':' allenamenti.')}),
      ]));
    }
    if(d.recordDettagli.length){
      const box=el('section',{class:'recap-sottocard'});
      box.appendChild(el('h3',{testo:'I tuoi nuovi record'}));
      box.appendChild(el('p',{class:'nota',testo:'Nuovi risultati rispetto agli allenamenti precedenti che sono stati registrati.'}));
      const lista=el('div',{class:'recap-record-lista'});
      for(const r of d.recordDettagli.slice(0,3))lista.appendChild(
        el('div',{class:'recap-record',testo:'🏆 '+testoRecord(r)}));
      box.appendChild(lista);
      if(d.recordDettagli.length>3){
        const extra=el('details',{class:'recap-nascosti'},[
          el('summary',{testo:'Vedi altri '+(d.recordDettagli.length-3)+' record'}),
        ]);
        for(const r of d.recordDettagli.slice(3))extra.appendChild(
          el('p',{class:'nota',testo:testoRecord(r)}));
        box.appendChild(extra);
      }
      host.appendChild(box);
    }
    const more=el('details',{class:'recap-dettagli'},[
      el('summary',{testo:'Altri dati del mese'}),
      el('p',{class:'nota',testo:d.serie+' serie completate · '+d.esercizi+' esercizi diversi'}),
    ]);
    host.appendChild(more);
  }
  function renderAnno(d,host) {
    const hero=el('section',{class:'recap-hero'});
    hero.appendChild(el('div',{class:'recap-periodo',testo:'Anno '+d.anno}));
    hero.appendChild(el('h2',{testo:d.allenamenti?'Il tuo anno in palestra.':'Nessun allenamento registrato.'}));
    hero.appendChild(el('p',{class:'recap-messaggio',testo:testoPeriodico(d)}));
    hero.appendChild(kpi(d,true));
    host.appendChild(hero);
    if(!d.allenamenti)return;
    if(d.meseMigliore)host.appendChild(el('section',{class:'recap-sottocard'},[
      el('span',{class:'recap-label',testo:'IL TUO MESE PIÙ ATTIVO'}),
      el('h3',{testo:d.meseMigliore.nome}),
      el('p',{class:'nota',testo:d.meseMigliore.allenamenti+
        (d.meseMigliore.allenamenti===1?' allenamento completato.':' allenamenti completati.')}),
    ]));
    const grafico=el('section',{class:'recap-grafico'});
    grafico.appendChild(el('h3',{testo:'I tuoi allenamenti, mese per mese'}));
    grafico.appendChild(el('p',{class:'nota',testo:'Ogni barra mostra quanti allenamenti hai concluso.'}));
    const colonne=el('div',{class:'recap-colonne',role:'img',
      'aria-label':d.mesi.map(m=>m.nome+': '+m.allenamenti+' allenamenti').join('; ')});
    const massimo=Math.max(1,...d.mesi.map(m=>m.allenamenti));
    for (const m of d.mesi) {
      const cella=el('div',{class:'recap-colonna'});
      const barra=el('div',{class:'recap-barra'});
      const riempimento=el('div',{class:'recap-riempimento',title:m.nome+': '+m.allenamenti+' allenamenti'});
      riempimento.style.height=(m.allenamenti?Math.max(5,m.allenamenti/massimo*100):0)+'%';
      barra.appendChild(riempimento);
      cella.appendChild(barra);
      cella.appendChild(el('span',{testo:m.nome.slice(0,3)}));
      colonne.appendChild(cella);
    }
    grafico.appendChild(colonne);
    host.appendChild(grafico);
    const elenco=el('details',{class:'recap-dettagli'},[
      el('summary',{testo:'Vedi il totale di ogni mese'}),
    ]);
    for(const m of d.mesi)elenco.appendChild(el('p',{class:'recap-mese-riga',testo:
      m.nome+': '+m.allenamenti+' allenamenti · '+m.record+' record'}));
    host.appendChild(elenco);
  }
  mostra();
  return root;
}
