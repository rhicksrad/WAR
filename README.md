# WAR

A GitHub Pages site for exploring baseball Wins Above Replacement (WAR) production by
place of birth. The current iteration establishes the interactive mapping shell that
will power future statistics visualizations.

## Local development

Open `public/index.html` in a modern browser to explore the map. The page pulls
TopJSON geometry for global borders and U.S. states directly from the jsDelivr CDN and
renders them with D3.js.

## Deployment

A GitHub Actions workflow (`.github/workflows/deploy.yml`) uploads the `public/`
directory as a Pages artifact and publishes it to the `github-pages` environment on
pushes to `main`. Enable GitHub Pages in the repository settings and select "GitHub
Actions" as the source to complete the setup.
