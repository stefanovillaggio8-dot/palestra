#!/usr/bin/env python3
"""v376 — Recompose nine Divine Aura portraits from UNLIT original art.

Do not repaint existing glow: it is baked into the old photos.
Instead isolate the actual original figure, preserve its RGB pixels,
then compose ALL variants over the SAME gold aura background.
Two weapon-safe exceptions start from v366 (Abisso sword, Apocalypse axe)
because their older no-aura weapon variants have visibly broken grips.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, hashlib, json, math, random, io

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/"img/personaggi/aura-divina-v376"
DOCS=ROOT/"docs"
SIZE=(720,1080)
RES=Image.Resampling.LANCZOS
ROWS=[
 ("assassino","base","img/personaggi/stati/assassino-5.webp",45,1041),
 ("assassino","armatura-assassino-notte","img/personaggi/armatura-con-arma-v371/assassino/armatura-assassino-notte/base.webp",80,1025),
 ("assassino","armatura-assassino-spettro","img/personaggi/armatura-con-arma-v371/assassino/armatura-assassino-spettro/base.webp",76,1024),
 ("guerriero","base","img/personaggi/stati/guerriero-5.webp",42,1043),
 ("guerriero","armatura-guerriero-braci","img/personaggi/armatura-con-arma-v371/guerriero/armatura-guerriero-braci/base.webp",75,1020),
 ("guerriero","armatura-guerriero-abisso","img/personaggi/aura-divina-v366/guerriero/armatura-guerriero-abisso.webp",115,988),
 ("berserker","base","img/personaggi/stati/berserker-5.webp",25,1044),
 ("berserker","armatura-berserker-rabbia","img/personaggi/armatura-con-arma-v371/berserker/armatura-berserker-rabbia/base.webp",76,1006),
 ("berserker","armatura-berserker-apocalisse","img/personaggi/aura-divina-v366/berserker/armatura-berserker-apocalisse.webp",114,975),
]
TARGET_HEAD,TARGET_FOOT=78,997

def aura_background():
    w,h=SIZE
    arr=np.zeros((h,w,4),dtype=np.uint8)
    Y,X=np.ogrid[:h,:w]
    radial=np.maximum(0,1-(((X-360)/560)**2 + ((Y-535)/810)**2))
    for i,color in enumerate([11,9,11]):
        arr[:,:,i]=np.clip(color + radial*(9 if i==0 else 5),0,255).astype('uint8')
    arr[:,:,3]=255
    base=Image.fromarray(arr,'RGBA')
    lines=Image.new('RGBA',SIZE,(0,0,0,0))
    d=ImageDraw.Draw(lines,'RGBA')
    # SAME position, radius, color, sparkle seed, stroke and orbit on all 9.
    # One vertical aureole plus divine head halo, one elliptic floor sigil.
    for bounds in [(54,66,666,970),(64,76,656,960)]:
        d.ellipse(bounds,outline=(255,190,79,185),width=5 if bounds[0]==54 else 2)
    for r,width in [(151,6),(142,3)]:
        d.ellipse((360-r,210-r,360+r,210+r),outline=(255,211,114,195),width=width)
    for cx,cy,rx,ry,rot in [(360,518,322,100,-.26),(360,760,322,93,.26)]:
        pts=[]
        for step in range(361):
            a=math.tau*step/360
            xx=rx*math.cos(a); yy=ry*math.sin(a)
            pts.append((round(cx+xx*math.cos(rot)-yy*math.sin(rot)),
                        round(cy+xx*math.sin(rot)+yy*math.cos(rot))))
        d.line(pts,fill=(255,216,126,218),width=4,joint='curve')
        d.line([(x,y-4) for x,y in pts],fill=(255,244,204,128),width=2,joint='curve')
    for b in [(47,928,673,1037),(78,950,642,1024),(118,970,602,1011)]:
        d.ellipse(b,outline=(255,205,100,214),width=3)
    # Floor glyph never randomized per class.
    for a in range(0,360,30):
        t=math.radians(a)
        x=360+270*math.cos(t);y=987+29*math.sin(t)
        d.ellipse((x-2,y-2,x+2,y+2),fill=(255,241,188,210))
    rng=random.Random(376)
    for i in range(250):
        x=rng.randrange(20,w-20); y=rng.randrange(48,h-50)
        if 150<x<555 and 130<y<920: continue
        rad=2 if i%17==0 else 1
        d.ellipse((x-rad,y-rad,x+rad,y+rad),fill=(255,213,128,150))
    glow=lines.filter(ImageFilter.GaussianBlur(13))
    glow.putalpha(glow.getchannel('A').point(lambda a:round(a*.86)))
    base.alpha_composite(glow)
    base.alpha_composite(lines)
    return base

def isolate(session,path):
    from rembg import remove
    raw=Image.open(path).convert('RGB')
    assert raw.size==SIZE,(str(path),raw.size)
    png=io.BytesIO()
    raw.save(png,format='PNG')
    segmented=Image.open(io.BytesIO(remove(png.getvalue(),session=session))).convert('RGBA')
    alpha=np.asarray(segmented.getchannel('A'))
    # Discard low-confidence background glints while keeping anti-aliased edges.
    alpha=np.clip((alpha.astype(np.float32)-22)*255/219,0,255).astype(np.uint8)
    # Maintain exact original photographed RGB: AI is used for matte ONLY.
    source=raw.convert('RGBA')
    source.putalpha(Image.fromarray(alpha,'L'))
    return source,alpha

def fit_character(img,head,feet):
    scale=(TARGET_FOOT-TARGET_HEAD)/(feet-head)
    rw,rh=round(img.width*scale),round(img.height*scale)
    new=img.resize((rw,rh),RES)
    x=(SIZE[0]-rw)//2
    y=round(TARGET_HEAD-head*scale)
    layer=Image.new('RGBA',SIZE,(0,0,0,0))
    # Oversized normalized figures can extend above/left of the fixed canvas.
    # Explicit cropping preserves RGBA alpha without PIL's double-premultiply.
    dx,dy=max(x,0),max(y,0)
    sx,sy=max(0,-x),max(0,-y)
    cw=min(SIZE[0]-dx,new.width-sx)
    ch=min(SIZE[1]-dy,new.height-sy)
    assert cw>0 and ch>0,(x,y,new.size)
    clipped=new.crop((sx,sy,sx+cw,sy+ch))
    layer.alpha_composite(clipped,(dx,dy))
    return layer,scale,x,y

def main():
    from rembg import new_session
    session=new_session('isnet-general-use')
    background=aura_background()
    records=[]
    tiles=[]
    for cls,armor,src,head,feet in ROWS:
        inp=ROOT/src
        assert inp.is_file(),inp
        foreground,mask=isolate(session,inp)
        layer,scale,x,y=fit_character(foreground,head,feet)
        canvas=background.copy()
        canvas.alpha_composite(layer)
        output=canvas.convert('RGB')
        dest=OUT/cls/(armor+'.webp')
        dest.parent.mkdir(parents=True,exist_ok=True)
        output.save(dest,'WEBP',quality=95,method=5)
        assert dest.stat().st_size>40000,dest
        meta=dict(classe=cls,armatura=armor,source=src,source_sha256=hashlib.sha256(inp.read_bytes()).hexdigest(),
                  final_sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
                  aura_template='v376-single-gold-376',canvas=[720,1080],
                  head_y=TARGET_HEAD,feet_y=TARGET_FOOT,segmentation='isnet-general-use',
                  mask_coverage=round(float((mask>140).mean()),4),scale=round(scale,5))
        assert .12<meta['mask_coverage']<.70,(src,meta['mask_coverage'])
        records.append(meta);tiles.append((cls,armor,output))
    assert len(records)==9
    assert len(set(x['final_sha256'] for x in records))==9
    DOCS.mkdir(exist_ok=True)
    gallery=Image.new('RGB',(900,1482),(16,12,18))
    painter=ImageDraw.Draw(gallery)
    for i,(cls,arm,im) in enumerate(tiles):
        x=(i%3)*300;y=(i//3)*494
        gallery.paste(im.resize((292,438),RES),(x+4,y+4))
        painter.text((x+7,y+452),cls+' '+arm.replace('armatura-','')[:24],fill=(254,218,150))
    gallery.save(DOCS/'aura-divina-v376-preview.jpg','JPEG',quality=91)
    (DOCS/'aura-divina-v376-manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
    print('SUCCESS nine originals isolated over identical aura. Visual inspection still required.')
if __name__=='__main__':
    main()
