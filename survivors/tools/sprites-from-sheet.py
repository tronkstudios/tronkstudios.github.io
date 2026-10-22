#!/usr/bin/env python3
"""TronkStudios · survivors/tools/sprites-from-sheet.py

Saca los sprites de los personajes de una sola imagen con todos ellos
(fondo transparente, en filas, en el mismo orden que TS.CHARACTERS de
data.js) y los guarda para el juego: survivors/img/chars/<id>.png y su
entrada en survivors/js/art.js.

Uso:
  python3 survivors/tools/sprites-from-sheet.py personajes.png [altura]

«altura» es la altura en píxeles del personaje más alto (por defecto 50).
Cada personaje es una sola postura: el juego lo gira en espejo para ir a la
izquierda y le añade el balanceo al andar y el impulso al atacar.
Necesita Pillow (pip install pillow).
"""

import hashlib
import json
import os
import re
import sys
from collections import deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def character_ids():
    src = open(os.path.join(ROOT, "js", "data.js"), encoding="utf-8").read()
    block = src[src.index("TS.CHARACTERS = [") : src.index("];", src.index("TS.CHARACTERS = ["))]
    return re.findall(r'^\s+id: "([a-z]+)"', block, re.M)


def components(im):
    """Manchas de píxeles visibles: (n, x0, y0, x1, y1, píxeles)."""
    w, h = im.size
    px = im.load()
    solid = lambda x, y: px[x, y][3] > 40 and not all(c > 232 for c in px[x, y][:3])
    seen = bytearray(w * h)
    out = []
    for y in range(h):
        for x in range(w):
            if seen[y * w + x] or not solid(x, y):
                continue
            q = deque([(x, y)])
            seen[y * w + x] = 1
            pts = []
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and solid(nx, ny):
                        seen[ny * w + nx] = 1
                        q.append((nx, ny))
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            out.append((len(pts), min(xs), min(ys), max(xs), max(ys), pts))
    return out


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    target = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    im = Image.open(sys.argv[1]).convert("RGBA")
    ids = character_ids()
    comps = components(im)
    big = max(c[0] for c in comps)
    bodies = [c for c in comps if c[0] > big * 0.3]
    if len(bodies) != len(ids):
        raise SystemExit(f"Hay {len(bodies)} personajes en la imagen y {len(ids)} en data.js")
    # filas (de arriba abajo) y, en cada fila, de izquierda a derecha
    bodies.sort(key=lambda c: c[2])
    rows, row = [], [bodies[0]]
    for c in bodies[1:]:
        if c[2] > row[0][4] - (row[0][4] - row[0][2]) * 0.3:
            rows.append(row)
            row = [c]
        else:
            row.append(c)
    rows.append(row)
    bodies = [c for r in rows for c in sorted(r, key=lambda c: c[1])]

    # cada mancha pequeña (copos, dron, viento...) va con el personaje más cercano;
    # las que quedan por debajo de sus pies son el nombre y se descartan
    parts = {i: [b] for i, b in enumerate(bodies)}
    for c in comps:
        if c in bodies or c[0] < 12:
            continue
        cx, cy = (c[1] + c[3]) / 2, (c[2] + c[4]) / 2
        best = min(range(len(bodies)), key=lambda i: abs(cx - (bodies[i][1] + bodies[i][3]) / 2) + 2 * max(0, bodies[i][2] - cy, cy - bodies[i][4]))
        b = bodies[best]
        if c[2] >= b[4] - 2 or c[4] < b[2] - 12:
            continue
        parts[best].append(c)

    tallest = max(b[4] - b[2] for b in bodies)
    scale = target / tallest
    out_dir = os.path.join(ROOT, "img", "chars")
    os.makedirs(out_dir, exist_ok=True)
    art_path = os.path.join(ROOT, "js", "art.js")
    art = {}
    if os.path.exists(art_path):
        m = re.search(r"TS\.ART = (\{.*\});", open(art_path, encoding="utf-8").read(), re.S)
        if m:
            art = json.loads(m.group(1))

    cw, ch = 54, 60  # tamaño de la celda: como los dibujos del juego (pies abajo)
    for i, cid in enumerate(ids):
        group = parts[i]
        x0 = min(c[1] for c in group)
        y0 = min(c[2] for c in group)
        x1 = max(c[3] for c in group)
        y1 = max(c[4] for c in group)
        crop = Image.new("RGBA", (x1 - x0 + 1, y1 - y0 + 1), (0, 0, 0, 0))
        src = im.load()
        dst = crop.load()
        for c in group:
            for x, y in c[5]:
                dst[x - x0, y - y0] = src[x, y]
        w = max(1, round(crop.width * scale))
        h = max(1, round(crop.height * scale))
        small = crop.resize((w, h), Image.BOX)
        # bordes nítidos (sin semitransparencias) y pocos colores, como el pixel art
        alpha = small.getchannel("A").point(lambda a: 255 if a > 110 else 0)
        rgb = small.convert("RGB").quantize(colors=40, method=Image.Quantize.MEDIANCUT).convert("RGB")
        small = Image.merge("RGBA", (*rgb.split(), alpha))
        if w > cw or h > ch:
            small.thumbnail((cw, ch), Image.NEAREST)
        cell = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        body = bodies[i]
        # los pies: la parte de abajo del cuerpo, en el centro de la celda
        foot_x = round(((body[1] + body[3]) / 2 - x0) * scale)
        ox = max(0, min(cw - small.width, cw // 2 - foot_x))
        oy = ch - 2 - round((body[4] - y0) * scale)
        cell.alpha_composite(small, (ox, max(0, oy)))
        path = os.path.join(out_dir, f"{cid}.png")
        cell.save(path, optimize=True)
        version = hashlib.sha1(open(path, "rb").read()).hexdigest()[:8]
        art[cid] = {"w": cw, "h": ch, "foot": ch - 2, "single": True, "v": version}
        print(f"{cid}: {small.width}x{small.height}")

    with open(art_path, "w", encoding="utf-8") as f:
        f.write(
            '"use strict";\n\n'
            "/* TronkStudios · survivors/js/art.js\n"
            "   Personajes con sprites dibujados. Lo generan las herramientas de\n"
            "   survivors/tools/: no lo edites a mano. «single» = una sola postura\n"
            "   (se gira en espejo y el andar se hace con un balanceo).\n"
            "   Los que no están aquí usan los dibujos de people.js.\n"
            "   Scripts clásicos (ver docs/adr/0002). */\n\n"
            f"TS.ART = {json.dumps(art, indent=2, sort_keys=True)};\n"
        )


if __name__ == "__main__":
    main()
