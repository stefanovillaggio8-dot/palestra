#!/usr/bin/env python3
"""Corona dell'Infinito v360: 648 fotografie complete, ciascuna una vera WebP.
La corona e' un singolo asset coerente derivato dal design approvato.
L'immagine originale di ogni stadio resta la sorgente: mai anticipare le armi.
Effetti e Aura divina originali, senza alterare l'inventario o gli sblocchi.
"""
import base64
import hashlib
import io
import math
import random
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "img/personaggi/corona-v360"
CROWN = ROOT / "img/effetti/corona-infinito-v360-original.png"
CLASSES = {
    "assassino": ["", "armatura-assassino-notte", "armatura-assassino-spettro"],
    "guerriero": ["", "armatura-guerriero-braci", "armatura-guerriero-abisso"],
    "berserker": ["", "armatura-berserker-rabbia", "armatura-berserker-apocalisse"],
}
EFFECTS = ("base", "ambra", "ombra", "fulmine", "nebula", "astrale")
COLORS = {
 "armatura-assassino-notte": (58, 115, 185),
 "armatura-assassino-spettro": (182, 38, 93),
 "armatura-guerriero-braci": (229, 94, 43),
 "armatura-guerriero-abisso": (117, 68, 211),
 "armatura-berserker-rabbia": (176, 110, 41),
 "armatura-berserker-apocalisse": (207, 56, 36),
}
SIZE = (720, 1080)
RS = Image.Resampling.LANCZOS

def open_scaled(path):
    with Image.open(path) as im:
        return im.convert("RGBA").resize(SIZE, RS)

def source_photo(cls, stage, effect, armor=""):
    # L'armatura selezionata deve essere fotografata davvero, non tinta sopra al corpo base.
    if armor:
        if effect == "base":
            return ROOT / "img/personaggi/armature" / (armor.removeprefix("armatura-") + ".webp")
        return ROOT / "img/personaggi/combinazioni" / cls / armor / (effect + ".webp")
    if effect == "base":
        return ROOT / f"img/personaggi/stati/{cls}-{stage}.webp"
    return ROOT / f"img/personaggi/combinazioni/{cls}/stato-{stage}/{effect}.webp"

# True photographic equipment from the canonical level-five photo, no new faces.
# Coordinates are in the original 900 x 1350 portrait.
WEAPON_SHAPES = {
 "assassino": [
  ([(155,665),(216,650),(268,700),(245,757),(321,941),(295,973),(211,789),(182,740)],(52,10)),
  ([(745,665),(684,650),(632,700),(655,757),(579,941),(605,973),(689,789),(718,740)],(-52,10)),
 ],
 "guerriero": [
  ([(129,671),(190,660),(260,709),(239,765),(254,1295),(212,1329),(191,772),(145,733)],(32,5)),
 ],
 "berserker": [
  ([(20,251),(114,223),(198,256),(199,381),(155,424),(176,1298),
     (139,1325),(124,432),(38,456),(12,407)],(65,0)),
 ],
}

def restored_equipment(im, cls, armor, stage):
    if not armor:
        return im
    if stage>=4:
        canonical=open_scaled(ROOT / f"img/personaggi/stati/{cls}-5.webp")
        w,h=SIZE
        for coords,shift in WEAPON_SHAPES[cls]:
            mask=Image.new("L",SIZE,0)
            d=ImageDraw.Draw(mask)
            d.polygon([(int(x*w/900),int(y*h/1350)) for x,y in coords],fill=255)
            mask=mask.filter(ImageFilter.GaussianBlur(1.2))
            sprite=canonical.copy()
            sprite.putalpha(mask)
            layer=Image.new("RGBA",SIZE,(0,0,0,0))
            layer.paste(sprite,(int(shift[0]*w/900),int(shift[1]*h/1350)))
            im.alpha_composite(layer)
    if cls=="berserker" and armor=="armatura-berserker-apocalisse":
        # The original Apocalisse photo omitted its Viking horns.
        original=open_scaled(ROOT/"img/personaggi/stati/berserker-5.webp")
        w,h=SIZE
        left=[(296,28),(346,25),(397,86),(403,173),(376,177),(354,143),(326,122),(299,102)]
        mirror=[(900-x,y) for x,y in left]
        mask=Image.new("L",SIZE,0)
        d=ImageDraw.Draw(mask)
        for p in [left,mirror]:
            d.polygon([(int(x*w/900),int(y*h/1350)) for x,y in p],fill=255)
        original.putalpha(mask.filter(ImageFilter.GaussianBlur(1.1)))
        im.alpha_composite(original)
    return im

