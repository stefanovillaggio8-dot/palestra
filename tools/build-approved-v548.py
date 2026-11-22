#!/usr/bin/env python3
"""Build v548 from the user's FIVE approved ChatGPT preview images.

This asset is not a new approximation of their magic, but a crop of the five
exactly approved mockups. The SHOWCASE sprite contains the approved hero and
must only be used for the specified default preview. The ENVIRONMENT sprite
removes the baked mockup person for the other class/armor combinations, where
the REAL progression hero is drawn separately and remains unchanged.
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
from urllib.request import Request, urlopen
from PIL import Image
import cv2
import numpy as np

SOURCES = {
  "ambra": "https://d2jqrm6oza8nb6.cloudfront.net/datasets/f125009b-7619-4714-9189-e7eb22ab9bf8.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZDdkYTVlMzZmMmEwZGNiOSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5NTUyMTIwNn0.ETYkAqZ2Zwc9ZFJyYNxcxQQNI49DibDgQMC1OPhBckQ",
  "ombra": "https://d2jqrm6oza8nb6.cloudfront.net/datasets/f0ccb69d-26d0-4d44-9ab5-771984f48747.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiOWFlZjBjNDA4MGY2OWYyYSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5NTQ5MTkwNH0.hr4eSaJn3BZoSxxj52vatZAs1bjwg5ICTAPBJIKkb-k",
  "fulmine": "https://d2jqrm6oza8nb6.cloudfront.net/datasets/18935c0a-21e8-4710-b1bb-7bdbac7d1ff2.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMDMxNmYyNzQ4ZWUwNmQ4MiIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5NTQ3MzkwOH0.0gcygNtBKbvtAn0V8NPjjz24ZCztjNXE1wnjWmE1JG0",
  "nebula": "https://d2jqrm6oza8nb6.cloudfront.net/datasets/1fccdc77-0c16-4a2c-a5c8-543a38e61aef.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiYWY0MWU3YmEzOGE2YTE1NyIsImJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5NTUzMTk2Mn0.PdphmowRjIsgOzYyGV8kOL1uFMVcwHFRIo52dpsEUkw",
  "astrale": "https://d2jqrm6oza8nb6.cloudfront.net/datasets/1dd22666-f7ed-4277-bba4-223bbdeb61a9.png?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiZGZhOTI1OGUwYzE2MjVmZSIsImJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5NTUzMDc2Nn0.5v_9m4KiyzSx-lin_mCHU8VXH6WAugH5oSD8aj6jybY"
}
EXPECTED_SHA256 = {
  "ambra": "17aa844444d1840d1f7f5f604ffb82829ac4e1531f54a429fa6cc294e3e19ec3",
  "ombra": "5ad38afa68b32f9fa8271cae77897ab86c3b8945cd32c5be5bcf93a702bfda21",
  "fulmine": "047a51c7fd54626d79d2fd21f966b0e71c9af4e6a1c5ec990e9a9da72495ad86",
  "nebula": "c30337f317ddc58d91c76931fa9e6927e62c02b65087a686c7d53a1476b2b12e",
  "astrale": "b1b39b1e044c47bfebcde3e5146b8fecfdde6596aa25e168e907fa8ce4caba5a"
}
POSITIONS={'ambra':(0,0),'ombra':(1,0),'fulmine':(2,0),
           'nebula':(0,1),'astrale':(1,1)}
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'img'/'effetti'
OUT.mkdir(parents=True,exist_ok=True)
W,H=626,710
SRC_RECT=(140,660,766,1370)
showcase=Image.new('RGBA',(W*3,H*2))
environment=Image.new('RGBA',(W*3,H*2))
Y,X=np.mgrid[0:H,0:W].astype('float32')
def smooth(v):
    v=np.clip(v,0,1)
    return v*v*(3-2*v)
# No hard crop edges, no magic black rectangle around the hero.
edge=smooth(X/24)*smooth((W-1-X)/24)*smooth(Y/22)*smooth((H-1-Y)/24)
audit={}
for name,(col,row) in POSITIONS.items():
    raw=urlopen(Request(SOURCES[name],headers={'User-Agent':'RPG-Approved-Builder/1.0'}),timeout=40).read()
    assert len(raw)>350000,(name,len(raw))
    digest=hashlib.sha256(raw).hexdigest()
    if digest!=EXPECTED_SHA256[name]:
        print('WARNING upstream encoding differs; check visual provenance',name,digest,flush=True)
    image=Image.open(BytesIO(raw)).convert('RGB')
    assert image.size==(941,1672),(name,image.size)
    original=np.asarray(image.crop(SRC_RECT),dtype=np.uint8)
    # Keep every original approved hero/spiral/rune pixel in the SHOWCASE.
    exact=np.dstack((original,np.uint8(edge*255)))
    showcase.alpha_composite(Image.fromarray(exact,'RGBA'),(col*W,row*H))
    # Remove the baked hero WITHOUT painting a hero-shaped dark silhouette.
    # Broad symmetric smoke center: true class/armor avatar goes in front.
    mask=smooth((X-93)/95)*smooth((W-90-X)/95)*smooth((Y-17)/66)*smooth((H-8-Y)/24)
    photo=original.astype('float32')
    left=np.percentile(photo[:,60:140],28,axis=1)
    right=np.percentile(photo[:,490:563],28,axis=1)
    around=left[:,None,:]*(1-X[:,:,None]/W)+right[:,None,:]*X[:,:,None]/W
    around=cv2.GaussianBlur(around,(0,0),sigmaX=22,sigmaY=16)
    atmosphere=around*.66+np.array(([3,1,2] if name=='ambra' else [3,1,7]),dtype='float32')
    cleaned=np.uint8(np.clip(photo*(1-mask[:,:,None])+atmosphere*mask[:,:,None],0,255))
    environment.alpha_composite(Image.fromarray(np.dstack((cleaned,np.uint8(edge*255))),'RGBA'),
                                (col*W,row*H))
    # Full circle should survive and tiles must be transparent at outer edges.
    assert original[650,60:560].max()>100,name
    assert exact[:,0,3].max()==0 and exact[:,-1,3].max()==0,name
    audit[name]={'cell':[col,row],'crop':[140,660,766,1370],
                 'source_sha256':digest,'original_size':[941,1672],
                 'static_pixels_preserved':int(W*H)}
    print('v548',name,'done',flush=True)
dst_full=OUT/'approved-showcase-v548.webp'
dst_dynamic=OUT/'approved-environments-v548.webp'
showcase.save(dst_full,'WEBP',quality=92,method=6)
environment.save(dst_dynamic,'WEBP',quality=88,method=6)
for p in (dst_full,dst_dynamic):
    with Image.open(p) as im:
        assert im.size==(1878,1420) and im.mode=='RGBA',p
    assert p.stat().st_size>200000,(p,p.stat().st_size)
(OUT/'approved-v548-manifest.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
print('ASSETS READY',dst_full.stat().st_size,dst_dynamic.stat().st_size,flush=True)
