#!/usr/bin/env python3
"""Atomically validate all 9 approved v379 assets before activating the app."""
from pathlib import Path
from PIL import Image, ImageDraw
from io import BytesIO
import zipfile, json, hashlib, sys
ROOT=Path(__file__).resolve().parents[1]
ASSETS={
 'assassino':['base','armatura-assassino-notte','armatura-assassino-spettro'],
 'guerriero':['base','armatura-guerriero-braci','armatura-guerriero-abisso'],
 'berserker':['base','armatura-berserker-rabbia','armatura-berserker-apocalisse'],
}
PREFIX='img/personaggi/aura-divina-v379'
def main():
    incoming=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'aura_divina_v379_9_immagini.zip'
    pending={}
    with zipfile.ZipFile(incoming) as z:
        members=z.namelist()
        assert len(members)==10 and 'manifest.json' in members
        assert all('..' not in Path(n).parts and not n.startswith('/') for n in members)
        manifest=json.loads(z.read('manifest.json'))
        expected={(cl,armor) for cl,armors in ASSETS.items() for armor in armors}
        assert len(manifest)==9 and {(m['classe'],m['armatura']) for m in manifest}==expected
        for m in manifest:
            cl,arm=m['classe'],m['armatura']
            path=f'{PREFIX}/{cl}/{arm}.webp'
            assert m['file']==path and m['dimensions']==[720,1080]
            data=z.read(path)
            assert hashlib.sha256(data).hexdigest()==m['sha256']
            with Image.open(BytesIO(data)) as im:
                im.load()
                assert im.size==(720,1080) and im.format=='WEBP'
            pending[path]=data
    assert len({hashlib.sha256(x).hexdigest() for x in pending.values()})==9
    for rel,blob in pending.items():
        path=ROOT/rel
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(blob)
    docs=ROOT/'docs'
    docs.mkdir(exist_ok=True)
    (docs/'aura-divina-v379-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    sheet=Image.new('RGB',(888,1320),(16,13,20))
    draw=ImageDraw.Draw(sheet)
    for idx,(cl,arm) in enumerate((cl,arm) for cl,armors in ASSETS.items() for arm in armors):
        pic=Image.open(ROOT/PREFIX/cl/(arm+'.webp')).convert('RGB')
        x=(idx%3)*296;y=(idx//3)*440
        sheet.paste(pic.resize((286,429),Image.Resampling.LANCZOS),(x,y))
        draw.text((x+3,y+430),cl+' '+arm[:21],fill=(255,223,158))
    sheet.save(docs/'aura-divina-v379-preview.jpg',quality=90)
    app=['index.html','sw.js','anteprima-aura.html','aura-divina-v366-anteprima.html',
         'galleria-aura.html','src/foto-aura-divina-v366.js','src/galleria-foto-rpg.js']
    for filename in app:
        p=ROOT/filename;old=p.read_text(encoding='utf8')
        new=old.replace('aura-divina-v378','aura-divina-v379').replace('palestra-v378','palestra-v379').replace('?v=378','?v=379')
        assert new!=old,filename
        p.write_text(new,encoding='utf8')
    # Historical tests must keep their historical checksums. Update only
    # comparisons against the app's CURRENT photo URLs and VERSION string.
    for path in (ROOT/'test').glob('*.test.js'):
        old=path.read_text(encoding='utf8')
        new=old.replace('palestra-v378','palestra-v379')
        name=path.name
        if name=='v378-divine-phase-one-repair.test.js':
            new=new.replace("assert.equal(path,'./'+output+'?v=378');",
               "assert.equal(path,'./img/personaggi/aura-divina-v379/'+cls+'/'+armor+'.webp?v=379');")
            new=new.replace('assert.match(sw,/aura-divina-v378/);','assert.match(sw,/aura-divina-v379/);')
            new=new.replace('assert.match(page,/aura-divina-v378/);','assert.match(page,/aura-divina-v379/);')
        elif name=='v376-clean-originals.test.js':
            new=new.replace("assert.equal(live,'./img/personaggi/aura-divina-v378/",
                            "assert.equal(live,'./img/personaggi/aura-divina-v379/")
            new=new.replace("+'.webp?v=378');","+'.webp?v=379');")
            new=new.replace("assert.match(sw,/aura-divina-v378/);","assert.match(sw,/aura-divina-v379/);")
            new=new.replace("assert.match(bytes('aura-divina-v366-anteprima.html').toString(),/aura-divina-v378/);",
                            "assert.match(bytes('aura-divina-v366-anteprima.html').toString(),/aura-divina-v379/);")
        elif name=='v375-divine-uniformity.test.js':
            new=new.replace("assert.equal(url,'./img/personaggi/aura-divina-v378/",
                            "assert.equal(url,'./img/personaggi/aura-divina-v379/")
            new=new.replace("+'.webp?v=378');","+'.webp?v=379');")
            new=new.replace('assert.match(sw,/aura-divina-v378/);','assert.match(sw,/aura-divina-v379/);')
        else:
            new=new.replace('aura-divina-v378','aura-divina-v379').replace('?v=378','?v=379')
        if new!=old:path.write_text(new,encoding='utf8')
    print('Activated exactly nine approved v379 images and updated versioned URLs.')
if __name__=='__main__':
    main()
