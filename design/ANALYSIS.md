# Trip Animator v2 — mockup analysis & implementation spec

Source `design/Trip Animator v2.dc.html` = **M** (template L9–620, logic `class Component` L621–1298). Screenshots: `/private/tmp/claude-501/-Users-mac-Documents-MyProjects-animated-map/127554a8-56e2-44ba-9fba-6d960d76d6f4/scratchpad/shots/*.png`. Read with PROJECT.md (current features), CLAUDE.md (layers), design/DS-RESEARCH.md (DS stack).

> The mockup is a prototype on fake data (places list, keyword parser, timers, box thumbnails are stand-ins). Take layout, copy, states, interaction rules from it; real behaviour comes from the current app.
> **Prototype-only, do not build:** floating dark "Layout" switcher 1a/1b/1c (M:319-326, 1231-1234); props `openaiKey`/`falKey`/`startWith`.
> **Mockup bugs, do not copy:** runtime calls `componentDidUpdate()` without args (throws, map never redraws); search dropdown clipped by scrolling panel (use a portal); pick banner hidden under the Layout switcher; nothing responsive; dark mode is a CSS-filter hack.

## 1. Screen map & navigation
```
Home ──(trip row / "New trip")── fly-in 2.2–2.6s ──▶ Editor
  ▲                                                   │
  └────────── logo click (saves) ── fly-out 2.4s ─────┘
Editor overlays: Figures (list/add/edit) · Settings · Export (prepare→captions→render→done) · Preview (NOT DESIGNED)
Gear (Settings) on every screen.
```
| Screen | State | Entry | Exit |
|---|---|---|---|
| Home | screen:'home' | start; logo in editor (goHome M:820-827) | row → openTrip (M:802-811); New trip → startNew (M:812-819) |
| Editor | screen:'editor' | above | logo → Home |
| Figures | libView list/add/edit | "Manage your figures →", "+ Your own" | ✕, scrim, "← Back" |
| Settings | setOpen | gear | ✕, scrim, Done |
| Export | exp.step | header "Export video" | Cancel/Done only (no ✕/scrim) |

- Proposed URLs: `/` Home, `/trip/:id` Editor; dialogs = local UI state. Header autosave status "Saving…" → "Saved" (700 ms debounce, M:900).
- One shared map, never unmounts. Open trip: fly to route bounds (camFor M:774-783), 2600 ms open / 2200 ms new, curve 1.6. Editor panels fade in after the flight: opacity + translateY(10→0), 320 ms (M:1140). Home column fades out −16px X, 420 ms (M:1163). Going home flies to trip centroid (lat clamped −40…55) at home zoom (M:707-711). Hidden tab → jump without animation (M:794).
- Header "New trip" in editor creates an empty trip in place, no fly-home (M:1173).

## 2. Screens

