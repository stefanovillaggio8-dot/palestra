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
panel=ref.crop((10,10,471,450))
w,h=panel.size
# Copriamo il SOLO personaggio precedente fino alle suole, compresi mantello
# e armatura; lasciamo intatti i pixel delle pareti e il pavimento circostante.
# La vecchia figura e' piu' grande del ritaglio attuale: anche la testa
# e il mantello devono sparire, non solo il busto. Altrimenti compaiono
# fantasmi di casco e scarpe in mezzo al nuovo personaggio.
points=[(.41,.045),(.35,.07),(.31,.13),(.275,.25),(.25,.47),
 (.225,.77),(.25,.86),(.29,.985),(.72,.985),(.765,.86),
 (.79,.69),(.775,.40),(.744,.21),(.68,.10),(.62,.046)]
m=Image.new('L',(w,h));d=ImageDraw.Draw(m)
d.polygon([(round(a*w),round(b*h)) for a,b in points],fill=255)
m=m.filter(ImageFilter.MaxFilter(9))
# L'inpainting Telea di un corpo intero lasciava una colonna di capelli
# e scarpe. Ricostruiamo invece il SOLO tratto nascosto interpolando
# i pixel del vero fondale a sinistra e destra di questo scatto.
arr=np.asarray(panel,dtype=np.float32)
blur=cv2.GaussianBlur(arr,(0,0),sigmaX=6,sigmaY=3)
recon=np.copy(arr)
lo=int(w*.19);hi=int(w*.82)
for y in range(h):
 left=blur[y,lo];right=blur[y,hi]
 for x in range(max(0,int(w*.19)),min(w,int(w*.83))):
  t=max(0,min(1,(x-lo)/(hi-lo)))
  t=t*t*(3-2*t)
  pixel=left*(1-t)+right*t
  # Trama reale copiata dai margini dello stesso fotogramma,
  # non una nuova texture appiccicata o un secondo pavimento.
  lx=max(8,int(w*.08)+(x%27))
  rx=min(w-8,int(w*.90)-(x%23))
  noise=(arr[y,lx]-blur[y,lx])*(1-t)+(arr[y,rx]-blur[y,rx])*t
  recon[y,x]=np.clip(pixel+noise*.25,0,255)
env=Image.fromarray(np.uint8(recon))
soft=m.filter(ImageFilter.GaussianBlur(9))
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
fx=Image.open(root/'img/effetti/effetti-reference-v539.webp').convert('RGBA')
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
