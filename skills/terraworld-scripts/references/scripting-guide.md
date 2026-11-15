# TerraWorld scripting guide

Worked examples for the `tw` API 1.3.0. The exact API is in `terraworld.d.ts`; these scripts are TerraWorld's
own samples (menu **Sample scripts** in the Script panel), so they are known to run.

## Runtime and performance

- The script is the body of an `async` function in strict mode: top-level `await` and `return` work. No modules, network,
  storage, DOM or console.
- A run stops after 30 s of computation on worlds of up to about 20 million tiles. Waiting for the user (prompt, pick,
  Apply) does not count.
- Counting by id: `tw.tiles.histogram("tile" | "wall", region?)` returns a `Map<id, count>` and is much faster than
  `forEach`. Use `tw.regions.surface()`, `underground()`, `cavern()`, `underworld()` for depth layers.
- Per-tile work: `tw.tiles.forEach(fn, region?)` and `tw.tiles.count(pred, region?)` pass one reused tile view; copy
  `t.x`, `t.y` and the values you need, never keep `t`. Pass a region whenever the task allows it.
- Fastest reads: `tw.tiles.raw(layer)` returns the whole layer as a typed array, indexed by `tw.tiles.index(x, y)`
  (`x * tw.world.height + y`).
- Coordinates are tiles, `x` to the right and `y` down from the top-left corner. NPC positions are pixels (divide by 16).
- Names to ids: `tw.ids.tile("…")`, `tw.ids.wall("…")`, `tw.ids.item("…")` take English names and throw on unknown
  ones (wrap guesses in `try`). Biome sets: `tw.ids.TileGroups`, `tw.ids.WallGroups`.
- Map marks: `tw.map.highlight(pred, color?, label?, region?)` tints the cells where `pred(t)` is true; `tw.map.mark` / `markAll` pin icons.

## Examples

### 1. Infection percentage

```js
// @name Infection percentage
// @description Percentage of solid blocks taken over by each evil / hallow biome.
// @tw-api 1
const G = tw.ids.TileGroups;
const hist = tw.tiles.histogram("tile");
let solid = 0;
for (const count of hist.values()) solid += count;
const share = (group) => [...group].reduce((sum, id) => sum + (hist.get(id) ?? 0), 0);

tw.ui.stat("Corruption", share(G.corruption) / solid * 100, { percent: true, color: "#a78bfa" });
tw.ui.stat("Crimson", share(G.crimson) / solid * 100, { percent: true, color: "#f87171" });
tw.ui.stat("Hallow", share(G.hallow) / solid * 100, { percent: true, color: "#67e8f9" });

const evil = tw.world.evil === "crimson" ? G.crimson : G.corruption;
tw.map.highlight(t => t.active && evil.has(t.type), "#c084fc", tw.world.evil);
```

### 2. Infection report (form + modal)

```js
// @name Infection report (form + modal)
// @description Asks which biome to analyse, then opens a detailed report.
// @tw-api 1
const opt = await tw.ui.prompt({
  title: "Infection report",
  fields: {
    biome: { type: "select", label: "Biome", options: ["corruption", "crimson", "hallow"], default: tw.world.evil },
    walls: { type: "checkbox", label: "Include walls", default: true },
  },
});
if (!opt) return;

const group = tw.ids.TileGroups[opt.biome];
const hist = tw.tiles.histogram("tile");
const rows = [...group]
  .map(id => ({ block: tw.ids.tileName(id), count: hist.get(id) ?? 0 }))
  .filter(row => row.count > 0)
  .sort((a, b) => b.count - a.count);

const m = tw.ui.modal({ title: "Infection report: " + opt.biome, size: "lg" });
const blocks = m.section("Blocks");
blocks.table(rows);
blocks.chart({ type: "bar", labels: rows.map(r => r.block), values: rows.map(r => r.count) });

if (opt.walls) {
  const walls = tw.tiles.histogram("wall");
  const wallRows = [...(tw.ids.WallGroups[opt.biome] ?? [])]
    .map(id => ({ wall: tw.ids.wallName(id), count: walls.get(id) ?? 0 }))
    .filter(row => row.count > 0);
  m.section("Walls").table(wallRows);
}
```

### 3. Mark Life Crystals

```js
// @name Mark Life Crystals
// @description Marks every Life Crystal on the map (Mask Display) and lists the closest ones to spawn.
// @tw-api 1
const id = tw.ids.tile("Crystal Heart"); // the Life Crystal block
const found = [];
tw.tiles.forEach(t => {
  // Life Crystals are 2x2 objects: keep only the top-left cell.
  if (t.active && t.type === id && t.u % 36 === 0 && t.v === 0) found.push({ x: t.x, y: t.y });
});
const { x: sx, y: sy } = tw.world.spawn;
for (const p of found) p.distance = Math.round(Math.hypot(p.x - sx, p.y - sy));
found.sort((a, b) => a.distance - b.distance);

tw.map.markAll(found, { icon: "Life Crystal", label: "Life Crystal" });
tw.ui.stat("Life Crystals", found.length);
tw.ui.table(found.slice(0, 10), { title: "Closest to spawn" });
```

