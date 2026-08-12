# Plasmon native windowing

`windowing/**` owns Plasmon-local floating-window state and interaction behind the public `WindowManager` contract. It manages window identity, geometry, z-order, focus, minimize/maximize/restore state, viewport constraints, subscriptions, and the browser interaction layer used to move/resize native windows.

It does not own process records, application registration, filesystem state, Shell/taskbar state, or Neutron Kernel tiles.

## Main pieces

- `NativeWindowManager.ts` — deterministic window-state manager and geometry commits.
- `geometry.ts` — pure viewport/window constraint calculations.
- `NativeWindow.tsx` — rendered window chrome and pointer interaction adapter.
- `interaction.ts` — reusable interaction helpers.
- `WindowLayer.tsx` — subscribes to manager state and connects the available DOM viewport to the manager.
- `useWindowStates.ts` — React subscription helper.

The manager returns detached state snapshots and emits updates when authoritative state changes. Browser rendering/interaction should consume manager state rather than becoming a second geometry store.

## Refactor direction

Keep geometry and state transitions deterministic and testable below React. Browser-specific pointer capture, animation-frame previews, focus routing, ResizeObserver integration, accessibility/inert behavior, and iframe interaction suppression belong in thin DOM adapters around the manager.

Do not teach the window manager Shell layout policy; composition should provide the actual available viewport. Keep process ownership outside this subsystem and coordinate through public contracts.

Upstream behavioral adaptations/attribution belong in `THIRD_PARTY.md` and should remain preserved through refactors.

## Testing

Use pure geometry/manager tests for creation, focus/order, viewport constraints, state transitions, snapshot isolation, subscriptions, and cleanup. Use real-browser coverage for pointer drag/resize, keyboard/focus, inert/accessibility, iframe interaction, ResizeObserver, and other DOM-only behavior. Manual review remains appropriate for animation/interaction feel.
