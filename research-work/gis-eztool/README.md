# GIS_EZMO²

Website version of the original GIS_Magic orbital observatory. The original desktop project is preserved separately; edit this directory for future website changes.

The displayed name is **GIS_EZMO²** (EZMO squared). The stable `research-work/gis-eztool/` URL, cache keys, and internal diagnostic names are retained so existing links and browser data continue to work.

## Files and preview

- `index.qmd`: project overview, instructions, and embedded viewer.
- `viewer/app.js`: original orbital model and controls, with website/mobile integration.
- `viewer/earth-tiles.js`: bounded, on-demand WGS84 imagery tile renderer for surface zoom.
- `viewer/surface-distance.js`: optional terrain-clearance snapshots and geoid interpolation.
- `viewer/map-projection.js`: spherical Equal Earth equations, inverse and dateline splitting.
- `viewer/flat-map.js`: projected NASA mosaic, subpoints, tracks, horizon and touch/keyboard map navigation; shares the globe's renderer and state.
- `viewer/template.html` and `viewer/mobile.css`: viewer layout.
- `viewer/data/orbits.json`: bundled orbital snapshot; not live telemetry.
- `viewer/assets/` and `viewer/vendor/`: local images, pinned dependencies, and license notices.

After editing the viewer, run from the repository root:

```sh
python3 research-work/gis-eztool/viewer/build.py
quarto render research-work/gis-eztool/index.qmd
quarto render research-work/index.qmd
```

Review the site before committing or publishing. Rendering the whole website can pick up unrelated unfinished edits; scope releases to the approved research pages and their assets. `docs/research-work/gis-eztool/` is generated output, not the editing source.

The project page explicitly lists its public resources. Do not add the original `.openai/` metadata, chat exports, or private project notes to the website. Code and public dependency licenses are safe to include; the development conversation is not part of the deployment.

## Hosting

The viewer runs in the browser on GitHub Pages, without a server-side application or OpenAI API. It uses relative links and local rendering dependencies. Orbital refreshes contact the public TLE API; close-up Earth views request visible imagery tiles from EOX. Research-site calculations remain in browser memory, but surface tile requests necessarily reveal the viewed area to the imagery provider. No geolocation permission is requested.

The optional **Surface distance** overlay additionally sends predicted satellite subpoint coordinates to Open-Meteo. It is off by default. Measurements are synchronized snapshots of orbit height and surface elevation, not a continuously sampled altimeter. See the project page for limitations and data attribution.

Phone users can open `viewer/` for a full-window layout, select a satellite, and toggle Mission details. Browser support for WebGL is required. A failed orbital refresh keeps the bundled/cached data and reports the data epoch.

## Scientific limits

This is an educational, exploratory visualization. SGP4/SDP4 positions are predictions, not spacecraft GPS telemetry. Earth is spherical in the display, spacecraft symbols are enlarged, and the day/night texture is a static NASA-based mosaic. The geometric horizon is not sensor coverage. The 24-hour site calculator samples at 30-second intervals with a 10° elevation mask and does not model terrain, refraction, acquisitions, cloud cover, or operational mission status.

Original dependency versions: Three.js 0.170.0 and satellite.js 6.0.1, both MIT-licensed. See the project page and bundled license notices for credits.

## Detailed surface imagery

The EOX `s2cloudless-2024` WGS84 layer is streamed directly over HTTPS. Its 256px grid has `2^(z+1)` columns and `2^z` rows; maximum detail is capped at level 13 (approximately 10 m latitude sampling). The camera stops at 5 km height to avoid implying unlimited detail. No terrain elevation or buildings are modeled. Surface mode is daylight-lit and Earth-fixed; orbital mode restores the illustrative day/night cycle.

EOX's 2024 imagery is **CC BY-NC-SA 4.0**, appropriate for this non-commercial educational/research viewer. See https://cloudless.eox.at/license-non-commercial and https://maps.eox.at/. Retain visible linked attribution; commercial reuse requires a license review. Do not bulk download tiles or add prefetching. Four concurrent requests, a 128-tile memory cache, and a 60-second failure backoff limit load. No service availability is guaranteed; the bundled globe is the offline/error fallback. Tiny provider placeholder images are treated as missing coverage.

## Surface-distance calculation

`clearanceKm = satelliteEllipsoidHeightKm - (orthometricSurfaceElevationM + geoidUndulationM) / 1000`.
This is option 1: distance to the surface at the geodetic subpoint along the ellipsoid normal. It does not search for the nearest point elsewhere. It does not alter the rendered spherical globe.

Copernicus GLO-90 via Open-Meteo uses the EGM2008 vertical reference. `build_geoid.py` derives a 519,840-byte, little-endian int16 centimetre grid from PROJ's public-domain `us_nga_egm08_25.tif`, keeping every 12th node (0.5°). Both poles are included; longitude wraps. The source download stays outside the website. Metadata records hashes, grid layout, attribution and validation against 20,000 reproducible original-grid nodes (not an absolute accuracy guarantee). Rebuilding requires Pillow and NumPy; the normal website build does not.

One batch of up to 12 subpoints is requested at most every five seconds at 1×, or when paused at a new position. Cache limit: 256 rounded-to-4-decimal coordinate pairs. Display the sampled orbital height, never a current height combined with an old elevation. Hide samples older than 15 simulated seconds or from the future. Disable requests during fast-forward or when the document is hidden. Pending requests may finish after hiding the tab; disabling the switch aborts them and invalidates responses. Failures back off at least 60 seconds, respecting bounded `Retry-After`; toggling cannot bypass backoff. Missing/null/invalid values are not sea level. Negative elevations are valid.

Sources: https://open-meteo.com/en/docs/elevation-api (Copernicus credit required); https://open-meteo.com/en/terms (non-commercial free service and rate limits); https://github.com/OSGeo/PROJ-data/blob/master/us_nga/us_nga_README.txt (public-domain EGM2008). Keep public attribution in the project page and selected-satellite panel. No paid credentials are introduced.
