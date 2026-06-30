# Country Badge Generator

A fully static GitHub Pages app for creating square SVG country badges. Search a country, select it from the combobox, compare three deterministic flag-inspired background colors, and download the selected 1024 x 1024 SVG.

## Features

- Browser-side country search by English name, ISO alpha-2 code, and alternate spellings from the country data source
- Accessible combobox with pointer and keyboard navigation
- Exactly three deterministic color options for each country
- Click-to-preview palette options
- Manual SVG download using the `BR.svg` filename format
- Copy the current SVG to the clipboard when the browser allows it
- Self-contained exported SVG with embedded flag artwork
- Compact responsive interface for desktop and mobile
- Static HTML, CSS, and native ES modules

## Deterministic Palette

The same country always produces the same three colors in the same order.

1. The selected flag SVG is fetched in the browser.
2. The flag is rasterized into a small offscreen canvas.
3. Visible pixels are sampled and quantized.
4. Low-value near-white, near-black, and tiny detail colors are down-ranked.
5. Distinct chromatic source colors are selected.
6. Source hues are adjusted in OKLCH for controlled lightness and chroma.
7. Candidate backgrounds are scored for contrast, perceptual distance, and palette separation.

No randomness, date, time, locale, user state, backend, or secrets affect the palette.

## Data Sources

- Country data: [`world-countries` 5.1.0 via jsDelivr](https://cdn.jsdelivr.net/npm/world-countries@5.1.0/dist/countries.json)
- Country data license: [ODbL](https://cdn.jsdelivr.net/npm/world-countries@5.1.0/LICENSE)
- Flag SVGs: [FlagCDN](https://flagcdn.com/)

Both remote sources are requested directly from the browser, require no API key, and return CORS-compatible responses. The app does not keep a full country list or flag set in the repository.

## Local Development

Install development-only test dependencies:

```bash
npm install
```

Serve the app over HTTP:

```bash
npm start
```

Open:

```text
http://localhost:8080
```

Do not test the app from `file://`; native ES modules and browser security behavior differ from the deployed site.

## Tests

```bash
npm run test:unit
npm run test:browser
npm test
```

Browser tests serve the repository from a parent directory and load:

```text
http://127.0.0.1:4173/country-badge-generator/
```

That mirrors the GitHub Pages repository subpath.

## GitHub Pages Deployment

The project is designed for GitHub Pages at:

```text
https://martonpaulo.github.io/country-badge-generator/
```

Deployment requirements:

- Serve files directly from the repository root.
- Keep `.nojekyll` in place.
- Keep all local asset and module paths relative, such as `./js/app.js`.
- Do not add server functions, backend routes, environment variables, API keys, secrets, SSR, or routing rewrites.

## Repository Structure

```text
.
|-- assets/
|   `-- favicon.svg
|-- css/
|   `-- styles.css
|-- js/
|   |-- app.js
|   |-- countries.js
|   |-- country-service.js
|   |-- flag-service.js
|   |-- palette.js
|   `-- svg.js
|-- tests/
|   |-- browser/
|   `-- unit/
|-- .nojekyll
|-- index.html
|-- package.json
`-- playwright.config.js
```

## Error Behavior

- If country data cannot load, the combobox stays disabled and the page shows an explicit error.
- If a query has no results, the dropdown shows a no-results state.
- Free text is never treated as a valid country.
- If a flag cannot load, is blocked by CORS, or returns malformed SVG, generation fails with an explicit status message.
- If canvas is unavailable, palette generation fails with an explicit status message.
- If clipboard write is unavailable or blocked, the app reports the copy failure without affecting manual download.
