# gui2 historical desktop prototype

`src/gui2/` is a historical/experimental Plasmon desktop implementation. `DesktopShell2.tsx` predates the current `src/os/**` architecture and consumes the legacy `src/platform/**` abstraction.

It is **not the current product entrypoint**. The active path is:

```text
src/index.tsx
  -> src/os/PlasmonOS.tsx
```

New Desktop, FileManager, Shell, windowing, filesystem, application, association, or visual-system work belongs in the canonical `src/os/**` and `src/native-apps/**` owners.

## Why this directory remains

The prototype may still be useful as historical evidence for interactions or visual ideas that were explored before the current architecture stabilized. If a behavior here is desirable, inspect it and migrate the behavior intentionally into the canonical subsystem while preserving current filesystem/Neutron authority boundaries.

Do not preserve a bug or architectural shortcut merely because `gui2` implemented it. Likewise, do not discard a useful interaction without checking whether it represents an accepted product behavior.

## No versioned GUI successors

Do not create `gui3/`, `gui4/`, another `DesktopShellN.tsx`, or a parallel replacement shell to avoid modifying current code. Plasmon should have one canonical implementation. Successor work evolves `src/os/**`.

## Removal

This directory can be removed when its remaining reference value is no longer needed and active imports/build wiring have been verified absent. Deletion should not require preserving its legacy platform abstraction as a compatibility layer unless current code actually depends on it.
