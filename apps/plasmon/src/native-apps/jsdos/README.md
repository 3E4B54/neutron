# js-dos runtime

This directory hosts the `.jsdos` runtime integration and player.

**js-dos is not a Plasmon `.sys` application.** It is an association-backed
runtime/program represented under `/System/Program Files/js-dos`. It should not
appear in Start as a standalone Plasmon system app merely because its player is
rendered through `NativeProcessController`.

## Open path

```text
.jsdos file
  -> AssociationRegistry (`application/x-jsdos` / extension)
  -> runtime:js-dos handler
  -> NativeProcessController window host
  -> JsDosPlayer
```

There must be no game-name dispatch and no `DOS.sys` or `Games.sys`.

`runtime.ts` loads the packaged js-dos runtime and `JsDosPlayer.tsx` hosts the
game surface. Game content is data; see `../../games/`.

Acceptance is packaged and behavioral: double-click a game bundle, the runtime
starts, and the game is actually playable.
