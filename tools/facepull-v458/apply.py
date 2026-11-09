from pathlib import Path
import hashlib, base64, re

BASE=Path.cwd()
folder=BASE/"tools/facepull-v458"
pieces=[folder/f"chunk{i}.b64" for i in range(4)]
assert all(x.exists() for x in pieces), "File immagine incompleto"
encoded="".join(x.read_text().strip() for x in pieces)
assert len(encoded)==13368, f"Lunghezza immagine errata {len(encoded)}"
data=base64.b64decode(encoded,validate=True)
assert hashlib.sha256(data).hexdigest()=="d5c7bc4d950fcd96f9836ccf8d99615dd30b3d125e7903020777c38771e61e11", "L'immagine non corrisponde alla versione verificata"
assert data[:4]==b"RIFF" and data[8:12]==b"WEBP", "Non e' un WebP"
out=BASE/"img/esercizi/verificati-v458/ex-dumbbell-face-pull.webp"
out.parent.mkdir(parents=True,exist_ok=True)
out.write_bytes(data)
NEW="img/esercizi/verificati-v458/ex-dumbbell-face-pull.webp"
OLD="img/esercizi/uniformi-v455/ex-dumbbell-face-pull.webp"

def patch(path, old, new, limit=None):
    file=BASE/path
    text=file.read_text()
    n=text.count(old)
    assert n>0, f"{path}: stringa non trovata: {old[:70]}"
    if limit is not None: assert n==limit, f"{path}: occorrenze {n}, attese {limit}"
    file.write_text(text.replace(old,new))

patch("src/exercise-icons.js",'"ex-dumbbell-face-pull": "'+OLD+'"','"ex-dumbbell-face-pull": "'+NEW+'"',1)
patch("sw.js","'./"+OLD+"'","'./"+NEW+"'",1)
patch("stile.css",'.foto-esercizio-arte-originale[src*="/verificati-v456/"],','.foto-esercizio-arte-originale[src*="/verificati-v456/"],\n.foto-esercizio-arte-originale[src*="/verificati-v458/"],',1)

gallery=BASE/"verifica-icone.html"
html=gallery.read_text()
match=re.search(r'<article class="tile da-ricontrollare" data-name="dumbbell face pull ex-dumbbell-face-pull"[\s\S]*?</article>',html)
assert match, "Riquadro #42 mancante"
oldtile=match.group()
tile=oldtile.replace('class="tile da-ricontrollare"','class="tile rivista"').replace('data-status="da-ricontrollare"','data-status="rivista"').replace("#42 · da-ricontrollare","#42 · rivista").replace(OLD,NEW).replace("Variante ai manubri con gomiti alti: controllo tecnico ancora consigliato","Busto inclinato, gomiti alti e larghi, manubri verso i lati del viso")
assert tile != oldtile and NEW in tile
html=html.replace(oldtile,tile)
assert ".art img[src*='/verificati-v456/']," in html
html=html.replace(".art img[src*='/verificati-v456/'],",".art img[src*='/verificati-v456/'],.art img[src*='/verificati-v458/'],")
html=html.replace("La v452 corregge tre pose (Strict Curl, dips zavorrati, Wrist Curl a cavo) senza cambiare allenamenti, Rank o streak.","La v458 aggiorna anche il Dumbbell Face Pull con busto inclinato, senza cambiare allenamenti, Rank o streak.")
gallery.write_text(html)

# Test precedenti: aggiorna la versione PWA, senza riscrivere la logica o lo storico
for file in (BASE/"test").glob("*.test.js"):
    txt=file.read_text()
    newer=txt.replace("palestra-v457","palestra-v458").replace("?v=457","?v=458")
    if newer!=txt:file.write_text(newer)
for path in ["sw.js","index.html","anteprima-aura.html"]:
    file=BASE/path
    t=file.read_text()
    new=t.replace("palestra-v457","palestra-v458").replace("?v=457","?v=458")
    assert new!=t, "Versione v457 non presente in "+path
    file.write_text(new)

