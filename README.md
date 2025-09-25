# Birthplace WAR Atlas

An entirely static React + TypeScript experience for exploring where Major League Baseball talent comes from. The bundled build
combines Baseball Reference WAR archives with historical state population estimates so the map, ranking tables, and decade slider
render instantly on GitHub Pages without any server-side preprocessing.

## Live data baked into the bundle

The `public/data/` directory ships with two JSON payloads that load automatically when the app boots:

- **`players.json`** – 15,890 career WAR records aggregated from the Baseball Reference batting and pitching WAR archives
  contained in this repository (`public/war_archive-2025-09-24.zip`). Birthplaces come from the Lahman `Master.csv` file.
- **`state-populations.json`** – Annual population totals derived from the Washington Post/Jake VanderPlas state population time
  series (`data/state-population.csv`). The app uses the population closest to the active filter range midpoint or the center of a
  selected decade when computing WAR per million residents.

The raw sources never leave the browser. If you would like to regenerate the JSON artifacts after updating the inputs, run:

```bash
npm install
node scripts/build-datasets.mjs
```

The script expects `unzip` to be available (standard on GitHub Actions runners) and rewrites the JSON files in `public/data/`.

## Visualization modes

1. **Total WAR by State** – Choropleth shading by cumulative career WAR totals.
2. **WAR per 1M Residents** – Normalizes WAR using the closest population snapshot to surface high-output states relative to size.
3. **WAR by Birth Decade** – Restricts the map and player lists to a specific decade to show how regional hotspots evolve.

The left-hand rail includes data provenance summaries, filters for WAR and birth year windows, and quick paging through the top
players from the state currently highlighted on the map.

## Developing locally

The production bundle is 100% static; on GitHub Pages you do not need a dev server or any additional build steps. For local
iteration you can still use the familiar Vite workflow:

```bash
npm install
npm run dev
```

Alternatively, generate the production bundle and open `dist/index.html` in your browser:

```bash
npm run build
```

## GitHub Pages deployment

The [`deploy.yml`](.github/workflows/deploy.yml) workflow runs on every push to `main` and handles the full GitHub Pages pipeline:

1. Check out the repository.
2. Install dependencies with `npm ci`.
3. Build the static bundle via `npm run build` (which includes the bundled datasets).
4. Upload the resulting `dist/` directory as a GitHub Pages artifact and publish it with `actions/deploy-pages`.

Ensure the repository’s Pages settings target the `github-pages` environment so the workflow can push updates automatically.

## Custom datasets

Use the **Data** panel to upload replacement CSV files at any time. Provide:

- `players.csv` with `player_id`, `full_name`, `birth_year`, `birth_state`, and `war_career` columns.
- `state_pop.csv` with `state`, `year`, and `population` columns.

The app stores uploaded CSV text in `localStorage` so you can refresh without reloading files. Press **Reset** in the Data panel to
return to the bundled datasets.
