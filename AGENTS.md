## 22/11/2026 — v545, collage fotografico senza taglio dei cinque effetti
- Fotografia guida: img/effetti/reference-approvata-v537.png: la scena
  reale non si rigenera né si attenua per rimuovere il cavaliere fittizio.
- Il nuovo asset già generato img/effetti/reference-scene-v545.webp contiene
  scene 461×440 senza filtri che cancellano le spirali e con pavimento intero.
  Lo sprite resta a 3×2, nelle posizioni Ambra/Ombra/Fulmine/Nebulosa/Astrale.
- La fotografia si allarga in preview a 136% della larghezza del ritratto,
  con aspect ratio 461/440 e nessuno stretching della scena originale.
  Il protagonista originale (faccia, armi, armature, streak) resta sopra.
- Il PNG Atelier usa identico asset, con canvas 1500×1500 e scena estesa,
  non tagliata ai bordi. Per offline esiste fallback v543; PWA cache v545.
- Resta necessaria prova manuale visiva iPhone per certificare la somiglianza.

## 22/11/2026 — v544: correzione priorità CSS dei cinque effetti
- Causa: background-position:center center!important del fondale comune
  prevaleva sui selettori per ciascuna cella atlas 3x2. Ambra mostrava
  elementi viola di altri effetti, con pavimento e sfondo incoerenti.
- Rimossa la priorità errata nel solo CSS; ora si applicano le posizioni
  esistenti per Ambra, Ombra, Fulmine, Nebulosa, Astrale. Reference v543,
  foto originali, volti/armature, geometrie e PNG non alterati.
- PWA/CSS cache v544 e nuovo test anti-regressione. La prova visiva su iPhone
  resta necessaria per certificare la resa reale.

## v537 — Riferimento grafico definitivo approvato il 22/11/2026

- FONTE IMMUTATA: `img/effetti/reference-approvata-v537.png` è la
  tavola approvata dall'utente; non sostituire o rigenerare la fonte.
- Lo sprite `img/effetti/effetti-reference-v537.webp` è un estratto
  pixel-conservativo dei 5 effetti della stessa tavola: Ambra, Fumo
  d'ombra, Fulmine, Nebulosa, Astrale; le base rispettano i colori distinti.
  L'alpha elimina il modello fittizio del collage, per non sovrapporlo
  ai veri personaggi dell'app.
- Sono vietati nuovi volti/corpi/armi/caschi/sfondi; stesso ritratto
  originale per tutti gli effetti, classi, stadi e armature.
- Il livello deve sembrare dietro al soggetto; il ritratto resta
  integralmente visibile. Il ritaglio centrale è nel solo ALPHA
  degli effetti, non nella foto e non altera i loro pixel colorati.
- Negli export Atelier usare gli stessi cinque frame e la stessa
  geometria della preview; nessuna base per 'Nessun effetto'.
- Non chiamare "identico al pixel" un effetto abbinato a un avatar
  differente da quello del collage: va controllato visivamente.

## 22/11/2026 — v536, effetti autonomi SENZA sagoma/personaggio incluso

- Cinque effetti da immagini RGBA senza personaggi: Ambra, Ombra, Fulmine,
  Nebulosa, Astrale. Atlas WebP 3x2 da 1440x1200, alpha reale, centratura
  morbida e non silhouette ritagliata. Il personaggio originalissimo rimane
  esattamente quello del suo WebP, comprese faccia, caschi, armi, corporatura.
- Effetti molto piu' larghi del ritratto, con overflow visibile, nessun cambio
  di zoom o sfondo. PNG Atelier con margini estesi solo per effetti acquistabili:
  non troncare spirali, fulmini, fumo o sigilli laterali.
- Tutte e tre le classi, sei armature, tutte le progressioni, Shop, Profilo,
  Atelier, PNG e offline. NON incorporare personaggi negli effetti o sostituire
  mai le foto delle armature. Non intaccare prezzi, account, streak o inventario.

## 21/11/2026 — v533: NON reinterpretare più i cinque effetti approvati
- **Unico riferimento visivo approvato:** l'ULTIMA tavola ricevuta,
  con Scintille d'ambra (fiammate arancio), Fumo d'ombra (volute viola),
  Scarica viola (lampi pieni ramificati), Nebulosa cosmica (galassia
  blu/viola), Astrale mitico (sigillo runico brillante ai piedi e
  archi violacei). NIENTE filamenti stilizzati v531 o texture v532 ridotte.
- L'atlas `img/effetti/effetti-reference-v533.webp` deriva ESATTAMENTE
  dall'ultima immagine approvata, in alta qualità RGBA 1152×638 (384×319
  per ogni effetto); contiene solo luce alpha e azzera/attenua la regione
  del soggetto. Non disegnare mai foto/corpo/volto/copricapo nell'effetto.
- Per Assassino/Guerriero/Berserker, tutti gli stadi, tutte le sei armature
  e gli oggetti combinati: mantenere le fotografie ORIGINALI e l'asset
  degli EFFETTI su un livello `screen`. Guerriero e Berserker devono
  mantenere il proprio elmo, l'Assassino il proprio volto, armi e anatomia.
  Stesso zoom e fondale preesistente, senza pannelli di fantasia.
- Shop, profilo, Atelier ed export PNG usano TUTTI l'atlas v533; PWA cache
  v533 lo precarica. I premi, Aura divina, Corona, streak e dati salvati
  rimangono immutati. Non affermare che screenshot reali siano stati
  verificati su iPhone se non c'è una verifica manuale.
- Preferire verificare il risultato con foto originali di tutte le classi,
  non con personaggi rigenerati dalla tavola illustrativa.

## 21/11/2026 — v532, riferimento grafico reale obbligatorio

