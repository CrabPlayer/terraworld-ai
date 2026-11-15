---
name: terraworld-scripts
description: Write TerraWorld scripts, the JavaScript that runs in the Script panel of terraworld.dev (a Terraria world viewer and editor) with the sandboxed `tw` API, to count, find, list, chart or mark things in a Terraria world, or to change blocks, walls, paint and liquid with an Apply/Cancel preview. Use whenever the user asks for a TerraWorld script, wants to analyse, search or bulk-edit a Terraria world in TerraWorld, or pastes a script or an error from the Script panel. Checks the script and gives a link that opens it in TerraWorld.
---

# TerraWorld scripts

TerraWorld (https://terraworld.dev) opens Terraria `.wld` worlds in the browser. Its **Script panel** (menu Data → Script on the world page) runs JavaScript in a sandboxed Web Worker with one global, `tw`, to read the open world, show results (stats, tables, charts, modals), mark the map and draft edits the user approves.

## When to use

- The user wants a TerraWorld script, or to count, find, list, chart or mark something in a Terraria world: ores by depth, chests holding an item, Life Crystals near spawn, how much of the world is Corruption…
- The user wants a bulk change in a world: replace one block with another, purify an area, remove liquid, paint walls.
- The user pastes a TerraWorld script to change, or an error from the Script panel.

Not for designing buildings to place in the game: that is the `terraworld-structures` skill.

## Workflow

1. If the request is very vague, ask one short question. Otherwise start writing.
2. Look up what you need in `references/terraworld.d.ts` (the exact API; search it, for example with grep) and copy the patterns in `references/scripting-guide.md`. Never use a function or property that the `.d.ts` does not declare.
3. Write the whole script to a file, for example `script.js`, starting with the header comments.
4. Run `python scripts/check_script.py script.js`. Fix every problem it prints and run it again until it prints OK. Fix the warnings too unless you have a reason not to.
5. Run `python scripts/make_link.py script.js` and copy the printed link exactly, without retyping or shortening it.
6. Hand the script over as described in **Hand-over** below.
7. When the user pastes an error from the Script panel, or says the result is wrong, fix the script, check it again and send the whole script and a new link.

If you cannot run code in this conversation, skip steps 4 and 5: check the script by reading it against the rules, give the code block only, and tell the user to paste it into the Script panel (or into the **Ask AI** dialog next to **Run**). Never make up a `#script=` link by hand: it is compressed data with a checksum.

## Script rules

The API declarations are in `references/terraworld.d.ts`.

- Plain JavaScript (ES2022). No import/export/require. The script is the body of an async function: top-level `await` and `return` work.
- The only API is the global `tw` described by the TypeScript declarations below. Do not invent functions or properties. If the task cannot be done with this API, say so instead of guessing.
- No network, storage, DOM or console output. Show results with `tw.ui.*` (stat, table, chart, list, section, modal) and mark the map with `tw.map.highlight`, `tw.map.mark` or `tw.map.markAll`.
- `tw.tiles` and the other read APIs never change the world. To change it, draft the changes with `tw.edit` (`setTile`, `clearTile`, `setWall`, `setPaint`, `setLiquid`, `setSlope`, `replace`, `fill`…), then call `const result = await tw.edit.commit({ label: "<short description>" })`. The user sees the changes on the map and presses Apply or Cancel; check `result.applied` and report `result.count` / `result.skipped`. Without `commit()` nothing is changed. Prefer one `tw.edit.replace({ from, to, region })` over looping with `setTile`.
- `tw.edit` only places plain vanilla blocks and walls: furniture/multi-tile objects and modded ids throw, and cells holding furniture or modded content are skipped. Reads keep showing the world as it was when the run started, even after `commit()`.
- To draw text, logos, curves or other figures, build a vector shape with `tw.shape` (`rect`, `ellipse`, `line`, `path` with SVG path data, `fromSvg`, `await tw.shape.text(str, { font, size })`), combine shapes with `tw.shape.union/subtract/intersect/xor`, place them with `.moveTo(x, y)` / `.translate` / `.scale` / `.rotate` / `.flip` / `.offset` (each returns a new shape), then `tw.edit.drawShape(shape, { fill, stroke, strokeWidth, wall })` and `await tw.edit.commit(...)`. Shapes never change the world by themselves. `tw.shape.text` is async: always `await` it; `size` is the height of a capital letter in tiles; use `font: "pixel"` below about 12 tiles, `"sans"` or `"display"` above. Shape coordinates are tile cells (a point is a cell centre, y grows downward).
- A run stops after 30 seconds of computation (time spent waiting for the user does not count).
- To count blocks or walls by id, use `tw.tiles.histogram()`; it is much faster than `forEach`.
- Tile objects passed to `forEach`/`count`/`highlight` callbacks are one reused view: copy `t.x`, `t.y` and the values you need, never store `t`.
- Look ids up with English names: `tw.ids.tile("Crystal Heart")`, `tw.ids.item("Life Crystal")` (they throw on unknown names). Biome block sets are in `tw.ids.TileGroups`.
- Coordinates are in tiles, except NPC positions which are in pixels (divide by 16).
- When reading wall, frame, liquid, paint, slope, wire or actuator data only through `tw.tiles.raw()`, add `// @tw-layers <names>` at the top.
- If the task needs choices from the user (an item, a biome, a number), ask with `await tw.ui.prompt({...})` and stop when it returns null.
- If the task is about "an area", "here" or "this spot" on the map, let the user pick it with `await tw.ui.pickRegion()` / `await tw.ui.pickTile()` (or a `{ type: "region" }` prompt field) instead of asking for coordinates, and stop when it returns null.
- Start the script with these header comments:
  // @name <short name>
  // @description <one line>
  // @tw-api 1

## Header comments

Start every script with these comment lines. TerraWorld shows `@name` and `@description` in its script lists, and `@tw-api` says which API version the script was written for (always `1` for the 1.x API in `references/terraworld.d.ts`).

```js
// @name Find Life Crystals
// @description Marks every Life Crystal and lists the ten closest to spawn.
// @tw-api 1
```

Optional: `// @author <name>`, and `// @tw-layers wall, liquid` (or `all`) when the script reads those layers only through `tw.tiles.raw()`; TerraWorld loads only the tile layers a script needs and guesses them from the code.

## Changing the world: `tw.edit` draft, then `commit`

Reads (`tw.tiles`, `tw.world`, `tw.chests`…) never change anything. `tw.edit.*` only **drafts** changes inside the script. `await tw.edit.commit({ label })` shows the draft on the map; the user presses **Apply** or **Cancel**. Apply is one undo step. Without `commit()` nothing changes and TerraWorld drops the draft with a warning.

```js
const drafted = tw.edit.replace({ from: "Ebonstone Block", to: "Stone Block", region }); // one call beats a setTile loop
if (!drafted) return tw.ui.log("Nothing to change.");
const result = await tw.edit.commit({ label: "Ebonstone → Stone" });
if (!result.applied) return tw.ui.log("Cancelled: the world was not changed.");
tw.ui.stat("Changed", result.count, { unit: "tiles" });
if (result.skipped) tw.ui.warn(result.skipped + " cells were left alone (furniture or modded).");
```

- `from` takes an id, an English name, an array or a Set (`tw.ids.TileGroups.corruption` works as is); `to` may be a function of the old id that returns the new one, `null` to clear, or `undefined` to leave that cell.
- `fill(region, { tile, wall, paint, wallPaint, liquid })`, `setTile`/`clearTile`/`setWall`/`clearWall`/`setPaint`/`setWallPaint`/`setLiquid`/`setSlope` draft single cells; `tw.edit.count` is the size of the draft; `discard()` throws the draft away.
- Only plain vanilla blocks and walls can be placed. Furniture and other multi-tile objects, and modded ids, throw. Cells holding furniture or modded content are skipped and counted in `result.skipped`.
- Reads keep showing the world as it was when the run started, even after `commit()`. A script may commit several times; each commit is its own undo step. Keep one draft under 1 000 000 cells.
## Drawing text and figures: `tw.shape`, then `tw.edit.drawShape`

`tw.shape` builds vector shapes (the editor's Pen/Shape system). Shapes are immutable values: every method returns a new shape, and nothing touches the world until `tw.edit.drawShape(shape, …)` drafts it and `commit()` is approved.

```js
const name = await tw.shape.text("TERRARIA", { font: "display", size: 16 });   // async: always await
const box = name.bounds();                                                       // { x, y, w, h } in tiles
const plate = tw.shape.rect(box.x - 4, box.y - 4, box.w + 8, box.h + 8, { radius: 3 });
const logo = tw.shape.subtract(plate, name).moveTo(at.x, at.y);                  // at = await tw.ui.pickTile()
tw.edit.drawShape(logo, { fill: "Gold Brick", stroke: "Obsidian Brick", wall: "Gold Brick Wall" });
const result = await tw.edit.commit({ label: "Logo" });
```

- Make shapes with `rect(x, y, w, h, { radius })`, `ellipse(x, y, w, h)`, `line(x1, y1, x2, y2)`, `path("M 0 0 C 20 -15 40 15 60 0")` (SVG path data, or an array of `{ x, y, in?, out?, radius? }` anchors with `{ closed: true }`), `fromSvg(svgText)` and `await text(str, { font, size, letterSpacing, lineHeight, align })`.
- Coordinates are tile cells: a point is the **centre** of a cell and y grows downward. `rect(x, y, w, h)` covers exactly w × h cells. Build around (0, 0), then place with `moveTo(x, y)` (top-left of `bounds()`) or `translate(dx, dy)`.
- Text: `size` is the height of a capital letter in tiles. `font: "pixel"` (built-in 5×7 bitmap, ASCII, size in steps of 7) for anything under about 12 tiles; `"sans"` or `"display"` (Latin + Vietnamese outline fonts) above. A user font: a `{ type: "file", label, accept: ".ttf,.otf" }` prompt field, then `font: opt.file`.
- Combine with `tw.shape.union / subtract / intersect / xor` (closed shapes only; lines and open paths throw). Transform with `scale(sx, sy?)`, `rotate(degrees)`, `flip("horizontal" | "vertical")`, `offset(tiles)`. Check `shape.empty` before drawing a boolean result.
- `drawShape(shape, { fill, stroke, strokeWidth, wall, paint, wallPaint })` uses the Shape tool's rules: `fill` is the block inside, `stroke` the outline block (lines and open paths are strokes), `wall` goes behind every covered cell, `null` clears. Later `drawShape` calls win, so draw back to front. It returns the number of drafted cells and follows every `tw.edit` rule above.
- Limits: 50 000 points per shape, 2 000 characters of text, a 2 000 000-cell bounding box per `drawShape` call.

## Asking the user: `tw.ui.prompt`, `pickRegion`, `pickTile`

Ask for choices instead of hard-coding them, and stop when the user cancels (the call resolves to `null`). Time spent waiting for the user does not count toward the 30 s limit.

```js
const opt = await tw.ui.prompt({
  title: "Find blocks",
  fields: {
    block: { type: "tile", label: "Block", default: "Gold Ore" },
    area: { type: "region", label: "Area", optional: true },     // the user drags a rectangle on the map
    mark: { type: "checkbox", label: "Mark on map", default: true },
  },
});
if (!opt) return;                                                  // cancelled
const count = tw.tiles.histogram("tile", opt.area ?? undefined).get(opt.block) ?? 0;
```

- When the task is about "this area", "here" or "this spot", call `const region = await tw.ui.pickRegion({ title: "Select the area" })` or `const spot = await tw.ui.pickTile({ title: "Click a tile" })` and `if (!region) return;`. Never ask the user to type coordinates.
- Field types: `number`, `text`, `select` (with `options`), `checkbox`, `tile`, `wall`, `item` (returns an id or null) and `region`. Prompt results for `tile`/`wall`/`item` are numeric ids.

## Hand-over

Reply in the language the user writes in; keep code, comments and Terraria names in English. Give, in this order:

1. The complete script in one ```js code block, always, even when you also give a link (the link can be too long, or blocked by the chat app).
2. The link printed by `scripts/make_link.py`, copied exactly, for example **[Open in TerraWorld](https://terraworld.dev/world#script=1.eNo…)**. If it says the script is too long for a link, give the code block only.
3. A short explanation: what the script does and what the user will see. Then how to run it: open the link (or open https://terraworld.dev/world and paste the code into the Script panel), open their world file if none is open, read the script, and press **Run**. Opening a link never runs the script by itself. For a script that changes the world, add that they check the orange preview and press **Apply**, then save the world from TerraWorld, and that keeping a backup of the `.wld` file is wise.

## Files

- `references/terraworld.d.ts`: the exact `tw` API (TypeScript declarations with documentation). If anything here disagrees with it, follow the `.d.ts`.
- `references/scripting-guide.md`: performance rules and worked examples taken from TerraWorld's own sample scripts.
- `references/tw-members.txt`: every `tw.*` member, used by `check_script.py`.
- `scripts/check_script.py`: `python scripts/check_script.py script.js` (or the script on stdin). Exit code 1 while there are problems.
- `scripts/make_link.py`: `python scripts/make_link.py script.js` prints the `https://terraworld.dev/world#script=1.…` link.
