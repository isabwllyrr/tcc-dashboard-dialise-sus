"""Extrai apenas a geometria SVG da amostra aprovada para consumo pelo Astro.

Valores, classes e rótulos não são copiados: são reconstruídos do dossiê no build.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "amostra" / "site" / "evidencias" / "territorio" / "index.html"
TARGET = ROOT / "src" / "data" / "mapa-ufs.json"

html = SOURCE.read_text(encoding="utf-8")
svg = re.search(r'<svg class="map"[\s\S]*?</svg>', html)
if not svg:
    raise RuntimeError("Mapa SVG não encontrado na amostra aprovada")

paths = {}
for href, path in re.findall(r'<a href="/evidencias/territorio/([a-z]{2})/"[^>]*><path[^>]* d="([^"]+)"', svg.group(0)):
    paths[href.upper()] = path

if len(paths) != 27:
    raise RuntimeError(f"Esperadas 27 geometrias; encontradas {len(paths)}")

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_text(json.dumps(paths, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"OK: {len(paths)} geometrias -> {TARGET.relative_to(ROOT)}")
