#!/usr/bin/env python3
"""Cria o ZIP de instalação a partir dos arquivos de código-fonte."""
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
files = [
    "manifest.json", "background.js", "core.js", "view.js", "view.css",
    "content.js", "popup.html", "popup.js", "popup.css",
    "options.html", "options.js", "options.css",
    "catalog.json", "catalog-estoque.json", "catalog-financeiro.json",
    "catalog-integracoes.json", "LEIA-ME.md", "LICENSE",
]
for name in files:
    if not (ROOT / name).is_file():
        raise SystemExit("Arquivo necessário ausente: " + name)

destination = ROOT / "dist"
destination.mkdir(exist_ok=True)
archive = destination / ("opa-speedvideos-v" + manifest["version"] + ".zip")
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as output:
    for name in files:
        entry = zipfile.ZipInfo("opa-speedvideos/" + name, (1980, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.create_system = 3
        entry.external_attr = 0o100644 << 16
        output.writestr(entry, (ROOT / name).read_bytes())
print(str(archive))
