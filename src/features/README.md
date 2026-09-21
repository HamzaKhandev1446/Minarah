# Feature ownership

Routes in `src/app` compose these features. Direct file imports keep client/server boundaries visible; avoid broad barrel exports that combine server code with client components.

| Folder         | Responsibility                                                       |
| -------------- | -------------------------------------------------------------------- |
| discovery      | Nearby, favourites, mosque boards, detail and legacy discovery views |
| locations      | Device-local saved places, search and coordinate selection           |
| maps           | MapLibre rendering, pins and map interaction                         |
| navigation     | Public header, drawer and account navigation                         |
| installation   | PWA installation and foreground notification controls                |
| onboarding     | Mosque registration, public submissions and claims                   |
| administration | Timetable editor, nominations, reviews and QR printing               |
| account        | Authentication form                                                  |

Shared visual primitives, transient location/favourite context and the clock hook remain in `src/components`. Pure mosque-timezone rules and the six-column display model live in `src/domain`; network/storage adapters live in `src/lib`; database repositories live in `src/server` and retain `server-only` protection.

Feature UI may call explicitly marked server actions in `app` as the existing mutation boundary. It must not import a page, route handler or database repository. Domain code cannot depend on UI or adapters; lint enforces these directions. New server actions should be designed alongside their authorization and database transaction tests before moving any mutation boundary.

Public CSS remains in its existing ordered stylesheets during this behavior-preserving refactor. Do not reorder cascade layers or rename classes while relocating components. A later visual-verified CSS migration can colocate styles independently.

Keep the current six-column timetable contract in `domain/timetable.ts`. The shared calendar resolver owns Friday eligibility, not the component. Always distinguish a visible Jumuah reference time from an eligible live event.
