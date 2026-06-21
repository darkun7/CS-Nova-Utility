# CS:Nova Utility

A static, client-side companion app for **Crystal Saga: Nova**. Runs entirely in
your browser — no backend, no telemetry. All data is bundled into a single HTML
file at build time, so the production build can be opened directly via
`file://` (just double-click `dist/index.html`) or hosted on any static host.

## Features

- **Synthesis** — combined calculator for gem fusion (Ruby T1 -> Divine Ruby etc.)
  and Soul Crystal crafting (Tier I-VI), with two tabs in one page. Includes
  recursive material breakdown, per-tier alternative quantities, stack-size
  awareness, and a collapsible synthesis tree.
- **Materials Plan** — multi-target grind list combining gems and soul crystals;
  aggregate breakdown of base materials, resources, coins.
- **Fragneron Planner** — best Lv5 / Lv7 / Lv10 method recommendations, split
  into Bound (default) and Normal exchange tabs.
- **Inventory** — track gem counts (T1 .. Divine), soul crystal counts (VI .. I),
  purified crystals, brilliance shards, and coins.
- **Equipment Builder** — assign gems to weapon/helm/armor/etc. sockets, see
  live stat totals.
- **Settings** — import/export JSON state, theme switcher, compact mode, reset.

All state is persisted in `localStorage` under the key `cs_planner_state_v1`.

## Tech stack

- [Svelte 4](https://svelte.dev) + [Vite 5](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com) (via PostCSS — no CDN)
- [`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile)
  — inlines all JS, CSS, fonts and assets into one HTML file

## Project layout

```
cs-planner/
|-- index.html                  # Vite entry
|-- vite.config.js              # singlefile build, base="./"
|-- tailwind.config.js
|-- postcss.config.js
|-- jsconfig.json
|-- package.json
|-- package-lock.json
|-- .gitignore
|-- README.md                   # this file
|-- src/
|   |-- main.js                 # bootstraps Svelte + injects favicon
|   |-- App.svelte              # layout, sidebar, hash router (sub-routes for tabs)
|   |-- assets/                 # favicon (.ico is inlined as data: URL)
|   |-- components/             # Card, Sidebar, Toaster, FusionTreeNode,
|   |                           # TierBreakdown, GemSelect, TierSelect, ...
|   |-- data/                   # game data (JSON, imported at build time)
|   |   |-- gems.json
|   |   |-- utility_gems.json
|   |   |-- fusion_cost.json
|   |   |-- special_recipes.json
|   |   |-- fragneron.json
|   |   |-- equipment_slots.json
|   |   `-- soul_crystals.json
|   |-- lib/                    # data.js, calc.js, soul.js, utils.js, stores.js
|   |-- styles/app.css          # Tailwind + theme tokens
|   `-- views/                  # Dashboard, Synthesis (wrapper),
|                               # GemSynthesis, SoulCrystals, MaterialsPlan,
|                               # Fragneron, Inventory, Equipment, Settings
`-- dist/                       # build output (one self-contained index.html)
```

## Prerequisites

- **Node.js >= 18** (developed against Node 22).
- **npm** (bundled with Node).
- A modern browser (Chrome / Edge / Firefox).

You do **not** need Python, Docker, or any other runtime. After building once
you don't even need a web server — the produced `dist/index.html` works from
`file://`.

## Install dependencies

```bash
npm install
```

This installs Svelte, Vite, Tailwind, and the singlefile plugin into
`node_modules/`.

## Develop (with hot reload)

```bash
npm run dev
```

Vite starts a dev server (default `http://localhost:5173`). Edits to `.svelte`,
`.js`, `.css` and `.json` files refresh the page instantly.

## Build (production)

```bash
npm run build
```

Output: a single self-contained file at `dist/index.html`
(~175 KB / ~52 KB gzipped). It bundles the JS, CSS, fonts URLs, favicon
(as a `data:` URL) and all game data.

To use the build, you can:

- **Just double-click `dist/index.html`** — opens in your default browser
  via `file://`. Works because `vite-plugin-singlefile` inlines everything,
  bypassing the `file://` CORS restriction on ES module loading.
- **Host it anywhere static** — drag onto Netlify, GitHub Pages, S3, an Nginx
  directory, etc. The `base: "./"` Vite setting means relative URLs work at any
  subpath.

## Preview the build locally

```bash
npm run preview
```

Serves `dist/` at `http://localhost:4173`.

## Editing game data

All game numbers live in `src/data/*.json`. They are imported at build time
(`src/lib/data.js`), so after editing run `npm run build` again. No code changes
needed for tweaks like changing fusion costs or adding new gems (as long as the
shape of the JSON stays the same).

## URL routes (deep-linking)

The app uses URL hashes for navigation:

- `#dashboard`, `#materials`, `#fragneron`, `#inventory`, `#equipment`, `#settings`
- `#synthesis` (Gem tab), `#synthesis/soul` (Soul Crystal tab)
- `#soul` is preserved as a redirect to `#synthesis/soul` for old bookmarks.

## Backups / data portability

In-app, go to **Settings -> Export JSON** to download your inventory, targets
and equipment loadout. **Import JSON** restores the same shape. Nothing leaves
your machine.

## License / credits

Fan-made companion tool for Crystal Saga: Nova. Not affiliated with the game
publishers. Game data values come from in-game observations.
