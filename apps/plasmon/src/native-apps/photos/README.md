# Photos

Photos is the native image viewer for browser-supported image resources.

`media.ts` classifies supported image MIME/extensions and manages object-URL
leases. The viewer navigates image siblings while skipping non-image entries.
`fullscreen.ts` treats browser fullscreen as an optional capability: rejection
or policy denial falls back to the expanded in-window view without an uncaught
error.

Images should preserve source aspect ratio and use the shared visual
presentation rules.

Tests: `media.test.ts`, `fullscreen.test.ts`, plus packaged navigation/fullscreen
checks where browser policy matters.
