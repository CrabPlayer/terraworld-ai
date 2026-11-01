#!/usr/bin/env node
import {
  compileStructureSpec,
  createSpecLink,
  exportStructurePackage,
  importStructurePackage,
  loadNames,
  parseStructureSpec,
  renderStructureAscii,
  renderStructureRgba
} from "./shared.mjs";

// scripts/structure-cli-core.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { deflateSync } from "node:zlib";
async function runStructureCli(args, options) {
  const [command, ...rest] = args;
  const flags = /* @__PURE__ */ new Map();
  const positional = [];
  for (let index = 0; index < rest.length; index++) {
    const arg = rest[index];
    if (arg.startsWith("-") && arg !== "-") {
      const next = rest[index + 1];
      flags.set(arg.replace(/^-+/, ""), next && !next.startsWith("-") ? (index++, next) : true);
    } else positional.push(arg);
  }
  const flag = (...keys) => keys.map((key) => flags.get(key)).find((value) => value !== void 0);
  const usage = () => {
    const p = options.program;
    console.log([
      "TerraWorld structure tools. Specs use Terraria names; see https://terraworld.dev/llms.txt",
      "",
      `  ${p} search <words> [--kind block|wall|object] [--limit 40]   find exact names`,
      `  ${p} check <spec>                                             list problems and print an ASCII preview`,
      `  ${p} compile <spec> [-o out.twpack] [--png out.png] [--scale 4]  build a .twpack for Structure Studio and the Blueprint mod`,
      `  ${p} render <spec|.twpack> [--png out.png] [--ascii]           draw a structure`,
      `  ${p} link <spec> [--base url]                                 print a link that opens the spec in Structure Studio`,
      ...options.catalog ? [`  ${p} catalog [-o static/ai]                                  regenerate the name lists`] : [],
      "",
      "<spec> is a .twspec text file or a JSON spec; use - to read it from stdin."
    ].join("\n"));
    process.exit(command && command !== "help" && command !== "--help" ? 1 : 0);
  };
  const readSpec = (file) => {
    if (!file) usage();
    return file === "-" ? readFileSync(0, "utf8") : readFileSync(file, "utf8");
  };
  if (command === "link") {
    console.log(createSpecLink(readSpec(positional[0]).trim(), flag("base") ?? void 0));
    return;
  }
  if (!["search", "check", "compile", "render", ...options.catalog ? ["catalog"] : []].includes(command)) usage();
  const names = await options.loadNames();
  const writePng = (clipboard) => {
    const target = flag("png");
    if (typeof target !== "string") return;
    const image = renderStructureRgba(clipboard, names, Number(flag("scale") ?? 4));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, encodePng(image.width, image.height, image.data));
    console.log(`Wrote ${target} (${image.width}x${image.height})`);
  };
  switch (command) {
    case "search": {
      const kind = flag("kind");
      const results = names.search(positional.join(" "), kind, Number(flag("limit") ?? 40));
      for (const result of results) {
        const extra = result.kind === "object" ? `  ${result.size.join("x")}  attach=${result.anchor}${result.facing ? `  facing=${result.facing}` : ""}` : "";
        console.log(`${result.kind.padEnd(6)}  ${result.name}${result.variety ? `  variety="${result.variety}"` : ""}${extra}`);
      }
      if (results.length === 0) console.log("No matches.");
      break;
    }
    case "check":
    case "compile": {
      const file = positional[0];
      const result = compileStructureSpec(parseStructureSpec(readSpec(file)), names);
      for (const entry of result.issues) console.log(`${entry.severity.toUpperCase()}${entry.op !== void 0 ? ` op #${entry.op}` : ""}: ${entry.message}`);
      if (command === "check" || flag("ascii")) console.log(`
${renderStructureAscii(result.clipboard, names)}`);
      writePng(result.clipboard);
      const output = flag("o", "out");
      if (command === "compile" && result.ok) {
        const target = typeof output === "string" ? output : file === "-" ? "structure.twpack" : file.replace(/(\.twspec)?(\.json|\.txt)?$/i, "") + ".twpack";
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, exportStructurePackage(result.draft));
        console.log(`Wrote ${target}`);
      }
      console.log(`${result.clipboard.width}x${result.clipboard.height}, ${result.objects.length} objects, ${result.issues.filter((entry) => entry.severity === "error").length} errors, ${result.issues.filter((entry) => entry.severity === "warning").length} warnings`);
      if (!result.ok) process.exitCode = 1;
      break;
    }
    case "render": {
      const file = positional[0];
      const clipboard = file?.endsWith(".twpack") ? importStructurePackage(new Uint8Array(readFileSync(file))).clipboard : compileStructureSpec(parseStructureSpec(readSpec(file)), names).clipboard;
      if (flag("ascii") || !flag("png")) console.log(renderStructureAscii(clipboard, names));
      writePng(clipboard);
      break;
    }
    case "catalog": {
      const directory = flag("o", "out") ?? "static/ai";
      mkdirSync(directory, { recursive: true });
      const header = (title) => `# ${title}
# Generated by \`npm run structure -- catalog\`. Use these names in TerraWorld structure specs.
`;
      const blocks = names.search("", "block", Infinity).map((entry) => entry.name);
      const walls = names.search("", "wall", Infinity).map((entry) => entry.name);
      const objects = /* @__PURE__ */ new Map();
      for (const entry of names.search("", "object", Infinity)) {
        const key = `${entry.name}|${entry.size.join("x")}`;
        let row = objects.get(key);
        if (!row) objects.set(key, row = { size: entry.size.join("x"), attach: /* @__PURE__ */ new Set(), facing: /* @__PURE__ */ new Set(), varieties: /* @__PURE__ */ new Set() });
        row.attach.add(entry.anchor);
        if (entry.facing) row.facing.add(entry.facing);
        if (entry.variety) row.varieties.add(entry.variety);
      }
      const objectLines = [...objects].map(([key, row]) => [
        key.split("|")[0],
        row.size,
        `attach=${[...row.attach].join(",")}`,
        row.facing.size ? `facing=${[...row.facing].join(",")}` : "",
        row.varieties.size ? `variety=${[...row.varieties].map((variety) => JSON.stringify(variety)).join(",")}` : ""
      ].filter(Boolean).join(" | "));
      const unique = (list) => [...new Set(list)];
      writeFileSync(`${directory}/blocks.txt`, `${header("Blocks (tile=)")}${unique(blocks).join("\n")}
`);
      writeFileSync(`${directory}/walls.txt`, `${header("Walls (wall=)")}${unique(walls).join("\n")}
`);
      writeFileSync(`${directory}/objects.txt`, `${header("Objects (object name=) | size WxH | attach | facing | variety")}${objectLines.join("\n")}
`);
      console.log(`Wrote ${directory}/blocks.txt (${unique(blocks).length}), walls.txt (${unique(walls).length}), objects.txt (${objectLines.length})`);
      break;
    }
  }
}
function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function crc32(bytes) {
  let crc = 4294967295;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ 3988292384 & -(crc & 1);
  }
  return (crc ^ 4294967295) >>> 0;
}

// scripts/package/cli.ts
await runStructureCli(process.argv.slice(2), { program: "npx terraworld-ai", loadNames });
