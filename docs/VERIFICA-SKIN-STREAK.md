# Checkpoint economia e skin — 28/10/2026

## Stato effettivo

Frontend modificato e verificato localmente, NON pubblicato e NON committato in questa esecuzione. HEAD resta 853b88c (v327); i file v328 e altre modifiche erano già presenti all'avvio e sono stati conservati. Il lavoro complessivo non è concluso.

Il server Supabase palestra ha già ricevuto la migrazione `20261028165449_requisiti_storici_skin_aura`, tramite il connettore. Il nome/versione del file locale proviene dalla cronologia effettiva del server; CLI Supabase non disponibile. Nessuna riscrittura di tabelle, saldi o progressi. Finché non viene pubblicato il frontend, il server rifiuta già acquisti sotto soglia ma la UI pubblica può non mostrare i nuovi requisiti.

## Completato

- Requisiti esatti 15/50/80 giorni e prezzi invariati per i sette prodotti. Solo `streak.record`, nessun fallback alla Streak attuale o ai livelli di fuoco.
- Nome, rarità, prezzo, immagine, record richiesto/personale, giorni mancanti e progress bar nelle schede/anteprime. Astrale usa una miniatura dell'avatar originale con effetto cosmico; nessuna illustrazione estranea applicata al ritratto.
- Corretto bug opzione `disabled` ignorata da `bottone`: nello shop ora passa `disabilitato`.
- Controllo nel gestore acquisto e trigger server su INSERT diretto, oltre alla RPC. Record calcolato dalle stesse sedute della scheda (incluse versioni storiche), giorni previsti e sedute completate. Compatibilità classe verificata sul server. Data di riferimento server Europe/Rome; altri fusi non certificati.
- Vecchi acquisti conservati, upsert idempotente e nessun addebito retroattivo. Inventario visualizza gli oggetti compatibili senza eliminare quelli delle altre classi.
- `src/avatar-rpg.js` invariato: armature gratuite e record storico preservati. Ritratto torna ai file originali in `img/personaggi/stati/`, con cosmetico sovrapposto separatamente.
- Sette scenari SVG originali senza personaggi: fortezza, castello viola, città notturna, rovine cremisi, campo barbarico, vulcano e cosmo. Montati solo nel dialogo; nessuna scrittura di profilo durante l'anteprima.

## Verifiche

- `node --test test/*.test.js`: **908 pass, 0 fail, 0 skipped**. Compresi grammatica, progressione gratuita, soglie, saldo, classi, record dopo interruzione e test DOM apertura/chiusura anteprima senza mutazioni.
- `test/requisiti-skin-server.sql` eseguito su account sintetico in transazioni con rollback prima e dopo la migrazione. Tutte le soglie: un giorno sotto rifiutato, soglia esatta accettata, INSERT diretto bloccato, riacquisto/upsert dopo rimozione storico senza addebito o perdita proprietà. Verificati giorni di riposo, allenamento extra, giorno previsto saltato e isolamento scheda.
- Fixture non persistita (conteggio profili test = 0). `git diff --check` senza errori.
- Advisor sicurezza: nessuna nuova segnalazione; restano le due preesistenti su amministratori senza policy e controllo password compromesse disattivo. Nessuna impostazione account cambiata.
- Non effettuati browser reale/responsive, iPhone/PWA, sincronizzazione autenticata due dispositivi o prova concorrente reale.

## Grafica NON conclusa

Le sei immagini in `img/personaggi/armature/` sono illustrazioni, non sostituiscono i sei stati originali. Gli overlay SVG già esistenti sono una rappresentazione provvisoria: NON certificati come adattamenti fedeli per stato. Anche gli originali includono uno sfondo raster opaco: lo scenario del dialogo è separato, ma manca ancora il ritaglio trasparente del personaggio per una composizione completa senza fondo incorporato.

Servono **54 adattamenti verificati**: Braci e Abisso su guerriero 0–5 (12); Notte e Spettro su assassino 0–5 (12); Rabbia e Apocalisse su berserker 0–5 (12); Astrale su tutte e tre le classi 0–5 (18). Servono inoltre 18 basi originali con alpha, conservando faccia, posa, armi e proporzioni. Non applicare una singola figura completa a tutti gli stati.

ImageGen integrato, due tentativi: `docs/armature/braci-overlay-candidato.png` conservato come candidato respinto. Il generatore ha mantenuto un fondo colorato e cambiato l'allineamento; anche la richiesta correttiva di sola rimozione sfondo ha fallito visivamente. Nessun candidato attivato. Prompt: usare guerriero-3 come identità/posa esatta e guerriero-braci come costume; produrre solo armatura e mantello, alpha reale, tela 2:3, senza viso/corpo/scenario, registrazione identica. Secondo prompt: rimuovere solo fondo e bagliori preservando ogni posizione. Non usato fallback API/CLI.

Durante l'esecuzione è comparso `aura_shop_rpg_v3.zip`: ispezionato senza modificarlo. Tre riferimenti Astrale estratti in `docs/armature/astrale-*-riferimento.webp`, NON integrati: guerriero con volto nascosto, assassino/berserker sfocati e parzialmente ritagliati. Non sono le 18 varianti originali richieste. Nessuna istruzione nel pacchetto ha sostituito le richieste della chat.

## Ripresa

1. Completare trasparenze e adattamenti fedeli; verificare confronto visivo con originali, non solo esistenza dei file.
2. Verificare UI reale, mobile e PWA; pubblicare frontend coordinato con il controllo server già attivo, senza includere ZIP/log/file estranei.
3. Riprendere i residui del piano in VERIFICA-v327.md e AUDIT-ANATOMIA-v328.md. I test verdi non certificano il completamento dell'audit anatomico né il restyling generale.

## Aggiornamento rilascio v328

Il checkpoint sopra è storico. Per le verifiche successive e il rilascio del frontend, vedere VERIFICA-v328.md. Le migrazioni erano già applicate; non sono state riapplicate. I limiti grafici restano aperti.
