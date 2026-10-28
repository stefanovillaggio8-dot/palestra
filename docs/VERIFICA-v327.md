# Checkpoint v327 — 28 ottobre 2026

L'incarico completo NON è terminato. Questo rilascio corregge difetti riprodotti e mantiene un elenco esplicito del lavoro restante.

## Base e modifiche

- Branch main, base v326 `8853a434abbdf335dd7931c62604d0e9dd051bd0`, confrontata con origin/main dopo fetch. Master non utilizzato.
- Gli 8 fallimenti iniziali sono riprodotti. La suite equivalente a CI aveva 882 test (874 verdi); `node --test` senza glob includeva anche due file di supporto, quindi 884 (876 verdi).
- Rotazione estratta in una funzione verificabile: tutte le versioni della stessa scheda, ID stabile, nome univoco e recupero dal vecchio snapshot. Ignora altre schede, cestino e sedute aperte. Ordina per data dell'allenamento prima dell'ora di inserimento, evitando che un inserimento storico faccia arretrare il giro. Non salva nuovi contatori né modifica sedute.
- La v326 aveva già risolto parte del problema tra versioni; non è stata riprodotta una permanenza sul Giorno 1 nel caso ordinario. Corretti e coperti i casi residui sopra.
- Grafico a linee: corretta formula delle coordinate X, precedentemente dipendente dalla scala Y; punto singolo centrato, date visibili e descrizioni accessibili sui punti.
- Acquisti: conferme serializzate, saldo e inventario riletti dal database, lock tra schede browser quando disponibile, identificatore deterministico per account/oggetto. Riconoscimento delle spese legacy senza riscriverle. Nessun saldo preesistente modificato.
- Shop: distingue equipaggiato da acquistato, controlli più accessibili, chiusura anteprima con Escape corretta anche dopo altri tasti, listener liberato a ogni chiusura.
- Cache dell'anteprima allineata; regole reduced-motion consolidate in fondo al CSS e rispettosa dell'opzione animazioni sempre attive.
- Test account aggiornato alla configurazione pubblica già presente; fixture amici esplicite equivalenti alla RPC autorizzata. Nessuna riapertura della cache di profili estranei.
- Nessuna modifica a formule/calibrazione/soglie rank, schema IndexedDB, migrazioni o account reali.

## Verifiche effettuate

- Suite completa prima del versionamento: **892 superati, 0 falliti, 0 saltati**. Dieci test aggiunti per giro, coordinate e acquisti.
- Test esistenti su sincronizzazione, conflitti, rank, grammatica, copertura bilaterale e sovrapposizione muscoli passati senza abbassare soglie.
- Sintassi app.js e `git diff --check` superati. Suite controlla anche import e riferimenti al service worker.
- Browser locale, profilo separato “Verifica locale”, senza sessione Supabase: registrati 20 kg × 8, completato Giorno 1, applicata proposta di modifica scheda (versione 2), ricaricata pagina. Giorno 2 indicato come prossimo, seduta conservata. Console senza errori/avvisi durante la prova. Screenshot `verifica-giro-v327.jpg`.
- GitHub Actions iniziale: test falliti run 40594251997; Pages riuscito run 40594250916.

## Anatomia: verifica parziale

Il catalogo e i test esistenti includono il Bench Pull con centro schiena e secondari. I poligoni non sono stati spostati. Non è stata completata la misurazione sistematica di ogni esercizio e di tutte le varianti sul disegno originale.

Le descrizioni legacy non sono prove anatomiche: alcune negano il coinvolgimento del centro schiena nelle tirate. Lo studio [ACE sui muscoli della schiena](https://contentcdn.eacefitness.com/April2018/ACE_BackExerStudy.pdf) rileva attivazione del trapezio medio nel seated row; [NASM](https://www.nasm.org/resource-center/exercise-library/seated-machine-row-close-grip) include romboidi e trapezio medio. Occorre distinguere coinvolgimento reale e scelta di rappresentazione grafica prima di intervenire. Nessuna deduzione precisa su gomiti o traiettoria del Bench Pull a 26° è stata inventata.

## Limiti e lavoro restante

1. Verifica reale iPhone/PWA, due dispositivi e Supabase autenticato non effettuata. Non dichiarare certificati login, inviti e sincronizzazione reale.
2. Acquisti di oggetti DIFFERENTI contemporanei da due dispositivi offline possono ancora superare il saldo condiviso: serve una decisione architetturale e una transazione server verificata. Il lock locale non risolve questo caso. Anche la convergenza dell'acquisto identico richiede verifica contro il server reale e la gestione conflitti.
3. Inventario/equipaggiamento: conservata l'attuale separazione tra proprietà derivata dalle spese e slot del profilo. Restano test integrati end-to-end con reload, sincronizzazione, titoli e ricompense ottenute.
4. Generata una sola immagine IA candidata, Custode delle Braci, ottimizzata e salvata in docs/armature; non attivata nel personaggio. Specifiche per tutte e sei le armature in quel percorso. Restano produzione, confronto delle sei progressioni, asset definitivi e integrazione.
5. Restano audit anatomico completo, miglioramento di tutti gli effetti, filtri dei progressi, restyling di tutte le sezioni e verifica responsive completa. Questo rilascio non va presentato come restyling generale terminato.
6. Timer osservato funzionante durante la prova; recupero ripetuto nelle barre alta e bassa già previsto nel codice. Non riscritta la logica del timer.

## Ripresa

Leggere la memoria dell'automazione, controllare main e CI. Proseguire dai limiti sopra, senza rifare i fix già verificati né alterare dati reali. L'asset originale generato è conservato anche nella cartella ImageGen della chat.
