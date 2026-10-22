// compone-personaggio: mette l'equipaggiamento ADDOSSO al personaggio.
//
// Ste (10/10/2026): "ogni volta che sblocco qualcosa quell'immagine deve vedersi
// meglio e si devono indossare automaticamente al personaggio e comunque ritaglia
// meglio le immagini".
//
// LA COLONNA DEI PEZZI.
//
// Nella scheda, a destra di ogni classe, ci sono sei riquadri: INIZIO, BRACCIALI, il
// capo della classe, il terzo pezzo, l'arma, COMPLETO. Non sono la figura intera
// ogni volta: sono il PEZZO. Il bracciale è il bracciale, la corazza è la corazza.
//
// IL RITAGLIO VA FATTO DENTRO I BORDI.
//
// I riquadri hanno una cornice chiara. Se si taglia a occhio si prende anche il
// bordo, e sul personaggio compare una linea bianca di traverso. Quindi qui i
// bordi sono misurati dalla luminosità dell'immagine e il ritaglio parte da due
// pixel dentro.
//
// LO SFONDO È NERO, NON TRASPARENTE.
//
// Se lo incollassimo così comparirebbero rettangoli neri. La CHIAVE DI LUMINOSITÀ
// mette alpha 0 dove il pixel è scuro: i pezzi sono illuminati su un fondo quasi
// nero, quindi il fondo sparisce e il pezzo resta.
//
// PERCHÉ SI COMPONE QUI E NON IN CSS.
//
// In CSS servirebbero `mix-blend-mode` e posizionamenti che cambiano da telefono a
// telefono, e il risultato sarebbe diverso su ogni schermo. Qui si compone una volta
// sola: l'app mostra un'immagine sola, già pronta, e quello che vedi è esattamente
// quello che è stato costruito.
//
// GLI STATI SONO CUMULATIVI.
//
// Lo stato 3 vuol dire bracciali + capo + protezione + arma insieme. Non si riparte
// da capo: è la stessa regola dell'app, dove un pezzo sbloccato non si tocca mai.

import { existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SRC = `${process.env.USERPROFILE}/Downloads/rpg.png`;
const BASE = `${process.env.USERPROFILE}/Documents/Default Project/palestra`;
const TMP = `${process.env.TEMP}/opencode/compone`;
const OUT = `${BASE}/img/personaggi/stati`;

if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

/**
 * La colonna di ogni classe: `x1` e `x2` sono i bordi misurati, e `c` è lo scarto
 * fra una classe e la successiva (341 px, un terzo di 1024).
 */
const CLASSI = [
  { id: 'guerriero', x1: 257, x2: 316 },
  { id: 'berserker', x1: 598, x2: 657 },
  { id: 'assassino', x1: 946, x2: 1000 },
];

/**
 * I SEI PEZZI: dove inizia e finisce nella colonna, dentro i bordi.
 *
 * I numeri vengono dai bordi orizzontali misurati: 184 e 239 sono la cornice sopra e
 * sotto il riquadro dei bracciali, quindi il pezzo è 187..237.
 */
const CASELLE = [
  { nome: 'inizio', y1: 113, y2: 182 },
  { nome: 'bracciali', y1: 187, y2: 237 },
  { nome: 'torso', y1: 270, y2: 321 },
  { nome: 'protezione', y1: 355, y2: 412 },
  { nome: 'arma', y1: 440, y2: 499 },
  { nome: 'completo', y1: 528, y2: 633 },
];

/**
 * DOVE VA OGNI PEZZO SUL PERSONAGGIO.
 *
 * Le misure sono dalla foto del personaggio con una griglia sopra. Il personaggio è
 * 226-232 px di larghezza e 540 di altezza: il petto sta fra y 90 e 200, gli
 * avambracci fra 195 e 265, la vita intorno a 195, le mani intorno a 265.
 *
 * `scala` è la larghezza del pezzo sulla foto, `rot` i gradi per piegarlo sulla
 * direzione del braccio o dell'arma.
 *
 * I BRACCIALI SONO DUE PEZZI, NON UNO.
 *
 * Nel riquadro della scheda sono disegnati uno di fianco all'altro, cioè come
 * arrivano quando sono già addosso a qualcuno. Sul personaggio in piedi le braccia
 * sono ai lati del corpo, a una quarantina di pixel una dall'altra: metterli
 * insieme finirebbe tutto su un braccio solo, o a cavallo del petto. Quindi il
 * pezzo viene tagliato a metà e le due metà vanno una per braccio (`braccia: 2`).
 */
const POSI = {
  guerriero: {
    bracciali: { scala: 40, rot: -6, braccia: 2, bracciaX: [-52, 52], y: 206 },
    torso: { scala: 132, rot: 0, dx: 0, dy: 86 },
    protezione: { scala: 142, rot: 0, dx: 0, dy: 82 },
    arma: { scala: 150, rot: 40, dx: 8, dy: 252 },
    completo: { scala: 176, rot: 0, dx: 0, dy: 28 },
  },
  berserker: {
    bracciali: { scala: 42, rot: -6, braccia: 2, bracciaX: [-54, 54], y: 206 },
    torso: { scala: 120, rot: 0, dx: 18, dy: 90 },
    protezione: { scala: 142, rot: 0, dx: 0, dy: 82 },
    arma: { scala: 160, rot: 32, dx: -8, dy: 254 },
    completo: { scala: 180, rot: 0, dx: 0, dy: 24 },
  },
  assassino: {
    bracciali: { scala: 40, rot: -8, braccia: 2, bracciaX: [-46, 74], y: 208 },
    torso: { scala: 126, rot: 0, dx: 0, dy: 84 },
    protezione: { scala: 136, rot: 0, dx: 0, dy: 170 },
    arma: { scala: 140, rot: 30, dx: -12, dy: 254 },
    completo: { scala: 180, rot: 0, dx: 0, dy: 22 },
  },
};

const PS = 'Add-Type -AssemblyName System.Drawing;';
function ps(s) {
  execFileSync('powershell', ['-NoProfile', '-Command', PS + s], { stdio: 'pipe' });
}

/** Ritaglia il pezzo DENTRO i bordi e gli rende lo sfondo trasparente. */
function prepara(classe, casella) {
  const c = CLASSI.find((k) => k.id === classe);
  const x = c.x1;
  const w = c.x2 - c.x1;
  const h = casella.y2 - casella.y1;
  const grezzo = `${TMP}/${classe}-${casella.nome}.png`;
  const out = `${TMP}/${classe}-${casella.nome}-c.png`;

  ps(`
$src = [System.Drawing.Bitmap]::FromFile('${SRC}')
$dst = New-Object System.Drawing.Rectangle(0, 0, ${w}, ${h})
$box = New-Object System.Drawing.Rectangle(${c.x1}, ${casella.y1}, ${w}, ${h})
$bmp = New-Object System.Drawing.Bitmap(${w}, ${h}, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($src, $dst, $box, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$bmp.Save('${grezzo}', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose(); $src.Dispose()
`);

  // LA CHIAVE DI LUMINOSITÀ, CON I NUMERI MISURATI.
  //
  // La prima volta le soglie erano 20 e 52, scritte a occhio. Misurando la
  // distribuzione reale di un pezzo è venuto fuori che il 60% dei pixel sta a
  // luminosità 9 e 10 — quello è lo sfondo — e il 90% è a 22-35, mentre la parte
  // illuminata arriva a 100-150.
  //
  // Con le soglie vecchie la maggior parte del pezzo finiva sotto la soglia e
  // diventava trasparente: sull'app si vedevano due macchioline sul petto e
  // sembrava che i pezzi non esistessero. Non era un problema di posizione: era
  // la chiave che cancellava il pezzo.
  //
  // Quindi: sotto 9 è vuoto, sopra 38 il soggetto è per intero, e nel mezzo la
  // transizione morbida, altrimenti il bordo del ritaglio avrebbe lo scalino.
  const basso = 9;
  const alto = 38;
  ps(`
$src = [System.Drawing.Bitmap]::FromFile('${grezzo}')
$bmp = New-Object System.Drawing.Bitmap($src.Width, $src.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
for ($y=0; $y -lt $src.Height; $y++) {
  for ($x=0; $x -lt $src.Width; $x++) {
    $p = $src.GetPixel($x, $y)
    $lum = 0.299*$p.R + 0.587*$p.G + 0.114*$p.B
    $a = ($lum - ${basso}) * 255 / (${alto} - ${basso})
    if ($a -lt 0) { $a = 0 }; if ($a -gt 255) { $a = 255 }
    $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb([int]$a, $p.R, $p.G, $p.B))
  }
}
$bmp.Save('${out}', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose(); $src.Dispose()
`);
  return out;
}

/** Compone il personaggio con tutti i pezzi fino a `fino`. */
function componi(classe, pezzi, fino, salva) {
  const foto = `${BASE}/img/personaggi/${classe}.png`;
  const posizioni = POSI[classe];

  const caricamenti = [];
  const disegni = [];
  pezzi.slice(1, fino + 1).forEach((file, k) => {
    const idx = k + 1;
    const nome = CASELLE[idx].nome;
    const pos = posizioni[nome];

    if (pos.braccia === 2) {
      // I due bracciali: metà del pezzo per braccio. Il pezzo viene prima tagliato
      // in due, altrimenti si metterebbero entrambi dove uno solo.
      // Le metà si calcolano PRIA in variabili: PowerShell non digerisce una
      // sottrazione dentro gli argomenti di `New-Object` e lo interpreta come una
      // lista di oggetti. Dentro `New-Object` ci va solo il nome della variabile.
      caricamenti.push(`
$mA${idx} = [System.Drawing.Bitmap]::FromFile('${file}')
$metaL${idx} = [int]($mA${idx}.Width / 2)
$metaD${idx} = $mA${idx}.Width - $metaL${idx}
$meta${idx} = New-Object System.Drawing.Bitmap($metaL${idx}, $mA${idx}.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gm${idx} = [System.Drawing.Graphics]::FromImage($meta${idx})
$dstM${idx} = New-Object System.Drawing.Rectangle(0, 0, $metaL${idx}, $mA${idx}.Height)
$srcM${idx} = New-Object System.Drawing.Rectangle(0, 0, $metaL${idx}, $mA${idx}.Height)
$gm${idx}.DrawImage($mA${idx}, $dstM${idx}, $srcM${idx}, [System.Drawing.GraphicsUnit]::Pixel)
$gm${idx}.Dispose()
$dB${idx} = New-Object System.Drawing.Bitmap($metaD${idx}, $mA${idx}.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gd${idx} = [System.Drawing.Graphics]::FromImage($dB${idx})
$dstD${idx} = New-Object System.Drawing.Rectangle(0, 0, $metaD${idx}, $mA${idx}.Height)
$srcD${idx} = New-Object System.Drawing.Rectangle($metaL${idx}, 0, $metaD${idx}, $mA${idx}.Height)
$gd${idx}.DrawImage($mA${idx}, $dstD${idx}, $srcD${idx}, [System.Drawing.GraphicsUnit]::Pixel)
$gd${idx}.Dispose()
$mA${idx}.Dispose()`);
      [pos.bracciaX[0], pos.bracciaX[1]].forEach((dx, n) => {
        // `$` DAVANTI al nome: senza, PowerShell scrive `meta1` invece di `$meta1` e
        // non sa cosa sia. Il dollare va messo qui, una volta sola.
        const v = n === 0 ? `$meta${idx}` : `$dB${idx}`;
        disegni.push(`
$scala = ${pos.scala}
$dh = [int](${v}.Height * $scala / ${v}.Width)
$cx = $corpo.Width / 2 + ${dx}
$g.TranslateTransform($cx, [int](${pos.y} + $dh / 2))
$g.RotateTransform(${pos.rot})
$g.DrawImage(${v}, (New-Object System.Drawing.Rectangle([int](-$scala / 2), [int](-$dh / 2), [int]$scala, $dh)), (New-Object System.Drawing.Rectangle(0, 0, ${v}.Width, ${v}.Height)), [System.Drawing.GraphicsUnit]::Pixel)
$g.ResetTransform()`);
      });
      return;
    }

    caricamenti.push(`$p${idx} = [System.Drawing.Bitmap]::FromFile('${file}')`);
    disegni.push(`
$scala = ${pos.scala}
$dh = [int]($p${idx}.Height * $scala / $p${idx}.Width)
$cx = $corpo.Width / 2 + ${pos.dx || 0}
$cy = ${pos.dy} + $dh / 2
$g.TranslateTransform($cx, $cy)
$g.RotateTransform(${pos.rot || 0})
$g.DrawImage($p${idx}, (New-Object System.Drawing.Rectangle([int](-$scala / 2), [int](-$dh / 2), [int]$scala, $dh)), (New-Object System.Drawing.Rectangle(0, 0, $p${idx}.Width, $p${idx}.Height)), [System.Drawing.GraphicsUnit]::Pixel)
$g.ResetTransform()`);
  });

  // La pulizia deve sapere che cosa è stato caricato davvero: per i bracciali la
  // variabile è `$mA<n>` e non `$p<n>`, quindi liberare sempre `$p<n>` provava a
  // chiudere qualcosa che non esiste e il comando falliva DOPO aver salvato
  // l'immagine. Il risultato era giusto, ma il comando sembrava rotto.
  const pulizie = [];
  pezzi.slice(1, fino + 1).forEach((_, k) => {
    const idx = k + 1;
    const nome = CASELLE[idx].nome;
    if (posizioni[nome].braccia === 2) {
      pulizie.push(`$meta${idx}.Dispose(); $dB${idx}.Dispose()`);
    } else {
      pulizie.push(`$p${idx}.Dispose()`);
    }
  });

  ps(`
$corpo = [System.Drawing.Bitmap]::FromFile('${foto}')
$bmp = New-Object System.Drawing.Bitmap($corpo.Width, $corpo.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g0 = [System.Drawing.Graphics]::FromImage($bmp)
$g0.Clear([System.Drawing.Color]::Transparent)
$g0.DrawImage($corpo, 0, 0)
$g0.Dispose()
${caricamenti.join('\n')}
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = 'HighQualityBicubic'
$g.PixelOffsetMode = 'HighQuality'
$g.CompositingQuality = 'HighQuality'
$g.SmoothingMode = 'HighQuality'
${disegni.join('\n')}
$g.Dispose()
$bmp.Save('${salva}', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose(); $corpo.Dispose()
${pulizie.join('\n')}
`);
}

for (const classe of CLASSI) {
  const foto = `${BASE}/img/personaggi/${classe.id}.png`;
  if (!existsSync(foto)) { console.log(`  ${classe.id}: manca la foto`); continue; }
  const pezzi = [null];
  for (let i = 1; i < CASELLE.length; i++) pezzi.push(prepara(classe.id, CASELLE[i]));
  for (let stato = 0; stato < CASELLE.length; stato++) {
    componi(classe.id, pezzi, stato, `${OUT}/${classe.id}-${stato}.png`);
  }
  console.log(`  ${classe.id}: ${CASELLE.length} stati`);
}

console.log('fatto');