- Lo screenshot approvato dall'utente il 21/11/2026 e' la SOURCE OF TRUTH,
  non un generico bozzetto di particelle. Gli effetti v531 erano sbagliati:
  risultavano fili sottili e portali a colonne, non come la foto approvata.
- I 5 effetti sono stati ISOLATI dalla foto di riferimento in un atlante WebP,
  senza personaggio, armi, volto o armature. Il layer e' nero di fondo,
  sovrapposto con blend mode screen (nero neutro), e non modifica lo sfondo.
- V532 src/rpg-reference-v532.js mappa Ambra/Ombra/Fulmine/Nebulosa/Astrale.
  img/effetti/effetti-reference-v532.webp ne contiene l'energia vera.
- App e Shop mostrano SOLTANTO questa fonte, senza aggiungere le vecchie
  atmosfere astrali o la scena fotografica alternativa. L'Atelier PNG
  ritaglia la stessa identica cella. Asset precaricato offline nella PWA.
- Per tutte le classi, caschi di Guerriero e Berserker, corpi, volti, armi,
  armature, zoom, e sfondi NON si modificano. Il layer e' additivo e separato.
- Aura Divina e Corona non sono tra i cinque effetti nello screenshot
  approvato, dunque restano premi indipendenti senza cambiamenti estetici.
- Non tornare al renderer v531 per questi cinque oggetti: non corrisponde
  all'immagine approvata, anche se i test passano. Richiesta verifica VISIVA
  su iPhone prima di considerare la resa completamente convalidata.

## 21/11/2026 — v531, resa approvata delle cinque aure fotografiche

- Bozzetto approvato il 21/11: Scintille d'ambra, Fumo d'ombra,
  Scarica viola, Nebulosa cosmica (Leggendaria) e Astrale (Mitica).
- Renderer generativo Canvas **solo alpha**:
  src/rpg-effetti-approvati-v531.js (nastri di energia, fumo, scintille,
  lampi ramificati, nebulose, rune e sigillo sotto i piedi).
- Si preservano i pixel originali di tutti i personaggi: volto,
  corporatura, caschi originali di Guerriero/Berserker, armi, armature
  e paesaggi esistenti. Niente immagini generate di nuovi personaggi.
- Ogni armatura Shop armata usa SEMPRE il proprio base.webp per i
  cinque effetti; l'energia è un layer Canvas sopra la foto.
- Lo stesso renderer viene usato in Atelier, export PNG, su iPhone e
  nel fallback offline. Nessun cambiamento a classi, rank, acquisti
  o premi Streak; la Corona e l'Aura Divina rimangono livelli separati.
- Migliorie ritoccabili successivamente tramite nuovi parametri Canvas,
  senza mai ricreare/falsificare i ritratti originali.

﻿# Palestra — memoria del progetto

## 20/11/2026 — v530, effetti Shop identici senza ambienti sostitutivi

- Correzione richiesta dopo video Atelier 20/11: Velo della Notte non
  deve avere un Fumo d'ombra enorme davanti al viso, Scarica viola lontana
  dal corpo, Nebulosa o Astrale con foto/panorami diversi.
- Per Astrale e Nebulosa il rendering prende la **foto completa esistente**
  dello stadio/armatura/arma con lo stesso sfondo e lo stesso zoom, senza
  aggiungere ambientazioni, maschere scontornate o cambiare i WebP.
  Solo l'energia fotografica alpha gia' presente nello Shop viene disegnata
  sul soggetto, con il volto protetto dai VFX.
- Fumo d'ombra usa il renderer di vapori intorno alla sagoma, non la vecchia
  nuvola dell'atlante. Scarica viola avvicina i fulmini alle giunture.
  Ambra, Aura Divina e Corona restano livelli cosmetici indipendenti.
- Il PNG dell'Atelier deve mantenere la stessa foto e copiare quando possibile
  il Canvas dell'effetto live; non ricreare sfondi cosmici in export.
- Non modificare corpi, outfit, armi, colori e dimensioni dei personaggi
  e non alterare premi/salvataggi/shop/streak. Cache/import v530.

## 20/11/2026 — v529, correzione effetti separati dalle armature

- Richiesta esplicita: gli **effetti** devono essere visivamente gli stessi già
  presenti nello Shop; non rigenerare o cambiare le armature per rappresentarli.
- Per Velo della Notte con pugnali sbloccati usare SEMPRE la medesima
  fotografia `base.webp?v=528` per ogni effetto (anche senza effetto). Ambra e
  Fulmine tramite il Canvas esistente, Ombra tramite l'atlas fotografico
  trasparente, Astrale e Nebulosa tramite i livelli cosmici separati.
- Anche `renderFotoAtelier` deve comporre l'effetto sopra l'armatura reale,
  indipendentemente dai pugnali, dalla Corona e dall'Aura Divina. Per le altre
  armature la logica è invariata. Non sono state modificate immagini WebP.
- Cache/PWA v529 e test di regressione specifici; non pubblicare senza CI verde.

## 20/11/2026 — v528, Velo della Notte e combinazioni RPG

- Rigenerata la fotografia dell'armatura epica **Velo della Notte**
  (Assassino, 5100 Aura) in blu notte e argento, con lo stesso rapporto 2:3
  delle altre skin. Include miniatura e sei varianti con pugnali effettivamente
  sbloccati: base, Ambra, Ombra, Fulmine, Nebulosa e Astrale.
- La precedente Corona v360 e l'Aura v379 contenevano il Velo vecchio:
  soltanto per questa armatura si usa sempre la foto v528, Aura indipendente
  e una Corona dimensionata sul nuovo ritratto; anche l'Atelier esporta il
  soggetto aggiornato. Gli altri cinque set RPG e il loro rendering rimangono
  invariati, così come i prezzi, gli acquisti e i premi Streak.
