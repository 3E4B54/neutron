# Plasmon Architecture

## 1. Overview

Plasmon is a multi-user application platform built on Neutron and the Internet Computer.

The core design goal is to provide Sandstorm-like isolated application instances while avoiding the cost of creating a separate Internet Computer canister for every free-tier application instance.

A free-tier Plasmon deployment therefore places many tenants and many isolated application instances inside a shared Neutron canister.

A future paid tier may instead place a tenant in a dedicated canister.

## 2. Terminology

### Product terminology

**Plasmon**

The personal application cloud/platform.

**Element**

An application available through Plasmon.

Examples:

```text
Hello
Notes
Blog
Chat
```

**Isotope**

A particular variant or build of an Element.

An Element may have multiple Isotopes, for example:

```text
Notes
├── stable release
├── beta release
└── older compatible release
```

**Atom**

One isolated application instance.

A tenant may create multiple Atoms from the same Isotope. Different tenants may also run independent Atoms from the same Isotope.

**Neutron**

The kernel/runtime underlying Plasmon.

### Implementation terminology

The product vocabulary is intentionally kept out of ordinary Neutron kernel APIs and data structures.

The implementation uses generic terminology:

```text
app
app_id
version / build / package
app_instance
app_instance_id
tenant
grant
```

For example:

```text
product Element:   Hello
product Isotope:   a particular Hello build
product Atom:      one tenant's isolated Hello instance

logical app:       hello
physical instance: hello_017
tenant:            Principal
grant:             tenant → hello_017
```

Element, Isotope, and Atom are product concepts rather than kernel type names.

## 3. Core Design

A shared Plasmon canister contains one Neutron kernel plus many physical application instances.

```text
                     Shared canister
┌────────────────────────────────────────────────────┐
│                    Neutron kernel                  │
│                                                    │
│  tenant membership                                │
│  tenant grants                                    │
│  app catalog                                      │
│  app-instance registry                            │
│  app-instance lifecycle                           │
│  authorization                                    │
│                                                    │
├────────────────────────────────────────────────────┤
│ hello_001 │ hello_002 │ hello_003 │ ...           │
├────────────────────────────────────────────────────┤
│ demo_001  │ demo_002  │ demo_003  │ ...           │
└────────────────────────────────────────────────────┘
```

Every physical application ID receives an independent compiler-generated Neutron `AppScope`.

The kernel maps physical instances to logical applications:

```text
hello_001 → hello
hello_002 → hello
hello_003 → hello

demo_001 → demo
demo_002 → demo
```

Tenant grants point to physical instances, not logical applications.

```text
Principal A
├── hello_001
└── demo_001

Principal B
├── hello_002
└── demo_002
```

This is the fundamental Plasmon isolation boundary.

## 4. Why Physical Instances Are Precompiled

Neutron's compiler generates application-specific runtime data for each physical app ID.

For every configured app, compilation produces an `AppScope` and corresponding ingress/capability wrappers.

Conceptually:

```text
hello_001
    ↓
NeutronAppScope_hello_001
    ↓
compiler-generated wrappers

hello_002
    ↓
NeutronAppScope_hello_002
    ↓
compiler-generated wrappers
```

An arbitrary physical app ID therefore cannot simply be created inside an already-built actor without modifying deeper Neutron assumptions.

Plasmon avoids that complexity by compiling spare physical app slots ahead of time.

This is an implementation detail rather than a product limitation.

From the user's perspective:

```text
Create Hello
```

is the operation.

The kernel chooses the physical instance.

## 5. AppScope Isolation

Initial experiments cloned a simple Hello application many times.

Each clone used the same source code and the same logical memory names but a different physical application ID.

The experiment verified that:

```text
hello_001 state ≠ hello_002 state
```

despite identical application code.

This follows naturally from Neutron's `AppScope` model.

The compiler-generated authorization wrapper for an ordinary app now checks authorization using the exact physical scope.

Conceptually:

```text
is_app_authorized({
    caller,
    scope = NeutronAppScope_hello_017
})
```

A grant for `hello_016` therefore does not authorize `hello_017`.

## 6. Tenant Membership

Plasmon maintains a persistent tenant map.

Conceptually:

```text
Principal → [physical app instance IDs]
```

An entry with an empty list is significant:

```text
Principal → []
```

It means the principal is a valid Plasmon tenant but currently owns no applications.

Tenant membership is therefore independent from application ownership.

### Self-service join

An authenticated non-anonymous principal can call the tenant join endpoint.

The operation is idempotent.

It creates:

```text
Principal → []
```

if the tenant does not already exist.

The anonymous principal cannot join.

## 7. Authorization

There are three relevant authorization concepts.

### Kernel owner authorization

Administrative kernel operations continue to use Neutron owner authorization.

Examples include:

```text
catalog registration
manual tenant grant
manual tenant revoke
physical instance registration
administrative diagnostics
```

