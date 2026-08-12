# Native Apps

`native-apps` contains first-party window content that is integrated directly into the Plasmon desktop.

Current examples:

- `file-manager/` — the first-party filesystem browser and file action surface;
- `notepad/` — text editing surface;
- `photos/` — image viewing surface;
- `jsdos/` — first game runtime integration, association-driven through `.jsdos`;
- `emulatorjs/` — association-driven EmulatorJS runtime for the first NES (`.nes`) slice.

These programs are not all `*.sys` package applications. File handlers and runtime hosts remain ordinary association targets when the architecture calls for them.

Keep native app presentation code separate from the service boundary. Filesystem authority stays in `FsService`; open/routing decisions stay in the association and process layers.

## Package-structure fast lanes

Repository-level architecture tests already enforce the expected `README.md`/`AGENTS.md` pairings for app subtrees that require local documentation. When a new component family is added under `native-apps/`, run the relevant repository-sensitive structure test before relying on the combined Fast CI result.

## Document close and persistence

App-owned dirty-buffer and close-confirmation mechanics belong inside the relevant native-app family once the shell-level document-dirty contract has been consumed. The first concrete example is `notepad/`, where edits are written through the resolved `FsService` and titlebar/window close requests query the same app-owned dirty state before the shell closes the window.

Keep generic close prompting out of `native-apps/`; the window model only brokers the close request and asks the app whether confirmation is required.
