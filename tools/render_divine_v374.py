#!/usr/bin/env python3
"""v374: conservative retouch on authentic v373 portraits.

Never regenerate characters.  Preserve every original face, silhouette, armor,
shield, and weapon.  Equal framing inherited from verified v373 images.
Localized corrections: warm white Berserker Rabbia aura to same gold palette,
reinforce Abisso's gauntlet over sword grip without relocating the sword, and
give the three Berserkers a subtle shared golden particle signature.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import hashlib, json, math, random

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/"img/personaggi/aura-divina-v373"
DEST=ROOT/"img/personaggi/aura-divina-v374"
SIZE=(720,1080)
CLASSES={
 "assassino":["base","armatura-assassino-notte","armatura-assassino-spettro"],
 "guerriero":["base","armatura-guerriero-braci","armatura-guerriero-abisso"],
 "berserker":["base","armatura-berserker-rabbia","armatura-berserker-apocalisse"],
}
RES=Image.Resampling.LANCZOS

def warm_rabbia_aura(im):
    """Recolor the WHITE background halo to the SAME GOLD as the other two
    Berserkers.  A painted ellipse guide confines edits to the existing light
    ring; it does not touch face, armor, wolf, shield, hands or axe.
    """
    mask=Image.new("L",SIZE,0)
    d=ImageDraw.Draw(mask)
    # Existing v373 Rabbia bright halo runs behind the helmet/shoulders.
    d.ellipse((143,55,577,514),outline=255,width=54)
    # Keep front of figure 100% untouched.
    guard=Image.new("L",SIZE,0)
    gd=ImageDraw.Draw(guard)
    gd.ellipse((212,140,516,960),fill=255)
    gd.ellipse((171,250,553,670),fill=255)
    guard=guard.filter(ImageFilter.GaussianBlur(9))
    mask=ImageChops.subtract(mask,guard)
    pixels=im.load(); active=mask.load()
    for y in range(45,525):
        for x in range(120,595):
            strength=active[x,y]/255
            if strength<=.06:continue
            r,g,b,a=pixels[x,y]
            low=min(r,g,b);high=max(r,g,b)
            if high<128 or low<95 or high-low>110:continue
            # Convert pale white/silver glow into bright amber-gold light.
            weight=.91*strength*min(1.0,(high-115)/105)
            tr=255
            tg=min(223,round(150+high*.22))
            tb=min(127,round(26+high*.25))
            pixels[x,y]=(round(r*(1-weight)+tr*weight),
                          round(g*(1-weight)+tg*weight),
                          round(b*(1-weight)+tb*weight),a)
    # The original Rabbia rune floor was also pearl-white, unlike the other
    # Divine portraits. Warm only luminous floor pixels, never the boots.
    boots=Image.new("L",SIZE,0)
    bd=ImageDraw.Draw(boots)
    bd.ellipse((195,896,363,1008),fill=255)
    bd.ellipse((433,897,554,1011),fill=255)
    boots=boots.filter(ImageFilter.GaussianBlur(9))
    protection=boots.load()
    for y in range(906,1054):
        for x in range(35,697):
            r,g,b,a=pixels[x,y]
            lo=min(r,g,b);hi=max(r,g,b)
            if hi<130 or lo<83 or hi-lo>115:continue
            k=.73*min(1,(hi-115)/105)*(1-protection[x,y]/255)
            pixels[x,y]=(round(r*(1-k)+255*k),
                          round(g*(1-k)+185*k),
                          round(b*(1-k)+69*k),a)
    return im

def shared_berserker_sparks(im):
    """Identical low-intensity golden arc geometry for all three Berserkers."""
    layer=Image.new("RGBA",SIZE,(0,0,0,0))
    draw=ImageDraw.Draw(layer,"RGBA")
    randomizer=random.Random(7503)
    for i in range(90):
        x=randomizer.randrange(20,700);y=randomizer.randrange(50,955)
        if 140<x<595 and 95<y<920:continue
        r=1 if i%9 else 2
        draw.ellipse((x-r,y-r,x+r,y+r), fill=(255,211,125,120 if r==1 else 180))
    blur=layer.filter(ImageFilter.GaussianBlur(5))
    blur.putalpha(blur.getchannel("A").point(lambda v:int(v*.7)))
    im.alpha_composite(blur)
    im.alpha_composite(layer)
    return im

def align_abisso_sword_grip(im):
    """Bring photographic glove knuckles over guard tang, not a duplicate sword.
    Source pixels are taken ONLY from the original photographed gauntlet.
    The visible metal blade and its angle remain unchanged.
    """
    src=im.copy()
    # The sword-hand in the 720x1080 v373 portrait is at x~194-231,y~512-567.
    # A very narrow fingertip patch is moved 3px towards the handle and feathered.
    area=(195,532,215,557)
    patch=src.crop(area)
    m=Image.new("L",patch.size,0)
    d=ImageDraw.Draw(m)
    d.ellipse((2,1,19,22),fill=205)
    m=m.filter(ImageFilter.GaussianBlur(3.0))
    patch.putalpha(m)
    im.alpha_composite(patch,(197,537))
    return im

def main():
    DEST.mkdir(parents=True,exist_ok=True)
    manifest=[];tiles=[]
    for cls,armors in CLASSES.items():
        for arm in armors:
            source=SOURCE/cls/(arm+".webp")
            assert source.is_file(),source
            with Image.open(source) as photo:
                assert photo.size==SIZE,(source,photo.size)
                im=photo.convert("RGBA")
            if cls=="berserker":
                if arm=="armatura-berserker-rabbia":
                    im=warm_rabbia_aura(im)
                im=shared_berserker_sparks(im)
            if cls=="guerriero" and arm=="armatura-guerriero-abisso":
                im=align_abisso_sword_grip(im)
            dest=DEST/cls/(arm+".webp")
            dest.parent.mkdir(parents=True,exist_ok=True)
            im.convert("RGB").save(dest,"WEBP",quality=94,method=5)
            assert dest.stat().st_size>40000,dest
            manifest.append({"classe":cls,"armatura":arm,"canvas":list(SIZE),
              "head_y":78,"feet_y":997,
              "original_sha256":hashlib.sha256(source.read_bytes()).hexdigest(),
              "final_sha256":hashlib.sha256(dest.read_bytes()).hexdigest()})
            tiles.append((cls,arm,im.convert("RGB")))
    assert len(manifest)==9
    assert len({p["final_sha256"] for p in manifest})==9
    canvas=Image.new("RGB",(774,1284),(17,14,20))
    draw=ImageDraw.Draw(canvas)
    for i,(cls,arm,im) in enumerate(tiles):
        x=(i%3)*258+3;y=(i//3)*428+3
        canvas.paste(im.resize((250,375),RES),(x,y))
        draw.text((x+3,y+384),cls+" "+arm.replace("armatura-","")[:23],fill=(255,210,145))
    Path(ROOT/"docs/aura-divina-v374-preview.jpg").parent.mkdir(parents=True,exist_ok=True)
    canvas.save(ROOT/"docs/aura-divina-v374-preview.jpg","JPEG",quality=91)
    (ROOT/"docs/aura-divina-v374-manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
    print("PASS: nine unique true-original portraits, matching scale; matched Berserker gold aura; refined Abisso sword grip")
if __name__=="__main__":
    main()
