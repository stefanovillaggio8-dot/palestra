# avvia-whatsapp.ps1 -- apre WhatsApp Web in un Chrome SEPARATO, con la porta di debug.
#
# Un profilo nuovo (non quello di Ste): cosi' non si tocca la sua sessione e la
# pagina parte pulita, col QR da scansionare col telefono.
# Dopo si lancia: node tools/whatsapp-estrai.mjs <cartella>

$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$profilo = "$env:TEMP\opencode\chrome-whatsapp"
if (-not (Test-Path $profilo)) { New-Item -ItemType Directory -Path $profilo -Force | Out-Null }

Start-Process -FilePath $chrome -ArgumentList @(
  "--remote-debugging-port=9222",
  "--user-data-dir=$profilo",
  "--no-first-run",
  "--no-default-browser-check",
  "--window-position=0,0",
  "--window-size=1200,900",
  "https://web.whatsapp.com/"
)
"Chrome aperto con la porta 9222. Il QR e' sullo schermo: scansionalo col telefono."
