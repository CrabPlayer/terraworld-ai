#!/usr/bin/env python3
"""Print a link that opens a TerraWorld structure spec in Structure Studio.

Usage: python scripts/make_link.py house.twspec   (or pipe the spec on stdin)

Copy the printed link exactly. Never retype or shorten it: one wrong character
breaks the compressed data and the link stops opening.
"""
import base64
import sys
import zlib
from pathlib import Path

BASE = "https://terraworld.dev/structure-studio"

text = Path(sys.argv[1]).read_text(encoding="utf-8") if len(sys.argv) > 1 else sys.stdin.read()
compressor = zlib.compressobj(9, zlib.DEFLATED, -15)
data = compressor.compress(text.strip().encode("utf-8")) + compressor.flush()
print(f"{BASE}#z={base64.urlsafe_b64encode(data).decode().rstrip('=')}")
