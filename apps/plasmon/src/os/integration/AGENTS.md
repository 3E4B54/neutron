# OS integration agent instructions

## Authority

This directory is the composition boundary. It wires implementations together;
it must not become a second home for subsystem policy.

`services.ts` constructs filesystem transport, windows, Neutron bridge, native
registry, association defaults, process controller, OpenService, clipboard and
the filesystem core. `PlasmonOS.tsx` consumes those public services.

## Rules

- Preserve all compatible subsystem behavior when integrating changes; do not
  replace an integration file wholesale with stale branch state.
- Hosted filesystem access goes through the persistent background RPC boundary;
  standalone preview may use browser-local repository fallback.
- Association defaults use the raw FsService-backed store.
- `IntegratedOpenService` coordinates native handlers and Kernel Elements; do
  not add filename/game-specific dispatch.
- Fakes are test seams, never proof of a real Kernel capability.
- Authorization must fail closed when the required real service is unavailable.
- `AGENT_HANDOFFS.md` is historical handoff context, not higher authority than
  current scoped docs/contracts.
- `MTN_0_2_CONTRACT_RECONCILIATION.md` constrains the cross-AppScope security
  boundary; do not collapse provider semantics into MTN or vice versa.

## Validation

Integration tests should prove service composition and real public contracts.
For visible paths, add packaged browser tests; a source-level composition test
does not prove the installed foreground uses the intended implementation.
