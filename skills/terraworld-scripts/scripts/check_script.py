#!/usr/bin/env python3
"""Check a TerraWorld script before giving it to the user.

Usage: python scripts/check_script.py script.js   (or pipe the script on stdin)

Catches the usual mistakes early: syntax errors, `tw.*` members that the API does
not have (references/tw-members.txt, made from references/terraworld.d.ts), things
the sandbox does not allow (import, fetch, document, console...), `tw.edit` changes
that are never committed, and a missing header. When Node.js is installed the
syntax is checked by a real JavaScript parser; otherwise by a bracket and string scan.

Exit code 1 while there are problems. Warnings are printed but do not fail the check;
fix them too unless you have a reason.
"""
import difflib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

REFERENCES = Path(__file__).resolve().parent.parent / "references"

# Globals the sandbox does not have, or that scripts must not use.
FORBIDDEN = {
    "import": "`import` is not allowed: the script is the body of a function and the only API is `tw`.",
    "export": "`export` is not allowed: the script is the body of a function, not a module.",
    "require": "`require` is not available: the only API is `tw`.",
    "importScripts": "`importScripts` is not available: the only API is `tw`.",
    "fetch": "there is no network in the sandbox (`fetch`).",
    "XMLHttpRequest": "there is no network in the sandbox (`XMLHttpRequest`).",
    "WebSocket": "there is no network in the sandbox (`WebSocket`).",
    "EventSource": "there is no network in the sandbox (`EventSource`).",
    "localStorage": "there is no storage in the sandbox (`localStorage`).",
    "sessionStorage": "there is no storage in the sandbox (`sessionStorage`).",
    "indexedDB": "there is no storage in the sandbox (`indexedDB`).",
    "caches": "there is no storage in the sandbox (`caches`).",
    "document": "there is no DOM in the sandbox (`document`). Show results with `tw.ui.*`.",
    "window": "there is no `window` in the sandbox. Show results with `tw.ui.*`.",
    "navigator": "`navigator` is not part of the API.",
    "postMessage": "`postMessage` is not part of the API.",
    "console": "`console` output is not shown to the user. Use `tw.ui.log`, `tw.ui.warn` or `tw.ui.table`.",
}
REGEX_BEFORE = set("(,=:[!&|?{};+-*%<>~^")
REGEX_AFTER_WORDS = {"return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"}
CLOSE = {")": "(", "]": "[", "}": "{"}

# Parses the script the way TerraWorld runs it: the body of an async function that receives `tw`.
NODE_PARSE = r"""
const vm = require("vm");
let code = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { code += chunk; });
process.stdin.on("end", () => {
  try {
    new vm.Script("(async function (tw) {\"use strict\";\n" + code + "\n})", { filename: "script.js", lineOffset: -1 });
    console.log("{}");
  } catch (error) {
    const match = /script\.js:(\d+)/.exec(String(error && error.stack));
    console.log(JSON.stringify({ line: match ? Number(match[1]) : 0, message: String(error && error.message) }));
  }
});
"""


def read_members():
    """`tw.ui.prompt() async` -> paths, which paths have members, which are async methods."""
    paths, parents, methods, asyncs = set(), set(), set(), set()
    for line in (REFERENCES / "tw-members.txt").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.split()
        path = parts[0]
        if path.endswith("()"):
            path = path[:-2]
            methods.add(path)
        if "async" in parts[1:]:
            asyncs.add(path)
        paths.add(path)
        parents.add(path.rsplit(".", 1)[0])
    return paths, parents, methods, asyncs


