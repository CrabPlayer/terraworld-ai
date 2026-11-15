/**
 * TerraWorld script API — type declarations.
 *
 * @tw-api-version 1.3.0
 *
 * Scripts are plain JavaScript run by TerraWorld (https://terraworld.dev) in a sandboxed
 * Web Worker. The whole file is the body of an `async` function that receives `tw`, so
 * top-level `await` and `return` both work at run time.
 *
 * Editor setup (VS Code): put this file and the matching `jsconfig.json` (served next to
 * it as /scripting/jsconfig.json) in your script folder, e.g.
 * `Documents/My Games/Terraria/twscript`, then open that folder in VS Code.
 *
 * `lib: ["ES2022"]` keeps browser APIs such as `fetch` and `document` out of the
 * suggestions: they do not exist inside the sandbox. The editor still flags a
 * top-level `return` ("can only be used within a function body"); TerraWorld runs
 * it fine, or you can use `if (...) { ... }` instead.
 *
 * Source of truth: TerraWorld `static/scripting/terraworld.d.ts`. Community copy:
 * https://github.com/CrabPlayer/terraworld-scripts
 */

declare namespace TerraWorld {
	// ── World ──────────────────────────────────────────────────────────

	type Evil = "corruption" | "crimson";
	type GameMode = "classic" | "expert" | "master" | "journey";

	type BossKey =
		| "eyeOfCthulhu" | "eaterOfWorldsOrBrain" | "skeletron" | "queenBee" | "destroyer" | "twins"
		| "skeletronPrime" | "anyMechanicalBoss" | "plantera" | "golem" | "kingSlime" | "dukeFishron"
		| "lunaticCultist" | "moonLord" | "pumpking" | "mourningWood" | "iceQueen" | "everscream"
		| "santaNk1" | "solarPillar" | "vortexPillar" | "nebulaPillar" | "stardustPillar"
		| "empressOfLight" | "queenSlime" | "deerclops";

	interface World {
		readonly name: string;
		readonly seed: string;
		/** Width in tiles. */
		readonly width: number;
		/** Height in tiles. */
		readonly height: number;
		readonly spawn: Readonly<{ x: number; y: number }>;
		/** Y of the surface/underground boundary (tiles). */
		readonly surfaceY: number;
		/** Y of the underground/cavern boundary (tiles). */
		readonly rockY: number;
		readonly evil: Evil;
		readonly hardmode: boolean;
		readonly mode: GameMode;
		/** True for Expert and Master. */
		readonly expert: boolean;
		readonly master: boolean;
		/** Defeated bosses. Keys missing in older worlds are absent. */
		readonly bosses: Readonly<Partial<Record<BossKey, boolean>>>;
	}

	// ── Tiles ──────────────────────────────────────────────────────────

	type LiquidType = "none" | "water" | "lava" | "honey" | "shimmer";

	/**
	 * Layer names for `tw.tiles.raw()` and the `// @tw-layers` directive.
	 * TerraWorld copies only the layers a script needs. It detects most of them from
	 * the code; when it misses one, reading that property throws and asks you to add
	 * e.g. `// @tw-layers wall, liquid` (or `// @tw-layers all`) at the top.
	 */
	type LayerName = "active" | "tile" | "wall" | "frame" | "wires" | "liquid" | "paint" | "wallPaint" | "slope" | "actuator";

	/**
	 * One tile. Objects passed to `forEach`/`count`/`highlight` callbacks are a single
	 * reused view that moves from cell to cell: copy the values you need
	 * (`{ x: t.x, y: t.y }`), never keep the object itself.
	 */
	interface Tile {
		readonly x: number;
		readonly y: number;
		/** Flat index into `tw.tiles.raw()` arrays (`x * height + y`). */
		readonly i: number;
		/** A block is present. `type` is only meaningful when true. */
		readonly active: boolean;
		/** Tile id (see `tw.ids.tile()`). */
		readonly type: number;
		/** Wall id, 0 = no wall. Needs layer `wall`. */
		readonly wall: number;
		/** Frame X in pixels (multi-tile objects and styles). Needs layer `frame`. */
		readonly u: number;
		/** Frame Y in pixels. Needs layer `frame`. */
		readonly v: number;
		/** Tile paint id, 0 = none. Needs layer `paint`. */
		readonly paint: number;
		/** Wall paint id. Needs layer `wallPaint`. */
		readonly wallPaint: number;
		/** 0 = full block, 1 = half block, 2–5 = slopes (see `Slope`). Needs layer `slope`. */
		readonly slope: number;
		/** Needs layer `actuator`. */
		readonly actuator: boolean;
		/** Actuated (non-solid). Needs layer `actuator`. */
		readonly inactive: boolean;
		/** `amount` 0–255. Needs layer `liquid`. */
		readonly liquid: { amount: number; type: LiquidType };
		/** Needs layer `wires`. */
		readonly wires: { red: boolean; blue: boolean; green: boolean; yellow: boolean };
	}

