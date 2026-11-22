#!/usr/bin/env python3
"""v540: ripara le basi mancanti senza ripristinare i vecchi avatar.
La v539 ha cancellato un poligono fino a y=.97: portando via il pavimento.
Ripristina una piattaforma continua nello STESSO colore e stile dei pixel
sopravvissuti e mette gli effetti ORIGINALI sopra, senza ritagliarli ancora.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from math import cos,sin,pi,sqrt,exp
import random

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"img/effetti/effetti-reference-v539.webp"
TARGET=ROOT/"img/effetti/effetti-reference-v540.webp"
old=Image.open(SOURCE).convert("RGBA")
assert old.size==(1380,884)
W,H=460,442
atlas=Image.new("RGBA",old.size,(0,0,0,0))
cells=[("ambra",0,0),("ombra",1,0),("fulmine",2,0),("nebula",0,1),("astrale",1,1)]
palette={
 "ambra":((255,109,17),(255,183,73)),
 "ombra":((136,54,231),(211,93,255)),
 "fulmine":((125,55,251),(208,124,255)),
 "nebula":((28,143,255),(196,67,255)),
 "astrale":((170,48,247),(244,122,255)),
}
def clip(x):return max(0,min(255,round(x)))
for label,col,row in cells:
    src=old.crop((col*W,row*H,(col+1)*W,(row+1)*H))
    base=Image.new("RGBA",(W,H),(0,0,0,0))
    px=base.load()
    primary,bright=palette[label]
    rng=random.Random(54000+col+row*3)
    # Base elliptica ai piedi, non un disco verticale o un nuovo fondale.
    # Le arcate esterne del WebP 539 rimangono IDENTICHE: questa fase
    # ricostruisce solo ciò che il poligono di cancellazione aveva tolto.
    cx,cy=.50*W,.886*H
    rx,ry=.465*W,.093*H
    for y in range(int(.763*H),H):
        for x in range(W):
            dx=(x-cx)/rx
            dy=(y-cy)/ry
            r=sqrt(dx*dx+dy*dy)
            if r>1.23:continue
            # Bagliore tenue sul piano, sotto il vero personaggio.
            inner=exp(-((r/.80)**4))*0.10
            outer=exp(-((r-1)/.100)**2)*.21
            ring=exp(-((r-1.00)/.027)**2)*.54
            ring2=exp(-((r-.84)/.021)**2)*.33
            ring3=exp(-((r-.63)/.017)**2)*.12
            a=clip(255*(inner+outer+ring+ring2+ring3))
            if not a:continue
            mix=.24 if r<.65 else .55
            rr=primary[0]*(1-mix)+bright[0]*mix
            gg=primary[1]*(1-mix)+bright[1]*mix
            bb=primary[2]*(1-mix)+bright[2]*mix
            shimmer=.87+.16*rng.random()
            px[x,y]=(clip(rr*shimmer),clip(gg*shimmer),clip(bb*shimmer),a)
    # Iscrizioni e segni sul bordo della base, anch'essi DIETRO la figura.
    marks=Image.new("RGBA",(W,H),(0,0,0,0))
    d=ImageDraw.Draw(marks,"RGBA")
    for k in range(32):
        t=2*pi*k/32
        a1=(cx+rx*.87*cos(t),cy+ry*.87*sin(t))
        a2=(cx+rx*.96*cos(t+.007),cy+ry*.96*sin(t+.007))
        d.line([a1,a2],fill=(*bright,148),width=2 if k%4==0 else 1)
        if k%4==0:
            r1=(cx+rx*.75*cos(t),cy+ry*.75*sin(t))
            r2=(cx+rx*.82*cos(t+.030),cy+ry*.82*sin(t+.030))
            d.line([r1,r2],fill=(*bright,110),width=2)
    for scale,alpha in [(.98,125),(.83,98),(.63,32)]:
        box=(cx-rx*scale,cy-ry*scale,cx+rx*scale,cy+ry*scale)
        d.ellipse(box,outline=(*bright,alpha),width=2)
    haze=marks.filter(ImageFilter.GaussianBlur(3.1))
    haze.putalpha(haze.getchannel("A").point(lambda n:clip(n*.38)))
    base=Image.alpha_composite(base,haze)
    base=Image.alpha_composite(base,marks)
    # Una luce di appoggio NON blocca le scie, né nasconde il bordo originale.
    repaired=Image.alpha_composite(base,src)
    atlas.paste(repaired,(col*W,row*H))
    # Verifica 4 punti sulla mezzeria a livello della base: la v539
    # li aveva resi trasparenti cancellando fino a 97% del pannello.
    middle=[repaired.getpixel((W//2,y))[3] for y in (int(.80*H),int(.84*H),int(.89*H),int(.93*H))]
    assert max(middle)>=65,(label,middle)
    print("BASE_V540",label,"center_alpha",middle,flush=True)
# L'ultima cella rimane trasparente: niente barre viola estranee.
assert atlas.getpixel((1320,850))[3]==0
atlas.save(TARGET,format="WEBP",lossless=True,method=5,exact=True)
assert TARGET.stat().st_size>300000
print("CREATED",TARGET,TARGET.stat().st_size,flush=True)
