#!/usr/bin/env python3
"""Fotografie finali Corona dell'Infinito: 3 classi × (6 stati+2 armature) ×
6 effetti alternativi = 144 immagini WebP. Mantiene intatti viso, corpo,
abbigliamento e armi delle fotografie originali; luce e oggetti sono fotocomposti.
Il premio 75 giorni (Aura divina) è un livello indipendente e immutato.
"""
from pathlib import Path
from random import Random
from hashlib import sha256
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math

ROOT=Path(__file__).resolve().parent.parent
WMAX=720
CLASSES={
 'assassino':('armatura-assassino-notte','armatura-assassino-spettro'),
 'guerriero':('armatura-guerriero-braci','armatura-guerriero-abisso'),
 'berserker':('armatura-berserker-rabbia','armatura-berserker-apocalisse')
}
VARIANTS=('base','ambra','ombra','fulmine','nebula','astrale')
OUT=ROOT/'img/personaggi/corona-v359'

def layer(size):
 return Image.new('RGBA',size,(0,0,0,0))

def starlight(img,rng):
 w,h=img.size
 glow=layer((w,h));hard=layer((w,h))
 bg=ImageDraw.Draw(glow,'RGBA');core=ImageDraw.Draw(hard,'RGBA')
 # Astri e fessure di luce solo ai bordi, fuori dai pixel del personaggio.
 for i in range(105):
  x=int(w*rng.choice((rng.uniform(.018,.22),rng.uniform(.78,.982))))
  y=int(h*rng.uniform(.04,.96))
  r=rng.choices((1,2,3),(7,3,1))[0]
  hue=(255,209,137) if i%3 else (170,145,255)
  bg.ellipse((x-7*r,y-7*r,x+7*r,y+7*r),fill=(*hue,28))
  core.ellipse((x-r,y-r,x+r,y+r),fill=(*hue,190))
  if r>1:
   core.line((x-5*r,y,x+5*r,y),fill=(*hue,104),width=1)
   core.line((x,y-5*r,x,y+5*r),fill=(*hue,104),width=1)
 img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(max(3,w//55))))
 img.alpha_composite(hard)

def shine(img,cx,cy,rx,ry,col=(215,171,255)):
 w,h=img.size
 # diffused glow, not a flat halo or spiral around the person
 light=layer((w,h));d=ImageDraw.Draw(light,'RGBA')
 for i in range(14,0,-1):
  frac=i/14
  x,y=rx*frac,ry*frac
  a=int(3+(1-frac)*14)
  d.ellipse((int(cx-x),int(cy-y),int(cx+x),int(cy+y)),
            fill=(*col,a))
 img.alpha_composite(light.filter(ImageFilter.GaussianBlur(max(7,int(w*.035)))))

def crown(img,cls,seed):
 w,h=img.size;rng=Random(seed)
 # position in the EMPTY strip above the head; cannot obscure face
 cx=w//2
 cy=int(h*({'assassino':.064,'guerriero':.060,'berserker':.056}[cls]))
 # Narrow floating crown, not an enormous sticker. 19% of width.
 ww=int(w*({'assassino':.235,'guerriero':.256,'berserker':.272}[cls]))
 hh=int(h*.062)
 left=cx-ww//2;top=max(1,cy-hh//2)
 shine(img,cx,cy,ww*.76,hh*1.5,(141,85,223))
 shine(img,cx,cy,ww*.58,hh*.8,(255,191,106))
 shadow=layer((w,h));sd=ImageDraw.Draw(shadow,'RGBA')
 sd.ellipse((left-int(ww*.18),top+hh//3,cx+int(ww*.68),top+hh+int(hh*.25)),fill=(0,0,0,120))
 img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(max(3,w//90))))
 metal=layer((w,h));d=ImageDraw.Draw(metal,'RGBA')
 # Kingly sculpted metal: each of seven points is offset in depth.
 n=7;coords=[]
 for i in range(n):
  x=left+ww*(i+.5)/n
  step=min(i,n-1-i)
  height=[.67,.76,.87,1,.87,.76,.67][i]
  coords.append((round(x),round(top+hh*(.78-.74*height))))
 left_edge=(left,round(top+hh*.73));right_edge=(left+ww,round(top+hh*.73))
 d.polygon([left_edge,*coords,right_edge,(left+ww-int(ww*.035),top+hh),(left+int(ww*.035),top+hh)],fill=(118,60,27,238))
 # plated panels and reflective side bevels
 for i,(x,y) in enumerate(coords):
  x0=left+int(ww*i/n);x1=left+int(ww*(i+1)/n)
  d.polygon([(x0,top+int(hh*.73)),(x,y),(x1,top+int(hh*.73))],fill=(225+min(20,i*2),166+min(30,i*3),82+min(20,i*2),247))
  d.line([(x0,top+int(hh*.73)),(x,y),(x1,top+int(hh*.73))],fill=(255,238,179,235),width=max(1,w//320))
  d.line([(x-int(ww*.018),y+2),(x0+int(ww*.03),top+int(hh*.65))],fill=(92,47,27,165),width=1)
 d.rounded_rectangle((left+int(ww*.014),top+int(hh*.70),left+int(ww*.986),top+hh),radius=max(2,w//160),fill=(131,70,33,245),outline=(255,226,155,255),width=max(2,w//240))
 d.line((left+ww*.04,top+hh*.79,left+ww*.96,top+hh*.79),fill=(255,245,205,228),width=max(1,w//260))
 d.line((left+ww*.05,top+hh*.93,left+ww*.95,top+hh*.93),fill=(74,36,48,215),width=max(1,w//380))
 # large central amethyst and varied smaller gemstones
 gem=layer((w,h));g=ImageDraw.Draw(gem,'RGBA')
 for i,(x,y) in enumerate(coords):
  r=max(3,int(ww*(.025 if i!=3 else .077)))
  jy=round(y+r*(.26 if i==3 else 1.0))
  c=(165,72,242,244) if i%2 else (107,196,255,250)
  if i==3:c=(210,98,255,250)
  g.polygon([(x,jy-r),(x+r*.85,jy-r*.16),(x,jy+r),(x-r*.85,jy-r*.16)],
            fill=(33,19,80,244),outline=(255,245,211,252))
  g.polygon([(x,jy-r+2),(x+r*.55,jy-r*.1),(x,jy+r*.7),(x-r*.4,jy)],
            fill=c)
  g.line((x-r*.30,jy-r*.42,x,jy-r*.78),fill=(255,253,255,232),width=1)
 img.alpha_composite(gem.filter(ImageFilter.GaussianBlur(max(1,w//170))))
 img.alpha_composite(metal)
 img.alpha_composite(gem)
 # foreground sparkles around top only, not across face.
 st=layer((w,h));dt=ImageDraw.Draw(st,'RGBA')
 for _ in range(21):
  x=int(cx+rng.uniform(-.99,.99)*ww)
  y=int(cy+rng.uniform(-1.8,1.15)*hh)
  if y>top+hh*1.12:continue
  rr=rng.choice((1,1,2,3))
  co=(255,230,182,255) if rng.random()<.65 else (198,176,255,255)
  dt.ellipse((x-rr,y-rr,x+rr,y+rr),fill=co)
  if rr>=2:
   dt.line((x-rr*2,y,x+rr*2,y),fill=co,width=1)
   dt.line((x,y-rr*2,x,y+rr*2),fill=co,width=1)
 img.alpha_composite(st)
 return img

def source_for(cls,base,variant):
 if variant=='base':
  return (ROOT/f'img/personaggi/stati/{cls}-{base[6:]}.webp'
          if base.startswith('stato-') else
          ROOT/f'img/personaggi/armature/{base[len("armatura-"):]}.webp')
 name= 'astrale' if variant=='astrale' else variant
 return ROOT/'img/personaggi/combinazioni'/cls/base/(name+'.webp')

def render(cls,base,variant):
 path=source_for(cls,base,variant)
 if not path.is_file():raise FileNotFoundError(path)
 raw=Image.open(path).convert('RGB')
 raw.thumbnail((WMAX,1150),Image.Resampling.LANCZOS)
 im=ImageEnhance.Contrast(raw).enhance(1.025).convert('RGBA')
 seed=int(sha256(f'{cls}/{base}/{variant}'.encode()).hexdigest()[:10],16)
 # Rebuild environment as a photographic final render, with lit outer edges.
 rng=Random(seed)
 shine(im,im.width*.51,im.height*.11,im.width*.52,im.height*.18,(100,54,188))
 starlight(im,rng)
 crown(im,cls,seed)
 out=OUT/cls/base/(variant+'.webp');out.parent.mkdir(parents=True,exist_ok=True)
 im.convert('RGB').save(out,'WEBP',quality=90,method=5)
 if Image.open(out).size != im.size:raise ValueError(out)
 return out

def main():
 files=[]
 for cls,armors in CLASSES.items():
  for base in [*(f'stato-{i}' for i in range(6)),*armors]:
   for variant in VARIANTS:files.append(render(cls,base,variant))
 assert len(files)==144,len(files)
 assert len(set(files))==144
 print(f'Generated {len(files)} full-frame crowned photographs')
if __name__=='__main__':main()
