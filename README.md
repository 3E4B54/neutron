# Malstorm

Malstorm is a multi-user application platform built on top of [Neutron](https://github.com/infu/neutron) and the Internet Computer.

It takes inspiration from Sandstorm's model of giving each user an isolated application instance, while using Neutron's app runtime and `AppScope` isolation inside an Internet Computer canister.

Malstorm is currently an experimental/hobby project. The core single-canister multi-tenant architecture is working locally; automatic cross-canister tenant routing is designed but not yet implemented.

## Concepts

Malstorm uses two user-facing terms:

* **Element** — an application or application type.
* **Isotope** — one isolated instance of an Element.

For example, two users can both create a Hello Element while receiving separate Hello Isotopes with independent state.

In source code, Malstorm intentionally uses generic implementation terminology instead:

* `app`
* `app_instance`
* `tenant`
* `grant`

The product terminology should not leak into Neutron internals.

## Architecture

A shared Malstorm canister contains:

```text
Malstorm / Neutron kernel
│
├── tenant membership
├── tenant authorization
├── logical app catalog
├── app-instance registry
├── app-instance allocation
├── app-instance lifecycle
│
├── Hello instance 001
├── Hello instance 002
├── Hello instance 003
├── ...
│
├── Demo instance 001
├── Demo instance 002
└── ...
```

Every physical app instance receives its own compiler-generated Neutron `AppScope`.

A tenant is granted access only to the physical app instances assigned to that tenant.

The kernel remains the authorization boundary. Filtering apps in the frontend is only a user-interface convenience and is not relied upon for security.

See [`doc/architecture.md`](doc/architecture.md) for the detailed design.

## Current Status

### Implemented and tested

* Neutron `AppScope` isolation between physical app instances.
* Persistent tenant membership.
* Exact tenant-to-app-instance grants.
* Tenant-aware backend authorization.
* Self-service tenant registration.
* Tenant-filtered launcher.
* Multiple instances of the same logical application per tenant.
* Logical app catalog and metadata.
* Generic physical-instance registry.
* App-instance retirement.
* Tenant-specific browser workspace persistence.
* Clean Internet Identity logout/login switching.
* Declarative app capacity.
* Cheap generation of many physical app packages from one built template.
* 32 Hello + 32 Demo instances in a single shared canister.
* Multiple independent shared canisters provisioned through Neutron's existing fleet support.

### Proven locally

Two different principals have been tested creating multiple Hello and Demo instances.

Example allocation:

```text
Tenant A
├── demo_001
├── demo_003
├── hello_001
└── hello_003

Tenant B
├── demo_002
├── demo_004
├── hello_002
└── hello_004
```

Each tenant can access only its own physical instances.

A two-node PocketIC fleet has also been successfully deployed with the full generated application capacity present on both shared canisters.

### Planned

* Stable Malstorm frontend/control-plane origin.
* Persistent tenant-to-shard directory.
* Automatic placement of new tenants on shared canisters with capacity.
* Provisioning of additional shared canisters as capacity is consumed.
* Optional dedicated canister tier.
* Production lifecycle and capacity monitoring.
* App publishing/store workflow.

## Why Precompiled App Instances?

Neutron generates a physical `AppScope` and entry-point wrappers for each app ID during compilation.

That means an already-compiled shared canister cannot cheaply invent an arbitrary new physical app ID at runtime without deeper changes to Neutron.

Malstorm therefore precompiles spare physical instances:

```text
hello_001
hello_002
hello_003
...
```

These IDs are implementation details. Users interact with the logical Hello Element rather than choosing a physical instance.

When a tenant creates Hello:

```text
New Hello
    ↓
find first usable Hello instance
    ↓
grant it exclusively to tenant
    ↓
open app
```

A production deployment can maintain enough spare capacity that users normally perceive creation as unlimited.

When an entire shared canister approaches capacity, Malstorm can place new tenants on another shared canister.

## Cheap Capacity Generation

Malstorm does not rebuild the complete application for every physical instance.

An application template is built once.

For each generated physical instance, Malstorm copies the already-built package data and rewrites the physical application identity metadata before repacking the `.neutron` archive.

Conceptually:

```text
Hello source
    ↓
build once
    ↓
Hello template dist/
    │
    ├── hello_001.neutron
    ├── hello_002.neutron
    ├── hello_003.neutron
    └── ...
```

Capacity is configured in:

```text
malstorm-app-pools.json
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

Generate deployment capacity with:

```bash
bun malstorm-capacity.ts
```

Generated artifacts are stored under:

```text
.malstorm-generated/
```

and are intentionally not committed.

## Shared Canisters

Shared-canister configuration lives in:

```text
malstorm-shards.json
```

For local testing:

```json
{
  "shared": [
    "local",
    "shared-002"
  ]
}
```

The existing Neutron local provisioner creates and manages the fleet.

Generate the deployment:

```bash
bun malstorm-capacity.ts
```

With PocketIC already being served, deploy with:

```bash
bun malstorm-provision.ts \
  malstorm-phase6.ndeploy.json \
  reinstall
```

Inspect the resulting fleet with:

```bash
npm run provision -- \
  malstorm-phase6.ndeploy.json \
  status
```

The Malstorm provisioning wrapper bootstraps the app catalog and physical-instance registry on every node.

## Local Development Workflow

Terminal 1:

```bash
npm run provision -- \
  malstorm-phase6.ndeploy.json \
  serve
```

Terminal 2:

```bash
bun malstorm-capacity.ts

bun malstorm-provision.ts \
  malstorm-phase6.ndeploy.json \
  reinstall
```

Then obtain the authoritative current canister URLs with:

```bash
npm run provision -- \
  malstorm-phase6.ndeploy.json \
  status
```

PocketIC canister IDs may change or be reused across local sessions. Do not rely on an old browser bookmark as the source of truth.

## Security Model

Important invariants include:

1. A physical app instance belongs to at most one tenant.
2. A normal tenant cannot grant itself an arbitrary physical app instance.
3. Tenant authorization is checked in backend compiler-generated wrappers.
4. App authorization requires the caller to own the exact physical app scope.
5. Kernel administrative methods remain owner-only.
6. Frontend filtering is never considered a security boundary.
7. Anonymous principals cannot self-register as tenants.
8. Retired instances cannot be allocated again.
9. Browser workspace state is isolated between authenticated principals.

See the architecture document for additional details.

## Repository-Specific Malstorm Files

Important Malstorm additions currently include:

```text
malstorm-app-pools.json
malstorm-shards.json
malstorm-capacity.ts
malstorm-provision.ts
phase3a-app-admin.ts
phase3b-bootstrap.ts
phase1b-tenant-admin.ts
```

Kernel additions include persistent memory for:

```text
malstorm_tenants
app_instances
app_instance_lifecycle
app_catalog
```

## Roadmap

The immediate next milestone is MVP cleanup and hardening:

* remove temporary test/debug UI;
* hide physical instance IDs from ordinary users;
* improve user-facing allocation and exhaustion behavior;
* clean up development-only scripts and names;
* perform final multi-principal authorization regression tests;
* document one reproducible fresh-deployment workflow.

Cross-canister tenant routing should be implemented only when shared-canister capacity actually needs to scale beyond one shard.

