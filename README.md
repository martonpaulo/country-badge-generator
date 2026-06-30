# Country Badge Generator

A dependency-free static web app that generates three deterministic, flag-inspired background options for every country badge.

## Features

- Searchable country combobox with keyboard navigation
- Selection required before generation
- Exactly three deterministic color options per country
- Click-to-preview palette options
- Manual SVG download
- Copy SVG to clipboard
- Self-contained exported SVG
- Responsive and accessible UI
- No framework, bundler, or build step

## Deterministic palette logic

The same country always produces the same three colors in the same order.

1. The flag is rasterized locally in the browser.
2. Recognizable chromatic colors are extracted and ranked.
3. Near-duplicate colors are merged.
4. Three visually distinct source hues are selected.
5. Each hue is transformed in OKLCH into a polished background.
6. Contrast, perceptual distance, and preferred lightness are evaluated.
7. No randomness, time, or user-specific state is used.

## Run locally

Because the project uses ES modules, serve the folder instead of opening `index.html` directly:

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

## Deploy with GitHub Pages

1. Push the project files to a GitHub repository.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Choose `main` and `/ (root)`.
5. Save.

## Structure

```text
.
├── assets/
│   └── favicon.svg
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── countries.js
│   ├── flag-service.js
│   ├── palette.js
│   └── svg.js
├── .nojekyll
├── index.html
└── README.md
```

Flag artwork is loaded from [FlagCDN](https://flagcdn.com/).
