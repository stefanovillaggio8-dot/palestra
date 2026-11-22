#!/usr/bin/env python3
"""v539: separa la magia dell'atlante approvato dai resti delle figure/riquadri.
NON ricostruisce, inventa, colora o ridisegna alcun VFX: riusa i pixel RGB
originali v537 e modifica esclusivamente il CANALE ALPHA.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "img/effetti/effetti-reference-v537.webp"
TARGET = ROOT / "img/effetti/effetti-reference-v539.webp"
im = Image.open(SOURCE).convert("RGBA")
assert im.size == (1380, 884), im.size
W,H=460,442
atlas = Image.new("RGBA", im.size, (0,0,0,0))
# Assegnazioni identiche all'atlante precedente (3 colonne x 2 righe).
EFFECTS = [
    ("ambra",0,0),("ombra",1,0),("fulmine",2,0),
    ("nebula",0,1),("astrale",1,1),
]
# Il foro che l'effetto non deve occupare coincide con la figura ESTRANEA
# comparsa nel collage di approvazione, non con il personaggio nuovo.
# Contorno stretto: tutte le scie esterne, le basi e la nebulosa rimangono.
SILHOUETTE = {
 "ambra":[(.48,.065),(.42,.08),(.37,.13),(.36,.21),(.31,.29),(.30,.49),(.32,.72),(.34,.87),(.38,.96),(.68,.96),(.71,.82),(.72,.52),(.70,.28),(.64,.19),(.61,.09),(.55,.064)],
 "ombra":[(.50,.065),(.44,.08),(.41,.14),(.39,.22),(.35,.31),(.35,.72),(.39,.92),(.42,.97),(.70,.97),(.75,.81),(.72,.27),(.67,.17),(.61,.085),(.55,.065)],
 "fulmine":[(.51,.085),(.43,.10),(.39,.17),(.37,.30),(.35,.50),(.35,.87),(.40,.97),(.71,.97),(.72,.72),(.74,.32),(.69,.15),(.61,.085)],
 "nebula":[(.49,.06),(.42,.08),(.39,.15),(.36,.25),(.34,.56),(.36,.82),(.41,.96),(.67,.97),(.70,.79),(.74,.44),(.71,.22),(.61,.09),(.55,.06)],
 "astrale":[(.50,.05),(.45,.08),(.38,.15),(.34,.31),(.34,.75),(.40,.96),(.66,.97),(.72,.71),(.71,.26),(.64,.12),(.56,.048)],
}
def strength(name,r,g,b):
    mx=max(r,g,b); mn=min(r,g,b)
    if mx<55: return 0.0
    if name=="ambra":
        # Ambra conserva le fiamme gialle/arancio; perde i muri marroni.
        if r<102 or g<22 or r<g*1.12 or r<b*1.18: return 0.0
        return min(1.0,max(0.0,(r-87)/90)) * min(1.0,(r-g+30)/75)
    if name=="nebula":
        if b<65 or (b<g*1.19 and r<g*1.25):return 0.0
        return min(1.0,max(0.0,(max(r,b)-54)/78))*min(1.0,max(0.0,(max(r,b)-g)/32))
    if name=="fulmine":
        if max(r,b)<105 or b<g*1.17:return 0.0
        return min(1.0,max(0.0,(max(r,b)-87)/85))*min(1.0,max(0.0,(max(r,b)-g)/30))
    if name=="ombra" or name=="astrale":
        if b<60 or (b<g*1.16 and r<g*1.3):return 0.0
        return min(1.0,max(0.0,(max(r,b)-48)/85))*min(1.0,max(0.0,(max(r,b)-g)/36))
    return 0.0

for name, col,row in EFFECTS:
    original=im.crop((col*W,row*H,(col+1)*W,(row+1)*H))
    original_pixels=original.load()
    out=Image.new("RGBA",(W,H),(0,0,0,0))
    pix=out.load()
    # Prima selezioniamo SOLO le luci e i volumi cromatici dall'asset
    # (il canale RGB rimane identico, non esiste una ricreazione grafica).
    for y in range(H):
        for x in range(W):
            r,g,b,a=original_pixels[x,y]
            if a<8:continue
            k=strength(name,r,g,b)
            if k<=0:continue
            # Attenua fondali rettangolari uniformi: intensita' minima per
            # grandi aree colorate, invariata sulle scintille piu' luminose.
            alpha=round(a*k)
            if alpha>3:pix[x,y]=(r,g,b,alpha)
    # Residuo della figura fonte: una maschera morbida rimuove SOLO il vecchio
    # eroe e mai la nuova foto (che viene disegnata separatamente sopra).
    hole=Image.new("L",(W,H),0)
    draw=ImageDraw.Draw(hole)
    draw.polygon([(round(x*W),round(y*H)) for x,y in SILHOUETTE[name]],fill=255)
    hole=hole.filter(ImageFilter.GaussianBlur(3))
    alpha=out.getchannel("A")
    alpha=Image.composite(Image.new("L",(W,H),0),alpha,hole)
    # Ancora qualche pixel puo' essere semi-trasparente al bordo; conserva
    # la dissolvenza corretta dell'effetto gia' presente.
    out.putalpha(alpha)
    # La sesta cella e' davvero vuota: non deve contenere fasce viola
    # provenienti dallo screenshot originale.
    atlas.paste(out,(col*W,row*H))
    mask=out.getchannel("A")
    count=sum(1 for p in mask.getdata() if p>=20)
    assert count>2500,(name,count)
    print(f"REFERENCE_V539 {name}: {count} pixel alpha / {W*H} (RGB intatto)")
atlas.save(TARGET,format="WEBP",lossless=True,method=5,exact=True)
print(f"CREATED {TARGET} bytes={TARGET.stat().st_size}")
assert TARGET.stat().st_size>60000
