# Plasmon documentation index

This directory is the durable long-form design and architecture record for Plasmon. Chat handoffs and issue discussions are coordination; stable product rules should end up in scoped README/AGENTS files, canonical documents here, executable tests, or implementation.

Use the nearest subsystem `README.md` and `AGENTS.md` for day-to-day ownership and implementation guidance. Use documents here for cross-subsystem architecture, accepted terminology, deeper design rationale, and compatibility constraints.

## Filesystem, Desktop, and application resources

- [`FILESYSTEM_DESKTOP_UX_ARCHITECTURE.md`](FILESYSTEM_DESKTOP_UX_ARCHITECTURE.md) — filesystem/application resource model and shared desktop/file interaction architecture.
- [`FILESYSTEM_DESKTOP_UX_GAMES_CORRECTION.md`](FILESYSTEM_DESKTOP_UX_GAMES_CORRECTION.md) — accepted correction for game/runtime placement within that architecture.

Current implementation entry points and scoped rules live under [`../src/os/`](../src/os/).

## Games

- [`GAMES_DAEDALOS_ARCHITECTURE.md`](GAMES_DAEDALOS_ARCHITECTURE.md) — game/runtime architecture and daedalOS-derived product direction.
- [`../src/games/README.md`](../src/games/README.md) — current games implementation boundary.

## Visual system

- [`VISUAL_SYSTEM_THEME.md`](VISUAL_SYSTEM_THEME.md) — shared visual-system architecture and design direction.
- [`../src/os/visual/README.md`](../src/os/visual/README.md) — current implementation boundary.

## Atoms and collaboration

Start with [`atoms/README.md`](atoms/README.md), which indexes the Atom design documents and explains their relationship to current contracts and implementation.

## Source-of-truth order

When guidance materially conflicts:

1. current explicit task;
2. nearest applicable `AGENTS.md`;
3. accepted canonical architecture/contract document;
4. scoped `README.md`;
5. current implementation and tests as evidence of behavior.

Old design documents should be updated, superseded, or clearly marked when accepted decisions change them. Do not turn a historical implementation detail or one-off issue into a generic repository rule.

## Testing and acceptance

Plasmon testing strategy is documented in [`../TESTING.md`](../TESTING.md) and [`../test/README.md`](../test/README.md). Deterministic semantics should be exercised headlessly where practical; package/browser/manual evidence is required only for claims that cross those boundaries.

- [`ACCEPTANCE_2026-08-11_BASELINE_GATE.md`](ACCEPTANCE_2026-08-11_BASELINE_GATE.md) — integrated acceptance/evidence disposition for the 2026-08-11 packaged review baseline, including remaining milestone blockers and evidence-layer boundaries.

## Neutron documentation

Plasmon does not redefine the Kernel. Repository-level Neutron documentation under [`../../../doc/`](../../../doc/) remains authoritative for Kernel capabilities, isolation, installation/package/runtime behavior, persistent-memory rules, and security boundaries.
