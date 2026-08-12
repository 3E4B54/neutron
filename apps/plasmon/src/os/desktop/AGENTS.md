# Desktop agent instructions

## Authority

`desktop/**` owns the desktop workspace presentation and desktop-specific layout state. It consumes filesystem/FileManager/opening authorities rather than replacing them.

## Rules

- Desktop contents come from `FsService`; do not add parallel file persistence.
- Persist layout against stable node identity, not path/display name.
- Reuse shared FileManager selection/file-operation/opening semantics where applicable.
- Keep generic resource opening delegated to shared OS services.
- Use shared visual primitives instead of creating Desktop-only resource/icon semantics.
- Keep modal/dialog event boundaries from leaking into desktop pointer/marquee behavior.

## Refactor direction

Keep `Desktop.tsx` thin. Move deterministic layout/gesture decisions into production helpers and move shared file interaction improvements into FileManager rather than forking behavior here.

## Validation

Test layout/identity semantics below React. Use browser tests for real pointer/marquee/drag/focus/modal behavior and packaged Desktop workflows when DOM behavior is the claim.
