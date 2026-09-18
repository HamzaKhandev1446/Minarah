# Saved addresses

The location dialog includes an Add a new location search section immediately above its map. Explicit area/address searches reuse the Photon service; selecting a result centres the pin and opens the name-only save flow without modifying an existing saved record. Users can refine the pin before saving. Loading, empty and failure messages leave manual map selection available; provider sharing is disclosed. Saving still requires explicit submission and uses device-local storage.

The saved-place card matching the active location has a deep-green border and light green background. Its selection button exposes aria-pressed; editing a map point alone does not change the active selection.

Status: implemented; targeted verification completed.

Validation: five saved-address/radius unit tests, targeted lint and the production build passed. All six mobile/desktop browser checks passed (34.3 seconds, runner exit 0), covering GPS and map-point saving, name-only input, persistence, exact nearby coordinates, removal, Escape dismissal, logo size and map/panel proportions. Browser checks stub map tiles and discovery responses and do not establish live provider availability.

The revised location selector opens from the location label; no saved-place form appears in the main page. Users can select a point on the map or explicitly request GPS. Saving asks only for a name (for example Home or Work), with coordinates taken from the selected point. Address, category and coordinate inputs are removed. Using a location without saving is also supported. A native modal supplies focus containment, a close action and Escape dismissal.

Places persist in versioned device-local storage independently of mosque favourites. The existing schema remains readable for older saved places; new records retain empty legacy address and `other` category fields internally. A matching name replaces the existing location while retaining its ID; at most 20 records are accepted. Storage failures remain visible. Removing a place deletes it locally. Selecting a place performs the existing nearby query and centres the map without a GPS prompt. Selecting a place sends its coordinates to Minarah's lookup and the map provider; no account or server-side saved-address table is introduced.

September 18 refinement: saved places appear as white themed cards with a pin, name and location type. Separate labelled edit and delete icon buttons sit on the right. Editing preloads the name and coordinate, lets the visitor move the map pin, and updates the same stable record. Duplicate names are rejected instead of silently overwriting another saved place.

Acceptance: the main screen contains no saved-place inputs; saving requires only a name; GPS and map selection both produce the correct nearby request; places survive reload and can be selected or removed; cancellation preserves stored places. Browser tests use stubbed map styles and directory responses, so passing these checks does not establish live mosque availability.

The two Parsa Citi mosques are not automatically favourited for every visitor. A September 16 live read confirmed both requested slugs are absent from Supabase. Operator SQL is prepared but not executed. Successful insertion must precede selecting their actual IDs as favourites; user-device localStorage cannot be assumed modified by developer browser tests.

Home-screen entry restores a saved Home (legacy home kind or name Home), otherwise the session location, and refreshes discovery. Already-granted GPS permission permits a fresh position lookup without prompting. Browser back-forward cache restoration repeats this selection. Unavailable permission leaves the explicit location/manual actions usable.
