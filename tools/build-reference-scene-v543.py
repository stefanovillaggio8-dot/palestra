#!/usr/bin/env python3
"""v543 - reconstruct the five APPROVED photographed effect scenes.

The previous atlas v539 erased a complete human-shaped region, including the
stone floor and circular base. Later versions tried to fill that cutout with a
separate dark photograph, leaving a visible patch. This builder works from
each ORIGINAL approved panel (v537), replaces ONLY the old character using a
Poisson blended clean photographic background (v541), and keeps the original
rings, scenery, sparks, lightning and floor. One seamless RGBA scene per effect.
No recolouring, redraw of characters or synthetic rings.
"""
from pathlib import Path
import base64,io,json
import cv2
import numpy as np
from PIL import Image,ImageDraw,ImageFilter

root=Path(__file__).resolve().parents[1]
src=Image.open(root/'img/effetti/reference-approvata-v537.png').convert('RGB')
background=Image.open(root/'img/effetti/reference-ambiente-v541.webp').convert('RGB')
assert src.size==(1447,1087)
W,H=461,440
assert background.size==(W,H)
out=Image.new('RGBA',(W*3,H*2),(0,0,0,0))
effectdefs=[
 ('ambra',1,0,0,0),('ombra',2,0,1,0),('fulmine',0,1,2,0),
 ('nebula',1,1,0,1),('astrale',2,1,1,1)]
# This polygon follows the old RPG knight, NOT the current player.
# It does not touch the outer ring or the surrounding smoke.
shape=[(.49,.050),(.425,.062),(.365,.115),(.331,.184),(.290,.266),
 (.270,.427),(.232,.624),(.233,.823),(.277,.942),(.31,.975),
 (.708,.975),(.739,.933),(.777,.824),(.777,.548),(.736,.289),
 (.684,.165),(.626,.085),(.56,.050)]
mask=Image.new('L',(W,H),0)
drawer=ImageDraw.Draw(mask)
drawer.polygon([(round(x*W),round(y*H)) for x,y in shape],fill=255)
mask=mask.filter(ImageFilter.MaxFilter(13))
mask_pixels=np.array(mask,dtype=np.uint8)

Y,X=np.mgrid[0:H,0:W].astype(np.float32)
x=(X+.5)/W
y=(Y+.5)/H

def smooth(a,b,z):
    v=np.clip((z-a)/(b-a),0,1)
    return v*v*(3-2*v)

def effect_strength(name, rgb):
    r,g,b=[rgb[:,:,i] for i in range(3)]
    maxc=np.maximum(np.maximum(r,g),b)
    minc=np.minimum(np.minimum(r,g),b)
    if name=='ambra':
        hue=np.minimum(smooth(.07,.42,(r-g)/255),smooth(.09,.45,(r-b)/255))
        intensity=smooth(95,175,r)*smooth(25,88,g)
    elif name=='nebula':
        hue=np.maximum(smooth(.11,.48,(b-r)/255),smooth(.08,.38,(r-g)/255))
        intensity=smooth(70,160,maxc)
    else:
        hue=smooth(.09,.36,(np.maximum(r,b)-g)/255)
        intensity=smooth(75,157,maxc)
    return np.clip(hue*intensity,0,1)

def alpha_for_scene(name, rgb):
    # A very broad, borderless atmosphere instead of a rectangular photo:
    # dark sky blends into the original PWA background.
    fog_x=smooth(.015,.30,x)*(1-smooth(.73,.99,x))
    fog_y=smooth(.012,.17,y)*(1-smooth(.67,.975,y))
    fog=.37*fog_x*fog_y
    # Solid natural photographed STONE behind and between the feet.
    # The foot level remains visible even when the foreground glow is gone.
    floor_x=smooth(.008,.17,x)*(1-smooth(.84,.992,x))
    floor_y=smooth(.66,.835,y)*(1-smooth(.952,.998,y))
    floor=.94*floor_x*floor_y
    illumination=effect_strength(name,rgb)
    # Magic survives the atmospheric fade at the whole border; the rings
    # and particles never acquire another ellipse-shaped punch-out.
    alpha=np.maximum(np.maximum(fog,floor),illumination*.96)
    return np.uint8(np.clip(np.rint(alpha*255),0,255))