- Matrice di regressione dell'Atelier: 9.072 combinazioni di tre classi,
  sei stadi, tre armature/classe, sei effetti, due condizioni Aura e Corona,
  sette titoli. File WebP leggeri e miniature a 300×450.

## 20/11/2026 — v527, foto profilo su Safari iPhone

- Safari iOS non garantisce l'esportazione WebP da `canvas.toBlob`: quando restituisce
  PNG, riprova la compressione JPEG a qualita' decrescente. Entrambi i formati
  sono entro 80 KB e non entrano mai nel pacchetto/cache offline dell'app.
- Il bucket delle foto ora permette WebP e JPEG (mai SVG), mantenendo i percorsi
  vincolati alla cartella di `auth.uid()`. Una foto `foto:<uid>/<uuid>.jpg` e'
  riconosciuta in profilo, barra superiore e amici.
- Gli errori del caricamento restano leggibili sotto il pulsante oltre al toast.
- Non vengono toccati avatar colorati, Rank, streak, schede e personaggi RPG.

## 20/11/2026 — v526, avatar colorati di nuovo visibili

- Il selettore degli 8 avatar mostrava pulsanti quasi vuoti perché passava i cerchi
  come terzo argomento a `bottone`, che li ignorava. Ora usa l'opzione `figli`.
- Etichetta accessibile per ogni colore. Nessuna modifica a dati, Rank, personaggi
  RPG o alle foto personali introdotte con la v525.

## 20/11/2026 — v525, foto profilo personalizzabile

- Nel Profilo si puo' scegliere una foto dalla galleria, oltre agli 8 avatar a colori;
  anche la barra superiore e gli amici usano la stessa immagine. Nessun cambiamento
  al personaggio RPG, ai Rank, alle schede o ai carichi.
- Le foto diventano WebP quadrate 256×256 (max 200 KB). Nel profilo si salva solo
  `avatar_id = foto:<user_uuid>/<file_uuid>.webp`, cosi' la scelta segue l'account.
- Storage pubblico `palestra-foto-profilo` (come una foto profilo visibile agli amici):
  INSERT autorizzato solo nella cartella del proprio Auth UID. Migrazione
  `20261120001417_foto_profilo_storage_v525` applicata e letta nel database.
- Prima dell'upload il client confronta il profilo remoto e l'utente Auth;
  niente foto caricata in un account diverso. Fotografie non precache offline:
  in assenza di rete restano le iniziali. Test di regressione aggiunti.

## 19/11/2026 — v524, filtri Shop e Recap stabili

- Audit della v523: il filtro di Aura Shop tornava a «Tutti» dopo una sync e il
  conteggio continuava a mostrare tutti gli oggetti anche filtrando per tipo.
  Il Recap poteva perdere il periodo selezionato al ridisegno.
- La v524 conserva filtro Shop e mese/anno/modalita' Recap durante i ridisegni;
  cambia account = azzera le scelte. Il conteggio Shop segue la categoria.
- Nessuna modifica ai dati degli allenamenti, ai Rank, al database o agli
  acquisti. Versione PWA/cache v524; test di interfaccia con DOM simulato.

## 19/11/2026 — v523, stabilità «Prova un esercizio»

- Dopo la pubblicazione della v522 il controllo sul sito reale ha rilevato che
  una sincronizzazione poteva ridisegnare Rank e far tornare «MY RANKS» mentre
  Ste stava provando un esercizio. La causa era `let scheda = 'miei'`
  ricreato a ogni `vistaRank`.
- La v523 conserva nell'attuale sessione la scheda scelta, l'esercizio di prova,
  i kg, le ripetizioni, il peso corporeo e i filtri di ricerca anche dopo un
  ridisegno. Cambiando account azzera tutto. Nessun campo aggiunto e formule
  Rank, benchmark, storia dei record e database invariati.
- Versione PWA/cache portata a 523; aggiunti i test di regressione specifici.

## 19/11/2026 — v522, correzione esercizi cloud (DATABASE AGGIORNATO)

- Audit v521: gli esercizi globali creati dall'amministratore non venivano pubblicati;
  i campi biomeccanici degli esercizi personali scomparivano cambiando dispositivo.
- La v522 introduce `configurazione` JSONB per gli esercizi e una sincronizzazione
  separata di `esercizi_globali`, con recupero dei vecchi esercizi globali locali.
  Non aggiunge campi da compilare né cambia i numeri del Rank.
- Corretto lo schema di installazione (`versioni`, indice `missioni_unica`, policy
  amministratori). La cronologia distingue giorno della sfida e del riscatto.
- **MIGRAZIONE APPLICATA E VERIFICATA IL 19/11/2026:**
  `20261119200059_palestra_v522_esercizi_cloud_rls` risulta nello storico Supabase.
  Entrambe le tabelle degli esercizi hanno `configurazione` JSONB e le policy
  RLS dedicate; esiste un solo amministratore attivo, collegato all'account
  proprietario verificato tramite Supabase Auth. Le 37 righe di `versioni`
  sono rimaste intatte, così come la tabella legacy `versi`.
- Test ufficiali v522: 1620/1620 verdi. Entrambi i workflow GitHub della PR #171
  (`Test suite` e `PWA safety checks`) sono verdi. Lo script storico
  `tools/allometrico-test.mjs` è una vecchia utility di modifica con percorso
  Windows fisso: **non eseguirlo come test** e usare `node --test test/*.test.js`.
- La verifica dal telefono dell'utente e la conferma del catalogo condiviso
  con sessioni reali su più dispositivi restano da fare dopo la pubblicazione.

Ste: questo file è la memoria del progetto. OpenCode lo legge da solo all'inizio di ogni
chat aperta in questa cartella, quindi non serve ricordare nulla: io so già dove siamo.