### Session authorization

A session is accepted when the caller is either:

```text
Neutron owner
OR
registered Plasmon tenant
```

A tenant does not need to own an application merely to enter the Plasmon shell.

### App authorization

An ordinary app call is permitted when:

```text
caller owns the exact physical app instance
```

This check occurs in backend/compiler-generated wrappers.

The frontend launcher may hide unauthorized applications, but frontend filtering is not part of the security model.

## 8. Logical App Catalog

Plasmon separates logical application metadata from physical app instances.

Example catalog entry:

```text
app_id:       hello
name:         Hello
description:  Example Neutron application
```

Physical instances are registered independently:

```text
hello_001 → hello
hello_002 → hello
hello_003 → hello
```

This prevents product UI from needing to understand or display physical implementation IDs.

## 9. Allocation

A tenant requests a logical application:

```text
hello
```

The tenant does not request:

```text
hello_017
```

The allocator scans registered physical instances for the requested logical app.

An instance must be:

```text
registered
installed
not retired
not already assigned
```

The current allocator chooses the lexicographically first eligible instance.

Example:

```text
hello_001 assigned
hello_002 assigned
hello_003 free
hello_004 free

request hello
    ↓
allocate hello_003
```

The physical app ID is then added to that tenant's persistent grants.

## 10. Multiple Instances Per Tenant

There is intentionally no one-instance-per-logical-app restriction.

A tenant can own:

```text
hello_001
hello_003
hello_005
```

while another tenant owns:

```text
hello_002
hello_004
```

The platform therefore supports use cases analogous to multiple Sandstorm grains of the same app.

## 11. Lifecycle

A tenant may retire an app instance it owns.

Retirement:

1. verifies tenant ownership;
2. marks the physical instance as retired;
3. revokes it from the tenant.

A retired physical instance is permanently excluded from allocation in the current MVP.

This is deliberately conservative.

Secure wipe-and-reuse can be implemented later, but it is not required for the first usable version.

## 12. Browser Workspace Isolation

Neutron's workspace UI persists open tiles and layouts in browser storage.

The original implementation used one global storage key:

```text
neutron-kernel-workspaces-v2
```

That allowed multiple identities using the same browser profile to inherit each other's workspace layout.

Plasmon scopes workspace persistence by authenticated identity and deployment context.

Account switching was also tested together with Internet Identity logout/login behavior.

The browser workspace is a convenience layer only. Backend grants remain authoritative.

A stale frontend tile must never grant access to an application the tenant does not own.

## 13. Internet Identity

Plasmon currently uses Neutron's existing `icblast` Internet Identity integration.

The authentication lifecycle was hardened after repeated account switching exposed a race around logout.

The corrected lifecycle completes logout and recreates the mutable Internet Identity `AuthClient` before exposing the next login attempt.

Repeated switching between two identities has been tested without the previous permanent `Loading...` state.

## 14. Capacity Generation

Physical spare instances should be cheap to produce.

Building the same application source once for every physical ID would waste development time.

Plasmon instead builds a logical app template once and generates physical packages from its built `dist/`.

A `.neutron` application archive is a MessagePack mapping of gzip-compressed files from `dist/`.

Physical identity appears in several generated metadata files.

The capacity generator rewrites the instance-specific metadata and repacks the archive.

Conceptually:

```text
Hello template
     │
     ├─ dist/neutron.json
     ├─ dist/schema.json
     └─ dist/neutron.lock.json
             ↓
       rewrite app identity
             ↓
 ┌───────────┼────────────┐
hello_001 hello_002 ... hello_032
```

The application code and memory schema hashes remain identical.

## 15. Declarative Capacity

Capacity is declared in:

```text
plasmon-app-pools.json
```

Example:

```json
{
  "apps": [
    {
      "app_id": "hello",
      "template": "apps/hello_001",
      "name": "Hello",
      "description": "Example Neutron application",
      "capacity": 32
    }
  ]
}
```

`plasmon-capacity.ts` expands the capacity into physical IDs:

```text
hello_001
hello_002
...
hello_032
```

It also generates the deployment package list.

Generated data lives under:

```text
.plasmon-generated/
```

and is disposable.

## 16. Proven Shared-Canister Scale

The current local proof includes:

```text
32 Hello instances
32 Demo instances
```

for:

```text
64 physical app instances
```

in one shared Neutron canister.

Multiple principals successfully created multiple instances of both logical apps without crossing tenant boundaries.

The experiment proves the basic shared-canister model at a scale well beyond the original two-instance fixture.

It is not intended to establish the maximum production capacity of a Neutron canister.

## 17. Shared-Canister Fleet

A single shared canister is finite.

Plasmon therefore treats a shared canister as a shard.

Conceptually:

