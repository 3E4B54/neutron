# Windowing agent instructions

## Authority

`windowing/**` owns Plasmon-local window state, geometry, z-order, focus,
minimize/maximize/restore, rendering, and pointer/resize interactions.

## Rules

- Window state is local UI state, not Neutron AppScope/tile ownership.
- `focus()` must make a minimized window visible and preserve maximized restore
  semantics.
- Keep titlebars reachable and enforce per-window minimum dimensions.
- Preserve restore geometry across maximize/minimize transitions.
- Viewport changes must reflow normal/maximized windows safely.
- Manager snapshots must be detached from internal mutable state.
- Subscriptions must fire for real state changes and clean up correctly.
- Do not make process storage authoritative here; coordinate through the public
  process/window contracts.
- Preserve attribution and adaptation notes in `THIRD_PARTY.md`.

## Validation

Use geometry/manager tests plus packaged focus/minimize/close/taskbar workflows
when user-visible behavior changes.
