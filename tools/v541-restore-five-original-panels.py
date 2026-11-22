#!/usr/bin/env python3
"""Restore *each* original photographed magical scene from the approved PNG.
Only mask the old armored character; retain the original sky, ground, runes,
orbits, clouds and surrounding lighting for the five different effects.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
import base64,io
root=Path(__file__).resolve().parents[1]
source=Image.open(root/'img/effetti/reference-approvata-v537.png').convert('RGB')
clean=Image.open(root/'img/effetti/reference-ambiente-v541.webp').convert('RGBA')
assert source.size==(1447,1087)
W,H=461,440
assert clean.size==(W,H)
out=Image.new('RGBA',(3*W,2*H),(0,0,0,0))
effects=[
 ('ambra',1,0,0,0,.60),
 ('ombra',2,0,1,0,.43),
 ('fulmine',0,1,2,0,.44),
 ('nebula',1,1,0,1,.49),
 ('astrale',2,1,1,1,.43),
]
mask=Image.new('L',(W,H),0)
draw=ImageDraw.Draw(mask)
# The old armored figure extends far wider than the present-day avatar:
# erase helmet, cloak, sword/hands, boots; keep everything outside intact.
points=[(.42,.045),(.35,.075),(.305,.14),(.268,.26),(.245,.52),
 (.215,.77),(.265,.89),(.29,.985),(.73,.985),(.775,.885),
 (.79,.71),(.775,.39),(.746,.22),(.68,.095),(.625,.047)]
draw.polygon([(round(x*W),round(y*H)) for x,y in points],fill=255)
mask=mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(8))
for name,srcX,srcY,dx,dy,brightness in effects:
  ix=srcX*482+10;iy=srcY*543+10
  panel=source.crop((ix,iy,ix+W,iy+H))
  # Only the interior formerly occupied by the stranger is reconstructed.
  # It comes from the authentic photograph of the same environment.
  # In the reference, the effect panels have near-BLACK skies. Filling
  # the former avatar with warm fog made an obvious brown silhouette.
  # Keep the exact coloured surroundings outside it and match their
  # darkness inside. Only the bottom strip reveals the photographed stone
  # ground from the original "senza effetto" image.
  dark=(10,7,8) if name=='ambra' else (8,5,17)
  bg=Image.new('RGB',(W,H),dark)
  bp=bg.load();stone=clean.load()
  for yy in range(round(H*.73),H):
    ramp=max(0,min(1,(yy/H-.73)/.22))
    for xx in range(W):
      rr,gg,bb,_=stone[xx,yy]
      power=ramp*(.45 if name=='ambra' else .30)
      bp[xx,yy]=(round(dark[0]*(1-power)+rr*power),
                 round(dark[1]*(1-power)+gg*power),
                 round(dark[2]*(1-power)+bb*power))
  # Sky, effects, smoke and platform OUTSIDE the former body come pixel by
  # pixel from the user's actual reference, not from an invented neon ring.
  combined=Image.composite(bg,panel,mask).convert('RGBA')
  edge=Image.new('L',(W,H),255);ep=edge.load()
  for y in range(H):
    for x in range(W):
      t=min(1,x/14,(W-1-x)/14,y/11,(H-1-y)/16)
      ep[x,y]=max(0,min(255,round(255*max(t,0)**.68)))
  combined.putalpha(edge)
  out.alpha_composite(combined,(dx*W,dy*H))
  print('ORIGINAL_STAGE:'+name+':'+str((ix,iy,ix+W,iy+H)),flush=True)
target=root/'img/effetti/reference-scene-v541.webp'
out.save(target,'WEBP',lossless=True,method=5,exact=True)
assert target.stat().st_size>150000
print('CREATED_STAGE:'+str(target.stat().st_size),flush=True)
# Print thumbnails for a direct visual comparison with the original.
thumb=out.copy()
plate=Image.new('RGB',thumb.size,(14,12,24))
plate.paste(thumb,mask=thumb.getchannel('A'))
plate.thumbnail((900,600),Image.Resampling.LANCZOS)
buffer=io.BytesIO();plate.save(buffer,'JPEG',quality=73,optimize=True)
enc=base64.b64encode(buffer.getvalue()).decode()
print('SCENES541_META:'+str(len(enc)),flush=True)
for i in range(0,len(enc),3000):
 print('SCENES541_PART:'+str(i//3000).zfill(4)+':'+enc[i:i+3000],flush=True)
print('SCENES541_END',flush=True)
