# Golden Era Logbook — build conventions

Vintage bodybuilding-editorial system. Plain CSS + semantic classes — **no framework, no utility classes, no components to import**. Style with the classes and tokens below; do not invent Tailwind-style utilities.

## Setup

No provider/wrapper needed. Put on `body` (or your root div): `background:var(--paper); color:var(--ink); font-family:"Alegreya Sans",sans-serif;`. Optionally add `<div class="grain"></div>` as first child for the paper-grain overlay. All styling comes from `styles.css` (imports `tokens/tokens.css`, `fonts/fonts.css`, `_ds_bundle.css`).

## Tokens (`tokens/tokens.css`)

`--ink` #15130d (near-black text/surfaces) · `--paper` #efe8d8 (page bg) · `--paper-dark` #e0d7c2 (inset bg) · `--gold` #c9a227 · `--orange` #8a6a1c (primary accent) · `--oxblood` #8a6a1c · `--muted` #7c745f (secondary text) · `--line` #b6ad97 (hairline borders) · `--pen` #4d3f24 (handwritten notes) · `--recovery` #64705a · `--steel` #676a63.

**Color rule: `--orange` is the accent on paper backgrounds; `--gold` is the accent only on ink (dark) backgrounds.**

## Type

- Headings/display/numbers: `"Roboto Slab"` 700, uppercase, tight letter-spacing (see `h1`, `h2`, `.set-number`).
- UI/body/labels: `"Alegreya Sans"`; labels are 800 weight, uppercase, letter-spaced (`.eyebrow`, `label`).
- Handwritten annotations: `"Playpen Sans"`, color `var(--pen)` (see `.page-session-note`).
- Kicker label above headings: `<p class="eyebrow">…</p>`.

## Visual idiom

Square corners everywhere (no border-radius). Hard offset shadows, not blurs: `box-shadow:3px 3px 0 rgba(21,19,13,.07)`. Hairline `1px solid var(--line)` borders. Panels: `background:rgba(255,255,255,.25)` over paper. Hover = translate up 2–4px + stronger offset shadow. Rotated "stamp" badges: 2px border, uppercase, `transform:rotate(-2deg)` (`.motto-stamp`).

## Core classes (all in `_ds_bundle.css`)

- Buttons: `.primary-button` (ink block, gold underline inset), `.secondary-button` / `.mini-button` (outlined), `.mode-toggle` + `.mode-button` (+`.active`) segmented toggle.
- Forms: `label` wraps its input; `input`,`textarea`,`select` are borderless with bottom `1px` ink rule; `.field-grid` / `.field-grid.two` layout grids.
- Layout/chrome: `.topbar`, `.brand`+`.brand-mark`, `.side-menu` (ink drawer), `.hero`, `.workspace`, `.sheet`, `.history-panel`, `.section-heading`.
- Data display: `.metrics` (stat tiles), `.entry` + `.set-summary` (history rows), `.session-card`+`.card-date`+`.card-body`, `.personal-bests`, `.week-strip`+`.day-tile` (+`.done`), `.empty` (dashed empty state), `.daily-quote`, `.toast` (+`.show`), `.confirm-dialog`.

## Where the truth lives

Read before styling: `styles.css` → `tokens/tokens.css`, `fonts/fonts.css`, `_ds_bundle.css` (the complete app stylesheet — class definitions, hover states, responsive breakpoints at 850px/600px, reduced-motion rules).

## Idiomatic snippet

```html
<section class="sheet">
  <div class="sheet-heading"><span>01 /</span><h2>Log a set</h2></div>
  <div class="field-grid two">
    <label>Exercise<input type="text" placeholder="Incline press"></label>
    <label>Weight<input type="number" placeholder="80"></label>
  </div>
  <button class="primary-button"><span>Save entry</span><span>→</span></button>
</section>
```
