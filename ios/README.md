# Palestra iPhone — IPA gratuito

Questa cartella contiene un'**app iPhone con codice nativo SwiftUI e WKWebView**.
La schermata di allenamento e le funzionalita' sono quelle della PWA online,
perciò non e' una riscrittura completamente nativa di tutta la Palestra.

## Come si ottiene il file IPA senza Mac

1. Vai nella scheda **Actions** del repository GitHub Palestra.
2. Apri il workflow **Compila IPA iPhone gratis**.
3. Premi **Run workflow**, oppure apri un run riuscito dopo una modifica.
4. Nella sezione **Artifacts**, scarica `Palestra-iPhone-IPA-da-firmare`.
5. Estrai lo ZIP dell'artifact: dentro trovi `Palestra-iPhone-unsigned.ipa`.

La compilazione sfrutta un runner macOS standard di GitHub Actions,
gratuito per i repository pubblici. Non richiede certificati Apple nel repository.
L'IPA generato e' **senza firma**, quindi non basta aprirlo dall'iPhone.

## Installazione gratuita da Windows

Usa un programma per firmare e installare un IPA con il tuo account Apple,
ad esempio **Sideloadly** dal sito ufficiale https://sideloadly.io/ .

1. Collega l'iPhone via USB al PC Windows, sbloccalo e autorizza il dispositivo.
2. Apri Sideloadly, seleziona il file `.ipa` e il tuo iPhone.
3. Inserisci il tuo account Apple direttamente nell'app di firma, **mai in GitHub**.
4. Se iOS lo richiede, attiva **Modalita sviluppatore** in Impostazioni > Privacy e sicurezza, e autorizza il profilo in Impostazioni > Generali > VPN e gestione dispositivo.
5. Avvia Palestra dalla schermata Home.

Con account Apple gratuito le firme scadono **ogni sette giorni**; si possono
rinnovare con Sideloadly. L'app e' installabile personalmente, **non distribuita
sull'App Store**.

## Protezione dei dati e limiti

- La PWA di Safari e la versione iOS WebKit hanno archivi locali separati.
- **Non disinstallare la PWA** prima di verificare accesso, progressi, sincronizzazione,
  microfono e offline sulla nuova app.
- Dopo aver installato la IPA, effettua un nuovo login; saranno disponibili
  solamente i dati che sono stati sincronizzati nel cloud.
- L'IPA non incorpora l'intero catalogo offline: il primo caricamento usa rete,
  e la modalita' offline va provata sul dispositivo.
- Il permesso microfono e' richiesto soltanto per il sito Palestra.
- Il workflow non gestisce account Apple, password o certificati.
