#!/usr/bin/env python3
"""v378: repair the three FIRST/free Divine Aura portraits only.

The original v365 base had broken feather-like luminous fragments; v373-v375
just copied them and drew partial gold strokes over them. Here all three
free portraits start from their REAL clean, armor+weapon stage 5 photographs.
The aura is one shared bright, photographic FX matte extracted from an
already-approved shop Divine portrait, supplemented by volumetric glows and
a full golden magic floor. No faces, blades, shields or armor are generated.
The other SIX approved shop photos are copied byte-for-byte from v375.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np, math, random, shutil, hashlib, json, io

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/"img/personaggi/aura-divina-v378"
DOCS=ROOT/"docs"
W,H=720,1080
SIZE=(W,H)
R=Image.Resampling.LANCZOS
CLASSES={
 "assassino":("base","armatura-assassino-notte","armatura-assassino-spettro"),
 "guerriero":("base","armatura-guerriero-braci","armatura-guerriero-abisso"),
 "berserker":("base","armatura-berserker-rabbia","armatura-berserker-apocalisse"),
}
# Hand-verified height from the ORIGINAL clean photographs; preserve
# the original character and exactly the same target head/foot zoom.
BODY_BOUNDS={"assassino":(47,1042),"guerriero":(58,1040),"berserker":(25,1044)}
TARGET_HEAD,TARGET_FOOT=78,997

def atmospheric_backdrop():
    rng=np.random.default_rng(378)
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    center=np.exp(-((xx-360)/310)**2-((yy-470)/590)**2)
    head=np.exp(-((xx-360)/190)**2-((yy-246)/275)**2)
    low=np.exp(-((xx-360)/370)**2-((yy-870)/205)**2)
    mist=np.zeros((H,W),dtype='float32')
    # Multiple spatial scales: photographic fog rather than a flat black
    # rectangle. Fixed random seed means all THREE aura backgrounds match.
    for scale,weight in [(13,4.6),(34,5.8),(74,5.2),(150,3.7)]:
        small=rng.random((max(2,math.ceil(H/scale)),max(2,math.ceil(W/scale))),dtype=np.float32)
        mi=Image.fromarray(np.uint8(small*255),'L').resize(SIZE,R)
        mist+=((np.asarray(mi,dtype=np.float32)/255)-.5)*weight
    bottom=np.clip((yy-760)/300,0,1)
    star= (7*center + 4*head + mist)
    base=np.empty((H,W,4),dtype=np.uint8)
    base[:,:,0]=np.clip(21+star*1.40+22*low+5*bottom,0,255)
    base[:,:,1]=np.clip(19+star*1.17+15*low+4*bottom,0,255)
    base[:,:,2]=np.clip(19+star*.96+7*low+4*bottom,0,255)
    base[:,:,3]=255
    return Image.fromarray(base,'RGBA')

def extract_approved_photographic_fx():
    source=ROOT/"img/personaggi/aura-divina-v375/assassino/armatura-assassino-notte.webp"
    with Image.open(source) as im:
        data=np.asarray(im.convert('RGB'),dtype=np.float32)
    rr,gg,bb=data[:,:,0],data[:,:,1],data[:,:,2]
    peak=np.max(data,axis=2)
    # Keep light from the actual photographed Divine wisps, not the old
    # Assassin body. Central safety matte excludes visible clothing.
    golden=(rr>gg*1.065)&(gg>bb*1.13)&(rr>120)&(gg>73)
    luminous=(np.min(data,axis=2)>145)&(peak>181)
    quality=(golden|luminous).astype(np.float32)
    intensity=np.clip((peak-106)/122,0,1)**.80
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    # No pasted pixels of the shop Assassin: isolate outer atmospheric FX.
    protect=np.clip(((xx-360)/220)**2+((yy-532)/475)**2,0,4)
    external=np.clip((protect-.92)*2.6,0,1)
    # In the floor region, only gold sigils are retained.
    external=np.where(yy>907,1,external)
    alpha=np.clip(intensity*quality*external*245,0,250).astype('uint8')
    rgba=np.dstack([data.astype('uint8'),alpha])
    result=Image.fromarray(rgba,'RGBA')
    # Warm light cast into the scene behind the bright photographic wisps.
    bloom=result.filter(ImageFilter.GaussianBlur(23))
    bloom.putalpha(bloom.getchannel('A').point(lambda a:min(210,round(a*1.12))))
    return bloom,result

def divine_light_template():
    bg=atmospheric_backdrop()
    photo_bloom,photo=extract_approved_photographic_fx()
    bg.alpha_composite(photo_bloom)
    bg.alpha_composite(photo)
    halo=Image.new('RGBA',SIZE,(0,0,0,0))
    d=ImageDraw.Draw(halo,'RGBA')
    # No giant oval contour. The previous v376-style wireframe looked
    # flat and synthetic. Use the actual photographic ribbons from the
    # approved Shop image, with only a natural halo and floor foundation.
    # Full, soft moonlike halo around the head, placed BEHIND the character.
    d.ellipse((212,59,508,355),outline=(255,207,99,218),width=9)
    d.ellipse((218,65,502,349),outline=(255,238,175,190),width=3)
    # Swirling light ribbons are wide and highly luminous, not thin black
    # outlined ellipses; they share positions and colors on all three.
    for yc,rx,ry,rot in [(426,340,103,-.22),(704,338,123,.27)]:
        points=[]
        for i in range(400):
            theta=math.tau*i/399
            xx=rx*math.cos(theta); yy=ry*math.sin(theta)
            points.append((int(360+xx*math.cos(rot)-yy*math.sin(rot)),
                           int(yc+xx*math.sin(rot)+yy*math.cos(rot))))
        d.line(points,fill=(255,207,111,119),width=14,joint="curve")
        d.line([(x,y-3) for x,y in points],fill=(255,242,185,169),width=5,joint="curve")
        d.line([(x,y-4) for x,y in points],fill=(255,255,218,116),width=2,joint="curve")
    # Actual bright floor portal with elliptical runes and light pools.
    for b,opacity,width in [
      ((42,916,678,1043),185,11),((54,931,666,1033),240,5),
      ((78,949,642,1025),220,3),((117,963,603,1018),150,3)]:
        d.ellipse(b,outline=(255,220,120,opacity),width=width)
    for deg in range(0,360,12):
        angle=math.radians(deg)
        x=360+275*math.cos(angle);y=979+37*math.sin(angle)
        d.ellipse((x-2,y-2,x+2,y+2),fill=(255,244,190,225))
    # Glowing motes, more concentrated along the two sides of the body.
    rng=random.Random(378)
    for i in range(470):
        x=rng.randrange(14,W-14)
        y=rng.randrange(30,1045)
        if 165<x<555 and 110<y<900:continue
        rad=2 if i%16==0 else 1
        opacity=175 if rad==2 else 90
        d.ellipse((x-rad,y-rad,x+rad,y+rad),fill=(255,223,157,opacity))
    glow=halo.filter(ImageFilter.GaussianBlur(20))
    glow.putalpha(glow.getchannel('A').point(lambda a:min(212,int(a*1.32))))
    bg.alpha_composite(glow)
    bg.alpha_composite(halo)
    return bg

def extract_real_person(session,cls):
    from rembg import remove
    source=ROOT/"img/personaggi/stati"/(cls+"-5.webp")
    with Image.open(source) as original:
        orig=original.convert('RGB').resize(SIZE,R)
    buf=io.BytesIO();orig.save(buf,'PNG')
    segmentation=Image.open(io.BytesIO(remove(buf.getvalue(),session=session))).convert('RGBA')
    # Keep photographed pixel values, use model ONLY for alpha matte.
    aa=np.asarray(segmentation.getchannel('A'),dtype=np.float32)
    aa=np.uint8(np.clip((aa-12)*255/240,0,255))
    person=orig.convert('RGBA')
    person.putalpha(Image.fromarray(aa,'L'))
    return person,source

def normalized(person,cls):
    top,bottom=BODY_BOUNDS[cls]
    scale=(TARGET_FOOT-TARGET_HEAD)/(bottom-top)
    rw,rh=round(W*scale),round(H*scale)
    im=person.resize((rw,rh),R)
    ox=(W-rw)//2;oy=round(TARGET_HEAD-top*scale)
    img=Image.new('RGBA',SIZE,(0,0,0,0))
    dx,dy=max(0,ox),max(0,oy)
    sx,sy=max(0,-ox),max(0,-oy)
    width=min(W-dx,rw-sx); height=min(H-dy,rh-sy)
    img.alpha_composite(im.crop((sx,sy,sx+width,sy+height)),(dx,dy))
    return img

def main():
    from rembg import new_session
    session=new_session('isnet-general-use')
    aura=divine_light_template()
    OUT.mkdir(parents=True,exist_ok=True);DOCS.mkdir(exist_ok=True)
    manifest=[];gallery=[]
    for cls,armors in CLASSES.items():
        for arm in armors:
            dest=OUT/cls/(arm+'.webp')
            dest.parent.mkdir(parents=True,exist_ok=True)
            if arm=='base':
                person,src=extract_real_person(session,cls)
                scaled=normalized(person,cls)
                # Original subject over light. The pixels of faces/armor,
                # real hand-held weapon and shield are not overpainted.
                result=aura.copy()
                shadow=scaled.getchannel('A').filter(ImageFilter.GaussianBlur(26))
                shadow=shadow.point(lambda v:round(v*.19))
                rim=Image.new('RGBA',SIZE,(255,204,118,0));rim.putalpha(shadow)
                result.alpha_composite(rim)
                result.alpha_composite(scaled)
                result.convert('RGB').save(dest,'WEBP',quality=96,method=5)
                mode='repaired-free-original'
            else:
                src=ROOT/'img/personaggi/aura-divina-v375'/cls/(arm+'.webp')
                shutil.copyfile(src,dest)
                mode='approved-shop-unchanged'
            assert dest.stat().st_size>42000
            manifest.append({'classe':cls,'armatura':arm,'mode':mode,'source':str(src.relative_to(ROOT)),
              'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),
              'final_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),
              'aura_template':'v378-photographic-gold' if arm=='base' else 'approved-v375-unchanged',
              'canvas':[720,1080],'head_y':78,'feet_y':997})
            with Image.open(dest) as f:
                gallery.append((cls,arm,f.convert('RGB').copy()))
    grid=Image.new('RGB',(858,1329),(15,12,18))
    painter=ImageDraw.Draw(grid)
    for i,(cls,arm,pic) in enumerate(gallery):
        x=(i%3)*286;y=(i//3)*443
        grid.paste(pic.resize((280,420),R),(x+3,y+3))
        painter.text((x+6,y+427),cls+' '+arm.replace('armatura-','')[:23],fill=(245,220,174))
    grid.save(DOCS/'aura-divina-v378-preview.jpg','JPEG',quality=93)
    (DOCS/'aura-divina-v378-manifest.json').write_text(
        json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
    assert sum(m['mode']=='repaired-free-original' for m in manifest)==3
    assert sum(m['mode']=='approved-shop-unchanged' for m in manifest)==6
    print('Rendered 3 repaired originals + 6 byte-identical previously approved Shop variants.')
if __name__=="__main__":
    main()
