# Plasmon documentation index

This directory is the durable long-form design/architecture record for Plasmon. Chat handoffs and agent conversations are coordination; stable product rules should end up in scoped README/AGENTS files, canonical documents here, executable tests, or implementation.

Use the nearest subsystem `README.md` and `AGENTS.md` for day-to-day ownership and implementation rules. Use the documents here when the subsystem links to a deeper architecture contract or when work crosses several owners.

## Filesystem, Desktop, and application resources

- [`FILESYSTEM_DESKTOP_UX_ARCHITECTURE.md`](FILESYSTEM_DESKTOP_UX_ARCHITECTURE.md) — filesystem/application resource model, protected operations, open dispatch, shortcuts, hidden semantics, bootstrap/reconciliation, Start Menu, Trash, Program Files, and `/Apps` projections.
- [`FILESYSTEM_DESKTOP_UX_GAMES_CORRECTION.md`](FILESYSTEM_DESKTOP_UX_GAMES_CORRECTION.md) — correction establishing that js-dos and EmulatorJS are association-backed Program Files runtimes, not `DOS.sys`/`Emulator.sys`/`Games.sys` facades.

Current implementation entry points and scoped rules live under [`../src/os/`](../src/os/).

## Games

- [`GAMES_DAEDALOS_ARCHITECTURE.md`](GAMES_DAEDALOS_ARCHITECTURE.md) — game association/runtime architecture, daedalOS research, save direction, runtime packaging, and format parity.
- [`../src/games/README.md`](../src/games/README.md) — current implementation status and packaged acceptance, including temporary proof content.

Game launch remains association-driven. Build-output presence alone is not packaged acceptance; the installed package must serve the content and the game must actually become playable.

## Visual system

- [`VISUAL_SYSTEM_THEME.md`](VISUAL_SYSTEM_THEME.md) — shared Plasmon theme, icon family, visual primitives, and downstream consumption rules.
- [`../src/os/visual/README.md`](../src/os/visual/README.md) — current visual-system implementation boundary.

## Atoms and collaboration

Start with [`atoms/README.md`](atoms/README.md), which indexes and frames the Atom design documents:

- [`atoms/FIRST_COLLABORATIVE_ATOM_DESIGN.md`](atoms/FIRST_COLLABORATIVE_ATOM_DESIGN.md) — broad collaborative Atom architecture and Review model.
- [`atoms/FIRST_COLLABORATIVE_ATOM_MVP.md`](atoms/FIRST_COLLABORATIVE_ATOM_MVP.md) — contracted MVP scope and architecture redlines, including logical revision semantics and the distinction between live structured state and immutable publication.

Related MTN/Plasmon authorization reconciliation is in [`../src/os/integration/MTN_0_2_CONTRACT_RECONCILIATION.md`](../src/os/integration/MTN_0_2_CONTRACT_RECONCILIATION.md).

## Source-of-truth order

When guidance materially conflicts:

1. Current explicit task.
2. Nearest applicable `AGENTS.md`.
3. Accepted canonical architecture/contract document.
4. Scoped `README.md`.
5. Current implementation and tests.

Existing code is evidence of current behavior, not automatic authority over a frozen contract. Likewise, an old design document should be updated or clearly superseded when an accepted decision changes it.

## Packaged acceptance and regressions

A design or source-level test does not prove a visible packaged workflow. Plasmon-level test strategy is documented in [`../test/README.md`](../test/README.md). Repeatable packaged/manual-review failures should become browser/Playwright regressions where practical and remain acceptance work until explicitly deferred.

## Neutron documentation

Plasmon does not redefine the Kernel. Repository-level Neutron documentation under [`../../../doc/`](../../../doc/) remains authoritative for Kernel capabilities, AppScope isolation, installation/package/runtime behavior, persistent-memory release rules, and security boundaries.