	/** A rectangle in tile coordinates. Out-of-world parts are clipped. */
	interface Region {
		x: number;
		y: number;
		w: number;
		h: number;
	}

	type TilePredicate = (tile: Tile) => boolean;

	interface Tiles {
		/** Throws `RangeError` outside the world. Unlike scan callbacks, this view can be kept. */
		get(x: number, y: number): Tile;
		/** Visits every tile, column by column (x outer, y inner). */
		forEach(fn: (tile: Tile) => void, region?: Region): void;
		count(pred: TilePredicate, region?: Region): number;
		/**
		 * Fast id → count map. `"tile"` counts active blocks by tile id;
		 * `"wall"` counts walls by wall id (0 skipped).
		 */
		histogram(kind?: "tile" | "wall", region?: Region): Map<number, number>;
		/**
		 * Raw column-major array (`index = x * height + y`) for very hot loops.
		 * `frame` returns u only, `liquid` returns the liquid type, `actuator` the actuator flag.
		 */
		raw(name: LayerName): Readonly<Uint8Array | Uint16Array | Int16Array>;
		index(x: number, y: number): number;
	}

	// ── Ids ────────────────────────────────────────────────────────────

	type TileGroupName = "corruption" | "crimson" | "hallow" | "jungle" | "snow" | "desert" | "mushroom" | "dungeon" | "meteorite";
	/** Natural (spreadable) biome walls only; player-placed brick walls are excluded. */
	type WallGroupName = "corruption" | "crimson" | "hallow";

	interface Ids {
		/** Id from an English name, case-insensitive. Throws for unknown names. */
		tile(name: string): number;
		wall(name: string): number;
		item(name: string): number;
		/** Name for an id, or `"Tile #id"` when unknown. */
		tileName(id: number): string;
		wallName(id: number): string;
		itemName(id: number): string;
		/** Biome tile sets, shared with TerraWorld's View Biome. */
		readonly TileGroups: Readonly<Record<TileGroupName, ReadonlySet<number>>>;
		readonly WallGroups: Readonly<Record<WallGroupName, ReadonlySet<number>>>;
	}

	interface Regions {
		all(): Region;
		/** Sky and surface, down to `world.surfaceY`. */
		surface(): Region;
		/** `surfaceY` → `rockY`. */
		underground(): Region;
		/** `rockY` → top of the underworld. */
		cavern(): Region;
		/** Bottom 200 rows. */
		underworld(): Region;
		rect(x: number, y: number, w: number, h: number): Region;
	}

	// ── Editing ────────────────────────────────────────────────────────

	/** Tile/wall id, or an English name (case-insensitive) as in `tw.ids.tile()`. */
	type IdOrName = number | string;

	/** Block shapes. Numbers 0–5 work too (same as `Tile.slope`). */
	type Slope = "full" | "half" | "topRight" | "topLeft" | "bottomRight" | "bottomLeft";

	interface ReplaceOptions {
		/** Id, name, or a set/array of them, e.g. `tw.ids.TileGroups.corruption`. */
		from: IdOrName | Iterable<IdOrName>;
		/**
		 * New id or name, `null` to remove the block/wall, or a function of the old id.
		 * The function may return `undefined` to leave that cell alone.
		 */
		to: IdOrName | null | ((id: number, x: number, y: number) => IdOrName | null | undefined);
		/** Default `"tile"`. `"wall"` needs the wall layer (detected from the word "wall"). */
		kind?: "tile" | "wall";
		/** Default: the whole world. */
		region?: Region;
	}

	interface FillOptions {
		/** Block to place everywhere, `null` to remove blocks. */
		tile?: IdOrName | null;
		/** Wall to place everywhere, `null` to remove walls. */
		wall?: IdOrName | null;
		/** Paint id 0–31 (0 = none). */
		paint?: number;
		wallPaint?: number;
		/** `amount` 0–255, default 255 (full). */
		liquid?: { type: LiquidType; amount?: number };
	}