def scan(src):
    """Blank out strings, comments and regex literals (template `${}` stays code), and check brackets.

    Returns (code_only, problems). `code_only` has the same length and line breaks as `src`.
    """
    out = list(src)
    problems = []
    stack = []  # (opener, line); "`" means we are in template text, "${" an interpolation
    line, i, n = 1, 0, len(src)
    last = ""  # last significant token, to tell a regex literal from a division
    broken = False

    def blank(start, end):
        for k in range(start, end):
            if out[k] != "\n":
                out[k] = " "

    def count_lines(start, end):
        return src.count("\n", start, end)

    while i < n:
        if stack and stack[-1][0] == "`":
            start = i
            while i < n and src[i] != "`" and not src.startswith("${", i):
                i += 2 if src[i] == "\\" else 1
            i = min(i, n)
            blank(start, i)
            line += count_lines(start, i)
            if i >= n:
                break
            if src[i] == "`":
                out[i] = " "
                stack.pop()
                i += 1
                last = "value"
            else:
                stack.append(("${", line))
                i += 2
                last = "{"
            continue
        c = src[i]
        if c == "\n":
            line += 1
            i += 1
            continue
        if c in " \t\r﻿":
            i += 1
            continue
        if src.startswith("//", i):
            end = src.find("\n", i)
            end = n if end < 0 else end
            blank(i, end)
            i = end
            continue
        if src.startswith("/*", i):
            end = src.find("*/", i + 2)
            if end < 0:
                problems.append(f"line {line}: comment `/*` is never closed with `*/`.")
                blank(i, n)
                break
            blank(i, end + 2)
            line += count_lines(i, end)
            i = end + 2
            continue
        if c in "\"'":
            start, i = i, i + 1
            while i < n and src[i] != c and src[i] != "\n":
                i += 2 if src[i] == "\\" else 1
            if i >= n or src[i] != c:
                problems.append(f"line {line}: string starting with {c} is never closed on the same line.")
                broken = True
                blank(start, min(i, n))
                i = min(i, n)
                last = "value"
                continue
            blank(start, i + 1)
            i += 1
            last = "value"
            continue
        if c == "`":
            out[i] = " "
            stack.append(("`", line))
            i += 1
            continue
        if c == "/" and (last == "" or last in REGEX_BEFORE or last in REGEX_AFTER_WORDS):
            start, i, in_class = i, i + 1, False
            while i < n and src[i] != "\n":
                if src[i] == "\\":
                    i += 2
                    continue
                if src[i] == "[":
                    in_class = True
                elif src[i] == "]":
                    in_class = False
                elif src[i] == "/" and not in_class:
                    break
                i += 1
            if i >= n or src[i] != "/":
                problems.append(f"line {line}: regular expression starting with / is never closed on the same line.")
                broken = True
                i = min(i, n)
                continue
            i += 1
            while i < n and (src[i].isalnum() or src[i] == "_"):
                i += 1
            blank(start, i)
            last = "value"
            continue
        word = re.match(r"[\w$]+", src[i:i + 200])
        if word:
            last = word.group(0)
            i += len(last)
            continue
        if c in "([{":
            stack.append((c, line))
        elif c in ")]}":
            if c == "}" and stack and stack[-1][0] == "${":
                stack.pop()
                i += 1
                continue
            if not stack or stack[-1][0] != CLOSE[c]:
                if not broken:
                    expected = f" (`{stack[-1][0]}` from line {stack[-1][1]} is still open)" if stack else ""
                    problems.append(f"line {line}: unexpected `{c}`{expected}.")
                broken = True
            else:
                stack.pop()
        last = c
        i += 1

    if not broken:
        for opener, opened in reversed(stack):
            what = {"`": "template string `", "${": "`${` in a template string"}.get(opener, f"`{opener}`")
            problems.append(f"{what} opened on line {opened} is never closed.")
            break
    return "".join(out), problems


def node_parse(src):
    """Real parse with Node.js: None if Node is missing or fails, "" when OK, else the error."""
    node = shutil.which("node")
    if not node:
        return None
    try:
        result = subprocess.run([node, "-e", NODE_PARSE], input=src.encode("utf-8"), capture_output=True, timeout=30)
        report = json.loads(result.stdout.decode("utf-8").strip().splitlines()[-1])
    except (OSError, subprocess.SubprocessError, ValueError, IndexError):
        return None
    if not report:
        return ""
    return f"line {report['line']}: syntax error: {report['message']}" if report.get("line") else f"syntax error: {report['message']}"


