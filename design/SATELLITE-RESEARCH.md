## Research: Sharper satellite imagery ("six zoom levels deeper") for Trip Animator

### TL;DR
- **Esri already has the deep imagery. Our pipeline never asks for it.** `sat` is Esri World_Imagery with `maxzoom: 19` (`src/animator.ts:181`). Over land Esri actually serves level 17–19. The camera stops at zoom 14 (`MAX_ZOOM`, `src/timeline.ts:39`), so the deepest Esri level we request is about 15. Exports also stretch each imagery pixel 2× because MapLibre ignores `pixelRatio` when it picks tile levels.
- **We serve grey tiles where Esri runs out.** Past its last real level (13 over open ocean, about 17 in the Sahara and Siberia), Esri answers `200 OK` with a grey "Map data not yet available" image, and MapLibre draws it. Adding `?blankTile=false` turns these into 404s, and MapLibre then shows the parent tile instead.
- **Recommendation:** (1) Fetch Esri tiles through an `esri://` protocol that adds `blankTile=false` and reports missing tiles as 404, so no grey tiles. (2) Add one extra tile level on 2× screens and in export (imagery only). (3) Optionally raise `MAX_ZOOM` for short city legs (14 → 16–17). (4) Behind a server setting, add a premium layer (MapTiler or Esri Location Platform key, proxied by our server) that fades in from z15 to z16. All four keep the no-key default working.

---

### 1. Current state (measured)

| Item | Value | Source |
|---|---|---|
| Imagery source | Esri `World_Imagery/MapServer/tile/{z}/{y}/{x}`, 256 px tiles, 2 hosts, `maxzoom 19` | `src/animator.ts:154,181` |
| Labels | Esri `Reference/World_Boundaries_and_Places`, 256 px, opacity 0.85 | `src/animator.ts:182` |
| DEM / hillshade | Terrarium, `maxzoom 12` | `src/animator.ts:189` |
| Camera zoom | `zMid` = leg fitted to the screen, clamped 1.2–14; `zClose = min(zMid+1.6, 14)`; overview ≤12 | `src/timeline.ts:39,142-143,158` |
| Typical zClose (export 540×960 CSS px) | 1 km leg → 14 (clamped); 5 km → ~13.7; 100 km → ~9.4; 1000 km → ~6 | calculated with `mercatorFit` |
| Tile level chosen | `round(cameraZoom + 1 + lodBias)`. The +1 is because MapLibre's world is 512 px wide and our tiles are 256 px. Bias ≤ `MAX_LOD_BIAS` = 2, and it is 0 at zClose | `covering_tiles.ts:174,359`, `src/animator.ts:308` |
| Deepest imagery level in preview/export | **≈15** (camera 14 + 1), about 4.8 m per tile pixel | — |
| Export | Map is 540×960 CSS px with `pixelRatio: 2`. Tile choice doesn't account for `pixelRatio` (checked in `node_modules/maplibre-gl/src/geo/projection/covering_tiles.ts`), so **every imagery pixel is stretched 2×** in the 1080p video. Same on retina screens in the editor | `src/exporter.ts:72-77` |
| Editor | No `maxZoom` set, so the default of 22 applies. Past Esri's last level a region shows either stretched tiles or grey placeholders | `src/App.tsx:69` |

**Highest real Esri level, probed through the `tilemap` endpoint on 2026-10-08:** Paris 19, Lisbon coast 19, rural Bali 18, rural Kenya 18, Sahara 17, Siberia 17, Patagonia 17, **open Pacific 13**.
- Past that level `tile/` returns `200 image/jpeg`, 2521 bytes (md5 `f27d9de7…`), showing grey "Map data not yet available".
- With `?blankTile=false` the same request returns **404**. Real tiles are unaffected (Paris z13 → 200).
- The 404 response has **no `Access-Control-Allow-Origin`**, so the browser reports it as a CORS network error, not as a 404.
- Normal tiles come with `Cache-Control: max-age=86400` and CORS `*`.

**How MapLibre 6.13 handles missing tiles** (read from source):
- Any tile that fails to load is marked `errored` and has no data, so `_updateRetainedTiles` keeps the nearest loaded parent on screen (`tile_manager.ts:676-735`).
- A real `status === 404` also triggers an immediate update and skips the `error` event (`:198-202`).
- An empty or 204 response is drawn as a **transparent** tile and hides the parent (`raster_tile_source.ts:230-233`). So "missing" must be reported as a 404 error, never as empty data.