	interface CommitResult {
		/** True when the user pressed Apply. */
		applied: boolean;
		/** Cells changed (0 when cancelled). */
		count: number;
		/** Cells left alone for safety (sum of `skippedBy`). */
		skipped: number;
		/**
		 * `modded`: tModLoader-owned cells. `object`: cells holding furniture or other
		 * multi-tile objects (chests, doors, trees…), which would break. `shape`: slopes or
		 * half blocks the block cannot take.
		 */
		skippedBy: { modded: number; object: number; shape: number };
	}

	interface DrawShapeOptions {
		/**
		 * Block for the inside of closed shapes, `null` to remove blocks there. Without
		 * `stroke` it also covers the edge cells, so the whole shape is one block.
		 */
		fill?: IdOrName | null;
		/**
		 * Block for the outline (drawn over the fill), `null` to remove blocks along it.
		 * Lines and open paths are drawn with it (or with `fill` when there is no `stroke`).
		 */
		stroke?: IdOrName | null;
		/** Outline thickness in tiles, 1–32. Default 1. The outline is centred on the path. */
		strokeWidth?: number;
		/** Wall placed behind every covered cell, `null` to remove walls. */
		wall?: IdOrName | null;
		/** Paint id 0–31 for every covered cell (0 = none). */
		paint?: number;
		wallPaint?: number;
	}

	/**
	 * Changes to the world, made safely in three steps:
	 * 1. `set…` / `replace` / `fill` / `drawShape` only write to a **draft**. The world does not change.
	 * 2. `await tw.edit.commit({ label })` highlights the changed cells on the map and asks
	 *    the user to Apply or Cancel (waiting does not count toward the time limit).
	 * 3. Applied changes become **one** undo step (Edit Mode → Undo, or Undo in the Script panel).
	 *
	 * Reads (`tw.tiles.*`) always see the world as it was when the run started; the draft
	 * is not visible to them, even after `commit()`. A draft that is never committed is
	 * thrown away with a warning. At most 1,000,000 cells per draft; the preview warns
	 * above 100,000.
	 *
	 * Safety rules (checked again by TerraWorld when you commit):
	 * - Only plain vanilla blocks and walls can be placed. Furniture / multi-tile objects
	 *   (frame-important tiles) and modded ids throw an error.
	 * - Cells holding furniture/objects are never replaced or cleared, and modded cells are
	 *   never touched: they are skipped and counted in `skippedBy`. Painting them, or
	 *   changing their wall or liquid, is allowed.
	 * - `setTile` keeps the cell's paint and, when the new block allows it, its slope.
	 *
	 * @example
	 * // Turn every Ebonstone block into Stone.
	 * tw.edit.replace({ from: "Ebonstone Block", to: "Stone Block" });
	 * const result = await tw.edit.commit({ label: "Ebonstone → Stone" });
	 * tw.ui.stat("Changed", result.count, { unit: result.applied ? "tiles" : "tiles (cancelled)" });
	 */
	interface Edit {
		/** Places a block. Throws for furniture/objects and modded ids. */
		setTile(x: number, y: number, tile: IdOrName): void;
		/** Removes the block (and its paint, slope and actuator). */
		clearTile(x: number, y: number): void;
		setWall(x: number, y: number, wall: IdOrName): void;
		clearWall(x: number, y: number): void;
		/** Paint id 0–31; 0 removes paint. */
		setPaint(x: number, y: number, color: number): void;
		setWallPaint(x: number, y: number, color: number): void;
		/** `amount` 0–255, default 255. `"none"` or 0 removes the liquid. */
		setLiquid(x: number, y: number, type: LiquidType, amount?: number): void;
		/** Skipped at commit when the cell has no block or the block cannot take that shape. */
		setSlope(x: number, y: number, slope: Slope | number): void;
		/**
		 * Replaces matching blocks (or walls) in `region`, judged on the world as loaded.
		 * Returns how many cells were added to the draft.
		 */
		replace(options: ReplaceOptions): number;
		/** Sets the given fields on every cell of `region`. Returns the number of cells. */
		fill(region: Region, options: FillOptions): number;
		/**
		 * Turns a `tw.shape` into blocks/walls in the draft, with the same rules as the
		 * editor's Shape tool: a closed shape covers every cell whose centre is inside it
		 * plus the cells its outline passes through; `stroke` then draws the outline on top.
		 * Parts outside the world are dropped. Returns the number of cells drafted.
		 *
		 * Draw several shapes one after another to layer them: later calls win.
		 * A shape may span at most 2,000,000 cells (bounding box) per call.
		 * @example
		 * const plate = tw.shape.rect(100, 200, 60, 20, { radius: 4 });
		 * tw.edit.drawShape(plate, { fill: "Gold Brick", stroke: "Obsidian", wall: "Gold Brick Wall" });
		 * await tw.edit.commit({ label: "Plate" });
		 */
		drawShape(shape: Shape, options: DrawShapeOptions): number;
		/** Cells in the current draft. */
		readonly count: number;
		/** Empties the draft without asking the user. */
		discard(): void;
		/**
		 * Shows the draft on the map and waits for Apply / Cancel. The draft is emptied
		 * either way, so a script can commit several parts (each is its own undo step).
		 * Resolves immediately with `applied: false` when the draft is empty.
		 */
		commit(options?: { label?: string }): Promise<CommitResult>;
	}

