#!/usr/bin/env python3
"""v375: one *identical* geometrical golden Divine Aura for all nine verified photos.

Source is the nine individually distinct v374 photographs. Never regenerate,
paste, shift, retouch, or alter faces, anatomy, costumes, shields or weapons.
A single shared light template is masked away from each foreground; every
variant has the same halo, full-height aureole, orbit and ground circle.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import hashlib, json, math, random

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "img/personaggi/aura-divina-v374"
OUT = ROOT / "img/personaggi/aura-divina-v375"
SIZE = (720, 1080)
CLASSES = {
    "assassino": ["base", "armatura-assassino-notte", "armatura-assassino-spettro"],
    "guerriero": ["base", "armatura-guerriero-braci", "armatura-guerriero-abisso"],
    "berserker": ["base", "armatura-berserker-rabbia", "armatura-berserker-apocalisse"],
}
GOLD = (255, 204, 104)

def uniform_aura():
    """Fixed shared geometry and hue, never image-specific random effects."""
    fg = Image.new("RGBA", SIZE, (0,0,0,0))
    d = ImageDraw.Draw(fg, "RGBA")
    # All nine portraits use identical centered geometry.
    # The outer egg-shaped aureole makes the Divine reward recognizable
    # across every armor even when underlying photographs differ.
    d.ellipse((43, 94, 677, 972), outline=(255,194,82,120), width=7)
    d.ellipse((49, 100, 671, 966), outline=(255,228,154,232), width=3)
    d.ellipse((60, 111, 660, 953), outline=(255,175,68,93), width=2)
    # Identical upper halo, spatially protected from helmets and real horns.
    d.ellipse((215, 57, 505, 347), outline=(255,192,80,161), width=9)
    d.ellipse((221, 63, 499, 341), outline=(255,236,166,248), width=3)
    # Same gold foot sigil in every case, not nine different colors.
    for box,alpha,width in [
        ((65,938,655,1023),170,5),
        ((82,947,638,1016),232,3),
        ((122,959,598,1009),120,2),
    ]:
        d.ellipse(box, outline=(*GOLD,alpha),width=width)
    # A single shared orbit on BOTH sides. Keep the interior masked out,
    # so an orbit never gets painted over any face or plate of armor.
    for y0,amplitude,phase in [(479,57,-.35),(754,47,.5)]:
        pts=[]
        for i in range(350):
            angle=math.tau*i/349
            x=360+321*math.cos(angle)
            y=y0 + amplitude*math.sin(angle+phase) + 41*math.cos(angle)
            pts.append((round(x),round(y)))
        d.line(pts,fill=(255,216,132,145),width=4,joint="curve")
        d.line([(x,y-3) for x,y in pts],fill=(255,241,192,96),width=2,joint="curve")
    # Deterministic same stars, identical locations and color.
    rand=random.Random(750375)
    for i in range(185):
        x=rand.randrange(19,701)
        y=rand.randrange(55,1004)
        if 175<x<552 and 135<y<936:
            continue
        rad=2 if i%13==0 else 1
        d.ellipse((x-rad,y-rad,x+rad,y+rad),
                  fill=(255,213,121,160 if rad==2 else 112))
    glow=fg.filter(ImageFilter.GaussianBlur(18))
    glow.putalpha(glow.getchannel("A").point(lambda a: int(a*.74)))
    return Image.alpha_composite(glow,fg)

AURA = uniform_aura()

def protection_mask():
    # Conservative zone around entire character, shields and any foreground
    # weapons; identical for every armor and class to avoid shape mismatches.
    mask = Image.new("L", SIZE, 0)
    d=ImageDraw.Draw(mask)
    d.ellipse((155,74,570,1022), fill=255)
    d.ellipse((81,240,647,909), fill=255)
    d.ellipse((146,20,574,308), fill=255)
    d.polygon([(70,480),(290,450),(309,644),(0,852),(0,760)],fill=255)
    d.polygon([(438,365),(708,330),(720,868),(450,914)],fill=255)
    # The two foot/boot patches prevent newly added glowing floor
    # circles from painting over feet and original armor textures.
    d.ellipse((182,891,373,1034),fill=255)
    d.ellipse((401,883,575,1038),fill=255)
    return mask.filter(ImageFilter.GaussianBlur(8))

PROTECTION = protection_mask()

def render(image):
    base=image.convert("RGBA")
    # Light-only adjustment outside central protection; no pixel on a face,
    # shield or weapon is deliberately repainted or regenerated.
    aura=AURA.copy()
    alpha=ImageChops.multiply(aura.getchannel("A"),
                              ImageChops.invert(PROTECTION))
    aura.putalpha(alpha)
    return Image.alpha_composite(base,aura).convert("RGB")

def main():
    records=[]
    thumbs=[]
    OUT.mkdir(parents=True,exist_ok=True)
    for cls,armors in CLASSES.items():
        for armor in armors:
            infile=SRC/cls/(armor+".webp")
            assert infile.is_file(),infile
            with Image.open(infile) as raw:
                assert raw.size==SIZE
                original=raw.convert("RGB")
            result=render(original)
            outfile=OUT/cls/(armor+".webp")
            outfile.parent.mkdir(parents=True,exist_ok=True)
            result.save(outfile,"WEBP",quality=96,method=5)
            assert outfile.stat().st_size>40000
            records.append({
                "classe":cls,"armatura":armor,"canvas":list(SIZE),
                "head_y":78,"feet_y":997,
                "aura_template":"v375-uniform-gold-750375",
                "original_sha256":hashlib.sha256(infile.read_bytes()).hexdigest(),
                "final_sha256":hashlib.sha256(outfile.read_bytes()).hexdigest()
            })
            thumbs.append((cls,armor,result))
    assert len(records)==9
    assert len({x["final_sha256"] for x in records})==9
    sheet=Image.new("RGB",(774,1284),(17,14,20))
    sd=ImageDraw.Draw(sheet)
    for i,(cls,armor,im) in enumerate(thumbs):
        x=(i%3)*258+3;y=(i//3)*428+3
        sheet.paste(im.resize((250,375),Image.Resampling.LANCZOS),(x,y))
        sd.text((x+3,y+384),cls+" "+armor.replace("armatura-","")[:23],fill=(255,210,145))
    docs=ROOT/"docs"
    docs.mkdir(exist_ok=True)
    sheet.save(docs/"aura-divina-v375-preview.jpg","JPEG",quality=92)
    (docs/"aura-divina-v375-manifest.json").write_text(
        json.dumps(records,ensure_ascii=False,indent=2),encoding="utf-8")
    print("SUCCESS: nine unique original portraits, uniform gold template, protected foreground.")

if __name__=="__main__":
    main()
