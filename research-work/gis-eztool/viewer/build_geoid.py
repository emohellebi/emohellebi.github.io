"""Derive the small educational EGM2008 grid from PROJ's public-domain GeoTIFF.

One-time maintenance task (Pillow + NumPy), not part of the website build:
python build_geoid.py /path/to/us_nga_egm08_25.tif
Source: https://cdn.proj.org/us_nga_egm08_25.tif
"""
from pathlib import Path
import hashlib
import json
import sys
import numpy as np
from PIL import Image

source = Path(sys.argv[1])
with Image.open(source) as image:
    assert image.size == (8640, 4321) and image.mode == "F"
    assert image.tag_v2[33922][3:5] == (-180.0, 90.0)
    full = np.asarray(image)
grid = np.rint(full[::12, ::12] * 100).astype("<i2")
assert grid.shape == (361, 720)
assert np.isfinite(full).all() and -150 < full.min() < full.max() < 150

# Reproducible comparison against the original 2.5-minute grid, not a survey accuracy claim.
rng = np.random.default_rng(2008)
y = rng.integers(0, 4321, 20000)
x = rng.integers(0, 8640, 20000)
gy, gx = y / 12, x / 12
y0, x0 = np.floor(gy).astype(int), np.floor(gx).astype(int)
y1, x1 = np.minimum(y0+1, 360), (x0+1) % 720
fy, fx = gy-y0, gx-x0
estimate = ((grid[y0,x0]*(1-fx)+grid[y0,x1]*fx)*(1-fy)
            +(grid[y1,x0]*(1-fx)+grid[y1,x1]*fx)*fy)/100
errors = estimate-full[y,x]
target = Path(__file__).resolve().parent / "assets"
target.mkdir(exist_ok=True)
binary = grid.tobytes()
(target / "egm2008-0.5deg.bin").write_bytes(binary)
metadata = {
    "model": "EGM2008, educational 0.5-degree subsample",
    "source": "https://cdn.proj.org/us_nga_egm08_25.tif",
    "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "license": "Public domain (NGA / GeographicLib / PROJ-data)",
    "license_reference": "https://github.com/OSGeo/PROJ-data/blob/master/us_nga/us_nga_README.txt",
    "rows": 361, "columns": 720, "north": 90, "west": -180, "step_degrees": 0.5,
    "encoding": "row-major little-endian signed int16; value * 0.01 = geoid undulation in metres",
    "interpolation": "bilinear; wrap longitude, clamp latitude; node grid includes both poles",
    "validation": {"samples": 20000, "seed": 2008,
                   "rmse_m": round(float(np.sqrt(np.mean(errors**2))), 3),
                   "max_abs_difference_m": round(float(np.max(np.abs(errors))), 3),
                   "note": "Comparison to original grid at sampled nodes; not a global error bound or absolute accuracy."},
    "sha256": hashlib.sha256(binary).hexdigest()
}
(target / "egm2008-0.5deg.json").write_text(json.dumps(metadata, indent=2) + "\n")
print(json.dumps(metadata, indent=2))