	// ── Shapes ─────────────────────────────────────────────────────────

	/**
	 * A point of a path. Without `in`/`out` it is a corner joined by straight lines;
	 * `in` / `out` are the Bézier control points before / after it (absolute coordinates).
	 */
	interface PathAnchor {
		x: number;
		y: number;
		in?: { x: number; y: number };
		out?: { x: number; y: number };
		/** Rounds this corner with an arc of this radius (tiles). */
		radius?: number;
	}

	/**
	 * `"sans"` (Be Vietnam Pro Bold) and `"display"` (Bungee) are bundled outline fonts
	 * with Latin and Vietnamese letters, downloaded the first time they are used.
	 * `"pixel"` is a built-in 5×7 bitmap font (ASCII; accents are dropped) for small text.
	 * Or pass the bytes of a .ttf / .otf / .woff file, e.g. the value of a
	 * `{ type: "file" }` prompt field.
	 */
	type FontSource = "sans" | "display" | "pixel" | ArrayBuffer | Uint8Array | { bytes: Uint8Array | ArrayBuffer };

	interface TextOptions {
		/** Default `"sans"`. */
		font?: FontSource;
		/**
		 * Height of a capital letter in tiles (1–512). Default 16; `"pixel"`: default 7,
		 * rounded to a multiple of 7. Outline fonts need about 12+ to stay readable:
		 * use `"pixel"` below that.
		 */
		size?: number;
		/** Extra tiles between letters (may be negative). */
		letterSpacing?: number;
		/** Tiles from one line to the next (text may contain "\n"). Default 1.5 × size. */
		lineHeight?: number;
		/** Where each line sits relative to x = 0: starts there, is centred on it, or ends there. Default `"left"`. */
		align?: "left" | "center" | "right";
	}

	/**
	 * An immutable vector shape: one or more paths. Methods return a **new** shape;
	 * nothing changes the world until `tw.edit.drawShape(shape, …)` and `commit()`.
	 */
	interface Shape {
		/** True when there is nothing to draw (e.g. `intersect` of shapes that do not overlap). */
		readonly empty: boolean;
		/** Box of the cells the path covers, as a `Region` (strokes wider than 1 reach further). */
		bounds(): Region;
		/** Moves by (dx, dy) tiles. */
		translate(dx: number, dy: number): Shape;
		/** Moves the shape so the top-left cell of `bounds()` is (x, y). */
		moveTo(x: number, y: number): Shape;
		/**
		 * Resizes around the centre of `bounds()`: `scale(2)` doubles width and height,
		 * `scale(2, 1)` only the width. A negative factor also mirrors.
		 */
		scale(sx: number, sy?: number): Shape;
		/** Rotates clockwise (as seen on the map) around the centre of `bounds()`. */
		rotate(degrees: number): Shape;
		/** Mirrors in place: `"horizontal"` (default) swaps left and right, `"vertical"` top and bottom. */
		flip(axis?: "horizontal" | "vertical"): Shape;
		/** Grows (positive) or shrinks (negative) a closed shape by `distance` tiles on every side. */
		offset(distance: number): Shape;
	}

