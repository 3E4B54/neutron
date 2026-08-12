# Games

`src/games/` contains Plasmon-owned game content/bootstrap glue. It does **not** own a parallel game launcher, emulator shell, or filename-specific dispatch path.

## Launch model

Games are normal filesystem resources and use the same open pipeline as other files:

```text
filesystem resource
  -> shared filesystem-aware open dispatcher
  -> AssociationRegistry
  -> selected runtime/handler
  -> NativeProcessController/window host where appropriate
```

For DOS bundles, `.jsdos` is associated with the js-dos runtime implemented under `src/native-apps/jsdos/`. js-dos is a Program Files runtime/handler, not a Plasmon `.sys` application. Do not create `DOS.sys`, `Emulator.sys`, or `Games.sys`, and do not special-case `Doom.jsdos` in generic launch code.

## Current proof content

`hackathon-content.ts` is temporary proof-content seeding. It currently attempts to fetch:

```text
/Games/DOS Bundles/Doom.jsdos
```

and copy those bytes into the user's Plasmon filesystem as:

```text
/Desktop/Doom.jsdos
```

The created node is explicitly marked `temporaryHackathonContent` with redistribution status `unverified`. Removing or replacing that seed must not change generic `.jsdos` launch semantics.

`build.ts` creates a proof bundle at the matching build-output path, but build-output existence is **not** sufficient acceptance evidence. A packaged Neutron install must actually serve the asset over HTTP, seed or expose the game as intended, route it through associations, start js-dos, and allow the user to play it.

## Current packaged regression

The 2026-08-11 packaged review observed:

```text
GET /Games/DOS Bundles/Doom.jsdos -> 503 Service Unavailable
```

As a result Doom appeared neither on the Desktop nor as usable game content. This remains a required acceptance failure until fixed or explicitly deferred. The fact that the package build generated the bundle does not close the issue.

## Product direction

Game support should remain data- and association-driven so additional bundle formats/runtimes can be added without putting game identities into Shell, Desktop, FileManager, or the open dispatcher. Save persistence, thumbnails/artwork, runtime parity, and EmulatorJS support should extend this generic model rather than introducing a second game subsystem.

The minimum packaged Games acceptance is simple: **double-click a game resource in packaged Plasmon and the game actually launches and is playable.**

## Deeper design

See:

- `../../docs/GAMES_DAEDALOS_ARCHITECTURE.md`
- `../../docs/FILESYSTEM_DESKTOP_UX_GAMES_CORRECTION.md`
- `../native-apps/jsdos/README.md`
- `../os/fs/README.md`
- `../os/associations/README.md`
