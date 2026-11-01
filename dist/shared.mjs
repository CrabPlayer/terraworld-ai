#!/usr/bin/env node

// scripts/package/index.ts
import { readFile } from "node:fs/promises";

// src/lib/staticData/itemStaticData.ts
function convertTEditItemsToArray(tEditItems) {
  const items = [];
  for (const item of tEditItems) {
    const { id, name, tally } = item;
    if (id === void 0 || id === null || !name) continue;
    items[id] = { id, name, ...typeof tally === "number" ? { tally } : {} };
  }
  return items;
}

// scripts/package/app-paths.ts
var base = "";

// src/lib/staticData/jsonResource.ts
var jsonRequests = /* @__PURE__ */ new Map();
function resolveResourceUrl(path) {
  if (/^(?:[a-z]+:)?\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
function loadJsonResource(path) {
  const url = resolveResourceUrl(path);
  const cached = jsonRequests.get(url);
  if (cached) return cached;
  const request = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }).catch((error) => {
    jsonRequests.delete(url);
    throw error;
  });
  jsonRequests.set(url, request);
  return request;
}

// src/lib/staticData/terramapStaticData.ts
function normalizeStaticData(data) {
  return {
    tiles: data.tiles ?? [],
    walls: data.walls ?? [],
    items: data.items ?? [],
    sets: data.sets ?? [],
    globals: data.globals ?? {}
  };
}
function parseIntAttr(node, name, fallback = -1) {
  const value = node.getAttribute(name);
  if (value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
function parseFloatAttr(node, name, fallback = 0) {
  const value = node.getAttribute(name);
  if (value === null || value === "") return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}
function parseBoolAttr(node, name) {
  return node.hasAttribute(name);
}
function collectVariantNodes(node, variants, parent) {
  const variant = {
    name: node.getAttribute("name") ?? parent?.name ?? "",
    variety: node.getAttribute("variety") ?? parent?.variety,
    color: node.getAttribute("color") ?? parent?.color,
    u: parseIntAttr(node, "u", parent?.u ?? -1),
    v: parseIntAttr(node, "v", parent?.v ?? -1),
    minU: parseIntAttr(node, "minu", parent?.minU ?? -1),
    maxU: parseIntAttr(node, "maxu", parent?.maxU ?? -1),
    minV: parseIntAttr(node, "minv", parent?.minV ?? -1),
    maxV: parseIntAttr(node, "maxv", parent?.maxV ?? -1),
    light: parseFloatAttr(node, "light", parent?.light ?? 0),
    lightR: parseFloatAttr(node, "lightr", parent?.lightR ?? 0),
    lightG: parseFloatAttr(node, "lightg", parent?.lightG ?? 0),
    lightB: parseFloatAttr(node, "lightb", parent?.lightB ?? 0)
  };
  variants.push(variant);
  const children = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === "var");
  for (const child of children) {
    collectVariantNodes(child, variants, variant);
  }
}
function parseTiles(doc) {
  const tiles = [];
  const tileNodes = Array.from(doc.getElementsByTagName("tile"));
  for (const node of tileNodes) {
    const id = parseIntAttr(node, "num", -1);
    const name = node.getAttribute("name") ?? "";
    if (id < 0 || !name) continue;
    const variants = [];
    const varNodes = Array.from(node.children).filter((child) => child.tagName.toLowerCase() === "var");
    for (const varNode of varNodes) {
      collectVariantNodes(varNode, variants, null);
    }
    const tileInfo = {
      id,
      name,
      key: node.getAttribute("key") ?? void 0,
      color: node.getAttribute("color") ?? void 0,
      hasExtra: parseBoolAttr(node, "hasExtra"),
      letLight: parseBoolAttr(node, "letLight"),
      solid: parseBoolAttr(node, "solid"),
      isStone: parseBoolAttr(node, "isStone"),
      isGrass: parseBoolAttr(node, "isGrass"),
      isPlatform: parseBoolAttr(node, "isPlatform"),
      merge: parseBoolAttr(node, "merge"),
      blend: parseIntAttr(node, "blend", -1),
      light: parseFloatAttr(node, "light", 0),
      lightR: parseFloatAttr(node, "lightr", 0),
      lightG: parseFloatAttr(node, "lightg", 0),
      lightB: parseFloatAttr(node, "lightb", 0),
      variants
    };
    tiles[id] = tileInfo;
  }
  return tiles;
}
function parseWalls(doc) {
  const walls = [];
  const wallNodes = Array.from(doc.getElementsByTagName("wall"));
  for (const node of wallNodes) {
    const id = parseIntAttr(node, "num", -1);
    const name = node.getAttribute("name") ?? "";
    if (id < 0 || !name) continue;
    const wallInfo = {
      id,
      name,
      key: node.getAttribute("key") ?? void 0,
      color: node.getAttribute("color") ?? void 0,
      blend: parseIntAttr(node, "blend", id)
    };
    walls[id] = wallInfo;
  }
  return walls;
}
function parseItems(doc) {
  const items = [];
  const itemNodes = Array.from(doc.getElementsByTagName("item"));
  for (const node of itemNodes) {
    const id = parseIntAttr(node, "num", -1);
    const name = node.getAttribute("name") ?? "";
    if (id < 0 || !name) continue;
    items[id] = { id, name };
  }
  return items;
}
function parseGlobals(doc) {
  const globals = {};
  const nodes = Array.from(doc.getElementsByTagName("global"));
  for (const node of nodes) {
    const id = node.getAttribute("id") ?? "";
    const color = node.getAttribute("color") ?? "";
    if (!id || !color) continue;
    if (id === "sky") globals.sky = color;
    if (id === "earth") globals.earth = color;
    if (id === "rock") globals.rock = color;
    if (id === "hell") globals.hell = color;
    if (id === "water") globals.water = color;
    if (id === "lava") globals.lava = color;
    if (id === "honey") globals.honey = color;
    if (id === "shimmer") globals.shimmer = color;
  }
  return globals;
}
function parseSets(doc) {
  const sets = [];
  const setNodes = Array.from(doc.getElementsByTagName("set"));
  for (const node of setNodes) {
    const name = node.getAttribute("name") ?? "";
    if (!name) continue;
    const tiles = [];
    const walls = [];
    const items = [];
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "tile") {
        const id = parseIntAttr(child, "num", -1);
        const entryName = child.getAttribute("name") ?? void 0;
        tiles.push({ id: id >= 0 ? id : void 0, name: entryName });
      }
      if (tag === "wall") {
        const id = parseIntAttr(child, "num", -1);
        const entryName = child.getAttribute("name") ?? void 0;
        walls.push({ id: id >= 0 ? id : void 0, name: entryName });
      }
      if (tag === "item") {
        const id = parseIntAttr(child, "num", -1);
        const entryName = child.getAttribute("name") ?? void 0;
        items.push({ id: id >= 0 ? id : void 0, name: entryName });
      }
    }
    sets.push({ name, tiles, walls, items });
  }
  return sets;
}
function convertTEditTilesToTerraMapFormat(tEditTiles) {
  const tiles = [];
  for (const tEditTile of tEditTiles) {
    const id = tEditTile.id;
    const name = tEditTile.name;
    if (id === void 0 || !name) continue;
    const variants = [];
    if (tEditTile.frames && Array.isArray(tEditTile.frames)) {
      const frameSize = tEditTile.frameSize ?? [[1, 1]];
      const frameWidth = frameSize[0]?.[0] ?? 1;
      const frameHeight = frameSize[0]?.[1] ?? 1;
      for (const frame of tEditTile.frames) {
        const [u, v] = frame.uv ?? [0, 0];
        const variant = {
          name: frame.name ?? name,
          variety: frame.variety,
          color: frame.color ?? tEditTile.color,
          u,
          v,
          minU: u,
          maxU: u + (frameWidth - 1) * 18,
          // tile frame coordinates are 18 apart
          minV: v,
          maxV: v + (frameHeight - 1) * 18,
          light: 0,
          lightR: 0,
          lightG: 0,
          lightB: 0,
          size: Array.isArray(frame.size) ? [Number(frame.size[0]) || frameWidth, Number(frame.size[1]) || frameHeight] : [frameWidth, frameHeight],
          anchor: typeof frame.anchor === "string" ? frame.anchor : void 0
        };
        variants.push(variant);
      }
    } else {
      const variant = {
        name,
        color: tEditTile.color,
        u: -1,
        v: -1,
        minU: -1,
        maxU: -1,
        minV: -1,
        maxV: -1,
        light: 0,
        lightR: 0,
        lightG: 0,
        lightB: 0
      };
      variants.push(variant);
    }
    const tileInfo = {
      id,
      name,
      key: typeof tEditTile.key === "string" ? tEditTile.key : void 0,
      color: tEditTile.color,
      hasExtra: tEditTile.isFramed === true,
      canBlend: tEditTile.canBlend === true,
      mergeWith: typeof tEditTile.mergeWith === "number" ? tEditTile.mergeWith : null,
      largeFrameType: Number.isInteger(tEditTile.largeFrameType) ? Number(tEditTile.largeFrameType) : 0,
      letLight: false,
      solid: tEditTile.isSolid ?? false,
      isStone: tEditTile.isStone ?? false,
      isGrass: tEditTile.isGrass ?? false,
      isPlatform: tEditTile.isPlatform === true,
      merge: tEditTile.canBlend === true,
      blend: typeof tEditTile.mergeWith === "number" ? tEditTile.mergeWith : -1,
      light: 0,
      lightR: 0,
      lightG: 0,
      lightB: 0,
      variants,
      frameSize: Array.isArray(tEditTile.frameSize) ? tEditTile.frameSize.map((size) => [Number(size?.[0]) || 1, Number(size?.[1]) || 1]) : [[1, 1]],
      textureGrid: Array.isArray(tEditTile.textureGrid) ? [Number(tEditTile.textureGrid[0]) || 16, Number(tEditTile.textureGrid[1]) || 16] : [16, 16],
      frameGap: Array.isArray(tEditTile.frameGap) ? [Number(tEditTile.frameGap[0]) || 2, Number(tEditTile.frameGap[1]) || 2] : [2, 2],
      frameColumnStep: Number.isInteger(tEditTile.frameColumnStep) && tEditTile.frameColumnStep > 0 ? tEditTile.frameColumnStep : void 0,
      frameRowOffsets: Array.isArray(tEditTile.frameRowOffsets) && tEditTile.frameRowOffsets[0] === 0 && tEditTile.frameRowOffsets.every((value, index, values) => typeof value === "number" && Number.isInteger(value) && value >= 0 && (index === 0 || value > values[index - 1])) ? [...tEditTile.frameRowOffsets] : void 0,
      textureWrap: tEditTile.textureWrap && (tEditTile.textureWrap.axis === "U" || tEditTile.textureWrap.axis === "V") && Number(tEditTile.textureWrap.wrapThreshold) > 0 ? {
        axis: tEditTile.textureWrap.axis,
        offsetIncrement: Number(tEditTile.textureWrap.offsetIncrement) || 0,
        wrapThreshold: Number(tEditTile.textureWrap.wrapThreshold),
        conditionalV: Number.isFinite(Number(tEditTile.textureWrap.conditionalV)) ? Number(tEditTile.textureWrap.conditionalV) : void 0
      } : void 0
    };
    tiles[id] = tileInfo;
  }
  return tiles;
}
function convertTEditWallsToTerraMapFormat(tEditWalls) {
  const walls = [];
  for (const wall of tEditWalls) {
    const { id, name, key, color, blendType = 0, largeFrameType = 0 } = wall;
    if (id === void 0 || id === null) continue;
    const wallInfo = {
      id,
      name,
      key,
      color,
      blend: blendType,
      largeFrameType
    };
    walls[id] = wallInfo;
  }
  return walls;
}
async function loadTerraMapStaticData(tilesUrl = "/terramap/tiles-world.json", setsUrl = "/terramap/sets.json", wallsUrl = "/terramap/walls-world.json", itemsUrl = "/terramap/items.json") {
  const [tilesData, setsJson, wallsData, itemsData] = await Promise.all([
    loadJsonResource(tilesUrl).catch(() => null),
    loadJsonResource(setsUrl).catch(() => null),
    loadJsonResource(wallsUrl).catch(() => null),
    loadJsonResource(itemsUrl).catch(() => null)
  ]);
  if (tilesData && setsJson) {
    let tiles = [];
    let walls = [];
    let items = [];
    let globals = {};
    if (Array.isArray(tilesData)) {
      tiles = convertTEditTilesToTerraMapFormat(tilesData);
      if (wallsData) {
        walls = convertTEditWallsToTerraMapFormat(wallsData);
      }
      if (itemsData) {
        items = convertTEditItemsToArray(itemsData);
      }
    } else {
      tiles = tilesData.tiles ?? [];
      walls = tilesData.walls ?? [];
      items = tilesData.items ?? [];
      globals = tilesData.globals ?? {};
    }
    return normalizeStaticData({
      tiles,
      walls,
      items,
      sets: setsJson.sets ?? [],
      globals
    });
  }
  const [tilesXmlResponse, setsXmlResponse] = await Promise.all([
    fetch(resolveResourceUrl("/terramap/tiles.xml")),
    fetch(resolveResourceUrl("/terramap/sets-default.xml"))
  ]);
  if (!tilesXmlResponse.ok) {
    throw new Error(`Failed to load tiles XML: ${tilesXmlResponse.statusText}`);
  }
  if (!setsXmlResponse.ok) {
    throw new Error(`Failed to load sets XML: ${setsXmlResponse.statusText}`);
  }
  const tilesText = await tilesXmlResponse.text();
  const setsText = await setsXmlResponse.text();
  const parser = new DOMParser();
  const tilesDoc = parser.parseFromString(tilesText, "text/xml");
  const setsDoc = parser.parseFromString(setsText, "text/xml");
  return {
    tiles: parseTiles(tilesDoc),
    walls: parseWalls(tilesDoc),
    items: parseItems(tilesDoc),
    sets: parseSets(setsDoc),
    globals: parseGlobals(tilesDoc)
  };
}

// src/lib/tmod/tmodPayloadJson.ts
function encodeTmodPayloadJson(payload) {
  const encoded = JSON.parse(JSON.stringify(payload, (_key, value) => typeof value === "bigint" ? value.toString() : Object.is(value, -0) ? "-0" : value));
  decodeTmodPayloadJson(encoded);
  return encoded;
}
function decodeTmodPayloadJson(input) {
  let remaining = 1e5;
  const invalid = () => {
    throw new Error("Invalid exact TagIO payload.");
  };
  const record = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
    return value;
  };
  const compound = (value, depth) => {
    if (depth > 64) return invalid();
    return Object.fromEntries(Object.entries(record(value)).map(([key, child]) => [key, tag(child, depth + 1)]));
  };
  const tag = (value, depth) => {
    if (--remaining < 0 || depth > 64) return invalid();
    const node = record(value);
    const type = node.type;
    const allowed = /* @__PURE__ */ new Set(["type", "value", ...type === "compound" ? ["semantic"] : type === "list" ? ["elementType"] : []]);
    if (Object.keys(node).some((key) => !allowed.has(key))) return invalid();
    switch (type) {
      case "byte":
      case "short":
      case "int": {
        const limits = type === "byte" ? [0, 255] : type === "short" ? [-32768, 32767] : [-2147483648, 2147483647];
        if (typeof node.value !== "number" || !Number.isInteger(node.value) || node.value < limits[0] || node.value > limits[1]) return invalid();
        return { type, value: node.value };
      }
      case "long": {
        if (typeof node.value !== "string" || !/^-?(0|[1-9]\d{0,18})$/.test(node.value)) return invalid();
        const number = BigInt(node.value);
        if (number < -9223372036854775808n || number > 9223372036854775807n) return invalid();
        return { type, value: number };
      }
      case "float":
      case "double": {
        const number = node.value === "-0" ? -0 : node.value;
        if (typeof number !== "number" || !Number.isFinite(number) || type === "float" && !Number.isFinite(Math.fround(number))) return invalid();
        return { type, value: number };
      }
      case "string":
        if (typeof node.value !== "string") return invalid();
        return { type, value: node.value };
      case "compound":
        if (node.semantic !== void 0 && node.semantic !== "item") return invalid();
        return { type, value: compound(node.value, depth), ...node.semantic === "item" ? { semantic: "item" } : {} };
      case "list":
        if (node.elementType !== "compound" || !Array.isArray(node.value) || node.value.length > remaining) return invalid();
        remaining -= node.value.length;
        return { type, elementType: "compound", value: node.value.map((entry) => compound(entry, depth)) };
      default:
        return invalid();
    }
  };
  return compound(input, 0);
}

// src/lib/data-pack/archive/zipStore.ts
var encoder = new TextEncoder();
var decoder = new TextDecoder();
function createStoreZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const local = new Uint8Array(30 + name.length + entry.data.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 67324752, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 2048, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, entry.data.length, true);
    view.setUint32(22, entry.data.length, true);
    view.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(entry.data, 30 + name.length);
    locals.push(local);
    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 33639248, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 2048, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length;
  }
  const centralOffset = offset;
  const centralSize = centrals.reduce((sum, entry) => sum + entry.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 101010256, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  return concat([...locals, ...centrals, end]);
}
function readStoreZip(data, maxBytes = 64 * 1024 * 1024) {
  if (data.length > maxBytes) throw new Error("Package is too large.");
  const files = /* @__PURE__ */ new Map();
  let offset = 0;
  while (offset + 4 <= data.length && readU32(data, offset) === 67324752) {
    if (offset + 30 > data.length) throw new Error("Truncated ZIP header.");
    const method = readU16(data, offset + 8);
    const compressedSize = readU32(data, offset + 18);
    const size = readU32(data, offset + 22);
    const nameLength = readU16(data, offset + 26);
    const extraLength = readU16(data, offset + 28);
    if (method !== 0 || compressedSize !== size) throw new Error("Unsupported compressed ZIP entry.");
    const nameStart = offset + 30;
    const contentStart = nameStart + nameLength + extraLength;
    const contentEnd = contentStart + size;
    if (contentEnd > data.length) throw new Error("Truncated ZIP entry.");
    const name = decoder.decode(data.subarray(nameStart, nameStart + nameLength));
    if (!name || name.includes("..") || name.startsWith("/") || name.startsWith("\\")) {
      throw new Error("Unsafe package path.");
    }
    const content = data.slice(contentStart, contentEnd);
    if (crc32(content) !== readU32(data, offset + 14)) throw new Error("Package checksum failed.");
    files.set(name, content);
    offset = contentEnd;
  }
  return files;
}
function readU16(data, offset) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint16(offset, true);
}
function readU32(data, offset) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset, true);
}
function concat(parts) {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
function crc32(data) {
  let crc = 4294967295;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ 3988292384 & -(crc & 1);
  }
  return (crc ^ 4294967295) >>> 0;
}

// src/lib/data-pack/structure/structureValidator.ts
var CONTAINER_WIDTH = /* @__PURE__ */ new Map([
  [21, 2],
  [88, 3],
  [441, 2],
  [467, 2],
  [468, 2]
]);
function validateStructureClipboard(clipboard) {
  const issues = [];
  const cells = new Map(clipboard.tiles.map((cell) => [`${cell.relX},${cell.relY}`, cell]));
  for (const entry of clipboard.chests ?? []) {
    const anchor = cells.get(`${entry.relX},${entry.relY}`);
    const width = anchor?.data.active ? CONTAINER_WIDTH.get(anchor.data.type) : void 0;
    let complete = width !== void 0;
    if (width !== void 0) {
      for (let dx = 0; dx < width && complete; dx++) {
        for (let dy = 0; dy < 2; dy++) {
          const cell = cells.get(`${entry.relX + dx},${entry.relY + dy}`);
          if (!cell?.data.active || cell.data.type !== anchor.data.type) {
            complete = false;
            break;
          }
        }
      }
    }
    if (!complete) {
      issues.push({
        severity: "error",
        code: "incomplete-container",
        message: `Chest at (${entry.relX}, ${entry.relY}) is missing part of its container tiles.`
      });
    }
  }
  const tileEntityCount = clipboard.validationHints?.unsupportedTileEntities ?? 0;
  if (tileEntityCount > 0) {
    issues.push({
      severity: "error",
      code: "unsupported-tile-entity",
      message: `${tileEntityCount} tile entity record(s) are not supported by structure packages yet.`
    });
  }
  const pressurePlateCount = clipboard.validationHints?.unsupportedPressurePlates ?? 0;
  if (pressurePlateCount > 0) {
    issues.push({
      severity: "warning",
      code: "unsupported-pressure-plate",
      message: `${pressurePlateCount} pressure plate record(s) will not be transferred.`
    });
  }
  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    lossless: issues.length === 0,
    issues
  };
}

