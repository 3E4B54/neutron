# Plasmon

Plasmon is a Sandstorm-inspired personal application cloud built on the **Neutron** kernel/runtime for the Internet Computer.

The project turns Neutron's isolated application scopes into a multi-user hosting model where a logical application can have many independently owned instances inside a shared canister.

## Product terminology

| Product term | Meaning | Implementation convention |
| --- | --- | --- |
| **Plasmon** | The personal application cloud/platform | `plasmon` |
| **Element** | A logical application/package visible to users | `app`, `app_id` |
| **Isotope** | A variant, version, build, or runtime profile of an Element | `version`, `build`, `package` |
| **Atom** | One isolated instance of an Element, owned by one tenant | `app_instance`, `app_instance_id` |
| **Neutron** | The kernel/runtime substrate | Neutron's existing kernel/runtime names |
| **Tenant** | A user/principal using Plasmon | `tenant`, `principal` |
| **Grant** | Authorization from a tenant to one physical Atom | `grant` |
| **Shard** | One Neutron canister participating in a Plasmon deployment | `shard`, node/canister identifiers |

Product terminology belongs in user-facing Plasmon UX and documentation. Internal implementation code should normally use generic names such as `app`, `app_instance`, `tenant`, `grant`, and `shard`.

### Neutron implementation naming

Neutron production code remains product-agnostic. Product terminology such as **Plasmon**, **Element**, **Atom**, and **Isotope** belongs in Plasmon UX, documentation, and explicitly Plasmon-specific integration tooling.

Generic Neutron implementation code should use names such as:

```text
app
app_id
app_instance
app_instance_id
tenant
grant
allocation
runtime
```

The Phase 9 work originally introduced a tenant memory path named `memory/malstorm_tenants/v1.mo`. Because that memory has not shipped in the target branch, it is pending rename to a generic Neutron tenant-memory identity before Phase 9 is merged.

Once a stable-memory identity has shipped, future identity changes require an explicit compatibility/migration plan.

## Current architecture

The default Plasmon deployment is **one shared Neutron canister**.

```text
Plasmon
└── Neutron shard/canister
    ├── kernel
    ├── Element: Hello
    │   ├── Atom: hello_001 → tenant A
    │   └── Atom: hello_002 → tenant B
    ├── Element: Demo
    │   ├── Atom: demo_001
    │   └── Atom: demo_002
    └── Element: Notes
        ├── Atom: notes_001
        ├── Atom: notes_002
        └── ...
```

A physical Atom is a real Neutron app identity/AppScope compiled into the combined actor. Tenant isolation is enforced at the Neutron authorization boundary, not only in the frontend.

The current implementation provides:

- persistent tenant membership and grants;
- logical Element catalog metadata;
- logical Element → physical Atom registry;
- self-service tenant Atom allocation;
- non-reusable retired Atoms;
- tenant workspace isolation;
- owner-only kernel administration;
- tenant launcher filtering;
- runtime browser publishing of dependency-free `.neutron` packages;
- batch compilation and a single self-upgrade for multiple newly created Atoms;
- local development bootstrap generation.

See [`doc/architecture.md`](doc/architecture.md) for the detailed model.

### Phase 9 status

Phase 9 implements the first tenant logical-app installation/allocation path. The focused browser regression now validates:

- a tenant sees a logical app as installable before allocation;
- Install allocates one physical app instance;
- the launcher changes from Install to Open;
- opening the app repeatedly reuses that physical instance;
- multiple workspace Tiles can reference the same instance;
- browser reload preserves the installation;
- exact physical AppScope authorization prevents cross-tenant access.

The remaining Phase 9 work is cleanup and final validation rather than a change to this allocation model. See the Phase 9 closeout section in [`TODO.md`](TODO.md).


## Runtime publishing

The owner can publish an Element from a normal `.neutron` package.

The current flow is:

```text
upload logical .neutron package
        ↓
validate package and disclosures
        ↓
choose initial Atom capacity
        ↓
decode package once
        ↓
fan out physical identities in memory
        ↓
prepare all physical packages
        ↓
compile batch + request owner approval concurrently
        ↓
one Neutron self-upgrade
        ↓
register logical Element + physical Atoms
        ↓
Element becomes available to tenants
```

For an Element with logical ID `notes` and capacity `4`, the initial physical Atom IDs are:

```text
notes_001
notes_002
notes_003
notes_004
```

The current recommended/default initial capacity is **4**. Capacity should be demand-driven and expanded in batches rather than preallocating large pools.

### Current publishing limitation

Initial runtime publishing rejects packages with dependencies.

A dependency such as `notes → database` cannot be copied blindly because Plasmon needs an explicit tenant-aware mapping policy: for example, whether `notes_017` should depend on `database_017`, a tenant-shared service, or a globally shared service.

Dependency-aware publishing is deferred until that model is defined.

## Tenant allocation

A tenant requests a logical Element, not a specific physical Atom.

The kernel selects an installed, registered, non-retired, unassigned physical Atom and grants it to that tenant.

Example:

```text
Tenant A requests "notes"
→ kernel assigns notes_001

Tenant B requests "notes"
→ kernel assigns notes_002
```

