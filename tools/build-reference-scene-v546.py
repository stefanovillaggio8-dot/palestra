#!/usr/bin/env python3
"""v546: original-effect ribbons + photographically restored ground, no ghost.

The original knight is NEVER pasted in the effect sprite. Magic is extracted
by its actual RGB colour from the exact approved photo v537; inside the old
knight silhouette it is removed before the unchanged in-app hero appears.
Dark scenery is generated from the previously restored NO-EFFECT photograph,
with soft alpha at borders, rather than a rectangular painted backdrop.
The existing v540 platform geometry repairs the covered center of each ring.
"""
from pathlib import Path
from math import exp
import json
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter

root=Path(__file__).resolve().parents[1]
ref=Image.open(root/'img/effetti/reference-approvata-v537.png').convert('RGB')
donor=np.asarray(Image.open(root/'img/effetti/reference-ambiente-v541.webp').convert('RGB'),dtype=np.float32)
W,H=461,440
assert ref.size==(1447,1087) and donor.shape==(H,W,3)
shape=[(.49,-.060),(.425,-.020),(.365,.115),(.331,.184),(.290,.266),
(.270,.427),(.232,.624),(.233,.823),(.277,.942),(.31,.975),(.708,.975),
(.739,.933),(.777,.824),(.777,.548),(.736,.289),(.684,.165),(.626,.085),(.56,-.050)]
mask=Image.new('L',(W,H),0)
d=ImageDraw.Draw(mask)
d.polygon([(round(x*W),round(y*H)) for x,y in shape],fill=255)
mask=mask.filter(ImageFilter.MaxFilter(23)).filter(ImageFilter.GaussianBlur(12))
sil=np.asarray(mask,dtype=np.float32)/255
Y,X=np.mgrid[0:H,0:W].astype(np.float32)
x=X/W
y=Y/H
def smooth(a,b,z):
    v=np.clip((z-a)/(b-a),0,1)
    return v*v*(3-2*v)

taperX=smooth(0,.20,x)*(1-smooth(.80,1,x))
taperY=smooth(0,.14,y)*(1-smooth(.91,1,y))
fog=(.17+.27*smooth(.08,.60,y))*taperX*taperY
floor=.92*smooth(.66,.88,y)*(1-smooth(.965,.999,y))*taperX
baseA=np.maximum(fog,floor)
scenes={'ambra':(1,0,0,0),'ombra':(2,0,1,0),'fulmine':(0,1,2,0),
        'nebula':(1,1,0,1),'astrale':(2,1,1,1)}
palette={'ambra':((255,109,17),(255,183,73)),
         'ombra':((136,54,231),(211,93,255)),
         'fulmine':((125,55,251),(208,124,255)),
         'nebula':((28,143,255),(196,67,255)),
         'astrale':((170,48,247),(244,122,255))}
atlas=Image.new('RGBA',(W*3,H*2),(0,0,0,0))
report={}
for name,(px,py,col,row) in scenes.items():
    source_x,source_y=10+px*482,10+py*543
    im=np.asarray(ref.crop((source_x,source_y,source_x+W,source_y+H)),dtype=np.float32)
    r,g,b=[im[:,:,i] for i in range(3)]
    v=im.max(axis=2)
    n=im.min(axis=2)
    sat=(v-n)/(v+1)
    if name=='ambra':
        hue=np.minimum(smooth(5,56,r-g),smooth(3,34,g-b))*smooth(.12,.5,sat)
        energy=hue*smooth(32,145,r)
    else:
        hue=np.maximum(smooth(4,65,b-g),smooth(6,70,r-g))
        energy=hue*smooth(20,140,v)*smooth(.09,.42,sat)
        warm=(r-g>50)&(g-b>20)&(b<r*.65)
        energy=np.where(warm,0,energy)
    # The original armor, cape and boots do not exist in the extracted energy.
    energy*= (1-sil)**1.35
    glare=cv2.GaussianBlur(energy,(0,0),sigmaX=4)
    effectA=np.clip(.97*energy+.32*glare,0,.99)
    # The reference's caption begins below the platform. Never display it
    # as a floating gold/purple banner inside the app's character preview.
    effectA*=1-smooth(.945,.971,y)
    environment=donor.copy()
    if name!='ambra':
        tint={'ombra':(.53,.50,1.11),'fulmine':(.65,.56,1.22),
              'nebula':(.55,.73,1.32),'astrale':(.62,.55,1.31)}[name]
        amount=.54*(1-smooth(.63,.91,y))
        environment=environment*(1-amount[:,:,None])+environment*np.array(tint)[None,None,:]*amount[:,:,None]
    a1=np.clip(baseA,0,.94)
    a2=np.clip(effectA,0,1)
    finalA=a2+a1*(1-a2)
    finalRGB=(im*a2[:,:,None]+environment*a1[:,:,None]*(1-a2[:,:,None]))/np.maximum(finalA[:,:,None],1e-4)
    pixels=np.uint8(np.clip(np.dstack((finalRGB,finalA*255)),0,255))
    scene=Image.fromarray(pixels,'RGBA')
    # Inlaid ring repair in the footprint only. Use v540's original style
    # and palette; never paste another person or draw a second full platform.
    primary,bright=palette[name]
    cx,cy=.50*W,.886*H
    rx,ry=.465*W,.093*H
    ring=np.zeros((H,W,4),dtype=np.uint8)
    for yy in range(int(.76*H),H):
        for xx in range(W):
            rr=(((xx-cx)/rx)**2+((yy-cy)/ry)**2)**.5
            if rr>1.23:
                continue
            inner=exp(-((rr/.85)**4))*.26
            outer=exp(-((rr-1)/.100)**2)*.30
            ring1=exp(-((rr-1.0)/.027)**2)*.60
            ring2=exp(-((rr-.84)/.021)**2)*.42
            ring3=exp(-((rr-.63)/.017)**2)*.22
            a=float(np.clip((inner+outer+ring1+ring2+ring3)*.8*sil[yy,xx],0,1))
            if a<.015:
                continue
            mix=.24 if rr<.65 else .55
            ring[yy,xx,:3]=[round(primary[k]*(1-mix)+bright[k]*mix) for k in range(3)]
            ring[yy,xx,3]=round(a*255)
    scene=Image.alpha_composite(scene,Image.fromarray(ring,'RGBA'))
    atlas.alpha_composite(scene,(col*W,row*H))
    alpha=np.asarray(scene.getchannel('A'))
    middle=int(alpha[int(H*.90),W//2])
    edge_means=[float(alpha[:,0].mean()),float(alpha[:,-1].mean()),
                float(alpha[0].mean()),float(alpha[-1].mean())]
    # Lightning may reach an upper edge, but there can be NO opaque photo box.
    assert min(edge_means)<15,(name,edge_means)
    assert middle>=100,(name,'floor missing',middle)
    report[name]={'source':[source_x,source_y,source_x+W,source_y+H],
                  'cell':[col,row],'floor_center_alpha':middle,
                  'edge_alpha_means':edge_means}
    print('V546',name,'floor',middle,'edges',edge_means,flush=True)
out=root/'img/effetti/reference-scene-v546.webp'
atlas.save(out,'WEBP',lossless=True,exact=True,method=5)
with Image.open(out) as check:
    assert check.size==(1383,880) and check.mode=='RGBA'
assert out.stat().st_size>650000
(root/'img/effetti/reference-scene-v546.json').write_text(
    json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('V546_SAVED',out.stat().st_size,flush=True)
