# OS contracts agent instructions

## Scope

Applies to `apps/plasmon/src/os/contracts/**`.

## Rules

- Keep contracts implementation-free: no React components, browser storage,
  repositories, concrete registries, or Kernel transport details.
- Preserve stable identifier semantics. In particular `NodeId`, Atom identity,
  process identity, and window identity must not be conflated.
- A contract change is not a local refactor. Audit all implementers, fakes,
  adapters, and consumers before changing it.
- Do not weaken `FsService` into path-only identity; rename/move must preserve
  node identity.
- Keep Neutron bridge contracts narrower than or equal to actual vanilla
  Neutron capabilities.
- Authorization/sharing contracts must preserve the boundary where MTN owns
  cross-AppScope authorization and providers own resource semantics.
- Do not add app-specific or game-specific methods to generic contracts.

## Validation

Update contract fakes and contract/integration tests with every semantic change.
Prefer compatibility-preserving additions where possible. Surface breaking
changes for coordinator/owner review before implementation.
