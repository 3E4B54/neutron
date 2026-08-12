# Plasmon Neutron bridge

`neutron/**` is Plasmon's adapter to verified vanilla Neutron capabilities behind the public `NeutronBridge` contract.

## Boundary

Neutron remains authoritative for application installation, AppScope isolation, capabilities, package execution, tiles, and Kernel security. Plasmon discovers/describes applications and requests Kernel operations; it does not obtain or embed authenticated application surfaces as local native windows.

`VanillaNeutronBridge` currently adapts installed application discovery/description, runtime endpoint snapshots, Kernel tile opening, install offers, icon metadata resolution, and best-effort foreground lifecycle refresh. Standalone preview uses a separate preview bridge rather than pretending Kernel calls exist.

Runtime information can be unavailable. The bridge preserves an explicit unknown state rather than manufacturing a negative answer from a failed snapshot.

## Resilience and caching

Malformed or unavailable metadata for one external application should not poison unrelated applications. Metadata/icon caching is an efficiency layer and must not change authority: invalidate when the available Kernel discovery identity changes, and keep runtime refresh separate from expensive metadata discovery when possible.

Untrusted package metadata must be safety-bounded before it becomes a URL/resource request.

## Refactor direction

Keep API codecs/parsing, metadata/icon resolution/cache, lifecycle refresh, and the public bridge thin and separable. When compatibility adapters are no longer used by the active composition, retire them instead of maintaining multiple Neutron authorities.

Do not invent missing Kernel APIs to satisfy a Plasmon UI. Missing capabilities and cross-AppScope authorization belong at the accepted Neutron/MTN boundary and should be escalated.

## Testing

Use fast adapter tests with fake APIs for malformed-response isolation, discovery parsing, runtime uncertainty, caching/invalidation, icon/path safety, open/install argument forwarding, and lifecycle subscription cleanup. Use browser tests for actual focus/pageshow/visibility lifecycle mechanics. Use installed/package integration when claiming behavior against a real Kernel rather than a fake API.
