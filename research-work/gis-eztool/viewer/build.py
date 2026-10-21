"""Build the static website viewer; no network or third-party Python packages."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parent


def build():
    template = (ROOT / "template.html").read_text()
    seed = json.loads((ROOT / "data/orbits.json").read_text())
    html = template.replace("__SEED__", json.dumps(seed).replace("</", "<\\/"))
    for resource in ("app.js", "mobile.css"):
        digest = hashlib.sha256((ROOT / resource).read_bytes()).hexdigest()[:12]
        html = html.replace('"' + resource + '"', '"' + resource + '?v=' + digest + '"')
    for resource in ("earth-tiles.js", "surface-distance.js"):
        digest = hashlib.sha256((ROOT / resource).read_bytes()).hexdigest()[:12]
        html = html.replace('"./' + resource + '"', '"./' + resource + '?v=' + digest + '"')
    assert "__SEED__" not in html
    (ROOT / "index.html").write_text(html)
    print(f"Built GIS_EZMO²: {len(seed['elements'])} orbital records; {len(html.encode()):,} HTML bytes.")


if __name__ == "__main__":
    build()
