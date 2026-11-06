#!/usr/bin/env python3
"""v435: riusa i PIXEL della foto CAD Curl gia' approvata, senza cambiarne la posa.
Allinea lo sfondo al viola delle foto esercizi; normalizza solo i ritagli
verificati visivamente. Il processo e' one-shot: salva la fonte originale.
"""
from pathlib import Path
from io import BytesIO
import numpy as np
import cv2
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / "img" / "esercizi"
ORIGINALE = IMG / "cad-curl-app.jpg"
BACKUP = IMG / "cad-curl-originale-v435.jpg"

# Zoom molto moderati; il soggetto e l'attrezzatura restano per intero
# nell'immagine quadrata, anche nelle miniature del telefono.
ZOOM = {
    "db-lateral-raise.png": 1.30,
    "lat-pulldown-lats.png": 1.30,
    "ez-bar-preacher-curl.png": 1.18,
    "dumbbell-curl.png": 1.18,
    "seated-hammer-curl.png": 1.14,
    "bench-press.png": 1.15,
    "dumbbell-bench-pull.png": 1.15,
    "decline-dumbbell-bench-press.png": 1.15,
    "hammer-curl-dumbbell.png": 1.15,
    "iso-lateral-row.png": 1.15,
    "back-extension.png": 1.16,
}

def risistema_sfondo_cad():
    originale = Image.open(ORIGINALE).convert("RGB")
    assert originale.size == (220, 220), "CAD Curl originale cambiato: fermo l'edit"
    im = np.asarray(originale)
    h, w = im.shape[:2]
    r, g, b = (im[:, :, n].astype(np.int16) for n in range(3))
    lum = (r + g + b) / 3
    chroma = np.max(im, axis=2).astype(int) - np.min(im, axis=2).astype(int)
    neutro = chroma < 13
    # Fondo grigio 192-208. Manteniamo gli altri pixel della foto,
    # inclusi l'atleta reclinato, il supporto Scott e i due manubri.
    mask = np.ones((h, w), dtype=np.uint8) * cv2.GC_PR_FGD
    mask[neutro & (lum > 182) & (lum < 222)] = cv2.GC_PR_BGD
    mask[(lum < 120) | ((r - g) > 22) | ((b - r) > 25)] = cv2.GC_FGD
    mask[:3, :] = cv2.GC_BGD
    mask[:, :3] = cv2.GC_BGD
    mask[-1:, :] = cv2.GC_PR_BGD
    cv2.grabCut(cv2.cvtColor(im, cv2.COLOR_RGB2BGR), mask, None,
                np.zeros((1, 65), np.float64),
                np.zeros((1, 65), np.float64), 7, cv2.GC_INIT_WITH_MASK)
    alpha = (np.where((mask == cv2.GC_PR_BGD) | (mask == cv2.GC_BGD), 0, 255)).astype("uint8")
    alpha[neutro & (lum > 165) & (lum < 223)] = 0
    Y, X = np.indices((h, w))
    # Le due scarpe bianche sono sul fondo grigio: salvaguardiamo i pixel
    # del loro contorno senza portare con noi il tappeto grigio dello studio.
    zone_scarpe = np.zeros((h, w), dtype="uint8")
    cv2.fillPoly(zone_scarpe, [np.array(p, np.int32) for p in [
        [(158,164),(182,171),(201,181),(218,184),(219,196),
         (205,200),(184,200),(171,189)],
        [(150,175),(162,177),(175,193),(194,198),(208,206),
         (206,215),(155,215),(149,199)],
    ]], 1)
    zona = zone_scarpe.astype(bool)
    bianco_scarpe = np.uint8(zona & (lum >= 213))
    bianco_scarpe = cv2.morphologyEx(bianco_scarpe, cv2.MORPH_CLOSE,
                                   np.ones((9,9), np.uint8))
    zona_scarpe_visibile = (cv2.dilate(bianco_scarpe,
                               np.ones((5,5), np.uint8), iterations=1) > 0) & zona
    alpha[zona_scarpe_visibile] = 255
    alpha[(Y >= 213) & ~zona_scarpe_visibile] = 0
    # Togli il rumore JPEG isolato sul fondo.
    n, labs, stats, _ = cv2.connectedComponentsWithStats(alpha, 8)
    for k in range(1, n):
        if stats[k, 4] < 9:
            alpha[labs == k] = 0
    trasparenza = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8))
    rad = np.sqrt(((X - 110)/145)**2 + ((Y - 110)/145)**2)
    glow = np.clip(1 - rad, 0, 1)
    violet = np.stack([27 + 31 * glow, 3 + 12 * glow, 40 + 39 * glow],
                      axis=-1).astype("uint8")
    finale = Image.composite(originale, Image.fromarray(violet), trasparenza)
    assert finale.size == originale.size
    # Il file usato dall'app mantiene il nome storico; nessun record va migrato.
    finale.save(ORIGINALE, quality=93, subsampling=0, optimize=True)
    print("CAD originale: foto e posa conservate, nuovo sfondo viola")

def correggi_zoom():
    for nome, zoom in ZOOM.items():
        path = IMG / nome
        with Image.open(path) as foto:
            foto = foto.convert("RGBA")
            w, h = foto.size
            assert w == h and w >= 104, nome + ": geometria inattesa"
            grande = foto.resize((round(w * zoom), round(h * zoom)),
                                 Image.Resampling.LANCZOS)
            x = (grande.width - w) // 2
            y = (grande.height - h) // 2
            final = grande.crop((x, y, x+w, y+h))
            final.save(path, optimize=True)
        print(nome, "zoom", zoom, "px", w)

def main():
    if BACKUP.exists():
        raise SystemExit("v435 gia' applicata: nessuna seconda scalatura")
    BACKUP.write_bytes(ORIGINALE.read_bytes())
    risistema_sfondo_cad()
    correggi_zoom()
    print("OK: foto CAD e 11 ritagli, backup fonte originale preservato")

if __name__ == "__main__":
    main()