def line_of(text, index):
    return text.count("\n", 0, index) + 1


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    src = Path(sys.argv[1]).read_text(encoding="utf-8") if len(sys.argv) > 1 else sys.stdin.read()
    paths, parents, methods, asyncs = read_members()
    problems, warnings = [], []

    code, scan_problems = scan(src)
    parsed = node_parse(src)
    if parsed is None:
        problems.extend(scan_problems)
    elif parsed:
        problems.append(parsed)

    for match in re.finditer(r"(?<![\w$.])(" + "|".join(FORBIDDEN) + r")(?![\w$])", code):
        name = match.group(1)
        after = code[match.end():match.end() + 3]
        if name in ("import", "export") or not re.match(r"\s*:", after) or name == "console":
            problems.append(f"line {line_of(code, match.start())}: {FORBIDDEN[name]}")

    used_edit, unknown_seen = False, set()
    for match in re.finditer(r"(?<![\w$.])tw((?:\s*\.\s*[A-Za-z_$][\w$]*)+)", code):
        names = re.findall(r"[A-Za-z_$][\w$]*", match.group(1))
        where = f"line {line_of(code, match.start())}"
        path = "tw"
        for index, name in enumerate(names):
            parent, path = path, f"{path}.{name}"
            if path not in paths:
                if path not in unknown_seen:
                    unknown_seen.add(path)
                    siblings = [p.rsplit(".", 1)[1] for p in paths if p.rsplit(".", 1)[0] == parent]
                    close = difflib.get_close_matches(name, siblings, n=3, cutoff=0.5)
                    hint = f" Did you mean {', '.join(f'`{parent}.{c}`' for c in close)}?" if close else ""
                    problems.append(f"{where}: `{path}` is not in the TerraWorld API (references/terraworld.d.ts).{hint}")
                break
            if path not in parents:
                break
        rest = code[match.end():]
        call = re.match(r"\s*\(", rest)
        if path == "tw.edit" or (path.startswith("tw.edit.") and path not in ("tw.edit.commit", "tw.edit.count", "tw.edit.discard")):
            used_edit = True
        if path in asyncs and call:
            before = code[:match.start()].rstrip()
            if not re.search(r"(?<![\w$])(await|return)$", before) and not re.match(r"\s*\([^;]*?\)\s*\.then\b", rest):
                warnings.append(f"{where}: `{path}()` returns a Promise: write `await {path}(...)`.")

    if used_edit and not re.search(r"\.\s*commit\s*\(", code):
        problems.append("The script drafts changes with `tw.edit` but never calls `await tw.edit.commit({ label })`, so nothing would change.")

    header = re.search(r"^\s*//\s*@tw-api[ \t]+(\S+)", src, re.M)
    if not header:
        warnings.append("Add the header comment `// @tw-api 1` at the top (with `// @name` and `// @description`).")
    elif header.group(1) != "1":
        warnings.append(f"`// @tw-api {header.group(1)}`: this API is version 1, write `// @tw-api 1`.")
    for key in ("name", "description"):
        if header and not re.search(rf"^\s*//\s*@{key}[ \t]+\S", src, re.M):
            warnings.append(f"Add the header comment `// @{key} ...` at the top.")

    if problems:
        print(f"{len(problems)} problem(s):")
        for problem in problems:
            print(f"- {problem}")
    if warnings:
        print(f"{len(warnings)} warning(s):")
        for warning in warnings:
            print(f"- {warning}")
    if problems:
        sys.exit(1)
    parser = "Node.js" if parsed is not None else "a bracket and string scan; install Node.js for a full parse"
    print(f"OK: no problems found (syntax checked with {parser}). TerraWorld checks ids and names when the script runs.")


if __name__ == "__main__":
    main()
