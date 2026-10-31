#!/usr/bin/env python3
"""Build exactly 9 FULL-ARMOR, ARMED Divine Aura photographs.
3 classes × (one standard completed streak outfit + two purchasable shop armors).
The six shop variants are NEW integrated image-to-image renders using the ACTUAL
shop armor + unlocked class weapon + previously approved golden Divine Aura.
This script adds no cosmetic second effects, crowns or armor unlocks.
"""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import hashlib

ROOT=Path(__file__).resolve().parent.parent
P=ROOT/"img/personaggi/aura-divina-v366"
PREVIEW=ROOT/"docs/aura-divina-v366-shop-completo.jpg"
STOCK=ROOT/"img/personaggi/aura-divina-v365"
SECTIONS={
 "assassino":["base","armatura-assassino-notte","armatura-assassino-spettro"],
 "guerriero":["base","armatura-guerriero-braci","armatura-guerriero-abisso"],
 "berserker":["base","armatura-berserker-rabbia","armatura-berserker-apocalisse"],
}
WIDTH,HEIGHT=720,1080
def normalize(source:Path,dest:Path):
 with Image.open(source) as raw:
  assert raw.width>=680 and raw.height>=900,(source,raw.size)
  im=ImageOps.pad(raw.convert("RGB"),(WIDTH,HEIGHT),method=Image.Resampling.LANCZOS,color=(10,8,14),centering=(.5,.5))
 dest.parent.mkdir(parents=True,exist_ok=True)
 im.save(dest,"WEBP",quality=94,method=6)
 assert dest.stat().st_size>35000,dest

def main():
 for cls,armors in SECTIONS.items():
  for armor in armors:
   if armor=="base":
    src=STOCK/cls/"stato-5.webp"
   else:
    src=ROOT/"docs/aura-divina-v366-import"/(armor+".png")
   assert src.exists(),src
   normalize(src,P/cls/(armor+".webp"))
 paths=sorted(P.rglob("*.webp"))
 assert len(paths)==9,(len(paths),paths)
 digests={hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
 assert len(digests)==9,"Duplicated renders"
 thumb=(365,548)
 canvas=Image.new("RGB",(3*thumb[0],3*(thumb[1]+42)),(12,10,17))
 draw=ImageDraw.Draw(canvas)
 for row,(cls,armors) in enumerate(SECTIONS.items()):
  for col,armor in enumerate(armors):
   img=Image.open(P/cls/(armor+".webp")).convert("RGB").resize(thumb,Image.Resampling.LANCZOS)
   x=col*thumb[0];y=row*(thumb[1]+42)
   canvas.paste(img,(x,y))
   draw.text((x+8,y+thumb[1]+13),f"{cls.upper()} | {armor.replace('armatura-'+cls+'-','').upper()}",fill=(251,212,146))
 PREVIEW.parent.mkdir(parents=True,exist_ok=True)
 canvas.save(PREVIEW,"JPEG",quality=88,optimize=True)
 print("9 full-armored, weapon-unlocked Divine Aura photographs verified",PREVIEW)

if __name__=="__main__":main()
