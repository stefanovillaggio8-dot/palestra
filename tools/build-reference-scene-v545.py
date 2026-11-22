#!/usr/bin/env python3
"""v545 - full-color photographed stages; remove only the OLD collage knight.

Use exactly the approved pixels around the knight, never recolour or filter the
five spirals, smoke, lightning, galaxies, runes and original photographic floor.
"""
from pathlib import Path
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

root=Path(__file__).resolve().parents[1]
approved=Image.open(root/'img/effetti/reference-approvata-v537.png').convert('RGB')
assert approved.size==(1447,1087)
W,H=461,440
atlas=Image.new('RGBA',(W*3,H*2),(0,0,0,0))
mapping=[('ambra',1,0,0,0),('ombra',2,0,1,0),('fulmine',0,1,2,0),
         ('nebula',1,1,0,1),('astrale',2,1,1,1)]
# Separate torso and two real boots. The whole original magic floor remains.
shapes=[
 [(.49,.047),(.425,.060),(.367,.110),(.328,.184),(.293,.266),
  (.270,.427),(.240,.635),(.225,.735),(.245,.766),(.300,.780),
  (.330,.765),(.374,.730),(.412,.795),(.501,.820),(.585,.786),
  (.629,.730),(.715,.778),(.768,.770),(.778,.730),(.777,.548),
  (.736,.289),(.684,.165),(.626,.085),(.560,.046)],
 [(.375,.690),(.490,.700),(.501,.830),(.484,.925),
  (.475,.957),(.351,.957),(.345,.929),(.367,.830)],
 [(.514,.710),(.638,.690),(.664,.790),(.686,.925),
  (.680,.957),(.560,.957),(.535,.924),(.519,.810)]
]
mask=Image.new('L',(W,H),0)
d=ImageDraw.Draw(mask)
for p in shapes:
    d.polygon([(round(x*W),round(y*H)) for x,y in p],fill=255)
mask=mask.filter(ImageFilter.MaxFilter(21))
inside=np.asarray(mask.filter(ImageFilter.GaussianBlur(11)),dtype=np.float32)[:,:,None]/255
Y,X=np.mgrid[0:H,0:W].astype(np.float32)
fade=np.minimum.reduce([np.ones((H,W),dtype=np.float32),
    X/8,(W-1-X)/8,Y/7,(H-1-Y)/7])
alpha=np.uint8(np.clip(fade,0,1)*255)
donor=np.asarray(Image.open(root/'img/effetti/reference-ambiente-v541.webp').convert('RGB'),dtype=np.float32)
assert donor.shape==(H,W,3)
manifest={}
for name,sx,sy,col,row in mapping:
    l,t=10+sx*482,10+sy*543
    raw=np.asarray(approved.crop((l,t,l+W,t+H)),dtype=np.float32)
    # Erase only the previous knight's pixels. The naturally smoky dark
    # background is softly reconstructed; never draw a rectangular patch.
    # v545b: NO giant amber/purple human-shaped smear. The old approach
    # blurred the glowing old armor into a solid colored silhouette. Use
    # the actual rebuilt dark photographic background instead, muted to
    # match the black theatrical scenery; keep 100% original pixels outside.
    floor_strength=np.clip((Y/H-.68)/.26,0,1)
    fill=donor*(.33+.15*floor_strength[:,:,None])
    tint={
      'ambra':(1.,1.,1.), 'ombra':(.48,.34,.80),
      'fulmine':(.58,.44,.93), 'nebula':(.37,.57,.86),
      'astrale':(.65,.34,.95),
    }[name]
    fill=np.clip(fill*np.array(tint,dtype=np.float32),0,255)
    scene=np.uint8(np.clip(raw*(1-inside)+fill*inside,0,255))
    atlas.alpha_composite(Image.fromarray(np.dstack((scene,alpha)),'RGBA'),(col*W,row*H))
    original_outside=inside[:,:,0]<.0001
    preserved=np.count_nonzero(np.all(scene==raw.astype(np.uint8),axis=2)&original_outside)
    assert preserved>36000,(name,preserved)
    assert np.max(scene[int(.89*H),:W//4])>100,(name,'pavimento perso')
    manifest[name]={'source':[l,t,l+W,t+H],
      'pixel_originali_preservati':int(preserved),'colonna':col,'riga':row}
    print('v545',name,'original pixels kept',preserved,flush=True)
target=root/'img/effetti/reference-scene-v545.webp'
atlas.save(target,format='WEBP',lossless=True,exact=True,method=5)
with Image.open(target) as im:
    assert im.size==(1383,880) and im.mode=='RGBA'
assert target.stat().st_size>600000
(root/'img/effetti/reference-scene-v545.json').write_text(
 json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('v545 atlas',target.stat().st_size,flush=True)
