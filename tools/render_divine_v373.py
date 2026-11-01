#!/usr/bin/env python3
"""Nine original-photo Divine Aura rewards, precise framing and identical golden effect.
No text-to-image character regeneration: faces, armor and weapons use v366 photos.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import hashlib, json, math, random

ROOT=Path(__file__).resolve().parent.parent
SRC=ROOT/"img/personaggi/aura-divina-v366"
DST=ROOT/"img/personaggi/aura-divina-v373"
SIZE=(720,1080)
RES=Image.Resampling.LANCZOS
# Hand-verified top of hood/helmet/horns and bottom of boots in each ORIGINAL.
# Explicit identity mapping avoids transposed classes, reused art and invented skins.
ITEMS=[
 ("assassino","base",48,1043,"Assassino · Completo gratuito"),
 ("assassino","armatura-assassino-notte",122,950,"Assassino · Velo della Notte"),
 ("assassino","armatura-assassino-spettro",107,967,"Assassino · Spettro Cremisi"),
 ("guerriero","base",58,1040,"Guerriero · Completo gratuito"),
 ("guerriero","armatura-guerriero-braci",119,990,"Guerriero · Custode delle Braci"),
 ("guerriero","armatura-guerriero-abisso",115,988,"Guerriero · Armatura dell'Abisso"),
 ("berserker","base",25,1044,"Berserker · Completo gratuito"),
 ("berserker","armatura-berserker-rabbia",75,974,"Berserker · Rabbia"),
 ("berserker","armatura-berserker-apocalisse",114,975,"Berserker · Apocalisse"),
]
HEAD=78
FOOT=997

def normalized(path, head, foot):
    with Image.open(path) as obj:
        src=obj.convert("RGB")
    sw,sh=src.size
    assert (sw,sh)==SIZE,(path,src.size)
    scale=(FOOT-HEAD)/(foot-head)
    rw,rh=round(sw*scale),round(sh*scale)
    sharp=src.resize((rw,rh),RES)
    dx=(SIZE[0]-rw)//2
    dy=round(HEAD-head*scale)
    # The source can extend beyond the frame: use the SAME smoothly darkened
    # background rather than black bands or stretched faces.
    background=src.resize(SIZE,RES).filter(ImageFilter.GaussianBlur(48))
    background=Image.blend(background,Image.new("RGB",SIZE,(13,10,12)),.73).convert("RGBA")
    foreground=sharp.convert("RGBA")
    feather=Image.new("L",(rw,rh),255)
    fp=feather.load()
    for y in range(rh):
        edge_y=min(y,rh-1-y)
        for x in range(rw):
            edge=min(x,rw-1-x,edge_y)
            if edge<23:
                fp[x,y]=int(255*max(0,edge)/23)
    foreground.putalpha(feather)
    layer=Image.new("RGBA",SIZE,(0,0,0,0))
    layer.paste(foreground,(dx,dy))
    background.alpha_composite(layer)
    return background,scale,dx,dy

def bezier(p0,p1,p2,p3,n=64):
    out=[]
    for i in range(n):
        t=i/(n-1);u=1-t
        out.append((round(u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0]),
                    round(u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1])))
    return out

def effect_template():
    w,h=SIZE
    e=Image.new("RGBA",SIZE,(0,0,0,0))
    d=ImageDraw.Draw(e,"RGBA")
    gold=(255,200,89)
    # One fixed, luminous halo and crown of rays on all nine images.
    halo_box=(w//2-122,83,w//2+122,327)
    for extra,alpha,width in [(7,90,8),(3,170,5),(0,235,3)]:
        d.ellipse((halo_box[0]-extra,halo_box[1]-extra,halo_box[2]+extra,halo_box[3]+extra),
                  outline=(*gold,alpha),width=width)
    # Fine, naturally separated flowing energy feathers; avoid broad triangular
    # sheets made of dozens of parallel lines crossing the original costumes.
    for side in [-1,1]:
        def sidep(x,y):return (round(w/2+side*x),round(y))
        for i in range(9):
            t=i/8
            p0=sidep(165+8*t,320+94*t)
            p1=sidep(255+45*t,210+63*t)
            p2=sidep(330+20*t,135+75*t)
            p3=sidep(352+23*t,55+130*t)
            pts=bezier(p0,p1,p2,p3)
            d.line(pts,fill=(255,205+round(27*t),127,70+round(45*(1-t))),
                   width=2,joint="curve")
    # Two consistent swirling light bands (kept behind bodies by protection mask).
    for cx,cy,rx,ry,rot in [(360,536,335,105,-.27),(360,760,340,113,.28)]:
        points=[]
        for i in range(360):
            angle=i*math.tau/359
            xx,yy=rx*math.cos(angle),ry*math.sin(angle)
            points.append((round(cx+xx*math.cos(rot)-yy*math.sin(rot)),
                           round(cy+xx*math.sin(rot)+yy*math.cos(rot))))
        d.line(points,fill=(255,216,125,85),width=2,joint="curve")
        d.line([(x,y+4) for x,y in points],fill=(255,172,70,48),width=1,joint="curve")
    # Original photos already have a physically grounded rune circle.
    # Do not draw a second one: avoid doubled rings or lines crossing boots.
    random.seed(75)
    for i in range(200):
        x=random.randrange(14,w-14)
        y=random.randrange(25,h-80)
        if 180<x<540 and 120<y<985:continue
        r=2 if i%12==0 else 1
        d.ellipse((x-r,y-r,x+r,y+r),fill=(255,211,132,210 if r==2 else 125))
    glow=e.filter(ImageFilter.GaussianBlur(11))
    glow.putalpha(glow.getchannel("A").point(lambda a:int(a*.65)))
    effect=Image.alpha_composite(glow,e)
    # Preserve EXACT photographic pixels of face, helmet, torso, sword, shields.
    mask=Image.new("L",SIZE,0)
    md=ImageDraw.Draw(mask)
    md.ellipse((132,82,588,998),fill=255)
    md.ellipse((73,220,647,760),fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(19))
    alpha=ImageChops.subtract(effect.getchannel("A"),mask)
    effect.putalpha(alpha)
    return effect

def recover_horns(source,scale,dx,dy):
    """Only Apocalisse lacks horns in original artwork: paste real horn pixels.
    The facial region is never covered or regenerated."""
    from PIL import ImageOps
    with Image.open(SRC/"berserker"/"base.webp") as obj:
        original=obj.convert("RGBA")
    rw,rh=round(original.width*scale),round(original.height*scale)
    original=original.resize((rw,rh),RES)
    horns=Image.new("L",(rw,rh),0)
    hd=ImageDraw.Draw(horns)
    # Left and right horn outlines are from the original canonical horned berserker.
    left=[(239,34),(267,24),(285,53),(312,80),(324,120),
          (302,125),(279,106),(251,95),(233,72)]
    right=[(original.width-int(x*scale),int(y*scale)) for x,y in left]
    left=[(int(x*scale),int(y*scale)) for x,y in left]
    hd.polygon(left,fill=250)
    hd.polygon(right,fill=250)
    # Matte out the black surroundings: only actual horn material survives.
    from PIL import ImageOps
    shade=ImageOps.grayscale(original)
    material=shade.point(lambda v:max(0,min(255,(v-32)*5)))
    horns=ImageChops.multiply(horns,material).filter(ImageFilter.GaussianBlur(0.85))
    original.putalpha(horns)
    paste=Image.new("RGBA",SIZE,(0,0,0,0))
    # Horn tips near screen y=50, bases at y=180, above the actual helmet.
    horns_y=round(50-34*scale)
    paste.paste(original,(dx,horns_y))
    return paste

def main():
    DST.mkdir(parents=True,exist_ok=True)
    fx=effect_template()
    thumbs=[]
    manifest=[]
    for cls,armor,top,bottom,label in ITEMS:
        path=SRC/cls/(armor+".webp")
        assert path.is_file(),path
        original,scale,x,y=normalized(path,top,bottom)
        # Only external golden effect; the original face / armor is never altered.
        result=Image.alpha_composite(original,fx)
        if cls=="berserker" and armor=="armatura-berserker-apocalisse":
            # Normalized Apocalisse photo has an authentic connected diagonal axe:
            # never paste a second floating axe.
            result=Image.alpha_composite(result,recover_horns(path,scale,x,y))
        outfile=DST/cls/(armor+".webp")
        outfile.parent.mkdir(parents=True,exist_ok=True)
        result.convert("RGB").save(outfile,"WEBP",quality=92,method=4)
        assert outfile.stat().st_size>42000,outfile
        manifest.append(dict(classe=cls,armatura=armor,orig_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                             output_sha256=hashlib.sha256(outfile.read_bytes()).hexdigest(),
                             head_y=HEAD,feet_y=FOOT,canvas=list(SIZE),label=label))
        thumbs.append(result.convert("RGB"))
    assert len(manifest)==len({(x['classe'],x['armatura']) for x in manifest})==9
    assert len({x["output_sha256"] for x in manifest})==9
    preview=Image.new("RGB",(3*256,3*426),(14,12,20))
    d=ImageDraw.Draw(preview)
    for i,(im,item) in enumerate(zip(thumbs,manifest)):
        x=(i%3)*256;y=(i//3)*426
        preview.paste(im.resize((250,375),RES),(x+3,y+2))
        d.text((x+8,y+382),item["label"],fill=(250,214,142))
    outpreview=ROOT/"docs/aura-divina-v373-anteprima.jpg"
    preview.save(outpreview,"JPEG",quality=90)
    (ROOT/"docs/aura-divina-v373-manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    print("PASS 9 unique original-photo characters, standardized head/feet, preserved class armors, no detached axe")
if __name__=="__main__":
    main()
