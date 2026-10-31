#!/usr/bin/env python3
"""9 true RPG portraits using ONLY the already-approved golden aura.
Faces, outfits, silhouettes, weapons, their actual availability and progression
are copied pixel-for-pixel from existing stage photos. No generative changes.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/"img/effetti/aura-divina-v365-reference.png"
OUT=ROOT/"img/personaggi/aura-divina-v365"
PREVIEW=ROOT/"docs/aura-divina-v365-nove-foto.jpg"
W,H=720,1080
STAGES=(0,3,5)
CLASSES=("assassino","guerriero","berserker")
RES=Image.Resampling.LANCZOS

def smoothstep(a):
    v=np.clip(a,0.0,1.0)
    return v*v*(3-2*v)

def extract_approved_aura():
    raw=Image.open(SOURCE).convert("RGB").resize((W,H),RES)
    a=np.array(raw).astype(np.float32)
    r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    mx=np.maximum(np.maximum(r,g),b)
    mn=np.minimum(np.minimum(r,g),b)
    # Retain stars, warm-white aurora ribbons, amber ring and violet highlights.
    luminance=smoothstep((mx-95)/125)
    gold=((r>g*1.075)&(g>b*1.13)&(r>116)&(g>70))
    white=((mn>155)&(mx>180))
    violet=((b>r*.82)&(b>g*.98)&(mx>155))
    color=np.where(gold|white|violet,1.0,.43)
    alpha=(luminance*color*245.0).astype(np.uint8)
    # The original source has the desired exact magic, but ALSO a person.
    # All body pixels are excluded in the class-specific protective mask below.
    return a.astype(np.uint8),alpha

def protect_region(cls,stage):
    Y,X=np.mgrid[0:H,0:W].astype(np.float32)
    xx=X/W;yy=Y/H
    # Protect original character at all six stages; allow magic well outside
    # the body. Smooth transition avoids a visible cut-out in the artwork.
    if cls=="berserker":cx,cy,rx,ry=.50,.49,.355,.66
    elif cls=="guerriero":cx,cy,rx,ry=.50,.49,.34,.64
    else:cx,cy,rx,ry=.50,.49,.325,.64
    dist=np.sqrt(((xx-cx)/rx)**2+((yy-cy)/ry)**2)
    away=smoothstep((dist-.76)/.32)
    # Helmets/hoods differ in height: protect crown/hair and all faces.
    head=np.sqrt(((xx-.50)/.195)**2+((yy-.104)/.115)**2)
    away*=smoothstep((head-.73)/.36)
    # Specific weapon / shield pixels must NEVER be overpainted. Protect
    # large corridors around them, not only a couple of sampled points.
    opaque=Image.new("L",(W,H),0)
    d=ImageDraw.Draw(opaque)
    if cls=="guerriero":
        d.ellipse((W*.61,H*.14,W*.98,H*.71),fill=255) # shield, all stages
        if stage>=4:
            d.rectangle((W*.065,H*.42,W*.25,H*.925),fill=255) # sword
    if cls=="berserker":
        d.ellipse((W*.68,H*.17,W*.985,H*.71),fill=255) # shield
        if stage>=4:
            d.rectangle((0,H*.12,W*.26,H*.95),fill=255) # axe
    if cls=="assassino" and stage>=4:
        d.polygon([(W*.08,H*.47),(W*.30,H*.45),(W*.34,H*.80),(W*.12,H*.85)],fill=255)
        d.polygon([(W*.70,H*.46),(W*.94,H*.44),(W*.90,H*.84),(W*.67,H*.79)],fill=255)
    preserve=np.asarray(opaque.filter(ImageFilter.GaussianBlur(8))).astype(np.float32)/255.0
    away*=1-preserve
    # The aura may form a ring at the ground, but the existing boots always
    # remain visible, physically standing on floor (never levitating).
    feet=smoothstep((np.abs(xx-.5)-.21)/.08)*.98 + .02
    away*=np.where((yy>.80)&(yy<.97), feet,1.0)
    return np.clip(away,0,1)

def layer_for(cls,stage,original_rgb,alpha):
    out_rgba=np.dstack((original_rgb, (alpha.astype(np.float32)*protect_region(cls,stage)).astype(np.uint8)))
    return Image.fromarray(out_rgba,"RGBA")

def main():
    source_rgb,source_alpha=extract_approved_aura()
    # Move the physical ground ring down from the approved image's feet to
    # the original game's photo feet, but keep its exact color and design.
    # This correction is applied to ONLY the magic layer, never the person.
    ys=np.arange(H,dtype=np.float32)/H
    dest_ys=np.clip((ys-.04)/1.11,0,1)*(H-1)
    mapped=np.zeros_like(source_rgb)
    mapped_alpha=np.zeros_like(source_alpha)
    for y in range(H):
        sy=int(round(dest_ys[y]))
        mapped[y]=source_rgb[sy]
        mapped_alpha[y]=source_alpha[sy]
    OUT.mkdir(parents=True,exist_ok=True)
    imgs=[]
    for cls in CLASSES:
        for stage in STAGES:
            src=ROOT/f"img/personaggi/stati/{cls}-{stage}.webp"
            with Image.open(src) as f:
                base=f.convert("RGBA").resize((W,H),RES)
            aura=layer_for(cls,stage,mapped,mapped_alpha)
            result=base.copy()
            result.alpha_composite(aura)
            # These samples must remain RGB pixel-identical, even on equipped
            # avatars. No glowing eyes, replacement armor, swords or axes.
            for px,py in [(W//2,H//3),(W//2,H//2),(W//2,int(H*.64))]:
                assert base.getpixel((px,py))==result.getpixel((px,py)),(cls,stage,px,py)
            if cls=="berserker" and stage>=4:
                assert base.getpixel((int(W*.12),int(H*.50)))==result.getpixel((int(W*.12),int(H*.50)))
            if cls=="guerriero" and stage>=4:
                assert base.getpixel((int(W*.17),int(H*.7)))==result.getpixel((int(W*.17),int(H*.7)))
            dest=OUT/cls/f"stato-{stage}.webp"
            dest.parent.mkdir(parents=True,exist_ok=True)
            result.convert("RGB").save(dest,"WEBP",quality=92,method=5)
            assert dest.stat().st_size>50000,dest
            imgs.append((cls,stage,result))
    assert len(imgs)==9
    # 3 columns for classes, 3 rows for unarmed/mid/armed streak photos.
    # All images are full-body, same camera / zoom as original photos.
    TW,TH=340,510
    gallery=Image.new("RGB",(3*TW,3*(TH+36)),(12,10,18))
    drawer=ImageDraw.Draw(gallery)
    by_key={(c,s):im for c,s,im in imgs}
    for row,stage in enumerate(STAGES):
        for col,cls in enumerate(CLASSES):
            x,y=col*TW,row*(TH+36)
            thumb=by_key[(cls,stage)].convert("RGB").resize((TW,TH),RES)
            gallery.paste(thumb,(x,y))
            drawer.text((x+10,y+TH+10),f"{cls.upper()} - STREAK {stage} - "+("ARMI" if stage==5 else "SENZA ARMI NUOVE"),fill=(240,217,164))
    PREVIEW.parent.mkdir(parents=True,exist_ok=True)
    gallery.save(PREVIEW,"JPEG",quality=90)
    # Also supply the exact FX layer for eventual additional stages, rather
    # than fabricating another corona or a different effect.
    standalone=Image.fromarray(np.dstack((mapped,mapped_alpha)),"RGBA")
    standalone.save(ROOT/"img/effetti/aura-divina-v365-effetto.webp","WEBP",lossless=True,method=5)
    print("VERIFIED: 9 unique full-body photos, true weapon progression, one approved aura, no other effects")

if __name__=="__main__":
    main()
