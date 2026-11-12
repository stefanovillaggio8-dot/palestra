import io,subprocess
from PIL import Image
from pathlib import Path
paths=[
  'img/personaggi/cutout/stati/assassino-0.webp',
  'img/personaggi/cutout/stati/assassino-2.webp',
  'img/personaggi/cutout/stati/assassino-3.webp',
  'img/personaggi/cutout/stati/berserker-0.webp',
  'img/personaggi/cutout/stati/guerriero-0.webp',
]
ref='55c967457a82ffd8eb08501b35c353c48c32509e'
for path in paths:
  raw=subprocess.check_output(['git','show',f'{ref}:{path}'])
  for label,data in [('before',raw),('now',Path(path).read_bytes())]:
    img=Image.open(io.BytesIO(data)).convert('RGBA')
    a=img.getchannel('A')
    n=img.width*img.height
    hs=a.histogram()
    count=lambda threshold:round(sum(hs[threshold:])/n*100,2)
    w,h=img.size
    pts=[(int(x*w),int(y*h)) for x,y in [(0,0),(.01,.5),(.5,.2),(.5,.5),(.5,.75),(.9,.5),(.5,.95)]]
    vals=[a.getpixel((min(w-1,x),min(h-1,y))) for x,y in pts]
    print(path,label,img.size,'extrema',a.getextrema(), '>=1',count(1),'>=30',count(30),'>=200',count(200),'sample',vals,flush=True)