manifest={}
for name,px,py,col,row in effectdefs:
    x0=10+px*482
    y0=10+py*543
    original=src.crop((x0,y0,x0+W,y0+H))
    target=cv2.cvtColor(np.array(original),cv2.COLOR_RGB2BGR)
    donor=cv2.cvtColor(np.array(background),cv2.COLOR_RGB2BGR)
    # Clone source inside the former avatar into the original effect photo,
    # matching the border colours (normal Poisson blending). The approved
    # floor, surrounding fire, smoke, galaxy and base remain outside unchanged.
    repaired=cv2.seamlessClone(donor,target,mask_pixels,(W//2,H//2),cv2.NORMAL_CLONE)
    restored=cv2.cvtColor(repaired,cv2.COLOR_BGR2RGB)
    a=alpha_for_scene(name,restored.astype(np.float32))
    scene=Image.fromarray(np.dstack([restored,a]),'RGBA')
    out.alpha_composite(scene,(col*W,row*H))
    middle=[int(a[int(H*p),W//2]) for p in (.79,.84,.89,.94)]
    edges=[int(np.max(a[:,0])),int(np.max(a[:,-1])),
           int(np.max(a[0,:])),int(np.max(a[-1,:]))]
    assert max(middle)>=130,(name,middle)
    # Bright magical bolts and circular arcs MAY reach the outer border.
    # Reject only a continuous opaque rectangular PHOTO edge, not real FX.
    edge_mean=[float(np.mean(a[:,0])),float(np.mean(a[:,-1])),
               float(np.mean(a[0,:])),float(np.mean(a[-1,:]))]
    assert max(edge_mean)<75,(name,edge_mean)
    manifest[name]={'middle_floor_alpha':middle,
                    'edges_alpha':edges,
                    'source_panel':[x0,y0,x0+W,y0+H]}
    print('V543_STAGE',name,'floor',middle,'edges',edges,flush=True)

output=root/'img/effetti/reference-scene-v543.webp'
out.save(output,'WEBP',lossless=True,method=5,exact=True)
assert output.stat().st_size>300000
(root/'img/effetti/reference-scene-v543.json').write_text(
  json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print('V543_SAVED',output.stat().st_size,flush=True)

# Real visual acceptance snapshot: each effect with the character actually
# used in the app. Draw on dark UI background to catch square patches.
previews=[]
for stage in (0,2,4):
    avatar=Image.open(root/f'img/personaggi/cutout/stati/assassino-{stage}.webp').convert('RGBA')
    avatar=avatar.resize((W,H),Image.Resampling.LANCZOS)
    grid=Image.new('RGB',(W*3,H*2),(18,19,37))
    for i,(name,px,py,col,row) in enumerate(effectdefs):
        photo=Image.new('RGBA',(W,H),(18,19,37,255))
        photo.alpha_composite(out.crop((col*W,row*H,(col+1)*W,(row+1)*H)),(0,0))
        photo.alpha_composite(avatar,(0,0))
        grid.paste(photo.convert('RGB'),(col*W,row*H))
    grid.thumbnail((1050,670),Image.Resampling.LANCZOS)
    buf=io.BytesIO()
    grid.save(buf,'JPEG',quality=73,optimize=True)
    encoded=base64.b64encode(buf.getvalue()).decode()
    print('V543_PREVIEW_META:'+str(stage)+':'+str(len(encoded)),flush=True)
    for i in range(0,len(encoded),3200):
        print('V543_PREVIEW_PART:'+str(stage)+':'+str(i//3200).zfill(4)+':'+encoded[i:i+3200],flush=True)
    print('V543_PREVIEW_END:'+str(stage),flush=True)