```text
Plasmon
│
├── shared shard 1
│   ├── tenant A
│   ├── tenant B
│   └── spare app instances
│
├── shared shard 2
│   ├── tenant C
│   ├── tenant D
│   └── spare app instances
│
└── shared shard N
```

Neutron's existing PocketIC deployment format already supports multiple local nodes.

Plasmon uses that facility rather than implementing a second canister provisioner.

Current local configuration:

```json
{
  "shared": [
    "local",
    "shared-002"
  ]
}
```

A two-node shared fleet has been successfully provisioned.

Each node contains the complete generated 32-Hello / 32-Demo capacity.

## 18. Shard Routing — Planned

Cross-shard user routing is intentionally not implemented yet.

It requires a stable Plasmon control-plane/frontend origin.

The intended design is:

```text
                 Plasmon frontend
                       │
                 authenticate once
                       │
                 stable identity
                       │
               tenant shard directory
                  /            \
                 /              \
          shared shard 1    shared shard 2
```

A tenant should be assigned permanently to a shard unless an explicit migration occurs.

A simple directory can conceptually contain:

```text
Principal → shard
```

New tenants would be placed on a shard with sufficient headroom.

Existing tenants would always return to their assigned shard.

### Why not simply redirect to shard URLs?

Each shared Neutron canister currently serves its own kernel frontend.

Using independent frontend origins for authentication creates identity and routing complications.

The production design should instead authenticate from one stable Plasmon origin and use the resulting browser identity when calling the selected backend canister.

This work is deferred because the current MVP does not need enough users to exhaust one shared shard.

## 19. Dedicated Canisters — Planned

The same routing layer can later support paid isolation.

For example:

```text
tenant A → shared-001
tenant B → shared-001
tenant C → dedicated canister C
tenant D → shared-002
```

The tenant-facing application model does not need to change.

The routing layer decides whether a tenant's runtime target is:

```text
shared shard
or
dedicated canister
```

## 20. Persistent Kernel Data

Plasmon adds separate managed memories instead of modifying Neutron's existing persistent kernel schema.

Current Plasmon-specific persistent data includes:

### `malstorm_tenants`

```text
Principal → [physical app instance IDs]
```

### `app_instances`

```text
physical app instance ID → logical app ID
```

### `app_instance_lifecycle`

```text
physical app instance ID → retired flag
```

### `app_catalog`

Logical application metadata.

Keeping these memories separate minimizes changes to upstream Neutron persistence assumptions.

## 21. Deployment Bootstrap

Deployment and tenant onboarding are separate operations.

After Neutron installs the generated physical app packages, Plasmon bootstrap:

1. registers logical application metadata;
2. registers physical-instance-to-logical-app mappings.

It does not create tenant grants.

Tenant membership is established later through self-service join.

The Plasmon provisioning wrapper applies bootstrap to every shared fleet node.

## 22. Security Invariants

The following properties should remain true as Plasmon evolves.

### Tenant isolation

A physical app instance belongs to at most one tenant.

### Exact-scope authorization

Owning one app instance never authorizes another physical instance.

### Owner separation

Tenant membership does not imply Neutron kernel ownership.

### No frontend trust

Removing or manipulating launcher filtering cannot grant backend access.

### Allocation integrity

Only eligible registered, installed, non-retired and unassigned instances may be allocated.

### Anonymous exclusion

The anonymous Internet Computer principal cannot self-register as a tenant.

### Lifecycle integrity

Retired physical instances cannot silently re-enter the allocation pool.

### App identity integrity

Generated physical instances must preserve unique physical IDs even when their executable application code is identical.

## 23. Current Limitations

The current implementation deliberately leaves several problems for later:

* retired instance wiping and reuse;
* automatic spare-capacity replenishment within a live deployment;
* production shard directory;
* automatic production shard creation;
* cross-shard migration;
* dedicated-canister billing/provisioning;
* app publishing/store workflow;
* production monitoring;
* user-facing storage and resource quotas.

None of these are required to validate the core isolation model.

## 24. MVP Boundary

For the first usable Plasmon version, the intended scope is:

```text
one shared canister
many tenants
many isolated app instances
self-service login
self-service app creation
clean user-facing launcher
safe authorization
reproducible deployment
```

The fleet work demonstrates that another shared canister can be provisioned when needed, but full automatic shard routing is not required before initial users exist.

## 25. Next Phase

The next development phase is primarily cleanup and hardening rather than new architecture.

Priorities:

1. remove temporary test controls;
2. hide physical app IDs from normal users;
3. improve logical-app presentation;
4. replace test-oriented allocation errors with product behavior;
5. clean up Phase-specific file names;
6. verify fresh deployment from a clean checkout;
7. repeat multi-principal security regression testing;
8. document known capacity and lifecycle limits.

Once those are complete, Plasmon should have a coherent MVP foundation upon which the future control plane, app store, and paid dedicated-canister tier can be built.