// src/lib/editor/pastePlacement.ts
var defaultPastePlacement = {
  anchor: "top-left",
  collision: "replace"
};

// src/lib/data-pack/structure/structureDraft.ts
var defaultStructureFilters = {
  tiles: true,
  walls: true,
  liquids: true,
  entities: true,
  wires: true,
  coatings: true
};
function createStructureDraft(clipboard, options = {}) {
  const now = options.now ?? Date.now();
  const snapshot = cloneClipboardData(clipboard);
  return {
    source: options.source ?? "selection",
    packageId: options.packageId,
    name: options.name?.trim() || `Structure ${snapshot.width}\xD7${snapshot.height}`,
    description: options.description ?? "",
    clipboard: snapshot,
    filters: { ...defaultStructureFilters, ...options.filters },
    stats: getStructureDraftStats(snapshot),
    validation: validateStructureClipboard(snapshot),
    placement: { ...defaultPastePlacement, ...options.placement },
    createdAt: now,
    updatedAt: now,
    dirty: false
  };
}
function updateStructureDraftFilters(draft, filters, now = Date.now()) {
  return {
    ...draft,
    filters: { ...filters },
    updatedAt: now,
    dirty: true
  };
}
function getStructureDraftStats(clipboard) {
  return {
    cellCount: clipboard.tiles.length,
    chestCount: clipboard.chests?.length ?? 0,
    signCount: clipboard.signs?.length ?? 0,
    tileEntityCount: (clipboard.tileEntities?.length ?? 0) + (clipboard.modTileEntities?.length ?? 0),
    modChestCount: clipboard.modChests?.length ?? 0
  };
}
function cloneClipboardData(clipboard) {
  return {
    ...clipboard,
    tiles: clipboard.tiles.map((tile) => ({
      ...tile,
      data: {
        ...tile.data,
        ...tile.data.modContent ? { modContent: { ...tile.data.modContent } } : {},
        ...tile.data.modWallContent ? { modWallContent: { ...tile.data.modWallContent } } : {}
      }
    })),
    chests: clipboard.chests?.map((entry) => ({
      ...entry,
      chest: {
        ...entry.chest,
        items: entry.chest.items.map((item) => ({ ...item }))
      }
    })),
    signs: clipboard.signs?.map((entry) => ({
      ...entry,
      sign: { ...entry.sign }
    })),
    tileEntities: clipboard.tileEntities?.map((entry) => ({
      ...entry,
      entity: structuredClone(entry.entity)
    })),
    modChests: clipboard.modChests?.map((entry) => ({
      ...entry,
      items: entry.items.map((item) => ({ ...item }))
    })),
    modTileEntities: clipboard.modTileEntities?.map((entry) => ({
      ...entry,
      payload: structuredClone(entry.payload)
    }))
  };
}

// src/lib/data-pack/structure/tileBinaryCodec.ts
var HEADER_SIZE = 12;
var RECORD_SIZE = 28;
var VERSION = 1;
var MAGIC = [84, 87, 83, 84];
function encodeStructureTiles(tiles) {
  const output = new Uint8Array(HEADER_SIZE + tiles.length * RECORD_SIZE);
  output.set(MAGIC, 0);
  const view = new DataView(output.buffer);
  view.setUint16(4, VERSION, true);
  view.setUint16(6, RECORD_SIZE, true);
  view.setUint32(8, tiles.length, true);
  let offset = HEADER_SIZE;
  for (const tile of tiles) {
    const data = tile.data;
    view.setUint32(offset, tile.relX, true);
    view.setUint32(offset + 4, tile.relY, true);
    view.setUint16(offset + 8, data.type, true);
    view.setUint16(offset + 10, data.wall ?? 0, true);
    view.setInt16(offset + 12, data.u ?? -1, true);
    view.setInt16(offset + 14, data.v ?? -1, true);
    view.setUint8(offset + 16, data.liquidAmount ?? 0);
    view.setUint8(offset + 17, data.liquidType ?? 0);
    view.setUint8(offset + 18, data.wires ?? 0);
    view.setUint8(offset + 19, data.tileColor ?? 0);
    view.setUint8(offset + 20, data.wallColor ?? 0);
    view.setUint8(offset + 21, data.brickStyle ?? 0);
    let flags = data.active ? 1 : 0;
    if (data.actuator) flags |= 1 << 1;
    if (data.inActive) flags |= 1 << 2;
    if (data.invisibleBlock) flags |= 1 << 3;
    if (data.invisibleWall) flags |= 1 << 4;
    if (data.fullBrightBlock) flags |= 1 << 5;
    if (data.fullBrightWall) flags |= 1 << 6;
    view.setUint16(offset + 22, flags, true);
    offset += RECORD_SIZE;
  }
  return output;
}
function decodeStructureTiles(input, maxCells) {
  if (input.length < HEADER_SIZE || MAGIC.some((byte, index) => input[index] !== byte)) {
    throw new Error("Invalid tile binary payload.");
  }
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const version = view.getUint16(4, true);
  const recordSize = view.getUint16(6, true);
  const count = view.getUint32(8, true);
  if (version !== VERSION || recordSize !== RECORD_SIZE || count > maxCells) {
    throw new Error("Unsupported tile binary payload.");
  }
  if (HEADER_SIZE + count * recordSize !== input.length) throw new Error("Truncated tile binary payload.");
  const tiles = [];
  for (let index = 0, offset = HEADER_SIZE; index < count; index++, offset += recordSize) {
    const flags = view.getUint16(offset + 22, true);
    tiles.push({
      relX: view.getUint32(offset, true),
      relY: view.getUint32(offset + 4, true),
      data: {
        type: view.getUint16(offset + 8, true),
        wall: view.getUint16(offset + 10, true),
        u: view.getInt16(offset + 12, true),
        v: view.getInt16(offset + 14, true),
        liquidAmount: view.getUint8(offset + 16),
        liquidType: view.getUint8(offset + 17),
        wires: view.getUint8(offset + 18),
        tileColor: view.getUint8(offset + 19),
        wallColor: view.getUint8(offset + 20),
        brickStyle: view.getUint8(offset + 21),
        active: (flags & 1) !== 0,
        actuator: (flags & 1 << 1) !== 0,
        inActive: (flags & 1 << 2) !== 0,
        invisibleBlock: (flags & 1 << 3) !== 0,
        invisibleWall: (flags & 1 << 4) !== 0,
        fullBrightBlock: (flags & 1 << 5) !== 0,
        fullBrightWall: (flags & 1 << 6) !== 0
      }
    });
  }
  return tiles;
}

// src/lib/data-pack/structure/structurePackage.ts
var encoder2 = new TextEncoder();
var decoder2 = new TextDecoder();
var FORMAT = "terraworld-data-package";
var SCHEMA_VERSION = 1;
var MAX_CELLS = 1e7;
function exportStructurePackage(draft) {
  if (!draft.validation.valid) {
    throw new Error("Structure contains unsupported or incomplete data.");
  }
  const manifest = {
    format: FORMAT,
    schemaVersion: SCHEMA_VERSION,
    kind: "structure",
    name: draft.name,
    createdAt: draft.createdAt,
    files: {
      structure: "structure.json",
      tiles: "payload/tiles.bin",
      entities: "payload/entities.json"
    }
  };
  const metadata = {
    name: draft.name,
    description: draft.description,
    width: draft.clipboard.width,
    height: draft.clipboard.height,
    filters: draft.filters,
    source: draft.source,
    placement: draft.placement
  };
  const entities = {
    chests: draft.clipboard.chests ?? [],
    signs: draft.clipboard.signs ?? [],
    tileEntities: draft.clipboard.tileEntities ?? [],
    modChests: draft.clipboard.modChests ?? [],
    modTileEntities: draft.clipboard.modTileEntities?.map((entry) => ({
      ...entry,
      payload: encodeTmodPayloadJson(entry.payload)
    })) ?? [],
    validationHints: draft.clipboard.validationHints,
    modWalls: draft.clipboard.tiles.flatMap((tile) => tile.data.modWallContent ? [{
      relX: tile.relX,
      relY: tile.relY,
      modContent: tile.data.modWallContent
    }] : []),
    modTiles: draft.clipboard.tiles.flatMap((tile) => tile.data.modContent ? [{
      relX: tile.relX,
      relY: tile.relY,
      modContent: tile.data.modContent
    }] : [])
  };
  return createStoreZip([
    jsonEntry("manifest.json", manifest),
    jsonEntry("structure.json", metadata),
    { name: "payload/tiles.bin", data: encodeStructureTiles(draft.clipboard.tiles) },
    jsonEntry("payload/entities.json", entities)
  ]);
}
function importStructurePackage(data, now = Date.now()) {
  const files = readStoreZip(data);
  const manifest = readJson(files, "manifest.json");
  if (manifest.format !== FORMAT || manifest.schemaVersion !== SCHEMA_VERSION || manifest.kind !== "structure") {
    throw new Error("Unsupported TerraWorld package.");
  }
  const metadata = readJson(files, manifest.files.structure);
  const tiles = manifest.files.tiles.endsWith(".bin") ? decodeStructureTiles(requireFile(files, manifest.files.tiles), MAX_CELLS) : readJson(files, manifest.files.tiles);
  const entities = readJson(files, manifest.files.entities);
  validateDimensions(metadata.width, metadata.height);
  if (!Array.isArray(tiles) || tiles.length > MAX_CELLS) throw new Error("Invalid tile payload.");
  for (const tile of tiles) validateCell(tile, metadata.width, metadata.height);
  const modTiles = /* @__PURE__ */ new Map();
  for (const entry of entities.modTiles ?? []) {
    if (!entry || !Number.isInteger(entry.relX) || !Number.isInteger(entry.relY)) {
      throw new Error("Invalid mod tile ownership payload.");
    }
    if (entry.relX < 0 || entry.relY < 0 || entry.relX >= metadata.width || entry.relY >= metadata.height || typeof entry.modContent?.modName !== "string" || !entry.modContent.modName || typeof entry.modContent?.contentName !== "string" || !entry.modContent.contentName || typeof entry.modContent?.frameImportant !== "boolean") throw new Error("Invalid mod tile ownership payload.");
    modTiles.set(`${entry.relX},${entry.relY}`, { ...entry.modContent });
  }
  const modWalls = /* @__PURE__ */ new Map();
  const cells = new Set(tiles.map((tile) => `${tile.relX},${tile.relY}`));
  for (const entry of entities.modWalls ?? []) {
    if (!entry || !Number.isInteger(entry.relX) || !Number.isInteger(entry.relY) || !cells.has(`${entry.relX},${entry.relY}`) || typeof entry.modContent?.modName !== "string" || !entry.modContent.modName || typeof entry.modContent?.contentName !== "string" || !entry.modContent.contentName || modWalls.has(`${entry.relX},${entry.relY}`)) throw new Error("Invalid mod wall ownership payload.");
    modWalls.set(`${entry.relX},${entry.relY}`, { ...entry.modContent });
  }
  for (const tile of tiles) {
    const modContent = modTiles.get(`${tile.relX},${tile.relY}`);
    if (modContent) tile.data.modContent = modContent;
    const modWallContent = modWalls.get(`${tile.relX},${tile.relY}`);
    if (modWallContent) tile.data.modWallContent = modWallContent;
  }
  const modEntityCells = /* @__PURE__ */ new Set();
  if (entities.modTileEntities !== void 0 && !Array.isArray(entities.modTileEntities)) {
    throw new Error("Invalid mod TileEntity payload.");
  }
  const modTileEntities = entities.modTileEntities?.map((entry) => {
    if (!entry || !Number.isInteger(entry.relX) || !Number.isInteger(entry.relY) || entry.relX < 0 || entry.relY < 0 || entry.relX >= metadata.width || entry.relY >= metadata.height || typeof entry.modName !== "string" || !entry.modName || typeof entry.contentName !== "string" || !entry.contentName || modEntityCells.has(`${entry.relX},${entry.relY}`)) throw new Error("Invalid mod TileEntity payload.");
    modEntityCells.add(`${entry.relX},${entry.relY}`);
    return { ...entry, payload: decodeTmodPayloadJson(entry.payload) };
  }) ?? [];
  const clipboard = {
    tiles,
    chests: entities.chests ?? [],
    signs: entities.signs ?? [],
    tileEntities: entities.tileEntities ?? [],
    modTileEntities,
    modChests: entities.modChests ?? [],
    validationHints: entities.validationHints,
    width: metadata.width,
    height: metadata.height,
    originX: 0,
    originY: 0,
    timestamp: now
  };
  let draft = createStructureDraft(clipboard, {
    source: "package",
    name: metadata.name,
    description: metadata.description,
    placement: metadata.placement,
    now
  });
  draft = updateStructureDraftFilters(draft, validateFilters(metadata.filters), now);
  return {
    ...draft,
    description: typeof metadata.description === "string" ? metadata.description : "",
    dirty: false
  };
}
function jsonEntry(name, value) {
  return { name, data: encoder2.encode(JSON.stringify(value)) };
}
function readJson(files, name) {
  const data = requireFile(files, name);
  try {
    return JSON.parse(decoder2.decode(data));
  } catch {
    throw new Error(`Invalid JSON file: ${name}`);
  }
}
function requireFile(files, name) {
  const data = files.get(name);
  if (!data) throw new Error(`Missing package file: ${name}`);
  return data;
}
function validateDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error("Invalid structure dimensions.");
  }
  if (width > 1e5 || height > 1e5 || width * height > MAX_CELLS) {
    throw new Error("Structure dimensions exceed the safety limit.");
  }
}
function validateCell(cell, width, height) {
  if (!cell || !Number.isInteger(cell.relX) || !Number.isInteger(cell.relY) || cell.relX < 0 || cell.relY < 0 || cell.relX >= width || cell.relY >= height || !cell.data || !Number.isInteger(cell.data.type)) {
    throw new Error("Invalid tile cell.");
  }
}
function validateFilters(filters) {
  return {
    tiles: filters?.tiles !== false,
    walls: filters?.walls !== false,
    liquids: filters?.liquids !== false,
    entities: filters?.entities !== false,
    wires: filters?.wires !== false,
    coatings: filters?.coatings !== false
  };
}

// src/lib/structure-spec/spec.ts
var SpecParseError = class extends Error {
};
function parseStructureSpec(source) {
  const text = source.replace(/^﻿/u, "").trim();
  const spec = text.startsWith("{") ? parseJson(text) : parseSpecText(text);
  if (!Number.isInteger(spec.width) || !Number.isInteger(spec.height) || spec.width <= 0 || spec.height <= 0) {
    throw new SpecParseError("Spec needs a positive integer width and height (JSON `width`/`height`, text `size W H`).");
  }
  if (!Array.isArray(spec.ops)) throw new SpecParseError("Spec needs an `ops` array.");
  return spec;
}
function parseJson(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new SpecParseError(`Invalid JSON: ${error.message}`);
  }
  if (!value || typeof value !== "object") throw new SpecParseError("Spec JSON must be an object.");
  const spec = value;
  if (Array.isArray(spec.size) && spec.width === void 0) [spec.width, spec.height] = spec.size;
  return spec;
}
function parseSpecText(text) {
  const spec = { width: 0, height: 0, legend: {}, ops: [] };
  for (const statement of splitStatements(text)) {
    const tokens = tokenize(statement);
    if (tokens.length === 0) continue;
    const keyword = tokens[0].toLocaleLowerCase();
    const rest = tokens.slice(1);
    if (keyword === "name" || keyword === "description") {
      spec[keyword] = rest.join(" ");
    } else if (keyword === "size") {
      const numbers = rest.flatMap((token) => token.replace(/^[wh]=/u, "").split(/x/iu)).map(Number);
      [spec.width, spec.height] = numbers;
    } else if (keyword === "legend") {
      for (const token of rest) {
        const separator = token.indexOf("=");
        if (separator !== 1) throw new SpecParseError(`Legend entries look like C=name, got "${token}".`);
        spec.legend[token[0]] = parseLegendValue(token.slice(2));
      }
    } else {
      const op = { op: keyword };
      for (const token of rest) {
        const separator = token.indexOf("=");
        if (separator <= 0) throw new SpecParseError(`Expected key=value in "${statement}", got "${token}".`);
        const key = token.slice(0, separator);
        op[key] = parseValue(key, token.slice(separator + 1));
      }
      if (keyword === "grid" && typeof op.rows === "string") op.rows = op.rows.split("/");
      spec.ops.push(op);
    }
  }
  return spec;
}
var TEXT_KEYS = /* @__PURE__ */ new Set(["text", "chestName"]);
function parseValue(key, raw) {
  if (TEXT_KEYS.has(key)) return raw.replace(/_/gu, " ");
  if (/^-?\d+$/u.test(raw)) return Number(raw);
  if (raw === "true" || raw === "false") return raw === "true";
  if (key === "items") return raw.split(",").filter(Boolean);
  return raw;
}
function parseLegendValue(raw) {
  const cell = {};
  for (const part of raw.split(",")) {
    const separator = part.indexOf(":");
    if (separator < 0) cell.tile = part;
    else cell[part.slice(0, separator)] = part.slice(separator + 1);
  }
  return cell;
}
function splitStatements(text) {
  const statements = [];
  let current = "";
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    if (!quoted && (char === "\n" || char === ";")) {
      statements.push(current);
      current = "";
    } else current += char;
  }
  statements.push(current);
  return statements.map((line) => line.trim()).filter((line) => line && !line.startsWith("//"));
}
function tokenize(statement) {
  const tokens = [];
  let current = "";
  let quoted = false;
  for (const char of statement) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && /\s/u.test(char)) {
      if (current) tokens.push(current);
      current = "";
    } else current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

// src/lib/editor/objects/objectCatalog.ts
var TOP_ANCHORED_NAME = /(chandelier|hanging|lantern|banner|stalactite)/i;
var DIRECTIONAL_FLOOR_OBJECT_IDS = /* @__PURE__ */ new Set([15]);
function normalizeAnchor(value) {
  switch (value?.toLocaleLowerCase()) {
    case "top":
      return "top";
    case "bottom":
      return "bottom";
    case "left":
      return "left";
    case "right":
      return "right";
    case "none":
      return "none";
    default:
      return null;
  }
}
function inferAnchor(tile, variant) {
  if (TOP_ANCHORED_NAME.test(`${tile.name} ${variant.name}`)) return "top";
  return "bottom";
}
function directionFromVariety(variety) {
  const normalized = variety?.toLocaleLowerCase() ?? "";
  if (normalized.includes("left")) return "left";
  if (normalized.includes("right")) return "right";
  return "none";
}
function resolvePlacementAnchor(tile, variant, explicitAnchor) {
  if (DIRECTIONAL_FLOOR_OBJECT_IDS.has(tile.id)) return "bottom";
  return explicitAnchor ?? inferAnchor(tile, variant);
}
function resolveDirection(tile, variant, explicitAnchor) {
  const fromVariety = directionFromVariety(variant.variety);
  if (fromVariety !== "none") return fromVariety;
  if (DIRECTIONAL_FLOOR_OBJECT_IDS.has(tile.id) && (explicitAnchor === "left" || explicitAnchor === "right")) return explicitAnchor;
  return "none";
}
function fallbackSize(tile) {
  return tile.frameSize?.[0] ?? [1, 1];
}
function createStyle(tile, variant, styleIndex) {
  const [width, height] = variant.size ?? fallbackSize(tile);
  const explicitAnchor = normalizeAnchor(variant.anchor);
  return {
    id: `${tile.id}:${variant.u}:${variant.v}:${styleIndex}`,
    tileId: tile.id,
    styleIndex,
    name: variant.name || tile.name,
    variety: variant.variety,
    frameU: Math.max(0, variant.u),
    frameV: Math.max(0, variant.v),
    ...tile.frameColumnStep !== void 0 ? { frameColumnStep: tile.frameColumnStep } : {},
    ...tile.frameRowOffsets?.length === height ? { frameRowOffsets: [...tile.frameRowOffsets] } : {},
    width: Math.max(1, width),
    height: Math.max(1, height),
    // World entity coordinates and TEdit frame detection use top-left.
    originX: 0,
    originY: 0,
    anchor: resolvePlacementAnchor(tile, variant, explicitAnchor),
    direction: resolveDirection(tile, variant, explicitAnchor),
    metadataSource: explicitAnchor && !DIRECTIONAL_FLOOR_OBJECT_IDS.has(tile.id) ? "explicit" : "inferred"
  };
}
function buildObjectCatalog(staticData) {
  const catalog = /* @__PURE__ */ new Map();
  for (const tile of staticData.tiles) {
    if (!tile?.hasExtra) continue;
    const variants = tile.variants.length > 0 ? tile.variants : [{
      name: tile.name,
      u: 0,
      v: 0,
      minU: 0,
      maxU: 0,
      minV: 0,
      maxV: 0,
      light: 0,
      lightR: 0,
      lightG: 0,
      lightB: 0
    }];
    catalog.set(tile.id, {
      tileId: tile.id,
      name: tile.name,
      styles: variants.map((variant, index) => createStyle(tile, variant, index))
    });
  }
  return catalog;
}