def load_crown():
    if not CROWN.is_file():
        raise FileNotFoundError("Missing approved crown source: " + str(CROWN))
    img = Image.open(CROWN).convert("RGB")
    img.thumbnail((1200, 1200), RS)
    # Black-background crown asset: remove the black surrounding the detailed
    # real gold/violet artwork, preserving delicate luminous particles.
    mask = Image.new("L", img.size)
    pixels, alpha = img.load(), mask.load()
    for y in range(img.height):
        for x in range(img.width):
            r,g,b = pixels[x,y]
            peak = max(r,g,b)
            alpha[x,y] = max(0, min(255, int((peak - 17) * 2.3)))
    mask = mask.filter(ImageFilter.GaussianBlur(0.45))
    rgba = img.convert("RGBA")
    rgba.putalpha(mask)
    bounds = mask.getbbox()
    if bounds is None:
        raise ValueError("Approved crown image is completely empty")
    rgba = rgba.crop(bounds)
    return rgba

def load_divine():
    # Exactly the v334 Aura divina sprite: do not draw/reinvent its style.
    text = (ROOT / "src/aura-foto-atlas.js").read_text(encoding="utf-8")
    match = re.search(r"data:image/avif;base64,([A-Za-z0-9+/=]+)", text)
    if not match:
        raise ValueError("Original divine atlas was not found")
    raw = base64.b64decode(match.group(1))
    with Image.open(io.BytesIO(raw)) as atlas:
        im = atlas.convert("RGBA")
    w, h = im.size
    return im.crop((2*w//3, h//2, w, h))

def apply_armor_theme(im, cls, armor):
    if not armor:
        return im
    # Do not replace the body with a photo of a different streak stage!
    # Tint only existing costume/armour fabric, NEVER skin, hands, faces or weapons.
    w,h = im.size
    mask=Image.new("L", im.size, 0); draw=ImageDraw.Draw(mask)
    def oval(box, opacity):
        draw.ellipse(tuple(int(v) for v in box), fill=opacity)
    oval((w*.29,h*.235,w*.71,h*.52), 73)
    oval((w*.36,h*.47,w*.65,h*.66), 56)
    oval((w*.22,h*.24,w*.43,h*.38), 55)
    oval((w*.57,h*.24,w*.79,h*.38), 55)
    mask=mask.filter(ImageFilter.GaussianBlur(31))
    # Preserve bright metal edges, skin tones and intact all weapons.
    base=im.convert("RGB")
    overlay=Image.new("RGB", im.size, COLORS[armor])
    themed=Image.blend(base,overlay,.32)
    return Image.composite(themed, base, mask).convert("RGBA")

def apply_divine(im, divine):
    w,h=im.size
    aura=divine.resize((w,h),RS)
    # Avoid gold effects passing through the character's face and body.
    mask=aura.getchannel("A")
    protect=Image.new("L",(w,h),0)
    d=ImageDraw.Draw(protect)
    d.ellipse((w*.23,h*.08,w*.78,h*.98),fill=235)
    protect=protect.filter(ImageFilter.GaussianBlur(44))
    from PIL import ImageChops
    mask=ImageChops.subtract(mask, protect.point(lambda v: int(v*.90)))
    # The original Aura is very bright: soften ONLY in combined Corona photos.
    # Standalone Aura divina in the app remains untouched.
    mask=mask.point(lambda v: int(v*.25))
    aura.putalpha(mask)
    im.alpha_composite(aura)
    return im

def crown_effects(im, cls, seed):
    w,h=im.size
    rng=random.Random(seed)
    head_y={"assassino":.091,"guerriero":.088,"berserker":.093}[cls]*h
    halo=Image.new("RGBA",im.size,(0,0,0,0))
    glow=Image.new("RGBA",im.size,(0,0,0,0))
    d=ImageDraw.Draw(halo,"RGBA")
    g=ImageDraw.Draw(glow,"RGBA")
    cx=w*.50
    # Concentrated gold-violet endgame energy, behind the head only.
    for k in range(2):
        rx=w*(.105+k*.024)
        ry=h*(.030+k*.010)
        box=(int(cx-rx),int(head_y-ry),int(cx+rx),int(head_y+ry))
        col=(255,189,70,90-k*16) if k%2==0 else (182,95,255,85)
        d.arc(box,198+k*18,328+k*9,fill=col,width=max(1,3-k))
        d.arc(box,18+k*8,148+k*7,fill=col,width=max(1,3-k))
        g.arc(box,202,330,fill=(*col[:3],48),width=9)
    for i in range(75):
        x=int(cx+rng.uniform(-.255,.255)*w)
        y=int(head_y+rng.uniform(-.090,.105)*h)
        if not 4<=x<w-4 or not 4<=y<h*.245: continue
        # No foreground particles over eyes, hood, mouth, torso.
        if .34*w<x<.66*w and y>h*.105: continue
        rr=rng.choice((1,1,1,2,2,3))
        c=(255,211,112,220) if i%3 else (190,112,255,207)
        d.ellipse((x-rr,y-rr,x+rr,y+rr),fill=c)
        if rr>=2:
            d.line((x-rr*2,y,x+rr*2,y),fill=(*c[:3],113),width=1)
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(19)))
    im.alpha_composite(halo)
    return im

