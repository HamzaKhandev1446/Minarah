# OpenFreeMap maps

Status: implemented; verification in progress. Authorized September 16, 2026.

Initial viewport covers a maximum 0.8 km radius (approximately 1.6 km across), centred on the Parsa Citi pilot area before location consent, on the visitor after consent, or the first search result. Nearby live discovery also uses a maximum 0.8 km server radius. Selection/refresh preserves manual zoom. Blank initial geography does not assert the visitor's location.

The September 16 layout refinement uses a spherical-geodesic 800 metre boundary, visibly outlined and labelled, with no fit padding. Rectangular screens necessarily show extra geography along their longer dimension. The map takes 58svh on mobile (minimum 400px); the compact location panel retains both consent actions. The home logo has explicit 205 by 80px sizing that overrides legacy mobile sizing. Manual zoom remains available.

Supersedes Google Maps. Public discovery and registration use MapLibre GL JS with OpenFreeMap's light Positron vector map. No map API key or billing account is used. Provider attribution remains visible. The public service is provided as-is, without a service guarantee.

Deep-green time pills, white unselected markers and a blue visitor location dot match Minarah. Registration uses a draggable pin. Marker buttons have accessible names and keyboard activation. Geography changes frame the map; selection and time updates preserve camera position. Provider places remain separate from published schedules. Search, favourites and schedule services are reused.

Map failure shows a retry and preserves text search/list selection. WebGL is required; registration retains manual coordinates. Google and Leaflet dependencies are removed. Place search continues using Photon; Google Maps directions remain external links.

Verify mobile/desktop vector loading, marker/card selection, camera stability, location permission/fallback, favourites persistence, registration selection and map failure handling. No live records or hosted deployment are changed.

Verification: ten mobile/desktop browser checks passed with actual OpenFreeMap tiles, registration pin selection and a deliberately failed tile endpoint. Mobile logo/map screenshot inspected. Production build and targeted lint passed before the radius adjustment; the radius helper and mosque import subsequently passed unit/database checks. The pilot now uses a maximum 0.8 km map and live nearby radius. The SQL test ran the two-location insert twice without duplicates or invented schedules. Live mosque insertion remains pending privileged access; schedule publication is prepared as ongoing until changed.
