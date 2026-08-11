# Visual system agent instructions

## Authority

`visual/**` defines shared visual assets, sizing, presentation composition,
shortcut overlays, media/native-app presentation and wallpaper primitives.

## Rules

- Use the shared semantic size tokens; do not create competing numeric icon
  systems per surface.
- Preserve developer/native artwork and media aspect ratio with `contain` rather
  than crop-to-fill.
- A shortcut keeps the target icon/artwork and adds a **small overlay** in the
  conventional corner. The shortcut marker must not replace or dominate the
  original icon.
- `.sys`, application, folder/file/media and resource semantics should map to
  shared visual assets consistently across Desktop, FileManager, Start/Search
  and taskbar.
- Do not invent DOS/Emulator system-app artwork as a way to create fake `.sys`
  apps.
- Visual parity work should use the accepted Plasmon GUI/reference behavior and
  packaged screenshots, not merely unit snapshots.
- Consumers should compose these primitives instead of hard-coding parallel
  icon fallback/palette logic.

## Validation

Keep component/token tests and add packaged visual/interaction regressions where
a user review identifies a recurring presentation failure.