### 4. Find an item in chests

```js
// @name Find an item in chests
// @description Finds chests containing an item and marks them on the map.
// @tw-api 1
const opt = await tw.ui.prompt({
  title: "Find item in chests",
  fields: { item: { type: "item", label: "Item" } },
});
if (!opt || opt.item === null) return;

const hits = tw.chests
  .filter(chest => chest.items.some(item => item.itemId === opt.item && item.stackSize > 0))
  .map(chest => ({ x: chest.x, y: chest.y, name: chest.name || "Chest" }));

tw.map.markAll(hits, { icon: opt.item, label: tw.ids.itemName(opt.item) });
tw.ui.stat(tw.ids.itemName(opt.item), hits.length, { unit: "chests" });
tw.ui.table(hits);
```

### 5. Ores by layer

```js
// @name Ores by layer
// @description Counts ore blocks by layer.
// @tw-api 1
const ores = ["Copper Ore", "Tin Ore", "Iron Ore", "Lead Ore", "Silver Ore", "Tungsten Ore",
  "Gold Ore", "Platinum Ore", "Demonite Ore", "Crimtane Ore", "Hellstone Ore", "Cobalt Ore",
  "Palladium Ore", "Mythril Ore", "Orichalcum Ore", "Adamantite Ore", "Titanium Ore", "Chlorophyte Ore"];
const layers = { surface: tw.regions.surface(), underground: tw.regions.underground(), cavern: tw.regions.cavern(), underworld: tw.regions.underworld() };
const hist = Object.fromEntries(Object.entries(layers).map(([name, region]) => [name, tw.tiles.histogram("tile", region)]));

const rows = [];
for (const name of ores) {
  let id;
  try { id = tw.ids.tile(name); } catch { continue; }
  const row = { ore: name };
  let total = 0;
  for (const layer of Object.keys(layers)) { row[layer] = hist[layer].get(id) ?? 0; total += row[layer]; }
  row.total = total;
  if (total > 0) rows.push(row);
}
tw.ui.table(rows, { title: "Ore blocks by layer" });
```

### 6. Ores in a picked region

```js
// @name Ores in a picked region
// @description Asks you to drag a rectangle on the map, then counts the ore blocks inside it.
// @tw-api 1
const region = await tw.ui.pickRegion({ title: "Select the area to count ores in" });
if (!region) return; // cancelled

const ores = ["Copper Ore", "Tin Ore", "Iron Ore", "Lead Ore", "Silver Ore", "Tungsten Ore",
  "Gold Ore", "Platinum Ore", "Demonite Ore", "Crimtane Ore", "Hellstone Ore", "Cobalt Ore",
  "Palladium Ore", "Mythril Ore", "Orichalcum Ore", "Adamantite Ore", "Titanium Ore", "Chlorophyte Ore"];
const hist = tw.tiles.histogram("tile", region);

const rows = [];
for (const name of ores) {
  let id;
  try { id = tw.ids.tile(name); } catch { continue; }
  const count = hist.get(id) ?? 0;
  if (count > 0) rows.push({ ore: name, blocks: count });
}
rows.sort((a, b) => b.blocks - a.blocks);

tw.ui.stat("Area", `${region.w} × ${region.h}`, { unit: "tiles" });
tw.ui.stat("Ore blocks", rows.reduce((sum, row) => sum + row.blocks, 0));
if (rows.length) {
  tw.ui.table(rows, { title: `Ores at X ${region.x}, Y ${region.y}` });
  tw.ui.chart({ type: "bar", labels: rows.map((row) => row.ore), values: rows.map((row) => row.blocks), title: "Ore blocks" });
  const oreIds = new Set(rows.map((row) => tw.ids.tile(row.ore)));
  tw.map.highlight((t) => t.active && oreIds.has(t.type), "#ffd84a", "Ores in region", region);
} else {
  tw.ui.log("No ore blocks in this area.");
}
```

### 7. Replace Ebonstone with Stone (edit)

```js
// @name Replace Ebonstone with Stone (edit)
// @description Replaces every Ebonstone block with Stone.
// @tw-api 1
// tw.edit only drafts the change: the map shows it in orange and nothing is written
// until you press Apply. Apply is one undo step.
const ebonstone = tw.ids.tile("Ebonstone Block");
if (!tw.tiles.histogram("tile").get(ebonstone)) {
  tw.ui.log("This world has no Ebonstone.");
  return;
}

tw.edit.replace({ from: ebonstone, to: "Stone Block" });
const result = await tw.edit.commit({ label: "Ebonstone → Stone" });

if (result.applied) tw.ui.stat("Ebonstone → Stone", result.count, { unit: "tiles" });
else tw.ui.log("Cancelled: the world was not changed.");
if (result.skipped) tw.ui.warn(result.skipped + " cells were left alone (furniture or modded).");
```

### 8. Purify Corruption / Crimson in a region (edit)

