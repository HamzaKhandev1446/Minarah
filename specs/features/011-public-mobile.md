# Nearby and Favourites mobile experience

The shared footer is a compact centered minaret and tagline, without development-phase labels or installation controls. Installation remains in the public drawer. Nearby/Favourites retain their existing footer-free layout.

September 18 drawer refinement: full-width menu uses a minaret header, circular close control, grouped icon-led account/location rows, and matching expandable installation/notification rows. Descriptions, touch targets, focus indicators and reduced-motion support are retained. Notification settings remain mounted when the drawer closes. Expanded settings use the same green/cream palette rather than nested generic disclosure boxes. Browser visual verification remains pending.

Friday presentation: always show six entries, with Jumuah last. Retain the Dhuhr label on Friday, add a highlighted “Jummah” badge directly beneath it, and display the published Jumuah time in place of Dhuhr's usual time. Keep the separate final Jumuah entry on Friday too. On other days show ordinary Dhuhr and the published Jumuah reference time; only Friday sessions participate in live statuses/countdowns. The shared next-Jamaat resolver excludes ordinary Dhuhr events on these Fridays. The live prayer label reads “قَدْ قَامَتِ الصَّلَاةُ” in Arabic above its time, never question-mark placeholders.

Mosque header: omit city/country, retain available distance below the name. A small location-pin link immediately before the mosque name opens directions to its coordinates; it has an accessible label and a 44px touch target without a visible button background. Gregorian and Arabic Hijri dates use equal-sized text on a single row; Hijri remains labelled estimated.

Status: implemented; core interactions verified locally. Authorized September 15, 2026.

The supplied three references supersede the prior public discovery layout. The home has exactly two tabs: Nearby and Favourites. The registration drawer is a separate future task; existing protected workflows are preserved.

- Nearby uses existing directory queries, MapLibre tiles and the shared mosque-timezone Jamaat resolver. Markers show the next published time or explicitly no time. When results are available, the bottom sheet keeps “Use my location” available and lists every mosque with its name, verification/distance, Arabic prayer labels (فجر، ظهر، عصر، مغرب، عشاء، جمعة), local Jamaat times and a full schedule link.
- Each timetable highlights the nearest upcoming Jamaat. The visual timing windows are green from ten minutes before through the start boundary, red for the first five minutes after the published start, and green again from five through seven minutes after start. The Arabic Qad Qamatis-Salah label appears above each mosque timetable.
- Permission is requested only after Use my location. The explanation, denied/unavailable states and manual search remain usable. Coordinates stay in memory.
- Favourites reuse existing versioned demo/live local storage, require no account, permit removal and link back to Nearby when empty. Only mosque IDs are persisted.
- Demo data remains behind the existing explicit demo service. No sample times are live or verified. No provider places are presented as published mosques.
- DM Sans, deep green and warm backgrounds follow the reference; headings use readable contrast. Keyboard-accessible mosque selection remains available when map tiles fail.

## Next data task

Await the user's two Google Maps URLs before adding real mosque locations. Mosque-published schedules and verification evidence must be supplied separately; location links alone cannot establish times. Preserve mosque-specific schedules and Friday sessions. Do not infer prayer times or congregation counts from sect/sub-sect. Extending the five daily prayer model to additional daily congregations requires its own domain/database scope.

## Verification

Target mobile and desktop: consent timing, denied manual fallback, marker/card selection, next time, favourite persistence/removal, full schedule navigation, empty state and no horizontal overflow. Existing legacy discovery tests describe the superseded layout and require migration before broad suite acceptance.

September 15 evidence: all 73 unit/database tests passed; production build, strict TypeScript and targeted zero-warning lint passed. All six new Chromium browser checks passed across mobile and desktop, covering consent timing, denial/manual search, granted location marker, no persisted coordinates, map selection, favourites reload/removal, full schedule navigation and overflow. Mobile screenshots inspected. The final CSS-only map-margin correction followed this run. In-app browser connection failed with a transport error; standalone Playwright supplied browser evidence. No production deployment was performed.

September 17 refinement: Jumuah timing states are active only on Friday in the mosque timezone. Publication freshness shows Last updated with ordinal day, abbreviated month and local clock time. The Arabic live label appears immediately above an in-progress prayer time, in red with a gentle pulse and reduced-motion support; no permanent heading label. Exact start through five minutes is live.

Map markers share the Jamaat timing windows and Friday-only sessions. They retain the active prayer time through its status window, show green starting/recent labels, and pulse the red Arabic live label for the first five minutes. Reduced motion disables the pulse.

Map markers display the prayer name above its time. Active status uses the active prayer name; otherwise the next published prayer supplies both name and time.

September 17 drawer: public header contains a proportionate minaret, centered location selector and right menu control. Native modal dialog opens from the right at full viewport width with Login/Register, mosque registration, Saved locations, installation and Notifications. Escape and native modal focus containment remain available. Notification settings stay mounted while the drawer is closed.

September 18 location control: the centered header button shows a location-pin icon, the selected place name without a redundant “Near” prefix, and a proper down-chevron icon. It remains a button because it opens the saved-location dialog rather than a native select list.
