#!/usr/bin/env python3
"""TronkStudios · survivors/tools/sprites-from-grid.py

Saca las animaciones de los personajes de una hoja con una columna por
personaje (en el orden de TS.CHARACTERS de data.js) y filas de fotogramas:
primero los de andar y luego los de atacar. Vale aunque el fondo sea un
cuadriculado gris y blanco dibujado (se borra desde los bordes).

Uso:
  python3 survivors/tools/sprites-from-grid.py frente.webp [espaldas.webp]

«frente» es la vista de frente girada a la derecha y «espaldas», si la hay,
la vista de espaldas girada a la derecha. Guarda survivors/img/chars/<id>.png
y su entrada en survivors/js/art.js. La izquierda la saca el juego en espejo.
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
CW, CH = 54, 60  # celda del juego (pies abajo, en el centro)
TARGET = 46  # altura en píxeles del personaje más alto


def character_ids():
    src = open(os.path.join(ROOT, "js", "data.js"), encoding="utf-8").read()
    start = src.index("TS.CHARACTERS = [")
    return re.findall(r'^\s+id: "([a-z]+)"', src[start : src.index("];", start)], re.M)


def remove_background(im):
    """Borra el fondo (blanco, gris claro o cuadriculado) que toca los bordes."""
    w, h = im.size
    px = im.load()

    def is_bg(c):
        r, g, b = c[:3]
        return min(r, g, b) > 196 and max(r, g, b) - min(r, g, b) < 18

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.extend(((x, 0), (x, h - 1)))
    for y in range(h):
        q.extend(((0, y), (w - 1, y)))
    while q:
        x, y = q.popleft()
        if seen[y * w + x] or not is_bg(px[x, y]):
            continue
        seen[y * w + x] = 1
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                q.append((nx, ny))
    # restos sueltos de fondo encerrados entre brazos y piernas
    for y in range(h):
        for x in range(w):
            if px[x, y][3] and is_bg(px[x, y]):
                n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] == 0)
                if n >= 2:
                    px[x, y] = (0, 0, 0, 0)


def blobs(im):
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    out = []
    for y in range(h):
        for x in range(w):
            if seen[y * w + x] or px[x, y][3] == 0:
                continue
            q = deque([(x, y)])
            seen[y * w + x] = 1
            pts = []
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny][3]:
                        seen[ny * w + nx] = 1
                        q.append((nx, ny))
            if len(pts) >= 8:
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                out.append({"n": len(pts), "x0": min(xs), "y0": min(ys), "x1": max(xs), "y1": max(ys), "pts": pts})
    return out


def frames_of(path, ncols):
    """{columna: [fotogramas]} con cada fotograma como (imagen, pies x, pies y)."""
    im = Image.open(path).convert("RGBA")
    remove_background(im)
    bs = blobs(im)
    big = sorted(b["n"] for b in bs)[-ncols]  # los cuerpos son las manchas grandes
    bodies = [b for b in bs if b["n"] >= big * 0.35 and (b["y1"] - b["y0"]) > 30]
    # filas: se agrupan por altura
    bodies.sort(key=lambda b: (b["y0"] + b["y1"]) / 2)
    rows, cur = [], [bodies[0]]
    for b in bodies[1:]:
        cy = (b["y0"] + b["y1"]) / 2
        if cy - (cur[-1]["y0"] + cur[-1]["y1"]) / 2 > (cur[-1]["y1"] - cur[-1]["y0"]) * 0.6:
            rows.append(cur)
            cur = [b]
        else:
            cur.append(b)
    rows.append(cur)
    rows = [r for r in rows if len(r) >= ncols * 0.6]
    width = im.width
    col_of = lambda x: min(ncols - 1, max(0, int(x / (width / ncols))))
    out = {c: [] for c in range(ncols)}
    for r in rows:
        y0 = min(b["y0"] for b in r) - 6
        y1 = max(b["y1"] for b in r) + 6
        cells = {c: [] for c in range(ncols)}
        for b in r:
            cells[col_of((b["x0"] + b["x1"]) / 2)].append(b)
        # efectos (tajos, chispas...) dentro de la misma fila y columna
        for b in bs:
            if b in r or b["y0"] < y0 or b["y1"] > y1 or b["n"] < 15:
                continue
            c = col_of((b["x0"] + b["x1"]) / 2)
            if cells[c] and b["y0"] > min(x["y0"] for x in cells[c]) - 10:
                cells[c].append(b)
        for c, group in cells.items():
            if not group:
                continue
            body = max(group, key=lambda b: b["n"])
            gx0 = min(b["x0"] for b in group)
            gy0 = min(b["y0"] for b in group)
            gx1 = max(b["x1"] for b in group)
            gy1 = max(b["y1"] for b in group)
            crop = Image.new("RGBA", (gx1 - gx0 + 1, gy1 - gy0 + 1), (0, 0, 0, 0))
            src, dst = im.load(), crop.load()
            for b in group:
                for x, y in b["pts"]:
                    dst[x - gx0, y - gy0] = src[x, y]
            out[c].append((crop, (body["x0"] + body["x1"]) / 2 - gx0, body["y1"] - gy0, body["y1"] - body["y0"]))
    return out


def to_cell(frame, scale):
    crop, fx, fy, _ = frame
    w = max(1, round(crop.width * scale))
    h = max(1, round(crop.height * scale))
    small = crop.resize((w, h), Image.BOX)
    alpha = small.getchannel("A").point(lambda a: 255 if a > 120 else 0)
    rgb = small.convert("RGB").quantize(colors=40, method=Image.Quantize.MEDIANCUT).convert("RGB")
    small = Image.merge("RGBA", (*rgb.split(), alpha))
    cell = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    ox = round(CW / 2 - fx * scale)
    oy = round(CH - 2 - fy * scale)
    cell.paste(small, (ox, oy), small)
    return cell


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    ids = character_ids()
    sheets = [frames_of(p, len(ids)) for p in sys.argv[1:3]]
    # una misma escala para todos: el más alto mide TARGET píxeles
    tallest = max(f[3] for s in sheets for col in s.values() for f in col[:4]) or 1
    scale = TARGET / tallest
    art_path = os.path.join(ROOT, "js", "art.js")
    art = {}
    if os.path.exists(art_path):
        m = re.search(r"TS\.ART = (\{.*\});", open(art_path, encoding="utf-8").read(), re.S)
        if m:
            art = json.loads(m.group(1))
    os.makedirs(os.path.join(ROOT, "img", "chars"), exist_ok=True)
    for c, cid in enumerate(ids):
        rows = []
        for s in sheets:
            fr = s[c]
            if len(fr) < 2:
                raise SystemExit(f"No encuentro los fotogramas de {cid}")
            half = len(fr) // 2
            walk, attack = fr[:half], fr[half:]
            # al atacar vienen dibujados algo más pequeños: se igualan a la altura al andar
            med = lambda fs: sorted(f[3] for f in fs)[len(fs) // 2]
            k_att = scale * med(walk) / med(attack)
            rows.append([to_cell(f, scale) for f in [walk[0], *walk]] + [to_cell(f, k_att) for f in attack])
        cols = max(len(r) for r in rows)
        sheet = Image.new("RGBA", (CW * cols, CH * len(rows)), (0, 0, 0, 0))
        for r, row in enumerate(rows):
            for i, cell in enumerate(row):
                sheet.paste(cell, (i * CW, r * CH))
        path = os.path.join(ROOT, "img", "chars", f"{cid}.png")
        sheet.save(path, optimize=True)
        nwalk = (len(rows[0]) - 1) // 2
        back = 1 if len(rows) > 1 else 0
        art[cid] = {
            "w": CW, "h": CH, "foot": CH - 2,
            "rows": {"down": 0, "downSide": 0, "side": 0, "upSide": back, "up": back},
            "walkCols": [1, nwalk], "attackCols": [1 + nwalk, len(rows[0]) - 1 - nwalk],
            "v": hashlib.sha1(open(path, "rb").read()).hexdigest()[:8]
        }
        print(f"{cid}: {len(rows)} vista(s), {nwalk} de andar, {len(rows[0]) - 1 - nwalk} de atacar")
    with open(art_path, "w", encoding="utf-8") as f:
        f.write(
            '"use strict";\n\n'
            "/* TronkStudios · survivors/js/art.js\n"
            "   Personajes con sprites dibujados. Lo generan las herramientas de\n"
            "   survivors/tools/: no lo edites a mano. rows = fila de la hoja de\n"
            "   cada vista; walkCols / attackCols = [primera columna, cuántas].\n"
            "   Los que no están aquí usan los dibujos de people.js.\n"
            "   Scripts clásicos (ver docs/adr/0002). */\n\n"
            f"TS.ART = {json.dumps(art, indent=2, sort_keys=True)};\n"
        )


if __name__ == "__main__":
    main()
