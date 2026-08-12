# Native process runtime

`process/**` implements Plasmon-local native application registration, process lifecycle, lazy component hosting, and synchronization with the window manager.

A native application definition, a running process record, a window, a filesystem resource, a logical Atom, and a Neutron Element/AppScope are separate identities.

## Architecture

- `registry.ts` stores native application metadata and lazy loaders.
- `controller.ts` owns process creation, singleton/multi-instance behavior, target/title updates, focus delegation, close lifecycle, and reconciliation when windows disappear.
- `store.ts` owns process records/subscriptions.
- `NativeProcessHost.tsx` is the React adapter that subscribes to process state and mounts the registered lazy component.

The controller delegates geometry/chrome/focus mechanics to `WindowManager`; the window manager does not become process storage. Real Neutron Elements remain outside this process model.

## Refactor direction

Keep lifecycle state and decisions in the controller/store/registry so Shell and apps can be tested without rendering React. Keep the React host thin: loading/mounting an app should not become the place where process policy accumulates.

If lifecycle semantics expand (activation, shutdown negotiation, recovery, multi-window ownership), evolve the production controller/contracts deliberately rather than encoding them as taskbar or app-specific event handlers.

## Testing

Use fast controller/registry/store tests for creation, singleton/multi-instance behavior, target/title updates, startup failure cleanup, focus delegation, close/reconciliation, subscriptions, and loader retry/cache behavior. Browser tests are only needed when the claim depends on visible focus/window/taskbar behavior rather than controller state.
