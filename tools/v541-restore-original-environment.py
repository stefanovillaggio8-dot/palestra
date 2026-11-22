#!/usr/bin/env python3
"""v541: ripristina il fondale/pavimento fotografico approvato, senza un
nuovo cerchio sintetico. La sorgente e' la PRIMA fotografia senza effetto
nella stessa tavola reference-approvata-v537.png, non un gradiente generico.
"""
from pathlib import Path
import io,base64,json
import numpy as np
import cv2
from PIL import Image,ImageDraw,ImageFilter,ImageEnhance

root=Path(__file__).resolve().parents[1]
ref=Image.open(root/'img/effetti/reference-approvata-v537.png').convert('RGB')
assert ref.size==(1447,1087),ref.size
# Prima cella, senza elementi della UI delle targhe: sfondo e pavimento reali.
panel=ref.crop((10,10,471,470))
w,h=panel.size
# Copriamo il SOLO personaggio precedente fino alle suole, compresi mantello
# e armatura; lasciamo intatti i pixel delle pareti e il pavimento circostante.
points=[(.49,.09),(.445,.10),(.408,.15),(.383,.23),(.342,.29),
 (.315,.47),(.293,.72),(.330,.81),(.392,.84),(.387,.94),
 (.466,.95),(.51,.91),(.575,.949),(.642,.945),(.656,.86),
 (.715,.73),(.699,.43),(.671,.26),(.622,.17),(.569,.11)]
m=Image.new('L',(w,h));d=ImageDraw.Draw(m)
d.polygon([(round(a*w),round(b*h)) for a,b in points],fill=255)
m=m.filter(ImageFilter.MaxFilter(7))
bgr=cv2.cvtColor(np.array(panel),cv2.COLOR_RGB2BGR)
hole=np.array(m,dtype=np.uint8)
restored=cv2.inpaint(bgr,hole,5,cv2.INPAINT_TELEA)
env=Image.fromarray(cv2.cvtColor(restored,cv2.COLOR_BGR2RGB))
# I pixel attorno al contorno rimangono originali; soltanto il soggetto
# vecchio viene sostituito dall'atmosfera reale della stessa fotografia.
soft=m.filter(ImageFilter.GaussianBlur(5))
env=Image.composite(env,panel,soft)
# Bordo morbido sullo sfondo, senza trasformare la base in un riquadro opaco.
rgba=env.convert('RGBA')
edge=Image.new('L',(w,h),255)
ep=edge.load()
for y in range(h):
 for x in range(w):
  t=min(x/(w*.048),(w-1-x)/(w*.048),y/(h*.038),(h-1-y)/(h*.044),1)
  ep[x,y]=max(0,min(255,round(255*max(0,t)**.6)))
rgba.putalpha(edge)
out=root/'img/effetti/reference-ambiente-v541.webp'
rgba.save(out,'WEBP',lossless=True,method=5,exact=True)
assert out.stat().st_size>100000
print('ENV_V541:'+str(w)+'x'+str(h)+':'+str(out.stat().st_size),flush=True)
# Preview del fondale ripristinato, confrontato con fotografia originale.
frames=[('ORIGINALE SENZA EFFETTO',panel),('FONDALE E PAVIMENTO RECUPERATI',rgba)]
fx=Image.open(root/'img/effetti/effetti-reference-v540.webp').convert('RGBA')
avatar=Image.open(root/'img/personaggi/cutout/stati/assassino-0.webp').convert('RGBA')
# Un esempio composito mostra se il pavimento e il background esistono
# davvero e se la figura sta sopra (non un'asserzione CSS).
stage=Image.new('RGBA',(w,h),(12,11,20,255))
stage.alpha_composite(rgba,(0,0))
framefx=fx.crop((0,0,460,442)).resize((round(w*1.64),round(h*1.08)),Image.Resampling.LANCZOS)
inside=framefx.crop((round(w*.32),round(h*.04),round(w*1.32),round(h*1.04)))
stage.alpha_composite(inside,(0,0))
avatar.thumbnail((w,h),Image.Resampling.LANCZOS)
# Cutout matching the PHOTO bounds exactly, not arbitrary scale/center.
avatar=Image.open(root/'img/personaggi/cutout/stati/assassino-0.webp').convert('RGBA')
avatar=avatar.resize((w,h),Image.Resampling.LANCZOS)
stage.alpha_composite(avatar,(0,0))
frames.append(('ANTEPRIMA EFFETTO + FONDALE + AVATAR REALE',stage))
total=Image.new('RGB',(w*3,h+30),(15,14,24));d=ImageDraw.Draw(total)
for i,(name,im) in enumerate(frames):
 d.text((i*w+7,7),name,fill=(247,230,216))
 b=Image.new('RGB',(w,h),(14,13,24))
 im=im.convert('RGBA');b.paste(im,mask=im.getchannel('A'))
 total.paste(b,(i*w,30))
total.thumbnail((1150,650),Image.Resampling.LANCZOS)
buff=io.BytesIO();total.save(buff,format='JPEG',quality=74,optimize=True)
enc=base64.b64encode(buff.getvalue()).decode()
print('ENV541_META:'+str(len(enc)),flush=True)
for i in range(0,len(enc),2700):
 print('ENV541_PART:'+str(i//2700).zfill(4)+':'+enc[i:i+2700],flush=True)
print('ENV541_END',flush=True)
