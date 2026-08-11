# Desktop

The Desktop is the visual filesystem view of `/Desktop`. It is not a separate
desktop database and it is not a launch authority.

`Desktop.tsx` composes FileManager-style entry interaction over `FsService` and
`FsEventSource`; `layout.ts` assigns/persists grid placement keyed by stable
`NodeId`.

## Invariants

- Desktop contents come from the filesystem.
- Placement follows node identity, so rename does not relocate an item.
- Newly created nodes receive a free slot before placement persistence finishes.
- Double-click/open must use the shared filesystem-aware dispatcher. Shortcuts,
  `.sys`, `.neutron`, directories and ordinary files must not have Desktop-only
  launch semantics.
- Shortcut presentation uses the target artwork plus the shared small shortcut
  overlay; the overlay must not replace the whole icon.
- Selection, marquee, rename and drag interactions must not leak through modal
  dialogs such as Open With.

Packaged Desktop behavior is important acceptance surface and should receive
Playwright coverage for shortcut/open, selection and drag flows.