// src/lib/editor/objects/objectPlacement.ts
function createObjectPlacementCells(style, originX, originY, frameStepX, frameStepY) {
  const cells = [];
  const left = Math.floor(originX) - style.originX;
  const top = Math.floor(originY) - style.originY;
  for (let row = 0; row < style.height; row++) {
    for (let column = 0; column < style.width; column++) {
      cells.push({
        x: left + column,
        y: top + row,
        frameU: style.frameU + column * (style.frameColumnStep ?? frameStepX),
        frameV: style.frameV + (style.frameRowOffsets?.[row] ?? row * frameStepY)
      });
    }
  }
  return cells;
}

// src/lib/editor/objects/entityConsistency.ts
var SHAPE_BY_ENTITY_TYPE = /* @__PURE__ */ new Map([
  [1, { tileId: 395, width: 2, height: 2 }],
  // Item Frame
  [3, { tileId: 470, width: 2, height: 3 }],
  // Display Doll
  [4, { tileId: 471, width: 3, height: 3 }],
  // Weapon Rack
  [5, { tileId: 475, width: 3, height: 4 }],
  // Hat Rack
  [6, { tileId: 520, width: 3, height: 2 }]
  // Food Platter
]);
var SHAPE_BY_TILE_ID = new Map(
  Array.from(SHAPE_BY_ENTITY_TYPE.entries()).map(([type, shape]) => [
    shape.tileId,
    { ...shape, type }
  ])
);

// src/lib/editor/tools/paint/paints.ts
var paintNames = ["Red", "Orange", "Yellow", "Lime", "Green", "Teal", "Cyan", "Sky Blue", "Blue", "Purple", "Violet", "Pink"];
var paints = [
  ...paintNames.map((name, i) => ({ id: i + 1, item: 1073 + i, name })),
  ...paintNames.map((name, i) => ({ id: i + 13, item: 1085 + i, name: `Deep ${name}` })),
  { id: 25, item: 1097, name: "Black" },
  { id: 26, item: 1098, name: "White" },
  { id: 27, item: 1099, name: "Gray" },
  { id: 28, item: 1966, name: "Brown" },
  { id: 29, item: 1967, name: "Shadow" },
  { id: 30, item: 1968, name: "Negative" }
];

// src/lib/structure-spec/names.ts
var LIQUIDS = { water: 1, lava: 2, honey: 3, shimmer: 4 };
function normalizeName(value) {
  return value.toLocaleLowerCase().replace(/[’']/gu, "").replace(/[_\s]+/gu, " ").trim();
}
function styleKeys(style) {
  const keys = [style.name];
  if (style.variety) keys.push(style.variety, `${style.name} ${style.variety}`, `${style.name} (${style.variety})`);
  return keys;
}
var TerrariaNameIndex = class {
  constructor(data) {
    this.data = data;
    this.catalog = buildObjectCatalog(data);
    for (const tile of data.tiles) {
      if (!tile || tile.hasExtra || tile.tmodModName) continue;
      for (const key of [tile.name, tile.key]) {
        if (key && !this.blocks.has(normalizeName(key))) this.blocks.set(normalizeName(key), tile.id);
      }
    }
    for (const wall of data.walls) {
      if (!wall || wall.id === 0 || wall.tmodModName) continue;
      for (const key of [wall.name, wall.key]) {
        if (key && !this.walls.has(normalizeName(key))) this.walls.set(normalizeName(key), wall.id);
      }
    }
    for (const definition of this.catalog.values()) {
      for (const style of definition.styles) {
        for (const key of styleKeys(style)) {
          const normalized = normalizeName(key);
          const list = this.objects.get(normalized);
          if (list) list.push(style);
          else this.objects.set(normalized, [style]);
        }
      }
    }
    for (const item of data.items ?? []) {
      if (item && !this.items.has(normalizeName(item.name))) this.items.set(normalizeName(item.name), item.id);
    }
    for (const paint of paints) this.paintIds.set(normalizeName(paint.name), paint.id);
  }
  catalog;
  blocks = /* @__PURE__ */ new Map();
  walls = /* @__PURE__ */ new Map();
  objects = /* @__PURE__ */ new Map();
  items = /* @__PURE__ */ new Map();
  paintIds = /* @__PURE__ */ new Map();
  /** Block or 1×1 framed tile (platforms, for example) that can fill an area. */
  material(name) {
    const key = normalizeName(name);
    const block = this.blocks.get(key);
    if (block !== void 0) return { type: block, u: -1, v: -1, name: this.data.tiles[block].name };
    const styles = (this.objects.get(key) ?? []).filter((style2) => style2.width === 1 && style2.height === 1);
    const style = styles.find((candidate) => candidate.variety === "Flat") ?? styles[0];
    return style ? { type: style.tileId, u: style.frameU, v: style.frameV, name: style.name } : null;
  }
  wall(name) {
    const key = normalizeName(name);
    return this.walls.get(key) ?? this.walls.get(`${key} wall`) ?? this.walls.get(key.replace(/ wall$/u, "")) ?? null;
  }
  object(name, options = {}) {
    let styles = this.objects.get(normalizeName(name)) ?? [];
    if (options.variety) styles = styles.filter((style) => normalizeName(style.variety ?? "") === normalizeName(options.variety));
    if (options.facing) {
      const facing = styles.filter((style) => style.direction === options.facing);
      if (facing.length > 0 || styles.some((style) => style.direction !== "none")) styles = facing;
    }
    if (options.attach) {
      const anchor = ATTACH_TO_ANCHOR[normalizeName(options.attach)] ?? options.attach;
      styles = styles.filter((style) => style.anchor === anchor);
    }
    return styles[0] ?? null;
  }
  item(name) {
    return this.items.get(normalizeName(name)) ?? null;
  }
  paint(name) {
    const key = normalizeName(name).replace(/ paint$/u, "");
    return this.paintIds.get(key) ?? null;
  }
  /** Closest known names, for "did you mean" messages. */
  suggest(name, kind, limit = 5) {
    const pool = kind === "wall" ? [...this.walls.keys()] : kind === "item" ? [...this.items.keys()] : kind === "material" ? [...this.blocks.keys(), ...[...this.objects.entries()].filter(([, styles]) => styles.some((style) => style.width === 1 && style.height === 1)).map(([key]) => key)] : [...this.objects.keys()];
    const query = normalizeName(name);
    const words = query.split(" ");
    return pool.map((candidate) => ({ candidate, score: similarity(query, words, candidate) })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.candidate.length - b.candidate.length).map((entry) => this.displayName(kind, entry.candidate)).filter((display, index, all) => all.indexOf(display) === index).slice(0, limit);
  }
  search(query, kind, limit = 40) {
    const words = normalizeName(query).split(" ").filter(Boolean);
    const matches = (text) => words.every((word) => normalizeName(text).includes(word));
    const results = [];
    if (!kind || kind === "block") {
      for (const tile of this.data.tiles) {
        if (tile && !tile.hasExtra && !tile.tmodModName && matches(tile.name)) results.push({ kind: "block", name: tile.name, id: tile.id });
      }
    }
    if (!kind || kind === "wall") {
      for (const wall of this.data.walls) {
        if (wall && wall.id !== 0 && !wall.tmodModName && matches(wall.name)) results.push({ kind: "wall", name: wall.name, id: wall.id });
      }
    }
    if (!kind || kind === "object") {
      const seen = /* @__PURE__ */ new Set();
      for (const definition of this.catalog.values()) {
        for (const style of definition.styles) {
          if (!matches(`${style.name} ${style.variety ?? ""} ${definition.name}`)) continue;
          const key = `${style.name}|${style.variety ?? ""}|${style.direction}|${style.anchor}`;
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({
            kind: "object",
            name: style.name,
            variety: style.variety,
            id: style.tileId,
            size: [style.width, style.height],
            anchor: ANCHOR_TO_ATTACH[style.anchor],
            facing: style.direction === "none" ? void 0 : style.direction
          });
        }
      }
    }
    return results.slice(0, limit);
  }
  displayName(kind, key) {
    if (kind === "wall") return this.data.walls[this.walls.get(key)]?.name ?? key;
    if (kind === "item") return this.data.items[this.items.get(key)]?.name ?? key;
    const block = this.blocks.get(key);
    if (block !== void 0) return this.data.tiles[block].name;
    const style = this.objects.get(key)?.[0];
    if (!style) return key;
    return normalizeName(style.name) === key || !style.variety ? style.name : `${style.name} (${style.variety})`;
  }
};
var ATTACH_TO_ANCHOR = { floor: "bottom", ceiling: "top", "left wall": "left", "right wall": "right", none: "none" };
var ANCHOR_TO_ATTACH = { bottom: "floor", top: "ceiling", left: "left wall", right: "right wall", none: "none" };
function similarity(query, words, candidate) {
  if (candidate === query) return 100;
  let score = 0;
  if (candidate.includes(query)) score += 20;
  for (const word of words) if (word.length > 1 && candidate.includes(word)) score += 5;
  return score;
}

// src/lib/structure-spec/compile.ts
var SHAPE_BRICK_STYLE = {
  full: 0,
  half: 1,
  "slope-bl": 2,
  "slope-br": 3,
  "slope-tl": 4,
  "slope-tr": 5
};
var CONTAINER_TILES = /* @__PURE__ */ new Set([21, 88, 441, 467, 468]);
var SIGN_TILES = /* @__PURE__ */ new Set([55, 85, 425, 573]);
var WALL_MOUNT_TILES = /* @__PURE__ */ new Set([4, 55, 573]);
var WALL_DECOR_TILES = /* @__PURE__ */ new Set([240, 241, 242, 245, 246]);
var DOOR_TILES = /* @__PURE__ */ new Set([10]);
var MAX_ISSUES = 200;
function compileStructureSpec(spec, names2, now = Date.now()) {
  const { width, height } = spec;
  const cells = /* @__PURE__ */ new Map();
  const owners = /* @__PURE__ */ new Map();
  const objects = [];
  const chests = [];
  const signs = [];
  const issues = [];
  const reported = /* @__PURE__ */ new Set();
  let opIndex = -1;
  const issue = (severity, message, dedupe) => {
    if (dedupe) {
      if (reported.has(dedupe)) return;
      reported.add(dedupe);
    }
    if (issues.length < MAX_ISSUES) issues.push({ severity, op: opIndex >= 0 ? opIndex : void 0, message });
  };
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
  const cell = (x, y) => {
    const key = `${x},${y}`;
    let data = cells.get(key);
    if (!data) cells.set(key, data = { type: 0, active: false });
    return data;
  };
  const touchTile = (x, y) => {
    const owner = owners.get(`${x},${y}`);
    if (owner === void 0) return;
    const placed = objects[owner];
    issue("error", `Overwrites part of ${placed.style.name} placed by op #${placed.op} at (${x}, ${y}).`, `overwrite:${opIndex}:${owner}`);
    owners.delete(`${x},${y}`);
  };
  const resolved = /* @__PURE__ */ new Map();
  const lookup = (kind, name) => {
    const key = `${kind}:${name}`;
    if (!resolved.has(key)) {
      let value = null;
      if (kind === "material") value = names2.material(name);
      else if (kind === "wall") value = names2.wall(name);
      else if (kind === "paint") value = names2.paint(name);
      else value = LIQUIDS[name.toLocaleLowerCase()] ?? null;
      resolved.set(key, value);
      if (value === null) {
        const hint = kind === "paint" || kind === "liquid" ? "" : suggestion(names2.suggest(name, kind));
        issue("error", `Unknown ${kind === "material" ? "tile" : kind} "${name}".${hint}`);
      }
    }
    return resolved.get(key);
  };
  const applyCell = (x, y, spec2) => {
    if (!inBounds(x, y)) {
      issue("error", `Cell (${x}, ${y}) is outside the ${width}\xD7${height} structure.`, `bounds:${opIndex}`);
      return;
    }
    const data = cell(x, y);
    if (spec2.clear === "tile" || spec2.clear === "all") {
      if (data.active) touchTile(x, y);
      Object.assign(data, { type: 0, active: false, u: -1, v: -1, brickStyle: 0, tileColor: 0 });
    }
    if (spec2.clear === "wall" || spec2.clear === "all") Object.assign(data, { wall: 0, wallColor: 0 });
    if (spec2.clear === "liquid" || spec2.clear === "all") Object.assign(data, { liquidAmount: 0, liquidType: 0 });
    if (spec2.tile) {
      const material = lookup("material", spec2.tile);
      if (material) {
        if (data.active) touchTile(x, y);
        Object.assign(data, { type: material.type, active: true, u: material.u, v: material.v, brickStyle: 0 });
      }
    }
    if (spec2.shape) {
      const style = SHAPE_BRICK_STYLE[spec2.shape];
      if (style === void 0) issue("error", `Unknown shape "${spec2.shape}". Use full, half, slope-bl, slope-br, slope-tl or slope-tr.`, `shape:${opIndex}`);
      else if (data.active && !owners.has(`${x},${y}`)) data.brickStyle = style;
    }
    if (spec2.wall) {
      const wall = lookup("wall", spec2.wall);
      if (wall !== null) data.wall = wall;
    }
    if (spec2.paint) {
      const paint = lookup("paint", spec2.paint);
      if (paint !== null) data.tileColor = paint;
    }
    if (spec2.wallPaint) {
      const paint = lookup("paint", spec2.wallPaint);
      if (paint !== null) data.wallColor = paint;
    }
    if (spec2.liquid) {
      const liquid = lookup("liquid", spec2.liquid);
      if (liquid !== null) Object.assign(data, { liquidType: liquid, liquidAmount: 255 });
    }
  };
  const isSupported = (style, left, top, self) => {
    const isSolid = (x, y) => !!cells.get(`${x},${y}`)?.active && owners.get(`${x},${y}`) !== self;
    const columns = Array.from({ length: style.width }, (_, dx) => left + dx);
    const rows = Array.from({ length: style.height }, (_, dy) => top + dy);
    const wallBehind = columns.every((x) => rows.every((y) => !!cells.get(`${x},${y}`)?.wall));
    let supported = true;
    if (WALL_DECOR_TILES.has(style.tileId)) supported = wallBehind;
    else if (style.anchor === "bottom") supported = columns.some((x) => isSolid(x, top + style.height));
    else if (style.anchor === "top") supported = columns.some((x) => isSolid(x, top - 1));
    else if (style.anchor === "left") supported = rows.some((y) => isSolid(left - 1, y));
    else if (style.anchor === "right") supported = rows.some((y) => isSolid(left + style.width, y));
    if (!supported && WALL_MOUNT_TILES.has(style.tileId) && wallBehind) supported = true;
    if (DOOR_TILES.has(style.tileId) && !isSolid(left, top - 1)) supported = false;
    return supported;
  };
  const nearestFreeSpot = (style, left, top) => {
    let best = null;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance === 0 || distance > 4 || best && distance >= best.distance) continue;
        const parts = createObjectPlacementCells(style, left + dx, top + dy, 18, 18);
        if (parts.some((part) => !inBounds(part.x, part.y) || cells.get(`${part.x},${part.y}`)?.active)) continue;
        if (isSupported(style, left + dx, top + dy, -1)) best = { left: left + dx, top: top + dy, distance };
      }
    }
    return best;
  };
  const placeObject = (op) => {
    const style = names2.object(op.name, { variety: op.variety, facing: op.facing, attach: op.attach });
    if (!style) {
      const known = names2.object(op.name);
      const detail = known ? ` It exists, but not with ${[op.variety && `variety "${op.variety}"`, op.facing && `facing "${op.facing}"`, op.attach && `attach "${op.attach}"`].filter(Boolean).join(", ")}.` : suggestion(names2.suggest(op.name, "object"));
      issue("error", `Unknown object "${op.name}".${detail}`);
      return;
    }
    const left = op.x;
    const top = op.at === "floor" ? op.y - style.height : op.at === "ceiling" ? op.y + 1 : op.y;
    const parts = createObjectPlacementCells(style, left, top, 18, 18);
    const outside = parts.find((part) => !inBounds(part.x, part.y));
    if (outside) {
      issue("error", `${style.name} (${style.width}\xD7${style.height}) at (${left}, ${top}) does not fit inside the structure.`);
      return;
    }
    if (op.replace) {
      for (const part of parts) if (cells.get(`${part.x},${part.y}`)?.active) applyCell(part.x, part.y, { clear: "tile" });
    }
    const blocked = parts.find((part) => cells.get(`${part.x},${part.y}`)?.active);
    if (blocked) {
      const other = cells.get(`${blocked.x},${blocked.y}`);
      const ownedBy = owners.get(`${blocked.x},${blocked.y}`);
      const holder = ownedBy !== void 0 ? objects[ownedBy].style.name : `the block ${names2.data.tiles[other.type]?.name ?? `tile ${other.type}`}`;
      const free = nearestFreeSpot(style, left, top);
      const spot = free && (op.at === "floor" ? `x=${free.left} y=${free.top + style.height} at=floor` : op.at === "ceiling" ? `x=${free.left} y=${free.top - 1} at=ceiling` : `x=${free.left} y=${free.top}`);
      issue("error", `${style.name} needs (${blocked.x}, ${blocked.y}) empty, but it holds ${holder}. Objects go in empty cells, never inside a block or floor row.${spot ? ` Nearest empty spot with support: ${spot}.` : " Clear the cell first or move the object."}`);
      return;
    }
    const index = objects.length;
    objects.push({ op: opIndex, style, left, top });
    for (const part of parts) {
      Object.assign(cell(part.x, part.y), { type: style.tileId, active: true, u: part.frameU, v: part.frameV, brickStyle: 0 });
      owners.set(`${part.x},${part.y}`, index);
    }
    if (CONTAINER_TILES.has(style.tileId)) {
      const items = (op.items ?? []).flatMap((entry, slot) => {
        const parsed = typeof entry === "string" ? parseItem(entry) : entry;
        const itemId = names2.item(parsed.name);
        if (itemId === null) {
          issue("error", `Unknown item "${parsed.name}".${suggestion(names2.suggest(parsed.name, "item"))}`);
          return [];
        }
        return [{ itemId, stackSize: parsed.stack ?? 1, prefix: parsed.prefix ?? 0, slot }];
      });
      if (items.length > 40) issue("error", "A chest holds at most 40 items.");
      chests.push({ relX: left, relY: top, chest: { x: left, y: top, name: op.chestName ?? "", items: items.slice(0, 40) } });
    } else if (op.items?.length) issue("warning", `${style.name} is not a container; its items are ignored.`);
    if (SIGN_TILES.has(style.tileId)) signs.push({ relX: left, relY: top, sign: { x: left, y: top, text: op.text ?? "" } });
    else if (op.text) issue("warning", `${style.name} is not a sign; its text is ignored.`);
  };
  const ops = Array.isArray(spec.ops) ? spec.ops : [];
  for (opIndex = 0; opIndex < ops.length; opIndex++) {
    const op = ops[opIndex];
    if (!op || typeof op !== "object") {
      issue("error", "Op must be an object.");
      continue;
    }
    const missing = requiredFields(op).filter((field) => typeof op[field] !== "number");
    if (missing.length > 0) {
      issue("error", `Op "${op.op}" needs numeric ${missing.join(", ")}.`);
      continue;
    }
    switch (op.op) {
      case "rect": {
        const { x, y } = op;
        const w = op.w ?? 1, h = op.h ?? 1;
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            if (op.hollow && dx > 0 && dy > 0 && dx < w - 1 && dy < h - 1) continue;
            applyCell(x + dx, y + dy, op);
          }
        }
        break;
      }
      case "clear": {
        const w = op.w ?? 1, h = op.h ?? 1;
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) applyCell(op.x + dx, op.y + dy, { clear: op.layer ?? "tile" });
        break;
      }
      case "line":
        for (const [x, y] of linePoints(op.x1, op.y1, op.x2, op.y2)) applyCell(x, y, op);
        break;
      case "roof":
        drawRoof(op, applyCell);
        break;
      case "object":
        placeObject(op);
        break;
      case "grid": {
        const legend = { ...spec.legend, ...op.legend };
        const rows = typeof op.rows === "string" ? op.rows.split("/") : op.rows ?? [];
        rows.forEach((row, dy) => [...row].forEach((char, dx) => {
          if (char === "." || char === " ") return;
          const entry = legend[char];
          if (entry === void 0) issue("error", `Grid character "${char}" is not in the legend.`, `legend:${opIndex}:${char}`);
          else applyCell(op.x + dx, op.y + dy, typeof entry === "string" ? { tile: entry } : entry);
        }));
        break;
      }
      default:
        issue("error", `Unknown op "${op.op}". Use rect, clear, line, roof, object or grid.`);
    }
  }
  opIndex = -1;
  objects.forEach((placed, index) => {
    const { style, left, top } = placed;
    if (!isSupported(style, left, top, index)) {
      const need = WALL_DECOR_TILES.has(style.tileId) ? "a background wall behind every cell" : DOOR_TILES.has(style.tileId) ? "a block directly above and below" : style.anchor === "top" ? "a block directly above" : style.anchor === "bottom" ? "a block directly below" : `a block on its ${style.anchor} side`;
      issues.push({ severity: "warning", op: placed.op, message: `${style.name} at (${left}, ${top}) needs ${need}; in game it would break.` });
    }
  });
  const tiles = [...cells].map(([key, data]) => {
    const [relX, relY] = key.split(",").map(Number);
    return { relX, relY, data };
  });
  const clipboard = { tiles, chests, signs, width, height, originX: 0, originY: 0, timestamp: now };
  const draft = createStructureDraft(clipboard, {
    source: "package",
    name: spec.name ?? "AI structure",
    description: spec.description ?? "",
    now
  });
  for (const problem of draft.validation.issues) issues.push({ severity: problem.severity, message: problem.message });
  return { clipboard, draft, objects, issues, ok: issues.every((entry) => entry.severity !== "error") };
}
function requiredFields(op) {
  switch (op.op) {
    case "line":
      return ["x1", "y1", "x2", "y2"];
    case "roof":
      return ["x", "y", "w"];
    default:
      return ["x", "y"];
  }
}
function drawRoof(op, applyCell) {
  for (let row = 0; ; row++) {
    const left = op.x + row, right = op.x + op.w - 1 - row, y = op.y - row;
    if (left > right) break;
    for (let x = left; x <= right; x++) {
      const edge = op.thickness === void 0 || x - left < op.thickness || right - x < op.thickness;
      if (edge) applyCell(x, y, { tile: op.tile });
      else applyCell(x, y, { clear: "tile", wall: op.wall });
    }
    if (op.slopes !== false && left < right) {
      applyCell(left, y, { shape: "slope-br" });
      applyCell(right, y, { shape: "slope-bl" });
    }
  }
}
function linePoints(x0, y0, x1, y1) {
  const points = [];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  for (; ; ) {
    points.push([x0, y0]);
    if (x0 === x1 && y0 === y1) return points;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x0 += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}
function parseItem(entry) {
  const match = /^(.*?)\s*[x×*]\s*(\d+)$/u.exec(entry.replace(/_/gu, " "));
  return match ? { name: match[1], stack: Number(match[2]) } : { name: entry.replace(/_/gu, " ") };
}
function suggestion(candidates) {
  return candidates.length > 0 ? ` Did you mean: ${candidates.map((name) => `"${name}"`).join(", ")}?` : "";
}

// src/lib/structure-spec/preview.ts
var SYMBOLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$%&*+?!";
function renderStructureAscii(clipboard, names2, options = {}) {
  const grid = toGrid(clipboard);
  const symbols = /* @__PURE__ */ new Map();
  const legend = [];
  const symbolFor = (label) => {
    let symbol = symbols.get(label);
    if (!symbol) {
      symbol = SYMBOLS[symbols.size] ?? "#";
      symbols.set(label, symbol);
      legend.push(`${symbol} ${label}`);
    }
    return symbol;
  };
  const lines = [];
  const pad = String(clipboard.height - 1).length;
  if (options.rulers !== false) {
    const tens = Array.from({ length: clipboard.width }, (_, x) => x % 10 === 0 ? String(Math.floor(x / 10) % 10) : " ").join("");
    const ones = Array.from({ length: clipboard.width }, (_, x) => String(x % 10)).join("");
    lines.push(`${" ".repeat(pad)} ${tens}`, `${" ".repeat(pad)} ${ones}`);
  }
  for (let y = 0; y < clipboard.height; y++) {
    let row = "";
    for (let x = 0; x < clipboard.width; x++) {
      const data = grid[y * clipboard.width + x];
      if (data?.active) {
        const style = data.brickStyle ?? 0;
        row += style === 1 ? "_" : style === 2 || style === 5 ? "\\" : style === 3 || style === 4 ? "/" : symbolFor(cellLabel(data, names2));
      } else if (data?.liquidAmount) row += "~";
      else if (data?.wall) row += ":";
      else row += " ";
    }
    lines.push(options.rulers === false ? row.trimEnd() : `${String(y).padStart(pad)} ${row}`.trimEnd());
  }
  lines.push("", "Legend: / \\ slopes, _ half block, : background wall only, ~ liquid", ...legend);
  return lines.join("\n");
}
function renderStructureRgba(clipboard, names2, scale = 4) {
  const width = clipboard.width * scale, height = clipboard.height * scale;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const grid = toGrid(clipboard);
  const background = [24, 30, 44];
  const tileColors = /* @__PURE__ */ new Map();
  const wallColors = /* @__PURE__ */ new Map();
  for (let y = 0; y < clipboard.height; y++) {
    for (let x = 0; x < clipboard.width; x++) {
      const data = grid[y * clipboard.width + x];
      let wall = background;
      if (data?.wall) {
        if (!wallColors.has(data.wall)) wallColors.set(data.wall, shade(parseHex(names2.data.walls[data.wall]?.color) ?? [70, 70, 70], 0.65));
        wall = wallColors.get(data.wall);
      }
      let tile = null;
      if (data?.active) {
        const key = `${data.type}:${data.u}:${data.v}`;
        if (!tileColors.has(key)) {
          const info = names2.data.tiles[data.type];
          tileColors.set(key, parseHex(variantColor(data, names2) ?? info?.color) ?? [200, 0, 200]);
        }
        tile = tileColors.get(key);
      }
      const liquid = data?.liquidAmount ? LIQUID_COLORS[data.liquidType ?? 1] ?? LIQUID_COLORS[1] : null;
      const style = data?.active ? data.brickStyle ?? 0 : 0;
      for (let py = 0; py < scale; py++) {
        for (let px = 0; px < scale; px++) {
          const fx = (px + 0.5) / scale, fy = (py + 0.5) / scale;
          let color = wall;
          if (liquid) color = mix(color, liquid, 0.7);
          if (tile && insideShape(style, fx, fy)) color = tile;
          const offset = ((y * scale + py) * width + x * scale + px) * 4;
          pixels[offset] = color[0];
          pixels[offset + 1] = color[1];
          pixels[offset + 2] = color[2];
          pixels[offset + 3] = 255;
        }
      }
    }
  }
  return { width, height, data: pixels };
}
var LIQUID_COLORS = { 1: [40, 90, 230], 2: [250, 90, 20], 3: [250, 190, 40], 4: [210, 160, 240] };
function insideShape(style, fx, fy) {
  switch (style) {
    case 1:
      return fy >= 0.5;
    case 2:
      return fy >= fx;
    // ◣
    case 3:
      return fy >= 1 - fx;
    // ◢
    case 4:
      return fy <= 1 - fx;
    // ◤
    case 5:
      return fy <= fx;
    // ◥
    default:
      return true;
  }
}
function toGrid(clipboard) {
  const grid = new Array(clipboard.width * clipboard.height);
  for (const { relX, relY, data } of clipboard.tiles) {
    if (relX >= 0 && relY >= 0 && relX < clipboard.width && relY < clipboard.height) grid[relY * clipboard.width + relX] = data;
  }
  return grid;
}
function cellLabel(data, names2) {
  const definition = names2.catalog.get(data.type);
  const u = data.u ?? -1, v = data.v ?? -1;
  if (definition && u >= 0 && v >= 0) {
    const style = definition.styles.find((candidate) => u >= candidate.frameU && u < candidate.frameU + candidate.width * (candidate.frameColumnStep ?? 18) && v >= candidate.frameV && v < candidate.frameV + candidate.height * 18);
    if (style) return style.name;
  }
  return names2.data.tiles[data.type]?.name ?? `Tile ${data.type}`;
}
function variantColor(data, names2) {
  const tile = names2.data.tiles[data.type];
  if (!tile?.variants?.length || (data.u ?? -1) < 0) return void 0;
  return tile.variants.find((variant) => variant.u === data.u && variant.v === data.v)?.color;
}
function parseHex(hex) {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/iu.exec(hex ?? "");
  return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : null;
}
function shade(color, factor) {
  return [color[0] * factor, color[1] * factor, color[2] * factor];
}
function mix(a, b, amount) {
  return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount];
}

