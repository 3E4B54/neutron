# Plasmon frontend source instructions

## Scope

Applies to `apps/plasmon/src/**` in addition to `apps/plasmon/AGENTS.md` and any closer subsystem instructions.

## Canonical implementation

The packaged path starts at `index.tsx` and renders `os/PlasmonOS.tsx`. Treat `os/**` and `native-apps/**` as the canonical implementation unless a current task or import inspection proves otherwise.

Legacy/compatibility trees are migration sources, not alternate authorities. Do not add new product behavior there merely because an older implementation already contains a similar feature.

## Boundaries

- OS-wide state and services belong under `os/**`.
- Native application/domain UI belongs under `native-apps/**`.
- Kernel-facing behavior belongs behind `os/neutron/**` and verified Neutron contracts.
- Cross-subsystem construction belongs under `os/integration/**` and the composition root.
- Shared presentation primitives belong under the shared visual system instead of being reimplemented per surface.
- Filesystem content, preferences, process state, and other durable/runtime authorities must stay with their owning subsystem.

## Refactor policy

Prefer extracting deterministic user-action semantics from large React components into reusable production modules. React should translate browser events, render state, and compose services; it should not become the only place where filesystem, navigation, lifecycle, or mutation rules exist.

When retiring legacy source:

1. identify whether the active entrypoint still imports it;
2. inventory useful behavior rather than wholesale-porting the old tree;
3. migrate only behavior that belongs in the current architecture;
4. prove the replacement through focused tests and the relevant packaged/browser boundary;
5. remove dead compatibility code only after active dependencies are gone.

Track concrete migrations and deletions in Issues rather than freezing them into this file.

## Validation

Use deterministic tests for production models/services/controllers. Use browser/package coverage when the behavior depends on the DOM, focus/pointer events, browser runtime APIs, packaged assets, or installed Neutron behavior.

Do not declare a UI migration complete because a new component exists in the source graph; prove that the packaged entrypoint exercises the intended path when packaging is part of the claim.
