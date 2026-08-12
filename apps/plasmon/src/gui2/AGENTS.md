# gui2 agent instructions

## Status

`src/gui2/**` is historical/experimental reference code. It is not an implementation target for new Plasmon product work.

## Rules

- Do not add features here when they belong to canonical `src/os/**` or `src/native-apps/**`.
- Do not create `gui3`, `gui4`, or another version-numbered replacement tree.
- Do not make current code depend on legacy `src/platform/**` merely to reuse this prototype.
- When borrowing an interaction or visual idea, port the behavior into the current owner and use current contracts/services/visual primitives.
- Treat current packaged acceptance requirements and current architecture as authoritative over prototype shortcuts.
- Before deleting this directory, verify it has no active production entrypoint/build imports and preserve any still-needed behavior in canonical code.

## Validation

Any migrated behavior must be tested in its canonical subsystem and, when user-visible, in packaged Plasmon/browser automation. Running or snapshotting the historical prototype is not acceptance evidence for the current OS.