	/**
	 * Vector shapes, the same system as the editor's Pen and Shape tools. Build a shape,
	 * combine and transform it, then draw it with `tw.edit.drawShape`.
	 *
	 * Coordinates are tile cells: the point (x, y) is the **centre** of cell (x, y), and
	 * y grows downward. A closed path covers every cell whose centre is inside it plus the
	 * cells the path itself passes through, so paths include both
	 * end cells: `M 0 0 H 9 V 4 H 0 Z` is 10 × 5 cells.
	 * Several closed paths in one shape fill even-odd: a path inside another cuts a hole.
	 *
	 * Limits: 50,000 points per shape, 500,000 characters of path data / SVG, 2,000 characters of text.
	 *
	 * @example
	 * // A gold plate with the world name cut out of it, above the spawn.
	 * const name = await tw.shape.text(tw.world.name, { font: "display", size: 14 });
	 * const box = name.bounds();
	 * const plate = tw.shape.rect(box.x - 4, box.y - 4, box.w + 8, box.h + 8, { radius: 3 });
	 * const logo = tw.shape.subtract(plate, name).moveTo(tw.world.spawn.x - 40, tw.world.spawn.y - 60);
	 * tw.edit.drawShape(logo, { fill: "Gold Brick", wall: "Gold Brick Wall" });
	 * await tw.edit.commit({ label: "Name plate" });
	 */
	interface ShapeApi {
		/**
		 * A path from SVG path data (`M L H V C S Q T A Z`, lower case = relative), or from
		 * an array of anchors. Path data is closed by `Z`; an anchor array by `{ closed: true }`.
		 * Open paths are drawn as lines.
		 * @example
		 * const wave = tw.shape.path("M 0 0 C 20 -15 40 15 60 0");
		 * const triangle = tw.shape.path([{ x: 0, y: 20 }, { x: 15, y: 0 }, { x: 30, y: 20 }], { closed: true });
		 */
		path(data: string | readonly PathAnchor[], options?: { closed?: boolean }): Shape;
		/** A rectangle of `w` × `h` cells whose top-left cell is (x, y); `radius` rounds the corners. */
		rect(x: number, y: number, w: number, h: number, options?: { radius?: number }): Shape;
		/** The ellipse inscribed in the `w` × `h` cell box whose top-left cell is (x, y). */
		ellipse(x: number, y: number, w: number, h: number): Shape;
		/** A straight line from cell (x1, y1) to cell (x2, y2). */
		line(x1: number, y1: number, x2: number, y2: number): Shape;
		/**
		 * Text as a shape: the top of the capital letters is y = 0 and the baseline y = `size`.
		 * Position it afterwards with `moveTo` / `translate`. Outline fonts load on first use
		 * (a small download for `"sans"` / `"display"`), so this is async.
		 * @example
		 * const title = await tw.shape.text("HELLO", { font: "pixel", size: 14 });
		 * tw.edit.drawShape(title.moveTo(100, 200), { fill: "Stone Block" });
		 */
		text(text: string, options?: TextOptions): Promise<Shape>;
		/**
		 * Reads the `<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<polygon>`, `<polyline>` and
		 * `<line>` elements of SVG markup, with `transform` attributes (also on `<g>`).
		 * One SVG unit is one tile; colours, `viewBox`, text and `<use>` are ignored.
		 * Closed elements are merged into one filled area.
		 */
		fromSvg(svg: string): Shape;
		/**
		 * Area covered by any of the shapes. Booleans need closed shapes and return polygons
		 * (curves are flattened). Rectangles and pixel text combine cell for cell; with
		 * curved shapes, parts of the result thinner than 2 tiles can be lost.
		 */
		union(...shapes: Shape[]): Shape;
		/** `shape` minus every other shape. */
		subtract(shape: Shape, ...others: Shape[]): Shape;
		/** Area covered by all of the shapes. */
		intersect(...shapes: Shape[]): Shape;
		/** Area covered by an odd number of the shapes. */
		xor(...shapes: Shape[]): Shape;
	}

	// ── Entities ───────────────────────────────────────────────────────
	// Parsed on demand the first time a script mentions tw.chests / npcs / signs /
	// tileEntities. `tw.entitiesLoaded` is false if parsing was not possible.

	interface ItemStack {
		itemId: number;
		stackSize: number;
		prefix: number;
	}

	interface ChestItem extends ItemStack {
		modName?: string;
		modItemName?: string;
		slot?: number;
		favorited?: boolean;
	}

