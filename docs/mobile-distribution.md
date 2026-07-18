# Mobile distribution decision

Status: accepted for version 0.4.0.

## Decision

Continue with the installable PWA as the canonical mobile client. Do not add a native wrapper or a separate mobile codebase yet.

The current product is a local-first training log whose core requirements—installation, standalone launch, offline assets and local data—fit the PWA model directly. A single deployed client also keeps the existing Supabase sync model and GitHub Pages release path simple. Home Screen web apps on current iOS support standalone presentation and web push/badging, while Android browsers provide broad PWA installation support.

## Revisit triggers

Re-evaluate a Capacitor wrapper when at least one of these becomes a committed product requirement:

- App Store or Play Store discovery is a measured acquisition need.
- Background work must continue beyond the browser/service-worker lifecycle.
- The roadmap needs HealthKit, Health Connect, Bluetooth devices, native widgets or other native SDKs.
- Push, deep links or authentication need native behavior that cannot meet reliability targets as a PWA.
- Real-device telemetry shows a platform-specific PWA defect that cannot be fixed within the web client.

If a wrapper becomes necessary, prefer Capacitor around the existing web client before funding a separate Swift/Kotlin/Flutter implementation. Capacitor is explicitly designed to add native SDK access to an existing web-first application.

## Evidence and review date

- [web.dev PWA guidance](https://web.dev/learn/pwa/welcome/) documents installability, offline caching and service-worker delivery.
- [Apple’s web app guidance](https://developer.apple.com/videos/play/wwdc2023/10120/) documents standalone Home Screen web apps, separate storage, push and badging on iOS/iPadOS.
- [Capacitor documentation](https://capacitorjs.com/docs) describes its native container and plugin access for existing web apps.

Review this decision after physical-device QA for version 0.4.0 or when one of the triggers above enters the committed roadmap.
