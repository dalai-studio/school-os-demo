# School OS — demo prototype (static site)

Plain HTML, CSS and JavaScript. No build step, no backend.

## Deploy on Render
1. Push this folder to a GitHub/GitLab repo (files at the repo root).
2. Render dashboard → New → **Static Site** → pick the repo.
3. Build command: leave empty. Publish directory: `.`
4. Deploy. Open the site URL; `index.html` lists all 20 screens.

## Run locally
`python3 -m http.server 8080` in this folder, then open http://localhost:8080

## Notes
- Fonts load from Google Fonts (needs internet). Everything else is in this folder.
- All data is fictional sample data held in each page; refreshing a page resets it.
- `dc-runtime.js` is a small renderer for these screens; `morphdom.min.js` is the MIT-licensed morphdom library.
