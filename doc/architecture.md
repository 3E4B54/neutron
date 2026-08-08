# Plasmon Architecture

## 1. Purpose

Plasmon is a multi-user personal application cloud built on the Neutron kernel/runtime.

Its core idea is similar to Sandstorm grains: a user does not merely receive access to a shared logical application. The user receives an isolated physical application instance with its own Neutron AppScope and persistent state.

Plasmon uses product terminology at the UX layer while preserving generic implementation terminology internally.

## 2. Terminology and naming convention

### 2.1 Product model

```text
Plasmon
└── Element
    └── Isotope
        └── Atom
```

- **Plasmon** — the platform/personal application cloud.
- **Element** — a logical application exposed to users, such as Notes.
- **Isotope** — a particular variant/version/build/runtime profile of an Element.
- **Atom** — one isolated running/installed instance of an Element/Isotope for a tenant.
- **Neutron** — the kernel/runtime substrate.

An Element may have multiple Isotopes, and each Isotope may have multiple Atoms.

Example:

```text
Element: Notes
├── Isotope: Notes stable
│   ├── Atom: notes_001 → Alice
│   └── Atom: notes_002 → Bob
└── Isotope: Notes beta
    └── Atom: notes_beta_001 → Carol
```

Isotope is currently a **product architecture concept**. The implementation does not yet maintain a complete first-class Isotope registry. For now, package/version/build metadata is the implementation-level precursor.

### 2.2 Implementation terminology

Internal code should normally use:

```text
Element  → app / app_id
Isotope  → version / build / package
Atom     → app_instance / app_instance_id
user     → tenant / principal
access   → grant
canister → shard / node
```

This keeps the Plasmon product vocabulary from leaking through every Neutron internal API.

### 2.3 Stable-memory naming exception

Persistence identity takes precedence over cosmetic naming.

The existing stable-memory module:

```text
apps/kernel/backend/memory/malstorm_tenants/v1.mo
```

and its corresponding import path are legacy persistence identities. They must not be mechanically renamed to `plasmon_*` merely for branding consistency.

Any future rename requires a deliberate stable-memory migration.

## 3. Deployment topology

### 3.1 Default topology

The default production model is one shared Neutron canister:

```text
Internet Computer
└── Plasmon shared shard
    └── Neutron combined actor
        ├── kernel
        ├── hello_001
        ├── hello_002
        ├── notes_001
        ├── notes_002
        └── ...
```

The system should add shards only when the current shard approaches practical limits.

Empty logical capacity is not represented by separate canisters. Physical Atoms are AppScopes inside the same Neutron combined actor.

### 3.2 Future topology

```text
Plasmon
├── shared shard A
│   ├── many free/shared tenants
│   └── many physical Atoms
├── shared shard B
│   └── overflow capacity
└── dedicated shard
    └── future paid/high-demand tenant
```

The product UX should eventually hide shard placement from normal tenants.

## 4. Neutron execution model

Neutron statically assembles the kernel and installed application modules into one Motoko actor.

For each physical app identity, the compiler creates a distinct AppScope and generated wrapper surface.

Conceptually:

```text
logical Element: notes

physical Atoms:
notes_001 → AppScope(notes_001)
notes_002 → AppScope(notes_002)
notes_003 → AppScope(notes_003)
```

Physical Atom identities therefore must exist when the combined actor is compiled.

This is why adding new capacity currently requires:

1. generating new physical identities;
2. compiling a new combined actor containing them;
3. self-upgrading the Neutron canister;
4. registering the new physical instances in the Plasmon registry.

Neutron's current installed-app bound around 256 is treated as a tested product-scale limit, not an Internet Computer protocol limit. Raising it requires scale validation.

## 5. Logical registry

Plasmon introduces a logical layer above physical Neutron app identities.

### 5.1 Element catalog

The Element catalog stores logical metadata:

```text
app_id
name
description
```

Example:

```text
app_id: notes
name: Notes
description: Private personal notes
```

### 5.2 Atom registry

The physical registry maps a physical app instance to its logical Element:

```text
notes_001 → notes
notes_002 → notes
notes_003 → notes
```

The logical catalog is used for discovery and UX. The physical identity is used for actual Neutron authorization and execution.

### 5.3 Atomic pool registration

The owner-only `kernel_app_pool_register` operation registers:

- logical `app_id`;
- Element display name;
- Element description;
- one or more physical `app_instance_ids`.

All physical instances are validated before registry mutation.

