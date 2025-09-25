# Birthplace WAR Atlas

A Vite + React + TypeScript single-page application for exploring Major League Baseball career WAR totals by place of birth. Load your own CSV exports or experiment with bundled samples to compare total WAR, WAR normalized by population, and birthplace hotbeds by decade.

## Getting started

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:5173` by default.

### Available scripts

- `npm run dev` – start the local development server.
- `npm run build` – type-check and build the production bundle.
- `npm run preview` – preview the production build locally.
- `npm run lint` – run ESLint with the included configuration.
- `npm run gh-pages` – build and publish the `dist/` bundle to the `gh-pages` branch (requires repo permissions and the `gh-pages` package).

## Data inputs

The app expects two CSV files that you can load via the **Data** panel:

- `players.csv` – must include `player_id`, `full_name`, `birth_year`, `birth_state`, and `war_career` columns. State values can be two-letter abbreviations or full names.
- `state_pop.csv` – must include `state`, `year`, and `population` columns. The app resolves state names/abbreviations to FIPS codes and uses the population that is closest to the active filter’s year range midpoint.

Sample datasets live under [`public/sample-data/`](public/sample-data/):

- [`players_sample.csv`](public/sample-data/players_sample.csv) – 16 well-known players spanning multiple decades and states.
- [`state_pop_sample.csv`](public/sample-data/state_pop_sample.csv) – decade-level U.S. Census counts for the states represented in the sample player file.

Uploaded CSV text is persisted in `localStorage` so you can refresh the page without reloading files. Use the **Reset** button in the Data panel to clear cached data.

## Visualization modes

1. **Total WAR by State** – Choropleth of aggregate career WAR totals by birthplace.
2. **WAR per 1M Residents** – Normalizes WAR with the nearest population data point to surface high-output states relative to size.
3. **WAR by Birth Decade** – Filters the map to a specific birth decade (select via the slider) to highlight how hotspots evolved over time.

Each view provides interactive tooltips, a pinned state detail panel with paginated player lists, and adjustable filters for birth-year range, minimum WAR, and a placeholder league selector for future expansion.

## Deploying to GitHub Pages

1. Ensure the `gh-pages` branch exists (or let the script create it).
2. Run `npm run gh-pages` to build and publish the current commit to GitHub Pages.
3. Configure the repository’s GitHub Pages settings to serve from the `gh-pages` branch.

The Vite config sets `base: './'` so the build is compatible with GitHub Pages without additional configuration.
