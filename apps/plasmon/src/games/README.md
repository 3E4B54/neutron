# Games

`src/games/` contains Plasmon-owned game content and bootstrap glue. It is not a parallel launcher, emulator shell, or resource-dispatch architecture.

## Architecture

Game resources participate in the same filesystem/opening model as other user resources. Runtime selection belongs to associations and the owning runtime implementation; Shell, Desktop, FileManager, and generic filesystem code should not acquire game-title-specific behavior.

Reusable game runtimes belong under the appropriate native-app/runtime boundary. Game content, metadata, bootstrap/import behavior, and game-specific persistence concerns belong here only when they are genuinely game-domain responsibilities.

## Direction

Keep game support data- and association-driven so new bundle formats or runtimes can be added without special-casing individual games. Prefer shared filesystem, process, windowing, visual, and runtime authorities rather than creating a second game-specific copy of those systems.

Temporary/demo/bootstrap content must remain separable from durable product defaults and must preserve licensing/redistribution metadata.

## Testing

Deterministic game metadata, bootstrap, association, save-state, and routing logic should be tested headlessly where practical. Use package/browser verification only for boundaries that require a real installed asset or runtime: HTTP serving, iframe/runtime initialization, input, fullscreen, audio/video, or actual playability.

A generated asset existing in build output is package evidence, not proof that the installed application serves or executes it correctly.

## Deeper design

See:

- `../../docs/GAMES_DAEDALOS_ARCHITECTURE.md`
- `../../docs/FILESYSTEM_DESKTOP_UX_GAMES_CORRECTION.md`
- `../native-apps/jsdos/README.md`
- `../os/fs/README.md`
- `../os/associations/README.md`
