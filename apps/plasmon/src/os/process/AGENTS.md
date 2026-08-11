# Native process agent instructions

## Authority

`process/**` owns Plasmon-local native application registration, process records,
lifecycle, lazy host loading, and synchronization with the window manager.

## Rules

- A native process is not a Neutron AppScope, Element installation, Atom, or
  Kernel tile.
- External Neutron Elements remain Kernel-owned sibling tiles and must not be
  hosted as local native processes.
- Respect singleton vs multi-instance application metadata.
- Relaunching a singleton must update its target and focus/restore its window.
- Process close and external window close must converge without leaked records.
- Title, target, icon and lifecycle changes must notify subscribers so Shell and
  taskbar state invalidates promptly.
- Runtime handlers such as js-dos may use a native process/window host without
  becoming `.sys` applications.

## Validation

Cover loader retry behavior, defensive metadata snapshots, lifecycle cleanup,
target/title updates, singleton focus/restore and window-close synchronization.
Packaged taskbar staleness is a regression even if process-unit tests pass.
