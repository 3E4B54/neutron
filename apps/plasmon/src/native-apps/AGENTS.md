# Native applications agent instructions

## Authority

`native-apps/**` owns Plasmon-native application/domain UI and association-backed runtime hosts. Generic filesystem, association/opening, process/window, visual, and Neutron authority remain in their shared OS subsystems.

## Rules

- Register applications/handlers through the shared registries; do not create parallel application or association catalogs.
- Read/write filesystem documents through `FsService` or shared document-session abstractions rather than app-private persistence.
- Keep one-off opening/default selection in association/opening services rather than app-local file-type switches.
- Reuse shared process/window/visual infrastructure.
- Distinguish application/product identity from the mechanism used to host a runtime in a native window.
- Browser/runtime capabilities that may be unavailable must fail clearly and safely rather than being simulated as working.
- Shared type/language/media metadata should remain coherent across applications and OS consumers.

Specific filename suffixes, exact window titles, individual menu affordances, runtime installation paths, or current visual defects belong in Issues/tests unless they represent a lasting cross-app invariant.

## Refactor direction

Prefer reusable production models/services for document sessions, navigation, editor/media/runtime adapters, and settings/resource inspection. Keep React components focused on application presentation and browser-event integration.

## Validation

Use fast tests for deterministic domain/model behavior. Use real-browser/package tests for Monaco/workers, media/iframe/fullscreen/object URLs, packaged runtime assets, and other browser-dependent functionality. Do not change release/version metadata outside an explicit release task.
