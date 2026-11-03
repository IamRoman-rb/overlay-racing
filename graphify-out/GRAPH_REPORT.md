# Graph Report - overlay-racing  (2026-11-01)

## Corpus Check
- 122 files · ~206,409 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: .css 3, .ico 2, .example 1)

## Summary
- 779 nodes · 1861 edges · 32 communities (28 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.84)
- Token cost: 389,662 input · 0 output

## Community Hubs (Navigation)
- Football Graphics & Windows
- Race Overlay Graphics
- Race App Shell & i18n
- Race Layout Editor & Fonts
- Race Electron Main Process
- Electron Builder Config
- Distribution & Module Docs
- Football Fonts & Logo Cover
- Launcher Module Manager
- Football Layout Editing
- Launcher Main & Logging
- Module Release Script
- Root Package & Lint
- System Stats & Chromium Bundle
- Football Electron Main
- Dev Dependencies
- Live Timing Scraper
- npm Scripts
- Race Server & Tunnel
- Race Cloud Sync & Penalties
- Launcher Login & Modules UI
- Launcher API Client
- Penalty & Voting Web Pages
- Runtime Dependencies
- Vite Icon Sprite
- Football Logo Asset
- Vite Configs
- Launcher Logo Asset
- Race Logo Asset
- Vite Favicon
- Checkered Flag Asset
- Anonymous Driver Asset

