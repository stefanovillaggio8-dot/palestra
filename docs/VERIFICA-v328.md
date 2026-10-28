# Verifica v328 — 28 ottobre 2026

## Rilascio

Frontend v328 pronto per pubblicazione su main. Non è il completamento di tutto il piano grafico.

Include requisiti shop 15/50/80 giorni dal record storico, controlli acquisto server, acquisti idempotenti, inventario persistente, paginazione sync, timer recupero dopo riapertura, grafici leggibili e progressi anche per esercizi rimossi dalla scheda, medaglie solo con rank effettivamente presenti. Versione, CSS e cache allineati. Nessuna modifica a soglie Rank, ID o schema IndexedDB.

Corrette in questo run la versione visualizzata (v328 invece di vpalestra-v328), il singolare dei giorni e il refuso “peso corporeo”.

## Evidenze

- Suite completa: 910 test superati, zero falliti/saltati. Dopo le correzioni di testo: 19 test mirati superati, inclusi grammatica, sintassi, inventario, anteprima e integrità/cache.
- Server: verificate presenti le tre migrazioni acquisti e requisiti del 28 ottobre. Rieseguiti test SQL con utenti sintetici e rollback: soglie, bypass INSERT, vecchi acquisti, calendario e isolamento scheda; acquisto ripetuto, saldo insufficiente, account altrui, acquisti immutabili. Saldo sintetico finale 1400, un solo acquisto. Nessuna nuova migrazione e nessun dato reale modificato.
- Browser locale, profilo Verifica locale: seduta precedente conservata, Giorno 2 prossimo. Shop filtra per Guerriero, mostra requisiti e blocca acquisti. Anteprima si apre/chiude. Viewport richiesto 390×844, larghezza contenuto 380 px come il viewport effettivo, nessuno scorrimento orizzontale della pagina. Tutte le immagini caricate, console senza errori/avvisi. Screenshot verifica-shop-mobile-v328.png. Non è una verifica su iPhone fisico.

## Grafica: limite effettivo, non completata

Conservati i 18 originali e src/avatar-rpg.js. Sei illustrazioni del catalogo e sette scenari separati inclusi; le illustrazioni non sostituiscono i ritratti originali. Gli overlay SVG restano provvisori e non sono adattamenti realistici.

Nuovo tentativo con ImageGen integrato: guerriero-3 come identità, guerriero-braci come riferimento costume; richiesta di faccia, barba, corporatura, posa, scudo, elmo, piedi identici, nessuna spada e alpha reale. Risultato respinto: sfondo opaco con bagliore, volto e dettagli alterati. Salvato localmente in docs/armature/braci-v328-candidato-respinto.png, escluso dal rilascio. Nessun uso di API/CLI alternativa.

Restano 54 adattamenti per skin/classe/stato e 18 basi con alpha (dettaglio in VERIFICA-SKIN-STREAK.md). La composizione ambiente-personaggio-armatura non è conclusa. Non spacciare i test verdi per verifica visiva delle varianti.

Restano anche la verifica autenticata su due dispositivi, iPhone/PWA fisico e il restyling completo di tutte le sezioni del piano precedente. L'audit anatomico contiene verifiche di classificazione e tracciati esistenti, non misurazioni cliniche di ogni variante personale.

Ultima verifica locale: 2026-10-28T22:00:30.481Z.
