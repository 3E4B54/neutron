# Plasmon TODO

This file tracks Plasmon-specific work on top of Neutron.

## Priorities

- **P0** — blocks productive development or the current publishing/capacity path.
- **P1** — required for a usable Plasmon MVP.
- **P2** — important follow-on architecture/product work.
- **P3** — later optimization or expansion.

## Completed foundation

- [x] **P0 — AppScope tenant isolation**
  - Kernel/owner methods remain owner-only.
  - Non-owner app calls are authorized against the exact physical app scope.
- [x] **P0 — Persistent tenant grants**
  - Tenant membership and physical app grants survive upgrades.
- [x] **P0 — Generic app-instance registry**
  - Logical apps map to registered physical app instances.
- [x] **P0 — Dynamic available-app catalog**
  - Tenants can discover logical apps with available unassigned capacity.
- [x] **P0 — Tenant self-service allocation**
  - A tenant requests a logical app; the kernel assigns one installed, unassigned physical instance.
- [x] **P0 — Safe retirement**
  - Retired physical app instances are not reusable.
- [x] **P0 — Tenant onboarding and workspace isolation**
  - Tenant workspace state is scoped by canister and principal.
- [x] **P0 — Generated bootstrap capacity**
  - Development bootstrap can generate physical app instances from declarative pool configuration.
- [x] **P0 — Owner/tenant UI boundary**
  - Tenant sessions do not expose privileged kernel controls.
- [x] **P0 — Cross-tenant security regression test**
  - Owner/tenant role checks, install authorization, unique allocations, and cross-Atom call rejection are covered.
- [x] **P0 — Browser Publish Element prototype**
  - Owner uploads one dependency-free `.neutron` package.
  - Browser fans the package out into multiple physical app identities in memory.
  - All physical instances compile in one batch.
  - Owner approves once.
  - One Neutron self-upgrade installs the batch.
  - Logical app metadata and physical instances are registered atomically afterward.

## P0 — Developer experience

- [ ] **Add a frontend development server with watch/HMR**
  - `TSX`/CSS edits must not require `neutron-kernel package` + canister redeploy.
  - Local frontend should talk to the existing PocketIC canister/gateway.
  - Target workflow:
    - start PocketIC/Neutron once;
    - run a frontend dev server;
    - edit frontend files;
    - HMR or auto-refresh in seconds.
  - Full package/deploy remains the integration path.

- [ ] **Add incremental/build caching to the Neutron kernel pipeline**
  - Avoid rebuilding unchanged frontend, Motoko, compiler inputs, and package artifacts.
  - Identify stable cache keys for each expensive stage.
  - Reuse unchanged generated actor/module work where safe.
  - Document cache invalidation rules.
  - Add timing output so cache effectiveness is measurable.

- [ ] **Cache content-addressed Motoko modules in the browser/compiler**
  - Runtime publishing currently refetches a large number of `/mo/<hash>.mo` modules.
  - These paths are content-addressed and therefore natural immutable-cache candidates.
  - Repeated Element publishes should reuse local module content whenever the hash is unchanged.
  - Measure first-publish versus subsequent-publish request count and compile latency.

- [ ] **Reduce avoidable browser request/preflight overhead**
  - Current local publish traces contain many API POSTs plus corresponding CORS `OPTIONS` requests.
  - Classify required deployment calls versus redundant state/query traffic.
  - Prefer same-origin/local-dev routing where practical.
  - Do not weaken IC authorization or install-journal safety to reduce request count.

- [ ] **Handle stale frontend chunks after self-upgrade/redeploy**
  - A page loaded before deployment can reference frontend chunks removed by the new deployment.
  - Detect failed/stale chunk loads and offer or perform a safe reload.
  - Production users should not need to know that a canister upgrade replaced static assets.

## P0 — Current Publish Element UI

- [ ] **Finish Publish Element form styling**
  - Default initial Atom capacity: **4**.
  - Capacity field should match the existing theme.
  - Description field should use normal themed input styling and full usable width.
  - Keep raw Neutron File/URL installation out of the normal Plasmon launcher workflow.

- [ ] **Finish tenant "new Element" launcher tile**
  - Show a proper icon/action affordance.
  - Show the full Element name.
  - Show the Element description when present.
  - Use a useful fallback such as `Create a new Atom`.
  - Match normal launcher tile dimensions, spacing, hover, focus, and dark/light theme behavior.

- [ ] **Verify description round-trip**
  - Owner-supplied publish description must be persisted in the logical app catalog.
  - Tenant `kernel_app_catalog_get` must return it.
  - Launcher must display it.

- [ ] **Add publishing progress/error UX**
  - Distinguish validation, compiling, approval, staging, uploading, activating, and registry steps.
  - Surface actionable errors without requiring DevTools.
  - Make cancellation semantics explicit where cancellation is still safe.

## P0 — Finish runtime publishing proof

- [ ] **Complete tenant allocation proof for a runtime-published Element**
  - Tenant A allocates `publish_test_001`.
  - Tenant B allocates `publish_test_002`.
  - Tenant A cannot call Tenant B's Atom.
  - Tenant B cannot call Tenant A's Atom.
  - Published Element remains visible while free capacity exists.
  - Element disappears from available-app discovery when no free Atom remains.

- [ ] **Add permanent E2E coverage for Publish Element**
  - Owner-only publish.
  - One approval for a multi-Atom batch.
  - Correct physical IDs.
  - Logical catalog registration.
  - Tenant allocation.
  - Cross-tenant rejection.
  - Registry failure handling after a committed deployment.

## P1 — Capacity management

