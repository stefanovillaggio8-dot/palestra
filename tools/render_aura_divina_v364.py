#!/usr/bin/env python3
"""Build ONLY a transparent cosmetic aura for original RPG character images.
The original body, face, armor, weapons, streak phase and background are never
generated or repainted; only edge FX pixels are alpha-composited."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import math
ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/"img/effetti/aura-divina-v364-source.png"
OUT=ROOT/"img/effetti/aura-divina-v364.webp"
DOC=ROOT/"docs/aura-divina-v364-confronto.jpg"
SIZE=(720,1080)
R=Image.Resampling.LANCZOS

def main():
  raw=Image.open(SRC).convert("RGB")
  assert min(raw.size)>=1000,raw.size
  raw=raw.resize(SIZE,R)
  w,h=SIZE
  pix=raw.load()
  effect=Image.new("RGBA",SIZE)
  out=effect.load()
  for y in range(h):
    yn=y/h
    for x in range(w):
      xn=x/w
      rr,gg,bb=pix[x,y]
      p=max(rr,gg,bb)
      if p<19:continue
      mag=(max(0,min(1,(p-18)/187)))**1.26
      # Occupied body region must be completely untouched, even when the VFX
      # generator puts a glowing pixel over the middle of a costume or face.
      cx=(xn-.5)/.272
      cy=(yn-.49)/.69
      dist=math.sqrt(cx*cx+cy*cy)
      s=max(0,min(1,(dist-.73)/.45))
      protect=s*s*(3-2*s)
      alpha=round(250*mag*protect)
      if alpha<6:continue
      out[x,y]=(rr,gg,bb,alpha)
  assert effect.getbbox(), "Empty effect"
  OUT.parent.mkdir(parents=True,exist_ok=True)
  effect.save(OUT,"WEBP",lossless=True,method=6)
  samples=[("assassino",1),("guerriero",3),("berserker",5)]
  tiles=Image.new("RGB",(w*3,(h+56)*2),(9,9,14))
  draw=ImageDraw.Draw(tiles)
  for i,(cls,stage) in enumerate(samples):
    p=ROOT/f"img/personaggi/stati/{cls}-{stage}.webp"
    assert p.is_file(),p
    im=Image.open(p).convert("RGBA").resize(SIZE,R)
    # row 0 original; row 1 exact original with only the aura overlay.
    before=im.copy()
    after=im.copy();after.alpha_composite(effect)
    tiles.paste(before.convert("RGB"),(i*w,0))
    tiles.paste(after.convert("RGB"),(i*w,h+56))
    draw.text((i*w+18,h+10),f"{cls.upper()} - PRIMA - STADIO {stage}",fill=(235,225,200))
    draw.text((i*w+18,2*h+66),f"{cls.upper()} - NUOVA AURA DIVINA v364",fill=(250,208,130))
    assert before.getpixel((w//2,h//3))==after.getpixel((w//2,h//3)), "The face was changed!"
    assert before.getpixel((w//2,h//2))==after.getpixel((w//2,h//2)), "The torso was changed!"
  DOC.parent.mkdir(parents=True,exist_ok=True)
  tiles.save(DOC,"JPEG",quality=88)
  for cls,stage in samples:
    source=ROOT/f"img/personaggi/stati/{cls}-{stage}.webp"
    img=Image.open(source).convert("RGBA").resize(SIZE,R)
    img.alpha_composite(effect)
    dest=ROOT/f"docs/aura-v364-{cls}-stadio{stage}.webp"
    img.convert("RGB").save(dest,"WEBP",quality=92,method=6)
  nontransparent=sum(a>12 for a in effect.getchannel("A").getdata())
  assert nontransparent>3000,"Effect too small"
  print("Aura v364 preview built:",DOC,"edge pixels",nontransparent)

if __name__=="__main__":main()
