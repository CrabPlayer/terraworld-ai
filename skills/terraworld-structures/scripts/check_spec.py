#!/usr/bin/env python3
"""Check a TerraWorld structure spec before giving it to the user.

Usage: python scripts/check_spec.py house.twspec

Catches the usual mistakes early: names that are not in references/, cells outside
`size`, and objects whose cells are already filled (a torch inside a wall block, a
chair inside the floor row). Structure Studio runs the full check, including support,
when the user builds the spec.
"""
import difflib
import json
import math
import re
import sys
from pathlib import Path

REFERENCES = Path(__file__).resolve().parent.parent / "references"
TOKEN = re.compile(r'([\w-]+)=("[^"]*"|\S+)|"([^"]*)"|(\S+)')


def norm(name):
    return re.sub(r"[_\s]+", " ", str(name).lower().replace("'", "").replace("’", "")).strip()


def read_list(file):
    for line in (REFERENCES / file).read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.startswith("#"):
            yield [part.strip() for part in line.split(" | ")]


BLOCKS = {norm(row[0]): row[0] for row in read_list("blocks.txt")}
WALLS = {norm(row[0]): row[0] for row in read_list("walls.txt")}
OBJECTS = {}  # normalized name -> [(width, height, attach, display name)]
for row in read_list("objects.txt"):
    width, height = (int(n) for n in row[1].split("x"))
    attach = next((p[len("attach="):] for p in row[2:] if p.startswith("attach=")), "")
    varieties = next((re.findall(r'"([^"]*)"', p) for p in row[2:] if p.startswith("variety=")), [])
    for key in [row[0], *varieties, *(f"{row[0]} {v}" for v in varieties), *(f"{row[0]} ({v})" for v in varieties)]:
        OBJECTS.setdefault(norm(key), []).append((width, height, attach, row[0]))


def split_statements(text):
    statements, current, quoted, index = [], "", False, 0
    while index < len(text):
        char = text[index]
        if not quoted and text.startswith("//", index):
            while index < len(text) and text[index] != "\n":
                index += 1
            continue
        if char == '"':
            quoted = not quoted
        if char in "\n;" and not quoted:
            statements.append(current.strip())
            current = ""
        else:
            current += char
        index += 1
    statements.append(current.strip())
    return [s for s in statements if s]


def value(raw):
    if raw.startswith('"') and raw.endswith('"'):
        return raw[1:-1]
    if re.fullmatch(r"-?\d+", raw):
        return int(raw)
    return {"true": True, "false": False}.get(raw, raw)


def legend_entry(raw):
    entry = {}
    for part in str(raw).split(","):
        key, sep, rest = part.partition(":")
        if sep:
            entry[key.strip()] = rest.strip()
        elif part.strip():
            entry["tile"] = part.strip()
    return entry


def parse(text):
    if text.lstrip().startswith("{"):
        spec = json.loads(text)
        for op in spec.get("ops", []):
            op["_text"] = json.dumps({k: v for k, v in op.items() if k != "_text"})
        return spec
    spec = {"width": 0, "height": 0, "legend": {}, "ops": []}
    for statement in split_statements(text):
        tokens = TOKEN.findall(statement)
        command = tokens[0][3] if tokens and tokens[0][3] else ""
        args = {key: value(raw) for key, raw, _, _ in tokens[1:] if key}
        words = [bare for _, _, _, bare in tokens[1:] if bare]
        if command == "size":
            spec["width"], spec["height"] = int(words[0]), int(words[1])
        elif command == "legend":
            spec["legend"].update({key: legend_entry(raw) for key, raw in args.items()})
        elif command in ("name", "description", "format", "version"):
            continue
        else:
            spec["ops"].append({"op": command, **args, "_text": statement})
    return spec


def suggest(name, table):
    close = difflib.get_close_matches(norm(name), list(table), n=3, cutoff=0.6)
    names = list(dict.fromkeys(table[key] if isinstance(table[key], str) else table[key][0][3] for key in close))
    return f" Did you mean: {', '.join(names)}?" if names else ""


def material_known(name):
    key = norm(name)
    return key in BLOCKS or any(w == 1 and h == 1 for w, h, _, _ in OBJECTS.get(key, []))


def wall_known(name):
    key = norm(name)
    return key in WALLS or f"{key} wall" in WALLS or key.removesuffix(" wall") in WALLS