```js
// @name Purify Corruption / Crimson in a region (edit)
// @description Purifies Corruption and Crimson blocks in an area you drag on the map,
// @tw-api 1
// like Purification Powder: evil blocks become their pure versions, thorns are removed.
// Plants, vines and backgrounds are left as they are.
const region = await tw.ui.pickRegion({ title: "Select the area to purify" });
if (!region) return;

const pure = {
  "Corrupt Grass Block": "Grass Block", "Crimson Grass Block": "Grass Block",
  "Corrupt Jungle Grass Block": "Jungle Grass Block", "Crimson Jungle Grass Block": "Jungle Grass Block",
  "Ebonstone Block": "Stone Block", "Crimstone Block": "Stone Block",
  "Ebonsand Block": "Sand Block", "Crimsand Block": "Sand Block",
  "Purple Ice Block": "Ice Block", "Red Ice Block": "Ice Block",
  "Corrupt Sandstone Block": "Sandstone Block", "Crimson Sandstone Block": "Sandstone Block",
  "Corrupt Hardened Sand Block": "Hardened Sand Block", "Crimson Hardened Sand Block": "Hardened Sand Block",
  "Corruption Thorns": null, "Crimtane Thorns": null,
};
const target = new Map(Object.entries(pure).map(([from, to]) => [tw.ids.tile(from), to]));

const drafted = tw.edit.replace({ from: target.keys(), to: (id) => target.get(id), region });
if (!drafted) {
  tw.ui.log("No Corruption or Crimson blocks in this area.");
  return;
}
const result = await tw.edit.commit({ label: "Purify area" });
if (!result.applied) {
  tw.ui.log("Cancelled: the world was not changed.");
  return;
}
tw.ui.stat("Purified", result.count, { unit: "tiles" });
if (result.skipped) tw.ui.warn(result.skipped + " cells were left alone (furniture or modded).");
```

### 9. Text banner (shapes, edit)

```js
// @name Text banner (shapes, edit)
// @description Writes text in blocks. "pixel" is a built-in bitmap font for small text;
// @tw-api 1
// "sans" and "display" are outline fonts that look best from about 12 tiles up.
const opt = await tw.ui.prompt({
  title: "Text banner",
  fields: {
    text: { type: "text", label: "Text", default: tw.world.name },
    font: { type: "select", label: "Font", options: ["pixel", "sans", "display"], default: "pixel" },
    size: { type: "number", label: "Letter height (tiles)", default: 14, min: 5, max: 200 },
    block: { type: "tile", label: "Block", default: "Gray Brick" },
    backing: { type: "checkbox", label: "Wall behind the text", default: true },
  },
});
if (!opt) return;
const at = await tw.ui.pickTile({ title: "Tap where the top-left corner of the text goes" });
if (!at) return;

const text = (await tw.shape.text(opt.text, { font: opt.font, size: opt.size })).moveTo(at.x, at.y);
if (text.empty) {
  tw.ui.warn("Nothing to draw.");
  return;
}
if (opt.backing) {
  const box = text.bounds();
  tw.edit.drawShape(tw.shape.rect(box.x - 2, box.y - 2, box.w + 4, box.h + 4), { wall: "Gray Brick Wall" });
}
tw.edit.drawShape(text, { fill: opt.block });

const result = await tw.edit.commit({ label: "Text: " + opt.text });
if (!result.applied) {
  tw.ui.log("Cancelled: the world was not changed.");
  return;
}
tw.ui.stat("Placed", result.count, { unit: "tiles" });
if (result.skipped) tw.ui.warn(result.skipped + " cells were left alone (furniture or modded).");
```

### 10. Logo with cut-out text (shapes, edit)

```js
// @name Logo with cut-out text (shapes, edit)
// @description A logo built from vector shapes: a rounded plate with the world name cut out of it
// @tw-api 1
// (boolean subtract), a frame around it (offset) and a wave under the name (SVG path).
const at = await tw.ui.pickTile({ title: "Tap where the top-left corner of the logo goes" });
if (!at) return;

const name = await tw.shape.text(tw.world.name.toUpperCase().slice(0, 16) || "TERRARIA", { font: "display", size: 16 });
const box = name.bounds();
const plate = tw.shape.rect(box.x - 5, box.y - 5, box.w + 10, box.h + 18, { radius: 5 });
const waveY = box.y + box.h + 6;
const wave = tw.shape.path("M " + box.x + " " + waveY + " q " + box.w / 4 + " -6 " + box.w / 2 + " 0 t " + box.w / 2 + " 0");

// Everything is built around (0, 0); move the finished parts together.
const frame = plate.offset(2);
const corner = frame.bounds();
const place = (shape) => shape.translate(at.x - corner.x, at.y - corner.y);

tw.edit.drawShape(place(frame), { fill: "Obsidian Brick", wall: "Gray Brick Wall" });
// The frame shows through where the name was cut out of the plate.
tw.edit.drawShape(place(tw.shape.subtract(plate, name)), { fill: "Gold Brick" });
tw.edit.drawShape(place(wave), { stroke: "Obsidian Brick", strokeWidth: 2 });

const result = await tw.edit.commit({ label: "Logo: " + tw.world.name });
tw.ui.stat("Placed", result.count, { unit: result.applied ? "tiles" : "tiles (cancelled)" });
```