### 2.1 Header (M:35-48, 1147)
~57px (padding 10 16), whisper bottom border, white.
- Wordmark "Trip Animator" (button, 700 18, ls −0.25, hover translucent r5); goes Home in editor.
- Editor only: 1×20 divider; trip name inline input (260px, 600 15, transparent border → whisper on hover, focus #ddd + 2px focus ring, aria-label "Trip name"); save status 12px muted; "New trip" ghost sm; "Preview" secondary; "Export video" primary. Preview/Export disabled when stops < 2 or route building (M:1174).
- Gear: 36px icon button, #615d59, Lucide settings 18 stroke 1.5, hover translucent. All screens.

### 2.2 Home (M:174-202, 1163-1168)
- Globe fills area under header, auto-rotates (+0.035° lng/frame); pauses while flying, hovering a row, dragging, moving (M:735).
- Left column white over the map: width clamp(440, 42% map width, 600), padding 32 48 32 56, safe-centered, scrolls (hidden scrollbar). Map padding-left = column width; globe radius 0.4 × min(h, w − pad).
- Content (max 440, gap clamp(20px,4vh,32px)): H1 "Turn your trip into a video." (700, clamp(34px,6.2vh,48px), lh 1.05, ls −1.5, balance); lead "Add your stops, choose how you travel between them, and get a clip for Reels, TikTok or YouTube." (600 20 #615d59); primary lg "New trip"; label "Your trips" (12 600 #615d59); list max-h 260 scroll: rows r8 padding 10 hover bg 120ms — name 600 15 ellipsis, meta 12 ("4 stops · Air, Water, Land" / "No stops yet"), relative time 12 #a39e98 ("Just now / N min ago / N h ago / Yesterday / Oct 6", M:1141), arrow → muted. Newest first. Empty: "No trips yet. Your trips are saved here automatically."
- Map: trips with ≥2 stops as polylines #31302e 2px .9; stop circles r3 white 2px #31302e stroke. Row hover → that trip #0075de 3.5px (r4.5), globe eases to it 1100 ms (M:828).
- Terrain (×1.4), hillshade .35, sky in all map states (M:745-756).

### 2.3 Editor layout — default "1b Map first" (M:1080)
- Full-bleed map; floating cards (white, r12, whisper, shadow-deep, 16px margin, inner scroll, z 1000): Route top-left 356px; Video under Route (12px gap, never scrolls, Route shrinks); Inspector top-right 336px only while a segment is selected.
- Overlay layer z 950: pick banner top-center; toasts + "Building route…" pill bottom-center.
- Fit camera on selection / stop count / AI rebuild (M:891-897): padding top 60, left 390, bottom 60, right 60 (+340 with inspector). Segment maxZoom 11, route maxZoom 10, single stop zoom 6, 900 ms.
- (Alternatives 1a three panes / 1c one sidebar — prototype only.)

### 2.4 Route panel (M:52-169, 1084-1111)
- Header: "Route" 700 15 + "N stops" 12 muted; link "Describe with AI"/"Close" (13 500 #0075de) when stops > 0.
- Range note (stops ≥ 3): 8px blue dot + 12px text. Whole: "Video covers the whole route. Drag the blue handles to film only part of it." Set: "Video covers stops 2–4. The rest stays editable but is left out." + "Use whole route" link.
- Empty: "Where does your trip start?" (700 22) + "Search for a place, or describe the whole trip and the route is built for you."
- **Range rail** (stops ≥ 3, M:83-89, 1092-1097): 16px column, 2px line (#0075de in range, whisper outside); handles 16px white circles, 2px blue border, card shadow, at from/to stops, scale 1.2 while dragged. Drag a handle; hovering rows moves that end; from < to (M:982). Click a non-handle row moves the nearest handle. Titles "Drag to change where the video starts/ends", "Click to move the nearest handle here". Whole route = range null.
- **Stop row** (M:90-114, 1098-1100), padding 8 r8 gap 10:
  - Number badge 24px 600 11: first/last filled #31302e white text; middle white + whisper; endpoint of selected segment 2px #0075de; approximate 2px dashed #dd5b00.
  - Name 600 ellipsis + 12px muted "Start"/"Finish"; subtitle 12 #615d59 (region, country).
  - Approximate: Badge warning "Approximate" + "Placed by a guess. Check it and move it on the map."
  - Picking: row bg #f2f9ff + #097fe8 line "Click the map to place this stop · Esc to cancel".
  - Out of range opacity .45.
  - Actions on hover / while picking (M:1066): ↑ "Move up", ↓ "Move down", "Move" (active bg #f2f9ff, #097fe8), ✕ "Delete stop". 26px tall, min-w 24, r4, 13 #615d59, disabled #ddd. Touch: show on tap / via ⋯.
- **Segment row** (M:117-126, 1101-1110), button padding 2 8 r8: 2×26px line sample (solid land, dashed water, dotted air) in segment colour; label "Air · Plane" 13px; meta 12 muted "Building…" / "Straight line" (no road) / "×1.5" (pace ≠ 1). Selected bg #f2f9ff, #097fe8, 600; click again deselects. Out of range .45.
- **Search** (M:130-145, 1181-1185): 15px, padding 8 10, r4, #ddd border, focus ring. Placeholder "Where are you starting from?" / "Add the next stop". Popover (portal): white, whisper, r8, shadow-deep, padding 4, ≤6 items (name 600 14, sub 12), hover bg. Empty "No places match “q”." Enter adds first, Esc clears; add ↑/↓ and loading (missing in mockup). Adding (M:933): mode air if distance > Settings.flyKm else land; figure = type default; segment pending.
- **AI composer** (M:147-168, 1187-1195), when 0 stops (after "or" divider) or toggled: card #f6f5f4 r12 padding 14; "Describe your trip"; hint "Type it or say it. Stops, transport and figures are filled in for you." / "This replaces the current route.". No key: white notice "This turns on with an OpenAI key. Search works without it." and all disabled. Textarea 4 rows, vertical resize. Mic "● Speak" → "■ Stop" (bg rgba(221,91,0,.1), #b34a00). Status "Recording… press Stop when done" → "Recognizing your voice…" → "Reading your route…". "Build route" primary sm (disabled: no key / busy / empty). Success (M:1008): replace route, reset range, rename trip "First to Last", close composer, refit, segments pending, toast "Route replaced with N stops. Suggested name: “…”." (+ " Video range reset to the whole route."). Failure: error toast "Couldn't find a route in that. Name the places in the order you visited them."
- **Stop ops:** Delete (M:940) removes stop + incoming segment, neighbours re-join; invalid range or < 3 stops resets range with toast "Video range reset to the whole route."; no confirm. Reorder (M:948): swap points, segment settings stay in position (matches app). Move (M:957-974): any stop incl. first; crosshair + banner "Click the map to place **X**" [Cancel], Esc cancels; click sets coords, clears approx, reverse-geocodes (failure toast "Couldn't name this spot, so it keeps the name “X”."); both adjacent segments re-route. Dragging the selected segment's finish marker does the same.

### 2.5 Editor map (M:745-770, 862-898)
- Markers 24px numbered circles 600 11, shadow 0 2 6 rgba(0,0,0,.2); ends filled #31302e, others white; border approx dashed #dd5b00, selected endpoint/picking #0075de, else rgba(0,0,0,.25); out of range .45; selected finish marker grab cursor, title "X · drag to move".
- Lines: segment colour (fallback type default); width 3.5, selected 5.5 with 12px white casing; dashes land solid, water [2,1.6], air [0.1,2] round; opacity .92 in range, .25 out, .5 dotted while building. Keep the app's real air arcs.
- 22px hit layer, pointer cursor; click selects, empty map deselects, Esc cancels pick.
- Controls bottom-right: Navigation (visualizePitch) + compact Attribution.

### 2.6 Segment inspector (M:220-295, 1117-1123, 1203-1218)
Padding 16, gap 20, labels 12 600 #615d59.
1. Header: caption "Segment 3 of 3 · drag the finish marker to move it", title "Kadıköy → Şile" (700 18), ✕ deselect.
2. Travel by: Segmented Air/Land/Water. Notes "Climbs and flies an arc." / "Follows real roads." / "Goes in a straight line.". No road callout "No road found here, so this segment runs in a straight line.". Type change swaps figure to type default if needed, re-routes (M:976).
3. Figure: 3-col tiles (whisper, r8, padding 6, min-h 96; 60px well #f6f5f4 r6; 12 500 name; 11 muted sub). Selected 1.5px #0075de. Built-ins first, then custom of this type or Any (sub "Yours"); generating disabled .4 "Generating…"; failed hidden. Dashed "+ Your own" tile → Add with type preset. Link "Manage your figures →".
4. Line color: swatches 22px — Charcoal #31302e, Blue #0075de, Teal #2a9d99, Green #1aae39, Orange #dd5b00, Pink #ff64c8, Purple #391c57, Brown #523410; selected 2px white border + 2px #097fe8 ring; "+" custom wraps native color input. Note "Only this segment" / "Default for land segments". Links "Use default" (when overridden), "Apply to all segments" (toast "Color applied to all N segments.").
5. Pace 0.25–3 step .25 "×1", help "On top of the video speed."
6. Smoothing (land/water) 0–4 step .5, "Exact"/"×1", end labels "Exact road"/"Smooth turns". Air: "Air segments fly a smooth arc, so there is no smoothing."

### 2.7 Video panel (M:296-316)
"Video" 700 15, 72px label column. Map style native select Satellite/Streets/Dark/Japanese print. Speed 0.5–2.5 step .25 "×1". Format moved to Export. (Leftover renderVals — style/format chips, from/to selects, videoHint — are not part of the design.)

### 2.8 Settings (M:450-529, 1151-1161)
Modal 640, r16, padding 24, gap 24; sections separated by whisper top border + 20px padding. Header "Settings" + "Apply to all your trips." + ✕; changes live.
- Appearance: Segmented Light/Dark/System (default System), max-w 320.
- Default figures: "Used for new segments of each type." Row per type: 56px label + 76px tiles (40px well, 11px name), built-in + ready custom; selected 1.5px blue.
- Line colors: "Segments with their own color keep it." Row per type: swatches + custom. Defaults air #0075de, land #dd5b00, water #2a9d99.
- New segments: "Fly when the next stop is farther than 600 km", slider 100–2000 step 50, help "Closer stops start as land segments."
- Export quality: "Size of the long side of the video." 1080 px / 1920 px (default).
- Footer: primary "Done", ghost "Reset to defaults" (DEF_SETTINGS M:650).

### 2.9 Figures dialog (M:328-448, 1236-1263, 1285-1297)
Modal 720, r16, padding 24.
- **List:** "Your figures" + "Shared across all your trips." + primary "Add figure" + ✕. Grid auto-fill minmax(200,1fr) gap 12. Card r12, 120px well, padding 12: name + status Badge Ready(success)/Generating…(warning)/Failed(neutral); meta "Travels by: Land" / "About 2 minutes. You can keep working." / "Couldn't make a model from this photo. Try another one."; "Edit" secondary sm (ready only), "Delete" ghost sm (no confirm). Empty "No figures yet. Upload a .glb model or a photo." Status self-updates.
- **Add:** "← Back" + "Add a figure", columns 240/1fr. Left: 200px preview (photo, or "No file yet" / "model.glb · ready to use right away" / "HEIC photo · preview after upload"), file button "Choose file"/"Choose another file" (.glb, image/*, .heic, .heif), hint "A ready 3D model (.glb) or a photo. iPhone HEIC photos work.". Right: tips callout "For the best model, the photo should show one whole object, from the side or at 3/4. The background is removed for you."; no fal key warning "Making a model from a photo needs a fal.ai key. You can still upload a ready .glb model."; Input "Name" (from filename); "Travels by" Air/Land/Water/Any + help "Shows up only on segments of this type. “Any” shows up everywhere."; button "Make 3D model" (photo) / "Save figure" (glb) + note "Takes about 2 minutes. You can keep working."; disabled without file+name or photo w/o key. Save prepends + returns to list; photo → Generating + toast "“X” is generating. It updates by itself in about 2 minutes."
- **Edit:** columns 300/1fr. Left 260px 3D preview, legend "Light face = nose" / "Direction of travel →", hint "Turn it until the nose points along the arrow and the wheels or hull face down, like the built-in figures.". Right: Name, Travels by, pose buttons (secondary sm) Flip 180° / Turn 90° / Roll 90° / Pitch 90° / Reset (preview animates 200ms), Size 0.5–2 step .1 "×1.0", note "Pose and size apply everywhere this figure is used: thumbnails, the map and the video.", "Save" (toast "Figure updated everywhere it is used.") + ghost "Delete figure".
- Delete rule (domain): segments using it fall back to first built-in of their type; settings defaults pointing at it reset (M:1292).

### 2.10 Export dialog (M:531-618, 1025-1045, 1265-1281)
Modal 900, r16. Header "Export video" + step pills "1. Prepare · 2. Captions · 3. Render · 4. Done" (12 600, padding 4 10; current bg #f2f9ff text #097fe8, past #615d59, future #a39e98).
- Prepare: "Loading the map for your video", 320×6 bar (track #f6f5f4, fill #0075de), tabular %, ghost sm "Cancel".
- Captions: left 400×440 well (#f6f5f4 r12) with the frame at chosen aspect (max 360w/400h, r4, card shadow, 200ms resize); overlay preview: title top-left (700 17), segment pill bottom-left (white 11 600 "Air · Berlin → Istanbul"), 3px progress, 8px attribution. Right: "Captions" Switch rows Trip name / "Segment label · from → to" / Progress bar + locked row "Map attribution · always on, required by the map license"; "Format" 2×2 ChoiceCards 9:16 Reels · TikTok / 4:5 Instagram post / 1:1 Square / 16:9 YouTube (selected 1.5px blue); help "The frame reloads in a few seconds after you switch."; while reloading "Reloading map…" and Render disabled; "Render video" primary + "Cancel" ghost.
- Render: "Rendering frame by frame", bar, %, warning callout "**Keep this tab open and visible.** Rendering stops if you switch tabs or minimize the window.", ghost "Cancel render".
- Done: "Your video is ready", file name "Berlin to Şile · 9x16.mp4", primary "Download MP4", ghost "Done", hint "On a phone, Share sends it straight to Instagram or TikTok."
- Missing in mockup → add: error state, Share button, inline video. Captions + format stored on the trip; resolution from Settings.

### 2.11 Toasts (M:209-216, 902-906, 1199-1201)
Bottom-center stack, max 3, max-w 440. Info: white, whisper, r8, padding 10 12, 13px, shadow-deep, ✕, auto-dismiss 5.5 s. Error: bg #fff7f2, border rgba(221,91,0,.3), text #b34a00, sticky. Click dismisses. "Building route…" pill: white, card shadow, 13 500 #615d59.

## 3. Design system inventory

### 3.1 Tokens
- From DS: `--color-black`, white, `--color-blue` #0075de, `--color-blue-active` #005bab, warm-white #f6f5f4, warm-dark #31302e, warm-gray-500 #615d59, warm-gray-300 #a39e98, input-border #ddd, translucent rgba(0,0,0,.05), focus #097fe8, badge-bg #f2f9ff, badge-text #097fe8, accents teal/green/orange/pink/purple/brown (= line palette), border-whisper, border-input, shadow-card, shadow-deep, focus-ring, duration 120/200, ease-standard, scale-hover 1.05, scale-active .9.
- Radii 4/5/8/12/16/pill; mockup also uses **6** (segmented track, thumbnail well) → add.
- Spacing used 2/3/4/6/8/10/12/14/16/20/24/32/48/56 → add 10/20/48/56.
- Type (Inter): hero clamp 34–48, 22, 20, 18, 17, 15, 14, 13, 12, 11, 8. UI base 14px/1.43 (M:1146), not DS 16 → add `--type-ui`. tabular-nums for all value readouts.
- Hard-coded in mockup → tokenize: dark root #1a1a1a; warning text #b34a00; warning surface rgba(221,91,0,.1); error border rgba(221,91,0,.3); error bg #fff7f2; success badge #1f7a77 on rgba(42,157,153,.1); frame placeholder #e7e3de; dashed/marker border rgba(0,0,0,.25); scrim rgba(0,0,0,.2); marker shadow 0 2 6 rgba(0,0,0,.2); hillshade #4a3f35; motion 320 ms (chrome) / 420 ms (home) → `--duration-slow` / `--duration-page`.
- Domain constants: named line palette (M:649), per-type default colours, per-type dash patterns.

### 3.2 Primitives (src/ds)
| Primitive | Variants / props |
|---|---|
| Button | primary/secondary/ghost/dark × sm (4/12, 14px) / md (8/16, 15px) / lg (12/20, 16px); disabled, icon/iconRight, href, + loading. Hover: primary → blue-active, secondary scale 1.05, ghost underline; active scale .9; disabled translucent + muted. Port from DS bundle. |
| LinkButton | 12–13px #0075de, hover underline |
| IconButton | 26/28/36px, r4, #615d59, hover translucent; active (#f2f9ff/#097fe8), disabled (#ddd); aria-label required |
| Input | label, hint, disabled; md (16px, padding 6) / search (15px, padding 8 10); focus ring |
| InlineTitleInput | header trip name |
| Textarea | rows, vertical resize, disabled |
| Select | styled |
| SearchCombobox | portal popover listbox, item title+sub, empty, loading, Enter/Esc/↑↓, aria-activedescendant |
| Segmented | track #f6f5f4 r6 padding 3 gap 3; selected white + whisper + card shadow + 600; others #615d59 500; 13px padding 6 4; 2–4 options; radiogroup |
| ChoiceCard | r8 padding 8 10, label + 11px sub; selected 1.5px blue |
| Slider | label, value formatter, min/max/step, end labels, help |
| Switch | 30×18, on #0075de / off #ddd, 14px knob, 120 ms; locked variant; role=switch |
| Badge | blue/neutral/success/warning |
| ColorSwatchPicker | 22px swatches + native custom, selected ring |
| Card / Panel | floating (r12, shadow-deep) or flat; section header (title, meta, action) |
| Callout | neutral (#f6f5f4) / warning / info-white; r8, 12–14px |
| Dialog | scrim, r16, padding 24, widths 640/720/900, max-h 100vh−48 scroll; header (title, subtitle, close); `dismissible`; focus trap, Esc; full-screen sheet on mobile |
| Stepper | pill steps current/past/future |
| Progress | 6px / 3px bar, %, 100 ms linear |
| Toast / Toaster | info (5.5 s) / error (sticky), max 3, aria-live |
| StatusPill | "Building route…", pick banner with action |
| ThumbnailTile / Grid | well 40/60/120, name, sub, selected, disabled .4, dashed add variant; grid 3-col or auto-fill minmax 200 |
| ListRow | trip row (title, meta, trailing, chevron), stop row, segment row |
| NumberBadge | 24px filled/outline/selected/dashed-warning — shared by list and map markers |
| RangeRail | 2 handles aligned to rows; pointer + touch + keyboard; role=slider |
| Menu / Popover | not in mockup; needed for trip actions and mobile overflow |
| Tooltip | optional (mockup uses `title`) |

### 3.3 Icons
Only real icon in mockup: Lucide `settings` (stroke 1.5, 18px). Rest are glyphs; the app uses emoji (banned in DS chrome). Use lucide-react behind `ds/Icon` (16/18/20, stroke 1.5, currentColor): settings, arrow-up, arrow-down, map-pin (Move), x, arrow-left, arrow-right, plus, mic, square, play, pause, download, share, trash-2, more-horizontal, triangle-alert, loader, plane/car/ship (optional), grip-vertical (optional).

## 4. Feature delta vs PROJECT.md

### 4a. New in the mockup
1. Home with spinning globe + trip list (meta, relative time, hover fly-to, highlighted lines, empty state); replaces trip `<select>`.
2. Fly-in/fly-out transitions; panels fade in after the camera settles.
3. Global Settings: theme; default figure per type; default line colour per type; fly threshold 100–2000 km (today hard-coded 600 km in `route.ts:defaultLeg`); export long side 1080/1920; reset to defaults. Needs persistence.
4. Per-segment line colour (palette + custom, "Use default", "Apply to all") → `Leg.color`; animator + exporter use it.
5. Dark mode for the chrome.
6. Move any stop by map click incl. the first; finish-marker drag stays.
7. Video range via rail handles + "Use whole route" + note; replaces the selects.
8. Stop subtitle (region, country) → `Stop.sub` from geocoder.
9. AI parse renames the trip "First to Last" + toast with count.
10. Empty-trip onboarding: heading, search, "or", composer.
11. Figures library dialog: status cards with failure copy, Add/Edit, "+ Your own" with type preset, photo tips, fal-missing warning, orientation legend; failed hidden from picker, generating disabled.
12. Export redesign: 4-step stepper, format inside export with frame reload, Switches + locked attribution, live caption preview, "Keep this tab open" callout.
13. Status UX: Saving/Saved, Building pill, per-segment "Building…", "Straight line" + no-road callout, info/error toasts, range-reset and couldn't-name toasts.
14. Header: inline trip name, "New trip", Preview/Export disabled under 2 stops or while building.
15. Inspector panel "Segment n of N"; segment rows show a line sample.

### 4b. App features missing in the mockup — keep
| App feature | Placement |
|---|---|
| Real preview player (play/pause, scrub, time, buffering, preload %, exit) | Preview mode: chrome fades out; floating bottom-center transport card (play/pause, scrub Slider, tabular time, "Buffering…", "Exit preview" / Esc); preload shows Progress + "Loading the map… N%" |
| Delete trip | Home row ⋯ menu (Rename / Delete + confirm) + editor overflow |
| Inline `<video>` in export Done | replaces the frame in Done |
| Share (Web Share) | "Share" primary when `canShare({files})`, Download secondary |
| Export error | warning Callout + "Try again" / "Close"; WebCodecs unsupported |
| JSON legs input in Describe | keep silently in the composer |
| Mobile layout | §5 |
| Russian UI | see open questions |
| Real 3D thumbs + pose rx/ry/rz/scale | keep; Flip/Turn/Roll/Pitch = ry+180 / ry+90 / rz+90 / rx+90 |
| Server generation errors, HEIC conversion | server text in card meta |
| Approx geocode logic, actions.jsonl logging | keep (`api.log` in hooks) |

### 4c. Changed behaviours
- Mockup `land` = app `ground` (label "Land", domain keeps `ground`).
- Keep the app's `Stop.leg` + `chain()`; mockup delete/reorder/range semantics already match.
- New-segment defaults from settings instead of constants.
- Line colours: per-type defaults + per-segment overrides.
- Range: selects → rail, shown only when stops ≥ 3.
- Format: Video panel → Export; new resolution setting.
- Trips: dropdown → Home; header "New trip" creates in place.
- Move: only selected leg's finish → any stop.
- Figure orientation hint: app "nose left-down" vs mockup "nose along →" — align with `figures.ts`.
- Figure delete reassigns segments and defaults (domain rule).
- `LegEditor` inline in list → separate inspector; list rows only select.

## 5. Responsive & dark mode
Mockup has none (fixed px; breaks at 390 and 768). Proposed:
| Range | Rules |
|---|---|
| ≥1080 | as designed (1b) |
| 600–1079 | Route panel 320px; inspector floats over map without padding change, or replaces Route content with a back arrow; "New trip" into overflow |
| <600 | header 48px (wordmark/back, truncated name, ⋯ menu with New trip + Settings; Export primary sm; Preview icon). Home: globe top ~40vh, content below, hero 34px. Editor: full-bleed map + bottom sheet with snap points (peek ~120px "Route · N stops" + search / half / full); Video section in sheet; Inspector pushed inside sheet with "← Route"; camera padding follows sheet. Dialogs full-screen sheets (export frame on top ≤50vh, figures forms one column). Touch: row actions without hover, ≥44px hit areas, tap to pick |

Dark mode: real tokens via `[data-theme=dark]` + `prefers-color-scheme` for System (mockup used a filter hack). Computed palette:
| Token | Light | Dark |
|---|---|---|
| surface/card | #ffffff | #191919 (root #1a1a1a) |
| surface-alt | #f6f5f4 | #222120 |
| text-primary | rgba(0,0,0,.95) | #dbdbdb |
| text-secondary | #615d59 | #9e9a97 |
| text-muted | #a39e98 | #6a6662 |
| warm-dark | #31302e | #c0bfbe (map markers stay #31302e) |
| accent/link | #0075de | #45a3f7 |
| focus | #097fe8 | #3c9bef |
| badge-bg / selected row | #f2f9ff | #1a1f24 |
| input-border | #ddd | #343434 |
| whisper | rgba(0,0,0,.1) | rgba(255,255,255,.1) |
| hover | rgba(0,0,0,.05) | rgba(255,255,255,.05) |
| warning text / surface | #b34a00 / rgba(221,91,0,.1) | #e38f54 / #2d221b |
| error toast bg | #fff7f2 | #231d19 |
| scrim | rgba(0,0,0,.2) | rgba(0,0,0,.45) |
| shadows | DS | stronger alpha + whisper border |
Data colours (line palette, segment colours, video frame) are the same in both themes.

## 6. Implementation mapping (CLAUDE.md)
- domain: UserSettings + defaults, `defaultLeg(a, b, settings)`, `segColor`, figure-delete reassignment, range reset (already in `chain()`); new fields `Leg.color`, `Stop.sub`.
- services/map: home globe (spin, trips layer, hover), editor layers (casing, dashes, hit layer, pending, out-of-range), DOM markers, fit with dynamic padding, pick mode.
- features: trips (home, open/new/delete, autosave), route (list, search, AI, rail, pick), figures (picker, library), settings, preview (player), export (stepper).
- All UI strings in one module.

## 7. Open questions
1. Layout 1b (default) vs 1a vs 1c? 2. Approve the proposed preview player? 3. Language EN / RU / i18n? 4. Mobile bottom sheet + full-screen dialogs? 5. Settings persistence: localStorage or server? 6. Line colours in preview/export too, or editor only? 7. Does Preview need aspect framing? 8. "Long side 1080" → 9:16 = 608×1080 — intended? 9. Trip delete/rename placement; confirm or undo for deleting stops/figures? 10. AI parse auto-rename when the user already named the trip? 11. Move for first stop confirmed? 12. Figure orientation wording? 13. Dark theme also switches map style? 14. Speed step 0.25 vs 0.1? 15. Export not dismissable by ✕/scrim — intended? 16. Done: inline video + Share primary on phones? 17. Search: recents / my location / loading?

## 8. v3 responsive layer (supersedes the responsive part of §5)
Source `design/Trip Animator v3.dc.html` = **M3**. Same features/tokens/desktop as v2; adds phone + tablet. Screens `scratchpad/shots/v3-*.png`. Mockup bugs: `lay()` recursion at M3:745 crashes desktop (patch `this.state.layout||this.props.layout||'map'`); v2 `componentDidUpdate` bug remains.

### 8.1 Modes
| Mode | Width | Notes |
|---|---|---|
| phone | < 700 | bottom sheet |
| tablet | 700–1099 | one floating column |
| desktop | ≥ 1100 | = v2 1b |
Mockup ties touch affordances to width; **implement** `useViewportMode()` via matchMedia (700/1100) + separate `(pointer: coarse)` flag for hit sizes and copy ("Tap…" vs "Click…"); mirror to `html[data-mode]`. Root height `100dvh`.

| Aspect | Desktop | Tablet | Phone |
|---|---|---|---|
| Header padding/gap | 10 16 / 12 | same | 8 10 / 6 |
| Logo in editor | "Trip Animator" | same | "←" icon button 40×40 (aria "Home") |
| Divider, save status | shown | shown | hidden (status in sheet footer) |
| Trip name | 260px | flex 0 1 260, truncates | same |
| "New trip" in editor header | shown | → overflow ⋯ menu (mockup drops it — keep via menu) | → overflow ⋯ |
| Preview/Export | "Export video" | "Export" | in sheet footer |
| Editor panels | Route+Video left, Inspector right | one column; Inspector replaces it | bottom sheet |
| Home column | clamp(440,42%,600) | max(360, min(600,42%)), padding 32 | bottom card |
| Coarse hit sizes | 26px icon btns, 16px rail, 22px swatches | 40px tall / 36 min icon btns, rail 24 / handle 20, swatches 32, segment row ~44px | same |

### 8.2 Phone
- Header 57px: back, trip name, gear. Add `viewport-fit=cover` + safe-area insets (missing in mockup).
- Home: globe on top (camera padding bottom 56% of map h, globe radius 0.42·min(w, h−pad)); content in a bottom card: max-h 58%, r 16 16 0 0, whisper top, shadow-deep, padding `24px 20px calc(20px + env(safe-area-inset-bottom))`, scrolls; reset scroll on entering Home. Map controls top-right.
- Editor bottom sheet: map full area, sheet over it. White, r 16 16 0 0, whisper top, shadow-deep, z 1000, inner scroll. Snap heights collapsed `46dvh`, full `calc(100dvh - 72px)`; transition max-height 200ms standard ease. Sticky grabber button (36×4 #ddd pill, padding 12 0 10), tap toggles, aria "Expand panel"/"Collapse panel". **Add** (missing in mockup): drag-to-snap with velocity, and a peek height (~120px: "Route · N stops" + search) so the map isn't always ≥54% covered. Starting a pick collapses the sheet. Content: Route header, range note, list, search, AI composer, Video section (native select 16px font to stop iOS zoom), sticky footer (save status + secondary "Preview" + primary "Export", 40px, padding `10px 16px calc(10px + env(safe-area-inset-bottom))`).
- Inspector on phone: selecting a segment swaps the sheet content to the Inspector (same snap); ✕ becomes "← All stops" (link 14/500 blue, 32px, above caption) which deselects; caption drops "· drag the finish marker…". Keep the Preview/Export footer and safe-area padding here too (mockup lacks them).
- Map controls: top-right column; attribution compact and **collapsed by default** (mockup shows it expanded, covering the pick banner and toasts). Overlay layer (pick banner, toasts) gets a top inset below the controls.
- Camera padding: `{top 40, left 32, right 32, bottom sheetHeight + 16}`; refit when sheet snap changes (sheet reports its height).
- Touch instead of hover: stop row actions shown when the row is tapped/selected, or via an always-visible ⋯ Menu (Move up / Move down / Move on map / Delete) — do not rely on emulated hover. Range rail: touchstart picks nearest end, touchmove hit-tests rows via `[data-idx]`, `touch-action:none`. Pick copy "Tap the map to place X" / "Tap the map to place this stop" (no Esc hint). Home row hover-fly disabled; tap opens.
- Toasts: top-center, top below map controls, max-w calc(100% − 24px). Elsewhere bottom 20, max 440.
- Dialogs: mockup keeps a centered card (max-h calc(100dvh − 24px), padding clamp(16px,4vw,24px)); **implement full-screen sheet below phone** (100dvh, r 0, sticky header with close, safe areas). Figures Add/Edit grids `repeat(auto-fit, minmax(min(100%,240|280px),1fr))` → one column. Export captions: well `min(400px,100%) × min(440px,72vw)`, options column flex 1 1 280; **fit the frame inside the well** (mockup overflows at 9:16); on phone show "Step 2 of 4" instead of wrapping pills.
- AI composer / search on phone: scroll into view on open; search popover via portal (keyboard-safe).

### 8.3 Tablet (700–1099)
- Grid `356px | 1fr`; Route card floats top-left (margin 16 0 0 16, max-h calc(100% − 16px), scrolls), Video under it (gap 12). Selecting a segment: Inspector replaces Route+Video in the column (full column height, margin 16), with "← All stops"; no right inspector.
- Camera padding `{top 50, left 380, right 50, bottom 50}` — **add** room for bottom-right controls (mockup puts the finish marker under them).
- Pick banner centred on the free map area (left offset 372), above panels (mockup hides it under the Route card).
- Header: "Trip Animator" | name | Saved | Preview | "Export" | gear; New trip via overflow.

### 8.4 New/changed DS primitives
| Primitive | Props |
|---|---|
| BottomSheet | controlled `snap: 'peek'\|'collapsed'\|'full'`, `onSnapChange`, configurable heights, sticky Grabber (tap toggles, drag to snap), optional sticky `footer` with safe-area padding, `onHeightChange` for camera padding |
| useViewportMode | `'phone'\|'tablet'\|'desktop'` + `coarse`; sets `html[data-mode]` |
| EditorShell (feature layout) | desktop 3 slots; tablet single column (inspector replaces route+video); phone BottomSheet(content = inspector ?? route+video, footer); owns camera padding per mode |
| BackLink | "← All stops" (LinkButton variant) |
| IconButton | `size="touch"` 40px from coarse flag |
| ColorSwatchPicker | size 22 / 32 |
| RangeRail | touch track 24 / handle 20, row hit-testing, keyboard, role=slider |
| ListRow (stop) | touch reveal or ⋯ Menu |
| Dialog | `fullScreenBelow="phone"` |
| Toaster | `placement` top on phone |
| Header | phone: back icon, truncating title, ⋯ (New trip, Settings); tablet: short "Export" |

### 8.5 Still missing in v3 (we design per §4b)
Preview player, inline video + Share + error in Export Done, trip rename/delete placement, New trip on tablet/phone (→ overflow menu).
