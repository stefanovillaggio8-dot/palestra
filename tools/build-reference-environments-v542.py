#!/usr/bin/env python3
"""v542: remove the photographic rectangle without deleting the actual floor.

Build five semitransparent environmental stages from the approved photo's
existing cleaned background (v541). Do not alter the characters or VFX atlas:
all five retain exactly the same photographed floor texture, but their
atmosphere is gently tinted to the corresponding magic. A broad alpha taper
removes every straight edge and the obvious brown central rectangle.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance, ImageDraw
import numpy as np
import io, base64
root=Path(__file__).resolve().parents[1]
source=Image.open(root/'img/effetti/reference-ambiente-v541.webp').convert('RGBA')
assert source.size==(461,440),source.size
W,H=source.size
rgb=np.asarray(source,dtype=np.float32)
xs,ys=np.meshgrid((np.arange(W)+.5)/W,(np.arange(H)+.5)/H)
def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1)
    return t*t*(3-2*t)
# The geometry is SHAPED around the ground and the smoke, not a rectangular
# cut-out. Most importantly, the scene always reaches the feet (y=.83-.95).
taperX=smooth(.005,.23,xs)*(1-smooth(.77,.995,xs))
taperTop=smooth(.005,.16,ys)
taperBottom=1-smooth(.935,.998,ys)
fog=np.exp(-((xs-.29)/.40)**2-((ys-.31)/.37)**2)
smoke=.56*taperX*taperTop*(1-smooth(.55,.80,ys))*fog
ground=.96*taperX*smooth(.65,.81,ys)*taperBottom
# No black sticker: dark backdrop is not fully opaque except on the actual
# foot-level stone where the original ground texture should remain legible.
alpha=np.maximum(smoke,ground)*rgb[:,:,3]/255
# The original source includes a reconstructed interior of the old character.
# The broad feather is applied throughout, not only at the rectangular edge.
# The background opacity above the ground is deliberately limited.
alpha=np.clip(alpha,0,.94)
mat=np.uint8(np.rint(alpha*255))
names=['ambra','ombra','fulmine','nebula','astrale']
atlas=Image.new('RGBA',(W*3,H*2),(0,0,0,0))
for i,name in enumerate(names):
    orig=Image.fromarray(np.uint8(rgb[:,:,:3]),'RGB')
    if name!='ambra':
        # Atmosphere matches the element (purple storm, nebula, astral halo).
        # The actual photographed floor's texture is still retained.
        gray=np.asarray(ImageOps.grayscale(orig),dtype=np.float32)/255
        bias={
          'ombra':(65,30,120),'fulmine':(53,36,140),
          'nebula':(31,69,129),'astrale':(92,37,145)
        }[name]
        ar=np.array(orig,dtype=np.float32)
        # Coloured smoke mainly affects upper half; the original stone
        # remains photographic and keeps enough natural variation.
        t=np.clip((.88-ys)/.35,0,1)[:,:,None]*.63
        tinted=np.stack([gray*bias[j] for j in range(3)],axis=-1)
        ar=ar*(1-t)+tinted*t
        orig=Image.fromarray(np.uint8(np.clip(ar,0,255)),'RGB')
    pic=orig.convert('RGBA')
    pic.putalpha(Image.fromarray(mat,'L'))
    atlas.alpha_composite(pic,((i%3)*W,(i//3)*H))
    al=np.asarray(pic.getchannel('A'))
    # Guaranteed no straight bright frame; photographed ground remains.
    assert al[:,0].max()<=3 and al[:,-1].max()<=3,(name,'sides')
    assert al[0,:].max()<=3 and al[-1,:].max()<=3,(name,'top/bottom')
    assert al[int(.87*H),W//2]>=140,(name,'ground absent')
    assert 0<al[int(.35*H),int(.28*W)]<170,(name,'fog too strong')
    print('V542_ENV',name,'foot_alpha',al[int(.87*H),W//2],
          'smoke_alpha',al[int(.35*H),int(.28*W)],flush=True)
atlas.save(root/'img/effetti/reference-ambienti-v542.webp',format='WEBP',
           lossless=True,method=5,exact=True)
assert (root/'img/effetti/reference-ambienti-v542.webp').stat().st_size>120000
# Render a genuine preview of all five effects on the same card background,
# with original magic from v539 plus the verified avatar cutout.
vfx=Image.open(root/'img/effetti/effetti-reference-v539.webp').convert('RGBA')
actor=Image.open(root/'img/personaggi/cutout/stati/assassino-0.webp').convert('RGBA')
actor=actor.resize((W,H),Image.Resampling.LANCZOS)
cards=Image.new('RGB',(W*3,H*2),(17,19,36))
for i in range(5):
    stage=Image.new('RGBA',(W,H),(17,19,36,255))
    stage.alpha_composite(atlas.crop((i%3*W,i//3*H,(i%3+1)*W,(i//3+1)*H)))
    sx=i%3*460;sy=i//3*442
    cell=vfx.crop((sx,sy,sx+460,sy+442))
    resized=cell.resize((int(W*1.64),int(H*1.08)),Image.Resampling.LANCZOS)
    stage.alpha_composite(resized,(-int(W*.32),-int(H*.04)))
    stage.alpha_composite(actor)
    cards.paste(stage.convert('RGB'),((i%3)*W,(i//3)*H))
cards.thumbnail((1030,900),Image.Resampling.LANCZOS)
buf=io.BytesIO()
cards.save(buf,'JPEG',quality=75,optimize=True)
b64=base64.b64encode(buf.getvalue()).decode()
print('V542_IMAGE_META:'+str(len(b64)),flush=True)
for j in range(0,len(b64),3000):
    print('V542_IMAGE_PART:'+str(j//3000).zfill(4)+':'+b64[j:j+3000],flush=True)
print('V542_IMAGE_END',flush=True)