Se questo stato diventa vecchio, oggi ste qui, basta correggere questo file.

Ultimo aggiornamento: **24/10/2026, calibrazione TITAN/OLYMPIAN integrata in v259; 878 test verdi**.

> **NOTA PER CHI APRE UNA CHAT NUOVA (22/10/2026).** La chat lunga su questo
> progetto ("AGENTS.md: attivazione muscoli dips e reverse") e' arrivata a
> **4.785 messaggi e 4.276 comandi** e il database delle chat di OpenCode e'
> cresciuto a **4,3 GB**: per questo la chat "si blocca a casualmente" e
> impiega minuti. Se stai leggendo questa nota in una chat nuova, sei nel
> posto giusto. **Non serve ricordare nulla di quello che facevamo prima:**
> il lavoro sta nei file del progetto e nei commit di git.
> Il lavoro non committato al momento (7 file modificati + 164 nuovi,
> fra cui gli atlanti anatomici in `img/muscoli/`) e' gia' sul disco: leggo
> i file e proseguo, non devo ricostruire niente.

---

## REGOLE DI STEFANO SU QUESTO PROGETTO (che valgono per sempre)

- **I bug li sistemo senza chiedere il permesso.** Ste, 15/10/2026: *"devi sistemarli
  i bug senza chiedermelo"*. Il permesso si chiede solo per le SCELTE che cambiano un
  numero che Ste ha approvato guardando i suoi carichi veri, non per un bug.
- **Il resto si chiede su ntfy** come sempre: installare, aprire finestre, scrivere fuori
  dal progetto, toccare i suoi programmi.
- Rispondere in italiano, tono semplice, **"non sbagliare"** è un requisito ripetuto.
- **Non aggiungere file `tools/*.mjs` non richiesti** e non includere file untracked estranei.
- Preservare IndexedDB, ID e progressi. UTF-8. Test di grammatica sempre verdi.
- Online su `https://stefanovillaggio8-dot.github.io/palestra/`.
- Foto sorgente: `C:\Users\stefa\Downloads\muscoli.jpeg` (809x825).

## 24/10/2026 - CALIBRAZIONE TITAN / OLYMPIAN

- `src/rank-v2/scalata.js` ora mantiene i primi cinque gradini approvati ma porta TITAN e OLYMPIAN oltre il vertice Elite: fallback modellato a +5% e +7,5% dell'intervallo ingresso-Elite.
- Back squat: Strength Level pubblica Beginner 0,75x, Novice 1,25x, Intermediate 1,75x, Advanced 2,25x ed Elite 2,75x. Usando la pendenza Advanced→Elite, TITAN è estrapolato a circa 2,85x (p98) e OLYMPIAN a 2,90x (p99,5).
- Deadlift: Strength Level pubblica 1,00x / 1,50x / 2,00x / 2,50x / 3,25x; la stessa estrapolazione dà TITAN 3,40x e OLYMPIAN 3,475x.
- Rank v2 e v3 condividono la curva e le due famiglie principali hanno profili espliciti, per non divergere fra motori.
- **Limite statistico:** i valori p98/p99,5 sono estrapolazioni dalla pendenza p80→p95, non quantili osservati direttamente. Per gli altri esercizi, la curva generale è una stima, non un percentile certificato. I riferimenti Strength Level sono della community autoselezionata e qui usano la curva maschile; non esiste ancora una curva separata per sesso.
- I carichi disponibili possono far superare due soglie con lo stesso peso registrabile. Il calcolo conserva soglie matematiche distinte; la scheda può mostrare lo stesso peso minimo per due ranghi se l'attrezzatura non ha un incremento intermedio. Non si spostano le soglie in base al peso corporeo, perché devono restare costanti dopo la normalizzazione allometrica.
- Verifica su GitHub Actions: **878/878 test superati, 0 falliti**. GitHub Pages build/deploy: **successo**.

