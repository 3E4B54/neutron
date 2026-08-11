# Explorer / FileManager.sys

Explorer is the native application wrapper around the shared FileManager UI.

`ExplorerApp.tsx` owns the window-level navigation chrome; `history.ts` and
`navigation.ts` maintain directory history/address navigation. File operations
and entry interaction remain in `os/file-manager/**`.

## Invariants

- `FileManager.sys` represents this actual native application and must launch it
  through the shared filesystem dispatcher. It must never fall through to Text.
- Back/Forward navigation changes the current directory using filesystem
  identity/history rather than browser navigation.
- Address navigation resolves real filesystem directories.
- Explorer does not implement a second filesystem or association registry.

Packaged acceptance includes double-clicking `FileManager.sys`, Back/Forward,
typed addresses, and ordinary file/shortcut opening inside the window.
