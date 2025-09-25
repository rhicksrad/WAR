# Agent Guidelines

- Keep the bundle deployable via GitHub Pages. Production assets must live under `dist/` after `npm run build`.
- When touching data ingestion logic, prefer using `import.meta.env.BASE_URL` helpers so paths work from any GitHub Pages base.
- Run `npm run build` before finalizing changes to verify the static bundle still compiles.
- The aggregated datasets in `public/data/` are generated with `node scripts/build-datasets.mjs`. Update both JSON files together if
  you regenerate them.