Fonti: [Strength Level squat](https://strengthlevel.com/strength-standards/squat/lb), [Strength Level deadlift](https://strengthlevel.com/strength-standards/deadlift/lb), [metodologia Liftoff Rank](https://info.liftoffrank.com/research/strength-standards) per il principio di rifit sui dati reali.

---

## 22/10/2026 - MODELLO FORZA v3 (storico del rilascio v259, pubblicato il 24/10/2026)

**LA REGOLA CHE VALE ORA (Ste, 22/10/2026):** *"non deve essere facile arrivare a
TITAN. tutto deve seguire le formule."* Quindi i vertici di ogni movimento sono i
valori ELITE REALI delle fonti pubbliche (Strength Level / Endura), nella NOSTRA unità
(per manubrio / per lato sentito, con la doppia carrucola gia' dimezzata). Niente numeri
a occhio: se un vertice cambio', e' perche' la fonte dice quel numero.

- Il motore v3 non stima piu' un massimale: score = **carico reale x ripetizioniPiene x
  meccanica / peso^0,67**. La serie vera, non l'1RM ipotetico.
- **Vertici alzati il 22/10/2026** (4 movimenti), con la fonte nel commento di ognuno:
  - `spinta_verticale` 0,60 -> **0,70** (SL: elite 0,70x per manubrio)
  - `spalle_posteriori` 0,30 -> **0,55** (SL: elite 0,55x per manubrio)
  - `polso` 0,60 -> **0,75** (SL: elite 0,75x per manubrio)
  - `petto_isolamento` (cable fly) 0,35 -> **0,50** (SL: elite 84 kg a 1RM sul carrello
    = 66 kg a 6 rip = 33 kg per lato su 66 kg di corpo = 0,50x). Ste stesso aveva
    notato che il cable fly "non penso sia da TITAN".
- **Risultato sul backup reale: 2 TITAN, 6 DIAMOND, 7 PLATINUM, 4 GOLD, 1 SILVER,
  zero OLYMPIAN.** I 2 TITAN sono Seated Cable Row (83%, 1,44x corpo) e Cable Overhead
  Tricep (82%): davvero avanzati. OLYMPIAN resta vuoto perche' nessuno e' a livello elite.
- **Doppia carrucola (verificato 22/10/2026):** `caricoReale()` dimezza SEMPRE quando
  `carrucola === 'carrucola_doppia'`, mai per i manubri (che non hanno carrucola). Marcatura
  degli esercizi al cavo controllata e corretta: doppia = cable fly, overhead tricep,
  reverse fly, pushdown, hammer curl, lateral raise, high-to-low fly, incline/bicep curl,
  chest press, crunch, reverse fly a due braccia, face pull; mono = **seated cable row,
  wrist curl, incline single arm pulldown**. Esempio: cable fly 38 letti = 19 reali/lato.
- Il calcolo **dipende dal peso corporeo** (divide per peso^0,67): lo stesso carico a 60 kg
  vale di piu' che a 95 kg. Verificato.
- Dip e trazioni: lo score usa **corpo + zavorra**; a corpo libero la serie e' valida e la
  riga dice `corpo libero`.
- OLYMPIAN senza divisioni I/II/III: gli LP continuano a salire. Le altre bande hanno I/II/III.
- File toccati: `src/rank-v3/modello.js`, `src/rank-v3/valutazione.js`, `src/rank.js`,
  `src/rank-v2/scalata.js`, `src/avviso-peso.js`, `src/app.js` + test.
- V35 protegge i 4 casi veri di Ste (non devono essere OLYMPIAN). Alzare i vertici li
  allontana da OLYMPIAN, quindi V35 continua a passare.
- `node --test`: **873 pass, 0 fail** (verificato 22/10/2026).
- BUG SEGNALATO DA STE (22/10/2026): nella "prova esercizio" **non spunta il numero di
  divisione** (DIAMOND I/II/III, TITAN I/II/III, ecc.). Il codice locale la mostra gia'
  (motore v3 e riga 6124/6148/6159 di `src/app.js`): **si risolve pubblicando la v259**,
  perche' online gira ancora la v258 col motore vecchio.
- **COMPLETATO il 24/10/2026:** PR #1 integrata in `main` con commit `11709db1d827867f32593a17dfad74bd5ca7d385`; GitHub Actions ha superato **877/877 test** e il workflow GitHub Pages è terminato con successo. `index.html` e `sw.js` dichiarano `palestra-v259`.
- **Limite aperto:** i vertici Elite delle varianti nuove sono riferimenti Strength Level della community maschile; le fasce Rank intermedie non sono percentili certificati e le macchine per squat non sono equivalenti. La calibrazione TITAN/OLYMPIAN per sesso e popolazione richiede distribuzioni specifiche.

  ## Dove siamo

  - **Storico al 16/10: v258 pubblicata e verificata online**, `HEAD`/`origin/main` = `6b7d67b`.
  - Test verdi: `node --test` → **844 pass, 0 fail** (verifica del 16/10, prima della v192;
    le versioni successive hanno i loro test in `test/`).
  - **Lavoro non committato al momento**: 7 file modificati (`src/rank-config.js`,
    `src/scala-esercizi.js`, `stile-rpg.css` e 4 test) e 164 nuovi, fra cui
    `img/muscoli/atlante-anatomia-fronte.svg`, `img/muscoli/atlante-anatomia-retro.svg`
    e `confronto-foto.html`. E' tutto gia' sul disco: si parte da li'.

## LA LEZIONE DEL BRACHIORADIALE (v192): NON fidarti di un commento che dice "non è disegnato"

Ste ha chiesto *"l'hammer curl non fa anche il brachioradiale?"*. Aveva ragione, e il
codice aveva scritto il contrario nei commenti: *"il brachioradiale è un muscolo
diverso e non è quello disegnato qui: meglio acceso niente che acceso il muscolo
sbagliato"*.

**La lezione: un commento che giustifica una scelta va verificato come un numero, non
accettato come una spiegazione.** Il pezzo c'era: sul davanti dell'avambraccio, sotto il
gomito e verso l'esterno (x 40-61, y 392-418) c'è una striscia staccata da una linea
scura, ed è lì che sta il brachioradiale. Il rischio vero era coprirla con
l'`avambraccio` intero, che è il piegatore del polso e in un curl non lavora.

- Ste ha scelto l'opzione **B**: staccare davvero i due muscoli, non solo accendere il
  brachioradiale e lasciare l'avambraccio com'era. L'avambraccio ora comincia a y=420.
- **La sagoma è stata scelta misurando, non a occhio**: sei candidate, la migliore dà
  83,3% a sinistra e 87,3% a destra. Conferma la lezione n. 3 sotto: la figura NON è
  simmetrica, e per questo muscolo il lato peggiore è il **sinistro** (le prime due
  candidate che ho provato davano 81/62 e 76/63: allargarle faceva peggio su entrambi i
  lati, perché il pezzo è una striscia stretta e diagonale, non un rettangolo).
- Il riconoscimento è fatto dalla **posizione**, non da un'etichetta: il disegno non
  scrive i nomi dei muscoli. Se Ste dice che quel pezzo è un altro muscolo, la sagoma va
  spostata, non la discussione.
- Un muscolo che non è un esercizio (`brachioradiale`) va in `PARTI` con `parole: []`
  **solo se il test lo permette**: qui M7 pretende almeno una parola, e si è usato il
  nome del muscolo stesso, che nessun esercizio contiene. Il posto giusto per accenderlo
  resta `MOVIMENTI.curl`, non una parola.
- `GRUPPI[id].gruppo` deve coincidere con la chiave di `RITAGLI`: se il gruppo è
  sbagliato, Z1/Z6/Z14 falliscono con errori fuorvianti ("l'app non lo riconosce", "il
  ritaglio ha il pezzo ma non il suo specchio").

## LA MAPPA DEI MUSCOLI: quattro lezioni del 16/10 (leggi queste prima di toccare una sagoma)

Il 16/10 Ste ha segnalato tre volte che sull'omino i dip "evidenziavano l'avambraccio".
Aveva ragione tutte e tre, e io avevo risposto due volte "sposto un po' la sagoma" senza
risolvere niente. **La regola che mancava: le misure si prendono su `muscoli.png`, il
DISEGNO ORIGINALE, e non si indovinano.** Tre versioni (v177, v179, v181) sono state buttate
per numeri messi a occhio.

1. **I muscoli nel disegno sono separati da vuoti scuri, e quei vuoti sono le articolazioni.**
   Il vuoto sul braccio è il gomito (dietro y 378-384, fronte y~390). La tacca dentro il pezzo
   del braccio è il confine deltoide/tricipite (y~335). La V scura fra braccio e schiena ha
   la punta a y~335, e il dorso largo sta a x 528-576: se la sagoma passa a x<520 sta sul
   braccio. **Il disegno dei muscoli della gamba FINISCE a y~690** anche se il corpo arriva a
   y~780: sotto non c'è più nulla da accendere.

2. **Copertura bassa non vuol dire sagoma sbagliata.** La parte che non copre il muscolo si
   divide in due, e contano in modo opposto:
   - **fuori dal corpo** → non si vede, e le sagome sono volutamente larghe: NON è un difetto
   - **dentro il corpo sul nero** → l'app non accende niente: QUI è un difetto
   Per questo "deltoide posteriore 50%" era in gran parte fuori dal corpo (34%), e il difetto
   vero era 8%. Nel nero interno c'è poi da distinguere la **linea sottile** (tendina o
   separazione, es. le addominali: non va colorata) dalla **zona spessa** (buco vero).

3. **La figura NON è simmetrica.** I muscoli sono disegnati a mano e i due lati non coincidono:
   specchiare la stessa sagoma dà coperture diverse fino a **8,9 punti** (tricipite 88,3% a
   sinistra e 97,2% a destra). Per il deltoide anteriore invece il lato PEGGIORE è il destro
   (61,3% contro 68,5%), mentre per tricipite e dorsali è il sinistro. Quindi una correzione
   non è mai uniforme su tutte le sagome.

4. **`dentro()` deve chiudere il poligono.** Il modo sbagliato è
   `zip(range(n), list(range(n))[1:] + [n-1])`: l'ultima coppia è `(n-1, n-1)` e manca il lato
   di chiusura. Il modo giusto è `j = n-1` prima del ciclo e `j = i` dentro. Con quello
   sbagliato la copertura risultava più bassa del vero, fino a 4,6 punti, e i pavimenti del
   test erano tarati sui numeri sbagliati.

### I due test che proteggono la mappa (classi di difetto DIVERSE)

- **Z18** in `test/mappa-muscoli.test.js`: vieta che due muscoli diversi si sovrappongono.
  Rasterizza su griglia a passo 2 **con origine sempre 0** (non dal minimo della sagoma, altrimenti
  due sagome hanno griglie sfasate e nessun punto coincide mai). Eccezione unica: bicipite e
  brachiale, sovrapposti per costruzione perché il brachiale sta sotto.
- **Z19** in `test/muscoli-immagine.test.js`: ogni sagoma deve coprire almeno il suo pavimento
  del muscolo realmente disegnato, **misurando anche il lato specchiato e facendo valere il
  peggiore**. Legge il PNG in Node (non c'è un decodificatore PNG: c'è un decoder minimale in
  testa al file, valido solo per 8 bit RGBA senza interlacciamento).

La prova che i due test sono davvero utili: rimettendo i dorsali di prima (quelli che
invadevano il tricipite) **Z19 fallisce e Z18 passa**, perché l'intersezione era sotto
l'8%. Servono entrambi, e coprono difetti diversi.

### Come si rimisura una copertura

`C:\Users\stefa\Documents\Default Project\strumenti-muscoli\categorie-fisso.py` (categorie: sul muscolo /
fuori dal corpo / nero fine / nero spesso, per ogni sagoma, con il margine sul pavimento).
`C:\Users\stefa\Documents\Default Project\strumenti-muscoli\verifica-bug.py` confronta la versione buona e quella rotta di `dentro()`.
`C:\Users\stefa\Documents\Default Project\strumenti-muscoli\buchi.py` stampa i gruppi di pixel neri spessi con coordinate, area e centro.
**Un pavimento si alza MAI per far passare un test: si alza solo dopo aver migliorato la
sagoma, e si abbassa solo se il difetto è dimostrato e voluto.**

### Cosa NON rifare

- **Non spostare una sagoma a occhio.** Ogni volta che l'ho fatto il difetto c'era. Prima si
  misura, poi si tocca.
- **Non rifare la figura.** Ste ha rifiutato due volte una tavola anatomica rigenerata
  (v172-v174, poi la v178 ha solo tolto le linee dorate, non ha toccato la figura).
- **Non guardare la copertura di un lato solo**, e non abbassare i pavimenti.
- **Deltoide anteriore**: unico candidato ancora aperto, 61,3% sul lato peggiore. Il buco sta
  nella fessura fra deltoide e pettorale, che nel disegno è a zig-zag (y 310 → x 94-95,
  y 320 → x 84-92, y 340 → x 94-100), quindi il confine è genuinamente ambiguo. Se un giorno lo
  si affronta: misurare la fessura riga per riga, **separatamente sui due lati**, e decidere
  se correggere la sagoma originale, la specchiata o entrambe. Mostrare le coordinate a Ste
  prima di toccare il codice.

## Il tetto del pushdown (v168, decisione ancora valida)

Ste guardando il suo pushdown: 42 kg nel carrello = **21 kg sentiti per lato**, e il
Rank diceva BRONZE con *"21kg non sono tanti?"*.

- Il **carico era giusto**: *"il cavo è doppia carrucola quindi 21kg è giusto, i 42
  sono nel carrello dei pesi dei cavi"*.
- Il tetto era sbagliato: **0,7x → 0,44x** (circa 30 kg sentiti per lato). Ingresso
  **0,26x → 0,13x** (circa 9 kg sentiti).
- Riferimento: il **cable fly**, tetto 0,4x per lato, `fonte: 'tuo'`, l'unico numero di
  `valori.js` costruito sui carichi veri di Ste. Ste NON sa il suo massimale
  (*"non so quanto faccio di massimale"*), quindi qui il tetto non può prendere un suo numero.
- L'estensione sopra la testa resta **0,62x** ma cambia base: non più derivata dal
  rapporto meccanico, sui suoi 30 kg sentiti per lato.
- Risultato: i due tricipiti stanno **entrambi al 70%** (pushdown PLATINUM 68%, sopra
  la testa PLATINUM 64%).

### La cosa da non rifare (è già successa due volte)

Agosto: il pushdown non dava nessun livello, e la risposta fu **non dimezzare**. Ottobre:
BRONZE con 21 kg, e la tentazione è la stessa. **In entrambi i casi il carico era
giusto e il numero da correggere era il tetto.** Quando Ste segnala che un Rank è
troppo basso, la prima domanda è sempre: *il carico è corretto?*

`tricipiti_alta` sta **sopra** `tricipiti`, non sotto: il rapporto meccanico (0,887)
dice che sono parenti stretti, ma non dice in che ordine stiano i tetti. V23 verifica
entrambe le cose.

## I difetti corretti fino alla v168 (v164, v165, v166-v168)

1. **La curva delle ripetizioni saturava** (era una somma geometrica con ragione 0,65:
   80 rip valevano come 16). Ora è `(rip / 8) ^ 0,20`, che non converge mai.
2. **Wrist Curl al 113% del tetto** (0,4x = 26,4 kg coi suoi 30 kg): era OLYMPIAN a tutti
   i costi. Tetto ora 0,6x, i suoi 30 kg al 73%.
3. **`TETTO_MOVIMENTO` non aveva mai troncato niente**, su nessuno dei 17 movimenti.
4. **Finestra del 92%** che permetteva alle serie di comprare un Rank. Tolta.
5. **Il reverse fly era classificato come `petto_isolamento`**: la parola "fly" da sola
   finiva nel petto, e i suoi 15 kg venivano giudicati sulla scala del cable fly. Ora ha
   il movimento `spalle_posteriori` con tetto 0,37x per lato, **derivato dalla meccanica**.
6. **Secondari a 0,15 che si accendevano comunque** (trapezio sulle alzate laterali,
   deltoide posteriore sui pushdown): avevano la frase "non si accende" nel commento e
   si accendevano, perché `anatomia` certifica i secondari veri e un certificato passa
   sotto soglia. Tolti.
7. **I secondari si disegnavano a gruppo intero**: il gruppo del deltoide ha due fasce e
   quella laterale veniva dipinta anche quando lavorava solo l'anteriore (sul cable fly
   si vedeva il deltoide laterale acceso). Ora un secondario si disegna solo dove lavora.

## Le leve (`src/rank-v2/leva.js`)

Modello che calcola `carico massimo ∝ sezione muscolare / braccio di leva`, con la tabella
di anatomia (CSA, braccio del muscolo, dove sta il peso).

- **NON scrive i tetti**: la tensione specifica varia molto fra muscoli e le convenzioni
  ("per gamba", "per lato") trasformano la stessa coppia in kg diversi. Il test **V24**
  verifica che il modulo non possa spostare un Rank.
- Vale per **un solo confronto**: due movimenti dello STESSO muscolo, perché la tensione
  specifica è la stessa e si cancella. È così che è nato il tetto 0,37x del reverse fly
  (0,45 × 0,83, e lo 0,83 è il rapporto meccanico laterale/posteriore).
- `scaleDaSeparare()` segnala i movimenti che il motore non distingue. **Oggi non ne
  trova nessuno**: le estensioni sopra la testa hanno la loro scala dal 15/10 (v166).
- Non riproduce lo "12 kg laterale = 70 kg panca" del codice esterno: con i miei numeri il
  confronto è più sfumato. Va detto, non nascosto.

## Come si decide un numero (regola del progetto)

1. Il numero che c'è adesso è **la verità**: l'ha guardato Ste con i suoi carichi.
2. Un modello può **segnalare** che un numero è sospetto, non scriverlo.
3. Se si cambia un numero, la ragione è **leggibile nel codice** e il test dice il perché.
4. Il modello che propone un tetto deve passare il caso del confronto lecito (V23).

## Lo scalare allometrico (v164)

`pesoAllometrico()` in `rank-v2/valori.js`: la forza va con la **sezione trasversale** del
muscolo, che cresce col peso a esponente **0,67**, non a esponente 1.

- Riferimento **75 kg**: a 75 kg non cambia niente, gli altri si spostano di poco.
- Entra in un posto solo, e sia nel tetto sia nell'ingresso.
- Chi pesa di più non è più chiuso fuori: prima, a 100 kg di corpo, 37 kg di chest press
  non davano nessun livello; adesso danno BRONZE.

## La regola dei muscoli (v163)

Ste: *"i dips non fanno anche tricipiti? e poi nell' one arm cable reverse fly non lavora
anche tricipiti o si? o comunque se lo fa non lo fa principalmente. più evidenziati devono
essere i muscoli allenanti principali di quell'esercizio. fallo in tutto e che si aggiorni
automaticamente"*.

- `MOVIMENTI` in `muscoli-parti.js`: il movimento si scrive una volta sola con i muscoli che
  lo sostengono e quanto; ogni esercizio di quel tipo li accende da solo.
- **Un secondario o ha una quota sua e si vede, o non si mette.** Nessun numero "sotto la
  soglia": sotto la soglia non si vede, e se si vedesse sarebbe rumore.
- Un secondario si disegna **solo nelle fasce che lavorano**; il gruppo principale si
  disegna tutto (la regola dei dip).
- Un solo pezzo pieno per esercizio, ed è sempre quello che l'esercizio sceglie (Z13).
- `anche` (la riga "LAVORA ANCHE") deve dire **esattamente** quello che si vede (Z14).

## Anatomia decisa

- `LIVELLI = [0.2, 0.42, 0.66, 1]`, la quota più alta è sempre `1`.
- `livelloDiQuota()`: `>=0.75` → 1, `>=0.45` → 0.66, `>=0.2` → 0.42, sotto → 0.2.
- `SOGLIA_SECONDARIO = 0.4`: vale per i secondari **parlati**, non per quelli di anatomia.
- I dip: petto basso pieno, tricipiti secondari, **deltoide non acceso**.
- Il reverse fly: deltoide posteriore pieno, dorsale centrale forte, tricipiti **all'ultima
  sfumatura** (il gomito è fermo: li ha chiesti Ste, ma "non lo fa principalmente").
- Il fly col petto: **nessun secondario**. Il gomito non si stende e la spalla non lavora.
- Una tirata non accende mai i muscoli di spinta (`TIRATA`/`SPINGONO`), nemmeno come
  secondari, anche se la descrizione contiene "panca inclinata".

## File che contano

- `src/muscoli-parti.js`: `PARTI`, `MOVIMENTI`, `ACCESSORI`, `parteDiMuscolo()`, `anatomia`,
  `anche`, `TIRATA`, `SPINGONO`
- `src/mappa-muscoli.js`: `RITAGLI`, `SAGOME`, `LIVELLI`, `SOGLIA_SECONDARIO`,
  `livelloDiQuota()`, `righeDaAccendere()`, `figurino()`
- `src/rank-v2/curve.js`: `ripetizioniPiene()`, `ESPONENTE_RIPETIZIONI`, `caricoReale()`,
  `lavoroMonobraccio()`, `fattoreMeccanica()`
- `src/rank-v2/valori.js`: `VALORI_MOVIMENTO`, `TETTO_MOVIMENTO`, `TETTO_CON_MACCHINA`,
  `pesoAllometrico()`, `tettoPerEsercizio()`
- `src/rank-v2/scalata.js`: `CURVA_SOGLIE`, `soglieDaValori()`, `rankDaScore()`, `lpDentro()`
- `src/rank-v2/leva.js`: `MUSCOLI`, `LEVE`, `gradoSvantaggio()`, `caricoMeccanico()`,
  `scaleDaSeparare()`, `leVerifiche()`
- `src/esercizi-classificatore.js`: la lista dei movimenti e le sue parole
- `src/app.js`: `disegnoOmino(parteId, livelli, anatomia)`
- `test/mappa-muscoli.test.js`: Z1-Z22 (Z18 niente sovrapposizioni, Z19 copertura sui due lati, Z20 rematore/tirate senza centro schiena, Z21 il classificatore non inventa frasi, Z22 brachioradiale sul martello e avambraccio solo sul polso)
- `test/rank-v2.test.js`: V1-V35 (V19 tetto, V20 allometrico, V22-V24 leve, V35 prestazioni vere sotto il tetto v3)
- `src/dati-iniziali.js`: esporta `ESERCIZI`, usato dai test
- `src/scala-esercizi.js`: `SCALA_ESERCIZI`, i numeri "verificati a mano" — **che il
  motore `rank-v2` non usa**. Solo `scala-auto.js` li legge, e serve al motore vecchio
- `src/scala-auto.js`: la scala derivata, con la regola "il numero verificato vince su tutto"
- `sw.js` (`palestra-v192`), `index.html`, `anteprima-aura.html`

## Prossimo passo

1. Controllare i Rank reali dopo il rilascio v259, senza alterare i numeri approvati solo per far passare test.
2. Per rendere TITAN/OLYMPIAN equivalenti a rarità precise, raccogliere distribuzioni per esercizio, sesso e popolazione; non dichiarare percentile esatto finché non esistono quei dati.
3. Separare ulteriormente le macchine per squat solo quando esistono riferimenti distinti e confrontabili per modello/variante.
4. Se un numero non torna, intervenire su `ingresso` / `vertice` in `STANDARD_1RM` (`src/rank-v3/modello.js`) e allineare i test e il motore legacy. I tetti storici di polso, reverse fly, overhead tricep e spinta verticale restano protetti da V35.

## Due avvertenze tecniche

**1. NON leggere con `read` questi due file**, sono enormi e fanno fallire la richiesta al
modello (916 KB l'uno, 1200x2800 px, circa 320.000 token):

- `C:\Users\stefa\AppData\Local\Temp\opencode\aura\shot11a.png`
- `C:\Users\stefa\AppData\Local\Temp\opencode\aura\shot11b.png`

Se serve controllarli, prima ridimensionali (Node sharp, Python PIL o ffmpeg) oppure chiedi
a Ste di allegarli già ridotti.

**2. File untracked estranei** già presenti nel progetto: `confronto-foto.html`,
`img/personaggi/confronto/`, numerosi `tools/*.mjs`. **Non toccarli e non committarli.**