	interface Chest {
		/** Top-left tile. */
		x: number;
		y: number;
		/** Custom name, "" for unnamed chests. */
		name: string;
		items: ChestItem[];
		maxItems?: number;
	}

	interface Npc {
		spriteId: number;
		name: string;
		displayName?: string;
		/** Position in pixels (divide by 16 for tiles). */
		x: number;
		y: number;
		homeless: boolean;
		/** Home tile, -1 when homeless. */
		homeX: number;
		homeY: number;
		variation: number;
		isTownNpc?: boolean;
		modName?: string;
		modClassName?: string;
	}

	interface Sign {
		x: number;
		y: number;
		text: string;
	}

	interface TileEntity {
		type: number;
		/** e.g. "TrainingDummy", "ItemFrame", "LogicSensor", "DisplayDoll", "WeaponsRack", "HatRack", "FoodPlatter", "TeleportationPylon". */
		typeName: string;
		id: number;
		x: number;
		y: number;
		npcId?: number;
		item?: ItemStack;
		logicCheck?: number;
		on?: boolean;
		items?: Array<ItemStack | null>;
		dyes?: Array<ItemStack | null>;
		misc?: Array<ItemStack | null>;
		pose?: number;
	}

	// ── Map overlays ───────────────────────────────────────────────────

	interface MarkOptions {
		/** Shown in the pointer's tooltip. */
		label?: string;
		/** Item id or English item name used as the pointer icon (default: chest). */
		icon?: number | string;
		/** NPC type id: uses that NPC's map head as the icon. */
		npc?: number;
		/** Pointer border colour (CSS colour). */
		color?: string;
	}

	interface MapApi {
		/**
		 * Replaces the highlight layer with every tile matching `pred`.
		 * Returns the number of highlighted tiles.
		 */
		highlight(pred: TilePredicate, color?: string, label?: string, region?: Region): number;
		/** Adds one Mask Display pointer. At most 5000 pointers per run. */
		mark(x: number, y: number, options?: MarkOptions): void;
		/** Adds many pointers; `defaults` apply to points that omit a field. Returns how many were added. */
		markAll(points: Iterable<{ x: number; y: number } & MarkOptions>, defaults?: MarkOptions): number;
		clearMarks(): void;
		clearHighlight(): void;
	}

	// ── UI ─────────────────────────────────────────────────────────────

	interface StatOptions {
		unit?: string;
		/** Formats as a percentage (2 decimals, "%" unit) with a bar. */
		percent?: boolean;
		color?: string;
		/** Decimal places for numbers. */
		digits?: number;
	}

	interface TableOptions {
		/** Column order; default = every key found in the rows. */
		columns?: string[];
		title?: string;
		/** Adds a "go to" button per row. Default: true when the rows have `x` and `y`. */
		goto?: boolean;
	}

	interface ChartSpec {
		type?: "bar" | "pie" | "line";
		labels: string[];
		values: number[];
		title?: string;
	}

	/** Where output goes: the Script panel, a modal, or a section of either. */
	interface Surface {
		log(...args: unknown[]): void;
		warn(...args: unknown[]): void;
		error(...args: unknown[]): void;
		stat(label: string, value: number | string, options?: StatOptions): void;
		table(rows: readonly Record<string, unknown>[], options?: TableOptions): void;
		chart(spec: ChartSpec): void;
		list(items: readonly unknown[], title?: string): void;
		/** The callback runs later, when clicked; the script stays alive for up to 10 minutes. */
		button(label: string, onClick: () => unknown): void;
		/** A titled group; output written to it appears under the heading. */
		section(title: string): Surface;
		clear(): void;
	}

	type ModalSize = "sm" | "md" | "lg" | "xl" | "fullscreen";

	interface Modal extends Surface {
		setTitle(title: string): void;
		close(): void;
		/** Resolves when the user closes the modal. */
		readonly closed: Promise<void>;
	}

