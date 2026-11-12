"""Recupera corpo/volto cancellati per errore dal primo cutout RPG.

La fotografia originale decide i COLORI. L'alpha esterno viene dalla
segmentazione reale; le correzioni recuperano soltanto regioni del soggetto.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT=Path("img/personaggi")
def ripara(nome):
    path=ROOT/"cutout/stati"/(nome+".webp")
    source=ROOT/"stati"/(nome+".webp")
    if not path.exists() or not source.exists():
        return
    hero=Image.open(source).convert("RGBA")
    cut=Image.open(path).convert("RGBA")
    if cut.size!=hero.size:
        cut=cut.resize(hero.size,Image.Resampling.LANCZOS)
    w,h=hero.size
    alpha=np.array(cut.getchannel("A"),dtype=np.uint8)
    foreground=(alpha>30).astype(np.uint8)*255
    # I contorni ESTERNI includono un'intera figura, quindi vengono riempiti
    # i buchi sotto il cappuccio, tra le braccia e sulla pelle che il primo
    # segmentatore aveva classificato erroneamente come sfondo.
    contours,_=cv2.findContours(foreground,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    base=np.zeros((h,w),dtype=np.uint8)
    kept=0
    for c in contours:
        if cv2.contourArea(c) > 900:
            cv2.drawContours(base,[c],-1,255,-1)
            kept+=1
    # Uno smussamento minimo, senza perdere lame, peli del mantello o dita.
    base=cv2.GaussianBlur(base,(0,0),1.8)
    # Recuperi ragionati solo dove i contorni non circondano ancora il soggetto.
    # Valori in frazione del ritratto: NON dipendono dallo zoom nel sito.
    regions={
      "assassino-0":[
          # Volto, busto, braccia, mani, cosce mancanti tra i lati del mantello.
          ("ellipse",(.448,.128,.571,.243)),
          ("poly",[(.410,.24),(.567,.24),(.615,.46),(.600,.59),(.565,.76),
                   (.54,.86),(.48,.89),(.43,.78),(.398,.61),(.373,.46)]),
          ("ellipse",(.323,.46,.396,.60)),
          ("ellipse",(.608,.46,.686,.60)),
       ],
      "assassino-3":[
          ("ellipse",(.446,.135,.563,.225)),
          ("ellipse",(.286,.507,.382,.606)),
          ("ellipse",(.618,.501,.712,.607)),
       ],
      "berserker-0":[
          ("ellipse",(.420,.105,.580,.225)),
          ("poly",[(.39,.21),(.65,.21),(.68,.42),(.63,.59),(.65,.79),
                    (.60,.92),(.53,.94),(.46,.85),(.38,.69),(.34,.44)]),
          ("ellipse",(.650,.270,.895,.67)),
       ],
    }
    if nome in regions:
        hand=Image.new("L",(w,h),0)
        d=ImageDraw.Draw(hand)
        for kind,shape in regions[nome]:
            if kind=="ellipse":
                x1,y1,x2,y2=shape
                d.ellipse((int(x1*w),int(y1*h),int(x2*w),int(y2*h)),fill=255)
            else:
                d.polygon([(int(x*w),int(y*h)) for x,y in shape],fill=255)
        hand=hand.filter(ImageFilter.GaussianBlur(4))
        base=np.maximum(base,np.array(hand,dtype=np.uint8))
    # I colori usati sono ESCLUSIVAMENTE quelli dello scatto approvato.
    output=np.array(hero,dtype=np.uint8)
    output[:,:,3]=base
    out=Image.fromarray(output,"RGBA")
    out.save(path,"WEBP",quality=94,method=6,exact=True)
    lo,hi=out.getchannel("A").getextrema()
    assert lo==0 and hi==255 and kept>0,(nome,lo,hi,kept)
    print(f"riparato {nome}: {w}x{h}, {kept} contorni, alpha={lo}..{hi}")

for nome in ["assassino-0","assassino-3","berserker-0"]:
    ripara(nome)