- [ ] **Add Capacity**
  - Owner selects an existing Element and requests additional Atom capacity.
  - Read the Element's existing physical instance IDs.
  - Allocate the next suffixes, e.g. `notes_005` through `notes_008`.
  - Compile/install all new physical instances in one batch.
  - Register only the new instances under the existing logical app.
  - Preserve existing Atom data and assignments.

- [ ] **Capacity policy**
  - Default initial capacity should be small and demand-driven; current target is **4**.
  - Avoid large speculative pools.
  - Define low-water/high-water thresholds for future automatic expansion.
  - Batch expansion so every single tenant allocation does not force a self-upgrade.

- [ ] **Elements admin view**
  - Logical Element name and description.
  - Package/version information.
  - Total Atom capacity.
  - Allocated Atoms.
  - Free Atoms.
  - Retired Atoms.
  - `Add Capacity`.
  - Future upgrade/Isotope controls.

- [ ] **Tenant admin view**
  - Principal.
  - Assigned Atoms.
  - Logical Element for each Atom.
  - Retired/revoked state.
  - Owner actions where appropriate.

## P1 — Deployment and persistence

- [ ] **Make runtime-published state the production source of truth**
  - `plasmon-app-pools.json` is a development/bootstrap mechanism, not the production catalog.
  - Production operation must not require editing static pool JSON to publish an Element.

- [ ] **Preserve dynamically published Elements across Plasmon/Neutron upgrades**
  - A kernel/platform upgrade must rebuild/self-upgrade from the currently installed app inventory plus the new kernel.
  - Do not reconstruct production state solely from bootstrap configuration.
  - Define recovery behavior if an upgrade fails after compilation but before commit.

- [ ] **Reduce development bootstrap**
  - Keep only minimal Hello/Demo capacity needed for tests.
  - Current development target: 2 Hello + 2 Demo, or less when test coverage no longer needs both.
  - Eventually allow an empty Plasmon deployment plus runtime publishing.

- [ ] **Document stable-memory migration rules**
  - Product terminology changes must not silently rename stable-memory identities.
  - The existing path `apps/kernel/backend/memory/malstorm_tenants/v1.mo` and import identity are persistence-sensitive legacy names.
  - Rename only through an explicit migration plan.

## P1 — Owner/admin model

- [ ] **Production owner bootstrap**
  - Define how the first production owner principal is established without deterministic local test seeds.
- [ ] **Owner management UI/API**
  - Add/revoke additional administrator principals.
  - Preserve a safe recovery path.
- [ ] **Separate normal owner UX from low-level Neutron administration**
  - Plasmon owner flows should use Element/Atom concepts.
  - Advanced raw Neutron install/admin controls may remain available behind an explicit advanced surface.

## P1 — Security and lifecycle

- [ ] **Runtime-publish atomicity/recovery audit**
  - Deployment can commit before logical pool registration.
  - Define deterministic recovery/reconciliation for this split boundary.
- [ ] **Retirement and deletion UX**
  - Clarify whether tenant deletion means retire Atom, remove data, or both.
  - Never accidentally recycle an Atom containing prior tenant state.
- [ ] **Catalog/registry consistency checks**
  - Detect installed-but-unregistered physical apps.
  - Detect registered-but-not-installed physical apps.
  - Provide owner repair tooling.
- [ ] **Capacity exhaustion behavior**
  - Clean tenant UX when an Element has no free Atom.
  - Owner warning and Add Capacity path.

## P2 — Isotopes / Element upgrades

- [ ] **Make Isotope a first-class product concept**
  - Product meaning: a version/build/runtime profile of an Element.
  - Implementation may remain `version`, `build`, or `package`.
- [ ] **Define Atom upgrade policy**
  - In-place Atom upgrade versus new Atom migration.
  - Per-tenant staged rollout.
  - Rollback.
  - Stable-memory compatibility.
- [ ] **Support multiple Isotopes of one Element**
  - Example: stable and beta variants.
  - Define whether new tenants choose an Isotope or follow an Element channel.

## P2 — Package dependencies / composition

- [ ] **Design tenant-aware dependency mapping**
  - Initial Publish Element intentionally rejects package dependencies.
  - Decide whether `notes_017` depends on a tenant-matched `database_017`, a shared service Atom, or another explicit model.
- [ ] **Implement dependency-aware publishing only after the mapping semantics are explicit**
  - Do not silently copy logical dependency IDs into physical Atom manifests.

## P2 — Sharding

- [ ] **Shared-shard capacity model**
  - One shared Neutron canister is the default.
  - Add shards only when capacity/scale requires them.
- [ ] **Cross-shard tenant identity and launcher behavior**
  - Tenant should see one Plasmon experience even if their Atoms span shards.
- [ ] **Shard placement policy**
  - Free tier shared placement.
  - Future paid/dedicated canister placement.
- [ ] **Shard health/capacity telemetry**
  - Cycles.
  - Memory.
  - Installed physical app count.
  - Compile/install limits.

## P2 — Admin/dashboard

- [ ] **Plasmon Admin dashboard**
  - Elements.
  - Atoms.
  - Tenants.
  - Shards.
  - Capacity.
  - Cycles/memory/burn.
  - Recent publish/upgrade operations.
- [ ] **Operational warnings**
  - Low cycles.
  - Low free Atom capacity.
  - Failed or incomplete registry operation.
  - Near Neutron installed-app product limit.

## P3 — Scale and performance research

- [ ] **Re-measure compile/install scaling**
  - Physical app count versus compile time.
  - Physical app count versus Wasm size.
  - Physical app count versus module/request count.
  - Physical app count versus install cycle cost.
- [ ] **Investigate Neutron's current ~256 app product limit**
  - Treat it as a tested product bound, not an ICP protocol limit.
  - Raise only with empirical scale tests.
- [ ] **Explore code/template dedup opportunities**
  - Preserve Atom isolation while avoiding redundant compile/package work where possible.
