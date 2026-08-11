# MTN 0.2 / Plasmon authorization contract reconciliation

Status: **PROPOSED — security review required before contract amendment**

Authoritative MTN dependency:

- repository: `plasmon-cloud/multitenancy-neutron`
- branch: `version-0.2.0`
- accepted SHA: `13a412f40bc0c3571c43bcfb8f0e2133b35ffc3a`

This proposal changes Plasmon, not MTN. MTN remains the authorization source of truth.

## Why reconciliation is required

Agent 8 and Agent 9 independently found that the frozen Plasmon `ResourceAuthorizationService` is too lossy to represent accepted MTN 0.2 safely.

The current four-method abstraction (`issue`, `inspect`, `redeem`, `revoke`) conflates three distinct concepts:

1. published snapshot location/revision;
2. MTN authorization resource identity;
3. live MTN lease/provider-call authority.

Preserving that abstraction unchanged would require at least one prohibited workaround: guessing an AppScope, hiding `lease_id` in adapter state, fabricating full inspection data, encoding a publication revision into MTN identity, or bypassing compiler-bound exact-AppScope issuer/provider capability delivery.

## Reconciliation decision

### 1. Separate authorization identity from published snapshot location

MTN authorization identity is canonical and revision-free:

```ts
interface AuthorizationResourceRef {
  namespace: string;
  resourceId: string;
  resourceType: string;
}
```

Plasmon provider snapshot location remains a separate concept:

```ts
interface PublishedResourceRef {
  resource: AuthorizationResourceRef;
  revision: string;
}
```

A provider implementation may carry provider-specific schema/version metadata internally, but authorization grants must not treat the publication revision as MTN resource identity.

For snapshot sharing, the non-secret snapshot revision must travel as an explicit share locator/provider-operation parameter. Do not encode it into AtomId/NodeId/MTN `resource_id`, and do not create a grant-to-revision authorization shadow database.

### 2. Make AppScope explicit and lossless

Plasmon needs a generic exact physical AppScope representation matching MTN semantics:

```ts
interface AuthorizationAppScope {
  appId: string;
  installationUid: string; // lossless Nat64 decimal representation
}
```

The consumer scope required by redemption must come from integration/runtime context and must be passed to the MTN redemption boundary. It must never be guessed from Element/package identity.

Issuer/provider authority remains compiler-bound to the exact backend AppScope. A frontend-selected provider scope is not a replacement for that capability.

### 3. Preserve the MTN lease as first-class authority

Successful redemption must return a lease that retains the MTN handle and scopes:

```ts
interface ResourceAuthorizationLease {
  leaseId: string;
  grantId: string;
  subject: string;
  consumerScope: AuthorizationAppScope;
  providerScope: AuthorizationAppScope;
  resource: AuthorizationResourceRef;
  rights: readonly ResourceRight[];
  issuedAtNs: string;
  expiresAtNs: string;
}
```

Lossless decimal strings are proposed for Nat64/nanosecond values at the TypeScript/wire contract boundary. JavaScript `number` must not represent MTN epoch nanoseconds.

No adapter-side lease cache is permitted merely to preserve a hidden handle omitted by the public contract.

### 4. Replace full pre-auth inspection with the safe MTN shape

Public inspection must expose only what accepted MTN exposes before authorization:

```ts
interface ResourceGrantInspection {
  namespace: string;
  resourceType: string;
  consumerElement?: string;
  rights: readonly ResourceRight[];
  expiresAtNs?: string;
  revoked: boolean;
}
```

It must not fabricate `resource_id`, provider scope, issuer scope, audience, or bearer material.

Issuer-authorized grant listing is a separate backend-bound operation, not an expansion of public inspection.

### 5. Represent structured audience and issuance policy

The grant request must be able to represent accepted MTN issuance inputs without lossy string conventions:

```ts
type ResourceGrantAudience =
  | { kind: "any_authenticated" }
  | { kind: "principal"; principal: string };

interface IssueResourceGrantRequest {
  resource: AuthorizationResourceRef;
  rights: readonly ResourceRight[];
  audience?: ResourceGrantAudience;
  consumerElement?: string;
  maxRedemptions?: string; // lossless Nat where applicable
  expiresAtNs?: string;
}
```

Exact final field optionality/names must follow the accepted MTN 0.2 public/compiler surface.

### 6. Add live lease/provider operations rather than trusting redeemed snapshots

The Plasmon authorization boundary must represent the accepted MTN lifecycle needed by Sharing:

- issue;
- issuer-authorized list as needed;
- safe public inspect;
- redeem with exact consumer AppScope;
- revoke;
- rotate resource;
- register provider callback through the compiler-bound backend capability;
- lease-bound authorized call;
- delegate;
- release lease.

Sharing must use MTN's lease-bound authorized call for cross-AppScope provider operations. It must not redeem once and then directly call `SharedResourceProvider.importResource(...)` as though rights were a durable local snapshot.

### 7. Keep backend capability transport distinct from public Kernel operations

Accepted MTN 0.2 intentionally exposes only capability discovery/safe inspection/redemption through the general Kernel actor surface while issuer/provider operations are delivered through compiler-bound `AuthorizationV1` to an exact backend AppScope.

Plasmon integration therefore needs backend capability declaration/wiring (including the accepted authorization capability declaration) and narrow backend methods that use the compiler-delivered capability. Do not add public Kernel issue/list/revoke/rotate/release calls that MTN deliberately does not expose.

### 8. Preserve pre-allocation semantics

An installed, active, unassigned physical provider may register its exact callback before tenant assignment. Registration grants no authority.

Authority-bearing issue/call/delegate/etc. operations remain subject to current MTN ownership/liveness and authorization checks. Plasmon must not add an assignment prerequisite to provider callback registration.

## Sharing implications

Agent 9's current `share -> publish -> issue` and `revoke -> authorization.revoke` orchestration is directionally valid and keeps bearer material out of provider persistence.

`importShare(token, destination)` must change because a token alone is insufficient to identify a snapshot revision and insufficient to perform a live MTN provider call. The revised Sharing API should carry:

- bearer token transiently;
- non-secret snapshot locator/revision explicitly;
- trusted current consumer AppScope from integration/runtime context;

then redeem to a first-class lease, perform the MTN lease-bound provider call for the requested operation/revision, and release the lease according to the accepted lifecycle.

## Non-goals / prohibited fixes

Do not:

- change MTN 0.2 to fit old Plasmon types;
- merge/vendor MTN source into Plasmon;
- guess or synthesize exact AppScopes;
- store hidden grant/lease/ownership/revocation/epoch truth in Agent 8 or Sharing;
- encode provider revision into immutable NodeId/AtomId/MTN resource identity merely to preserve the old `ResourceRef`;
- expose protected `resource_id` through safe public inspection;
- add public Kernel issuer methods that bypass compiler-bound capability delivery;
- use JavaScript `number` for MTN Nat64 nanosecond timestamps.

## Review gate

Coordinator C/security-model review should confirm that this proposal preserves the accepted MTN 0.2 boundaries. After confirmation, Coordinator A will freeze an explicit Plasmon contract amendment and issue narrow migration work to Agent 8 and Agent 9.