The registration call is intentionally performed after a successful Neutron deployment because the registry must not point at physical scopes that were never installed.

That creates a small split boundary: deployment may commit before registry registration. A future recovery/reconciliation path must handle this deterministically.

## 6. Tenant model

A tenant is identified by an Internet Computer principal.

Tenant membership is independent from owning any Atom. A tenant may remain a valid Plasmon tenant with an empty Atom grant list.

Conceptually:

```text
tenant principal
    ↓
persistent grant list
    ↓
physical Atom IDs
```

Example:

```text
Alice principal
├── notes_001
└── demo_002

Bob principal
└── notes_002
```

## 7. Authorization

### 7.1 Owner authorization

Neutron owners retain global kernel authority.

Kernel/admin operations continue to use owner authorization.

Examples include:

- kernel install/update operations;
- logical pool registration;
- owner grant/revoke tooling;
- future capacity administration.

### 7.2 Tenant session authorization

A tenant session is recognized when the caller is an owner or a registered Plasmon tenant.

This allows a tenant with zero Atoms to enter Plasmon and allocate one.

### 7.3 Physical Atom authorization

For a non-kernel app method, the generated wrapper checks authorization against the exact physical AppScope.

Conceptually:

```text
caller Alice
scope notes_001
→ allowed only if Alice owns notes_001

caller Alice
scope notes_002
→ rejected if notes_002 belongs to Bob
```

The frontend is not the security boundary. Tenant launcher filtering improves UX, but the backend AppScope authorization remains authoritative.

## 8. Atom allocation

Tenant allocation operates on logical Elements.

The caller requests:

```text
app_id = notes
```

The kernel selects an instance that is:

- registered under `notes`;
- installed in the current Neutron actor;
- not retired;
- not assigned to another tenant.

The current allocator selects the lexicographically first qualifying physical instance.

Example:

```text
free: notes_001, notes_002, notes_003

Alice requests notes
→ notes_001

Bob requests notes
→ notes_002
```

The physical Atom ID is then added to that tenant's persistent grant list.

## 9. Atom retirement

A retired physical Atom is permanently excluded from future allocation.

This is intentional because the Atom can contain tenant-specific stable state.

Safe default:

```text
tenant deletes/retires notes_001
→ revoke tenant access
→ mark notes_001 retired
→ never assign notes_001 to a different tenant
```

Future storage migration or secure reset mechanisms may introduce more sophisticated lifecycle choices, but implicit reuse is prohibited.

## 10. Runtime Publish Element

### 10.1 Goal

Production publishing should happen from Plasmon itself rather than by editing a host-side JSON file and reinstalling the deployment.

Owner flow:

```text
Plasmon Admin
└── Publish Element
    ↓
upload .neutron
    ↓
metadata + initial Atom capacity
    ↓
one owner approval
    ↓
one Neutron self-upgrade
    ↓
logical pool registration
    ↓
available to tenants
```

### 10.2 Package fan-out

The uploaded `.neutron` package is decoded once.

The browser creates physical variants in memory by rewriting package identity metadata while sharing immutable module/web byte arrays.

For a logical package:

```text
id: notes
```

with capacity `4`:

```text
notes_001
notes_002
notes_003
notes_004
```

The identity-bearing package metadata rewritten for each physical Atom includes:

- `neutron.json`;
- `schema.json` app identity metadata;
- `neutron.lock.json` app identity.

Large module and web payloads do not need to be copied byte-for-byte for each in-memory clone.

### 10.3 Approval and compilation ordering

Neutron's approval UI requires compilation metadata before approval can complete.

Therefore runtime publishing starts:

- batch compilation; and
- the owner approval request

concurrently.

After both complete successfully, the prepared package batch is deployed.

Sequentially waiting for approval before starting compilation creates a deadlock where the UI remains on `Compiling...`.

### 10.4 One deployment

All requested physical Atoms are compiled as one prepared package batch and installed through one Neutron self-upgrade.

The intended cost model is:

```text
N new Atoms
≠ N canister upgrades

N new Atoms
→ 1 combined actor compile
→ 1 self-upgrade
```

### 10.5 Dependency restriction

Initial runtime publishing rejects package dependencies.

Reason: logical package dependencies do not yet define physical tenant-aware dependency routing.

This must be designed before dependencies are allowed.

## 11. Capacity strategy

Capacity should be demand-driven.

Large speculative pools are undesirable because every installed physical AppScope contributes to the combined actor inventory and therefore affects future compile/upgrade work.