A tenant's app call is authorized only when the caller owns the exact physical AppScope. Cross-tenant Atom calls are rejected even when both Atoms belong to the same logical Element.

Phase 9 additionally enforces an idempotent installation invariant:

```text
(principal, logical app) -> zero or one physical app instance
```

Repeated Install requests return the existing physical instance rather than allocating another one. Opening an installed app is a workspace operation only: it can create multiple Tiles, but those Tiles continue to reference the same physical app instance.


## Retirement

Physical Atoms are intentionally not recycled after retirement.

An Atom can contain tenant-specific stable state. Reassigning it to another principal would risk data leakage and authorization mistakes.

Retirement therefore removes it from future allocation permanently unless a future migration mechanism explicitly proves safe reuse.

## Local development

The Plasmon local environment uses PocketIC through Neutron's deployment tooling.

### Start the local deployment

Terminal 1:

```bash
npm run plasmon:serve
```

### Package and deploy changed kernel/backend/frontend code

Terminal 2:

```bash
npm --workspace neutron-kernel run package
npm run plasmon:deploy
```

A separate `neutron-kernel build` step is intentionally **not** part of the Plasmon workflow because it currently costs approximately the same as `package`.

After a redeploy, refresh already-open browser pages so they load the newly deployed frontend chunks.

### Check status

```bash
npm run plasmon:status
```

### Run the focused tenant isolation test

```bash
npm run plasmon:test
```

## Local identities

The local PocketIC deployment uses deterministic test identities.

Current manual-development convention:

```text
seed 2 → owner
seed 3 → tenant A
seed 4 → tenant B
```

The local-only browser test hook can switch identity. For example, the normal manual tenant view is:

```js
await window.__NEUTRON_PLAYWRIGHT_LOGIN_AS__(3)
```

Automated tests that mutate tenant grants should use dedicated test identities rather than assuming a manual-development tenant is pristine, and they should clean their grants on both success and failure.

Production ownership must not depend on these numeric development seeds.

## Development bootstrap

The following files support deterministic local bootstrap and capacity generation:

```text
plasmon-app-pools.json
plasmon-shards.json
plasmon-base.ndeploy.json
plasmon-capacity.ts
plasmon-provision.ts
plasmon-bootstrap.ts
plasmon-tenant-admin.ts
plasmon-app-admin.ts
```

Generated deployment/configuration artifacts include:

```text
plasmon.ndeploy.json
.plasmon-generated/
```

These generated artifacts should not be treated as source files.

`plasmon-app-pools.json` is a **development/bootstrap mechanism**. It is not intended to become the production source of truth for published Elements.

The production direction is:

```text
initial Plasmon deployment
        ↓
owner publishes Element in browser
        ↓
Neutron self-upgrade preserves existing Elements/Atoms
        ↓
owner adds capacity or publishes another Element
        ↓
subsequent platform upgrades preserve runtime-published state
```

## Build and frontend workflow

The current Neutron kernel pipeline is too expensive for frequent frontend-only iteration. At present, `TSX`/CSS changes require packaging and deployment to see the certified frontend.

This is a known high-priority development issue.

Planned work in [`TODO.md`](TODO.md) includes:

- local frontend watch/HMR against an existing PocketIC canister;
- incremental/build caching for the kernel pipeline;
- browser/compiler caching for content-addressed Motoko modules;
- reduced redundant network/preflight traffic;
- stale frontend chunk recovery after deployments.

Until that work lands:

- use focused tests/static inspection when a live deployment is unnecessary;
- use `package → plasmon:deploy` once when a live frontend/backend change must be tested;
- do not run a separate kernel `build` merely as a sanity check.

## Security model

Core security rules:

1. Neutron owners retain global kernel authority.
2. A tenant session is recognized independently from app ownership.
3. A non-owner app method is authorized against the exact physical AppScope.
4. One physical Atom belongs to at most one tenant.
5. Retired Atoms cannot be allocated.
6. Tenant A cannot invoke Tenant B's Atom.
7. Kernel install/admin operations remain owner-only.
8. Frontend filtering is convenience; backend authorization is the security boundary.

The permanent local E2E regression test covers owner/tenant roles, install authorization, unique allocations, and cross-tenant call rejection.

## Sharding direction

One shared canister is the default deployment model.

Additional shards should be introduced only when a canister approaches a practical capacity, compilation, memory, cycle, or installed-app limit.

Future placement policy can support:

- many free/shared tenants per canister;
- batched capacity expansion;
- dedicated canisters/shards for paid tenants or high-demand workloads.

The frontend should eventually present one Plasmon environment even when a tenant's Atoms span multiple shards.

## Repository direction

Plasmon is being developed as a focused layer on top of Neutron rather than by replacing Neutron's internal vocabulary everywhere.

That separation is intentional:

```text
Product UX/docs:
Element / Isotope / Atom / Plasmon

Implementation:
app / version / app_instance / tenant / grant / shard

Runtime:
Neutron
```

See [`TODO.md`](TODO.md) for current work and [`doc/architecture.md`](doc/architecture.md) for the detailed architecture.
