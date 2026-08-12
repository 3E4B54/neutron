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

A rendered native close control is a request, not lifecycle authority. When `NativeWindow` receives `onRequestClose`, the callback owns the lifecycle decision; returning `false` means the close was prevented or deferred and the window restores its ordinary rendered state. Plasmon composition routes this callback through `ProcessController.close()`. Direct `WindowManager.close()` remains lower-level window-state teardown for the caller that already owns that decision.

## Refactor direction

Keep geometry and state transitions deterministic and testable below React. Browser-specific pointer capture, animation-frame previews, focus routing, ResizeObserver integration, accessibility/inert behavior, iframe interaction suppression, and close-animation presentation belong in thin DOM adapters around the manager.

Do not teach the window manager Shell layout or process lifecycle policy; composition should provide the actual available viewport and lifecycle close callback. Keep process ownership outside this subsystem and coordinate through public contracts.

Upstream behavioral adaptations/attribution belong in `THIRD_PARTY.md` and should remain preserved through refactors.

## Testing

Use pure geometry/manager tests for creation, focus/order, viewport constraints, state transitions, snapshot isolation, subscriptions, and cleanup. Use real-browser coverage for pointer drag/resize, keyboard/focus, close-animation presentation, inert/accessibility, iframe interaction, ResizeObserver, and other DOM-only behavior. Manual review remains appropriate for animation/interaction feel.
