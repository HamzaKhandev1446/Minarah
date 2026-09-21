# Stylesheet ownership

`app/globals.css` and `app/public-mobile.css` are ordered import entry points. Preserve import order: later rules intentionally override earlier shared and legacy styles. The September 19 split copied contiguous rule blocks without changing declarations.

- `boards-and-shared.css`: mosque board, shared layouts, inputs and responsive base rules.
- `foundation.css`: theme, shared shell and initial registration styles.
- `legacy-discovery.css`: previous map-led views still used by supporting screens.
- `registration.css`: focused registration journey and responsive overrides.
- `public-experience.css`: Nearby/Favourites, saved-location cards, prayer grid and map status.
- `public-menu.css`: header, drawer, installation and notification preferences.
- `saved-place-search.css`: search input and result list in the location dialog.
- `schedule-editor.css`: administrative publication review.

Prefer editing the owning file. Do not merge duplicate selectors or reorder media queries without mobile/desktop screenshot comparison. External font and MapLibre imports retain their existing positions in the application layout.