**Attribution is out of date.** Esri's current copyright text is "Esri, **Vantor**, Earthstar Geographics…" (Maxar is now Vantor). The labels source says "Esri, HERE, Garmin, (c) OpenStreetMap contributors". Our `attributionOf` (`src/exporter.ts:44`) still says "© Esri, Maxar · Mapzen" and has no credit for the labels.

### 2. What the announcement probably does technically
The product most likely had a global medium-resolution base (Sentinel-2 or Landsat-class, sharp to about z12–13). It now adds a high-resolution source on top for land areas, up to about z18–19, faded in by zoom. Six levels = about 64× more linear detail. In MapLibre 6 terms:
- **Two raster sources and two layers.** The base has `maxzoom` around 13 and is stretched above that ("Data from tiles at the maxzoom are used when displaying the map at higher zoom levels", [style spec: sources](https://maplibre.org/maplibre-style-spec/sources/)). The hi-res source has `minzoom` around 12–13, `maxzoom` 18–19, and an optional `bounds`.
- **Fade-in:** the hi-res layer gets `raster-opacity: ['interpolate', ['linear'], ['zoom'], z0, 0, z1, 1]`. `raster-opacity` supports interpolate expressions ([style spec: layers](https://maplibre.org/maplibre-style-spec/layers/)). Layer `minzoom` hides the layer below z0, so its tiles aren't fetched there either. `raster-fade-duration` is the per-tile fade on load, which is time-based and non-deterministic. We already set it to 0 and must keep it at 0.
- **Land only:** covered either by a coverage mask or by the provider returning 404 or transparent tiles over the sea, so the base shows through.
- **`raster-resampling: 'linear'`** (the default) keeps stretched tiles smooth; `nearest` makes them blocky.
- For us, Esri already *is* both layers: one pyramid from z0 to z19. The equivalent work is to **request** the deep levels, **hide** the gaps, and **optionally** put a better provider on top.

### 3. Imagery providers

| Provider | Key? | Max useful zoom | Coverage | Cost at our usage* | Video licence / notes | Attribution |
|---|---|---|---|---|---|---|
| **Esri World Imagery** (current) | none (public endpoint) | 19 for cities/EU/US, 17–18 rural, **13 ocean** (probed) | Global, Vantor 0.3–1 m | $0 | Esri says use is under its Master Agreement / Terms of Use ([OSM wiki summary](https://wiki.openstreetmap.org/wiki/Esri)). Use outside Esri software without an account is a grey area (**unverified**; the forum claim that it needs a subscription is not official) | "Esri, Vantor, Earthstar Geographics, and the GIS User Community" (service metadata) |
| **Esri via ArcGIS Location Platform** | API key | same as above | same | 2M basemap tiles/month free, then $0.15/1k; or sessions: 1k/month free, then $4/1k ([Esri newsroom](https://www.esri.com/about/newsroom/announcements/esri-arcgis-location-platform-adds-session-usage-pricing-for-basemaps)) | The licensed route for the same imagery. Video terms **unverified** | same |
| **Esri World Imagery (Clarity) beta** | none | metadata lists levels to 23 | Less processed, sometimes newer imagery | $0 | Beta, no SLA; terms as Esri | same + IGN |
| **Esri Wayback** | none | 19 | Dated past releases (newest 2026-09-24) | $0 | Useful only for a fixed release | same |
| **MapTiler Satellite** (`satellite-v2`) | key | 22; 5–50 cm in W. Europe/US, 1 m in populated areas, 2 m remote ([docs](https://docs.maptiler.com/schema-raster/satellite/)) | Global | Free plan: 100k requests/month, **non-commercial**, logo required. Flex $30/month incl. 500k, then $0.15/1k; a 256 px raster = 1 request, 512 px = 4 ([pricing](https://www.maptiler.com/cloud/pricing/)) | Video/export clause **unverified** | "© MapTiler © OpenStreetMap contributors" + imagery credit (**unverified** wording) |
| **Mapbox Satellite** | token | 16 global (1–2 m), 18 regional, 21+ select ([docs](https://docs.mapbox.com/data/tilesets/reference/mapbox-satellite/)) | Global 50 cm base outside Antarctica/Greenland | 750k raster tiles/month free, then $0.25 → $0.15/1k ([pricing](https://www.mapbox.com/pricing)) | Video not covered in the ToS text I could read; the Product Terms PDF was not readable (**unverified**). Use with MapLibre: **unverified** | "© Mapbox © OpenStreetMap © Maxar" ([attribution](https://docs.mapbox.com/help/dive-deeper/attribution/)) |
| **Google Map Tiles API** (satellite) | key + session token | up to 22 in cities, less over ocean ([overview](https://developers.google.com/maps/documentation/tile/2d-tiles-overview)) | Best | paid | **Ruled out:** no pre-fetching or caching beyond `Cache-Control`, which conflicts with our preload; promo videos must be <30 s and marked "for promotional purposes only" ([policies](https://developers.google.com/maps/documentation/tile/policies)) | Google logo + copyright string |
| **Bing / Azure Maps** | key | ~19 (**unverified**) | Global | Azure per-transaction pricing (**unverified**) | Bing Basic keys are retired; Enterprise ends 2028-06-30 ([MS Learn](https://learn.microsoft.com/en-us/bingmaps/rest-services/imagery)) | — |
| **Stadia Alidade Satellite** | key | 20, 512 px tiles ([docs](https://docs.stadiamaps.com/map-styles/alidade-satellite)) | Global | Credits on Standard/Pro plans (prices **unverified**) | **unverified** | Stadia/OSM + imagery credit |
| **EOxCloudless (Sentinel-2)** | none for viewing | 10 m, sharp only to about z13–14 | Global, cloud-free | Commercial licence needed | Commercial use needs an "EOX Commercial Attribution-RestrictedUse" licence ([licence](https://cloudless.eox.at/documentation/license)). **Shallower than Esri**, so useful only as a base or for style | "EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data YYYY)" |
| **NASA GIBS** | none | 250 m–30 m, about z9–12 (from memory) | Global, daily | $0 | Public domain-ish; too coarse | NASA EOSDIS GIBS |
| **USGS Imagery Only (NAIP)** | none | 1 m, cache visible to 1:9,028 ≈ z16 ([service](https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer)) | **Contiguous US only** | $0 | Public domain | USGS The National Map |

\*Usage estimate (**not measured; please instrument**): a 540×960 view tilted 55° needs about 30–50 imagery tiles at its normal level, and the detail lock multiplies that by about 2.4 (PROJECT.md). That gives an order of **5–15k imagery tiles per 30–60 s video** per raster source. The labels source doubles this, and preview and export download separately because their viewports differ. Per video, that works out to:
- MapTiler: about $0.75–2.25.
- Mapbox, after its free tier: about $1.25–3.75.
- Esri Location Platform: about 130–400 videos/month inside the free tier.

### 4. Recommendation
1. **Fix the grey placeholders (no key, ships first).** Add an `esri://` protocol next to `dem://`. It fetches `https://…?blankTile=false`. On failure (a CORS-less 404 shows up as a `TypeError`), it throws `Object.assign(new Error('no tile'), { status: 404 })` (the `status` field is what `tile_manager.ts:198` checks; verify in the browser). MapLibre then keeps the parent tile, so oceans stretch level 13 instead of drawing grey. Preload must fetch the same `?blankTile=false` URL and treat failures as done, which it already does.
2. **Retina/export sharpness (+1 level for free, 4× imagery tiles).** For raster imagery sources only, use `lodBias + log2(pixelRatio)` (capped) in the `calculateTileZoom` wrapper. Preload reuses `s.calculateTileZoom`, so planning stays consistent. Leave DEM and vector sources alone.
3. **"Deeper" camera, as a product choice.** Raise `MAX_ZOOM` from 14 to 16–17 for short urban legs (e.g. `zClose = min(zMid + 1.6, 17)`). With +1 for DPR, that requests Esri levels 17–18, which exist on most land, and the parent fallback covers the rest. This is 3–4 levels deeper than today. Esri does not give a clean six on every surface.
4. **Optional premium layer (key, server setting).** Add a `hi` source (MapTiler `satellite-v2`, or Esri through Location Platform) with layer `minzoom: 14` and `raster-opacity: interpolate linear zoom 14 → 0, 16 → 1`, placed between `sat` and `ref`. The fade follows camera zoom, so it is deterministic in export. With the detail lock, the hi-res tiles load throughout a leg, so the mid-leg pull-back only changes opacity, not which tiles are shown.
5. **Hillshade at deep zoom.** DEM stops at z12, so hillshade turns into blur above about z14. On satellite, fade `hillshade-exaggeration` to 0 between z13 and z15.

### 5. Implementation sketch
- **Placement:** all maplibre code moves to `services/map/` (CLAUDE.md). Today it lives in `src/animator.ts`, so this goes into the planned split. Imagery config stays as plain data (`{ id, tiles, tileSize, maxzoom, minzoom, fade: [z0, z1], attribution }`) with no maplibre types, so features never see the provider.
- **Server settings:** `/api/config` returns `imagery: { premium: 'maptiler' | 'esri-lp' | null, attribution }`. The key stays in `.env` (`MAPTILER_KEY` / `ARCGIS_KEY`) and never reaches the client.
- **Proxy:** `GET /api/tiles/:provider/:z/:x/:y` adds the key, maps upstream 404 or placeholder responses to 404, sets `Cache-Control`, and optionally writes a disk cache in `data/tiles/` with an LRU limit.
  - Benefits: the key stays secret, tiles are deduplicated across preview, export and re-exports (which cuts cost), and we get CORS and real 404s.
  - Catch: localhost runs HTTP/1.1, so one origin allows only 6 connections, against `FETCH_PARALLEL = 24` today. Shard across `localhost`, `127.0.0.1` and the LAN IP, or serve HTTP/2 (needs TLS; mkcert is already on the roadmap).
  - Licence: check each provider's caching rules before turning on the disk cache. Google forbids it; MapTiler, Mapbox and Esri are **unverified**.
- **Preload/LOD:**
  - Along a moving camera, tiles grow about **2^Δz** (the camera follows a corridor), not 4^Δz.
  - Close-ups at stops, intro and outro add about one screenful (~100 tiles with bias) per extra level each time the camera descends.
  - The detail lock caps the mid-leg cost at 4^`MAX_LOD_BIAS` = 16× the normal level, whatever `zClose` is.
  - Rough totals for a 5-stop trip: raising `MAX_ZOOM` by 3 adds about 1.5–3k tiles; the DPR +1 multiplies imagery about 4×; a premium layer adds one more pyramid from z14 up.
  - Expect a cold-cache start of about 15 s → 30–60 s for 30 legs (estimate). `BUFFER_AHEAD` streaming hides most of this.
  - Log `urls.length` per source in `plannedTiles` to measure before tuning.
- **Export determinism:** stays deterministic. `fadeDuration: 0`, `raster-fade-duration: 0` and zoom-only opacity keep frames pure functions of `t`. A parent fallback needs the parent loaded: it is, because preload plans `coveringTiles` and MapLibre keeps the parent pending, and `idle()` waits for it. CORS 404s fire `error` events until the protocol from step 1 is in.
- **Attribution:** `attributionOf` should take the imagery config. For example: "© Esri, Vantor, Earthstar Geographics · Labels: Esri, HERE, Garmin, © OSM · Terrain: Mapzen", plus the premium credit only when that layer is on.
- **Checks:** add a `*.check.ts` that tests the fade/LOD helpers as pure functions, and an e2e test that zooms to z16 over the Pacific and asserts no grey placeholder tiles (no 2521-byte responses).

### 6. Risks and open questions for the user
1. **Esri licence (biggest risk):** using the public Esri endpoint with no key from a non-Esri app, and posting the frames to social media, isn't clearly allowed (**unverified**). Do you want to move to an ArcGIS Location Platform key (2M tiles/month free) for clear compliance?
2. **Premium provider and budget:** MapTiler's free plan is non-commercial only. Is the app commercial? What monthly spend is acceptable (about $1–4 per exported video with Mapbox or MapTiler past free tiers)?
3. **Camera depth:** do you actually want street-level close-ups (raising `MAX_ZOOM`), or only sharper frames at today's framing (DPR +1 only, much cheaper)?
4. **Tile caching** on our server: is it allowed per provider? Needs a legal check before enabling the disk cache.
5. **Export time:** about 4× more imagery tiles means a longer first preload. Is that OK, or should the DPR +1 apply only to export?
6. Esri levels vary by region (ocean 13, remote land 17), so "six levels deeper everywhere" isn't possible with Esri alone. Stretched-but-not-grey is the honest fallback.

### Recommended next step
Ship steps 1 and 2 plus the attribution fix as one small PR. It's no-key, has a large visible effect and low risk, and should come with tile-count logging. Then decide on questions 1–3 before building the proxy and the premium layer.