// node_modules/pako/dist/pako.esm.mjs
var Z_FIXED$1 = 4;
var Z_BINARY = 0;
var Z_TEXT = 1;
var Z_UNKNOWN$1 = 2;
function zero$1(buf) {
  let len = buf.length;
  while (--len >= 0) {
    buf[len] = 0;
  }
}
var STORED_BLOCK = 0;
var STATIC_TREES = 1;
var DYN_TREES = 2;
var MIN_MATCH$1 = 3;
var MAX_MATCH$1 = 258;
var LENGTH_CODES$1 = 29;
var LITERALS$1 = 256;
var L_CODES$1 = LITERALS$1 + 1 + LENGTH_CODES$1;
var D_CODES$1 = 30;
var BL_CODES$1 = 19;
var HEAP_SIZE$1 = 2 * L_CODES$1 + 1;
var MAX_BITS$1 = 15;
var Buf_size = 16;
var MAX_BL_BITS = 7;
var END_BLOCK = 256;
var REP_3_6 = 16;
var REPZ_3_10 = 17;
var REPZ_11_138 = 18;
var extra_lbits = (
  /* extra bits for each length code */
  new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0])
);
var extra_dbits = (
  /* extra bits for each distance code */
  new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13])
);
var extra_blbits = (
  /* extra bits for each bit length code */
  new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7])
);
var bl_order = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var DIST_CODE_LEN = 512;
var static_ltree = new Array((L_CODES$1 + 2) * 2);
zero$1(static_ltree);
var static_dtree = new Array(D_CODES$1 * 2);
zero$1(static_dtree);
var _dist_code = new Array(DIST_CODE_LEN);
zero$1(_dist_code);
var _length_code = new Array(MAX_MATCH$1 - MIN_MATCH$1 + 1);
zero$1(_length_code);
var base_length = new Array(LENGTH_CODES$1);
zero$1(base_length);
var base_dist = new Array(D_CODES$1);
zero$1(base_dist);
function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
  this.static_tree = static_tree;
  this.extra_bits = extra_bits;
  this.extra_base = extra_base;
  this.elems = elems;
  this.max_length = max_length;
  this.has_stree = static_tree && static_tree.length;
}
var static_l_desc;
var static_d_desc;
var static_bl_desc;
function TreeDesc(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;
  this.max_code = 0;
  this.stat_desc = stat_desc;
}
var d_code = (dist) => {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
};
var put_short = (s, w) => {
  s.pending_buf[s.pending++] = w & 255;
  s.pending_buf[s.pending++] = w >>> 8 & 255;
};
var send_bits = (s, value, length) => {
  if (s.bi_valid > Buf_size - length) {
    s.bi_buf |= value << s.bi_valid & 65535;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> Buf_size - s.bi_valid;
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= value << s.bi_valid & 65535;
    s.bi_valid += length;
  }
};
var send_code = (s, c, tree) => {
  send_bits(
    s,
    tree[c * 2],
    tree[c * 2 + 1]
    /*.Len*/
  );
};
var bi_reverse = (code, len) => {
  let res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
};
var bi_flush = (s) => {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;
  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 255;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
};
var gen_bitlen = (s, desc) => {
  const tree = desc.dyn_tree;
  const max_code = desc.max_code;
  const stree = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const extra = desc.stat_desc.extra_bits;
  const base2 = desc.stat_desc.extra_base;
  const max_length = desc.stat_desc.max_length;
  let h;
  let n, m;
  let bits;
  let xbits;
  let f;
  let overflow = 0;
  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    s.bl_count[bits] = 0;
  }
  tree[s.heap[s.heap_max] * 2 + 1] = 0;
  for (h = s.heap_max + 1; h < HEAP_SIZE$1; h++) {
    n = s.heap[h];
    bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n * 2 + 1] = bits;
    if (n > max_code) {
      continue;
    }
    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base2) {
      xbits = extra[n - base2];
    }
    f = tree[n * 2];
    s.opt_len += f * (bits + xbits);
    if (has_stree) {
      s.static_len += f * (stree[n * 2 + 1] + xbits);
    }
  }
  if (overflow === 0) {
    return;
  }
  do {
    bits = max_length - 1;
    while (s.bl_count[bits] === 0) {
      bits--;
    }
    s.bl_count[bits]--;
    s.bl_count[bits + 1] += 2;
    s.bl_count[max_length]--;
    overflow -= 2;
  } while (overflow > 0);
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) {
        continue;
      }
      if (tree[m * 2 + 1] !== bits) {
        s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
        tree[m * 2 + 1] = bits;
      }
      n--;
    }
  }
};
var gen_codes = (tree, max_code, bl_count) => {
  const next_code = new Array(MAX_BITS$1 + 1);
  let code = 0;
  let bits;
  let n;
  for (bits = 1; bits <= MAX_BITS$1; bits++) {
    code = code + bl_count[bits - 1] << 1;
    next_code[bits] = code;
  }
  for (n = 0; n <= max_code; n++) {
    let len = tree[n * 2 + 1];
    if (len === 0) {
      continue;
    }
    tree[n * 2] = bi_reverse(next_code[len]++, len);
  }
};
var tr_static_init = () => {
  let n;
  let bits;
  let length;
  let code;
  let dist;
  const bl_count = new Array(MAX_BITS$1 + 1);
  length = 0;
  for (code = 0; code < LENGTH_CODES$1 - 1; code++) {
    base_length[code] = length;
    for (n = 0; n < 1 << extra_lbits[code]; n++) {
      _length_code[length++] = code;
    }
  }
  _length_code[length - 1] = code;
  dist = 0;
  for (code = 0; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < 1 << extra_dbits[code]; n++) {
      _dist_code[dist++] = code;
    }
  }
  dist >>= 7;
  for (; code < D_CODES$1; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
      _dist_code[256 + dist++] = code;
    }
  }
  for (bits = 0; bits <= MAX_BITS$1; bits++) {
    bl_count[bits] = 0;
  }
  n = 0;
  while (n <= 143) {
    static_ltree[n * 2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n * 2 + 1] = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n * 2 + 1] = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n * 2 + 1] = 8;
    n++;
    bl_count[8]++;
  }
  gen_codes(static_ltree, L_CODES$1 + 1, bl_count);
  for (n = 0; n < D_CODES$1; n++) {
    static_dtree[n * 2 + 1] = 5;
    static_dtree[n * 2] = bi_reverse(n, 5);
  }
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS$1 + 1, L_CODES$1, MAX_BITS$1);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES$1, MAX_BITS$1);
  static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES$1, MAX_BL_BITS);
};
var init_block = (s) => {
  let n;
  for (n = 0; n < L_CODES$1; n++) {
    s.dyn_ltree[n * 2] = 0;
  }
  for (n = 0; n < D_CODES$1; n++) {
    s.dyn_dtree[n * 2] = 0;
  }
  for (n = 0; n < BL_CODES$1; n++) {
    s.bl_tree[n * 2] = 0;
  }
  s.dyn_ltree[END_BLOCK * 2] = 1;
  s.opt_len = s.static_len = 0;
  s.sym_next = s.matches = 0;
};
var bi_windup = (s) => {
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    s.pending_buf[s.pending++] = s.bi_buf;
  }
  s.bi_buf = 0;
  s.bi_valid = 0;
};
var smaller = (tree, n, m, depth) => {
  const _n2 = n * 2;
  const _m2 = m * 2;
  return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
};
var pqdownheap = (s, tree, k) => {
  const v = s.heap[k];
  let j = k << 1;
  while (j <= s.heap_len) {
    if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
      j++;
    }
    if (smaller(tree, v, s.heap[j], s.depth)) {
      break;
    }
    s.heap[k] = s.heap[j];
    k = j;
    j <<= 1;
  }
  s.heap[k] = v;
};
var compress_block = (s, ltree, dtree) => {
  let dist;
  let lc;
  let sx = 0;
  let code;
  let extra;
  if (s.sym_next !== 0) {
    do {
      dist = s.pending_buf[s.sym_buf + sx++] & 255;
      dist += (s.pending_buf[s.sym_buf + sx++] & 255) << 8;
      lc = s.pending_buf[s.sym_buf + sx++];
      if (dist === 0) {
        send_code(s, lc, ltree);
      } else {
        code = _length_code[lc];
        send_code(s, code + LITERALS$1 + 1, ltree);
        extra = extra_lbits[code];
        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);
        }
        dist--;
        code = d_code(dist);
        send_code(s, code, dtree);
        extra = extra_dbits[code];
        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);
        }
      }
    } while (sx < s.sym_next);
  }
  send_code(s, END_BLOCK, ltree);
};
var build_tree = (s, desc) => {
  const tree = desc.dyn_tree;
  const stree = desc.stat_desc.static_tree;
  const has_stree = desc.stat_desc.has_stree;
  const elems = desc.stat_desc.elems;
  let n, m;
  let max_code = -1;
  let node;
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE$1;
  for (n = 0; n < elems; n++) {
    if (tree[n * 2] !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;
    } else {
      tree[n * 2 + 1] = 0;
    }
  }
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
    tree[node * 2] = 1;
    s.depth[node] = 0;
    s.opt_len--;
    if (has_stree) {
      s.static_len -= stree[node * 2 + 1];
    }
  }
  desc.max_code = max_code;
  for (n = s.heap_len >> 1; n >= 1; n--) {
    pqdownheap(s, tree, n);
  }
  node = elems;
  do {
    n = s.heap[
      1
      /*SMALLEST*/
    ];
    s.heap[
      1
      /*SMALLEST*/
    ] = s.heap[s.heap_len--];
    pqdownheap(
      s,
      tree,
      1
      /*SMALLEST*/
    );
    m = s.heap[
      1
      /*SMALLEST*/
    ];
    s.heap[--s.heap_max] = n;
    s.heap[--s.heap_max] = m;
    tree[node * 2] = tree[n * 2] + tree[m * 2];
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n * 2 + 1] = tree[m * 2 + 1] = node;
    s.heap[
      1
      /*SMALLEST*/
    ] = node++;
    pqdownheap(
      s,
      tree,
      1
      /*SMALLEST*/
    );
  } while (s.heap_len >= 2);
  s.heap[--s.heap_max] = s.heap[
    1
    /*SMALLEST*/
  ];
  gen_bitlen(s, desc);
  gen_codes(tree, max_code, s.bl_count);
};
var scan_tree = (s, tree, max_code) => {
  let n;
  let prevlen = -1;
  let curlen;
  let nextlen = tree[0 * 2 + 1];
  let count = 0;
  let max_count = 7;
  let min_count = 4;
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code + 1) * 2 + 1] = 65535;
  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1];
    if (++count < max_count && curlen === nextlen) {
      continue;
    } else if (count < min_count) {
      s.bl_tree[curlen * 2] += count;
    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        s.bl_tree[curlen * 2]++;
      }
      s.bl_tree[REP_3_6 * 2]++;
    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10 * 2]++;
    } else {
      s.bl_tree[REPZ_11_138 * 2]++;
    }
    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
