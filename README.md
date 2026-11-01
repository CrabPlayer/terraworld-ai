# TerraWorld AI

Files that teach AI assistants (ChatGPT, Claude, Gemini and others) to design Terraria structures for
[TerraWorld](https://terraworld.dev). The AI writes a short **structure spec** using Terraria names; the user opens it in
[Structure Studio](https://terraworld.dev/structure-studio), checks it in Real View, and exports a `.twpack` that the
[TerraWorld Blueprint](https://github.com/CrabPlayer/TerraWorldBlueprint) mod can build in game.

This repository mirrors the files served at terraworld.dev, for AIs that cannot open that domain.

[Open the example house in Structure Studio](https://terraworld.dev/structure-studio#z=hZJNT-QwDIbv_RXWnJlpO8wAi5QDH9LuaUHLSByrTOqhYdOkSly15dfjpDsgEFqkSnXtx29ex81z2Gk7weBcjRYa1we8BAmBpCf08Pv-hpMtruCu47om0BYeyPeKeo8c9bV24Dwo13baYCQGTU2W5wBguxZ8b1nt2LBcvpFBed1RyHGUbWcw5MRGlsnBiobQocqsbBEWyeDjbPBXLC-yGudu7SwsriC00pg3z0kiuYDaOR9OeB6Se4MxUI3Ufg4wEEhbAzkfP1aLLOgXhPKMn-j_it_LQdcI3rkD6AAXHA2BxYy5hL0MsTLAOct1OKa4WGUJHkUBkziHQbAc8bjiD9bV7WRloKl6aLR94pEzj4qYLZm9iOwGGm5KfByYRzHGDYKvD4_smtkfkV0zu4WBvSS2euToCMXDy-18esPySfGnl1N17bX6mymD0v87uCwZOX1Pbd5zbv8c9eIaxLyA6pZv9Ni4AUniYDjzP3LzPbqL22H27Hv0Ju6P0e1HFA5S8Z0Kr58a-rovrpvtFJ8aNWEbxC7-A9VYFifpLsdt8UEklbn7NDZ_XSrXqfYK)

## Links for AIs

| File | GitHub raw | CDN (jsDelivr) |
|---|---|---|
| Guide | https://raw.githubusercontent.com/CrabPlayer/terraworld-ai/main/llms.txt | https://cdn.jsdelivr.net/gh/CrabPlayer/terraworld-ai@main/llms.txt |
| Block names | https://raw.githubusercontent.com/CrabPlayer/terraworld-ai/main/ai/blocks.txt | https://cdn.jsdelivr.net/gh/CrabPlayer/terraworld-ai@main/ai/blocks.txt |
| Wall names | https://raw.githubusercontent.com/CrabPlayer/terraworld-ai/main/ai/walls.txt | https://cdn.jsdelivr.net/gh/CrabPlayer/terraworld-ai@main/ai/walls.txt |
| Object names | https://raw.githubusercontent.com/CrabPlayer/terraworld-ai/main/ai/objects.txt | https://cdn.jsdelivr.net/gh/CrabPlayer/terraworld-ai@main/ai/objects.txt |

Quick start in any chat:

> Read https://cdn.jsdelivr.net/gh/CrabPlayer/terraworld-ai@main/llms.txt, then design a two-storey wooden NPC house as a TerraWorld structure spec and give me the Structure Studio link.

## Set up your AI once

| AI | What to use |
|---|---|
| Claude | Download [`skills/terraworld-structures.zip`](https://github.com/CrabPlayer/terraworld-ai/raw/main/skills/terraworld-structures.zip) and upload it under Settings → Capabilities → Skills (code execution must be on). Claude then checks every spec with `scripts/check_spec.py` and makes links with `scripts/make_link.py`. |
| ChatGPT Project or GPT | Paste [`prompts/project-instructions.md`](prompts/project-instructions.md) into Instructions and add [`prompts/terraworld-guide.md`](prompts/terraworld-guide.md) and the files in [`ai/`](ai) as files. |
| Gemini Gem | Same as ChatGPT: instructions into the Gem, the guide and name lists as knowledge. |
| Any AI | Paste [`prompts/starter-prompt.md`](prompts/starter-prompt.md) as the first message of a chat. |

The [skill builder](https://terraworld.dev/en/ai/skill-builder) on terraworld.dev makes the same files with your own
preferences (reply language, default style, NPC housing).

## Command line

Needs Node.js 18 or newer. Nothing to install: `npx` downloads the package on first use.

```bash
npx terraworld-ai search "chair"                      # exact names of blocks, walls and objects
npx terraworld-ai check house.twspec                  # list problems and print an ASCII preview
npx terraworld-ai compile house.twspec -o house.twpack --png house.png
npx terraworld-ai render castle.twpack --png castle.png
npx terraworld-ai link house.twspec                   # link that opens the spec in Structure Studio
```

`check` exits with code 1 when the spec has errors, so agents can loop until it passes. Use `-` as the file name to read
the spec from stdin.

## Library

```js
import { buildSpec, createSpecLink } from "terraworld-ai";

const spec = "size 12 8\nrect x=0 y=7 w=12 tile=Gray_Brick\nobject name=Wooden_Chair x=3 y=7 at=floor facing=right";
const result = await buildSpec(spec);
console.log(result.issues, result.ascii);
if (result.ok) writeFileSync("house.twpack", result.twpack);
console.log(createSpecLink(spec));
```

## Contents

- `llms.txt`: the structure spec language, hand-over rules and design rules.
- `ai/`: every block, wall and object name the spec accepts.
- `skills/terraworld-structures/`: an [Agent Skill](https://agentskills.io) folder, also packed as a zip.
- `prompts/`: ready-to-paste instructions and a starter prompt.
- `examples/`: a small house in the text form and a large castle in the JSON form.
- `dist/`, `data/`: the `terraworld-ai` npm package (command line and library) and the game data it reads.

## Updating

These files are generated from the TerraWorld repository with `npm run ai:repo`. Edit them there, not here.

## License

MIT. Terraria is a trademark of Re-Logic. This project is not affiliated with or endorsed by Re-Logic.