## God Nodes (most connected - your core abstractions)
1. `getAnimDuration()` - 47 edges
2. `getSkinStyle()` - 47 edges
3. `getRollClip()` - 43 edges
4. `react` - 41 edges
5. `Overlay()` - 32 edges
6. `Icon()` - 26 edges
7. `GraphicPreviewContent()` - 26 edges
8. `ControlPanel()` - 24 edges
9. `Stage()` - 22 edges
10. `Crest()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `football/index.html (Overlay Fútbol entry)` --semantically_similar_to--> `race/index.html (Overlay Racing entry)`  [INFERRED] [semantically similar]
  football/index.html → race/index.html
- `football/index.html (Overlay Fútbol entry)` --implements--> `Football Module (manual data, football-data.json)`  [INFERRED]
  football/index.html → DISTRIBUCION.md
- `PERSONALIZAR Tab (per-graphic customization)` --conceptually_related_to--> `Racing Google Fonts Set (Exo 2, Orbitron, Racing Sans One, Titillium...)`  [INFERRED]
  DISTRIBUCION.md → race/index.html
- `race/index.html (Overlay Racing entry)` --implements--> `Race Module (race/)`  [INFERRED]
  race/index.html → README.md
- `Streaming Module (reserved, no manifest yet)` --references--> `Module Contract: module.json + main.cjs start(ctx)`  [EXTRACTED]
  streaming/README.md → DISTRIBUCION.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Module distribution pipeline (publish, sign, download, verify, start)** — distribucion_module_pack_publish, distribucion_overlayracing_server, distribucion_ed25519_package_signing, distribucion_module_download_api, distribucion_launcher_installer, distribucion_module_start_ctx_contract [EXTRACTED 1.00]
- **Modules implementing the module.json + main.cjs contract** — readme_race_module, distribucion_football_module, streaming_readme_streaming_module, distribucion_module_start_ctx_contract [INFERRED 0.85]

## Communities (32 total, 4 thin omitted)

### Community 0 - "Football Graphics & Windows"
Cohesion: 0.05
Nodes (106): App(), bridge, getSocket(), inElectron, mode, Branding(), Avatar(), Crest() (+98 more)

### Community 1 - "Race Overlay Graphics"
Cohesion: 0.11
Nodes (59): Battle(), ScrollingName(), Branding(), DriverInfo(), Evento(), FastestLap(), FinalResults(), parseLapSeconds() (+51 more)

### Community 2 - "Race App Shell & i18n"
Cohesion: 0.07
Nodes (47): App(), Icon(), GLYPH_ICONS, TOKEN_RE, withIcons(), createTranslator(), t(), LANGUAGES (+39 more)

### Community 3 - "Race Layout Editor & Fonts"
Cohesion: 0.07
Nodes (52): LayoutEdits(), COVER_ATTR, hexToRgb(), LogoCover(), DEFAULT_SIZES, getFinalResultsDefaultSize(), getFinalResultsSize(), BASE_FAMILIES (+44 more)

### Community 4 - "Race Electron Main Process"
Cohesion: 0.05
Nodes (32): { app, BrowserWindow, ipcMain, dialog, shell }, backupPath, broadcastState, championshipData, cloudConfig, currentDriversForVote, dbPath, defaultPositions (+24 more)

### Community 5 - "Electron Builder Config"
Cohesion: 0.06
Nodes (31): build, appId, asarUnpack, copyright, directories, extraResources, files, nsis (+23 more)

### Community 6 - "Distribution & Module Docs"
Cohesion: 0.10
Nodes (20): DISTRIBUCION.md - Installer & Modules Guide, Five League Styles (Bundesliga, Premier League, LaLiga, Liga Argentina, MLS), Football Graphics (scoreboard+clock, lineup, match presentation, goal/sub/card alert), Football Module (manual data, football-data.json), Launcher / Installer (launcher/), License Login & Session Token, MODULE_CATALOG (backend/src/licensePlans.js), Module Download API (/api/public/modules/<id>/latest, /download/<version>) (+12 more)

### Community 7 - "Football Fonts & Logo Cover"
Cohesion: 0.11
Nodes (17): FONT_OPTIONS, FONTS, GOOGLE_FONTS_URL, installFonts(), hexToRgb(), LogoCover(), analysisCache, analyzeLogo() (+9 more)

### Community 8 - "Launcher Module Manager"
Cohesion: 0.13
Nodes (22): AdmZip, api, { app }, compareVersions(), crypto, describe(), DEV_MODULE_DIRS, ensureModule() (+14 more)

### Community 9 - "Football Layout Editing"
Cohesion: 0.15
Nodes (23): demoLive(), GRAPHICS, applyLayoutEdits(), clearOffset(), describeObject(), detectObjects(), fallbackOriginals, hasOwnText() (+15 more)

### Community 10 - "Launcher Main & Logging"
Cohesion: 0.10
Nodes (20): { app }, fs, installLogger(), logDir, logPath, path, util, api (+12 more)

### Community 11 - "Module Release Script"
Cohesion: 0.11
Nodes (19): adm-zip, AdmZip, all, args, buildModule(), changed(), detectModules(), { execFileSync } (+11 more)

### Community 12 - "Root Package & Lint"
Cohesion: 0.11
Nodes (20): author, name, description, main, name, private, type, version (+12 more)

### Community 13 - "System Stats & Chromium Bundle"
Cohesion: 0.12
Nodes (17): getSystemStats(), latestHw, os, readCpuTimes(), { spawn }, startHardwarePoller(), stopHardwarePoller(), cacheDirectory() (+9 more)

### Community 14 - "Football Electron Main"
Cohesion: 0.14
Nodes (17): { app, BrowserWindow, ipcMain, dialog }, createWindows(), dataPath, distDir, express, fs, http, OVERLAY_SIZE (+9 more)

### Community 15 - "Dev Dependencies"
Cohesion: 0.11
Nodes (18): devDependencies, concurrently, cross-env, electron, electron-builder, eslint, @eslint/js, eslint-plugin-react-hooks (+10 more)

### Community 16 - "Live Timing Scraper"
Cohesion: 0.18
Nodes (13): findBrowserExecutable(), findChromiumIn(), fs, getBrowserInfo(), initBrowser(), path, puppeteer, rmNotLive (+5 more)

### Community 17 - "npm Scripts"
Cohesion: 0.13
Nodes (15): scripts, build, dev, dist, dist:portable, electron:dev, football:build, football:dev (+7 more)

### Community 18 - "Race Server & Tunnel"
Cohesion: 0.16
Nodes (14): applyOverlaySize(), checkUrlAlive(), createPublicTunnel(), createWindows(), getLocalIP(), getOverlaySize(), getStewardUrl(), getVotingUrl() (+6 more)

### Community 19 - "Race Cloud Sync & Penalties"
Cohesion: 0.19
Nodes (14): broadcast(), calculateLiveChampionship(), clearPenaltyTimer(), connectToCloud(), getNetworkConfig(), hidePenaltyAlert(), parseLapTimeToSeconds(), pushDriversToCloud() (+6 more)

### Community 20 - "Launcher Login & Modules UI"
Cohesion: 0.27
Nodes (8): icon(), PATHS, getLoginHtml(), { icon }, createLoginWindow(), createModulesWindow(), getModulesHtml(), { icon, PATHS }

### Community 21 - "Launcher API Client"
Cohesion: 0.27
Nodes (6): downloadPackage(), fetchLatest(), fs, readError(), { SERVER_URL }, SERVER_URL

### Community 22 - "Penalty & Voting Web Pages"
Cohesion: 0.33
Nodes (6): getPenaltyHtml(), { icon }, getVotingHtml(), { icon }, icon(), PATHS

### Community 23 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, adm-zip, express, puppeteer, socket.io, socket.io-client, untun, xlsx

### Community 24 - "Vite Icon Sprite"
Cohesion: 0.25
Nodes (8): icons.svg (Social/Link Icon Sprite Sheet), bluesky-icon (Bluesky butterfly logo), discord-icon (Discord logo), documentation-icon (document with code brackets, purple stroke), github-icon (GitHub Octocat logo), social-icon (person with star, purple stroke), SVG <symbol> sprite pattern, x-icon (X / Twitter logo)

### Community 25 - "Football Logo Asset"
Cohesion: 0.50
Nodes (4): Overlay Racing Logo (football/assets/logo.png), OR Monogram with Checkered Speed Lines, Overlay Racing Brand, Timing Tower Overlay Mockup

### Community 27 - "Launcher Logo Asset"
Cohesion: 0.50
Nodes (4): Overlay Racing Logo, OR Monogram (white O, red R, checkered speed lines), Tagline: Software para graficas de automovilismo, Timing Tower Mockup (POS, Best Lap, Gap, Sectors S1-S3)

### Community 28 - "Race Logo Asset"
Cohesion: 0.50
Nodes (5): Black/White/Red Brand Palette, Overlay Racing Logo, OR Monogram (checkered speed mark), Tagline: Software para graficas de automovilismo, Timing Tower / Leaderboard Mockup (POS, Best Lap, Gap, Sectors S1-S3)

## Knowledge Gaps
- **259 isolated node(s):** `{ app, BrowserWindow, ipcMain, dialog }`, `fs`, `path`, `http`, `{ Server }` (+254 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 287 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Race Overlay Graphics` to `Football Graphics & Windows`, `Race App Shell & i18n`, `Race Layout Editor & Fonts`, `Football Fonts & Logo Cover`, `Football Layout Editing`, `Root Package & Lint`?**
  _High betweenness centrality (0.476) - this node is a cross-community bridge._
- **What connects `{ app, BrowserWindow, ipcMain, dialog }`, `fs`, `path` to the rest of the system?**
  _259 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Football Graphics & Windows` be split into smaller, more focused modules?**
  _Cohesion score 0.050243719535058115 - nodes in this community are weakly interconnected._
- **Why does `electron` connect `Launcher Main & Logging` to `Launcher Module Manager`, `Root Package & Lint`, `Race Electron Main Process`, `Football Electron Main`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Should `Race Overlay Graphics` be split into smaller, more focused modules?**
  _Cohesion score 0.10989010989010989 - nodes in this community are weakly interconnected._
- **Why does `socket.io-client` connect `Race Overlay Graphics` to `Football Graphics & Windows`, `Root Package & Lint`, `Race Electron Main Process`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Should `Race App Shell & i18n` be split into smaller, more focused modules?**
  _Cohesion score 0.07163461538461538 - nodes in this community are weakly interconnected._