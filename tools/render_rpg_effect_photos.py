#!/usr/bin/env python3
"""Render full-size photographic Aura Shop variants for every class, armor
and Streak portrait. The ORIGINAL hero/face/weapon pixels are retained;
only ambient light, particles and smoke are composited into the same photo.
No rigid oval/person-cutout mask or downloaded secondary portrait is used.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from pathlib import Path
from random import Random
from hashlib import sha256
import math

ROOT=Path(__file__).resolve().parent.parent
CLASSES={
 'assassino':['armatura-assassino-notte','armatura-assassino-spettro'],
 'guerriero':['armatura-guerriero-braci','armatura-guerriero-abisso'],
 'berserker':['armatura-berserker-rabbia','armatura-berserker-apocalisse'],
}
EFFECTS=['ambra','fulmine','ombra','nebula','nessuno']

def haze(im,color,seed,n=8,opacity=78):
  w,h=im.size
  rng=Random(seed)
  fog=Image.new('RGBA',(w,h))
  d=ImageDraw.Draw(fog,'RGBA')
  for _ in range(n):
    side=rng.choice((0,1))
    cx=rng.uniform(-.10,.22)*w if side==0 else rng.uniform(.78,1.12)*w
    cy=rng.uniform(.13,.92)*h
    rx=rng.uniform(.1,.23)*w
    ry=rng.uniform(.07,.17)*h
    d.ellipse((int(cx-rx),int(cy-ry),int(cx+rx),int(cy+ry)), fill=(*color,int(opacity*rng.uniform(.25,.73))))
  fog=fog.filter(ImageFilter.GaussianBlur(max(12,int(w*.057))))
  im.alpha_composite(fog)

def stars(im,color,rng,count=63,opacity=240):
  w,h=im.size
  dots=Image.new('RGBA',(w,h))
  d=ImageDraw.Draw(dots,'RGBA')
  glow=Image.new('RGBA',(w,h))
  dg=ImageDraw.Draw(glow,'RGBA')
  for _ in range(count):
    x=int(w*(rng.uniform(.02,.26) if rng.random()<.5 else rng.uniform(.74,.98)))
    y=int(h*rng.uniform(.11,.93))
    r=rng.choice((1,1,1,2,2,3))
    dg.ellipse((x-r*4,y-r*4,x+r*4,y+r*4),fill=(*color,int(opacity*.30)))
    d.ellipse((x-r,y-r,x+r,y+r),fill=(*color,opacity))
    if r>=2:
      d.line((x-r*2,y,x+r*2,y),fill=(*color,int(opacity*.64)),width=1)
      d.line((x,y-r*2,x,y+r*2),fill=(*color,int(opacity*.64)),width=1)
  im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(max(2,int(w*.008)))))
  im.alpha_composite(dots)

def bolts(im,rng):
  w,h=im.size
  bloom=Image.new('RGBA',(w,h))
  db=ImageDraw.Draw(bloom,'RGBA')
  core=Image.new('RGBA',(w,h))
  dc=ImageDraw.Draw(core,'RGBA')
  for n in range(7):
    side=n%2
    x=w*rng.uniform(.04,.23) if not side else w*rng.uniform(.77,.96)
    y=h*rng.uniform(.06,.71)
    length=h*rng.uniform(.14,.32)
    pts=[]
    for i in range(10):
      shift=w*rng.uniform(-.032,.032)
      xx=max(2,min(w-2,int(x+shift)))
      pts.append((xx,int(y+length*i/9)))
    db.line(pts,fill=(155,65,255,205),width=max(5,int(w*.023)),joint='curve')
    dc.line(pts,fill=(168,98,255,244),width=max(2,int(w*.008)),joint='curve')
    dc.line(pts,fill=(247,232,255,252),width=max(1,int(w*.0025)),joint='curve')
    for pivot in (3,6):
      xx,yy=pts[pivot]
      dx=int(w*(.035 if not side else -.035))
      dc.line([(xx,yy),(xx+dx,yy-int(h*.035)),(xx+dx*1.2,yy-int(h*.06))],
              fill=(202,164,255,218),width=max(1,int(w*.002)))
  im.alpha_composite(bloom.filter(ImageFilter.GaussianBlur(max(5,int(w*.028)))))
  im.alpha_composite(core)

def render(im,eff,astral,seed):
  rng=Random(seed)
  photo=ImageEnhance.Contrast(im.convert('RGB')).enhance(1.045).convert('RGBA')
  if astral:
    haze(photo,(35,83,200),seed+17,12,125)
    haze(photo,(116,41,173),seed+21,9,90)
    stars(photo,(200,224,255),rng,68,218)
  if eff=='ambra':
    haze(photo,(235,116,40),seed+1,10,100)
    stars(photo,(255,198,96),rng,88,255)
  elif eff=='fulmine':
    haze(photo,(105,58,189),seed+3,10,111)
    bolts(photo,rng)
    stars(photo,(220,180,255),rng,28,220)
  elif eff=='ombra':
    haze(photo,(25,19,43),seed+7,14,126)
    haze(photo,(80,42,116),seed+8,6,78)
  elif eff=='nebula':
    haze(photo,(31,87,172),seed+5,13,123)
    haze(photo,(122,43,173),seed+6,11,109)
    stars(photo,(182,208,255),rng,76,225)
  return photo.convert('RGB')

def main():
  output=ROOT/'img/personaggi/combinazioni'
  written=0
  for cls,armors in CLASSES.items():
    sources=[(f'stato-{i}',ROOT/f'img/personaggi/stati/{cls}-{i}.webp')
             for i in range(6)]
    sources +=[(a,ROOT/f'img/personaggi/armature/{a[len("armatura-"):]}.webp')
               for a in armors]
    for key,path in sources:
      if not path.is_file():raise SystemExit(f'Missing input {path}')
      source=Image.open(path).convert('RGB')
      source.thumbnail((720,1080),Image.Resampling.LANCZOS)
      for fx in EFFECTS:
        for astral in (False,True):
          if fx=='nessuno' and not astral:continue
          suffix=('astrale' if fx=='nessuno' else fx+('-astrale' if astral else ''))
          filename=output/cls/key/(suffix+'.webp')
          filename.parent.mkdir(parents=True,exist_ok=True)
          salt=int(sha256((cls+key+suffix).encode()).hexdigest()[:9],16)
          picture=render(source,fx,astral,salt)
          picture.save(filename,'WEBP',quality=85,method=5)
          if picture.width<320 or picture.height<480:raise RuntimeError(filename)
          written+=1
  assert written==216,written
  print(f'Created {written} variants at {output}')

if __name__=='__main__':
  main()
