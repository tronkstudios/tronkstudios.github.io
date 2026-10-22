#!/usr/bin/env python3
"""TronkStudios · survivors/tools/pixellab-sprites.py

Convierte un personaje exportado de PixelLab (el ZIP de «Export») en la hoja
de sprites que usa Tronk Survivors, y actualiza survivors/js/art.js.

Uso:
  python3 survivors/tools/pixellab-sprites.py ranjay ruta/al/personaje.zip

La hoja (survivors/img/chars/<id>.png) tiene una fila por vista
(abajo, abajo-derecha, derecha, arriba-derecha, arriba) y en cada fila:
quieto y, si el ZIP trae una animación de andar, sus fotogramas.
Las vistas de la izquierda las saca el juego en espejo.
Necesita Pillow (pip install pillow).
"""

import hashlib
import json
import os
import re
import sys
import tempfile
import zipfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIEWS = [("down", "south"), ("downSide", "south-east"), ("side", "east"), ("upSide", "north-east"), ("up", "north")]


def frames_for(base, direction):
    """Fotogramas de andar de una dirección (lista vacía si no hay)."""
    found = []
    for dirpath, _, files in os.walk(base):
        parts = dirpath.replace("\\", "/").lower().split("/")
        if "animations" not in parts or parts[-1] != direction:
            continue
        name = "/".join(parts[parts.index("animations") + 1 : -1])
        pngs = sorted(f for f in files if f.lower().endswith(".png"))
        if pngs:
            found.append((0 if "walk" in name else 1, name, [os.path.join(dirpath, f) for f in pngs]))
    found.sort()
    return found[0][2] if found else []


def rotation_for(base, direction):
    for dirpath, _, files in os.walk(base):
        if os.path.basename(dirpath).lower() == "rotations" and f"{direction}.png" in files:
            return os.path.join(dirpath, f"{direction}.png")
    raise SystemExit(f"Falta la vista {direction} en el ZIP")


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    char_id, source = sys.argv[1], sys.argv[2]
    if not re.fullmatch(r"[a-z]{2,12}", char_id):
        raise SystemExit("El id del personaje solo lleva letras minúsculas (ranjay, sunk...)")

    with tempfile.TemporaryDirectory() as tmp:
        base = source
        if zipfile.is_zipfile(source):
            with zipfile.ZipFile(source) as z:
                for member in z.namelist():
                    target = os.path.realpath(os.path.join(tmp, member))
                    if not target.startswith(os.path.realpath(tmp) + os.sep):
                        raise SystemExit("ZIP no válido")
                z.extractall(tmp)
            base = tmp

        rows = []
        for view, direction in VIEWS:
            idle = Image.open(rotation_for(base, direction)).convert("RGBA")
            walk = [Image.open(p).convert("RGBA") for p in frames_for(base, direction)]
            rows.append((view, idle, walk))

    w, h = rows[0][1].size
    for _, idle, walk in rows:
        for im in [idle, *walk]:
            if im.size != (w, h):
                raise SystemExit("Todas las imágenes tienen que medir lo mismo")

    # Los pies: la fila más baja con píxeles en la vista de frente
    foot = rows[0][1].getbbox()[3] - 1
    cols = 1 + max(len(walk) for _, _, walk in rows)
    sheet = Image.new("RGBA", (w * cols, h * len(rows)), (0, 0, 0, 0))
    walks = {}
    for r, (view, idle, walk) in enumerate(rows):
        sheet.paste(idle, (0, r * h))
        for c, im in enumerate(walk):
            sheet.paste(im, ((c + 1) * w, r * h))
        walks[view] = len(walk)

    out_dir = os.path.join(ROOT, "img", "chars")
    os.makedirs(out_dir, exist_ok=True)
    sheet_path = os.path.join(out_dir, f"{char_id}.png")
    sheet.save(sheet_path, optimize=True)
    version = hashlib.sha1(open(sheet_path, "rb").read()).hexdigest()[:8]  # para la caché

    art_path = os.path.join(ROOT, "js", "art.js")
    art = {}
    if os.path.exists(art_path):
        m = re.search(r"TS\.ART = (\{.*\});", open(art_path, encoding="utf-8").read(), re.S)
        if m:
            art = json.loads(m.group(1))
    art[char_id] = {"w": w, "h": h, "foot": foot, "walk": walks, "v": version}
    with open(art_path, "w", encoding="utf-8") as f:
        f.write(
            '"use strict";\n\n'
            "/* TronkStudios · survivors/js/art.js\n"
            "   Personajes con sprites dibujados (PixelLab). Lo genera\n"
            "   survivors/tools/pixellab-sprites.py: no lo edites a mano.\n"
            "   Los que no están aquí usan los dibujos de people.js.\n"
            "   Scripts clásicos (ver docs/adr/0002). */\n\n"
            f"TS.ART = {json.dumps(art, indent=2, sort_keys=True)};\n"
        )
    print(f"{char_id}: hoja {sheet.size[0]}x{sheet.size[1]}, andar {walks}")


if __name__ == "__main__":
    main()
