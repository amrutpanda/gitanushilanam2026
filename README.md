# Gitanushilanam 2026 — V4

Static GitHub Pages-ready website. Open `index.html` directly or upload the folder to GitHub Pages.

## V4 design changes

- Restored the exact Learn Gita Live Gita logo asset used in the old Gitanushilanam header:
  `https://manideepdonkena.github.io/gitanushilanam_html/assets/gitanushilanam_assets/img/lglglogo.png`
- Hero gallery now uses imagery from the references supplied for the project and the previous Gitanushilanam site, rather than unrelated museum artwork.
- The Facebook post cannot be embedded reliably without Facebook access, and the Amazon product page does not expose a stable direct image URL through the current fetch environment. Those pages remain references, but the live slideshow uses the retrievable supplied sources.
- Competition cards now use the original previous-site assets: `bg.png`, `Artboard_4_resize.png`, and `Rahasyam.png`.
- Team and participant opinions no longer use continuous CSS rotation. They advance using discrete JavaScript `setTimeout` transitions.
- Team autoplay: ~4.3 seconds per frame. Participant opinion autoplay: ~7.6 seconds per frame.
- Moving the pointer anywhere inside the Team or Participant Opinions section cancels the next timeout; moving out resumes it.
- Background has been redesigned as a continuous light-to-dark gradient from warm ivory to lavender, blue, indigo and midnight.

## 2026 content note

The public Gitanushilanam website currently exposes the 2025 competition schedule. To avoid publishing unverified 2026 dates, this version keeps 2026 schedule fields as “To be announced.” Replace them as soon as official dates and registration links are released.

## Files

- `index.html` — page structure/content
- `styles.css` — V4 visual system and responsive design
- `script.js` — timed sliders, pointer pause, dialogs and navigation
