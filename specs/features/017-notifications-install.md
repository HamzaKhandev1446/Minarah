# Installation and configurable notifications

User request: a tightly cropped 50 x 50 text-free logo, installation into the device app list, and configurable Jamaat and publication alerts.

Implemented locally: home-screen settings expose the existing PWA installation flow; permission is requested only by Enable notifications. Device-local switches independently control reminders and publication alerts for live favourites. Reminder lead time is 5, 10 or 15 minutes. Only published live schedules generate alerts; the initial publication snapshot establishes a baseline. Notification clicks open a same-origin mosque page. Denial/storage failure remains visible. The UI explicitly labels current delivery as requiring the app to remain open. No new main navigation tab.

Not complete: reliable background delivery requires push subscriptions, server-side preference storage, VAPID configuration and a scheduled sender. None is provisioned yet. Do not represent browser polling as background push. The existing HTTPS deployment is https://minarah-seven.vercel.app (HTTP 200 checked September 17). Current changes have not been deployed there. Real-device installation and notification permission/delivery are unverified.

Verification: production build/TypeScript passed. Notification preferences defaults and invalid storage are unit tested. Launcher installation remains user-controlled through browser UI.
