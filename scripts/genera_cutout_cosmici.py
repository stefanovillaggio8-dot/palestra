#!/usr/bin/env python3
"""Rigenera i soggetti alpha dai 18 ritratti originali; non modifica gli originali.

Per sicurezza, il risultato viene pubblicato solo se supera controlli su
trasparenza, estensione della silhouette e presenza di testa/torace/gambe.
In caso contrario il file problematico NON sostituisce il ritratto originale.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from PIL import Image
from rembg import new_session, remove
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "img/personaggi/stati"
OUTPUT = ROOT / "img/personaggi/cutout/stati"
JS = ROOT / "src/rpg-scena-cosmica.js"
CLASSES = ("assassino", "guerriero", "berserker")
STATES = range(6)


def validate(img: Image.Image) -> tuple[bool, dict]:
    """Solo controlli conservativi; un ritaglio sospetto non entra nella app."""
    a = np.asarray(img.getchannel("A"), dtype=np.uint8)
    h, w = a.shape
    fg = a > 90
    coverage = float(fg.mean())
    ys, xs = np.where(fg)
    if len(xs) < 2000:
        return False, {"reason": "foreground-empty", "coverage": coverage}
    bb = [float(xs.min()/w), float(ys.min()/h),
          float(xs.max()/w), float(ys.max()/h)]
    border = np.concatenate([
        a[:max(1,h//20), :max(1,w//12)].reshape(-1),
        a[:max(1,h//20), -max(1,w//12):].reshape(-1),
        a[-max(1,h//20):, :max(1,w//12)].reshape(-1),
        a[-max(1,h//20):, -max(1,w//12):].reshape(-1),
    ])
    corner_opaque_ratio = float(np.mean(border > 100))
    # Righe della figura: cappuccio/viso, busto, bacino, cosce, stivali.
    bands = ((.12,.24),(.29,.43),(.46,.59),(.65,.79),(.83,.96))
    bands_have_subject = [
        bool(np.any(fg[int(y0*h):max(int(y0*h)+1,int(y1*h)), int(.12*w):int(.90*w)]))
        for (y0,y1) in bands
    ]
    valid = (
        .075 < coverage < .78 and
        bb[1] < .25 and bb[3] > .85 and
        bb[2] - bb[0] > .35 and
        corner_opaque_ratio < .11 and
        all(bands_have_subject)
    )
    return valid, {
        "coverage": round(coverage,4),
        "bbox": [round(v,4) for v in bb],
        "corner_opaque": round(corner_opaque_ratio,4),
        "body_bands": bands_have_subject,
        "valid": valid,
    }


def main():
    OUTPUT.mkdir(parents=True,exist_ok=True)
    session = new_session("isnet-general-use", providers=["CPUExecutionProvider"])
    valid_keys = []
    report = {}
    for cls in CLASSES:
        for state in STATES:
            key = f"{cls}-{state}"
            src = INPUT / f"{key}.webp"
            if not src.exists():
                report[key] = {"valid": False, "reason": "source-missing"}
                continue
            with Image.open(src) as original:
                rgba = original.convert("RGBA")
            cutout = remove(rgba, session=session, alpha_matting=False)
            if not isinstance(cutout, Image.Image):
                cutout = Image.open(__import__("io").BytesIO(cutout)).convert("RGBA")
            cutout = cutout.convert("RGBA")
            ok, metrics = validate(cutout)
            report[key] = metrics
            print(key, metrics, flush=True)
            if not ok:
                continue
            # Mantieni risoluzione e centratura: niente crop o resize.
            if cutout.size != rgba.size:
                report[key] = {"valid":False,"reason":"dimensions-changed"}
                continue
            cutout.save(OUTPUT / f"{key}.webp","WEBP",quality=94,method=6)
            valid_keys.append(key)

    # Non attivare ritagli non rigenerati: aggiorna solo la allowlist.
    original_js = JS.read_text(encoding="utf-8")
    pattern = r"export const CUTOUT_VERIFICATI_RPG=Object\\.freeze\\(\\[[\\s\\S]*?\\]\\);"
    replacement = "export const CUTOUT_VERIFICATI_RPG=Object.freeze([\\n  " + (
        ",".join(repr(k) for k in valid_keys)
    ) + "\\n]);"
    # Il replacement deve contenere i reali newline, non backslash-n.
    replacement = replacement.replace("\\\\n", "\\n")
    updated, count = re.subn(pattern, lambda _: replacement, original_js, count=1)
    if count != 1:
        raise RuntimeError("Missing CUTOUT_VERIFICATI_RPG allowlist")
    JS.write_text(updated,encoding="utf-8")
    manifest = {"model":"isnet-general-use","expected":18,
                "validated":len(valid_keys),"valid_keys":valid_keys,"results":report}
    (OUTPUT/"manifest-v491.json").write_text(
        json.dumps(manifest,indent=2,ensure_ascii=False)+"\\n",encoding="utf-8")
    print(f"Validated {len(valid_keys)}/18 real cutouts.",flush=True)
    # Partial success is allowed: the app safely keeps originals for rejected states.
    if len(valid_keys) < 10:
        raise SystemExit("Too few usable alpha cutouts: manual review needed")


if __name__ == "__main__":
    main()