def fit_crown(im, crown, cls):
    w,h=im.size
    # Same design and size hierarchy for every class.
    width=int(w*({"assassino":.215,"guerriero":.205,"berserker":.205}[cls]))
    height=int(h*({"assassino":.086,"guerriero":.084,"berserker":.082}[cls]))
    art=crown.resize((width,height),RS)
    # Bottom of crown is seated on hood/helmet, not floating above character.
    basey={"assassino":.127,"guerriero":.121,"berserker":.123}[cls]*h
    x=(w-width)//2; y=int(basey-height)
    # Make sure the output can include high crown tips.
    if y<0:
        art=art.crop((0,-y,width,height))
        y=0
    im.alpha_composite(art,(x,y))
    return im

def make_preview(files):
    names=[
      ("assassino",5,"standard","base",False),
      ("assassino",5,"standard","fulmine",True),
      ("assassino",1,"armatura-assassino-spettro","ombra",False),
      ("guerriero",5,"standard","ambra",False),
      ("guerriero",2,"armatura-guerriero-abisso","astrale",True),
      ("guerriero",4,"standard","fulmine",False),
      ("berserker",5,"standard","base",False),
      ("berserker",3,"armatura-berserker-rabbia","nebula",True),
      ("berserker",4,"armatura-berserker-apocalisse","ambra",False),
    ]
    card=Image.new("RGB",(1080,1620),(10,10,18))
    d=ImageDraw.Draw(card)
    for j,(cls,stage,arm,fx,divine) in enumerate(names):
        path=OUT/cls/f"stato-{stage}"/arm/(fx+("-divina" if divine else "")+".webp")
        with Image.open(path) as pic:
            thumb=pic.convert("RGB").resize((340,510),RS)
        x=10+(j%3)*360; y=10+(j//3)*535
        card.paste(thumb,(x,y))
        d.text((x+5,y+515),f"{cls} / {stage} / {fx}",fill=(240,222,180))
    path=ROOT/"docs/corona-v360-anteprima.jpg"
    card.save(path,"JPEG",quality=87)
    return path

def main():
    import pillow_avif  # register AVIF decoder
    crown=load_crown()
    divine=load_divine()
    hashes=[]
    for cls,armors in CLASSES.items():
      for stage in range(6):
       for armor in armors:
        arm=armor or "standard"
        for effect in EFFECTS:
         for is_divine in (False, True):
          path=source_photo(cls,stage,effect,armor)
          if not path.is_file(): raise FileNotFoundError(path)
          im=open_scaled(path)
          im=restored_equipment(im,cls,armor,stage)
          # Original Shop armor source: never apply a fake recolor to a canonical costume.
          if is_divine: im=apply_divine(im,divine)
          seed=int(hashlib.sha256(f"{cls}/{stage}/{arm}/{effect}/{is_divine}".encode()).hexdigest()[:10],16)
          im=crown_effects(im,cls,seed)
          im=fit_crown(im,crown,cls)
          out=OUT/cls/f"stato-{stage}"/arm/(effect+("-divina" if is_divine else "")+".webp")
          out.parent.mkdir(parents=True,exist_ok=True)
          im.convert("RGB").save(out,"WEBP",quality=84,method=4)
          if out.stat().st_size<10000: raise ValueError(f"Damaged photo: {out}")
          hashes.append(hashlib.sha256(out.read_bytes()).hexdigest())
    if len(hashes)!=648 or len(set(hashes))!=648:
        raise ValueError("648 distinct photos required")
    preview=make_preview(hashes)
    print(f"Generated {len(hashes)} unique full-frame crowned photos; {preview}")

if __name__=="__main__":
    main()