Current target:

```text
initial capacity: 4
```

Future Add Capacity flow:

```text
Element notes currently:
notes_001 .. notes_004

owner Add Capacity +4
        ↓
generate:
notes_005 .. notes_008
        ↓
batch compile
        ↓
one self-upgrade
        ↓
register only the new physical IDs
```

Automatic capacity expansion may later use low-water thresholds, but it should expand in batches rather than triggering a canister upgrade for every tenant allocation.

## 12. Isotopes

Isotope represents a version/build/runtime profile of an Element.

It is intentionally separate from Atom:

```text
Element = what application is this?
Isotope = which version/variant?
Atom = which isolated tenant instance?
```

A future registry may model:

```text
notes
├── stable / version 1.4
└── beta / version 2.0-beta
```

Questions still to resolve:

- whether an Atom is pinned to one Isotope;
- in-place Atom upgrades versus migration to a new Atom;
- rollout channels;
- rollback;
- stable-memory compatibility;
- whether tenants can opt into beta Isotopes.

Until then, implementation code should use normal `version`, `build`, and `package` metadata.

## 13. Development bootstrap

Local development currently supports declarative bootstrap pools through:

```text
plasmon-app-pools.json
plasmon-capacity.ts
plasmon-bootstrap.ts
plasmon-provision.ts
```

The capacity generator materializes physical package identities and creates a generated deployment configuration.

This mechanism is useful for deterministic tests and initial local setup.

It is **not** the desired production publishing architecture.

Production should preserve runtime-published Elements and Atoms across subsequent Neutron/Plasmon upgrades.

## 14. Build and browser-compiler performance

The current developer and runtime publishing paths expose two related performance issues.

### 14.1 Kernel development build cost

Frontend, kernel, compiler, and packaging work are currently coupled tightly enough that frontend-only edits require an expensive full package/deploy cycle.

Required direction:

```text
frontend-only edit
→ local dev server
→ HMR/watch
→ no canister upgrade
```

The full package/deploy path should remain the final integration test, not the CSS editing loop.

### 14.2 Runtime publishing module fetches

The browser compiler retrieves many existing Motoko modules using content-addressed paths such as:

```text
/mo/<content-hash>.mo
```

These modules are natural immutable-cache candidates.

Future publishing should reuse modules already cached by hash instead of redownloading unchanged content for every Element/capacity operation.

### 14.3 Build cache

The kernel build/package pipeline should gain explicit incremental cache boundaries.

Potential cache units include:

- frontend bundle;
- individual Motoko source/module inputs;
- generated assembly inputs;
- compiler output where all relevant inputs are unchanged;
- packaged static assets.

Cache correctness and invalidation must be documented and tested.

## 15. Sharding

A single shared canister remains the default.

Sharding becomes necessary only when practical constraints justify it, including:

- installed physical app count;
- compile time;
- Wasm size;
- canister memory;
- cycles;
- deployment latency;
- workload isolation.

Future Plasmon routing should map logical tenant operations to the correct shard without exposing that complexity in normal UX.

## 16. Production ownership

Local development currently uses deterministic test identities.

That mechanism is only for PocketIC/E2E work.

Production requires:

- explicit first-owner bootstrap;
- safe owner recovery;
- add/revoke owner administration;
- separation between normal Plasmon administration and low-level Neutron administration.

## 17. Security invariants

The following invariants are architectural requirements:

1. Kernel owner authority cannot be acquired merely by becoming a tenant.
2. Tenant membership does not imply access to every installed app.
3. A tenant may call only explicitly granted physical Atom scopes.
4. One physical Atom may belong to at most one tenant.
5. Retired Atoms are not reassigned.
6. Tenant A cannot access Tenant B's Atom.
7. Logical Element metadata never substitutes for physical AppScope authorization.
8. Publishing/capacity operations remain owner-only.
9. Registry state must not claim a physical Atom exists unless its Neutron scope is committed.
10. Frontend filtering must never be relied on as the authorization boundary.

## 18. Architectural direction

The intended long-term model is:

```text
Plasmon owner publishes an Element
        ↓
small initial Atom pool
        ↓
tenants self-allocate isolated Atoms
        ↓
capacity expands in batches as demand grows
        ↓
Element upgrades become Isotopes
        ↓
shared shards scale horizontally when necessary
```

Neutron remains the runtime substrate. Plasmon adds logical application identity, multi-tenant ownership, capacity management, and product UX above it.
