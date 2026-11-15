#!/usr/bin/env python3
"""Print a link that opens a TerraWorld script in the world page's Script editor.

Usage: python scripts/make_link.py script.js   (or pipe the script on stdin)
       python scripts/make_link.py script.js --base http://localhost:5173/world

Copy the printed link exactly. Never retype or shorten it: one wrong character
breaks the compressed data and the link stops opening. Opening the link only puts
the script in the editor; the user reads it and presses Run.

Format (version 1, same as TerraWorld's src/lib/scripting/shareLink.ts):
  https://terraworld.dev/world#script=1.<payload>
  payload = base64url without "=" padding of the zlib stream (deflate level 9 with
  the Adler-32 checksum) of the script's exact UTF-8 bytes.
"""
import base64
import sys
import zlib
from pathlib import Path

BASE = "https://terraworld.dev/world"
KEY = "script"
VERSION = "1"
MAX_LINK_LENGTH = 8192  # MAX_SCRIPT_LINK_LENGTH in shareLink.ts


def create_link(code, base=BASE):
    """Returns the link for `code` (a str), or None when it is over the length limit."""
    payload = base64.urlsafe_b64encode(zlib.compress(code.encode("utf-8"), 9)).decode("ascii").rstrip("=")
    url = f"{base.split('#', 1)[0]}#{KEY}={VERSION}.{payload}"
    return url if len(url) <= MAX_LINK_LENGTH else None


def read_link(url):
    """Decodes a link made by create_link (used to prove the link before printing it)."""
    value = url.split("#", 1)[1][len(KEY) + 1:]
    version, payload = value.split(".", 1)
    assert version == VERSION
    return zlib.decompress(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))).decode("utf-8")


def main():
    args = sys.argv[1:]
    base = BASE
    if "--base" in args:
        at = args.index("--base")
        base = args[at + 1]
        del args[at:at + 2]
    # Read bytes so CRLF, a BOM or any other character reaches the link unchanged.
    data = Path(args[0]).read_bytes() if args else sys.stdin.buffer.read()
    code = data.decode("utf-8")
    url = create_link(code, base)
    if url is None:
        print(f"The script is too long for a link (over {MAX_LINK_LENGTH} characters). Give the user the code block only; "
              "they paste it into the Script panel.", file=sys.stderr)
        sys.exit(1)
    if read_link(url) != code:
        print("Internal error: the link does not decode back to the same script.", file=sys.stderr)
        sys.exit(1)
    print(url)


if __name__ == "__main__":
    main()