# Test compatibilita': gli originali v454 restano archiviati e inalterati, la miniatura attiva cambia.
patch("test/otto-icone-pubblicate-v454.test.js",
      "const path='img/esercizi/uniformi-v455/'+id+'.webp';",
      "const path=id==='ex-dumbbell-face-pull' ? '"+NEW+"' : 'img/esercizi/uniformi-v455/'+id+'.webp';",1)
patch("test/revisione-globale-79-icone-v455.test.js",
      "const path='img/esercizi/uniformi-v455/'+id+'.webp';",
      "const path=id==='ex-dumbbell-face-pull' ? '"+NEW+"' : 'img/esercizi/uniformi-v455/'+id+'.webp';",1)
patch("test/galleria-icone-v451.test.js",
      "'ex-chest-supported-shrug','ex-dumbbell-face-pull',",
      "'ex-chest-supported-shrug',",1)
patch("test/galleria-icone-v451.test.js",
      "assert.ok(html.includes('img/esercizi/icone-corrette-v456-atlas.webp'));",
      "assert.ok(html.includes('img/esercizi/icone-corrette-v456-atlas.webp'));\n  assert.ok(html.includes('"+NEW+"'));",1)

test=BASE/"test/face-pull-v458.test.js"
test.write_text("""import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ESERCIZI} from '../src/dati-iniziali.js';
import {sorgenteMiniatura} from '../src/exercise-icons.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const txt=p=>read(p).toString('utf8');
const path='img/esercizi/verificati-v458/ex-dumbbell-face-pull.webp';
test('v458: Dumbbell Face Pull inclinato, fonte corretta e storia invariata',()=>{
  const e=ESERCIZI.find(x=>x.id==='ex-dumbbell-face-pull');
  assert.ok(e);assert.equal(ESERCIZI.length,79);
  assert.deepEqual(sorgenteMiniatura(e),{tipo:'originale',src:path,zoom:1});
  assert.equal(createHash('sha256').update(read(path)).digest('hex'),
    'd5c7bc4d950fcd96f9836ccf8d99615dd30b3d125e7903020777c38771e61e11');
  assert.match(txt('sw.js'),/palestra-v458/);
  assert.match(txt('index.html'),/palestra-v458/);
  assert.ok(txt('sw.js').includes('./'+path));
  const g=txt('verifica-icone.html');
  const pos=g.indexOf('data-name="dumbbell face pull ex-dumbbell-face-pull"');
  assert.ok(pos>=0);
  const face=g.slice(g.lastIndexOf('<article',pos),g.indexOf('</article>',pos)+10);
  assert.ok(face?.includes(path));
  assert.ok(face?.includes('class="tile rivista"'));
  assert.equal((g.match(/<article class="tile /g)||[]).length,79);
  const src=txt('src/exercise-icons.js');
  for(const forbidden of ['salvaSerie','eliminaSeduta','supabase.from','localStorage.setItem'])
    assert.ok(!src.includes(forbidden));
});
""")
docs=BASE/"docs/verifica-79-icone-v451.md"
with docs.open("a") as f:
 f.write("\n## v458 — Dumbbell Face Pull (#42)\n\nL'illustrazione precedente mostrava la persona eretta con manubri accanto al viso; la nuova illustrazione mostra una flessione del busto, gomiti alti e larghi e manubri accanto ai lati del viso, rappresentando più chiaramente la variante ai manubri. Sono preservate le 79 identità, lo storico e tutte le altre icone. Nuovo WebP 256 px con sfondo viola e cornice magenta; gli asset v454 e v455 restano in repository per eventuale confronto. Indicazioni biomeccaniche: face pull classico NASM, variante con manubri eseguita inclinando il busto (RIRLift).\n")
print("Nuova icona",out.stat().st_size,"byte; catalogo",len(re.findall('class="tile ',html)),"voci")