def main():
    spec = parse(Path(sys.argv[1]).read_text(encoding="utf-8") if len(sys.argv) > 1 else sys.stdin.read())
    width, height = int(spec.get("width", 0)), int(spec.get("height", 0))
    problems = []
    solid = set()
    if width <= 0 or height <= 0:
        problems.append("The spec needs `size W H` with positive numbers.")

    def check_cell_names(where, cell):
        if cell.get("tile") and not material_known(cell["tile"]):
            problems.append(f"{where}: unknown block \"{cell['tile']}\".{suggest(cell['tile'], BLOCKS)}")
        if cell.get("wall") and not wall_known(cell["wall"]):
            problems.append(f"{where}: unknown wall \"{cell['wall']}\".{suggest(cell['wall'], WALLS)}")

    def apply(x, y, cell):
        clear = cell.get("clear")
        if clear in ("tile", "all"):
            solid.discard((x, y))
        if cell.get("tile"):
            solid.add((x, y))

    def outside(where, cells):
        bad = next(((x, y) for x, y in cells if not (0 <= x < width and 0 <= y < height)), None)
        if bad:
            problems.append(f"{where}: cell {bad} is outside size {width}x{height}.")
        return bad is not None

    for cell_key, entry in spec.get("legend", {}).items():
        check_cell_names(f"legend {cell_key}", entry if isinstance(entry, dict) else {"tile": entry})

    for number, op in enumerate(spec.get("ops", []), start=1):
        where = f"op {number} `{op.get('_text', op.get('op'))}`"
        kind = op.get("op")
        check_cell_names(where, op)
        if kind == "rect":
            x, y, w, h = op.get("x", 0), op.get("y", 0), op.get("w", 1), op.get("h", 1)
            cells = [(x + dx, y + dy) for dy in range(h) for dx in range(w)
                     if not (op.get("hollow") and 0 < dx < w - 1 and 0 < dy < h - 1)]
            outside(where, cells)
            for cx, cy in cells:
                apply(cx, cy, op)
        elif kind == "clear":
            x, y, w, h = op.get("x", 0), op.get("y", 0), op.get("w", 1), op.get("h", 1)
            if op.get("layer", "tile") in ("tile", "all"):
                for dy in range(h):
                    for dx in range(w):
                        solid.discard((x + dx, y + dy))
        elif kind == "line":
            x0, y0, x1, y1 = op.get("x1", 0), op.get("y1", 0), op.get("x2", 0), op.get("y2", 0)
            steps = max(abs(x1 - x0), abs(y1 - y0), 1)
            cells = {(round(x0 + (x1 - x0) * i / steps), round(y0 + (y1 - y0) * i / steps)) for i in range(steps + 1)}
            outside(where, cells)
            for cx, cy in cells:
                apply(cx, cy, op)
        elif kind == "roof":
            x, y, w = op.get("x", 0), op.get("y", 0), op.get("w", 1)
            outside(where, [(x, y - math.ceil(w / 2) + 1), (x + w - 1, y)])
            for row in range(math.ceil(w / 2)):
                left, right = x + row, x + w - 1 - row
                for cx in range(left, right + 1):
                    thickness = op.get("thickness")
                    if thickness is None or cx - left < thickness or right - cx < thickness:
                        solid.add((cx, y - row))
                    else:
                        solid.discard((cx, y - row))
        elif kind == "grid":
            rows = op.get("rows", [])
            rows = rows.split("/") if isinstance(rows, str) else rows
            for dy, line in enumerate(rows):
                for dx, char in enumerate(line):
                    if char in ". ":
                        continue
                    entry = spec.get("legend", {}).get(char)
                    if entry is None:
                        problems.append(f"{where}: grid character \"{char}\" is not in the legend.")
                        continue
                    cell = entry if isinstance(entry, dict) else {"tile": entry}
                    if not outside(where, [(op.get("x", 0) + dx, op.get("y", 0) + dy)]):
                        apply(op.get("x", 0) + dx, op.get("y", 0) + dy, cell)
        elif kind == "object":
            name = str(op.get("name", ""))
            key = norm(f"{name} {op['variety']}" if op.get("variety") else name)
            sizes = OBJECTS.get(key) or OBJECTS.get(norm(name))
            if not sizes:
                problems.append(f"{where}: unknown object \"{name}\".{suggest(name, OBJECTS)}")
                continue
            attach = norm(op.get("attach", ""))
            w, h, _, _ = next((s for s in sizes if attach and attach in s[2]), sizes[0])
            at = op.get("at", "top-left")
            left = op.get("x", 0)
            top = op.get("y", 0) - h if at == "floor" else op.get("y", 0) + 1 if at == "ceiling" else op.get("y", 0)

            def footprint(lx, ty):
                return [(lx + dx, ty + dy) for dy in range(h) for dx in range(w)]

            if outside(where, footprint(left, top)):
                continue
            if op.get("replace"):
                solid.difference_update(footprint(left, top))
            blocked = [cell for cell in footprint(left, top) if cell in solid]
            if blocked:
                spots = sorted(
                    (abs(dx) + abs(dy), dx, dy) for dx in range(-4, 5) for dy in range(-4, 5)
                    if abs(dx) + abs(dy) <= 4
                    and all(0 <= cx < width and 0 <= cy < height and (cx, cy) not in solid
                            for cx, cy in footprint(left + dx, top + dy)))
                hint = ""
                if spots:
                    _, dx, dy = spots[0]
                    y_value = top + dy + h if at == "floor" else top + dy - 1 if at == "ceiling" else top + dy
                    hint = f" Nearest empty cells: x={left + dx} y={y_value}."
                problems.append(f"{where}: {name} needs empty cells, but {blocked[0]} is already filled. "
                                f"Objects never go inside a block, wall column or floor row.{hint}")
                continue
            solid.update(footprint(left, top))
        elif kind not in (None, ""):
            problems.append(f"{where}: unknown op \"{kind}\". Use rect, clear, line, roof, object or grid.")

    if problems:
        print(f"{len(problems)} problem(s):")
        for problem in problems:
            print(f"- {problem}")
        sys.exit(1)
    print("OK: no problems found. Structure Studio checks support and overlaps again when the user builds it.")


if __name__ == "__main__":
    main()