var send_tree = (s, tree, max_code) => {
  let n;
  let prevlen = -1;
  let curlen;
  let nextlen = tree[0 * 2 + 1];
  let count = 0;
  let max_count = 7;
  let min_count = 4;
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n + 1) * 2 + 1];
    if (++count < max_count && curlen === nextlen) {
      continue;
    } else if (count < min_count) {
      do {
        send_code(s, curlen, s.bl_tree);
      } while (--count !== 0);
    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count - 3, 2);
    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count - 3, 3);
    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count - 11, 7);
    }
    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;
    } else {
      max_count = 7;
      min_count = 4;
    }
  }
};
var build_bl_tree = (s) => {
  let max_blindex;
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
  build_tree(s, s.bl_desc);
  for (max_blindex = BL_CODES$1 - 1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
      break;
    }
  }
  s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
  return max_blindex;
};
var send_all_trees = (s, lcodes, dcodes, blcodes) => {
  let rank2;
  send_bits(s, lcodes - 257, 5);
  send_bits(s, dcodes - 1, 5);
  send_bits(s, blcodes - 4, 4);
  for (rank2 = 0; rank2 < blcodes; rank2++) {
    send_bits(s, s.bl_tree[bl_order[rank2] * 2 + 1], 3);
  }
  send_tree(s, s.dyn_ltree, lcodes - 1);
  send_tree(s, s.dyn_dtree, dcodes - 1);
};
var detect_data_type = (s) => {
  let block_mask = 4093624447;
  let n;
  for (n = 0; n <= 31; n++, block_mask >>>= 1) {
    if (block_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
      return Z_BINARY;
    }
  }
  if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
    return Z_TEXT;
  }
  for (n = 32; n < LITERALS$1; n++) {
    if (s.dyn_ltree[n * 2] !== 0) {
      return Z_TEXT;
    }
  }
  return Z_BINARY;
};
var static_init_done = false;
var _tr_init$1 = (s) => {
  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }
  s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
  s.bi_buf = 0;
  s.bi_valid = 0;
  init_block(s);
};
var _tr_stored_block$1 = (s, buf, stored_len, last) => {
  send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
  bi_windup(s);
  put_short(s, stored_len);
  put_short(s, ~stored_len);
  if (stored_len) {
    s.pending_buf.set(s.window.subarray(buf, buf + stored_len), s.pending);
  }
  s.pending += stored_len;
};
var _tr_align$1 = (s) => {
  send_bits(s, STATIC_TREES << 1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
};
var _tr_flush_block$1 = (s, buf, stored_len, last) => {
  let opt_lenb, static_lenb;
  let max_blindex = 0;
  if (s.level > 0) {
    if (s.strm.data_type === Z_UNKNOWN$1) {
      s.strm.data_type = detect_data_type(s);
    }
    build_tree(s, s.l_desc);
    build_tree(s, s.d_desc);
    max_blindex = build_bl_tree(s);
    opt_lenb = s.opt_len + 3 + 7 >>> 3;
    static_lenb = s.static_len + 3 + 7 >>> 3;
    if (static_lenb <= opt_lenb) {
      opt_lenb = static_lenb;
    }
  } else {
    opt_lenb = static_lenb = stored_len + 5;
  }
  if (stored_len + 4 <= opt_lenb && buf !== -1) {
    _tr_stored_block$1(s, buf, stored_len, last);
  } else if (s.strategy === Z_FIXED$1 || static_lenb === opt_lenb) {
    send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);
  } else {
    send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  init_block(s);
  if (last) {
    bi_windup(s);
  }
};
var _tr_tally$1 = (s, dist, lc) => {
  s.pending_buf[s.sym_buf + s.sym_next++] = dist;
  s.pending_buf[s.sym_buf + s.sym_next++] = dist >> 8;
  s.pending_buf[s.sym_buf + s.sym_next++] = lc;
  if (dist === 0) {
    s.dyn_ltree[lc * 2]++;
  } else {
    s.matches++;
    dist--;
    s.dyn_ltree[(_length_code[lc] + LITERALS$1 + 1) * 2]++;
    s.dyn_dtree[d_code(dist) * 2]++;
  }
  return s.sym_next === s.sym_end;
};
var _tr_init_1 = _tr_init$1;
var _tr_stored_block_1 = _tr_stored_block$1;
var _tr_flush_block_1 = _tr_flush_block$1;
var _tr_tally_1 = _tr_tally$1;
var _tr_align_1 = _tr_align$1;
var trees = {
  _tr_init: _tr_init_1,
  _tr_stored_block: _tr_stored_block_1,
  _tr_flush_block: _tr_flush_block_1,
  _tr_tally: _tr_tally_1,
  _tr_align: _tr_align_1
};
var adler32 = (adler, buf, len, pos) => {
  let s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
  while (len !== 0) {
    n = len > 2e3 ? 2e3 : len;
    len -= n;
    do {
      s1 = s1 + buf[pos++] | 0;
      s2 = s2 + s1 | 0;
    } while (--n);
    s1 %= 65521;
    s2 %= 65521;
  }
  return s1 | s2 << 16 | 0;
};
var adler32_1 = adler32;
var makeTable = () => {
  let c, table = [];
  for (var n = 0; n < 256; n++) {
    c = n;
    for (var k = 0; k < 8; k++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[n] = c;
  }
  return table;
};
var crcTable = new Uint32Array(makeTable());
var crc322 = (crc, buf, len, pos) => {
  const t = crcTable;
  const end = pos + len;
  crc ^= -1;
  for (let i = pos; i < end; i++) {
    crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
  }
  return crc ^ -1;
};
var crc32_1 = crc322;
var messages = {
  2: "need dictionary",
  /* Z_NEED_DICT       2  */
  1: "stream end",
  /* Z_STREAM_END      1  */
  0: "",
  /* Z_OK              0  */
  "-1": "file error",
  /* Z_ERRNO         (-1) */
  "-2": "stream error",
  /* Z_STREAM_ERROR  (-2) */
  "-3": "data error",
  /* Z_DATA_ERROR    (-3) */
  "-4": "insufficient memory",
  /* Z_MEM_ERROR     (-4) */
  "-5": "buffer error",
  /* Z_BUF_ERROR     (-5) */
  "-6": "incompatible version"
  /* Z_VERSION_ERROR (-6) */
};
var constants$2 = {
  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH: 0,
  Z_PARTIAL_FLUSH: 1,
  Z_SYNC_FLUSH: 2,
  Z_FULL_FLUSH: 3,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_ERRNO: -1,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  //Z_VERSION_ERROR: -6,
  /* compression levels */
  Z_NO_COMPRESSION: 0,
  Z_BEST_SPEED: 1,
  Z_BEST_COMPRESSION: 9,
  Z_DEFAULT_COMPRESSION: -1,
  Z_FILTERED: 1,
  Z_HUFFMAN_ONLY: 2,
  Z_RLE: 3,
  Z_FIXED: 4,
  Z_DEFAULT_STRATEGY: 0,
  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY: 0,
  Z_TEXT: 1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN: 2,
  /* The deflate compression method */
  Z_DEFLATED: 8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};
var { _tr_init, _tr_stored_block, _tr_flush_block, _tr_tally, _tr_align } = trees;
var {
  Z_NO_FLUSH: Z_NO_FLUSH$2,
  Z_PARTIAL_FLUSH,
  Z_FULL_FLUSH: Z_FULL_FLUSH$1,
  Z_FINISH: Z_FINISH$3,
  Z_BLOCK: Z_BLOCK$1,
  Z_OK: Z_OK$3,
  Z_STREAM_END: Z_STREAM_END$3,
  Z_STREAM_ERROR: Z_STREAM_ERROR$2,
  Z_DATA_ERROR: Z_DATA_ERROR$2,
  Z_BUF_ERROR: Z_BUF_ERROR$1,
  Z_DEFAULT_COMPRESSION: Z_DEFAULT_COMPRESSION$1,
  Z_FILTERED,
  Z_HUFFMAN_ONLY,
  Z_RLE,
  Z_FIXED,
  Z_DEFAULT_STRATEGY: Z_DEFAULT_STRATEGY$1,
  Z_UNKNOWN,
  Z_DEFLATED: Z_DEFLATED$2
} = constants$2;
var MAX_MEM_LEVEL = 9;
var MAX_WBITS$1 = 15;
var DEF_MEM_LEVEL = 8;
var LENGTH_CODES = 29;
var LITERALS = 256;
var L_CODES = LITERALS + 1 + LENGTH_CODES;
var D_CODES = 30;
var BL_CODES = 19;
var HEAP_SIZE = 2 * L_CODES + 1;
var MAX_BITS = 15;
var MIN_MATCH = 3;
var MAX_MATCH = 258;
var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
var PRESET_DICT = 32;
var INIT_STATE = 42;
var GZIP_STATE = 57;
var EXTRA_STATE = 69;
var NAME_STATE = 73;
var COMMENT_STATE = 91;
var HCRC_STATE = 103;
var BUSY_STATE = 113;
var FINISH_STATE = 666;
var BS_NEED_MORE = 1;
var BS_BLOCK_DONE = 2;
var BS_FINISH_STARTED = 3;
var BS_FINISH_DONE = 4;
var OS_CODE = 3;
var err = (strm, errorCode) => {
  strm.msg = messages[errorCode];
  return errorCode;
};
var rank = (f) => {
  return f * 2 - (f > 4 ? 9 : 0);
};
var zero = (buf) => {
  let len = buf.length;
  while (--len >= 0) {
    buf[len] = 0;
  }
};
var slide_hash = (s) => {
  let n, m;
  let p;
  let wsize = s.w_size;
  n = s.hash_size;
  p = n;
  do {
    m = s.head[--p];
    s.head[p] = m >= wsize ? m - wsize : 0;
  } while (--n);
  n = wsize;
  p = n;
  do {
    m = s.prev[--p];
    s.prev[p] = m >= wsize ? m - wsize : 0;
  } while (--n);
};
var HASH_ZLIB = (s, prev, data) => (prev << s.hash_shift ^ data) & s.hash_mask;
var HASH = HASH_ZLIB;
var flush_pending = (strm) => {
  const s = strm.state;
  let len = s.pending;
  if (len > strm.avail_out) {
    len = strm.avail_out;
  }
  if (len === 0) {
    return;
  }
  strm.output.set(s.pending_buf.subarray(s.pending_out, s.pending_out + len), strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;
  if (s.pending === 0) {
    s.pending_out = 0;
  }
};
var flush_block_only = (s, last) => {
  _tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
};
var put_byte = (s, b) => {
  s.pending_buf[s.pending++] = b;
};
var putShortMSB = (s, b) => {
  s.pending_buf[s.pending++] = b >>> 8 & 255;
  s.pending_buf[s.pending++] = b & 255;
};
var read_buf = (strm, buf, start, size) => {
  let len = strm.avail_in;
  if (len > size) {
    len = size;
  }
  if (len === 0) {
    return 0;
  }
  strm.avail_in -= len;
  buf.set(strm.input.subarray(strm.next_in, strm.next_in + len), start);
  if (strm.state.wrap === 1) {
    strm.adler = adler32_1(strm.adler, buf, len, start);
  } else if (strm.state.wrap === 2) {
    strm.adler = crc32_1(strm.adler, buf, len, start);
  }
  strm.next_in += len;
  strm.total_in += len;
  return len;
};
var longest_match = (s, cur_match) => {
  let chain_length = s.max_chain_length;
  let scan = s.strstart;
  let match;
  let len;
  let best_len = s.prev_length;
  let nice_match = s.nice_match;
  const limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
  const _win = s.window;
  const wmask = s.w_mask;
  const prev = s.prev;
  const strend = s.strstart + MAX_MATCH;
  let scan_end1 = _win[scan + best_len - 1];
  let scan_end = _win[scan + best_len];
  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  if (nice_match > s.lookahead) {
    nice_match = s.lookahead;
  }
  do {
    match = cur_match;
    if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
      continue;
    }
    scan += 2;
    match++;
    do {
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;
    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) {
        break;
      }
      scan_end1 = _win[scan + best_len - 1];
      scan_end = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
  if (best_len <= s.lookahead) {
    return best_len;
  }
  return s.lookahead;
};
var fill_window = (s) => {
  const _w_size = s.w_size;
  let n, more, str;
  do {
    more = s.window_size - s.lookahead - s.strstart;
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
      s.window.set(s.window.subarray(_w_size, _w_size + _w_size - more), 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      s.block_start -= _w_size;
      if (s.insert > s.strstart) {
        s.insert = s.strstart;
      }
      slide_hash(s);
      more += _w_size;
    }
    if (s.strm.avail_in === 0) {
      break;
    }
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;
    if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];
      s.ins_h = HASH(s, s.ins_h, s.window[str + 1]);
      while (s.insert) {
        s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
};
var deflate_stored = (s, flush) => {
  let min_block = s.pending_buf_size - 5 > s.w_size ? s.w_size : s.pending_buf_size - 5;
  let len, left, have, last = 0;
  let used = s.strm.avail_in;
  do {
    len = 65535;
    have = s.bi_valid + 42 >> 3;
    if (s.strm.avail_out < have) {
      break;
    }
    have = s.strm.avail_out - have;
    left = s.strstart - s.block_start;
    if (len > left + s.strm.avail_in) {
      len = left + s.strm.avail_in;
    }
    if (len > have) {
      len = have;
    }
    if (len < min_block && (len === 0 && flush !== Z_FINISH$3 || flush === Z_NO_FLUSH$2 || len !== left + s.strm.avail_in)) {
      break;
    }
    last = flush === Z_FINISH$3 && len === left + s.strm.avail_in ? 1 : 0;
    _tr_stored_block(s, 0, 0, last);
    s.pending_buf[s.pending - 4] = len;
    s.pending_buf[s.pending - 3] = len >> 8;
    s.pending_buf[s.pending - 2] = ~len;
    s.pending_buf[s.pending - 1] = ~len >> 8;
    flush_pending(s.strm);
    if (left) {
      if (left > len) {
        left = len;
      }
      s.strm.output.set(s.window.subarray(s.block_start, s.block_start + left), s.strm.next_out);
      s.strm.next_out += left;
      s.strm.avail_out -= left;
      s.strm.total_out += left;
      s.block_start += left;
      len -= left;
    }
    if (len) {
      read_buf(s.strm, s.strm.output, s.strm.next_out, len);
      s.strm.next_out += len;
      s.strm.avail_out -= len;
      s.strm.total_out += len;
    }
  } while (last === 0);
  used -= s.strm.avail_in;
  if (used) {
    if (used >= s.w_size) {
      s.matches = 2;
      s.window.set(s.strm.input.subarray(s.strm.next_in - s.w_size, s.strm.next_in), 0);
      s.strstart = s.w_size;
      s.insert = s.strstart;
    } else {
      if (s.window_size - s.strstart <= used) {
        s.strstart -= s.w_size;
        s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
        if (s.matches < 2) {
          s.matches++;
        }
        if (s.insert > s.strstart) {
          s.insert = s.strstart;
        }
      }
      s.window.set(s.strm.input.subarray(s.strm.next_in - used, s.strm.next_in), s.strstart);
      s.strstart += used;
      s.insert += used > s.w_size - s.insert ? s.w_size - s.insert : used;
    }
    s.block_start = s.strstart;
  }
  if (s.high_water < s.strstart) {
    s.high_water = s.strstart;
  }
  if (last) {
    return BS_FINISH_DONE;
  }
  if (flush !== Z_NO_FLUSH$2 && flush !== Z_FINISH$3 && s.strm.avail_in === 0 && s.strstart === s.block_start) {
    return BS_BLOCK_DONE;
  }
  have = s.window_size - s.strstart;
  if (s.strm.avail_in > have && s.block_start >= s.w_size) {
    s.block_start -= s.w_size;
    s.strstart -= s.w_size;
    s.window.set(s.window.subarray(s.w_size, s.w_size + s.strstart), 0);
    if (s.matches < 2) {
      s.matches++;
    }
    have += s.w_size;
    if (s.insert > s.strstart) {
      s.insert = s.strstart;
    }
  }
  if (have > s.strm.avail_in) {
    have = s.strm.avail_in;
  }
  if (have) {
    read_buf(s.strm, s.window, s.strstart, have);
    s.strstart += have;
    s.insert += have > s.w_size - s.insert ? s.w_size - s.insert : have;
  }
  if (s.high_water < s.strstart) {
    s.high_water = s.strstart;
  }
  have = s.bi_valid + 42 >> 3;
  have = s.pending_buf_size - have > 65535 ? 65535 : s.pending_buf_size - have;
  min_block = have > s.w_size ? s.w_size : have;
  left = s.strstart - s.block_start;
  if (left >= min_block || (left || flush === Z_FINISH$3) && flush !== Z_NO_FLUSH$2 && s.strm.avail_in === 0 && left <= have) {
    len = left > have ? have : left;
    last = flush === Z_FINISH$3 && s.strm.avail_in === 0 && len === left ? 1 : 0;
    _tr_stored_block(s, s.block_start, len, last);
    s.block_start += len;
    flush_pending(s.strm);
  }
  return last ? BS_FINISH_STARTED : BS_NEED_MORE;
};
var deflate_fast = (s, flush) => {
  let hash_head;
  let bflush;
  for (; ; ) {
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) {
      s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
    }
    if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
      s.match_length = longest_match(s, hash_head);
    }
    if (s.match_length >= MIN_MATCH) {
      bflush = _tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
        s.match_length--;
        do {
          s.strstart++;
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        } while (--s.match_length !== 0);
        s.strstart++;
      } else {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + 1]);
      }
    } else {
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
var deflate_slow = (s, flush) => {
  let hash_head;
  let bflush;
  let max_insert;
  for (; ; ) {
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    hash_head = 0;
    if (s.lookahead >= MIN_MATCH) {
      s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
    }
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH - 1;
    if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
      s.match_length = longest_match(s, hash_head);
      if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) {
        s.match_length = MIN_MATCH - 1;
      }
    }
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
      s.lookahead -= s.prev_length - 1;
      s.prev_length -= 2;
      do {
        if (++s.strstart <= max_insert) {
          s.ins_h = HASH(s, s.ins_h, s.window[s.strstart + MIN_MATCH - 1]);
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
      } while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH - 1;
      s.strstart++;
      if (bflush) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
    } else if (s.match_available) {
      bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
      if (bflush) {
        flush_block_only(s, false);
      }
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  if (s.match_available) {
    bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);
    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
var deflate_rle = (s, flush) => {
  let bflush;
  let prev;
  let scan, strend;
  const _win = s.window;
  for (; ; ) {
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH$2) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break;
      }
    }
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do {
        } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      }
    }
    if (s.match_length >= MIN_MATCH) {
      bflush = _tr_tally(s, 1, s.match_length - MIN_MATCH);
      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      bflush = _tr_tally(s, 0, s.window[s.strstart]);
      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
var deflate_huff = (s, flush) => {
  let bflush;
  for (; ; ) {
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH$2) {
          return BS_NEED_MORE;
        }
        break;
      }
    }
    s.match_length = 0;
    bflush = _tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH$3) {
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    return BS_FINISH_DONE;
  }
  if (s.sym_next) {
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
  }
  return BS_BLOCK_DONE;
};
function Config(good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
}
var configuration_table = [
  /*      good lazy nice chain */
  new Config(0, 0, 0, 0, deflate_stored),
  /* 0 store only */
  new Config(4, 4, 8, 4, deflate_fast),
  /* 1 max speed, no lazy matches */
  new Config(4, 5, 16, 8, deflate_fast),
  /* 2 */
  new Config(4, 6, 32, 32, deflate_fast),
  /* 3 */
  new Config(4, 4, 16, 16, deflate_slow),
  /* 4 lazy matches */
  new Config(8, 16, 32, 32, deflate_slow),
  /* 5 */
  new Config(8, 16, 128, 128, deflate_slow),
  /* 6 */
  new Config(8, 32, 128, 256, deflate_slow),
  /* 7 */
  new Config(32, 128, 258, 1024, deflate_slow),
  /* 8 */
  new Config(32, 258, 258, 4096, deflate_slow)
  /* 9 max compression */
];
var lm_init = (s) => {
  s.window_size = 2 * s.w_size;
  zero(s.head);
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;
  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
};
function DeflateState() {
  this.strm = null;
  this.status = 0;
  this.pending_buf = null;
  this.pending_buf_size = 0;
  this.pending_out = 0;
  this.pending = 0;
  this.wrap = 0;
  this.gzhead = null;
  this.gzindex = 0;
  this.method = Z_DEFLATED$2;
  this.last_flush = -1;
  this.w_size = 0;
  this.w_bits = 0;
  this.w_mask = 0;
  this.window = null;
  this.window_size = 0;
  this.prev = null;
  this.head = null;
  this.ins_h = 0;
  this.hash_size = 0;
  this.hash_bits = 0;
  this.hash_mask = 0;
  this.hash_shift = 0;
  this.block_start = 0;
  this.match_length = 0;
  this.prev_match = 0;
  this.match_available = 0;
  this.strstart = 0;
  this.match_start = 0;
  this.lookahead = 0;
  this.prev_length = 0;
  this.max_chain_length = 0;
  this.max_lazy_match = 0;
  this.level = 0;
  this.strategy = 0;
  this.good_match = 0;
  this.nice_match = 0;
  this.dyn_ltree = new Uint16Array(HEAP_SIZE * 2);
  this.dyn_dtree = new Uint16Array((2 * D_CODES + 1) * 2);
  this.bl_tree = new Uint16Array((2 * BL_CODES + 1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);
  this.l_desc = null;
  this.d_desc = null;
  this.bl_desc = null;
  this.bl_count = new Uint16Array(MAX_BITS + 1);
  this.heap = new Uint16Array(2 * L_CODES + 1);
  zero(this.heap);
  this.heap_len = 0;
  this.heap_max = 0;
  this.depth = new Uint16Array(2 * L_CODES + 1);
  zero(this.depth);
  this.sym_buf = 0;
  this.lit_bufsize = 0;
  this.sym_next = 0;
  this.sym_end = 0;
  this.opt_len = 0;
  this.static_len = 0;
  this.matches = 0;
  this.insert = 0;
  this.bi_buf = 0;
  this.bi_valid = 0;
}
var deflateStateCheck = (strm) => {
  if (!strm) {
    return 1;
  }
  const s = strm.state;
  if (!s || s.strm !== strm || s.status !== INIT_STATE && //#ifdef GZIP
  s.status !== GZIP_STATE && //#endif
  s.status !== EXTRA_STATE && s.status !== NAME_STATE && s.status !== COMMENT_STATE && s.status !== HCRC_STATE && s.status !== BUSY_STATE && s.status !== FINISH_STATE) {
    return 1;
  }
  return 0;
};
var deflateResetKeep = (strm) => {
  if (deflateStateCheck(strm)) {
    return err(strm, Z_STREAM_ERROR$2);
  }
  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;
  const s = strm.state;
  s.pending = 0;
  s.pending_out = 0;
  if (s.wrap < 0) {
    s.wrap = -s.wrap;
  }
  s.status = //#ifdef GZIP
  s.wrap === 2 ? GZIP_STATE : (
    //#endif
    s.wrap ? INIT_STATE : BUSY_STATE
  );
  strm.adler = s.wrap === 2 ? 0 : 1;
  s.last_flush = -2;
  _tr_init(s);
  return Z_OK$3;
};
var deflateReset = (strm) => {
  const ret = deflateResetKeep(strm);
  if (ret === Z_OK$3) {
    lm_init(strm.state);
  }
  return ret;
};
var deflateSetHeader = (strm, head) => {
  if (deflateStateCheck(strm) || strm.state.wrap !== 2) {
    return Z_STREAM_ERROR$2;
  }
  strm.state.gzhead = head;
  return Z_OK$3;
};
var deflateInit2 = (strm, level, method, windowBits, memLevel, strategy) => {
  if (!strm) {
    return Z_STREAM_ERROR$2;
  }
  let wrap = 1;
  if (level === Z_DEFAULT_COMPRESSION$1) {
    level = 6;
  }
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else if (windowBits > 15) {
    wrap = 2;
    windowBits -= 16;
  }
  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED$2 || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED || windowBits === 8 && wrap !== 1) {
    return err(strm, Z_STREAM_ERROR$2);
  }
  if (windowBits === 8) {
    windowBits = 9;
  }
  const s = new DeflateState();
  strm.state = s;
  s.strm = strm;
  s.status = INIT_STATE;
  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;
  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
  s.window = new Uint8Array(s.w_size * 2);
  s.head = new Uint16Array(s.hash_size);
  s.prev = new Uint16Array(s.w_size);
  s.lit_bufsize = 1 << memLevel + 6;
  s.pending_buf_size = s.lit_bufsize * 4;
  s.pending_buf = new Uint8Array(s.pending_buf_size);
  s.sym_buf = s.lit_bufsize;
  s.sym_end = (s.lit_bufsize - 1) * 3;
  s.level = level;
  s.strategy = strategy;
  s.method = method;
  return deflateReset(strm);
};
var deflateInit = (strm, level) => {
  return deflateInit2(strm, level, Z_DEFLATED$2, MAX_WBITS$1, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY$1);
};
var deflate$2 = (strm, flush) => {
  if (deflateStateCheck(strm) || flush > Z_BLOCK$1 || flush < 0) {
    return strm ? err(strm, Z_STREAM_ERROR$2) : Z_STREAM_ERROR$2;
  }
  const s = strm.state;
  if (!strm.output || strm.avail_in !== 0 && !strm.input || s.status === FINISH_STATE && flush !== Z_FINISH$3) {
    return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR$1 : Z_STREAM_ERROR$2);
  }
  const old_flush = s.last_flush;
  s.last_flush = flush;
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      s.last_flush = -1;
      return Z_OK$3;
    }
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH$3) {
    return err(strm, Z_BUF_ERROR$1);
  }
  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err(strm, Z_BUF_ERROR$1);
  }
  if (s.status === INIT_STATE && s.wrap === 0) {
    s.status = BUSY_STATE;
  }
  if (s.status === INIT_STATE) {
    let header = Z_DEFLATED$2 + (s.w_bits - 8 << 4) << 8;
    let level_flags = -1;
    if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
      level_flags = 0;
    } else if (s.level < 6) {
      level_flags = 1;
    } else if (s.level === 6) {
      level_flags = 2;
    } else {
      level_flags = 3;
    }
    header |= level_flags << 6;
    if (s.strstart !== 0) {
      header |= PRESET_DICT;
    }
    header += 31 - header % 31;
    putShortMSB(s, header);
    if (s.strstart !== 0) {
      putShortMSB(s, strm.adler >>> 16);
      putShortMSB(s, strm.adler & 65535);
    }
    strm.adler = 1;
    s.status = BUSY_STATE;
    flush_pending(strm);
    if (s.pending !== 0) {
      s.last_flush = -1;
      return Z_OK$3;
    }
  }
  if (s.status === GZIP_STATE) {
    strm.adler = 0;
    put_byte(s, 31);
    put_byte(s, 139);
    put_byte(s, 8);
    if (!s.gzhead) {
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, 0);
      put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
      put_byte(s, OS_CODE);
      s.status = BUSY_STATE;
      flush_pending(strm);
      if (s.pending !== 0) {
        s.last_flush = -1;
        return Z_OK$3;
      }
    } else {
      put_byte(
        s,
        (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16)
      );
      put_byte(s, s.gzhead.time & 255);
      put_byte(s, s.gzhead.time >> 8 & 255);
      put_byte(s, s.gzhead.time >> 16 & 255);
      put_byte(s, s.gzhead.time >> 24 & 255);
      put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
      put_byte(s, s.gzhead.os & 255);
      if (s.gzhead.extra && s.gzhead.extra.length) {
        put_byte(s, s.gzhead.extra.length & 255);
        put_byte(s, s.gzhead.extra.length >> 8 & 255);
      }
      if (s.gzhead.hcrc) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending, 0);
      }
      s.gzindex = 0;
      s.status = EXTRA_STATE;
    }
  }
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra) {
      let beg = s.pending;
      let left = (s.gzhead.extra.length & 65535) - s.gzindex;
      while (s.pending + left > s.pending_buf_size) {
        let copy = s.pending_buf_size - s.pending;
        s.pending_buf.set(s.gzhead.extra.subarray(s.gzindex, s.gzindex + copy), s.pending);
        s.pending = s.pending_buf_size;
        if (s.gzhead.hcrc && s.pending > beg) {
          strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
        }
        s.gzindex += copy;
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK$3;
        }
        beg = 0;
        left -= copy;
      }
      let gzhead_extra = new Uint8Array(s.gzhead.extra);
      s.pending_buf.set(gzhead_extra.subarray(s.gzindex, s.gzindex + left), s.pending);
      s.pending += left;
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      s.gzindex = 0;
    }
    s.status = NAME_STATE;
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name) {
      let beg = s.pending;
      let val;
      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK$3;
          }
          beg = 0;
        }
        if (s.gzindex < s.gzhead.name.length) {
          val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      s.gzindex = 0;
    }
    s.status = COMMENT_STATE;
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment) {
      let beg = s.pending;
      let val;
      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          if (s.pending !== 0) {
            s.last_flush = -1;
            return Z_OK$3;
          }
          beg = 0;
        }
        if (s.gzindex < s.gzhead.comment.length) {
          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32_1(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
    }
    s.status = HCRC_STATE;
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
        if (s.pending !== 0) {
          s.last_flush = -1;
          return Z_OK$3;
        }
      }
      put_byte(s, strm.adler & 255);
      put_byte(s, strm.adler >> 8 & 255);
      strm.adler = 0;
    }
    s.status = BUSY_STATE;
    flush_pending(strm);
    if (s.pending !== 0) {
      s.last_flush = -1;
      return Z_OK$3;
    }
  }
  if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH$2 && s.status !== FINISH_STATE) {
    let bstate = s.level === 0 ? deflate_stored(s, flush) : s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
      }
      return Z_OK$3;
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        _tr_align(s);
      } else if (flush !== Z_BLOCK$1) {
        _tr_stored_block(s, 0, 0, false);
        if (flush === Z_FULL_FLUSH$1) {
          zero(s.head);
          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        return Z_OK$3;
      }
    }
  }
  if (flush !== Z_FINISH$3) {
    return Z_OK$3;
  }
  if (s.wrap <= 0) {
    return Z_STREAM_END$3;
  }
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 255);
    put_byte(s, strm.adler >> 8 & 255);
    put_byte(s, strm.adler >> 16 & 255);
    put_byte(s, strm.adler >> 24 & 255);
    put_byte(s, strm.total_in & 255);
    put_byte(s, strm.total_in >> 8 & 255);
    put_byte(s, strm.total_in >> 16 & 255);
    put_byte(s, strm.total_in >> 24 & 255);
  } else {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 65535);
  }
  flush_pending(strm);
  if (s.wrap > 0) {
    s.wrap = -s.wrap;
  }
  return s.pending !== 0 ? Z_OK$3 : Z_STREAM_END$3;
};
var deflateEnd = (strm) => {
  if (deflateStateCheck(strm)) {
    return Z_STREAM_ERROR$2;
  }
  const status = strm.state.status;
  strm.state = null;
  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR$2) : Z_OK$3;
};
var deflateSetDictionary = (strm, dictionary) => {
  let dictLength = dictionary.length;
  if (deflateStateCheck(strm)) {
    return Z_STREAM_ERROR$2;
  }
  const s = strm.state;
  const wrap = s.wrap;
  if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
    return Z_STREAM_ERROR$2;
  }
  if (wrap === 1) {
    strm.adler = adler32_1(strm.adler, dictionary, dictLength, 0);
  }
  s.wrap = 0;
  if (dictLength >= s.w_size) {
    if (wrap === 0) {
      zero(s.head);
      s.strstart = 0;
      s.block_start = 0;
      s.insert = 0;
    }
    let tmpDict = new Uint8Array(s.w_size);
    tmpDict.set(dictionary.subarray(dictLength - s.w_size, dictLength), 0);
    dictionary = tmpDict;
    dictLength = s.w_size;
  }
  const avail = strm.avail_in;
  const next = strm.next_in;
  const input = strm.input;
  strm.avail_in = dictLength;
  strm.next_in = 0;
  strm.input = dictionary;
  fill_window(s);
  while (s.lookahead >= MIN_MATCH) {
    let str = s.strstart;
    let n = s.lookahead - (MIN_MATCH - 1);
    do {
      s.ins_h = HASH(s, s.ins_h, s.window[str + MIN_MATCH - 1]);
      s.prev[str & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = str;
      str++;
    } while (--n);
    s.strstart = str;
    s.lookahead = MIN_MATCH - 1;
    fill_window(s);
  }
  s.strstart += s.lookahead;
  s.block_start = s.strstart;
  s.insert = s.lookahead;
  s.lookahead = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  strm.next_in = next;
  strm.input = input;
  strm.avail_in = avail;
  s.wrap = wrap;
  return Z_OK$3;
};
var deflateInit_1 = deflateInit;
var deflateInit2_1 = deflateInit2;
var deflateReset_1 = deflateReset;
var deflateResetKeep_1 = deflateResetKeep;
var deflateSetHeader_1 = deflateSetHeader;
var deflate_2$1 = deflate$2;
var deflateEnd_1 = deflateEnd;
var deflateSetDictionary_1 = deflateSetDictionary;
var deflateInfo = "pako deflate (from Nodeca project)";
var deflate_1$2 = {
  deflateInit: deflateInit_1,
  deflateInit2: deflateInit2_1,
  deflateReset: deflateReset_1,
  deflateResetKeep: deflateResetKeep_1,
  deflateSetHeader: deflateSetHeader_1,
  deflate: deflate_2$1,
  deflateEnd: deflateEnd_1,
  deflateSetDictionary: deflateSetDictionary_1,
  deflateInfo
};
var _has = (obj, key) => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};
var assign = function(obj) {
  const sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    const source = sources.shift();
    if (!source) {
      continue;
    }
    if (typeof source !== "object") {
      throw new TypeError(source + "must be non-object");
    }
    for (const p in source) {
      if (_has(source, p)) {
        obj[p] = source[p];
      }
    }
  }
  return obj;
};
var flattenChunks = (chunks) => {
  let len = 0;
  for (let i = 0, l = chunks.length; i < l; i++) {
    len += chunks[i].length;
  }
  const result = new Uint8Array(len);
  for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
    let chunk = chunks[i];
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
};
var common = {
  assign,
  flattenChunks
};
var STR_APPLY_UIA_OK = true;
try {
  String.fromCharCode.apply(null, new Uint8Array(1));
} catch (__) {
  STR_APPLY_UIA_OK = false;
}
var _utf8len = new Uint8Array(256);
for (let q = 0; q < 256; q++) {
  _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
}
_utf8len[254] = _utf8len[254] = 1;
var string2buf = (str) => {
  if (typeof TextEncoder === "function" && TextEncoder.prototype.encode) {
    return new TextEncoder().encode(str);
  }
  let buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 64512) === 56320) {
        c = 65536 + (c - 55296 << 10) + (c2 - 56320);
        m_pos++;
      }
    }
    buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
  }
  buf = new Uint8Array(buf_len);
  for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
      c2 = str.charCodeAt(m_pos + 1);
      if ((c2 & 64512) === 56320) {
        c = 65536 + (c - 55296 << 10) + (c2 - 56320);
        m_pos++;
      }
    }
    if (c < 128) {
      buf[i++] = c;
    } else if (c < 2048) {
      buf[i++] = 192 | c >>> 6;
      buf[i++] = 128 | c & 63;
    } else if (c < 65536) {
      buf[i++] = 224 | c >>> 12;
      buf[i++] = 128 | c >>> 6 & 63;
      buf[i++] = 128 | c & 63;
    } else {
      buf[i++] = 240 | c >>> 18;
      buf[i++] = 128 | c >>> 12 & 63;
      buf[i++] = 128 | c >>> 6 & 63;
      buf[i++] = 128 | c & 63;
    }
  }
  return buf;
};
var buf2binstring = (buf, len) => {
  if (len < 65534) {
    if (buf.subarray && STR_APPLY_UIA_OK) {
      return String.fromCharCode.apply(null, buf.length === len ? buf : buf.subarray(0, len));
    }
  }
  let result = "";
  for (let i = 0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
};
var buf2string = (buf, max) => {
  const len = max || buf.length;
  if (typeof TextDecoder === "function" && TextDecoder.prototype.decode) {
    return new TextDecoder().decode(buf.subarray(0, max));
  }
  let i, out;
  const utf16buf = new Array(len * 2);
  for (out = 0, i = 0; i < len; ) {
    let c = buf[i++];
    if (c < 128) {
      utf16buf[out++] = c;
      continue;
    }
    let c_len = _utf8len[c];
    if (c_len > 4) {
      utf16buf[out++] = 65533;
      i += c_len - 1;
      continue;
    }
    c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
    while (c_len > 1 && i < len) {
      c = c << 6 | buf[i++] & 63;
      c_len--;
    }
    if (c_len > 1) {
      utf16buf[out++] = 65533;
      continue;
    }
    if (c < 65536) {
      utf16buf[out++] = c;
    } else {
      c -= 65536;
      utf16buf[out++] = 55296 | c >> 10 & 1023;
      utf16buf[out++] = 56320 | c & 1023;
    }
  }
  return buf2binstring(utf16buf, out);
};
var utf8border = (buf, max) => {
  max = max || buf.length;
  if (max > buf.length) {
    max = buf.length;
  }
  let pos = max - 1;
  while (pos >= 0 && (buf[pos] & 192) === 128) {
    pos--;
  }
  if (pos < 0) {
    return max;
  }
  if (pos === 0) {
    return max;
  }
  return pos + _utf8len[buf[pos]] > max ? pos : max;
};
var strings = {
  string2buf,
  buf2string,
  utf8border
};
function ZStream() {
  this.input = null;
  this.next_in = 0;
  this.avail_in = 0;
  this.total_in = 0;
  this.output = null;
  this.next_out = 0;
  this.avail_out = 0;
  this.total_out = 0;
  this.msg = "";
  this.state = null;
  this.data_type = 2;
  this.adler = 0;
}
var zstream = ZStream;
var toString$1 = Object.prototype.toString;
var {
  Z_NO_FLUSH: Z_NO_FLUSH$1,
  Z_SYNC_FLUSH,
  Z_FULL_FLUSH,
  Z_FINISH: Z_FINISH$2,
  Z_OK: Z_OK$2,
  Z_STREAM_END: Z_STREAM_END$2,
  Z_DEFAULT_COMPRESSION,
  Z_DEFAULT_STRATEGY,
  Z_DEFLATED: Z_DEFLATED$1
} = constants$2;
function Deflate$1(options) {
  this.options = common.assign({
    level: Z_DEFAULT_COMPRESSION,
    method: Z_DEFLATED$1,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: Z_DEFAULT_STRATEGY
  }, options || {});
  let opt = this.options;
  if (opt.raw && opt.windowBits > 0) {
    opt.windowBits = -opt.windowBits;
  } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
    opt.windowBits += 16;
  }
  this.err = 0;
  this.msg = "";
  this.ended = false;
  this.chunks = [];
  this.strm = new zstream();
  this.strm.avail_out = 0;
  let status = deflate_1$2.deflateInit2(
    this.strm,
    opt.level,
    opt.method,
    opt.windowBits,
    opt.memLevel,
    opt.strategy
  );
  if (status !== Z_OK$2) {
    throw new Error(messages[status]);
  }
  if (opt.header) {
    deflate_1$2.deflateSetHeader(this.strm, opt.header);
  }
  if (opt.dictionary) {
    let dict;
    if (typeof opt.dictionary === "string") {
      dict = strings.string2buf(opt.dictionary);
    } else if (toString$1.call(opt.dictionary) === "[object ArrayBuffer]") {
      dict = new Uint8Array(opt.dictionary);
    } else {
      dict = opt.dictionary;
    }
    status = deflate_1$2.deflateSetDictionary(this.strm, dict);
    if (status !== Z_OK$2) {
      throw new Error(messages[status]);
    }
    this._dict_set = true;
  }
}
Deflate$1.prototype.push = function(data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  let status, _flush_mode;
  if (this.ended) {
    return false;
  }
  if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
  else _flush_mode = flush_mode === true ? Z_FINISH$2 : Z_NO_FLUSH$1;
  if (typeof data === "string") {
    strm.input = strings.string2buf(data);
  } else if (toString$1.call(data) === "[object ArrayBuffer]") {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (; ; ) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    if ((_flush_mode === Z_SYNC_FLUSH || _flush_mode === Z_FULL_FLUSH) && strm.avail_out <= 6) {
      this.onData(strm.output.subarray(0, strm.next_out));
      strm.avail_out = 0;
      continue;
    }
    status = deflate_1$2.deflate(strm, _flush_mode);
    if (status === Z_STREAM_END$2) {
      if (strm.next_out > 0) {
        this.onData(strm.output.subarray(0, strm.next_out));
      }
      status = deflate_1$2.deflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return status === Z_OK$2;
    }
    if (strm.avail_out === 0) {
      this.onData(strm.output);
      continue;
    }
    if (_flush_mode > 0 && strm.next_out > 0) {
      this.onData(strm.output.subarray(0, strm.next_out));
      strm.avail_out = 0;
      continue;
    }
    if (strm.avail_in === 0) break;
  }
  return true;
};
Deflate$1.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};
Deflate$1.prototype.onEnd = function(status) {
  if (status === Z_OK$2) {
    this.result = common.flattenChunks(this.chunks);
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function deflate$1(input, options) {
  const deflator = new Deflate$1(options);
  deflator.push(input, true);
  if (deflator.err) {
    throw deflator.msg || messages[deflator.err];
  }
  return deflator.result;
}
function deflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return deflate$1(input, options);
}
function gzip$1(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate$1(input, options);
}
var Deflate_1$1 = Deflate$1;
var deflate_2 = deflate$1;
var deflateRaw_1$1 = deflateRaw$1;
var gzip_1$1 = gzip$1;
var constants$1 = constants$2;
var deflate_1$1 = {
  Deflate: Deflate_1$1,
  deflate: deflate_2,
  deflateRaw: deflateRaw_1$1,
  gzip: gzip_1$1,
  constants: constants$1
};
var BAD$1 = 16209;
var TYPE$1 = 16191;
var inffast = function inflate_fast(strm, start) {
  let _in;
  let last;
  let _out;
  let beg;
  let end;
  let dmax;
  let wsize;
  let whave;
  let wnext;
  let s_window;
  let hold;
  let bits;
  let lcode;
  let dcode;
  let lmask;
  let dmask;
  let here;
  let op;
  let len;
  let dist;
  let from;
  let from_source;
  let input, output;
  const state = strm.state;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
  dmax = state.dmax;
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;
  top:
    do {
      if (bits < 15) {
        hold += input[_in++] << bits;
        bits += 8;
        hold += input[_in++] << bits;
        bits += 8;
      }
      here = lcode[hold & lmask];
      dolen:
        for (; ; ) {
          op = here >>> 24;
          hold >>>= op;
          bits -= op;
          op = here >>> 16 & 255;
          if (op === 0) {
            output[_out++] = here & 65535;
          } else if (op & 16) {
            len = here & 65535;
            op &= 15;
            if (op) {
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
              len += hold & (1 << op) - 1;
              hold >>>= op;
              bits -= op;
            }
            if (bits < 15) {
              hold += input[_in++] << bits;
              bits += 8;
              hold += input[_in++] << bits;
              bits += 8;
            }
            here = dcode[hold & dmask];
            dodist:
              for (; ; ) {
                op = here >>> 24;
                hold >>>= op;
                bits -= op;
                op = here >>> 16 & 255;
                if (op & 16) {
                  dist = here & 65535;
                  op &= 15;
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                    if (bits < op) {
                      hold += input[_in++] << bits;
                      bits += 8;
                    }
                  }
                  dist += hold & (1 << op) - 1;
                  if (dist > dmax) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD$1;
                    break top;
                  }
                  hold >>>= op;
                  bits -= op;
                  op = _out - beg;
                  if (dist > op) {
                    op = dist - op;
                    if (op > whave) {
                      if (state.sane) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD$1;
                        break top;
                      }
                    }
                    from = 0;
                    from_source = s_window;
                    if (wnext === 0) {
                      from += wsize - op;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    } else if (wnext < op) {
                      from += wsize + wnext - op;
                      op -= wnext;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = 0;
                        if (wnext < len) {
                          op = wnext;
                          len -= op;
                          do {
                            output[_out++] = s_window[from++];
                          } while (--op);
                          from = _out - dist;
                          from_source = output;
                        }
                      }
                    } else {
                      from += wnext - op;
                      if (op < len) {
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;
                        from_source = output;
                      }
                    }
                    while (len > 2) {
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      output[_out++] = from_source[from++];
                      len -= 3;
                    }
                    if (len) {
                      output[_out++] = from_source[from++];
                      if (len > 1) {
                        output[_out++] = from_source[from++];
                      }
                    }
                  } else {
                    from = _out - dist;
                    do {
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      output[_out++] = output[from++];
                      len -= 3;
                    } while (len > 2);
                    if (len) {
                      output[_out++] = output[from++];
                      if (len > 1) {
                        output[_out++] = output[from++];
                      }
                    }
                  }
                } else if ((op & 64) === 0) {
                  here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                  continue dodist;
                } else {
                  strm.msg = "invalid distance code";
                  state.mode = BAD$1;
                  break top;
                }
                break;
              }
          } else if ((op & 64) === 0) {
            here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
            continue dolen;
          } else if (op & 32) {
            state.mode = TYPE$1;
            break top;
          } else {
            strm.msg = "invalid literal/length code";
            state.mode = BAD$1;
            break top;
          }
          break;
        }
    } while (_in < last && _out < end);
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
  strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
  state.hold = hold;
  state.bits = bits;
  return;
};
var MAXBITS = 15;
var ENOUGH_LENS$1 = 852;
var ENOUGH_DISTS$1 = 592;
var CODES$1 = 0;
var LENS$1 = 1;
var DISTS$1 = 2;
var lbase = new Uint16Array([
  /* Length codes 257..285 base */
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0
]);
var lext = new Uint8Array([
  /* Length codes 257..285 extra */
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  16,
  72,
  78
]);
var dbase = new Uint16Array([
  /* Distance codes 0..29 base */
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
  0,
  0
]);
var dext = new Uint8Array([
  /* Distance codes 0..29 extra */
  16,
  16,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  64,
  64
]);
var inflate_table = (type, lens, lens_index, codes, table, table_index, work, opts) => {
  const bits = opts.bits;
  let len = 0;
  let sym = 0;
  let min = 0, max = 0;
  let root = 0;
  let curr = 0;
  let drop = 0;
  let left = 0;
  let used = 0;
  let huff = 0;
  let incr;
  let fill;
  let low;
  let mask;
  let next;
  let base2 = null;
  let match;
  const count = new Uint16Array(MAXBITS + 1);
  const offs = new Uint16Array(MAXBITS + 1);
  let extra = null;
  let here_bits, here_op, here_val;
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) {
      break;
    }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    table[table_index++] = 1 << 24 | 64 << 16 | 0;
    opts.bits = 1;
    return 0;
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) {
      break;
    }
  }
  if (root < min) {
    root = min;
  }
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }
  }
  if (left > 0 && (type === CODES$1 || max !== 1)) {
    return -1;
  }
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }
  if (type === CODES$1) {
    base2 = extra = work;
    match = 20;
  } else if (type === LENS$1) {
    base2 = lbase;
    extra = lext;
    match = 257;
  } else {
    base2 = dbase;
    extra = dext;
    match = 0;
  }
  huff = 0;
  sym = 0;
  len = min;
  next = table_index;
  curr = root;
  drop = 0;
  low = -1;
  used = 1 << root;
  mask = used - 1;
  if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
    return 1;
  }
  for (; ; ) {
    here_bits = len - drop;
    if (work[sym] + 1 < match) {
      here_op = 0;
      here_val = work[sym];
    } else if (work[sym] >= match) {
      here_op = extra[work[sym] - match];
      here_val = base2[work[sym] - match];
    } else {
      here_op = 32 + 64;
      here_val = 0;
    }
    incr = 1 << len - drop;
    fill = 1 << curr;
    min = fill;
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
    } while (fill !== 0);
    incr = 1 << len - 1;
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }
    sym++;
    if (--count[len] === 0) {
      if (len === max) {
        break;
      }
      len = lens[lens_index + work[sym]];
    }
    if (len > root && (huff & mask) !== low) {
      if (drop === 0) {
        drop = root;
      }
      next += min;
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) {
          break;
        }
        curr++;
        left <<= 1;
      }
      used += 1 << curr;
      if (type === LENS$1 && used > ENOUGH_LENS$1 || type === DISTS$1 && used > ENOUGH_DISTS$1) {
        return 1;
      }
      low = huff & mask;
      table[low] = root << 24 | curr << 16 | next - table_index | 0;
    }
  }
  if (huff !== 0) {
    table[next + huff] = len - drop << 24 | 64 << 16 | 0;
  }
  opts.bits = root;
  return 0;
};
var inftrees = inflate_table;
var CODES = 0;
var LENS = 1;
var DISTS = 2;
var {
  Z_FINISH: Z_FINISH$1,
  Z_BLOCK,
  Z_TREES,
  Z_OK: Z_OK$1,
  Z_STREAM_END: Z_STREAM_END$1,
  Z_NEED_DICT: Z_NEED_DICT$1,
  Z_STREAM_ERROR: Z_STREAM_ERROR$1,
  Z_DATA_ERROR: Z_DATA_ERROR$1,
  Z_MEM_ERROR: Z_MEM_ERROR$1,
  Z_BUF_ERROR,
  Z_DEFLATED
} = constants$2;
var HEAD = 16180;
var FLAGS = 16181;
var TIME = 16182;
var OS = 16183;
var EXLEN = 16184;
var EXTRA = 16185;
var NAME = 16186;
var COMMENT = 16187;
var HCRC = 16188;
var DICTID = 16189;
var DICT = 16190;
var TYPE = 16191;
var TYPEDO = 16192;
var STORED = 16193;
var COPY_ = 16194;
var COPY = 16195;
var TABLE = 16196;
var LENLENS = 16197;
var CODELENS = 16198;
var LEN_ = 16199;
var LEN = 16200;
var LENEXT = 16201;
var DIST = 16202;
var DISTEXT = 16203;
var MATCH = 16204;
var LIT = 16205;
var CHECK = 16206;
var LENGTH = 16207;
var DONE = 16208;
var BAD = 16209;
var MEM = 16210;
var SYNC = 16211;
var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
var MAX_WBITS = 15;
var DEF_WBITS = MAX_WBITS;
var zswap32 = (q) => {
  return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
};
function InflateState() {
  this.strm = null;
  this.mode = 0;
  this.last = false;
  this.wrap = 0;
  this.havedict = false;
  this.flags = 0;
  this.dmax = 0;
  this.check = 0;
  this.total = 0;
  this.head = null;
  this.wbits = 0;
  this.wsize = 0;
  this.whave = 0;
  this.wnext = 0;
  this.window = null;
  this.hold = 0;
  this.bits = 0;
  this.length = 0;
  this.offset = 0;
  this.extra = 0;
  this.lencode = null;
  this.distcode = null;
  this.lenbits = 0;
  this.distbits = 0;
  this.ncode = 0;
  this.nlen = 0;
  this.ndist = 0;
  this.have = 0;
  this.next = null;
  this.lens = new Uint16Array(320);
  this.work = new Uint16Array(288);
  this.lendyn = null;
  this.distdyn = null;
  this.sane = 0;
  this.back = 0;
  this.was = 0;
}
var inflateStateCheck = (strm) => {
  if (!strm) {
    return 1;
  }
  const state = strm.state;
  if (!state || state.strm !== strm || state.mode < HEAD || state.mode > SYNC) {
    return 1;
  }
  return 0;
};
var inflateResetKeep = (strm) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = "";
  if (state.wrap) {
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.flags = -1;
  state.dmax = 32768;
  state.head = null;
  state.hold = 0;
  state.bits = 0;
  state.lencode = state.lendyn = new Int32Array(ENOUGH_LENS);
  state.distcode = state.distdyn = new Int32Array(ENOUGH_DISTS);
  state.sane = 1;
  state.back = -1;
  return Z_OK$1;
};
var inflateReset = (strm) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);
};
var inflateReset2 = (strm, windowBits) => {
  let wrap;
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  } else {
    wrap = (windowBits >> 4) + 5;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR$1;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
};
var inflateInit2 = (strm, windowBits) => {
  if (!strm) {
    return Z_STREAM_ERROR$1;
  }
  const state = new InflateState();
  strm.state = state;
  state.strm = strm;
  state.window = null;
  state.mode = HEAD;
  const ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK$1) {
    strm.state = null;
  }
  return ret;
};
var inflateInit = (strm) => {
  return inflateInit2(strm, DEF_WBITS);
};
var virgin = true;
var lenfix;
var distfix;
var fixedtables = (state) => {
  if (virgin) {
    lenfix = new Int32Array(512);
    distfix = new Int32Array(32);
    let sym = 0;
    while (sym < 144) {
      state.lens[sym++] = 8;
    }
    while (sym < 256) {
      state.lens[sym++] = 9;
    }
    while (sym < 280) {
      state.lens[sym++] = 7;
    }
    while (sym < 288) {
      state.lens[sym++] = 8;
    }
    inftrees(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
    sym = 0;
    while (sym < 32) {
      state.lens[sym++] = 5;
    }
    inftrees(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
    virgin = false;
  }
  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
};
var updatewindow = (strm, src, end, copy) => {
  let dist;
  const state = strm.state;
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;
    state.window = new Uint8Array(state.wsize);
  }
  if (copy >= state.wsize) {
    state.window.set(src.subarray(end - state.wsize, end), 0);
    state.wnext = 0;
    state.whave = state.wsize;
  } else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    state.window.set(src.subarray(end - copy, end - copy + dist), state.wnext);
    copy -= dist;
    if (copy) {
      state.window.set(src.subarray(end - copy, end), 0);
      state.wnext = copy;
      state.whave = state.wsize;
    } else {
      state.wnext += dist;
      if (state.wnext === state.wsize) {
        state.wnext = 0;
      }
      if (state.whave < state.wsize) {
        state.whave += dist;
      }
    }
  }
  return 0;
};
var inflate$2 = (strm, flush) => {
  let state;
  let input, output;
  let next;
  let put;
  let have, left;
  let hold;
  let bits;
  let _in, _out;
  let copy;
  let from;
  let from_source;
  let here = 0;
  let here_bits, here_op, here_val;
  let last_bits, last_op, last_val;
  let len;
  let ret;
  const hbuf = new Uint8Array(4);
  let opts;
  let n;
  const order = (
    /* permutation of code lengths */
    new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
  );
  if (inflateStateCheck(strm) || !strm.output || !strm.input && strm.avail_in !== 0) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.mode === TYPE) {
    state.mode = TYPEDO;
  }
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  _in = have;
  _out = left;
  ret = Z_OK$1;
  inf_leave:
    for (; ; ) {
      switch (state.mode) {
        case HEAD:
          if (state.wrap === 0) {
            state.mode = TYPEDO;
            break;
          }
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.wrap & 2 && hold === 35615) {
            if (state.wbits === 0) {
              state.wbits = 15;
            }
            state.check = 0;
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
            hold = 0;
            bits = 0;
            state.mode = FLAGS;
            break;
          }
          if (state.head) {
            state.head.done = false;
          }
          if (!(state.wrap & 1) || /* check if zlib header allowed */
          (((hold & 255) << 8) + (hold >> 8)) % 31) {
            strm.msg = "incorrect header check";
            state.mode = BAD;
            break;
          }
          if ((hold & 15) !== Z_DEFLATED) {
            strm.msg = "unknown compression method";
            state.mode = BAD;
            break;
          }
          hold >>>= 4;
          bits -= 4;
          len = (hold & 15) + 8;
          if (state.wbits === 0) {
            state.wbits = len;
          }
          if (len > 15 || len > state.wbits) {
            strm.msg = "invalid window size";
            state.mode = BAD;
            break;
          }
          state.dmax = 1 << state.wbits;
          state.flags = 0;
          strm.adler = state.check = 1;
          state.mode = hold & 512 ? DICTID : TYPE;
          hold = 0;
          bits = 0;
          break;
        case FLAGS:
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.flags = hold;
          if ((state.flags & 255) !== Z_DEFLATED) {
            strm.msg = "unknown compression method";
            state.mode = BAD;
            break;
          }
          if (state.flags & 57344) {
            strm.msg = "unknown header flags set";
            state.mode = BAD;
            break;
          }
          if (state.head) {
            state.head.text = hold >> 8 & 1;
          }
          if (state.flags & 512 && state.wrap & 4) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = TIME;
        /* falls through */
        case TIME:
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.head) {
            state.head.time = hold;
          }
          if (state.flags & 512 && state.wrap & 4) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            hbuf[2] = hold >>> 16 & 255;
            hbuf[3] = hold >>> 24 & 255;
            state.check = crc32_1(state.check, hbuf, 4, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = OS;
        /* falls through */
        case OS:
          while (bits < 16) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (state.head) {
            state.head.xflags = hold & 255;
            state.head.os = hold >> 8;
          }
          if (state.flags & 512 && state.wrap & 4) {
            hbuf[0] = hold & 255;
            hbuf[1] = hold >>> 8 & 255;
            state.check = crc32_1(state.check, hbuf, 2, 0);
          }
          hold = 0;
          bits = 0;
          state.mode = EXLEN;
        /* falls through */
        case EXLEN:
          if (state.flags & 1024) {
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.length = hold;
            if (state.head) {
              state.head.extra_len = hold;
            }
            if (state.flags & 512 && state.wrap & 4) {
              hbuf[0] = hold & 255;
              hbuf[1] = hold >>> 8 & 255;
              state.check = crc32_1(state.check, hbuf, 2, 0);
            }
            hold = 0;
            bits = 0;
          } else if (state.head) {
            state.head.extra = null;
          }
          state.mode = EXTRA;
        /* falls through */
        case EXTRA:
          if (state.flags & 1024) {
            copy = state.length;
            if (copy > have) {
              copy = have;
            }
            if (copy) {
              if (state.head) {
                len = state.head.extra_len - state.length;
                if (!state.head.extra) {
                  state.head.extra = new Uint8Array(state.head.extra_len);
                }
                state.head.extra.set(
                  input.subarray(
                    next,
                    // extra field is limited to 65536 bytes
                    // - no need for additional size check
                    next + copy
                  ),
                  /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                  len
                );
              }
              if (state.flags & 512 && state.wrap & 4) {
                state.check = crc32_1(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              state.length -= copy;
            }
            if (state.length) {
              break inf_leave;
            }
          }
          state.length = 0;
          state.mode = NAME;
        /* falls through */
        case NAME:
          if (state.flags & 2048) {
            if (have === 0) {
              break inf_leave;
            }
            copy = 0;
            do {
              len = input[next + copy++];
              if (state.head && len && state.length < 65536) {
                state.head.name += String.fromCharCode(len);
              }
            } while (len && copy < have);
            if (state.flags & 512 && state.wrap & 4) {
              state.check = crc32_1(state.check, input, copy, next);
            }
            have -= copy;
            next += copy;
            if (len) {
              break inf_leave;
            }
          } else if (state.head) {
            state.head.name = null;
          }
          state.length = 0;
          state.mode = COMMENT;
        /* falls through */
        case COMMENT:
          if (state.flags & 4096) {
            if (have === 0) {
              break inf_leave;
            }
            copy = 0;
            do {
              len = input[next + copy++];
              if (state.head && len && state.length < 65536) {
                state.head.comment += String.fromCharCode(len);
              }
            } while (len && copy < have);
            if (state.flags & 512 && state.wrap & 4) {
              state.check = crc32_1(state.check, input, copy, next);
            }
            have -= copy;
            next += copy;
            if (len) {
              break inf_leave;
            }
          } else if (state.head) {
            state.head.comment = null;
          }
          state.mode = HCRC;
        /* falls through */
        case HCRC:
          if (state.flags & 512) {
            while (bits < 16) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.wrap & 4 && hold !== (state.check & 65535)) {
              strm.msg = "header crc mismatch";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          if (state.head) {
            state.head.hcrc = state.flags >> 9 & 1;
            state.head.done = true;
          }
          strm.adler = state.check = 0;
          state.mode = TYPE;
          break;
        case DICTID:
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          strm.adler = state.check = zswap32(hold);
          hold = 0;
          bits = 0;
          state.mode = DICT;
        /* falls through */
        case DICT:
          if (state.havedict === 0) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;
            return Z_NEED_DICT$1;
          }
          strm.adler = state.check = 1;
          state.mode = TYPE;
        /* falls through */
        case TYPE:
          if (flush === Z_BLOCK || flush === Z_TREES) {
            break inf_leave;
          }
        /* falls through */
        case TYPEDO:
          if (state.last) {
            hold >>>= bits & 7;
            bits -= bits & 7;
            state.mode = CHECK;
            break;
          }
          while (bits < 3) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.last = hold & 1;
          hold >>>= 1;
          bits -= 1;
          switch (hold & 3) {
            case 0:
              state.mode = STORED;
              break;
            case 1:
              fixedtables(state);
              state.mode = LEN_;
              if (flush === Z_TREES) {
                hold >>>= 2;
                bits -= 2;
                break inf_leave;
              }
              break;
            case 2:
              state.mode = TABLE;
              break;
            case 3:
              strm.msg = "invalid block type";
              state.mode = BAD;
          }
          hold >>>= 2;
          bits -= 2;
          break;
        case STORED:
          hold >>>= bits & 7;
          bits -= bits & 7;
          while (bits < 32) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
            strm.msg = "invalid stored block lengths";
            state.mode = BAD;
            break;
          }
          state.length = hold & 65535;
          hold = 0;
          bits = 0;
          state.mode = COPY_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        /* falls through */
        case COPY_:
          state.mode = COPY;
        /* falls through */
        case COPY:
          copy = state.length;
          if (copy) {
            if (copy > have) {
              copy = have;
            }
            if (copy > left) {
              copy = left;
            }
            if (copy === 0) {
              break inf_leave;
            }
            output.set(input.subarray(next, next + copy), put);
            have -= copy;
            next += copy;
            left -= copy;
            put += copy;
            state.length -= copy;
            break;
          }
          state.mode = TYPE;
          break;
        case TABLE:
          while (bits < 14) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          state.nlen = (hold & 31) + 257;
          hold >>>= 5;
          bits -= 5;
          state.ndist = (hold & 31) + 1;
          hold >>>= 5;
          bits -= 5;
          state.ncode = (hold & 15) + 4;
          hold >>>= 4;
          bits -= 4;
          if (state.nlen > 286 || state.ndist > 30) {
            strm.msg = "too many length or distance symbols";
            state.mode = BAD;
            break;
          }
          state.have = 0;
          state.mode = LENLENS;
        /* falls through */
        case LENLENS:
          while (state.have < state.ncode) {
            while (bits < 3) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.lens[order[state.have++]] = hold & 7;
            hold >>>= 3;
            bits -= 3;
          }
          while (state.have < 19) {
            state.lens[order[state.have++]] = 0;
          }
          state.lencode = state.lendyn;
          state.lenbits = 7;
          opts = { bits: state.lenbits };
          ret = inftrees(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;
          if (ret) {
            strm.msg = "invalid code lengths set";
            state.mode = BAD;
            break;
          }
          state.have = 0;
          state.mode = CODELENS;
        /* falls through */
        case CODELENS:
          while (state.have < state.nlen + state.ndist) {
            for (; ; ) {
              here = state.lencode[hold & (1 << state.lenbits) - 1];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (here_val < 16) {
              hold >>>= here_bits;
              bits -= here_bits;
              state.lens[state.have++] = here_val;
            } else {
              if (here_val === 16) {
                n = here_bits + 2;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                if (state.have === 0) {
                  strm.msg = "invalid bit length repeat";
                  state.mode = BAD;
                  break;
                }
                len = state.lens[state.have - 1];
                copy = 3 + (hold & 3);
                hold >>>= 2;
                bits -= 2;
              } else if (here_val === 17) {
                n = here_bits + 3;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                len = 0;
                copy = 3 + (hold & 7);
                hold >>>= 3;
                bits -= 3;
              } else {
                n = here_bits + 7;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= here_bits;
                bits -= here_bits;
                len = 0;
                copy = 11 + (hold & 127);
                hold >>>= 7;
                bits -= 7;
              }
              if (state.have + copy > state.nlen + state.ndist) {
                strm.msg = "invalid bit length repeat";
                state.mode = BAD;
                break;
              }
              while (copy--) {
                state.lens[state.have++] = len;
              }
            }
          }
          if (state.mode === BAD) {
            break;
          }
          if (state.lens[256] === 0) {
            strm.msg = "invalid code -- missing end-of-block";
            state.mode = BAD;
            break;
          }
          state.lenbits = 9;
          opts = { bits: state.lenbits };
          ret = inftrees(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;
          if (ret) {
            strm.msg = "invalid literal/lengths set";
            state.mode = BAD;
            break;
          }
          state.distbits = 6;
          state.distcode = state.distdyn;
          opts = { bits: state.distbits };
          ret = inftrees(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
          state.distbits = opts.bits;
          if (ret) {
            strm.msg = "invalid distances set";
            state.mode = BAD;
            break;
          }
          state.mode = LEN_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        /* falls through */
        case LEN_:
          state.mode = LEN;
        /* falls through */
        case LEN:
          if (have >= 6 && left >= 258) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;
            inffast(strm, _out);
            put = strm.next_out;
            output = strm.output;
            left = strm.avail_out;
            next = strm.next_in;
            input = strm.input;
            have = strm.avail_in;
            hold = state.hold;
            bits = state.bits;
            if (state.mode === TYPE) {
              state.back = -1;
            }
            break;
          }
          state.back = 0;
          for (; ; ) {
            here = state.lencode[hold & (1 << state.lenbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 255;
            here_val = here & 65535;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (here_op && (here_op & 240) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (; ; ) {
              here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (last_bits + here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= last_bits;
            bits -= last_bits;
            state.back += last_bits;
          }
          hold >>>= here_bits;
          bits -= here_bits;
          state.back += here_bits;
          state.length = here_val;
          if (here_op === 0) {
            state.mode = LIT;
            break;
          }
          if (here_op & 32) {
            state.back = -1;
            state.mode = TYPE;
            break;
          }
          if (here_op & 64) {
            strm.msg = "invalid literal/length code";
            state.mode = BAD;
            break;
          }
          state.extra = here_op & 15;
          state.mode = LENEXT;
        /* falls through */
        case LENEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.length += hold & (1 << state.extra) - 1;
            hold >>>= state.extra;
            bits -= state.extra;
            state.back += state.extra;
          }
          state.was = state.length;
          state.mode = DIST;
        /* falls through */
        case DIST:
          for (; ; ) {
            here = state.distcode[hold & (1 << state.distbits) - 1];
            here_bits = here >>> 24;
            here_op = here >>> 16 & 255;
            here_val = here & 65535;
            if (here_bits <= bits) {
              break;
            }
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((here_op & 240) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (; ; ) {
              here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
              here_bits = here >>> 24;
              here_op = here >>> 16 & 255;
              here_val = here & 65535;
              if (last_bits + here_bits <= bits) {
                break;
              }
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            hold >>>= last_bits;
            bits -= last_bits;
            state.back += last_bits;
          }
          hold >>>= here_bits;
          bits -= here_bits;
          state.back += here_bits;
          if (here_op & 64) {
            strm.msg = "invalid distance code";
            state.mode = BAD;
            break;
          }
          state.offset = here_val;
          state.extra = here_op & 15;
          state.mode = DISTEXT;
        /* falls through */
        case DISTEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            state.offset += hold & (1 << state.extra) - 1;
            hold >>>= state.extra;
            bits -= state.extra;
            state.back += state.extra;
          }
          if (state.offset > state.dmax) {
            strm.msg = "invalid distance too far back";
            state.mode = BAD;
            break;
          }
          state.mode = MATCH;
        /* falls through */
        case MATCH:
          if (left === 0) {
            break inf_leave;
          }
          copy = _out - left;
          if (state.offset > copy) {
            copy = state.offset - copy;
            if (copy > state.whave) {
              if (state.sane) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
            }
            if (copy > state.wnext) {
              copy -= state.wnext;
              from = state.wsize - copy;
            } else {
              from = state.wnext - copy;
            }
            if (copy > state.length) {
              copy = state.length;
            }
            from_source = state.window;
          } else {
            from_source = output;
            from = put - state.offset;
            copy = state.length;
          }
          if (copy > left) {
            copy = left;
          }
          left -= copy;
          state.length -= copy;
          do {
            output[put++] = from_source[from++];
          } while (--copy);
          if (state.length === 0) {
            state.mode = LEN;
          }
          break;
        case LIT:
          if (left === 0) {
            break inf_leave;
          }
          output[put++] = state.length;
          left--;
          state.mode = LEN;
          break;
        case CHECK:
          if (state.wrap) {
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold |= input[next++] << bits;
              bits += 8;
            }
            _out -= left;
            strm.total_out += _out;
            state.total += _out;
            if (state.wrap & 4 && _out) {
              strm.adler = state.check = /*UPDATE_CHECK(state.check, put - _out, _out);*/
              state.flags ? crc32_1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out);
            }
            _out = left;
            if (state.wrap & 4 && (state.flags ? hold : zswap32(hold)) !== state.check) {
              strm.msg = "incorrect data check";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          state.mode = LENGTH;
        /* falls through */
        case LENGTH:
          if (state.wrap && state.flags) {
            while (bits < 32) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (state.wrap & 4 && hold !== (state.total & 4294967295)) {
              strm.msg = "incorrect length check";
              state.mode = BAD;
              break;
            }
            hold = 0;
            bits = 0;
          }
          state.mode = DONE;
        /* falls through */
        case DONE:
          ret = Z_STREAM_END$1;
          break inf_leave;
        case BAD:
          ret = Z_DATA_ERROR$1;
          break inf_leave;
        case MEM:
          return Z_MEM_ERROR$1;
        case SYNC:
        /* falls through */
        default:
          return Z_STREAM_ERROR$1;
      }
    }
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH$1)) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap & 4 && _out) {
    strm.adler = state.check = /*UPDATE_CHECK(state.check, strm.next_out - _out, _out);*/
    state.flags ? crc32_1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out);
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if ((_in === 0 && _out === 0 || flush === Z_FINISH$1) && ret === Z_OK$1) {
    ret = Z_BUF_ERROR;
  }
  return ret;
};
var inflateEnd = (strm) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  let state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK$1;
};
var inflateGetHeader = (strm, head) => {
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  const state = strm.state;
  if ((state.wrap & 2) === 0) {
    return Z_STREAM_ERROR$1;
  }
  state.head = head;
  head.done = false;
  return Z_OK$1;
};
var inflateSetDictionary = (strm, dictionary) => {
  const dictLength = dictionary.length;
  let state;
  let dictid;
  let ret;
  if (inflateStateCheck(strm)) {
    return Z_STREAM_ERROR$1;
  }
  state = strm.state;
  if (state.wrap !== 0 && state.mode !== DICT) {
    return Z_STREAM_ERROR$1;
  }
  if (state.mode === DICT) {
    dictid = 1;
    dictid = adler32_1(dictid, dictionary, dictLength, 0);
    if (dictid !== state.check) {
      return Z_DATA_ERROR$1;
    }
  }
  ret = updatewindow(strm, dictionary, dictLength, dictLength);
  if (ret) {
    state.mode = MEM;
    return Z_MEM_ERROR$1;
  }
  state.havedict = 1;
  return Z_OK$1;
};
var inflateReset_1 = inflateReset;
var inflateReset2_1 = inflateReset2;
var inflateResetKeep_1 = inflateResetKeep;
var inflateInit_1 = inflateInit;
var inflateInit2_1 = inflateInit2;
var inflate_2$1 = inflate$2;
var inflateEnd_1 = inflateEnd;
var inflateGetHeader_1 = inflateGetHeader;
var inflateSetDictionary_1 = inflateSetDictionary;
var inflateInfo = "pako inflate (from Nodeca project)";
var inflate_1$2 = {
  inflateReset: inflateReset_1,
  inflateReset2: inflateReset2_1,
  inflateResetKeep: inflateResetKeep_1,
  inflateInit: inflateInit_1,
  inflateInit2: inflateInit2_1,
  inflate: inflate_2$1,
  inflateEnd: inflateEnd_1,
  inflateGetHeader: inflateGetHeader_1,
  inflateSetDictionary: inflateSetDictionary_1,
  inflateInfo
};
function GZheader() {
  this.text = 0;
  this.time = 0;
  this.xflags = 0;
  this.os = 0;
  this.extra = null;
  this.extra_len = 0;
  this.name = "";
  this.comment = "";
  this.hcrc = 0;
  this.done = false;
}
var gzheader = GZheader;
var toString = Object.prototype.toString;
var {
  Z_NO_FLUSH,
  Z_FINISH,
  Z_OK,
  Z_STREAM_END,
  Z_NEED_DICT,
  Z_STREAM_ERROR,
  Z_DATA_ERROR,
  Z_MEM_ERROR
} = constants$2;
function Inflate$1(options) {
  this.options = common.assign({
    chunkSize: 1024 * 64,
    windowBits: 15,
    to: ""
  }, options || {});
  const opt = this.options;
  if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) {
      opt.windowBits = -15;
    }
  }
  if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
    opt.windowBits += 32;
  }
  if (opt.windowBits > 15 && opt.windowBits < 48) {
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }
  this.err = 0;
  this.msg = "";
  this.ended = false;
  this.chunks = [];
  this.strm = new zstream();
  this.strm.avail_out = 0;
  let status = inflate_1$2.inflateInit2(
    this.strm,
    opt.windowBits
  );
  if (status !== Z_OK) {
    throw new Error(messages[status]);
  }
  this.header = new gzheader();
  inflate_1$2.inflateGetHeader(this.strm, this.header);
  if (opt.dictionary) {
    if (typeof opt.dictionary === "string") {
      opt.dictionary = strings.string2buf(opt.dictionary);
    } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
      opt.dictionary = new Uint8Array(opt.dictionary);
    }
    if (opt.raw) {
      status = inflate_1$2.inflateSetDictionary(this.strm, opt.dictionary);
      if (status !== Z_OK) {
        throw new Error(messages[status]);
      }
    }
  }
}
Inflate$1.prototype.push = function(data, flush_mode) {
  const strm = this.strm;
  const chunkSize = this.options.chunkSize;
  const dictionary = this.options.dictionary;
  let status, _flush_mode, last_avail_out;
  if (this.ended) return false;
  if (flush_mode === ~~flush_mode) _flush_mode = flush_mode;
  else _flush_mode = flush_mode === true ? Z_FINISH : Z_NO_FLUSH;
  if (toString.call(data) === "[object ArrayBuffer]") {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }
  strm.next_in = 0;
  strm.avail_in = strm.input.length;
  for (; ; ) {
    if (strm.avail_out === 0) {
      strm.output = new Uint8Array(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = inflate_1$2.inflate(strm, _flush_mode);
    if (status === Z_NEED_DICT && dictionary) {
      status = inflate_1$2.inflateSetDictionary(strm, dictionary);
      if (status === Z_OK) {
        status = inflate_1$2.inflate(strm, _flush_mode);
      } else if (status === Z_DATA_ERROR) {
        status = Z_NEED_DICT;
      }
    }
    while (strm.avail_in > 0 && status === Z_STREAM_END && strm.state.wrap > 0 && data[strm.next_in] !== 0) {
      inflate_1$2.inflateReset(strm);
      status = inflate_1$2.inflate(strm, _flush_mode);
    }
    switch (status) {
      case Z_STREAM_ERROR:
      case Z_DATA_ERROR:
      case Z_NEED_DICT:
      case Z_MEM_ERROR:
        this.onEnd(status);
        this.ended = true;
        return false;
    }
    last_avail_out = strm.avail_out;
    if (strm.next_out) {
      if (strm.avail_out === 0 || status === Z_STREAM_END) {
        if (this.options.to === "string") {
          let next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
          let tail = strm.next_out - next_out_utf8;
          let utf8str = strings.buf2string(strm.output, next_out_utf8);
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) strm.output.set(strm.output.subarray(next_out_utf8, next_out_utf8 + tail), 0);
          this.onData(utf8str);
        } else {
          this.onData(strm.output.length === strm.next_out ? strm.output : strm.output.subarray(0, strm.next_out));
        }
      }
    }
    if (status === Z_OK && last_avail_out === 0) continue;
    if (status === Z_STREAM_END) {
      status = inflate_1$2.inflateEnd(this.strm);
      this.onEnd(status);
      this.ended = true;
      return true;
    }
    if (strm.avail_in === 0) break;
  }
  return true;
};
Inflate$1.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};
Inflate$1.prototype.onEnd = function(status) {
  if (status === Z_OK) {
    if (this.options.to === "string") {
      this.result = this.chunks.join("");
    } else {
      this.result = common.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};
function inflate$1(input, options) {
  const inflator = new Inflate$1(options);
  inflator.push(input);
  if (inflator.err) throw inflator.msg || messages[inflator.err];
  return inflator.result;
}
function inflateRaw$1(input, options) {
  options = options || {};
  options.raw = true;
  return inflate$1(input, options);
}
var Inflate_1$1 = Inflate$1;
var inflate_2 = inflate$1;
var inflateRaw_1$1 = inflateRaw$1;
var ungzip$1 = inflate$1;
var constants = constants$2;
var inflate_1$1 = {
  Inflate: Inflate_1$1,
  inflate: inflate_2,
  inflateRaw: inflateRaw_1$1,
  ungzip: ungzip$1,
  constants
};
var { Deflate, deflate, deflateRaw, gzip } = deflate_1$1;
var { Inflate, inflate, inflateRaw, ungzip } = inflate_1$1;
var deflateRaw_1 = deflateRaw;
var inflateRaw_1 = inflateRaw;

// src/lib/structure-spec/shareLink.ts
var SPEC_LINK_BASE = "https://terraworld.dev/structure-studio";
var MAX_SPEC_BYTES = 2e6;
function createSpecLink(specText, base2 = SPEC_LINK_BASE) {
  return `${base2}#z=${toBase64Url(deflateRaw_1(new TextEncoder().encode(specText), { level: 9 }))}`;
}
function readSpecFromHash(hash) {
  const fragment = hash.replace(/^#/u, "");
  const separator = fragment.indexOf("=");
  if (separator < 0) return null;
  const key = fragment.slice(0, separator);
  const value = fragment.slice(separator + 1);
  if (key === "spec") {
    const text = value.replace(/\+/gu, " ");
    let decoded;
    try {
      decoded = decodeURIComponent(text);
    } catch {
      decoded = text;
    }
    if (decoded.length > MAX_SPEC_BYTES) throw new SpecLinkError("too-large", "The spec in this link is too large.");
    return decoded;
  }
  if (key === "z") {
    let bytes;
    try {
      bytes = inflateRaw_1(fromBase64Url(value));
    } catch {
    }
    if (!bytes?.length) throw new SpecLinkError("damaged", "The compressed spec in this link is damaged and cannot be read.");
    if (bytes.length > MAX_SPEC_BYTES) throw new SpecLinkError("too-large", "The spec in this link is too large.");
    return new TextDecoder().decode(bytes);
  }
  return null;
}
var SpecLinkError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
};
function toBase64Url(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 32768) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
  }
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}
function fromBase64Url(text) {
  const base64 = text.replace(/-/gu, "+").replace(/_/gu, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// scripts/package/index.ts
var DATA = new URL("../data/", import.meta.url);
var names;
function loadNames() {
  return names ??= (async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async (input) => new Response(await readFile(new URL(String(input).split("?")[0].split("/").pop(), DATA)));
    try {
      return new TerrariaNameIndex(await loadTerraMapStaticData());
    } finally {
      globalThis.fetch = original;
    }
  })();
}
async function buildSpec(source) {
  const index = await loadNames();
  const result = compileStructureSpec(typeof source === "string" ? parseStructureSpec(source) : source, index);
  return {
    ok: result.ok,
    issues: result.issues,
    width: result.clipboard.width,
    height: result.clipboard.height,
    objectCount: result.objects.length,
    ascii: renderStructureAscii(result.clipboard, index),
    twpack: result.ok ? exportStructurePackage(result.draft) : null
  };
}
async function renderTwpack(bytes) {
  return renderStructureAscii(importStructurePackage(bytes).clipboard, await loadNames());
}

export {
  exportStructurePackage,
  importStructurePackage,
  parseStructureSpec,
  compileStructureSpec,
  renderStructureAscii,
  renderStructureRgba,
  createSpecLink,
  readSpecFromHash,
  loadNames,
  buildSpec,
  renderTwpack
};
/*! Bundled license information:

pako/dist/pako.esm.mjs:
  (*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) *)
*/
