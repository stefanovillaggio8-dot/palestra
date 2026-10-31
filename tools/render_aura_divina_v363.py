#!/usr/bin/env python3
"""Render original divine aura from a generated effect-only VFX plate.
Transparent center deliberately preserves existing faces, weapons, physique,
free streak armor and shop skins. Never generate or invent equipment."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
import math

ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/"img/effetti/aura-divina-v363-source.png"
OUT=ROOT/"img/effetti/aura-divina-v363.webp"
DOC=ROOT/"docs/aura-divina-v363-preview.jpg"
SIZE=(720,1080)
R=Image.Resampling.LANCZOS

def generate():
 if not SRC.is_file():
  raise FileNotFoundError(f"Missing original generated VFX {SRC}")
 raw=Image.open(SRC).convert("RGB")
 assert min(raw.size)>=1000,raw.size
 raw=raw.resize(SIZE,R)
 w,h=raw.size
 src=raw.load()
 aura=Image.new("RGBA",SIZE,(0,0,0,0))
 px=aura.load()
 for y in range(h):
  yf=y/h
  for x in range(w):
   xf=x/w
   rr,gg,bb=src[x,y]
   peak=max(rr,gg,bb)
   # Remove solid black source background, preserve fine glowing tracery.
   strength=max(0,min(1,(peak-16)/200))
   strength=strength**1.32
   # Protect head, face, torso, hands & weapons in EVERY free-streak stage.
   # Side rays and spell circle remain magnificent outside this ellipse.
   dist=math.sqrt(((xf-.5)/.265)**2+((yf-.49)/.66)**2)
   t=max(0,min(1,(dist-.66)/.60))
   safe=t*t*(3-2*t)
   alpha=round(232*strength*safe)
   if alpha<4:continue
   # Preserve luminous hues but reduce muddy gray/white fog.
   warm=max(rr,gg*.92)
   pix_r=max(rr,int(warm*.97))
   pix_g=min(255,max(gg,int(pix_r*.72)))
   pix_b=max(bb,int(pix_g*.68))
   px[x,y]=(min(255,pix_r),min(255,pix_g),min(255,pix_b),alpha)
 assert aura.getbbox(),"Aura is transparent!"
 OUT.parent.mkdir(parents=True,exist_ok=True)
 aura.save(OUT,"WEBP",lossless=True,method=6)
 # 3 representative progression phases, NO crown in the divine reward.
 classes=[("assassino",1),("guerriero",3),("berserker",5)]
 card=Image.new("RGB",(3*w,h+65),(10,9,17))
 d=ImageDraw.Draw(card)
 for i,(cls,stage) in enumerate(classes):
  original=ROOT/f"img/personaggi/stati/{cls}-{stage}.webp"
  if not original.is_file():raise FileNotFoundError(original)
  im=Image.open(original).convert("RGBA").resize(SIZE,R)
  im.alpha_composite(aura)
  card.paste(im.convert("RGB"),(i*w,0))
  d.text((i*w+16,h+14),f"{cls.upper()} | STREAK {stage} | AURA DIVINA",fill=(250,218,138))
 DOC.parent.mkdir(parents=True,exist_ok=True)
 card.save(DOC,"JPEG",quality=88)
 n=sum(1 for a in aura.getchannel("A").getdata() if a>30)
 assert 3000<n<500000,n
 print(f"wrote {OUT}, overlay pixels={n}, preview={DOC}")

if __name__=="__main__":generate()
