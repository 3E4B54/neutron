# EmulatorJS runtime host

This directory integrates packaged EmulatorJS as an association-backed Plasmon runtime. It is a runtime host, not a Games launcher and not a `.sys` application.

The initial supported resource is an iNES `.nes` ROM. Association matching selects `runtime:emulatorjs`; the normal OpenService, process, and window authorities create the host. `EmulatorJsPlayer.tsx` reads the selected filesystem node through `FsService`, then gives the ROM to an isolated same-origin iframe running the packaged EmulatorJS browser engine.

## Runtime assets and lifecycle

Packaged runtime data lives under `/System/Program Files/EmulatorJS`. The host resolves that path relative to the installed Plasmon document so it continues to work when Neutron serves Plasmon below `/app/plasmon/`.

EmulatorJS 4.2.3 uses global `EJS_*` configuration. Each process therefore gets its own ordinary blank iframe so runtime globals, WASM, audio, timers, and engine state are isolated per native window. The host populates that iframe document directly, assigns the `EJS_*` configuration and lifecycle callbacks on its `contentWindow`, and injects the packaged `loader.js` into that same document. Only the ROM bytes use a Blob URL.

Do not replace this with a navigated `srcdoc` or Blob-hosted runtime document without packaged-browser evidence. Chromium may treat packaged runtime scripts loaded from an opaque nested document as cross-origin and block them before EmulatorJS initializes. The direct blank-iframe/contentWindow pattern keeps runtime assets on the Plasmon application origin while preserving one-engine-per-process isolation.

Unmounting the host terminates EmulatorJS when available, removes the iframe, and revokes the ROM object URL; no shared emulator framework is introduced.

The host disables EmulatorJS local settings/database caches where the public configuration supports it. Plasmon's filesystem remains authoritative for the ROM resource and any durable product state.

## Saves

The legal packaged acceptance ROM is a generated mapper-0 NES test image with no battery-backed save RAM, so this first runtime proof intentionally does not claim durable save-file support. EmulatorJS exposes save callbacks, but its engine also has browser-side save internals. Before Plasmon advertises durable saves for save-producing ROMs, those bytes must be bridged explicitly through `FsService`; browser storage must not become authoritative user state.

## Testing

Use fast Bun tests for `.nes` association matching, ROM validation, launch configuration, and the canonical headless filesystem -> association -> OpenService -> process/window path. Use the packaged browser lane only to prove installed EmulatorJS assets are served, the NES core initializes, and iframe teardown works in a real browser.
