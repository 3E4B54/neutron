# Shell agent instructions

## Authority

Shell owns Start/Search presentation, taskbar/tray, calendar, flyouts/context menus, pinning, shell preferences, and shell-level navigation/orchestration. It does not own generic filesystem opening, process storage, or Neutron installation/runtime authority.

## Rules

- Derive native tasks from process/window authorities rather than maintaining shadow process state.
- Derive external application state from `NeutronBridge`; preserve uncertainty when the Kernel cannot authoritatively answer.
- Start/Search inventories consume shared filesystem/application metadata rather than hard-coded parallel application catalogs.
- Opening from Shell delegates through shared opening/filesystem/association/Neutron services.
- Preferences persist through the approved preference store, not ad hoc foreground browser storage.
- Reuse shared resource visuals and semantic classification rather than shell-specific filename/type inference.
- Subscriptions/invalidation must keep derived task/search/start state current without requiring incidental user interaction.

Specific paths, suffix display bugs, individual runtime handlers, visual color fixes, or one-off Start entries belong in Issues/tests rather than this generic file.

## Refactor direction

Reduce the number of state machines directly coordinated in `Shell.tsx`. Extract production controllers/models for deterministic Start/Search/taskbar/flyout actions and keep React responsible for browser event wiring/rendering.

## Validation

Keep deterministic model/preference/search/start/subscription tests. Use real-browser tests for keyboard/focus/click-away/context-menu/taskbar behavior and installed Neutron verification only where Kernel behavior is part of the claim.
