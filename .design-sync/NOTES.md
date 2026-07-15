# design-sync notes — logbook

- 2026-07-15: First sync. Repo is a vanilla single-page app (index.html, app.js, styles.css) — no components, no dist, no Storybook. User opted for styles/tokens-only sync into project "Logbook" (e14c00a0-0796-4cc5-a6d6-c2b84b14e80c).
- Design language: "Golden Era Logbook" — vintage bodybuilding editorial. Tokens in `:root` of styles.css. Fonts via Google Fonts: Alegreya Sans (400/500/700/800), Roboto Slab (500/700), Playpen Sans (400/600 — handwritten "pen" notes).
- Off-script layout: no `_ds_bundle.js`, no `_ds_sync.json` anchor (honest omission — next sync re-verifies everything).
- Fonts downloaded as woff2 into ds-bundle/fonts with local @font-face, imported from styles.css.
