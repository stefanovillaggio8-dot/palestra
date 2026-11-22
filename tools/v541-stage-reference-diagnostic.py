from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import base64,io
root=Path(__file__).resolve().parents[1]
names=['reference-approvata-v537.png','effetti-reference-v537.webp','effetti-reference-v540.webp']
images=[]
for name in names:
 image=Image.open(root/'img/effetti'/name).convert('RGBA')
 print('STAGE_META:'+name+':'+str(image.size)+':'+str(image.getbbox()),flush=True)
 thumb=image.copy()
 thumb.thumbnail((920,650),Image.Resampling.LANCZOS)
 bg=Image.new('RGB',thumb.size,(19,18,30));bg.paste(thumb,(0,0),thumb.getchannel('A'))
 images.append((name,bg))
w=max(im.width for _,im in images);h=sum(im.height+46 for _,im in images)
out=Image.new('RGB',(w,h),(15,14,22));d=ImageDraw.Draw(out);yy=0
for name,im in images:
 d.text((10,yy+9),name,fill=(255,242,224))
 yy+=38
 out.paste(im,(0,yy));yy+=im.height+8
out.thumbnail((850,1800),Image.Resampling.LANCZOS)
buff=io.BytesIO();out.save(buff,'JPEG',quality=72,optimize=True)
enc=base64.b64encode(buff.getvalue()).decode('ascii')
print('STAGE_PREVIEW_META:'+str(len(enc)),flush=True)
for i in range(0,len(enc),3000):
 print('STAGE_PREVIEW_PART:'+str(i//3000).zfill(4)+':'+enc[i:i+3000],flush=True)
print('STAGE_PREVIEW_END',flush=True)
