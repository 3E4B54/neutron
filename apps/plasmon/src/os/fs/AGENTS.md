# Filesystem agent instructions

## Authority

`fs/**` owns Plasmon filesystem semantics. UI layers consume it; they do not
replace it.

## Preserve

- `NodeId` is stable across rename, move, Trash and restore.
- Hosted durable storage remains behind the Plasmon background/RPC boundary.
- Bootstrap/reconciliation is versioned and idempotent.
- Dot-prefixed names are the canonical hidden convention.
- `/System/Start Menu` is user-customizable even though other managed System
  areas are protected.
- `/System/.Trash`, `/Apps`, and Program Files protections must not be bypassed
  through generic FsService mutations.
- `/Apps/*.neutron` is a stable projection of Kernel install state, not install
  authority.
- `.sys` classification requires an actual registered Plasmon native app.
- Ordinary resources open through `openDispatcher.ts` and associations.
- Shortcut dereference belongs here/shared opening, not Shell.
- Durable defaults and temporary demo seeds are distinct lifecycles.

## Open-dispatch requirement

Directory, shortcut, `.sys`, `.neutron`, and ordinary-file opening must all be
handled by the shared filesystem-aware path. A consumer-specific fallback that
opens `.sys`/`.neutron`/shortcuts as Text is a regression, even if unit-level
dispatcher tests still pass.

## Tests

Cover positive and negative protected operations, identity preservation,
bootstrap idempotence, projection stability, shortcut loops/Trash targets, and
cross-surface packaged opening where behavior is visible.

Do not work around a packaged failure by adding game-name or app-name dispatch.