	type FormField =
		| { type: "number"; label: string; default?: number; min?: number; max?: number; step?: number; optional?: boolean }
		| { type: "text"; label: string; default?: string; optional?: boolean }
		| { type: "select"; label: string; options: readonly string[]; default?: string }
		| { type: "checkbox"; label: string; default?: boolean }
		/** Shared block/wall picker. Default: id or English name. Always resolves to an id. */
		| { type: "tile" | "wall"; label: string; default?: number | string }
		/** Item search. Resolves to an item id, or null when optional and left empty. */
		| { type: "item"; label: string; default?: number | string; optional?: boolean }
		/**
		 * A "Pick region" button: the form hides while the user drags a rectangle on the map
		 * (same as `tw.ui.pickRegion`). Resolves to the region, or null when optional and not picked.
		 */
		| { type: "region"; label: string; default?: Region; optional?: boolean }
		/**
		 * A file chooser (max 16 MB). The file is read in the browser, never uploaded.
		 * `accept` filters the dialog, e.g. `".ttf,.otf"`. Resolves to a `FileValue`, or null
		 * when optional and left empty.
		 */
		| { type: "file"; label: string; accept?: string; optional?: boolean };

	/** The file picked in a `{ type: "file" }` field. */
	interface FileValue {
		name: string;
		/** Size in bytes. */
		size: number;
		bytes: Uint8Array;
	}

	interface Form<F extends Record<string, FormField> = Record<string, FormField>> {
		title?: string;
		description?: string;
		submitLabel?: string;
		fields: F;
	}

	/** The value a field resolves to. */
	type FieldValue<T extends FormField> =
		T extends { type: "number"; optional: true } ? number | null
		: T extends { type: "number" } ? number
		: T extends { type: "text" } ? string
		: T extends { type: "select"; options: readonly (infer O)[] } ? O
		: T extends { type: "checkbox" } ? boolean
		: T extends { type: "tile" | "wall" } ? number
		: T extends { type: "item" } ? number | null
		: T extends { type: "region"; optional: true } ? Region | null
		: T extends { type: "region" } ? Region
		: T extends { type: "file"; optional: true } ? FileValue | null
		: T extends { type: "file" } ? FileValue
		: never;

	type FormValues<F extends Record<string, FormField>> = { [K in keyof F]: FieldValue<F[K]> };

	interface Ui extends Surface {
		/** Same as `tw.map.highlight`. */
		highlight: MapApi["highlight"];
		/** Shows a progress bar under the Run button (`fraction` 0–1). */
		progress(fraction: number, message?: string): void;
		/** Opens a modal for larger output. Waiting for user input does not count toward the time limit. */
		modal(options: { title: string; size?: ModalSize }): Modal;
		/** Asks for input with a form. Resolves to the values, or null if cancelled. */
		prompt<const F extends Record<string, FormField>>(form: Form<F>): Promise<FormValues<F> | null>;
		/**
		 * Hides open script modals (they keep their state) and asks the user to drag a
		 * rectangle on the map; a bar shows `title` with Confirm / Cancel (Esc cancels).
		 * Resolves to the region clipped to the world, or null if cancelled.
		 * Picking time does not count toward the time limit.
		 * @example
		 * const region = await tw.ui.pickRegion({ title: "Area to scan" });
		 * if (!region) return;
		 * tw.ui.stat("Ore blocks", tw.tiles.count((t) => t.active && t.type === tw.ids.tile("Gold Ore"), region));
		 */
		pickRegion(options?: { title?: string }): Promise<Region | null>;
		/**
		 * Like `pickRegion`, but the user clicks / taps a single tile.
		 * Resolves to its coordinates, or null if cancelled.
		 */
		pickTile(options?: { title?: string }): Promise<{ x: number; y: number } | null>;
	}

	interface Api {
		/** API version, e.g. "1.3.0". */
		readonly version: string;
		readonly world: World;
		readonly tiles: Tiles;
		readonly ids: Ids;
		readonly regions: Regions;
		readonly map: MapApi;
		readonly ui: Ui;
		/** Draft → preview → user approval → one undo step. See `TerraWorld.Edit`. */
		readonly edit: Edit;
		/** Vector shapes (paths, text, booleans) to draw with `tw.edit.drawShape`. See `TerraWorld.ShapeApi`. */
		readonly shape: ShapeApi;
		readonly entitiesLoaded: boolean;
		readonly chests: readonly Chest[];
		readonly npcs: readonly Npc[];
		readonly signs: readonly Sign[];
		readonly tileEntities: readonly TileEntity[];
	}
}

/**
 * The TerraWorld API. Read access to the open world, output to the Script panel, modals
 * and map overlays, and `tw.edit` for changes the user previews and approves. No network,
 * storage or DOM; a run stops after 30 s of work (time spent waiting for the user is not
 * counted).
 */
declare const tw: TerraWorld.Api;
