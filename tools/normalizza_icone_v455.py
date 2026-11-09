from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

source=Image.open('img/esercizi/esercizi-verificati-v451.webp').convert('RGB')
w,h=source.size
assert w%8==0 and h%10==0
cw,ch=w//8,h//10
SIZE=256

def background():
    yy,xx=np.ogrid[:SIZE,:SIZE]
    radius=np.sqrt(((xx-SIZE*.5)/(SIZE*.46))**2+((yy-SIZE*.49)/(SIZE*.46))**2)
    top=np.clip(1-yy/SIZE,0,1)+np.zeros_like(radius)
    outer=np.stack((38+17*top,10+7*top,54+22*top),axis=2)
    radial=np.clip(1-radius,0,1)
    inner=np.stack((99+33*radial,23+9*radial,177+35*radial),axis=2)
    blend=np.clip((1-radius)*28,0,1)[...,None]
    im=Image.fromarray((outer*(1-blend)+inner*blend).astype('uint8'),'RGB').convert('RGBA')
    ImageDraw.Draw(im).rounded_rectangle((4,4,SIZE-5,SIZE-5),radius=27,outline=(189,35,250,255),width=5)
    return im

def extract(pic,index):
    p=np.array(pic)
    hh,ww=p.shape[:2]
    hsv=cv2.cvtColor(p,cv2.COLOR_RGB2HSV)
    r,g,b=[p[:,:,i].astype('float32') for i in range(3)]
    skin=(r>90)&(g>47)&(r>g*1.20)&(g>b*1.15)&(r>b*1.30)
    blue=(hsv[:,:,0]>=93)&(hsv[:,:,0]<=127)&(hsv[:,:,1]>=62)&(hsv[:,:,2]>55)
    metal=(hsv[:,:,1]<52)&(hsv[:,:,2]>88)
    seed=(skin|blue|metal).astype('uint8')
    edge=max(4,round(min(hh,ww)*.025))
    seed[:edge,:]=0; seed[-edge:,:]=0; seed[:,:edge]=0; seed[:,-edge:]=0
    if np.count_nonzero(seed)<45:return None
    near=cv2.dilate(seed,np.ones((21,21),np.uint8))
    mask=np.full((hh,ww),cv2.GC_PR_BGD,dtype='uint8')
    mask[near>0]=cv2.GC_PR_FGD
    mask[seed>0]=cv2.GC_FGD
    mask[:edge,:]=cv2.GC_BGD;mask[-edge:,:]=cv2.GC_BGD
    mask[:,:edge]=cv2.GC_BGD;mask[:,-edge:]=cv2.GC_BGD
    try:
        cv2.grabCut(cv2.cvtColor(p,cv2.COLOR_RGB2BGR),mask,None,
          np.zeros((1,65),np.float64),np.zeros((1,65),np.float64),5,cv2.GC_INIT_WITH_MASK)
    except cv2.error as exc:
        print(f'warning {index}: {exc}')
        return None
    alpha=np.where(np.isin(mask,[cv2.GC_FGD,cv2.GC_PR_FGD]),255,0).astype('uint8')
    alpha=cv2.morphologyEx(alpha,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    alpha=cv2.GaussianBlur(alpha,(3,3),.6)
    ys,xs=np.where(alpha>100)
    if len(xs)==0:return None
    box=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))
    area=(box[2]-box[0])*(box[3]-box[1])/(hh*ww)
    if area<.10 or area>.93:return None
    cut=Image.fromarray(np.dstack((p,alpha)),'RGBA').crop(box)
    f=min((SIZE*.91)/cut.width,(SIZE*.91)/cut.height)
    return cut.resize((max(1,round(cut.width*f)),max(1,round(cut.height*f))),Image.Resampling.LANCZOS)

result=Image.new('RGB',(SIZE*8,SIZE*10))
success=[]
for row in range(10):
    for col in range(8):
        idx=row*8+col
        src=source.crop((col*cw,row*ch,(col+1)*cw,(row+1)*ch))
        canvas=background()
        fg=extract(src,idx)
        if fg is None:
            # Fallback sicuro: non eliminare parti dell'attrezzatura.
            canvas.alpha_composite(src.resize((SIZE-14,SIZE-14),Image.Resampling.LANCZOS).convert('RGBA'),(7,7))
            print(f'fallback {idx+1}')
        else:
            canvas.alpha_composite(fg,((SIZE-fg.width)//2,(SIZE-fg.height)//2))
            success.append(idx)
        ImageDraw.Draw(canvas).rounded_rectangle((4,4,SIZE-5,SIZE-5),radius=27,
              outline=(189,35,250,255),width=5)
        result.paste(canvas.convert('RGB'),(col*SIZE,row*SIZE))
dest=Path('img/esercizi/esercizi-uniformi-v455.webp')
dest.parent.mkdir(parents=True,exist_ok=True)
result.save(dest,'WEBP',quality=89,method=6)
preview=Image.new('RGB',(8*112,10*112))
for row in range(10):
  for col in range(8):
    tile=result.crop((col*SIZE,row*SIZE,(col+1)*SIZE,(row+1)*SIZE))
    preview.paste(tile.resize((112,112),Image.Resampling.LANCZOS),(col*112,row*112))
    ImageDraw.Draw(preview).text((col*112+5,row*112+4),str(1+row*8+col),
      fill='white',stroke_width=1,stroke_fill='black')
p=Path('docs/anteprima-icone-uniformi-v455.webp')
p.parent.mkdir(parents=True,exist_ok=True)
preview.save(p,'WEBP',quality=85,method=6)
print(f'foreground isolation {len(success)}/80, asset size={dest.stat().st_size}, preview={p}')
