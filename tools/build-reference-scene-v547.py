#!/usr/bin/env python3
"""v547: restore softly continuous magical trails, full runes and soft edges.
Postprocesses original-color v546 panels without repainting characters, armor,
faces or the exterior photographic magic. All five 461x440 frames stay RGBA.
"""
from pathlib import Path
from math import sin,cos,pi
import json,random
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter

root=Path(__file__).resolve().parents[1]
folder=root/'img/effetti'
before=Image.open(folder/'reference-scene-v546.webp').convert('RGBA')
assert before.size==(1383,880)
W,H=461,440
labels=['ambra','ombra','fulmine','nebula','astrale']
coords=[(0,0),(1,0),(2,0),(0,1),(1,1)]
colors=[(255,172,47),(200,86,250),(171,88,255),(84,163,255),(226,112,255)]
atlas=Image.new('RGBA',before.size,(0,0,0,0))
Y,X=np.mgrid[0:H,0:W]
def smooth(t):
 t=np.clip(t,0,1)
 return t*t*(3-2*t)
trailpaths={
 'ambra':[
  ((.275,.176),(.390,.045),(.621,.150),(.745,.150)),
  ((.260,.448),(.423,.255),(.596,.560),(.743,.410)),
  ((.260,.698),(.415,.580),(.623,.745),(.751,.667))],
 'ombra':[
  ((.26,.25),(.39,.11),(.61,.30),(.75,.19)),
  ((.26,.54),(.42,.39),(.64,.58),(.75,.51))],
 'fulmine':[
  ((.25,.28),(.43,.20),(.61,.32),(.76,.26)),
  ((.26,.55),(.40,.41),(.64,.59),(.75,.60))],
 'nebula':[
  ((.26,.30),(.40,.09),(.62,.34),(.76,.16)),
  ((.24,.55),(.44,.31),(.59,.71),(.77,.62))],
 'astrale':[
  ((.27,.38),(.44,.21),(.63,.41),(.75,.26)),
  ((.25,.68),(.41,.49),(.64,.68),(.76,.54))],
}
record={}
for name,(col,row),color in zip(labels,coords,colors):
 frame=before.crop((col*W,row*H,(col+1)*W,(row+1)*H))
 # The old figure once occluded the middle; lighten this solid oval
 # without touching the original bright photographic rim.
 rgba=np.asarray(frame).copy()
 cx,cy=W*.5,H*.886
 rx,ry=W*.465,H*.093
 distance=np.sqrt(((X-cx)/rx)**2+((Y-cy)/ry)**2)
 floor_core=smooth((.78-distance)/.3)*smooth((Y-H*.77)/(H*.07))*(1-smooth((Y-H*.95)/(H*.05)))
 rgba[:,:,3]=np.uint8(rgba[:,:,3].astype(np.float32)*(1-.34*floor_core))
 frame=Image.fromarray(rgba,'RGBA')
 # Photographic illumination from the original colorful trailing lights,
 # spread into the vacant area: NO rectangular patch over the old knight.
 src=np.asarray(frame)
 rgb=src[:,:,:3].astype(np.float32)
 brightest=rgb.max(axis=2)
 darkest=rgb.min(axis=2)
 energy=np.clip((brightest-darkest-25)/90,0,1)*np.clip((brightest-50)/160,0,1)*(src[:,:,3]/255)
 haze=cv2.GaussianBlur(energy,(0,0),sigmaX=24,sigmaY=17)
 central=smooth((X-W*.21)/(W*.12))*(1-smooth((X-W*.69)/(W*.13)))
 haze=np.clip(haze*central*.22,0,.14)
 ambient=np.zeros((H,W,4),dtype=np.uint8)
 ambient[:,:,:3]=color
 ambient[:,:,3]=np.uint8(haze*255)
 frame=Image.alpha_composite(frame,Image.fromarray(ambient,'RGBA'))
 # Rebuild only the hidden center of the rune ring in the SAME color and
 # ellipse as the original five circles; do not paint a full flat disk.
 glyph=Image.new('RGBA',(W,H))
 draw=ImageDraw.Draw(glyph)
 for ratio,alpha in ((.46,45),(.62,65),(.76,91),(.86,105),(.95,107)):
  draw.ellipse((cx-rx*ratio,cy-ry*ratio,cx+rx*ratio,cy+ry*ratio),
               outline=(*color,alpha),width=1 if ratio<.8 else 2)
 for k in range(30):
  a=2*pi*k/30
  x0,y0=cx+rx*.77*cos(a),cy+ry*.77*sin(a)
  x1,y1=cx+rx*.89*cos(a),cy+ry*.89*sin(a)
  draw.line(((x0,y0),(x1,y1)),fill=(*color,95 if k%3==0 else 48),width=1)
  if k%5==0:
   draw.ellipse((x0-1,y0-1,x0+1,y0+1),fill=(*color,130))
 glyphPixels=np.asarray(glyph).copy()
 center=smooth((X-W*.205)/(W*.09))*(1-smooth((X-W*.705)/(W*.09)))
 glyphPixels[:,:,3]=np.uint8(glyphPixels[:,:,3]*center)
 glyph=Image.fromarray(glyphPixels,'RGBA')
 bloom=glyph.filter(ImageFilter.GaussianBlur(2.4))
 b=np.asarray(bloom).copy()
 b[:,:,3]=np.uint8(b[:,:,3]*.44)
 frame=Image.alpha_composite(frame,Image.fromarray(b,'RGBA'))
 frame=Image.alpha_composite(frame,glyph)
 # Soft luminous connectors inside gaps where the old armored character
 # previously caused abrupt, severed ends. Never redraw existing side pixels.
 rng=random.Random(547000+col+row*3)
 threads=Image.new('RGBA',(W,H))
 glow=Image.new('RGBA',(W,H))
 lines=ImageDraw.Draw(threads)
 halo=ImageDraw.Draw(glow)
 for ctrl in trailpaths[name]:
  points=[]
  for n in range(101):
   t=n/100
   weights=[(1-t)**3,3*(1-t)**2*t,3*(1-t)*t*t,t**3]
   px=sum(weights[k]*ctrl[k][0] for k in range(4))
   py=sum(weights[k]*ctrl[k][1] for k in range(4))+.0025*sin(45*t+col*3)
   points.append((round(px*W),round(py*H)))
  halo.line(points,fill=(*color,150),width=14)
  for offset,w,alpha in ((-3,2,150),(0,3,220),(4,1,200)):
   lines.line([(xx,yy+offset) for xx,yy in points],fill=(*color,alpha),width=w)
  if name=='ambra':
   lines.line(points,fill=(255,211,122,225),width=1)
  for k in range(0,101,7):
   xx,yy=points[k]
   xx+=rng.randint(-8,8)
   yy+=rng.randint(-7,7)
   rr=rng.choice((1,1,2))
   lines.ellipse((xx-rr,yy-rr,xx+rr,yy+rr),fill=(*color,180))
 glow=glow.filter(ImageFilter.GaussianBlur(6))
 gp=np.asarray(glow).copy()
 tp=np.asarray(threads).copy()
 gap=smooth((X-W*.235)/(W*.085))*(1-smooth((X-W*.69)/(W*.085)))
 strength=gap*(.75 if name=='ambra' else .35)
 gp[:,:,3]=np.uint8(gp[:,:,3]*strength)
 tp[:,:,3]=np.uint8(tp[:,:,3]*strength)
 frame=Image.alpha_composite(frame,Image.fromarray(gp,'RGBA'))
 frame=Image.alpha_composite(frame,Image.fromarray(tp,'RGBA'))
 # Final independent RGBA feathering. A container border must never coincide
 # with a sharp edge of the sprite, especially on phone-sized previews.
 rgba=np.asarray(frame).copy()
 edgeX=smooth((X+.5)/26)*smooth((W-.5-X)/26)
 edgeY=smooth((Y+.5)/16)*smooth((H-.5-Y)/20)
 rgba[:,:,3]=np.uint8(rgba[:,:,3].astype(np.float32)*edgeX*edgeY)
 frame=Image.fromarray(rgba,'RGBA')
 assert rgba[0,:,3].max()<6 and rgba[-1,:,3].max()<6,(name,'hard top/bottom')
 assert rgba[:,0,3].max()<8 and rgba[:,-1,3].max()<8,(name,'hard left/right')
 assert rgba[int(H*.9),W//2,3]>=100,(name,'floor missing')
 atlas.alpha_composite(frame,(col*W,row*H))
 record[name]={'cell':[col,row],'floor_center_alpha':int(rgba[int(H*.9),W//2,3]),
               'left_max_alpha':int(rgba[:,0,3].max()),
               'right_max_alpha':int(rgba[:,-1,3].max())}
 print('V547',name,record[name],flush=True)
dest=folder/'reference-scene-v547.webp'
atlas.save(dest,'WEBP',lossless=True,exact=True,method=5)
assert dest.stat().st_size>450000
with Image.open(dest) as im:
 assert im.size==(1383,880) and im.mode=='RGBA'
(folder/'reference-scene-v547.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print('V547 SAVED',dest.stat().st_size,flush=True)
